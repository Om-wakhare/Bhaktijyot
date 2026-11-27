import { useCallback, useEffect, useState } from 'react';
import api, { getErrorMessage } from '../../services/apiClient';
import { Alert, Button, Card, ErrorState, Field, Input, LoadingState, Page, Toggle } from '../../components/admin/ui';
import { phoneDigits, useLatestRequest } from '../../components/admin/adminUtils';

const DEFAULT_WHATSAPP = '918484913170';
const WHATSAPP_FIELDS = ['whatsapp_number'];
const ANNOUNCEMENT_FIELDS = [
  'announcement_enabled', 'announcement_message', 'announcement_cta_text', 'announcement_cta_link',
];

function fromConfig(data) {
  return {
    announcement_enabled: Boolean(data?.announcement_enabled),
    announcement_message: data?.announcement_message ?? '',
    announcement_cta_text: data?.announcement_cta_text ?? '',
    announcement_cta_link: data?.announcement_cta_link ?? '/products',
    whatsapp_number: data?.whatsapp_number ?? DEFAULT_WHATSAPP,
  };
}

function pick(obj, keys) {
  return Object.fromEntries(keys.map((k) => [k, obj[k]]));
}

/**
 * Indian mobile → the stored format "91XXXXXXXXXX" (country code, no + or spaces).
 * Accepts 10 digits, or +91 / 91 / 0 in front, with any spaces or dashes — the same rule
 * the backend uses for customer phone numbers. Returns null when it isn't a valid mobile.
 */
function toWhatsAppNumber(value) {
  let d = phoneDigits(value);
  if (d.length === 12 && d.startsWith('91')) d = d.slice(2);
  else if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
  return /^[6-9]\d{9}$/.test(d) ? `91${d}` : null;
}

function whatsAppError(value) {
  if (!String(value ?? '').trim()) return 'Enter the WhatsApp number.';
  if (!toWhatsAppNumber(value)) {
    return 'Enter a 10-digit Indian mobile number (it starts with 6, 7, 8 or 9), for example 84849 13170.';
  }
  return '';
}

/** "918484913170" → "+91 84849 13170" for display. */
function prettyWhatsApp(stored) {
  const n = toWhatsAppNumber(stored);
  return n ? `+91 ${n.slice(2, 7)} ${n.slice(7)}` : stored;
}

