---
name: auth
description: >
  Authentication and authorization implementation in Node.js backend.
  Covers JWT (access + refresh tokens), OAuth2, secure password hashing,
  RBAC/ABAC, NestJS guards, Express middleware, sessions, and complete
  login/register/refresh/logout flows.
---

# 🔐 Auth — Authentication and Authorization

## Principle

> **Auth is critical infrastructure, not just another feature.**
> Never implement auth "quickly to improve later".
> Do it right from the start or use a managed service (Auth0, Clerk, Supabase Auth).

---

## Decision: Custom Auth or Managed Service?

```
When managed service (Auth0, Clerk, Supabase Auth)?
  ✅ MVP or early-stage startup → don't spend time on auth
  ✅ You need social login (Google, GitHub, etc.) quickly
  ✅ No security expertise on the team
  ✅ Compliance (SOC2) requires audited auth

When custom auth?
  ✅ Full control over flow and UX
  ✅ Special requirements (multi-tenant, custom MFA)
  ✅ Cost: high user volume → managed gets expensive
  ✅ You already have experience implementing secure auth
```

---

## JWT — Access + Refresh Token

```
FLOW:
  1. Login → returns { accessToken, refreshToken }
  2. Access token: short duration (15 min), in memory/header
  3. Refresh token: long duration (7-30 days), in httpOnly cookie
  4. Access expires → client uses refresh token to obtain a new pair
  5. Logout → invalidate refresh token (blacklist or delete from DB)

RULES:
  - Access token NEVER stored in localStorage
  - Refresh token ALWAYS in httpOnly cookie with Secure + SameSite=Strict
  - Refresh token rotation: each use generates a new refresh token
  - The previous refresh token is invalidated immediately
  - Access token payload: { sub, email, roles } — minimum necessary
  - NEVER put sensitive data in the payload (password, secrets)
```

```typescript
// Token generation
import { sign, verify } from 'jsonwebtoken';

interface TokenPayload {
  sub: string;    // user ID
  email: string;
  roles: string[];
}

function generateTokens(payload: TokenPayload) {
  const accessToken = sign(payload, process.env.JWT_SECRET!, {
    expiresIn: '15m',
    algorithm: 'HS256',
  });

  const refreshToken = sign(
    { sub: payload.sub, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET!,
    { expiresIn: '7d', algorithm: 'HS256' },
  );

  return { accessToken, refreshToken };
}

// Send refresh token as cookie
function setRefreshCookie(res: Response, token: string) {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/api/auth/refresh',         // Only accessible at refresh endpoint
  });
}
```

---

## Password Hashing

```
ALGORITHM: bcrypt (proven) or argon2 (recommended modern)

NEVER:
  ❌ MD5 / SHA-1 / SHA-256 without salt → crackable with rainbow tables
  ❌ Implement custom hashing
  ❌ Fixed salt shared across all users

bcrypt CONFIGURATION:
  - Salt rounds: 12 (balance between security and performance)
  - In tests: salt rounds 1 (speed)
  
argon2 CONFIGURATION:
  - type: argon2id (resistant to side-channel and GPU attacks)
  - memoryCost: 65536 (64 MB)
  - timeCost: 3
  - parallelism: 4
```

```typescript
import bcrypt from 'bcrypt';

const SALT_ROUNDS = process.env.NODE_ENV === 'test' ? 1 : 12;

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
```

---

## Register Flow

```typescript
// 1. Validate input (email, password strength)
// 2. Check that email doesn't exist → 409 Conflict if it does
// 3. Hash password
// 4. Create user in DB
// 5. Generate tokens
// 6. Return tokens (DO NOT return password hash)

async function register(dto: RegisterDto) {
  const exists = await this.usersRepo.findByEmail(dto.email);
  if (exists) {
    throw new ConflictException('Email already registered');
  }

  const hashedPassword = await hashPassword(dto.password);
  const user = await this.usersRepo.create({
    email: dto.email,
    password: hashedPassword,
    name: dto.name,
  });

  const tokens = generateTokens({
    sub: user.id,
    email: user.email,
    roles: user.roles,
  });

  return {
    user: { id: user.id, email: user.email, name: user.name },
    accessToken: tokens.accessToken,
    // refreshToken goes in cookie, not in body
  };
}
```

---

## Login Flow

```typescript
// 1. Find user by email → 401 if not found
// 2. Verify password → 401 if incorrect
// 3. Generate tokens
// 4. Save refresh token in DB (hashed)
// 5. Return access token + set refresh cookie

// IMPORTANT: same error message for "not found" and "incorrect password"
// → prevents user enumeration
throw new UnauthorizedException('Invalid credentials');
```

