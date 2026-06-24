import type { WorkerStatus } from '../types';

export interface Worker {
  start(): void;
  stop(): void;
  status(): WorkerStatus;
}

const IDR = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

export function formatIDR(value: string | number): string {
  return IDR.format(typeof value === 'string' ? parseFloat(value) : value);
}
