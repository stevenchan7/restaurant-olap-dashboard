import { pool } from '../db/pool';
import type { MenuItem } from '../types';

export async function getAvailableItems(): Promise<MenuItem[]> {
  const { rows } = await pool.query<MenuItem>(
    'SELECT * FROM menu_items WHERE is_available = TRUE'
  );
  return rows;
}
