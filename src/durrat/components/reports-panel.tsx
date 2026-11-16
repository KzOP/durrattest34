import { useMemo, useState } from 'react';
import { FileSpreadsheet, Printer } from 'lucide-react';
import type { Lang } from '@/durrat/lib/i18n';
import { formatListingLabel, formatPrice, type RentPeriod } from '@/durrat/lib/listing-format';
import { STATUS_LABELS, licenseWatch, normalizeStatus, type PropertyStatus } from '@/durrat/lib/property-meta';

export type ReportProperty = {
  id: string;
  title: string;
  listing_type: 'sale' | 'rent';
  rent_period?: RentPeriod;
  city: string;
  price: number;
  published: boolean;
  created_at: string;
  serial_number?: number;
  availability?: string;
  created_by_staff_id?: string | null;
  created_by_name?: string;
  license_expiry?: string;
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] ?? char));
}

function downloadCsv(rows: string[][], filename: string) {
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\r\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function ReportsPanel({ properties, isAdmin, staffId, lang, logo }: {
  properties: ReportProperty[];
  isAdmin: boolean;
  staffId: string;
  lang: Lang;
  logo: string;
}) {
  const en = lang === 'en';
  const t = (ar: string, english: string) => (en ? english : ar);
  const [listingType, setListingType] = useState<'all' | 'sale' | 'rent'>('all');
  const [status, setStatus] = useState<'all' | PropertyStatus>('all');
  const [staffFilter, setStaffFilter] = useState(isAdmin ? 'all' : staffId);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const scoped = useMemo(
    () => (isAdmin ? properties : properties.filter((property) => property.created_by_staff_id === staffId)),
    [properties, isAdmin, staffId],
  );
  const staffOptions = useMemo(() => {
    const map = new Map<string, string>();
    scoped.forEach((property) => {
      if (property.created_by_staff_id) map.set(property.created_by_staff_id, property.created_by_name || property.created_by_staff_id);
    });
    return [...map.entries()];
  }, [scoped]);

  const filtered = useMemo(() => scoped.filter((property) => {
    if (listingType !== 'all' && property.listing_type !== listingType) return false;
    if (status !== 'all' && normalizeStatus(property.availability) !== status) return false;
    if (staffFilter !== 'all' && property.created_by_staff_id !== staffFilter) return false;
    const day = (property.created_at ?? '').slice(0, 10);
    if (from && day < from) return false;
    if (to && day > to) return false;
    return true;
  }), [scoped, listingType, status, staffFilter, from, to]);

  const counts = {
    total: filtered.length,
    available: filtered.filter((property) => normalizeStatus(property.availability) === 'available').length,
    sold: filtered.filter((property) => normalizeStatus(property.availability) === 'sold').length,
    rented: filtered.filter((property) => normalizeStatus(property.availability) === 'rented').length,
  };
  const perStaff = staffOptions.map(([id, name]) => ({
    name,
    count: filtered.filter((property) => property.created_by_staff_id === id).length,
  })).filter((row) => row.count > 0);

  const rows = filtered.map((property) => [
    String(property.serial_number ?? ''),
    property.title,
    formatListingLabel(property.listing_type, property.rent_period, lang),
    STATUS_LABELS[normalizeStatus(property.availability)][lang],
    property.city,
    formatPrice(property.price, property.listing_type, property.rent_period, lang),
    property.created_by_name || '',
    property.published ? t('منشور', 'Published') : t('مخفي', 'Hidden'),
    property.license_expiry || '',
  ]);

  const printReport = () => {
    const popup = window.open('', '_blank', 'noopener,noreferrer,width=980,height=720');
    if (!popup) return;
    const printedAt = new Intl.DateTimeFormat(en ? 'en-GB' : 'ar-SA', { dateStyle: 'full', timeStyle: 'short' }).format(new Date());
    const head = [t('رقم الإعلان', 'Listing no.'), t('العنوان', 'Title'), t('العملية', 'Deal'), t('الحالة', 'Status'), t('المدينة', 'City'), t('السعر', 'Price'), t('الموظف', 'Staff'), t('الظهور', 'Visibility'), t('انتهاء الترخيص', 'License expiry')];
    const body = rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('');
    popup.document.write(`<!DOCTYPE html><html lang="${lang}" dir="${en ? 'ltr' : 'rtl'}"><head><meta charset="utf-8"><title>تقرير مكتب درة الهجرة للعقارات</title>
      <style>
        body { font-family: Tahoma, Arial, sans-serif; color: #17283c; margin: 24px; }
        header { display: flex; align-items: center; justify-content: space-between; gap: 16px; border-bottom: 3px solid #b58b42; padding-bottom: 12px; }
        header img { width: 72px; height: 72px; object-fit: contain; }
        h1 { margin: 0; font-size: 22px; }
        p { margin: 4px 0; color: #526170; font-size: 13px; }
        table { width: 100%; border-collapse: collapse; margin-top: 18px; font-size: 12px; }
        th, td { border: 1px solid #d5deE8; padding: 7px; text-align: start; }
        th { background: #132940; color: #fff; }
        @media print { body { margin: 0; } }
      </style></head><body>
      <header><div><h1>مكتب درة الهجرة للعقارات</h1><p>${escapeHtml(t('تقرير العقارات', 'Property report'))}</p><p>${escapeHtml(printedAt)}</p></div>
      <img src="${escapeHtml(logo)}" alt=""></header>
      <table><thead><tr>${head.map((cell) => `<th>${escapeHtml(cell)}</th>`).join('')}</tr></thead><tbody>${body || `<tr><td colspan="9">${escapeHtml(t('لا توجد بيانات', 'No rows'))}</td></tr>`}</tbody></table>
      </body></html>`);
    popup.document.close();
    popup.focus();
    popup.print();
  };

  const exportCsv = () => {
    const header = ['رقم الإعلان', 'العنوان', 'العملية', 'الحالة', 'المدينة', 'السعر', 'الموظف', 'الظهور', 'انتهاء الترخيص'];
    const day = new Date().toISOString().slice(0, 10);
    downloadCsv([header, ...rows], `durrat-report-${day}.csv`);
  };

  return (
    <div className="office-panel">
      <div className="form-heading">
        <div>
          <span className="eyebrow">{t('مركز التقارير', 'Reports')}</span>
          <h2>{t('التقارير والطباعة', 'Reports and printing')}</h2>
        </div>
        <div className="panel-actions">
          <button type="button" className="outline-button" onClick={printReport}><Printer size={15} /> {t('طباعة / حفظ PDF', 'Print / Save PDF')}</button>
          <button type="button" className="primary-button small" onClick={exportCsv}><FileSpreadsheet size={15} /> {t('تصدير Excel (CSV)', 'Export Excel (CSV)')}</button>
        </div>
      </div>
      <div className="report-filters">
        <label>{t('نوع العملية', 'Deal type')}
          <select value={listingType} onChange={(event) => setListingType(event.target.value as 'all' | 'sale' | 'rent')}>
            <option value="all">{t('الكل', 'All')}</option>
            <option value="sale">{t('بيع', 'Sale')}</option>
            <option value="rent">{t('إيجار', 'Rent')}</option>
          </select>
        </label>
        <label>{t('حالة العقار', 'Property status')}
          <select value={status} onChange={(event) => setStatus(event.target.value as 'all' | PropertyStatus)}>
            <option value="all">{t('الكل', 'All')}</option>
            {(Object.keys(STATUS_LABELS) as PropertyStatus[]).map((key) => <option key={key} value={key}>{STATUS_LABELS[key][lang]}</option>)}
          </select>
        </label>
        <label>{t('الموظف المسؤول', 'Staff')}
          <select value={isAdmin ? staffFilter : staffId} disabled={!isAdmin} onChange={(event) => setStaffFilter(event.target.value)}>
            {isAdmin && <option value="all">{t('كل الموظفين', 'All staff')}</option>}
            {staffOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
        </label>
        <label>{t('من تاريخ', 'From')}<input type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label>
        <label>{t('إلى تاريخ', 'To')}<input type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label>
      </div>
      <div className="report-stats">
        <div><strong>{counts.total}</strong><small>{t('إجمالي العقارات', 'Total properties')}</small></div>
        <div><strong>{counts.available}</strong><small>{t('المتاحة', 'Available')}</small></div>
        <div><strong>{counts.sold}</strong><small>{t('المباعة', 'Sold')}</small></div>
        <div><strong>{counts.rented}</strong><small>{t('المؤجرة', 'Rented')}</small></div>
      </div>
      {perStaff.length > 0 && (
        <ul className="staff-counts">
          {perStaff.map((row) => <li key={row.name}><b>{row.count}</b> {row.name}</li>)}
        </ul>
      )}
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>{t('رقم الإعلان', 'No.')}</th>
              <th>{t('العنوان', 'Title')}</th>
              <th>{t('العملية', 'Deal')}</th>
              <th>{t('الحالة', 'Status')}</th>
              <th>{t('المدينة', 'City')}</th>
              <th>{t('السعر', 'Price')}</th>
              <th>{t('الموظف', 'Staff')}</th>
              <th>{t('الظهور', 'Visibility')}</th>
              <th>{t('الترخيص', 'License')}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? <tr><td colSpan={9}>{t('لا توجد عقارات ضمن التصفية.', 'No properties match these filters.')}</td></tr> : filtered.map((property) => {
              const watch = licenseWatch(property.license_expiry);
              return (
                <tr key={property.id} className={watch === 'expired' ? 'row-expired' : watch === 'soon' ? 'row-soon' : undefined}>
                  <td>#{property.serial_number ?? '—'}</td>
                  <td>{property.title}</td>
                  <td>{formatListingLabel(property.listing_type, property.rent_period, lang)}</td>
                  <td>{STATUS_LABELS[normalizeStatus(property.availability)][lang]}</td>
                  <td>{property.city}</td>
                  <td>{formatPrice(property.price, property.listing_type, property.rent_period, lang)}</td>
                  <td>{property.created_by_name}</td>
                  <td>{property.published ? t('منشور', 'Published') : t('مخفي', 'Hidden')}</td>
                  <td>{property.license_expiry || '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
