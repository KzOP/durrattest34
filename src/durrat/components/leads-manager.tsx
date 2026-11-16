import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { collection, doc, onSnapshot, query, setDoc, updateDoc, where } from 'firebase/firestore';
import { db } from '@/durrat/lib/firebase';
import type { Lang } from '@/durrat/lib/i18n';

export type LeadStatus = 'new' | 'followed' | 'interested' | 'won' | 'closed';
export type LeadRequest = 'buy' | 'rent' | 'sell' | 'lease';

type Lead = {
  id: string;
  name: string;
  phone: string;
  request_type: LeadRequest;
  property_interest: string;
  assigned_staff_id: string;
  assigned_staff_name: string;
  notes: string;
  status: LeadStatus;
  created_at: string;
  created_by_staff_id: string;
};

type StaffOption = { id: string; name: string };

const REQUESTS: Record<LeadRequest, { ar: string; en: string }> = {
  buy: { ar: 'شراء', en: 'Buy' },
  rent: { ar: 'إيجار', en: 'Rent' },
  sell: { ar: 'بيع', en: 'Sell' },
  lease: { ar: 'تأجير', en: 'Lease out' },
};

const STATUSES: Record<LeadStatus, { ar: string; en: string }> = {
  new: { ar: 'جديد', en: 'New' },
  followed: { ar: 'تمت المتابعة', en: 'Followed up' },
  interested: { ar: 'مهتم', en: 'Interested' },
  won: { ar: 'تمت الصفقة', en: 'Deal closed' },
  closed: { ar: 'مغلق', en: 'Closed' },
};

function normalizeLead(id: string, data: Record<string, unknown>): Lead {
  const request = data.request_type;
  const status = data.status;
  return {
    id,
    name: String(data.name ?? ''),
    phone: String(data.phone ?? ''),
    request_type: request === 'rent' || request === 'sell' || request === 'lease' ? request : 'buy',
    property_interest: String(data.property_interest ?? ''),
    assigned_staff_id: String(data.assigned_staff_id ?? ''),
    assigned_staff_name: String(data.assigned_staff_name ?? ''),
    notes: String(data.notes ?? ''),
    status: status === 'followed' || status === 'interested' || status === 'won' || status === 'closed' ? status : 'new',
    created_at: String(data.created_at ?? ''),
    created_by_staff_id: String(data.created_by_staff_id ?? ''),
  };
}

