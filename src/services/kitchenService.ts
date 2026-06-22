import { withTransaction } from '../db/pool';
import * as orderItemRepo from '../repositories/orderItemRepo';
import * as orderRepo from '../repositories/orderRepo';
import config from '../config';
import type { OrderItem } from '../types';

export interface KitchenTickResult {
  item: OrderItem;
  orderReady: boolean;
  orderNumber: string;
}

export async function processTick(): Promise<KitchenTickResult[]> {
  const { advanceProbability, batchSize } = config.simulation.kitchen;
  const items = await orderItemRepo.findAdvanceable(batchSize);
  const results: KitchenTickResult[] = [];

  for (const item of items) {
    if (Math.random() > advanceProbability) continue;

    const result = await withTransaction<KitchenTickResult | null>(async (client) => {
      const updated = await orderItemRepo.advanceStatus(client, item.id, item.status);
      if (!updated) return null;

      let orderReady = false;
      if (updated.status === 'served') {
        const allServed = await orderItemRepo.allItemsServed(client, item.order_id);
        if (allServed) {
          await orderRepo.updateStatus(client, item.order_id, 'awaiting_payment');
          orderReady = true;
        }
      }

      return { item: updated, orderReady, orderNumber: item.order_number };
    });

    if (result) results.push(result);
  }

  return results;
}
