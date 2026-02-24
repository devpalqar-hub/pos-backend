import { OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
export declare class OrdersGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    private readonly jwtService;
    private readonly config;
    private readonly prisma;
    server: Server;
    private readonly logger;
    constructor(jwtService: JwtService, config: ConfigService, prisma: PrismaService);
    afterInit(server: Server): void;
    handleConnection(client: Socket): void;
    handleDisconnect(client: Socket): void;
    handleJoinRestaurant(client: Socket, data: {
        restaurantId: string;
    }): Promise<{
        joined: string;
    } | undefined>;
    handleJoinKitchen(client: Socket, data: {
        restaurantId: string;
    }): Promise<{
        joined: string;
    } | undefined>;
    handleJoinBilling(client: Socket, data: {
        restaurantId: string;
    }): Promise<{
        joined: string;
    } | undefined>;
    handleJoinTable(client: Socket, data: {
        tableId: string;
        restaurantId: string;
    }): Promise<{
        joined: string;
    } | undefined>;
    handleLeaveRoom(client: Socket, data: {
        room: string;
    }): Promise<{
        left: string;
    } | undefined>;
    handlePing(client: Socket): {
        event: string;
        timestamp: string;
    };
    emitToRestaurant(restaurantId: string, event: string, data: unknown): void;
    emitToKitchen(restaurantId: string, event: string, data: unknown): void;
    emitToBilling(restaurantId: string, event: string, data: unknown): void;
    emitToTable(tableId: string, event: string, data: unknown): void;
    emitTableStatus(tableId: string, restaurantId: string, status: string): void;
    private validateRestaurantAccess;
}
