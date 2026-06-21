import dotenv from 'dotenv';
import type { PaymentMethod } from './types';

dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required. Copy .env.example to .env and fill it in.');
}

export interface AppConfig {
  db: {
    connectionString: string;
    ssl: { rejectUnauthorized: boolean };
    max: number;
    idleTimeoutMillis: number;
  };
  server: { port: number };
  simulation: {
    orderGenerator: {
      intervalMs: number;
      jitter: number;
      itemsPerOrder: [number, number];
      quantityRange: [number, number];
      taxRate: number;
    };
    kitchen: {
      intervalMs: number;
      advanceProbability: number;
      batchSize: number;
    };
    payment: {
      intervalMs: number;
      payProbability: number;
      failureRate: number;
      methods: PaymentMethod[];
    };
  };
}

const config: AppConfig = {
  db: {
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }, // required for Supabase
    max: 10,
    idleTimeoutMillis: 30_000,
  },

  server: {
    port: parseInt(process.env.PORT ?? '3000', 10),
  },

  simulation: {
    orderGenerator: {
      intervalMs: parseInt(process.env.ORDER_INTERVAL_MS ?? '8000', 10),
      jitter: 0.5,
      itemsPerOrder: [1, 5],
      quantityRange: [1, 3],
      taxRate: 0.10,
    },
    kitchen: {
      intervalMs: parseInt(process.env.KITCHEN_INTERVAL_MS ?? '2500', 10),
      advanceProbability: 0.35,
      batchSize: 10,
    },
    payment: {
      intervalMs: parseInt(process.env.PAYMENT_INTERVAL_MS ?? '6000', 10),
      payProbability: 0.5,
      failureRate: 0.05,
      methods: ['cash', 'card', 'ewallet', 'qris'],
    },
  },
};

export default config;
