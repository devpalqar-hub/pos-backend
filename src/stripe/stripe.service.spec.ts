import { Test, TestingModule } from '@nestjs/testing';
import { StripeService } from './stripe.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { OrdersService } from 'src/orders/orders.service';
import { ConfigService } from '@nestjs/config';
import { WebhookService } from './webhook.service';
import {
  mockPrismaService,
  mockOrdersService,
  mockConfigService,
  mockWebhookService,
} from '../__mocks__/test-utils';

describe('StripeService', () => {
  let service: StripeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StripeService,
        {
          provide: 'STRIPE_API_KEY',
          useValue: 'sk_test_mock_key',
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: OrdersService,
          useValue: mockOrdersService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: WebhookService,
          useValue: mockWebhookService,
        },
      ],
    }).compile();

    service = module.get<StripeService>(StripeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
