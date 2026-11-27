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

function ActionBtn({ onClick, disabled, title, children, danger }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className={cn(
        'p-1.5 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed',
        danger ? 'text-red-400 hover:text-red-600 hover:bg-red-50' : 'text-gray-400 hover:text-primary hover:bg-primary/8',
      )}
    >
      {children}
    </button>
  );
}

const TH = 'text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider';

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
          <div className={cn('overflow-x-auto -mx-4 sm:-mx-5 -my-4 sm:-my-5', loading && 'opacity-60')}>
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="border-b border-gray-100">
                  <th className={TH}>Product</th>
                  <th className={TH}>Reviewer</th>
                  <th className={TH}>Rating</th>
                  <th className={cn(TH, 'min-w-[200px]')}>Comment</th>
                  <th className={TH}>Date</th>
                  <th className={TH}>Status</th>
                  <th className={cn(TH, 'text-right')}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {reviews.map((review) => {
                  const name = review.reviewer_name || 'Anonymous';
                  const comment = review.comment || '';
                  return (
                    <tr key={review.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-medium text-gray-900 text-xs line-clamp-2 max-w-[140px] block">
                          {review.product_name || `Product #${review.product_id}`}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <div className="h-7 w-7 rounded-full bg-primary/15 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
                            {name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900 text-xs">{name}</div>
                            {review.reviewer_email && (
                              <div className="text-[10px] text-gray-400 truncate max-w-[120px]">{review.reviewer_email}</div>
                            )}
                            {review.is_verified_offline && (
                              <div className="flex items-center gap-0.5 text-[10px] text-primary font-semibold">
                                <BadgeCheck className="h-3 w-3" /> Verified
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <StarRating value={review.rating} size="sm" />
                        <span className="text-[10px] text-gray-400 mt-0.5 block">{review.rating}/5</span>
                      </td>

                      <td className="px-4 py-3">
                        {review.title && <div className="font-semibold text-gray-900 text-xs mb-0.5">{review.title}</div>}
                        <p className="text-xs text-gray-500 line-clamp-2" title={comment}>
                          {comment.length > 120 ? `${comment.slice(0, 120)}…` : comment}
                        </p>
                      </td>

                      <td className="px-4 py-3">
                        <span className="text-xs text-gray-400 whitespace-nowrap">{formatDate(review.created_at)}</span>
                      </td>

                      <td className="px-4 py-3">
                        <StatusPill approved={review.is_approved} />
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-0.5">
                          <ActionBtn
                            onClick={() => handleApprove(review)}
                            disabled={review.is_approved || actionLoading !== null}
                            title={review.is_approved ? 'Already approved' : 'Approve review'}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </ActionBtn>
                          <ActionBtn
                            onClick={() => handleVerify(review)}
                            disabled={review.is_verified_offline || actionLoading !== null}
                            title={review.is_verified_offline ? 'Already verified' : 'Mark as verified purchase'}
                          >
                            <BadgeCheck className="h-4 w-4" />
                          </ActionBtn>
                          <ActionBtn
                            onClick={() => handleDelete(review)}
                            disabled={actionLoading !== null}
                            title="Delete review"
                            danger
                          >
                            <Trash2 className="h-4 w-4" />
                          </ActionBtn>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
