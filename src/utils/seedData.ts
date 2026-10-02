import { Expense } from '../types/expense';

/**
 * Returns an empty array. No mock or seed data is preloaded.
 * Data is exclusively loaded via Google Account login / Google Drive sync
 * or direct spreadsheet upload (.xlsx / .csv).
 */
export function generateSeedExpenses(): Expense[] {
  return [];
}
