---
name: real-time
description: >
  Use this skill when implementing real-time communication in a
  Node.js backend. Covers WebSocket (Socket.IO, ws), Server-Sent
  Events (SSE), rooms/namespaces, scaling with Redis adapter,
  WebSocket authentication, and reconnection. When to use events
  → architecture/messaging-and-events.
---

# Real-Time — WebSocket and SSE

## Agent workflow

**1.** Decide technology: WebSocket, SSE, or polling (section 1).
**2.** Configure Socket.IO or SSE as needed (sections 2–5).
**3.** Organize rooms and namespaces (section 6).
**4.** Configure Redis adapter for multiple instances (section 7).
**5.** Implement client-side reconnection (section 8).
**6.** Check against the gotchas list (section 9).

## 1. WebSocket or SSE?

**WebSocket (bidirectional):** chat, messaging, multiplayer games, collaborative editing, any case where the client sends data in real time. More complex: connection management, reconnection, scaling.

**SSE — Server-Sent Events (unidirectional: server → client):** notifications, live feeds (stock prices, scores), progress updates (file processing, deployment), any case where only the server sends data. Simpler: native HTTP, automatic reconnection, no library needed.

**Polling (simple fallback):** data that changes every 30s+ (dashboard metrics), doesn't justify the complexity of WS/SSE. Long polling if you need < 5s latency without WS.

## 2. Socket.IO — Setup

```typescript
// server.ts
import { Server as SocketServer } from 'socket.io';
import { createServer } from 'http';

const httpServer = createServer(app);
const io = new SocketServer(httpServer, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(','),
    credentials: true,
  },
  // Timeout and heartbeat
  pingTimeout: 60_000,
  pingInterval: 25_000,
  // Transports
  transports: ['websocket', 'polling'], // Prefer WS, fallback to polling
});

// Authentication middleware
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication required'));
  }
  
  try {
    const payload = verifyAccessToken(token);
    socket.data.user = payload;
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});

// Connection
io.on('connection', (socket) => {
  const user = socket.data.user;
  logger.info({ userId: user.sub, socketId: socket.id }, 'Client connected');

  // Join personal room (for direct notifications)
  socket.join(`user:${user.sub}`);

  // Handlers
  socket.on('joinRoom', (roomId: string) => {
    // Verify permissions before joining the room
    socket.join(roomId);
  });

  socket.on('message', async (data) => {
    // Validate input just like in REST
    const parsed = messageSchema.safeParse(data);
    if (!parsed.success) {
      socket.emit('error', { code: 'VALIDATION_ERROR' });
      return;
    }
    
    // Broadcast to the room
    io.to(data.roomId).emit('message', {
      ...parsed.data,
      userId: user.sub,
      timestamp: new Date().toISOString(),
    });
  });

  socket.on('disconnect', (reason) => {
    logger.info({ userId: user.sub, reason }, 'Client disconnected');
  });
});
```

## 3. NestJS — Gateway

```typescript
@WebSocketGateway({
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(','),
    credentials: true,
  },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private authService: AuthService,
    private chatService: ChatService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const user = await this.authService.verifySocketToken(client);
      client.data.user = user;
      client.join(`user:${user.id}`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    logger.info({ userId: client.data.user?.id }, 'Disconnected');
  }

  @SubscribeMessage('sendMessage')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: CreateMessageDto,
  ) {
    const message = await this.chatService.create({
      ...data,
      userId: client.data.user.id,
    });

    this.server.to(data.roomId).emit('newMessage', message);
    return { event: 'messageSent', data: message };
  }
}
```

## 4. SSE — Server-Sent Events

```typescript
// Express — SSE endpoint
app.get('/api/notifications/stream', authenticate, (req, res) => {
  // SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  // Keep-alive
  const keepAlive = setInterval(() => {
    res.write(':keepalive\n\n');
  }, 30_000);

  // Send notifications
  const userId = req.user.id;
  
  function sendNotification(data: unknown) {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }

  // Subscribe to events (Redis pub/sub or EventEmitter)
  const subscription = notificationBus.subscribe(userId, sendNotification);

  // Cleanup on disconnect
  req.on('close', () => {
    clearInterval(keepAlive);
    subscription.unsubscribe();
  });
});

// NestJS — SSE with Observable
@Controller('notifications')
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Sse('stream')
  @UseGuards(JwtAuthGuard)
  stream(@CurrentUser() user: User): Observable<MessageEvent> {
    return this.notificationsService
      .getNotificationStream(user.id)
      .pipe(
        map((notification) => ({
          data: notification,
        })),
      );
  }
}
```

## 5. Rooms and Namespaces

**Namespaces (Socket.IO):** `/chat` → messaging, `/dashboard` → real-time metrics, `/support` → support chat. Each namespace can have its own middleware and handlers. Client connects to a specific namespace.

**Rooms:** `user:usr_123` → personal room (direct notifications), `chat:room_456` → chat room, `org:org_789` → organization. A socket can be in multiple rooms. Broadcast to room = all sockets in that room receive it.

```typescript
// Emit to a specific room
io.to('chat:room_456').emit('newMessage', message);

// Emit to a specific user (their personal room)
io.to(`user:${targetUserId}`).emit('notification', notification);

// Broadcast to everyone except the sender
socket.to('chat:room_456').emit('newMessage', message);

// Emit to multiple rooms
io.to('room1').to('room2').emit('announcement', data);
```

## 6. Scaling with Redis Adapter

```typescript
// WITHOUT Redis adapter: each instance has its own sockets
// → user connected to instance A doesn't receive events from instance B

// WITH Redis adapter: all instances share events
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

const pubClient = createClient({ url: process.env.REDIS_URL });
const subClient = pubClient.duplicate();

await Promise.all([pubClient.connect(), subClient.connect()]);

io.adapter(createAdapter(pubClient, subClient));

// Now:
//   io.to('room:123').emit('event', data)
//   → reaches ALL sockets in room:123, regardless of the instance
```

## 7. Reconnection

```typescript
// CLIENT-SIDE: Socket.IO reconnects automatically
const socket = io('ws://api.example.com', {
  auth: { token: accessToken },
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
});

// Handle re-auth after reconnection
socket.on('connect', () => {
  // Re-join rooms if needed
  socket.emit('rejoinRooms', { rooms: myRooms });
});

// SERVER-SIDE: detect reconnection
io.use(async (socket, next) => {
  // Socket.IO sends sessionId for reconnections
  // Verify if the session is valid
  next();
});
```

## 8. Gotchas

- WebSocket for everything — SSE or polling when only the server sends.
- No authentication on WS — anyone can connect.
- No input validation on messages — XSS/injection via WS.
- Broadcast without rooms — sending to all including irrelevant users.
- No Redis adapter on multiple instances — messages get lost.
- Heavy messages over WS — send only IDs/diffs, client fetches the rest.
- No heartbeat/ping — zombie connections.
- No rate limiting on WS — a client can flood with messages.
- Business logic in the gateway — move to services.
- No graceful disconnect — resources are not cleaned up.
