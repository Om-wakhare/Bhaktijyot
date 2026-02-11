export function AdminDashboardPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-900">Welcome, Admin</h1>
      <p className="text-sm text-gray-600">
        From here you can manage categories, products, and generate certificates. There is only one admin account and
        credentials are configured via environment variables on the backend.
      </p>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-xs font-semibold text-gray-500 mb-1">Content</div>
          <div className="text-sm text-gray-800">Manage categories and products shown on the public shop.</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-xs font-semibold text-gray-500 mb-1">Certificates</div>
          <div className="text-sm text-gray-800">
            Generate image-based certificates that work for both offline and online sales.
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-xs font-semibold text-gray-500 mb-1">Verification</div>
          <div className="text-sm text-gray-800">
            Customers can verify certificates on the public site using only their code.
          </div>
        </div>
      </div>
    </div>
  );
}

