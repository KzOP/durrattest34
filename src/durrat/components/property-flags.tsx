import type { Lang } from '@/durrat/lib/i18n';
import { STATUS_LABELS, licenseWatch, normalizeStatus, type PropertyStatus } from '@/durrat/lib/property-meta';

export function StatusBadge({ status, lang }: { status?: string; lang: Lang }) {
  const value: PropertyStatus = normalizeStatus(status);
  return <span className={`status-badge status-${value}`}>{STATUS_LABELS[value][lang]}</span>;
}

export function LicenseFlag({ expiry, lang }: { expiry?: string; lang: Lang }) {
  const watch = licenseWatch(expiry);
  if (watch !== 'expired' && watch !== 'soon') return null;
  const label = watch === 'expired'
    ? (lang === 'en' ? 'License expired' : 'انتهى الترخيص')
    : (lang === 'en' ? 'License expiring soon' : 'الترخيص قارب على الانتهاء');
  return <span className={`license-flag ${watch}`}>{label}</span>;
}
