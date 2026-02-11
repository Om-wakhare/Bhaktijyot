import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/apiClient';
import { mediaUrl } from '../../services/media';
import { Button, Card, Input, Page } from '../../components/admin/ui';

export function AdminManageCertificatesPage() {
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  const [items, setItems] = useState([]);

  const loadList = async (opts = {}) => {
    const nextPage = opts.page ?? page;
    const nextSearch = opts.search ?? search;
    setListLoading(true);
    setListError('');
    try {
      const res = await api.get('/certificates/admin', {
        params: {
          page: nextPage,
          limit,
          search: nextSearch?.trim() ? nextSearch.trim() : undefined,
        },
      });
      setItems(res.data.items || []);
      setTotal(res.data.total || 0);
    } catch {
      setItems([]);
      setTotal(0);
      setListError('Failed to load certificates.');
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    loadList({ page, search });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    loadList({ page: 1, search });
  };

  const handleDelete = async (certificateId) => {
    if (!window.confirm('Delete this certificate? This cannot be undone.')) return;
    setListLoading(true);
    setListError('');
    try {
      await api.delete(`/certificates/admin/${certificateId}`);
      await loadList({ page, search });
    } catch {
      setListError('Failed to delete certificate.');
      setListLoading(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <Page
      title="Manage Certificates"
      description="Search, preview, download, or delete certificates."
      actions={
        <Link to="/admin/certificates/generate">
          <Button>+ Generate Certificate</Button>
        </Link>
      }
    >
      <Card
        title="All Certificates"
        subtitle={`${total} certificates total`}
        actions={
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search code"
              className="w-48"
            />
            <Button type="submit" size="sm">Search</Button>
          </form>
        }
      >
        {listError && <div className="mb-3 text-sm text-red-600">{listError}</div>}

        {listLoading ? (
          <div className="py-6 text-sm text-gray-500 text-center">Loading certificates...</div>
        ) : items.length === 0 ? (
          <div className="py-6 text-sm text-gray-500 text-center">No certificates found.</div>
        ) : (
          <div className="overflow-x-auto border border-gray-200 rounded-xl">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left font-semibold px-4 py-3">Code</th>
                  <th className="text-left font-semibold px-4 py-3">Created</th>
                  <th className="text-left font-semibold px-4 py-3">Preview</th>
                  <th className="text-right font-semibold px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">{c.certificate_code}</td>
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                      {new Date(c.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      {c.generated_image_path ? (
                        <a href={mediaUrl(c.generated_image_path)} target="_blank" rel="noreferrer" className="text-xs font-semibold text-primary hover:underline">
                          Open
                        </a>
                      ) : (
                        <span className="text-xs text-gray-500">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {c.generated_image_path && (
                          <a
                            href={mediaUrl(c.generated_image_path)}
                            download
                            className="px-2.5 py-1.5 rounded-md bg-gray-100 text-gray-700 text-xs font-semibold hover:bg-gray-200"
                          >
                            Download
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDelete(c.id)}
                          className="px-2.5 py-1.5 rounded-md bg-red-500 text-white text-xs font-semibold hover:bg-red-600"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="text-xs text-gray-500">
            Total: {total} | Page {page} of {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              Prev
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      </Card>
    </Page>
  );
}
