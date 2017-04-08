import Accounting from 'accounting';

export function formatAsMoney(value: string): string {
  return Accounting.formatMoney(value, '');
}
