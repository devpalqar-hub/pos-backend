import { jest } from '@jest/globals';

export const mockPrismaService = {
  orderSession: {
    findFirst: jest.fn(),
    create: jest.fn(),
  },
  orderBatch: {
    create: jest.fn(),
  },
  bill: {
    create: jest.fn(),
  },
  payment: {
    create: jest.fn(),
  },
};

export const mockOrdersService = {
  create: jest.fn(),
};

export const mockConfigService = {
  get: jest.fn((key: string) => {
    if (key === 'STRIPE_SECRET_KEY') return 'sk_test_mock_key';
    if (key === 'STRIPE_WEBHOOK_SECRET') return 'whsec_mock_secret';
    return null;
  }),
};

export const mockWebhookService = {
  verifyWebhookSignature: jest.fn(),
  processWebhookEvent: jest.fn(),
};