export function AdminSettingsPage() {
  const beginRequest = useLatestRequest();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [form, setForm] = useState(fromConfig(null));

  // Each card saves only its own fields and shows its own messages
  const [waSaving, setWaSaving] = useState(false);
  const [waMsg, setWaMsg] = useState(null); // { tone, text }
  const [annSaving, setAnnSaving] = useState(false);
  const [annMsg, setAnnMsg] = useState(null);
  const [annReloading, setAnnReloading] = useState(false);

  // Instagram token refresh. The token itself is never kept in state or shown.
  const [igLoading, setIgLoading] = useState(false);
  const [igError, setIgError] = useState('');
  const [igResult, setIgResult] = useState(null); // { expiresInSeconds }
  const [igStatus, setIgStatus] = useState(null); // { configured, source, expires_at }

  const loadIgStatus = useCallback(async () => {
    try {
      const res = await api.get('/instagram/status');
      setIgStatus(res.data);
    } catch {
      setIgStatus(null); // status is informational only
    }
  }, []);
  useEffect(() => { loadIgStatus(); }, [loadIgStatus]);

  const load = useCallback(async () => {
    const isCurrent = beginRequest();
    setLoading(true);
    setLoadError('');
    try {
      const res = await api.get('/site-config');
      if (isCurrent()) setForm(fromConfig(res.data));
    } catch (err) {
      if (isCurrent()) setLoadError(getErrorMessage(err, 'Failed to load settings.'));
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }, [beginRequest]);

  /** Reload only the announcement fields (keeps unsaved edits in the WhatsApp card). */
  const reloadAnnouncement = async () => {
    setAnnMsg(null);
    setAnnReloading(true);
    try {
      const res = await api.get('/site-config');
      const next = fromConfig(res.data);
      setForm((prev) => ({ ...prev, ...pick(next, ANNOUNCEMENT_FIELDS) }));
    } catch (err) {
      setAnnMsg({ tone: 'error', text: getErrorMessage(err, 'Could not reload the announcement.') });
    } finally {
      setAnnReloading(false);
    }
  };

  useEffect(() => { load(); }, [load]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (WHATSAPP_FIELDS.includes(name)) setWaMsg(null);
    else setAnnMsg(null);
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const saveWhatsApp = async (e) => {
    e.preventDefault();
    if (waSaving) return;
    const err = whatsAppError(form.whatsapp_number);
    if (err) {
      setWaMsg({ tone: 'error', text: err });
      return;
    }
    const number = toWhatsAppNumber(form.whatsapp_number);
    setWaSaving(true);
    setWaMsg(null);
    try {
      const res = await api.put('/site-config', { whatsapp_number: number });
      const saved = fromConfig(res.data);
      setForm((prev) => ({ ...prev, ...pick(saved, WHATSAPP_FIELDS) }));
      setWaMsg({ tone: 'success', text: `WhatsApp number saved: ${prettyWhatsApp(saved.whatsapp_number)}.` });
    } catch (error) {
      setWaMsg({ tone: 'error', text: getErrorMessage(error, 'Failed to save the WhatsApp number.') });
    } finally {
      setWaSaving(false);
    }
  };

  const saveAnnouncement = async (e) => {
    e.preventDefault();
    if (annSaving) return;
    if (form.announcement_enabled && !form.announcement_message.trim()) {
      setAnnMsg({ tone: 'error', text: 'Enter a message, or turn the announcement off.' });
      return;
    }
    setAnnSaving(true);
    setAnnMsg(null);
    try {
      const link = form.announcement_cta_link.trim();
      if (link && !link.startsWith('/') && !/^https?:\/\//i.test(link)) {
        setAnnMsg({ tone: 'error', text: 'The button link must be a page on this site (starting with /, e.g. /products) or a full web address starting with https://.' });
        return;
      }
      const res = await api.put('/site-config', {
        announcement_enabled: form.announcement_enabled,
        announcement_message: form.announcement_message.trim(),
        announcement_cta_text: form.announcement_cta_text.trim(),
        announcement_cta_link: link,
      });
      const saved = fromConfig(res.data);
      setForm((prev) => ({ ...prev, ...pick(saved, ANNOUNCEMENT_FIELDS) }));
      setAnnMsg({ tone: 'success', text: 'Announcement saved.' });
    } catch (error) {
      setAnnMsg({ tone: 'error', text: getErrorMessage(error, 'Failed to save the announcement.') });
    } finally {
      setAnnSaving(false);
    }
  };

  const refreshInstagramToken = async () => {
    if (igLoading) return;
    setIgLoading(true);
    setIgError('');
    setIgResult(null);
    try {
      const res = await api.post('/instagram/refresh-token');
      // The server saves the new token itself; only the expiry comes back.
      if (!res.data?.refreshed) {
        setIgError('Instagram did not confirm the refresh. Please try again later.');
      } else {
        setIgResult({ expiresInSeconds: Number(res.data.expires_in_seconds) || null });
        loadIgStatus();
      }
    } catch (err) {
      // 503 = not set up on the server, 502 = Instagram refused / unreachable
      const status = err?.response?.status;
      if (status === 503) {
        setIgError('Instagram is not connected on the server yet, so there is nothing to refresh. Ask your developer to set it up.');
      } else if (status === 502) {
        setIgError(`${getErrorMessage(err)} If the reels have stopped showing, ask your developer to reconnect Instagram.`);
      } else {
        setIgError(getErrorMessage(err, 'Could not refresh the Instagram connection.'));
      }
    } finally {
      setIgLoading(false);
    }
  };

  const igDays = igResult?.expiresInSeconds ? Math.round(igResult.expiresInSeconds / 86400) : null;
  const igExpiry = igResult?.expiresInSeconds
    ? new Date(Date.now() + igResult.expiresInSeconds * 1000).toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric',
    })
    : null;

  const waNumber = toWhatsAppNumber(form.whatsapp_number);

  const settingsBody = (content) => {
    if (loading) return <LoadingState label="Loading settings…" className="py-6" />;
    if (loadError) return <ErrorState message={loadError} onRetry={load} className="py-6" />;
    return content;
  };

  return (
    <Page title="Settings" description="Manage global website settings.">
      <Card title="Contact & WhatsApp" subtitle="WhatsApp number used for all order links on the storefront.">
        {settingsBody(
          <form onSubmit={saveWhatsApp} className="space-y-4" noValidate>
            <Field
              label="WhatsApp Number"
              htmlFor="whatsapp_number"
              hint={
                waNumber
                  ? `Customers will message ${prettyWhatsApp(waNumber)}.`
                  : 'Indian mobile number. Spaces, +91 or a leading 0 are fine.'
              }
            >
              <Input
                id="whatsapp_number"
                name="whatsapp_number"
                value={form.whatsapp_number}
                onChange={handleChange}
                placeholder="e.g. 84849 13170"
                inputMode="tel"
                autoComplete="off"
                maxLength={30}
              />
            </Field>
            <p className="text-xs text-espresso/60">
              This number appears on the “Order on WhatsApp” buttons across the storefront.
            </p>
            {waMsg && <Alert tone={waMsg.tone}>{waMsg.text}</Alert>}
            <Button type="submit" disabled={waSaving}>{waSaving ? 'Saving…' : 'Save WhatsApp'}</Button>
          </form>,
        )}
      </Card>

      <Card title="Announcement Bar" subtitle="Shown at the top of the public website header.">
        {settingsBody(
          <form onSubmit={saveAnnouncement} className="space-y-4" noValidate>
            <Toggle
              checked={form.announcement_enabled}
              onChange={(v) => { setAnnMsg(null); setForm((prev) => ({ ...prev, announcement_enabled: v })); }}
              label={form.announcement_enabled ? 'Announcement shown' : 'Announcement hidden'}
              description="Turn the announcement strip on or off."
            />

            <Field label="Message" htmlFor="announcement_message" hint={`${form.announcement_message.length}/300 characters`}>
              <Input
                id="announcement_message"
                name="announcement_message"
                value={form.announcement_message}
                onChange={handleChange}
                placeholder="e.g. Free shipping over ₹999"
                maxLength={300}
              />
            </Field>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Button text" htmlFor="announcement_cta_text" hint="Max 50 characters. Leave blank for no button.">
                <Input
                  id="announcement_cta_text"
                  name="announcement_cta_text"
                  value={form.announcement_cta_text}
                  onChange={handleChange}
                  placeholder="Shop Now"
                  maxLength={50}
                />
              </Field>

              <Field label="Button link" htmlFor="announcement_cta_link" hint="A page on this site like /products, or a full address starting with https://">
                <Input
                  id="announcement_cta_link"
                  name="announcement_cta_link"
                  value={form.announcement_cta_link}
                  onChange={handleChange}
                  placeholder="/products"
                  maxLength={200}
                />
              </Field>
            </div>

            {annMsg && <Alert tone={annMsg.tone}>{annMsg.text}</Alert>}

            <div className="flex flex-col sm:flex-row gap-2">
              <Button type="submit" disabled={annSaving}>
                {annSaving ? 'Saving…' : 'Save announcement'}
              </Button>
              <Button variant="outline" onClick={reloadAnnouncement} disabled={annSaving || annReloading}>
                {annReloading ? 'Reloading…' : 'Reload'}
              </Button>
            </div>
          </form>,
        )}
      </Card>

      <Card
        title="Instagram reels"
        subtitle="The reels on the home page come from Instagram through a connection that expires after about 60 days."
      >
        <div className="space-y-4">
          {igStatus && (
            <p className="text-sm font-medium text-espresso">
              {igStatus.configured
                ? `Connected${igStatus.expires_at
                  ? ` · works until about ${new Date(igStatus.expires_at).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' })}`
                  : ''}`
                : 'Not connected yet'}
            </p>
          )}
          <p className="text-sm text-espresso/70">
            Press the button about once a month to keep the connection alive. If it has already expired,
            it can’t be refreshed here; ask your developer to reconnect Instagram.
          </p>
          <Button onClick={refreshInstagramToken} disabled={igLoading}>
            {igLoading ? 'Refreshing…' : 'Refresh Instagram connection'}
          </Button>

          {igError && <Alert tone="error">{igError}</Alert>}

          {igResult && (
            <Alert tone="success" title="Instagram accepted the refresh">
              {igDays
                ? `Instagram says the refreshed connection lasts about ${igDays} days${igExpiry ? ` (until about ${igExpiry})` : ''}. `
                : ''}
              The new connection is saved on the server, so the reels keep working.
            </Alert>
          )}
        </div>
      </Card>
    </Page>
  );
}
