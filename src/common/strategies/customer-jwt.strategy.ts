import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

export interface CustomerJwtPayload {
    sub: string; // customer id
    email?: string;
    restaurantId: string;
    type: 'customer';
}

@Injectable()
export class CustomerJwtStrategy extends PassportStrategy(
    Strategy,
    'customer-jwt',
) {
    constructor(
        private readonly configService: ConfigService,
        private readonly prisma: PrismaService,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>('JWT_SECRET', 'fallback-secret'),
        });
    }

    async validate(payload: CustomerJwtPayload) {
        if (payload.type !== 'customer') {
            throw new UnauthorizedException('Invalid token type');
        }

        const customer = await this.prisma.customer.findUnique({
            where: { id: payload.sub },
            include: {
                restaurant: {
                    select: { id: true, name: true },
                },
            },
        });

        if (!customer || !customer.isActive) {
            throw new UnauthorizedException('Customer not found or inactive');
        }

        return {
            id: customer.id,
            email: customer.email,
            phone: customer.phone,
            restaurantId: customer.restaurantId,
            type: 'customer',
            restaurant: customer.restaurant,
        };
    }
}