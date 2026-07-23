import { useEffect, useState, useCallback } from 'react';
import { CheckCircle, Trash2, BadgeCheck, RefreshCw } from 'lucide-react';
import api from '../../services/apiClient';
import { StarRating } from '../../components/ui/StarRating';

const LIMIT = 20;

function StatusPill({ approved }) {
  return approved ? (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700">
      Approved
    </span>
  ) : (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700">
      Pending
    </span>
  );
}

function ActionBtn({ onClick, disabled, title, children, danger }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-1.5 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
        danger
          ? 'text-red-400 hover:text-red-600 hover:bg-red-50'
          : 'text-stone-400 hover:text-primary hover:bg-primary/8'
      }`}
    >
      {children}
    </button>
  );
}

export function AdminManageReviewsPage() {
  const [tab, setTab] = useState('pending');
  const [reviews, setReviews] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [actionLoading, setActionLoading] = useState(null);

  const approvedParam = tab === 'pending' ? false : tab === 'approved' ? true : undefined;

  const fetchReviews = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = { page: p, limit: LIMIT };
      if (approvedParam !== undefined) params.approved = approvedParam;
      const res = await api.get('/reviews/admin', { params });
      setReviews(res.data.items || []);
      setTotal(res.data.total || 0);
    } finally {
      setLoading(false);
    }
  }, [approvedParam]);

  const fetchPendingCount = useCallback(async () => {
    try {
      const res = await api.get('/reviews/admin', { params: { approved: false, limit: 1 } });
      setPendingCount(res.data.total || 0);
    } catch {
      // non-critical
    }
  }, []);

  useEffect(() => {
    setPage(1);
    fetchReviews(1);
  }, [tab, fetchReviews]);

  useEffect(() => {
    fetchPendingCount();
  }, [fetchPendingCount]);

  const handleApprove = async (review) => {
    setActionLoading(`approve-${review.id}`);
    try {
      const updated = await api.put(`/reviews/admin/${review.id}`, { is_approved: true });
      setReviews((prev) => prev.map((r) => r.id === review.id ? { ...r, ...updated.data } : r));
      if (tab === 'pending') {
        setReviews((prev) => prev.filter((r) => r.id !== review.id));
        setTotal((t) => Math.max(0, t - 1));
        setPendingCount((c) => Math.max(0, c - 1));
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleVerify = async (review) => {
    setActionLoading(`verify-${review.id}`);
    try {
      const updated = await api.put(`/reviews/admin/${review.id}`, { is_verified_offline: true });
      setReviews((prev) => prev.map((r) => r.id === review.id ? { ...r, ...updated.data } : r));
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (review) => {
    if (!window.confirm(`Delete review by "${review.reviewer_name}"? This cannot be undone.`)) return;
    setActionLoading(`delete-${review.id}`);
    try {
      await api.delete(`/reviews/admin/${review.id}`);
      setReviews((prev) => prev.filter((r) => r.id !== review.id));
      setTotal((t) => Math.max(0, t - 1));
      if (!review.is_approved) setPendingCount((c) => Math.max(0, c - 1));
    } finally {
      setActionLoading(null);
    }
  };

  const totalPages = Math.ceil(total / LIMIT);

  const tabs = [
    { key: 'pending', label: 'Pending', count: pendingCount },
    { key: 'approved', label: 'Approved', count: null },
    { key: 'all', label: 'All', count: null },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-espresso">Review Management</h1>
          <p className="text-sm text-espresso/50 mt-0.5">Approve, verify, or remove customer reviews</p>
        </div>
        <button
          type="button"
          onClick={() => { fetchReviews(page); fetchPendingCount(); }}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-stone-200 text-sm font-medium text-stone-500 hover:text-espresso hover:border-stone-300 transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 border-b border-stone-200">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? 'border-primary text-primary'
                : 'border-transparent text-stone-500 hover:text-espresso'
            }`}
          >
            {t.label}
            {t.count !== null && t.count > 0 && (
              <span className="min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full text-[10px] font-bold bg-amber-500 text-white">
                {t.count > 99 ? '99+' : t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-sm text-stone-400">Loading reviews…</div>
        ) : reviews.length === 0 ? (
          <div className="py-16 text-center text-sm text-stone-400">
            {tab === 'pending' ? 'No pending reviews — all caught up!' : 'No reviews found.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-100">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-stone-400 uppercase tracking-wider">Product</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-stone-400 uppercase tracking-wider">Reviewer</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-stone-400 uppercase tracking-wider">Rating</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-stone-400 uppercase tracking-wider min-w-[200px]">Comment</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-stone-400 uppercase tracking-wider">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-stone-400 uppercase tracking-wider">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-stone-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {reviews.map((review) => (
                  <tr key={review.id} className="hover:bg-stone-50 transition-colors">
                    {/* Product */}
                    <td className="px-4 py-3">
                      <span className="font-medium text-espresso text-xs line-clamp-2 max-w-[140px] block">
                        {review.product_name || `Product #${review.product_id}`}
                      </span>
                    </td>

                    {/* Reviewer */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <div className="h-7 w-7 rounded-full bg-primary/15 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
                          {review.reviewer_name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-espresso text-xs">{review.reviewer_name}</div>
                          {review.reviewer_email && (
                            <div className="text-[10px] text-stone-400 truncate max-w-[120px]">{review.reviewer_email}</div>
                          )}
                          {review.is_verified_offline && (
                            <div className="flex items-center gap-0.5 text-[10px] text-teal-600 font-semibold">
                              <BadgeCheck className="h-3 w-3" /> Verified
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Rating */}
                    <td className="px-4 py-3">
                      <StarRating value={review.rating} size="sm" />
                      <span className="text-[10px] text-stone-400 mt-0.5 block">{review.rating}/5</span>
                    </td>

                    {/* Comment */}
                    <td className="px-4 py-3">
                      {review.title && (
                        <div className="font-semibold text-espresso text-xs mb-0.5">{review.title}</div>
                      )}
                      <p className="text-xs text-stone-500 line-clamp-2">
                        {review.comment.length > 120 ? review.comment.slice(0, 120) + '…' : review.comment}
                      </p>
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3">
                      <span className="text-xs text-stone-400 whitespace-nowrap">
                        {new Date(review.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <StatusPill approved={review.is_approved} />
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-0.5">
                        <ActionBtn
                          onClick={() => handleApprove(review)}
                          disabled={review.is_approved || actionLoading === `approve-${review.id}`}
                          title={review.is_approved ? 'Already approved' : 'Approve review'}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </ActionBtn>
                        <ActionBtn
                          onClick={() => handleVerify(review)}
                          disabled={review.is_verified_offline || actionLoading === `verify-${review.id}`}
                          title={review.is_verified_offline ? 'Already verified' : 'Mark as verified purchase'}
                        >
                          <BadgeCheck className="h-4 w-4" />
                        </ActionBtn>
                        <ActionBtn
                          onClick={() => handleDelete(review)}
                          disabled={actionLoading === `delete-${review.id}`}
                          title="Delete review"
                          danger
                        >
                          <Trash2 className="h-4 w-4" />
                        </ActionBtn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-4">
          <span className="text-xs text-stone-400">
            Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total} reviews
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => { setPage(page - 1); fetchReviews(page - 1); }}
              className="px-3 py-1.5 rounded-lg border border-stone-200 text-xs font-semibold disabled:opacity-40 hover:border-primary hover:text-primary transition-colors"
            >
              ← Prev
            </button>
            <span className="text-xs text-stone-500">Page {page} of {totalPages}</span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => { setPage(page + 1); fetchReviews(page + 1); }}
              className="px-3 py-1.5 rounded-lg border border-stone-200 text-xs font-semibold disabled:opacity-40 hover:border-primary hover:text-primary transition-colors"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
