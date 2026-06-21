import type { PoolClient } from "pg";
import { pool } from "../db/pool";
import type { OrderItem, OrderItemWithOrder, ItemStatus } from "../types";

export const STATUS_FLOW: readonly ItemStatus[] = [
  "ordered",
  "on_process",
  "finished",
  "served",
] as const;

export function getNextStatus(current: ItemStatus): ItemStatus | null {
  const idx = STATUS_FLOW.indexOf(current);
  if (idx === -1 || idx >= STATUS_FLOW.length - 1) return null;
  return STATUS_FLOW[idx + 1];
}

// Find order items  with status 'ordered', 'on_process', or 'finished' for open orders, ordered by creation time
export async function findAdvanceable(
  limit: number = 10,
): Promise<OrderItemWithOrder[]> {
  const { rows } = await pool.query<OrderItemWithOrder>(
    `SELECT oi.*, o.order_number
     FROM order_items oi
     JOIN orders o ON o.id = oi.order_id
     WHERE oi.status IN ('ordered', 'on_process', 'finished')
       AND o.status = 'open'
     ORDER BY oi.created_at
     LIMIT $1`,
    [limit],
  );
  return rows;
}

export async function advanceStatus(
  client: PoolClient,
  orderItemId: number,
  currentStatus: ItemStatus,
): Promise<OrderItem | null> {
  const nextStatus = getNextStatus(currentStatus);
  if (!nextStatus) return null;

  const {
    rows: [item],
  } = await client.query<OrderItem>(
    `UPDATE order_items
     SET status = $1, updated_at = NOW()
     WHERE id = $2 AND status = $3
     RETURNING *`,
    [nextStatus, orderItemId, currentStatus],
  );

  if (!item) return null; // concurrent update; skip

  await client.query(
    `INSERT INTO order_item_status_history (order_item_id, from_status, to_status)
     VALUES ($1, $2, $3)`,
    [orderItemId, currentStatus, nextStatus],
  );

  return item;
}

// Check if all items of an order are all served
export async function allItemsServed(
  client: PoolClient,
  orderId: number,
): Promise<boolean> {
  const {
    rows: [result],
  } = await client.query<{ total: string; served: string }>(
    `SELECT
       COUNT(*) AS total,
       COUNT(*) FILTER (WHERE status = 'served') AS served
     FROM order_items
     WHERE order_id = $1`,
    [orderId],
  );
  const total = parseInt(result.total, 10);
  const served = parseInt(result.served, 10);
  return total > 0 && total === served;
}

export interface StatusCount {
  status: ItemStatus;
  count: number;
}

// Get count of order items grouped by status
export async function getStatusCounts(): Promise<StatusCount[]> {
  const { rows } = await pool.query<StatusCount>(`
    SELECT status, COUNT(*)::int AS count
    FROM order_items
    GROUP BY status
    ORDER BY status
  `);
  return rows;
}
