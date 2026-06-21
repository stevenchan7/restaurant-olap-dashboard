import { pool } from '../db/pool';
import type { RestaurantTable } from '../types';

export async function getAllTables(): Promise<RestaurantTable[]> {
  const { rows } = await pool.query<RestaurantTable>(
    'SELECT id, table_number, capacity FROM restaurant_tables ORDER BY id'
  );
  return rows;
}
