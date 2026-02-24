"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var OrdersGateway_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrdersGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const common_1 = require("@nestjs/common");
const socket_io_1 = require("socket.io");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../prisma/prisma.service");
let OrdersGateway = OrdersGateway_1 = class OrdersGateway {
    constructor(jwtService, config, prisma) {
        this.jwtService = jwtService;
        this.config = config;
        this.prisma = prisma;
        this.logger = new common_1.Logger(OrdersGateway_1.name);
    }
    afterInit(server) {
        server.use(async (socket, next) => {
            try {
                const rawToken = socket.handshake.auth?.token ||
                    socket.handshake.headers?.authorization ||
                    '';
                const token = rawToken.startsWith('Bearer ')
                    ? rawToken.slice(7)
                    : rawToken;
                if (!token)
                    return next(new Error('UNAUTHORIZED: No token provided'));
                const secret = this.config.get('JWT_SECRET');
                const payload = this.jwtService.verify(token, { secret });
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
            }
            catch {
                next(new Error('UNAUTHORIZED: Invalid token'));
            }
        });
        this.logger.log('OrdersGateway initialised — namespace: /orders');
    }
    handleConnection(client) {
        const user = client.data.user;
        this.logger.log(`WS connected: ${user?.name ?? 'unknown'} (${user?.role}) — socket ${client.id}`);
    }
    handleDisconnect(client) {
        const user = client.data.user;
        this.logger.log(`WS disconnected: ${user?.name ?? 'unknown'} — socket ${client.id}`);
    }
    async handleJoinRestaurant(client, data) {
        const user = client.data.user;
        if (!data?.restaurantId) {
            client.emit('error', { message: 'restaurantId is required' });
            return;
        }
        const hasAccess = await this.validateRestaurantAccess(user, data.restaurantId);
        if (!hasAccess) {
            client.emit('error', { message: 'Access denied to this restaurant' });
            return;
        }
        await client.join(`restaurant:${data.restaurantId}`);
        this.logger.debug(`${user.name} joined restaurant:${data.restaurantId}`);
        return { joined: `restaurant:${data.restaurantId}` };
    }
    async handleJoinKitchen(client, data) {
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
    async handleJoinBilling(client, data) {
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
    async handleJoinTable(client, data) {
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
    async handleLeaveRoom(client, data) {
        if (data?.room) {
            await client.leave(data.room);
            return { left: data.room };
        }
    }
    handlePing(client) {
        return { event: 'pong', timestamp: new Date().toISOString() };
    }
    emitToRestaurant(restaurantId, event, data) {
        this.server.to(`restaurant:${restaurantId}`).emit(event, data);
    }
    emitToKitchen(restaurantId, event, data) {
        this.server.to(`kitchen:${restaurantId}`).emit(event, data);
    }
    emitToBilling(restaurantId, event, data) {
        this.server.to(`billing:${restaurantId}`).emit(event, data);
    }
    emitToTable(tableId, event, data) {
        this.server.to(`table:${tableId}`).emit(event, data);
    }
    emitTableStatus(tableId, restaurantId, status) {
        const payload = { tableId, status };
        this.server.to(`restaurant:${restaurantId}`).emit('table:status:changed', payload);
        this.server.to(`table:${tableId}`).emit('table:status:changed', payload);
    }
    async validateRestaurantAccess(user, restaurantId) {
        if (!user)
            return false;
        if (user.role === 'SUPER_ADMIN')
            return true;
        if (user.role === 'OWNER') {
            const restaurant = await this.prisma.restaurant.findFirst({
                where: { id: restaurantId, ownerId: user.id },
            });
            return !!restaurant;
        }
        return user.restaurantId === restaurantId;
    }
};
exports.OrdersGateway = OrdersGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], OrdersGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('join:restaurant'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], OrdersGateway.prototype, "handleJoinRestaurant", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('join:kitchen'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], OrdersGateway.prototype, "handleJoinKitchen", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('join:billing'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], OrdersGateway.prototype, "handleJoinBilling", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('join:table'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], OrdersGateway.prototype, "handleJoinTable", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('leave:room'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], OrdersGateway.prototype, "handleLeaveRoom", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('ping'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], OrdersGateway.prototype, "handlePing", null);
exports.OrdersGateway = OrdersGateway = OrdersGateway_1 = __decorate([
    (0, websockets_1.WebSocketGateway)({
        namespace: 'orders',
        cors: {
            origin: '*',
            credentials: true,
        },
    }),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        config_1.ConfigService,
        prisma_service_1.PrismaService])
], OrdersGateway);
//# sourceMappingURL=orders.gateway.js.map