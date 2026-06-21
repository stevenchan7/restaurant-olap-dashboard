import type { PoolClient } from 'pg';
import { pool } from '../db/pool';
import type {
  Order,
  OrderItem,
  OrderWithItems,
  OrderStatus,
  CreateOrderInput,
} from '../types';

async function generateOrderNumber(client: PoolClient): Promise<string> {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const { rows } = await client.query<{ cnt: number }>(
    `SELECT COUNT(*)::int AS cnt FROM orders
     WHERE created_at::date = CURRENT_DATE`
  );
  const seq = String(rows[0].cnt + 1).padStart(3, '0');
  return `ORD-${dateStr}-${seq}`;
}

export async function create(
  client: PoolClient,
  { tableId, items, taxRate }: CreateOrderInput
): Promise<OrderWithItems> {
  const orderNumber = await generateOrderNumber(client);

  const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  const taxAmount = Math.round(subtotal * taxRate * 100) / 100;
  const totalAmount = subtotal + taxAmount;

  const {
    rows: [order],
  } = await client.query<Order>(
    `INSERT INTO orders (order_number, table_id, status, subtotal, tax_amount, total_amount)
     VALUES ($1, $2, 'open', $3, $4, $5)
     RETURNING *`,
    [orderNumber, tableId, subtotal, taxAmount, totalAmount]
  );

  const orderItems: OrderItem[] = [];
  for (const item of items) {
    const itemSubtotal = item.unitPrice * item.quantity;

    const {
      rows: [orderItem],
    } = await client.query<OrderItem>(
      `INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price, subtotal, status)
       VALUES ($1, $2, $3, $4, $5, 'ordered')
       RETURNING *`,
      [order.id, item.menuItemId, item.quantity, item.unitPrice, itemSubtotal]
    );

    await client.query(
      `INSERT INTO order_item_status_history (order_item_id, from_status, to_status)
       VALUES ($1, NULL, 'ordered')`,
      [orderItem.id]
    );

    orderItems.push(orderItem);
  }

  return { ...order, items: orderItems };
}

export async function findByStatus(status: OrderStatus): Promise<Order[]> {
  const { rows } = await pool.query<Order>(
    'SELECT * FROM orders WHERE status = $1 ORDER BY created_at',
    [status]
  );
  return rows;
}

export async function updateStatus(
  client: PoolClient,
  orderId: number,
  status: OrderStatus
): Promise<Order> {
  const closedAtSql = status === 'paid' ? 'NOW()' : 'NULL';
  const {
    rows: [order],
  } = await client.query<Order>(
    `UPDATE orders SET status = $1, closed_at = ${closedAtSql}
     WHERE id = $2 RETURNING *`,
    [status, orderId]
  );
  return order;
}

export interface OrderStats {
  open_orders: string;
  awaiting_payment: string;
  paid_orders: string;
  cancelled_orders: string;
  total_orders: string;
  total_revenue: string;
}

export async function getStats(): Promise<OrderStats> {
  const {
    rows: [stats],
  } = await pool.query<OrderStats>(`
    SELECT
      COUNT(*) FILTER (WHERE status = 'open')              AS open_orders,
      COUNT(*) FILTER (WHERE status = 'awaiting_payment')  AS awaiting_payment,
      COUNT(*) FILTER (WHERE status = 'paid')              AS paid_orders,
      COUNT(*) FILTER (WHERE status = 'cancelled')         AS cancelled_orders,
      COUNT(*)                                             AS total_orders,
      COALESCE(SUM(total_amount) FILTER (WHERE status = 'paid'), 0) AS total_revenue
    FROM orders
  `);
  return stats;
}
