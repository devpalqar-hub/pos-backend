import { DynamicModule, Global, Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StripeController } from './stripe.controller';
import { StripeService } from './stripe.service';
import { WebhookService } from './webhook.service';
import { PrismaModule } from '../prisma/prisma.module';
import { OrdersModule } from '../orders/orders.module';
import { DoorDashModule } from '../doordash/doordash.module';
import { StripeSettingsController } from './stripe-settings.controller';

@Global()
@Module({})
export class StripeModule {
    static forRootAsync(): DynamicModule {
        return {
            module: StripeModule,
            controllers: [StripeController, StripeSettingsController],
            exports: [StripeService],
            imports: [PrismaModule, ConfigModule, OrdersModule, forwardRef(() => DoorDashModule)],
            providers: [StripeService, WebhookService],
        };
    }
}
