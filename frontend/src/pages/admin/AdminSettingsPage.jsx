import { useCallback, useEffect, useRef, useState } from 'react';
import api, { getErrorMessage } from '../../services/apiClient';
import { Alert, Button, Card, ErrorState, Field, Input, LoadingState, Page, Toggle } from '../../components/admin/ui';
import { useToast } from '../../components/admin/Toast';
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

/** Digits only (spaces, +, -, brackets and dots stripped). */
function normalizeWhatsApp(value) {
  return String(value ?? '').replace(/[\s+\-().]/g, '');
}

function whatsAppError(value) {
  const v = normalizeWhatsApp(value);
  if (!v) return 'Enter the WhatsApp number.';
  if (!/^\d+$/.test(v)) return 'Use digits only (spaces and + are removed automatically).';
  if (v.length < 10 || v.length > 15) return 'Enter 10–15 digits including the country code, e.g. 918484913170.';
  return '';
}

export function AdminSettingsPage() {
  const toast = useToast();
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

  // Instagram token
  const [igLoading, setIgLoading] = useState(false);
  const [igError, setIgError] = useState('');
  const [igResult, setIgResult] = useState(null);
  const tokenInputRef = useRef(null);

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
    const number = normalizeWhatsApp(form.whatsapp_number);
    setWaSaving(true);
    setWaMsg(null);
    try {
      const res = await api.put('/site-config', { whatsapp_number: number });
      const saved = fromConfig(res.data);
      setForm((prev) => ({ ...prev, ...pick(saved, WHATSAPP_FIELDS) }));
      setWaMsg({ tone: 'success', text: 'WhatsApp number saved.' });
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
      const res = await api.put('/site-config', {
        announcement_enabled: form.announcement_enabled,
        announcement_message: form.announcement_message.trim(),
        announcement_cta_text: form.announcement_cta_text.trim(),
        announcement_cta_link: form.announcement_cta_link.trim(),
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
      if (!res.data?.new_token) {
        setIgError('Instagram did not return a new token. Please try again later.');
      } else {
        setIgResult(res.data);
      }
    } catch (err) {
      // 503 = not configured, 502 = Instagram refused / unreachable
      setIgError(getErrorMessage(err, 'Could not refresh the Instagram token.'));
    } finally {
      setIgLoading(false);
    }
  };

  const copyToken = async () => {
    const token = igResult?.new_token;
    if (!token) return;
    try {
      await navigator.clipboard.writeText(token);
      toast.success('Token copied to clipboard');
    } catch {
      // Clipboard API unavailable (e.g. non-HTTPS) — select the text so it can be copied manually
      const el = tokenInputRef.current;
      if (el) {
        el.focus();
        el.select();
        let ok = false;
        try { ok = document.execCommand('copy'); } catch { ok = false; }
        if (ok) toast.success('Token copied to clipboard');
        else toast.info('Press Ctrl+C (or ⌘C) to copy the selected token');
      }
    }
  };

  const igDays = igResult?.expires_in_seconds ? Math.round(igResult.expires_in_seconds / 86400) : null;
  const igExpiry = igResult?.expires_in_seconds
    ? new Date(Date.now() + igResult.expires_in_seconds * 1000).toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric',
    })
    : null;

  const waDigits = phoneDigits(form.whatsapp_number);
  const waLooksLocal = waDigits.length === 10 && /^[6-9]/.test(waDigits);

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
                waLooksLocal
                  ? 'This looks like a number without the country code — for India add 91 in front (e.g. 918484913170).'
                  : 'Digits only, including the country code (10–15 digits), e.g. 918484913170 for India.'
              }
            >
              <Input
                id="whatsapp_number"
                name="whatsapp_number"
                value={form.whatsapp_number}
                onChange={handleChange}
                placeholder={DEFAULT_WHATSAPP}
                inputMode="tel"
                autoComplete="off"
                maxLength={30}
              />
            </Field>
            <p className="text-xs text-gray-500">
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

            <Field label="Message" hint={`${form.announcement_message.length}/300 characters`}>
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
        title="Instagram token"
        subtitle="The storefront’s Instagram reels use a long-lived access token that must be refreshed before it expires."
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Refresh the token about once a month. Tokens last 60 days; an expired token can’t be refreshed here.
          </p>
          <Button onClick={refreshInstagramToken} disabled={igLoading}>
            {igLoading ? 'Refreshing…' : 'Refresh Instagram token'}
          </Button>

          {igError && <Alert tone="error">{igError}</Alert>}

          {igResult?.new_token && (
            <div className="space-y-3">
              <Field
                label="New access token"
                htmlFor="ig-token"
                hint={igDays ? `Valid for about ${igDays} days${igExpiry ? ` (until ${igExpiry})` : ''}.` : undefined}
              >
                <div className="flex gap-2">
                  <Input
                    id="ig-token"
                    ref={tokenInputRef}
                    value={igResult.new_token}
                    readOnly
                    onFocus={(e) => e.target.select()}
                    className="flex-1 font-mono text-xs"
                  />
                  <Button variant="outline" onClick={copyToken} className="shrink-0">Copy</Button>
                </div>
              </Field>
              <Alert tone="warning" title="One more step">
                Update INSTAGRAM_ACCESS_TOKEN in Railway → Variables, then redeploy. Tokens last 60 days.
              </Alert>
            </div>
          )}
        </div>
      </Card>
    </Page>
  );
}
