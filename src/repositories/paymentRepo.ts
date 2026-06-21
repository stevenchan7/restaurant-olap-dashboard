import crypto from 'crypto';
import type { PoolClient } from 'pg';
import { pool } from '../db/pool';
import type { Payment, PaymentWithOrder, CreatePaymentInput } from '../types';

function generateReference(): string {
  return `PAY-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

export async function create(
  client: PoolClient,
  { orderId, method, amount, status }: CreatePaymentInput
): Promise<Payment> {
  const ref = generateReference();
  const paidAtSql = status === 'completed' ? 'NOW()' : 'NULL';

  const {
    rows: [payment],
  } = await client.query<Payment>(
    `INSERT INTO payments (order_id, method, amount, status, reference_number, paid_at)
     VALUES ($1, $2, $3, $4, $5, ${paidAtSql})
     RETURNING *`,
    [orderId, method, amount, status, ref]
  );
  return payment;
}

export async function getCompletedTotal(
  client: PoolClient,
  orderId: number
): Promise<number> {
  const {
    rows: [result],
  } = await client.query<{ total: string }>(
    `SELECT COALESCE(SUM(amount), 0)::numeric AS total
     FROM payments
     WHERE order_id = $1 AND status = 'completed'`,
    [orderId]
  );
  return parseFloat(result.total);
}

export async function getRecentPayments(
  limit: number = 20
): Promise<PaymentWithOrder[]> {
  const { rows } = await pool.query<PaymentWithOrder>(
    `SELECT p.*, o.order_number
     FROM payments p
     JOIN orders o ON o.id = p.order_id
     ORDER BY p.created_at DESC
     LIMIT $1`,
    [limit]
  );
  return rows;
}
