---
name: real-time
description: >
  Usa esta skill cuando implementes comunicación en tiempo real en
  backend Node.js. Cubre WebSocket (Socket.IO, ws), Server-Sent
  Events (SSE), rooms/namespaces, scaling con Redis adapter,
  autenticación en WebSocket, y reconexión. Cuándo usar eventos
  → architecture/messaging-and-events.
---

# Real-Time — WebSocket y SSE

## Flujo de trabajo del agente

**1.** Decidir tecnología: WebSocket, SSE o polling (sección 1).
**2.** Configurar Socket.IO o SSE según el caso (secciones 2–5).
**3.** Organizar rooms y namespaces (sección 6).
**4.** Configurar Redis adapter para múltiples instancias (sección 7).
**5.** Implementar reconexión client-side (sección 8).
**6.** Verificar contra la lista de gotchas (sección 9).

## 1. ¿WebSocket o SSE?

**WebSocket (bidireccional):** chat, mensajería, juegos multiplayer, collaborative editing, cualquier caso donde el cliente envía datos en tiempo real. Más complejo: manejo de conexiones, reconexión, scaling.

**SSE — Server-Sent Events (unidireccional: server → client):** notificaciones, live feeds (stock prices, scores), progress updates (file processing, deployment), cualquier caso donde solo el server envía datos. Más simple: HTTP nativo, reconexión automática, no necesita library.

**Polling (fallback simple):** datos que cambian cada 30s+ (dashboard metrics), no justifica la complejidad de WS/SSE. Long polling si necesitas < 5s de latencia sin WS.

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
  // Timeout y heartbeat
  pingTimeout: 60_000,
  pingInterval: 25_000,
  // Transports
  transports: ['websocket', 'polling'], // Preferir WS, fallback a polling
});

// Middleware de autenticación
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

// Conexión
io.on('connection', (socket) => {
  const user = socket.data.user;
  logger.info({ userId: user.sub, socketId: socket.id }, 'Client connected');

  // Unir a room personal (para notificaciones directas)
  socket.join(`user:${user.sub}`);

  // Handlers
  socket.on('joinRoom', (roomId: string) => {
    // Verificar permisos antes de unir al room
    socket.join(roomId);
  });

  socket.on('message', async (data) => {
    // Validar input igual que en REST
    const parsed = messageSchema.safeParse(data);
    if (!parsed.success) {
      socket.emit('error', { code: 'VALIDATION_ERROR' });
      return;
    }
    
    // Broadcast al room
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
  // Headers SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  // Keep-alive
  const keepAlive = setInterval(() => {
    res.write(':keepalive\n\n');
  }, 30_000);

  // Enviar notificaciones
  const userId = req.user.id;
  
  function sendNotification(data: unknown) {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }

  // Suscribir a eventos (Redis pub/sub o EventEmitter)
  const subscription = notificationBus.subscribe(userId, sendNotification);

  // Cleanup al desconectar
  req.on('close', () => {
    clearInterval(keepAlive);
    subscription.unsubscribe();
  });
});

// NestJS — SSE con Observable
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

## 5. Rooms y Namespaces

**Namespaces (Socket.IO):** `/chat` → mensajería, `/dashboard` → métricas en tiempo real, `/support` → chat de soporte. Cada namespace puede tener sus propios middleware y handlers. El client se conecta a un namespace específico.

**Rooms:** `user:usr_123` → room personal (notificaciones directas), `chat:room_456` → sala de chat, `org:org_789` → organización. Un socket puede estar en múltiples rooms. Broadcast a room = todos los sockets en ese room reciben.

```typescript
// Emit a room específico
io.to('chat:room_456').emit('newMessage', message);

// Emit a usuario específico (su room personal)
io.to(`user:${targetUserId}`).emit('notification', notification);

// Broadcast a todos excepto el sender
socket.to('chat:room_456').emit('newMessage', message);

// Emit a múltiples rooms
io.to('room1').to('room2').emit('announcement', data);
```

## 6. Scaling con Redis Adapter

```typescript
// SIN Redis adapter: cada instancia tiene sus propios sockets
// → usuario conectado a instancia A no recibe eventos de instancia B

// CON Redis adapter: todas las instancias comparten eventos
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

const pubClient = createClient({ url: process.env.REDIS_URL });
const subClient = pubClient.duplicate();

await Promise.all([pubClient.connect(), subClient.connect()]);

io.adapter(createAdapter(pubClient, subClient));

// Ahora:
//   io.to('room:123').emit('event', data)
//   → llega a TODOS los sockets en room:123, sin importar la instancia
```

## 7. Reconexión

```typescript
// CLIENT-SIDE: Socket.IO reconecta automáticamente
const socket = io('ws://api.example.com', {
  auth: { token: accessToken },
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
});

// Manejar re-auth después de reconexión
socket.on('connect', () => {
  // Re-join rooms si es necesario
  socket.emit('rejoinRooms', { rooms: myRooms });
});

// SERVER-SIDE: detectar reconexión
io.use(async (socket, next) => {
  // Socket.IO envía sessionId para reconexiones
  // Verificar si el session es válido
  next();
});
```

## 8. Gotchas

- WebSocket para todo — SSE o polling cuando solo el server envía.
- Sin autenticación en WS — cualquiera se conecta.
- Sin validación de input en messages — XSS/injection vía WS.
- Broadcast sin rooms — enviar a todos incluyendo usuarios no relevantes.
- Sin Redis adapter en múltiples instancias — mensajes se pierden.
- Mensajes pesados por WS — enviar solo IDs/diffs, cliente hace fetch del resto.
- Sin heartbeat/ping — conexiones zombie.
- Sin rate limiting en WS — un client puede floodar con mensajes.
- Lógica de negocio en el gateway — mover a services.
- Sin graceful disconnect — recursos no se limpian.
