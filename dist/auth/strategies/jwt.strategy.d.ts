import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
export interface JwtPayload {
    sub: string;
    email: string;
    role: string;
}
declare const JwtStrategy_base: new (...args: [opt: import("passport-jwt").StrategyOptionsWithRequest] | [opt: import("passport-jwt").StrategyOptionsWithoutRequest]) => Strategy & {
    validate(...args: any[]): unknown;
};
export declare class JwtStrategy extends JwtStrategy_base {
    private readonly configService;
    private readonly prisma;
    constructor(configService: ConfigService, prisma: PrismaService);
    validate(payload: JwtPayload): Promise<{
        restaurant: {
            id: string;
            name: string;
        } | null;
    } & {
        email: string;
        id: string;
        name: string;
        role: import("generated/prisma").$Enums.UserRole;
        isActive: boolean;
        createdById: string | null;
        restaurantId: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
}
export {};
