import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/durrat/lib/firebase';

export type SiteSettings = {
  whatsapp: string;
  phones: string;
  about: string;
  address: string;
};

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  whatsapp: '0569996744',
  phones: '0569996744',
  about: 'الجوال متاح يومياً من 9:00 صباحاً إلى 12:00 ظهراً، ومن صلاة العصر حتى 12:00 ليلاً. موقع المكتب متاح خلال ساعات التواصل المذكورة أعلاه.',
  address: 'المدينة المنورة',
};

export const SITE_SETTINGS_DOC = doc(db, 'site_settings', 'general');

export function parseSiteSettings(value: unknown): SiteSettings {
  const data = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const text = (key: keyof SiteSettings) => {
    const raw = data[key];
    return typeof raw === 'string' && raw.trim() ? raw.trim() : DEFAULT_SITE_SETTINGS[key];
  };
  return {
    whatsapp: text('whatsapp'),
    phones: text('phones'),
    about: text('about'),
    address: text('address'),
  };
}

export function splitPhones(phones: string) {
  return phones.split(/[\n,،/|]+/).map((phone) => phone.trim()).filter(Boolean);
}

export function saveSiteSettings(settings: SiteSettings) {
  return setDoc(SITE_SETTINGS_DOC, {
    ...settings,
    updated_at: new Date().toISOString(),
  });
}
