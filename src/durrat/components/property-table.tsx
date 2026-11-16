import { Eye, EyeOff, FilePenLine, Trash2 } from 'lucide-react';
import type { Lang } from '@/durrat/lib/i18n';
import { LicenseFlag, StatusBadge } from '@/durrat/components/property-flags';

export type TableProperty = {
  id: string;
  title: string;
  serial_number?: number;
  listing_type: string;
  published: boolean;
  availability?: string;
  license_expiry?: string;
  city: string;
  created_by_name?: string;
};

export function PropertyTable({ properties, lang, onEdit, onDelete, onToggle }: {
  properties: TableProperty[];
  lang: Lang;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
}) {
  const en = lang === 'en';
  const t = (ar: string, english: string) => (en ? english : ar);
  return (
    <div className="staff-table-block">
      <div className="section-top">
        <div>
          <span className="eyebrow">{t('لوحة الموظف', 'Staff desk')}</span>
          <h2>{t('جدول العقارات', 'Property table')}</h2>
        </div>
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>{t('رقم الإعلان', 'No.')}</th>
              <th>{t('العنوان', 'Title')}</th>
              <th>{t('المدينة', 'City')}</th>
              <th>{t('الحالة', 'Status')}</th>
              <th>{t('الترخيص', 'License')}</th>
              <th>{t('الموظف', 'Staff')}</th>
              <th>{t('الظهور', 'Visibility')}</th>
              <th>{t('إجراءات', 'Actions')}</th>
            </tr>
          </thead>
          <tbody>
            {properties.length === 0 ? (
              <tr><td colSpan={8}>{t('لا توجد عقارات في هذا العرض.', 'No properties in this view.')}</td></tr>
            ) : properties.map((property) => (
              <tr key={property.id}>
                <td>#{property.serial_number ?? '—'}</td>
                <td>{property.title}</td>
                <td>{property.city}</td>
                <td><StatusBadge status={property.availability} lang={lang} /></td>
                <td>{property.license_expiry ? <><LicenseFlag expiry={property.license_expiry} lang={lang} /> <span dir="ltr">{property.license_expiry}</span></> : '—'}</td>
                <td>{property.created_by_name}</td>
                <td>
                  <button type="button" className="refresh-button" onClick={() => onToggle(property.id)}>
                    {property.published ? <EyeOff size={14} /> : <Eye size={14} />}
                    {property.published ? t('إخفاء', 'Hide') : t('نشر', 'Publish')}
                  </button>
                </td>
                <td className="table-actions">
                  <button type="button" onClick={() => onEdit(property.id)}><FilePenLine size={14} /> {t('تعديل', 'Edit')}</button>
                  <button type="button" onClick={() => onDelete(property.id)}><Trash2 size={14} /> {t('حذف', 'Delete')}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
