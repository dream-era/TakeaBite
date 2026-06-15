import { nanoid } from 'nanoid';

const COOKIE_NAME = 'tb_device';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

export function getOrCreateDeviceCookie(): string {
  if (typeof document === 'undefined') return nanoid(16);

  // Read existing cookie
  const existing = document.cookie
    .split('; ')
    .find(row => row.startsWith(`${COOKIE_NAME}=`))
    ?.split('=')[1];

  if (existing) return existing;

  // Create new cookie
  const id = nanoid(16);
  document.cookie = [
    `${COOKIE_NAME}=${id}`,
    `max-age=${COOKIE_MAX_AGE}`,
    'path=/',
    'SameSite=Lax',
  ].join('; ');

  return id;
}

export function getDeviceCookie(): string | null {
  if (typeof document === 'undefined') return null;
  return document.cookie
    .split('; ')
    .find(row => row.startsWith(`${COOKIE_NAME}=`))
    ?.split('=')[1] ?? null;
}

export function generateOrderToken(): string {
  return nanoid(10); // short unique token for URL
}
