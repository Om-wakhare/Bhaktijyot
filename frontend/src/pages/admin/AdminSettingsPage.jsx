import { useEffect, useState } from 'react';
import api from '../../services/apiClient';
import { Button, Card, Field, Input, Page } from '../../components/admin/ui';

export function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({
    announcement_enabled: true,
    announcement_message: '',
    announcement_cta_text: '',
    announcement_cta_link: '/products',
    whatsapp_number: '918484913170',
  });

  const load = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await api.get('/site-config');
      setForm({
        announcement_enabled: Boolean(res.data.announcement_enabled),
        announcement_message: res.data.announcement_message ?? '',
        announcement_cta_text: res.data.announcement_cta_text ?? '',
        announcement_cta_link: res.data.announcement_cta_link ?? '/products',
        whatsapp_number: res.data.whatsapp_number ?? '918484913170',
      });
    } catch {
      setError('Failed to load settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await api.put('/site-config', {
        announcement_enabled: form.announcement_enabled,
        announcement_message: form.announcement_message,
        announcement_cta_text: form.announcement_cta_text,
        announcement_cta_link: form.announcement_cta_link,
        whatsapp_number: form.whatsapp_number,
      });
      setSuccess('Saved successfully.');
    } catch {
      setError('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Page title="Settings" description="Manage global website settings.">
      <Card title="Contact & WhatsApp" subtitle="WhatsApp number used for all order links on the storefront.">
        {loading ? (
          <div className="text-sm text-gray-500">Loading settings...</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="WhatsApp Number" hint="Include country code without + (e.g. 918484913170 for India)">
              <Input
                name="whatsapp_number"
                value={form.whatsapp_number}
                onChange={handleChange}
                placeholder="918484913170"
                maxLength={30}
              />
            </Field>
            <p className="text-xs text-gray-500">
              This number appears on the "Order on WhatsApp" buttons across the storefront.
            </p>
            {error && <div className="text-sm text-red-600">{error}</div>}
            {success && <div className="text-sm text-green-600">{success}</div>}
            <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save WhatsApp'}</Button>
          </form>
        )}
      </Card>

      <Card title="Announcement Bar" subtitle="Shown at the top of the public website header.">
        {loading ? (
          <div className="text-sm text-gray-500">Loading settings...</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-gray-900">Enable announcement</div>
                <div className="text-xs text-gray-500">Turn on/off the announcement strip.</div>
              </div>
              <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  name="announcement_enabled"
                  checked={form.announcement_enabled}
                  onChange={handleChange}
                  className="h-4 w-4"
                />
                Enabled
              </label>
            </div>

            <Field label="Message" hint="Max 300 characters">
              <Input
                name="announcement_message"
                value={form.announcement_message}
                onChange={handleChange}
                placeholder="e.g. Free shipping over ₹999"
                maxLength={300}
              />
            </Field>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="CTA Text" hint="Max 50 characters">
                <Input
                  name="announcement_cta_text"
                  value={form.announcement_cta_text}
                  onChange={handleChange}
                  placeholder="Shop Now"
                  maxLength={50}
                />
              </Field>

              <Field label="CTA Link" hint="Relative path like /products">
                <Input
                  name="announcement_cta_link"
                  value={form.announcement_cta_link}
                  onChange={handleChange}
                  placeholder="/products"
                  maxLength={200}
                />
              </Field>
            </div>

            {error && <div className="text-sm text-red-600">{error}</div>}
            {success && <div className="text-sm text-green-600">{success}</div>}

            <div className="flex flex-col sm:flex-row gap-2">
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </Button>
              <Button type="button" variant="outline" onClick={load} disabled={saving}>
                Reload
              </Button>
            </div>
          </form>
        )}
      </Card>
    </Page>
  );
}
