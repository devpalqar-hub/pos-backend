import { Test, TestingModule } from '@nestjs/testing';
import { StripeController } from './stripe.controller';
import { StripeService } from './stripe.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { mockPrismaService } from '../__mocks__/test-utils';

// Mock StripeService
const mockStripeService = {
  createCheckoutSession: jest.fn(),
  retrieveSession: jest.fn(),
  createPaymentIntent: jest.fn(),
  handleWebhook: jest.fn(),
};

describe('StripeController', () => {
  let controller: StripeController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StripeController],
      providers: [
        {
          provide: StripeService,
          useValue: mockStripeService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    controller = module.get<StripeController>(StripeController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
