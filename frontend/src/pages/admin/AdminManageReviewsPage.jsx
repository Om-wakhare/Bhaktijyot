import { useCallback, useEffect, useState } from 'react';
import { CheckCircle, Trash2, BadgeCheck, RefreshCw } from 'lucide-react';
import api, { getErrorMessage } from '../../services/apiClient';
import { StarRating } from '../../components/ui/StarRating';
import {
  Button, Card, EmptyState, ErrorState, LoadingState, Page, Pagination, Pill, Tabs, cn,
} from '../../components/admin/ui';
import { useToast } from '../../components/admin/Toast';
import { useConfirm } from '../../components/admin/ConfirmDialog';
import { formatDate, notifyAdminCountsChanged, useLatestRequest } from '../../components/admin/adminUtils';

const LIMIT = 20;

function StatusPill({ approved }) {
  return approved ? (
    <Pill className="uppercase tracking-wider text-[10px] bg-emerald-100 text-emerald-700">Approved</Pill>
  ) : (
    <Pill className="uppercase tracking-wider text-[10px] bg-amber-100 text-amber-700">Pending</Pill>
  );
}

const COMMENT_PREVIEW = 240;

/** One review: full details readable on a phone, with labelled actions. */
function ReviewItem({ review, busy, onApprove, onVerify, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const name = review.reviewer_name || 'Anonymous';
  const comment = review.comment || '';
  const long = comment.length > COMMENT_PREVIEW;

  return (
    <li className="px-4 sm:px-5 py-4 space-y-2.5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="h-9 w-9 rounded-full bg-primary/15 text-primary flex items-center justify-center text-[11px] font-bold shrink-0"
            aria-hidden="true"
          >
            {name.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className="text-sm font-semibold text-espresso">{name}</span>
              <StatusPill approved={review.is_approved} />
              {review.is_verified_offline && (
                <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-primary">
                  <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" /> Verified purchase
                </span>
              )}
            </div>
            <div className="text-[11px] text-espresso/60 break-all">
              {[review.reviewer_phone, review.reviewer_email].filter(Boolean).join(' · ') || 'No contact details given'}
            </div>
          </div>
        </div>
        <span className="text-xs text-espresso/60 whitespace-nowrap">{formatDate(review.created_at)}</span>
      </div>

      <div className="text-xs text-espresso/70">
        On{' '}
        <span className="font-semibold text-espresso">{review.product_name || `Product #${review.product_id}`}</span>
      </div>

      <div className="flex items-center gap-2">
        <StarRating value={review.rating} size="sm" />
        <span className="text-xs text-espresso/60">{review.rating} out of 5</span>
      </div>

      <div>
        {review.title && <div className="text-sm font-semibold text-espresso">{review.title}</div>}
        <p className="text-sm text-espresso/80 whitespace-pre-line break-words">
          {expanded || !long ? comment : `${comment.slice(0, COMMENT_PREVIEW).trimEnd()}…`}
          {long && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
              className="ml-1 text-xs font-semibold text-primary hover:underline"
            >
              {expanded ? 'Show less' : 'Read full review'}
            </button>
          )}
        </p>
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        {!review.is_approved && (
          <Button size="sm" onClick={() => onApprove(review)} disabled={busy}>
            <CheckCircle className="h-3.5 w-3.5" aria-hidden="true" />
            Approve
          </Button>
        )}
        {!review.is_verified_offline && (
          <Button size="sm" variant="outline" onClick={() => onVerify(review)} disabled={busy}>
            <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
            Mark as verified purchase
          </Button>
        )}
        <Button size="sm" variant="danger" onClick={() => onDelete(review)} disabled={busy} aria-label={`Delete review by ${name}`}>
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          Delete
        </Button>
      </div>
    </li>
  );
}

export function AdminManageReviewsPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const beginRequest = useLatestRequest();

  const [tab, setTab] = useState('pending');
  const [page, setPage] = useState(1);
  const [reviews, setReviews] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [pendingCount, setPendingCount] = useState(0);
  const [actionLoading, setActionLoading] = useState(null);

  const fetchReviews = useCallback(async () => {
    const isCurrent = beginRequest();
    setLoading(true);
    setLoadError('');
    try {
      const params = { page, limit: LIMIT };
      if (tab === 'pending') params.approved = false;
      if (tab === 'approved') params.approved = true;
      const res = await api.get('/reviews/admin', { params });
      if (!isCurrent()) return;
      const items = res.data?.items || [];
      const nextTotal = res.data?.total || 0;
      // The page emptied (e.g. last item approved elsewhere) — step back a page
      if (!items.length && page > 1 && nextTotal > 0) {
        setPage(Math.max(1, Math.ceil(nextTotal / LIMIT)));
        return;
      }
      setReviews(items);
      setTotal(nextTotal);
    } catch (err) {
      if (isCurrent()) setLoadError(getErrorMessage(err, 'Could not load reviews.'));
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }, [tab, page, beginRequest]);

  const fetchPendingCount = useCallback(async () => {
    try {
      const res = await api.get('/reviews/admin', { params: { approved: false, limit: 1 } });
      setPendingCount(res.data?.total || 0);
    } catch {
      // non-critical
    }
  }, []);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);
  useEffect(() => { fetchPendingCount(); }, [fetchPendingCount]);

  const changeTab = (next) => {
    if (next === tab) return;
    setReviews([]);
    setTotal(0);
    setTab(next);
    setPage(1);
  };

  /** After an item leaves the current list: refetch this page, or the previous one if it is now empty. */
  const afterRemoval = () => {
    const remaining = Math.max(0, total - 1);
    const lastPage = Math.max(1, Math.ceil(remaining / LIMIT));
    if (page > lastPage) setPage(lastPage); // effect refetches
    else fetchReviews();
  };

  const countsChanged = () => {
    fetchPendingCount();
    notifyAdminCountsChanged(); // sidebar badge
  };

  const handleApprove = async (review) => {
    setActionLoading(`approve-${review.id}`);
    try {
      const updated = await api.put(`/reviews/admin/${review.id}`, { is_approved: true });
      toast.success(`Review by ${review.reviewer_name} approved`);
      countsChanged();
      if (tab === 'pending') {
        afterRemoval();
      } else {
        setReviews((prev) => prev.map((r) => (r.id === review.id ? { ...r, ...updated.data } : r)));
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not approve the review.'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleVerify = async (review) => {
    setActionLoading(`verify-${review.id}`);
    try {
      const updated = await api.put(`/reviews/admin/${review.id}`, { is_verified_offline: true });
      setReviews((prev) => prev.map((r) => (r.id === review.id ? { ...r, ...updated.data } : r)));
      toast.success('Marked as a verified purchase');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not verify the review.'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (review) => {
    const ok = await confirm({
      title: `Delete review by "${review.reviewer_name}"?`,
      message: 'This cannot be undone.',
      confirmLabel: 'Delete review',
      tone: 'danger',
    });
    if (!ok) return;
    setActionLoading(`delete-${review.id}`);
    try {
      await api.delete(`/reviews/admin/${review.id}`);
      toast.success('Review deleted');
      if (!review.is_approved) countsChanged();
      afterRemoval();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not delete the review.'));
    } finally {
      setActionLoading(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  const tabs = [
    { value: 'pending', label: 'Pending', count: pendingCount },
    { value: 'approved', label: 'Approved' },
    { value: 'all', label: 'All' },
  ];

  return (
    <Page
      title="Review Management"
      description="Approve, verify, or remove customer reviews"
      actions={
        <Button
          variant="outline" size="sm"
          onClick={() => { fetchReviews(); countsChanged(); }}
          disabled={loading}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      }
    >
      <Tabs tabs={tabs} value={tab} onChange={changeTab} />

      <Card className="overflow-hidden">
        {loading && !reviews.length ? (
          <LoadingState label="Loading reviews…" />
        ) : loadError ? (
          <ErrorState message={loadError} onRetry={fetchReviews} />
        ) : reviews.length === 0 ? (
          <EmptyState>{tab === 'pending' ? 'No pending reviews — all caught up!' : 'No reviews found.'}</EmptyState>
        ) : (
          <ul className={cn('-mx-4 sm:-mx-5 -my-4 sm:-my-5 divide-y divide-espresso/8', loading && 'opacity-60')}>
            {reviews.map((review) => (
              <ReviewItem
                key={review.id}
                review={review}
                busy={actionLoading !== null}
                onApprove={handleApprove}
                onVerify={handleVerify}
                onDelete={handleDelete}
              />
            ))}
          </ul>
        )}
      </Card>

      {!loadError && (
        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          disabled={loading}
          summary={
            total > 0
              ? `Showing ${(page - 1) * LIMIT + 1}–${Math.min(page * LIMIT, total)} of ${total} reviews`
              : undefined
          }
        />
      )}
    </Page>
  );
}
