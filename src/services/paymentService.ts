import { withTransaction } from '../db/pool';
import * as orderRepo from '../repositories/orderRepo';
import * as paymentRepo from '../repositories/paymentRepo';
import config from '../config';
import type { Payment, PaymentMethod } from '../types';

export interface PaymentTickResult {
  payment: Payment;
  orderPaid: boolean;
  orderNumber: string;
}

function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export async function processTick(): Promise<PaymentTickResult[]> {
  const { payProbability, failureRate, methods } = config.simulation.payment;
  const orders = await orderRepo.findByStatus('awaiting_payment');
  const results: PaymentTickResult[] = [];

  for (const order of orders) {
    if (Math.random() > payProbability) continue;

    const result = await withTransaction<PaymentTickResult>(async (client) => {
      const method: PaymentMethod = pickRandom(methods);
      const isFailed = Math.random() < failureRate;
      const status = isFailed ? 'failed' : 'completed';
      const amount = parseFloat(order.total_amount);

      const payment = await paymentRepo.create(client, {
        orderId: order.id,
        method,
        amount,
        status,
      });

      let orderPaid = false;
      if (status === 'completed') {
        const paidTotal = await paymentRepo.getCompletedTotal(client, order.id);
        if (paidTotal >= amount) {
          await orderRepo.updateStatus(client, order.id, 'paid');
          orderPaid = true;
        }
      }

      return { payment, orderPaid, orderNumber: order.order_number };
    });

    results.push(result);
  }

  return results;
}
