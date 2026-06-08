import { DynamicModule, Global, Module, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { StripeController } from './stripe.controller';
import { StripeService } from './stripe.service';
import { WebhookService } from './webhook.service';
import { PrismaModule } from '../prisma/prisma.module';
import { OrdersModule } from '../orders/orders.module';
import { DoorDashModule } from '../doordash/doordash.module';

@Global()
@Module({})
export class StripeModule {
  static forRootAsync(): DynamicModule {
    return {
      module: StripeModule,
      controllers: [StripeController],
      exports: [StripeService],
      imports: [PrismaModule, ConfigModule, OrdersModule, forwardRef(() => DoorDashModule)],
      providers: [
        StripeService,
        WebhookService,
        {
          provide: 'STRIPE_API_KEY',
          useFactory: (configService: ConfigService) =>
            configService.get<string>('STRIPE_SECRET_KEY'),
          inject: [ConfigService],
        },
      ],
    };
  }
}
