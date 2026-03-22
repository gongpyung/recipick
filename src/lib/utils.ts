import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const DATE_FORMATTER = new Intl.DateTimeFormat('ko-KR', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return DATE_FORMATTER.format(date);
}

export function extractErrorCode(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) {
    return String(error.code);
  }
  return 'INTERNAL_ERROR';
}

export const CARD_COLORS = [
  'bg-[#ffcdd2]',
  'bg-[#c8e6c9]',
  'bg-[#ffe0b2]',
  'bg-[#f8bbd9]',
  'bg-[#b3e5fc]',
  'bg-[#ffccbc]',
];
