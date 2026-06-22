import { withTransaction } from '../db/pool';
import * as orderRepo from '../repositories/orderRepo';
import * as menuItemRepo from '../repositories/menuItemRepo';
import * as tableRepo from '../repositories/tableRepo';
import config from '../config';
import type { OrderWithItems, NewOrderItemInput } from '../types';

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

export async function generateRandomOrder(): Promise<OrderWithItems> {
  const [tables, menuItems] = await Promise.all([
    tableRepo.getAllTables(),
    menuItemRepo.getAvailableItems(),
  ]);

  if (tables.length === 0 || menuItems.length === 0) {
    throw new Error('No tables or menu items available. Run migrations + seed first.');
  }

  const table = tables[randomInt(0, tables.length - 1)];
  const { itemsPerOrder, quantityRange, taxRate } = config.simulation.orderGenerator;
  const itemCount = randomInt(itemsPerOrder[0], itemsPerOrder[1]);
  const selectedItems = pickRandom(menuItems, itemCount);

  const items: NewOrderItemInput[] = selectedItems.map((mi) => ({
    menuItemId: mi.id,
    quantity: randomInt(quantityRange[0], quantityRange[1]),
    unitPrice: parseFloat(mi.price),
  }));

  return withTransaction((client) =>
    orderRepo.create(client, { tableId: table.id, items, taxRate })
  );
}
