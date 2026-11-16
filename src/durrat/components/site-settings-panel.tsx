import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import type { Lang } from '@/durrat/lib/i18n';
import { saveSiteSettings, type SiteSettings } from '@/durrat/lib/site-settings';

export function SiteSettingsPanel({ initial, lang }: { initial: SiteSettings; lang: Lang }) {
  const en = lang === 'en';
  const t = (ar: string, english: string) => (en ? english : ar);
  const [form, setForm] = useState(initial);
  const [message, setMessage] = useState('');
  useEffect(() => setForm(initial), [initial]);
  const [busy, setBusy] = useState(false);

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const whatsapp = form.whatsapp.trim();
    const phones = form.phones.trim();
    if (whatsapp.replace(/\D/g, '').length < 9 || !phones) {
      setMessage(t('أدخل رقم واتساب وأرقام تواصل صحيحة.', 'Enter a WhatsApp number and contact numbers.'));
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      await saveSiteSettings({
        whatsapp,
        phones,
        about: form.about.trim(),
        address: form.address.trim(),
      });
      setMessage(t('تم حفظ إعدادات الموقع وستظهر في الواجهة العامة.', 'Site settings saved and will show on the public site.'));
    } catch {
      setMessage(t('تعذر حفظ الإعدادات. تأكد أن حساب المدير يملك صلاحية الكتابة.', 'Could not save settings. Confirm the admin account can write this document.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="office-panel" onSubmit={(event) => void save(event)}>
      <div className="form-heading">
        <div>
          <span className="eyebrow">{t('المدير العام', 'General admin')}</span>
          <h2>{t('إعدادات الموقع', 'Site settings')}</h2>
        </div>
      </div>
      <div className="panel-form">
        <label>{t('رقم الواتساب', 'WhatsApp number')}<input dir="ltr" value={form.whatsapp} onChange={(event) => setForm({ ...form, whatsapp: event.target.value })} required /></label>
        <label>{t('أرقام التواصل', 'Contact numbers')}<textarea rows={3} value={form.phones} onChange={(event) => setForm({ ...form, phones: event.target.value })} required placeholder={t('رقم في كل سطر', 'One number per line')} /></label>
        <label className="span-2">{t('نبذة عن المكتب', 'About the office')}<textarea rows={4} value={form.about} onChange={(event) => setForm({ ...form, about: event.target.value })} /></label>
        <label className="span-2">{t('العنوان', 'Address')}<input value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} /></label>
      </div>
      {message && <div className="form-note">{message}</div>}
      <button className="primary-button" disabled={busy}>{busy ? t('جارٍ الحفظ...', 'Saving…') : t('حفظ الإعدادات', 'Save settings')}</button>
    </form>
  );
}
