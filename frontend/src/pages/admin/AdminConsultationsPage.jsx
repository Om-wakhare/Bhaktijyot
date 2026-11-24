import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MessageCircle, Phone } from 'lucide-react';
import api, { getErrorMessage } from '../../services/apiClient';
import {
  Button, Card, EmptyState, ErrorState, LoadingState, Page, Pagination, Pill, Select, Tabs, Textarea, cn,
} from '../../components/admin/ui';
import { useToast } from '../../components/admin/Toast';
import {
  formatCalendarDate, formatDateTime, notifyAdminCountsChanged, useLatestRequest, whatsappLink,
} from '../../components/admin/adminUtils';

const LIMIT = 25;
const CONCERN_PREVIEW = 160;

const STATUS_META = {
  new: { label: 'New', className: 'bg-amber-100 text-amber-800' },
  contacted: { label: 'Contacted', className: 'bg-blue-100 text-blue-800' },
  booked: { label: 'Booked', className: 'bg-purple-100 text-purple-800' },
  completed: { label: 'Completed', className: 'bg-emerald-100 text-emerald-800' },
  cancelled: { label: 'Cancelled', className: 'bg-gray-100 text-gray-500' },
};
const STATUSES = Object.keys(STATUS_META);

function statusMeta(status) {
  return STATUS_META[status] ?? { label: status || '—', className: 'bg-gray-100 text-gray-700' };
}

