---
name: auth
description: >
  Implementación de autenticación y autorización en backend Node.js.
  Cubre JWT (access + refresh tokens), OAuth2, password hashing seguro,
  RBAC/ABAC, guards NestJS, middleware Express, sesiones, y flujos
  completos de login/register/refresh/logout.
---

# 🔐 Auth — Autenticación y Autorización

## Principio

> **Auth es infraestructura crítica, no una feature más.**
> Nunca implementar auth "rápido para después mejorar".
> Hacerlo bien desde el inicio o usar un servicio managed (Auth0, Clerk, Supabase Auth).

---

## Decisión: ¿Custom Auth o Servicio Managed?

```
¿Cuándo servicio managed (Auth0, Clerk, Supabase Auth)?
  ✅ MVP o startup early-stage → no gastar tiempo en auth
  ✅ Necesitas social login (Google, GitHub, etc.) rápido
  ✅ No hay expertise en seguridad en el equipo
  ✅ Compliance (SOC2) requiere auth auditado

¿Cuándo custom auth?
  ✅ Control total sobre flujo y UX
  ✅ Requisitos especiales (multi-tenant, custom MFA)
  ✅ Costos: alto volumen de usuarios → managed se encarece
  ✅ Ya tienes experiencia implementando auth seguro
```

---

## JWT — Access + Refresh Token

```
FLUJO:
  1. Login → devuelve { accessToken, refreshToken }
  2. Access token: corta duración (15 min), en memoria/header
  3. Refresh token: larga duración (7-30 días), en httpOnly cookie
  4. Access expira → cliente usa refresh token para obtener nuevo par
  5. Logout → invalidar refresh token (blacklist o eliminar de DB)

REGLAS:
  - Access token NUNCA se almacena en localStorage
  - Refresh token SIEMPRE en httpOnly cookie con Secure + SameSite=Strict
  - Refresh token rotation: cada uso genera nuevo refresh token
  - El refresh token anterior se invalida inmediatamente
  - Access token payload: { sub, email, roles } — mínimo necesario
  - NUNCA poner datos sensibles en el payload (password, secrets)
```

```typescript
// Generación de tokens
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

// Enviar refresh token como cookie
function setRefreshCookie(res: Response, token: string) {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
    path: '/api/auth/refresh',         // Solo accesible en refresh endpoint
  });
}
```

---

## Password Hashing

```
ALGORITMO: bcrypt (probado) o argon2 (recomendado moderno)

NUNCA:
  ❌ MD5 / SHA-1 / SHA-256 sin salt → crackeable con rainbow tables
  ❌ Implementar hashing propio
  ❌ Salt fijo compartido entre todos los usuarios

CONFIGURACIÓN bcrypt:
  - Salt rounds: 12 (balance entre seguridad y performance)
  - En tests: salt rounds 1 (velocidad)
  
CONFIGURACIÓN argon2:
  - type: argon2id (resistente a side-channel y GPU attacks)
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

## Flujo de Register

```typescript
// 1. Validar input (email, password strength)
// 2. Verificar que email no existe → 409 Conflict si existe
// 3. Hash password
// 4. Crear usuario en DB
// 5. Generar tokens
// 6. Retornar tokens (NO retornar password hash)

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
    // refreshToken va en cookie, no en body
  };
}
```

---

## Flujo de Login

```typescript
// 1. Buscar usuario por email → 401 si no existe
// 2. Verificar password → 401 si incorrecto
// 3. Generar tokens
// 4. Guardar refresh token en DB (hashed)
// 5. Retornar access token + set refresh cookie

// IMPORTANTE: mismo mensaje de error para "no existe" y "password incorrecto"
// → previene user enumeration
throw new UnauthorizedException('Invalid credentials');
```

---

## Refresh Token Rotation

```typescript
async function refreshTokens(currentRefreshToken: string) {
  // 1. Verificar firma del refresh token
  const payload = verify(currentRefreshToken, process.env.JWT_REFRESH_SECRET!);

  // 2. Buscar token en DB (comparar hash)
  const storedToken = await this.tokensRepo.findByUserAndToken(
    payload.sub,
    currentRefreshToken,
  );
  if (!storedToken) {
    // Token no existe → posible reuse attack
    // Invalidar TODOS los refresh tokens del usuario
    await this.tokensRepo.deleteAllByUser(payload.sub);
    throw new UnauthorizedException('Token reuse detected');
  }

  // 3. Invalidar token actual
  await this.tokensRepo.delete(storedToken.id);

  // 4. Generar nuevo par de tokens
  const user = await this.usersRepo.findById(payload.sub);
  const tokens = generateTokens({
    sub: user.id,
    email: user.email,
    roles: user.roles,
  });

  // 5. Guardar nuevo refresh token (hashed) en DB
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
ROLES TÍPICOS:
  user        → acceso básico
  admin       → gestión de usuarios y configuración
  superadmin  → acceso total

REGLAS:
  1. Roles se almacenan en la DB como array o tabla relacional
  2. Roles se incluyen en el JWT payload
  3. Verificar rol en CADA request protegido (no confiar solo en UI)
  4. Guard/middleware verifica: ¿el usuario tiene el rol requerido?
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

// Uso
router.delete('/users/:id', authenticate, requireRole('admin'), deleteUser);
```

---

## OAuth2 / Social Login

```
FLUJO (Authorization Code):
  1. Frontend redirige a provider: GET /auth/google
  2. Backend redirige a Google con client_id + redirect_uri
  3. Google redirige de vuelta con authorization code
  4. Backend intercambia code por tokens con Google
  5. Backend obtiene perfil del usuario
  6. Crear o vincular usuario en DB
  7. Generar JWT propios
  8. Redirigir a frontend con tokens

LIBRERÍAS:
  NestJS: @nestjs/passport + passport-google-oauth20
  Express: passport + passport-google-oauth20

REGLAS:
  - NUNCA almacenar tokens de OAuth del provider en el frontend
  - state parameter obligatorio para prevenir CSRF
  - Verificar que el email del provider esté verificado
  - Permitir vincular múltiples providers a un user
```

---

## Logout

```
IMPLEMENTACIÓN:
  1. Eliminar refresh token de DB
  2. Limpiar cookie de refresh token
  3. Access token sigue válido hasta expirar (15 min)
     → Si necesitas invalidación inmediata: token blacklist en Redis
  
  // Blacklist en Redis (solo si necesitas invalidación inmediata)
  await redis.set(`blacklist:${accessToken}`, '1', 'EX', 900); // 15min TTL
```

---

## Anti-patrones

```
❌ JWT en localStorage → XSS puede robarlo
❌ Refresh token sin rotation → si se roba, acceso indefinido
❌ Mismo secret para access y refresh → compromiso de uno = compromiso de ambos
❌ Token que nunca expira → usar TTL cortos
❌ Información sensible en JWT payload → es base64, NO encriptado
❌ Validar auth solo en frontend → el backend SIEMPRE valida
❌ Error "User not found" en login → permite enumeration
❌ bcrypt con salt rounds < 10 en producción → muy rápido de crackear
❌ Guardar password en plain text → NUNCA, ni en logs
❌ Middleware de auth que trusts headers sin verificar firma del JWT
```
