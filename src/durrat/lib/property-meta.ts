export const PROPERTY_STATUSES = ['available', 'reserved', 'sold', 'rented', 'suspended', 'archived'] as const;
export type PropertyStatus = (typeof PROPERTY_STATUSES)[number];

export const STATUS_LABELS: Record<PropertyStatus, { ar: string; en: string }> = {
  available: { ar: 'متاح', en: 'Available' },
  reserved: { ar: 'محجوز', en: 'Reserved' },
  sold: { ar: 'مباع', en: 'Sold' },
  rented: { ar: 'مؤجر', en: 'Rented' },
  suspended: { ar: 'موقوف', en: 'Suspended' },
  archived: { ar: 'مؤرشف', en: 'Archived' },
};

export function normalizeStatus(value: unknown): PropertyStatus {
  return PROPERTY_STATUSES.includes(value as PropertyStatus) ? (value as PropertyStatus) : 'available';
}

export type LicenseWatch = 'none' | 'ok' | 'soon' | 'expired';

/** Warn when a listing license is expired or due within 14 days. */
export function licenseWatch(expiry?: string, now = new Date()): LicenseWatch {
  const value = (expiry ?? '').trim();
  if (!value) return 'none';
  const end = new Date(`${value}T23:59:59`);
  if (Number.isNaN(end.getTime())) return 'none';
  const days = (end.getTime() - now.getTime()) / 86_400_000;
  if (days < 0) return 'expired';
  if (days <= 14) return 'soon';
  return 'ok';
}

export function isStoredVideoUrl(value?: string) {
  return Boolean(value && /^https?:\/\//i.test(value.trim()));
}

export function isDuplicateSerial(
  properties: { id: string; serial_number?: number | null }[],
  serial: number,
  currentId?: string,
) {
  return properties.some((property) => property.serial_number === serial && property.id !== currentId);
}