function ConsultationRow({ item, onSaved }) {
  const toast = useToast();
  const [status, setStatus] = useState(item.status);
  const [notes, setNotes] = useState(item.admin_notes ?? '');
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);

  // Follow server changes (after a save or a refetch)
  useEffect(() => { setStatus(item.status); }, [item.status]);
  useEffect(() => { setNotes(item.admin_notes ?? ''); }, [item.admin_notes]);

  const dirty = status !== item.status || notes !== (item.admin_notes ?? '');
  const meta = statusMeta(item.status);
  const wa = whatsappLink(item.phone);
  const concern = item.concern || '';
  const longConcern = concern.length > CONCERN_PREVIEW;
  const preferred = [formatCalendarDate(item.preferred_date), item.preferred_time].filter(Boolean).join(' · ');

  const save = async () => {
    if (!dirty || saving) return;
    setSaving(true);
    try {
      const res = await api.put(`/consultations/${item.id}/status`, { status, admin_notes: notes });
      onSaved(res.data);
      toast.success(`Saved — ${item.name} is now “${statusMeta(res.data?.status ?? status).label}”`);
      notifyAdminCountsChanged();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not save this consultation.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border border-gray-200 rounded-xl p-4 space-y-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-gray-900">{item.name}</span>
            <Pill className={meta.className}>{meta.label}</Pill>
            <span className="text-[11px] text-gray-400">#{item.id} · {formatDateTime(item.created_at)}</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
            <a href={`tel:${item.phone}`} className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">
              <Phone className="h-3.5 w-3.5" /> {item.phone}
            </a>
            {wa && (
              <a
                href={wa}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-emerald-700 hover:underline"
              >
                <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
              </a>
            )}
          </div>
        </div>
        <dl className="grid grid-cols-[auto,1fr] gap-x-3 gap-y-0.5 text-xs md:text-right md:min-w-[220px]">
          <dt className="text-gray-500">Type</dt>
          <dd className="font-medium text-gray-900">{item.consultation_type || '—'}</dd>
          <dt className="text-gray-500">Preferred</dt>
          <dd className="font-medium text-gray-900">{preferred || 'Any time'}</dd>
        </dl>
      </div>

      <div>
        <div className="text-xs font-semibold text-gray-500 mb-0.5">Concern</div>
        {concern ? (
          <p className="text-sm text-gray-700 whitespace-pre-line break-words">
            {expanded || !longConcern ? concern : `${concern.slice(0, CONCERN_PREVIEW).trimEnd()}…`}
            {longConcern && (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                aria-expanded={expanded}
                className="ml-1 text-xs font-semibold text-primary hover:underline"
              >
                {expanded ? 'Show less' : 'Show more'}
              </button>
            )}
          </p>
        ) : (
          <p className="text-sm text-gray-400">No details given.</p>
        )}
      </div>

      <div className="grid gap-3 border-t border-gray-100 pt-3 sm:grid-cols-[180px,1fr,auto] sm:items-start">
        <div>
          <label htmlFor={`c-status-${item.id}`} className="block text-xs font-semibold text-gray-700 mb-1">Status</label>
          <Select
            id={`c-status-${item.id}`}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            disabled={saving}
          >
            {!STATUSES.includes(status) && <option value={status}>{status}</option>}
            {STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_META[s].label}</option>
            ))}
          </Select>
        </div>
        <div>
          <label htmlFor={`c-notes-${item.id}`} className="block text-xs font-semibold text-gray-700 mb-1">
            Admin notes <span className="font-normal text-gray-400">(private)</span>
          </label>
          <Textarea
            id={`c-notes-${item.id}`}
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={5000}
            placeholder="Call outcome, booked slot, follow-up…"
            disabled={saving}
          />
        </div>
        <div className="flex gap-2 sm:pt-5">
          <Button size="sm" onClick={save} disabled={!dirty || saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
          {dirty && !saving && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => { setStatus(item.status); setNotes(item.admin_notes ?? ''); }}
            >
              Reset
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function AdminConsultationsPage() {
  const beginRequest = useLatestRequest();
  const [searchParams, setSearchParams] = useSearchParams();

  // Tab + page live in the URL (?status=new&page=2)
  const rawStatus = searchParams.get('status') || '';
  const statusFilter = STATUSES.includes(rawStatus) ? rawStatus : '';
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [newCount, setNewCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const load = useCallback(async () => {
    const isCurrent = beginRequest();
    setLoading(true);
    setLoadError('');
    try {
      const params = { page, limit: LIMIT };
      if (statusFilter) params.status_filter = statusFilter;
      const res = await api.get('/consultations', { params });
      if (!isCurrent()) return;
      setItems(res.data?.items || []);
      setTotal(res.data?.total || 0);
    } catch (err) {
      if (isCurrent()) setLoadError(getErrorMessage(err, 'Could not load consultations.'));
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }, [page, statusFilter, beginRequest]);

  const loadNewCount = useCallback(async () => {
    try {
      const res = await api.get('/consultations', { params: { status_filter: 'new', limit: 1 } });
      setNewCount(res.data?.total || 0);
    } catch {
      // non-critical
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadNewCount(); }, [loadNewCount]);

  const setTab = (s) => {
    if (s === statusFilter) return;
    setItems([]);
    setSearchParams(s ? { status: s } : {});
  };

  const setPage = (p) => {
    const next = {};
    if (statusFilter) next.status = statusFilter;
    if (p > 1) next.page = String(p);
    setSearchParams(next);
  };

  const onSaved = (updated) => {
    if (!updated?.id) return;
    // Keep the row in place (even if it no longer matches the tab) so the admin sees the result
    setItems((prev) => prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)));
    loadNewCount();
  };

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));
  const tabs = [
    { value: '', label: 'All' },
    ...STATUSES.map((s) => ({ value: s, label: STATUS_META[s].label, count: s === 'new' ? newCount : undefined })),
  ];

  return (
    <Page
      title="Consultations"
      description={
        loading && !items.length
          ? 'Expert consultation requests from the website.'
          : `${total} ${statusFilter ? `“${STATUS_META[statusFilter].label}” ` : ''}request${total !== 1 ? 's' : ''}`
      }
      actions={
        <Button variant="outline" size="sm" onClick={() => { load(); loadNewCount(); }} disabled={loading}>
          {loading ? 'Refreshing…' : 'Refresh'}
        </Button>
      }
    >
      <Tabs tabs={tabs} value={statusFilter} onChange={setTab} />

      <Card>
        {loading && !items.length ? (
          <LoadingState label="Loading consultations…" />
        ) : loadError ? (
          <ErrorState message={loadError} onRetry={load} />
        ) : items.length === 0 ? (
          <EmptyState>
            {statusFilter === 'new'
              ? 'No new consultation requests — all caught up!'
              : statusFilter
                ? `No “${STATUS_META[statusFilter].label}” consultations.`
                : 'No consultation requests yet.'}
          </EmptyState>
        ) : (
          <div className={cn('space-y-3', loading && 'opacity-60 transition-opacity')}>
            {items.map((c) => (
              <ConsultationRow key={c.id} item={c} onSaved={onSaved} />
            ))}
          </div>
        )}

        {!loadError && (
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            disabled={loading}
            summary={
              total > 0
                ? `Showing ${(page - 1) * LIMIT + 1}–${Math.min(page * LIMIT, total)} of ${total}`
                : undefined
            }
          />
        )}
      </Card>
    </Page>
  );
}