export function LeadsManager({ staffId, staffName, isAdmin, lang }: {
  staffId: string; staffName: string; isAdmin: boolean; lang: Lang;
}) {
  const en = lang === 'en';
  const t = (ar: string, english: string) => (en ? english : ar);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [staffOptions, setStaffOptions] = useState<StaffOption[]>([{ id: staffId, name: staffName }]);
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    const apply = (rows: Lead[]) => {
      const unique = new Map(rows.map((lead) => [lead.id, lead]));
      setLeads([...unique.values()].sort((a, b) => b.created_at.localeCompare(a.created_at)));
      setLoadError('');
    };
    if (isAdmin) {
      return onSnapshot(collection(db, 'leads'), (snapshot) => {
        apply(snapshot.docs.map((item) => normalizeLead(item.id, item.data())));
      }, () => setLoadError(t('تعذر تحميل العملاء.', 'Could not load leads.')));
    }
    const createdQuery = query(collection(db, 'leads'), where('created_by_staff_id', '==', staffId));
    const assignedQuery = query(collection(db, 'leads'), where('assigned_staff_id', '==', staffId));
    let created: Lead[] = [];
    let assigned: Lead[] = [];
    const publish = () => apply([...created, ...assigned]);
    const unsubCreated = onSnapshot(createdQuery, (snapshot) => {
      created = snapshot.docs.map((item) => normalizeLead(item.id, item.data()));
      publish();
    }, () => setLoadError(t('تعذر تحميل العملاء الخاصين بك.', 'Could not load your leads.')));
    const unsubAssigned = onSnapshot(assignedQuery, (snapshot) => {
      assigned = snapshot.docs.map((item) => normalizeLead(item.id, item.data()));
      publish();
    }, () => undefined);
    return () => { unsubCreated(); unsubAssigned(); };
  }, [isAdmin, staffId, en]);

  useEffect(() => {
    if (!isAdmin) return;
    return onSnapshot(collection(db, 'employees'), (snapshot) => {
      const options = snapshot.docs
        .filter((item) => item.data().active !== false)
        .map((item) => ({ id: item.id, name: String(item.data().displayName ?? '') || item.id }));
      if (!options.some((option) => option.id === staffId)) options.unshift({ id: staffId, name: staffName });
      setStaffOptions(options);
    }, () => undefined);
  }, [isAdmin, staffId, staffName]);

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return leads;
    return leads.filter((lead) => lead.name.toLowerCase().includes(needle) || lead.phone.replace(/\s/g, '').includes(needle.replace(/\s/g, '')));
  }, [leads, search]);

  const addLead = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const name = String(data.get('name') ?? '').trim();
    const phone = String(data.get('phone') ?? '').trim();
    const assignedId = isAdmin ? String(data.get('assigned') ?? staffId) : staffId;
    const assigned = staffOptions.find((option) => option.id === assignedId) ?? { id: staffId, name: staffName };
    if (name.length < 2 || phone.replace(/\D/g, '').length < 9) {
      setMessage(t('أدخل الاسم ورقم جوال صحيح.', 'Enter a name and a valid mobile number.'));
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      const ref = doc(collection(db, 'leads'));
      await setDoc(ref, {
        name,
        phone,
        request_type: String(data.get('request_type') ?? 'buy'),
        property_interest: String(data.get('property_interest') ?? '').trim(),
        assigned_staff_id: assigned.id,
        assigned_staff_name: assigned.name,
        notes: String(data.get('notes') ?? '').trim(),
        status: 'new',
        created_at: new Date().toISOString(),
        created_by_staff_id: staffId,
      });
      form.reset();
      setMessage(t('تمت إضافة العميل.', 'Lead added.'));
    } catch {
      setMessage(t('تعذر حفظ العميل. تحقق من الاتصال وصلاحيات Firestore.', 'Could not save the lead. Check the connection and Firestore rules.'));
    } finally {
      setBusy(false);
    }
  };

  const updateStatus = async (lead: Lead, status: LeadStatus) => {
    setMessage('');
    try {
      await updateDoc(doc(db, 'leads', lead.id), { status });
    } catch {
      setMessage(t('تعذر تحديث حالة العميل.', 'Could not update the lead status.'));
    }
  };

  return (
    <div className="office-panel">
      <div className="form-heading">
        <div>
          <span className="eyebrow">{t('إدارة العملاء', 'Client desk')}</span>
          <h2>{t('العملاء والاستفسارات', 'Clients and inquiries')}</h2>
        </div>
      </div>
      <form className="panel-form" onSubmit={(event) => void addLead(event)}>
        <label>{t('الاسم', 'Name')}<input name="name" required maxLength={80} /></label>
        <label>{t('رقم الجوال', 'Mobile')}<input name="phone" required inputMode="tel" dir="ltr" /></label>
        <label>{t('نوع الطلب', 'Request')}
          <select name="request_type" defaultValue="buy">
            {(Object.keys(REQUESTS) as LeadRequest[]).map((key) => <option key={key} value={key}>{REQUESTS[key][lang]}</option>)}
          </select>
        </label>
        <label>{t('العقار المطلوب', 'Requested property')}<input name="property_interest" maxLength={120} /></label>
        <label>{t('الموظف المسؤول', 'Assigned staff')}
          {isAdmin ? (
            <select name="assigned" defaultValue={staffId}>
              {staffOptions.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
            </select>
          ) : <input value={staffName} readOnly />}
        </label>
        <label className="span-2">{t('الملاحظات', 'Notes')}<textarea name="notes" rows={2} maxLength={500} /></label>
        <button className="primary-button small" disabled={busy}>{busy ? t('جارٍ الحفظ...', 'Saving…') : t('إضافة عميل', 'Add client')}</button>
      </form>
      {message && <div className="form-note">{message}</div>}
      {loadError && <div className="form-error">{loadError}</div>}
      <label className="panel-search">{t('بحث بالاسم أو الجوال', 'Search by name or mobile')}
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('الاسم أو 05...', 'Name or 05...')} />
      </label>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>{t('الاسم', 'Name')}</th>
              <th>{t('الجوال', 'Mobile')}</th>
              <th>{t('الطلب', 'Request')}</th>
              <th>{t('العقار', 'Property')}</th>
              <th>{t('الموظف', 'Staff')}</th>
              <th>{t('الحالة', 'Status')}</th>
              <th>{t('ملاحظات', 'Notes')}</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr><td colSpan={7}>{t('لا يوجد عملاء مطابقون.', 'No matching clients.')}</td></tr>
            ) : visible.map((lead) => (
              <tr key={lead.id}>
                <td>{lead.name}</td>
                <td dir="ltr">{lead.phone}</td>
                <td>{REQUESTS[lead.request_type][lang]}</td>
                <td>{lead.property_interest || '—'}</td>
                <td>{lead.assigned_staff_name || '—'}</td>
                <td>
                  <select aria-label={t('حالة العميل', 'Client status')} value={lead.status} onChange={(event) => void updateStatus(lead, event.target.value as LeadStatus)}>
                    {(Object.keys(STATUSES) as LeadStatus[]).map((key) => <option key={key} value={key}>{STATUSES[key][lang]}</option>)}
                  </select>
                </td>
                <td>{lead.notes || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