---

## Refresh Token Rotation

```typescript
async function refreshTokens(currentRefreshToken: string) {
  // 1. Verify refresh token signature
  const payload = verify(currentRefreshToken, process.env.JWT_REFRESH_SECRET!);

  // 2. Look up token in DB (compare hash)
  const storedToken = await this.tokensRepo.findByUserAndToken(
    payload.sub,
    currentRefreshToken,
  );
  if (!storedToken) {
    // Token doesn't exist → possible reuse attack
    // Invalidate ALL refresh tokens for the user
    await this.tokensRepo.deleteAllByUser(payload.sub);
    throw new UnauthorizedException('Token reuse detected');
  }

  // 3. Invalidate current token
  await this.tokensRepo.delete(storedToken.id);

  // 4. Generate new token pair
  const user = await this.usersRepo.findById(payload.sub);
  const tokens = generateTokens({
    sub: user.id,
    email: user.email,
    roles: user.roles,
  });

  // 5. Save new refresh token (hashed) in DB
  await this.tokensRepo.create({
    userId: user.id,
    tokenHash: await hashToken(tokens.refreshToken),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  return tokens;
}
```

---

## RBAC — Role-Based Access Control

```
TYPICAL ROLES:
  user        → basic access
  admin       → user management and configuration
  superadmin  → full access

RULES:
  1. Roles are stored in the DB as an array or relational table
  2. Roles are included in the JWT payload
  3. Verify role on EVERY protected request (don't rely only on UI)
  4. Guard/middleware checks: does the user have the required role?
```

```typescript
// NestJS — decorator + guard
@Roles('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Delete(':id')
async deleteUser(@Param('id') id: string) {
  return this.usersService.delete(id);
}

// Roles decorator
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);

// Roles guard
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) return true;

    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.some((role) => user.roles?.includes(role));
  }
}
```

```typescript
// Express — middleware
function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED' } });
    }
    if (!roles.some((role) => req.user.roles.includes(role))) {
      return res.status(403).json({ error: { code: 'FORBIDDEN' } });
    }
    next();
  };
}

// Usage
router.delete('/users/:id', authenticate, requireRole('admin'), deleteUser);
```

---

## OAuth2 / Social Login

```
FLOW (Authorization Code):
  1. Frontend redirects to provider: GET /auth/google
  2. Backend redirects to Google with client_id + redirect_uri
  3. Google redirects back with authorization code
  4. Backend exchanges code for tokens with Google
  5. Backend obtains user profile
  6. Create or link user in DB
  7. Generate own JWTs
  8. Redirect to frontend with tokens

LIBRARIES:
  NestJS: @nestjs/passport + passport-google-oauth20
  Express: passport + passport-google-oauth20

RULES:
  - NEVER store OAuth provider tokens on the frontend
  - state parameter mandatory to prevent CSRF
  - Verify that the provider email is verified
  - Allow linking multiple providers to one user
```

---

## Logout

```
IMPLEMENTATION:
  1. Delete refresh token from DB
  2. Clear refresh token cookie
  3. Access token remains valid until it expires (15 min)
     → If you need immediate invalidation: token blacklist in Redis
  
  // Blacklist in Redis (only if you need immediate invalidation)
  await redis.set(`blacklist:${accessToken}`, '1', 'EX', 900); // 15min TTL
```

---

## Anti-patterns

```
❌ JWT in localStorage → XSS can steal it
❌ Refresh token without rotation → if stolen, indefinite access
❌ Same secret for access and refresh → compromise of one = compromise of both
❌ Token that never expires → use short TTLs
❌ Sensitive information in JWT payload → it's base64, NOT encrypted
❌ Validate auth only on frontend → the backend ALWAYS validates
❌ Error "User not found" on login → allows enumeration
❌ bcrypt with salt rounds < 10 in production → too fast to crack
❌ Storing password in plain text → NEVER, not even in logs
❌ Auth middleware that trusts headers without verifying JWT signature
```

---

## Related Skills

> **Consult the master index [`backend/SKILL.md`](../SKILL.md) → "Mandatory Skills by Action"** for the full chain.

| Skill | Why |
|-------|-----|
| `testing` | Tests for the full auth flow (register, login, refresh, RBAC) |
| `error-handling` | Typed errors for auth failures (401, 403) |
| `logging` | Log failed attempts, NEVER log passwords/tokens |
| `security` | Rate limiting, Helmet, CSRF |
| `governance/owasp-top-10` | A07 Auth Failures, A02 Crypto Failures |
| `clean-code-principles` | Guard clauses, SRP, JSDoc on interfaces |
