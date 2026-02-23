import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnGatewayInit,
    MessageBody,
    ConnectedSocket,
    WsException,
} from '@nestjs/websockets';
import { Logger, UseGuards, forwardRef, Inject } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Orders WebSocket Gateway
 * ---------------------------------------------------------------------------
 * Namespace: /orders
 *
 * Authentication:
 *   Client must pass JWT in handshake:
 *     { auth: { token: 'Bearer eyJ...' } }
 *   OR
 *     { headers: { authorization: 'Bearer eyJ...' } }
 *
 * Rooms:
 *   restaurant:<restaurantId>  — all staff (session / batch / item events)
 *   kitchen:<restaurantId>     — chef-facing (batch:created, item status)
 *   billing:<restaurantId>     — biller-facing (bill events, payment events)
 *   table:<tableId>            — per-table events (table & session status)
 *
 * Client-side example:
 *   const socket = io('http://server/orders', { auth: { token: 'Bearer ...' } });
 *   socket.emit('join:restaurant', { restaurantId: '...' });
 *   socket.on('batch:created', (data) => console.log(data));
 *
 * Server-emitted events:
 *   session:opened          — new session started
 *   session:status:changed  — session status update
 *   batch:created           — new batch sent to kitchen
 *   batch:status:changed    — batch status update (manual or auto-synced)
 *   item:status:changed     — item status update
 *   bill:generated          — bill generated for session
 *   bill:paid               — bill fully paid
 *   payment:recorded        — payment added (any amount)
 *   table:status:changed    — table AVAILABLE / OCCUPIED / etc.
 *   error                   — action/validation errors
 */
