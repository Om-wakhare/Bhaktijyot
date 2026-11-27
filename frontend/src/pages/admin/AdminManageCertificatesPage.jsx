import { useCallback, useEffect, useState } from 'react';
import api, { getErrorMessage } from '../../services/apiClient';
import { mediaUrl } from '../../services/media';
import {
  Button, Card, EmptyState, ErrorState, Input, LoadingState, Page, Pagination,
} from '../../components/admin/ui';
import { useToast } from '../../components/admin/Toast';
import { useConfirm } from '../../components/admin/ConfirmDialog';
import { formatDateTime, useLatestRequest } from '../../components/admin/adminUtils';

const LIMIT = 20;

/** The renderer writes a PDF beside every generated PNG. */
function pdfUrl(pngPath) {
  if (!pngPath || !/\.png$/i.test(pngPath)) return '';
  return mediaUrl(pngPath.replace(/\.png$/i, '.pdf'));
}

const LINK_CLS =
  'px-2.5 py-1.5 rounded-md bg-gray-100 text-gray-700 text-xs font-semibold hover:bg-gray-200 whitespace-nowrap';

export function AdminManageCertificatesPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const beginRequest = useLatestRequest();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [items, setItems] = useState([]);
  const [deletingId, setDeletingId] = useState(null);

  const loadList = useCallback(async () => {
    const isCurrent = beginRequest();
    setLoading(true);
    setLoadError('');
    try {
      const res = await api.get('/certificates/admin', {
        params: { page, limit: LIMIT, search: search.trim() || undefined },
      });
      if (!isCurrent()) return;
      const nextItems = res.data?.items || [];
      const nextTotal = res.data?.total || 0;
      // Page emptied (e.g. after deleting its last certificate) — step back
      if (!nextItems.length && page > 1 && nextTotal > 0) {
        setPage(Math.max(1, Math.ceil(nextTotal / LIMIT)));
        return;
      }
      setItems(nextItems);
      setTotal(nextTotal);
    } catch (err) {
      if (isCurrent()) setLoadError(getErrorMessage(err, 'Could not load certificates.'));
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }, [page, search, beginRequest]);

  useEffect(() => { loadList(); }, [loadList]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    if (searchInput === search) loadList();
    else setSearch(searchInput);
  };

  const handleDelete = async (cert) => {
    const ok = await confirm({
      title: `Delete certificate ${cert.certificate_code}?`,
      message: 'Its PNG and PDF are removed and the code will no longer verify on the website. This cannot be undone.',
      confirmLabel: 'Delete certificate',
      tone: 'danger',
    });
    if (!ok) return;
    setDeletingId(cert.id);
    try {
      await api.delete(`/certificates/admin/${cert.id}`);
      toast.success(`Certificate ${cert.certificate_code} deleted`);
      await loadList();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not delete the certificate.'));
    } finally {
      setDeletingId(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <Page
      title="Manage Certificates"
      description="Search, preview, open, or delete certificates."
      actions={<Button to="/admin/certificates/generate">+ Generate Certificate</Button>}
    >
      <Card
        title="All Certificates"
        subtitle={`${total} certificate${total !== 1 ? 's' : ''}${search.trim() ? ` matching “${search.trim()}”` : ' total'}`}
        actions={
          <form onSubmit={handleSearchSubmit} className="flex gap-2" role="search">
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search code"
              aria-label="Search certificate code"
              className="w-48"
            />
            <Button type="submit" size="sm">Search</Button>
            {search && (
              <Button
                variant="outline" size="sm"
                onClick={() => { setSearchInput(''); setSearch(''); setPage(1); }}
              >
                Clear
              </Button>
            )}
          </form>
        }
      >
        {loading && !items.length ? (
          <LoadingState label="Loading certificates…" />
        ) : loadError ? (
          <ErrorState message={loadError} onRetry={loadList} />
        ) : items.length === 0 ? (
          <EmptyState>{search ? 'No certificates match this code.' : 'No certificates yet.'}</EmptyState>
        ) : (
          <div className={`overflow-x-auto border border-gray-200 rounded-xl ${loading ? 'opacity-60' : ''}`}>
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left font-semibold px-4 py-3">Code</th>
                  <th className="text-left font-semibold px-4 py-3">Created</th>
                  <th className="text-right font-semibold px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((c) => {
                  const pdf = pdfUrl(c.generated_image_path);
                  return (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">{c.certificate_code}</td>
                      <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{formatDateTime(c.created_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {c.generated_image_path && (
                            <a
                              href={mediaUrl(c.generated_image_path)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={LINK_CLS}
                            >
                              Open PNG
                            </a>
                          )}
                          {pdf && (
                            <a href={pdf} target="_blank" rel="noopener noreferrer" className={LINK_CLS}>
                              Open PDF
                            </a>
                          )}
                          <Button
                            variant="danger" size="sm"
                            onClick={() => handleDelete(c)}
                            disabled={deletingId === c.id}
                          >
                            {deletingId === c.id ? '…' : 'Delete'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loadError && (
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            disabled={loading}
            summary={total > 0 ? `Total: ${total} · Page ${page} of ${totalPages}` : undefined}
          />
        )}
      </Card>
    </Page>
  );
}
