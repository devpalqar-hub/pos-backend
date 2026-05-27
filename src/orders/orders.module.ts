import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrdersGateway } from './orders.gateway';
import { PrismaModule } from '../prisma/prisma.module';
import { ToastModule } from '../toast/toast.module';

@Module({
    imports: [
        PrismaModule,
        ToastModule,
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                secret: config.get<string>('JWT_SECRET', 'fallback-secret'),
                signOptions: {
                    expiresIn: config.get('JWT_EXPIRES_IN', '7d') as any,
                },
            }),
        }),
    ],
    controllers: [OrdersController],
    providers: [OrdersService, OrdersGateway],
    exports: [OrdersService, OrdersGateway],
})
export class OrdersModule { }