@WebSocketGateway({
    namespace: 'orders',
    cors: {
        origin: '*',
        credentials: true,
    },
})
export class OrdersGateway
    implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private readonly logger = new Logger(OrdersGateway.name);

    constructor(
        private readonly jwtService: JwtService,
        private readonly config: ConfigService,
        private readonly prisma: PrismaService,
    ) { }

    // ─── Lifecycle ────────────────────────────────────────────────────────────

    afterInit(server: Server) {
        /**
         * Socket.io middleware — runs before handleConnection.
         * Validates JWT and attaches decoded payload to socket.data.user.
         */
        server.use(async (socket: Socket, next) => {
            try {
                const rawToken: string =
                    socket.handshake.auth?.token ||
                    socket.handshake.headers?.authorization ||
                    '';

                const token = rawToken.startsWith('Bearer ')
                    ? rawToken.slice(7)
                    : rawToken;

                if (!token) return next(new Error('UNAUTHORIZED: No token provided'));

                const secret = this.config.get<string>('JWT_SECRET');
                const payload = this.jwtService.verify(token, { secret });

                // Load full user from DB
                const user = await this.prisma.user.findUnique({
                    where: { id: payload.sub },
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true,
                        isActive: true,
                        restaurantId: true,
                    },
                });

                if (!user || !user.isActive) {
                    return next(new Error('UNAUTHORIZED: User not found or inactive'));
                }

                socket.data.user = user;
                next();
            } catch {
                next(new Error('UNAUTHORIZED: Invalid token'));
            }
        });

        this.logger.log('OrdersGateway initialised — namespace: /orders');
    }

    handleConnection(client: Socket) {
        const user = client.data.user;
        this.logger.log(
            `WS connected: ${user?.name ?? 'unknown'} (${user?.role}) — socket ${client.id}`,
        );
    }

    handleDisconnect(client: Socket) {
        const user = client.data.user;
        this.logger.log(
            `WS disconnected: ${user?.name ?? 'unknown'} — socket ${client.id}`,
        );
    }

    // ─── Room subscriptions ───────────────────────────────────────────────────

    /**
     * Join the restaurant-wide room.
     * All roles should join this to receive general session/batch/item events.
     */
    @SubscribeMessage('join:restaurant')
    async handleJoinRestaurant(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { restaurantId: string },
    ) {
        const user = client.data.user;
        if (!data?.restaurantId) {
            client.emit('error', { message: 'restaurantId is required' });
            return;
        }

        // Validate user has access to this restaurant
        const hasAccess = await this.validateRestaurantAccess(user, data.restaurantId);
        if (!hasAccess) {
            client.emit('error', { message: 'Access denied to this restaurant' });
            return;
        }

        await client.join(`restaurant:${data.restaurantId}`);
        this.logger.debug(`${user.name} joined restaurant:${data.restaurantId}`);
        return { joined: `restaurant:${data.restaurantId}` };
    }

    /** Join the kitchen room — chefs receive all pending batch/item events. */
    @SubscribeMessage('join:kitchen')
    async handleJoinKitchen(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { restaurantId: string },
    ) {
        const user = client.data.user;
        const hasAccess = await this.validateRestaurantAccess(user, data.restaurantId);
        if (!hasAccess) {
            client.emit('error', { message: 'Access denied' });
            return;
        }

        await client.join(`kitchen:${data.restaurantId}`);
        this.logger.debug(`${user.name} joined kitchen:${data.restaurantId}`);
        return { joined: `kitchen:${data.restaurantId}` };
    }

    /** Join the billing room — billers see bill & payment events. */
    @SubscribeMessage('join:billing')
    async handleJoinBilling(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { restaurantId: string },
    ) {
        const user = client.data.user;
        const hasAccess = await this.validateRestaurantAccess(user, data.restaurantId);
        if (!hasAccess) {
            client.emit('error', { message: 'Access denied' });
            return;
        }

        await client.join(`billing:${data.restaurantId}`);
        this.logger.debug(`${user.name} joined billing:${data.restaurantId}`);
        return { joined: `billing:${data.restaurantId}` };
    }

    /** Join a table-specific room — receive table and session events for that table. */
    @SubscribeMessage('join:table')
    async handleJoinTable(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { tableId: string; restaurantId: string },
    ) {
        const user = client.data.user;
        const hasAccess = await this.validateRestaurantAccess(user, data.restaurantId);
        if (!hasAccess) {
            client.emit('error', { message: 'Access denied' });
            return;
        }

        await client.join(`table:${data.tableId}`);
        this.logger.debug(`${user.name} joined table:${data.tableId}`);
        return { joined: `table:${data.tableId}` };
    }

    /** Leave any room explicitly. */
    @SubscribeMessage('leave:room')
    async handleLeaveRoom(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { room: string },
    ) {
        if (data?.room) {
            await client.leave(data.room);
            return { left: data.room };
        }
    }

    /** Ping — useful for client-side heartbeat / connection checks. */
    @SubscribeMessage('ping')
    handlePing(@ConnectedSocket() client: Socket) {
        return { event: 'pong', timestamp: new Date().toISOString() };
    }

    // ─── Emit helpers (called by OrdersService) ───────────────────────────────

    emitToRestaurant(restaurantId: string, event: string, data: unknown): void {
        this.server.to(`restaurant:${restaurantId}`).emit(event, data);
    }

    emitToKitchen(restaurantId: string, event: string, data: unknown): void {
        this.server.to(`kitchen:${restaurantId}`).emit(event, data);
    }

    emitToBilling(restaurantId: string, event: string, data: unknown): void {
        this.server.to(`billing:${restaurantId}`).emit(event, data);
    }

    emitToTable(tableId: string, event: string, data: unknown): void {
        this.server.to(`table:${tableId}`).emit(event, data);
    }

    emitTableStatus(tableId: string, restaurantId: string, status: string): void {
        const payload = { tableId, status };
        this.server.to(`restaurant:${restaurantId}`).emit('table:status:changed', payload);
        this.server.to(`table:${tableId}`).emit('table:status:changed', payload);
    }

    // ─── Private helpers ──────────────────────────────────────────────────────

    private async validateRestaurantAccess(
        user: { id: string; role: string; restaurantId?: string | null },
        restaurantId: string,
    ): Promise<boolean> {
        if (!user) return false;
        if (user.role === 'SUPER_ADMIN') return true;

        if (user.role === 'OWNER') {
            const restaurant = await this.prisma.restaurant.findFirst({
                where: { id: restaurantId, ownerId: user.id },
            });
            return !!restaurant;
        }

        return user.restaurantId === restaurantId;
    }
}
