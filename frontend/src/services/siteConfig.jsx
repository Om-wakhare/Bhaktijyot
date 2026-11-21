import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import api from './apiClient';

/**
 * Site-wide settings managed from Admin → Settings.
 * Fetched ONCE for the whole app — components read it with useSiteConfig()
 * instead of calling GET /site-config themselves.
 */

export const DEFAULT_WHATSAPP_NUMBER = '918484913170';

const DEFAULT_CONFIG = {
  announcement_enabled: true,
  announcement_message:
    '40+ Years of Authentic Gemstones & Sacred Essentials — Free Certificate with Every Gemstone',
  announcement_cta_text: 'Shop Now',
  announcement_cta_link: '/products',
  whatsapp_number: DEFAULT_WHATSAPP_NUMBER,
};

const SiteConfigContext = createContext({ config: DEFAULT_CONFIG, loaded: false });

export function SiteConfigProvider({ children }) {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .get('/site-config')
      .then((res) => {
        if (!cancelled && res.data) setConfig({ ...DEFAULT_CONFIG, ...res.data });
      })
      .catch(() => {
        /* keep defaults — the storefront must work even if this call fails */
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(() => ({ config, loaded, setConfig }), [config, loaded]);
  return <SiteConfigContext.Provider value={value}>{children}</SiteConfigContext.Provider>;
}

/** Returns { config, loaded, setConfig }. */
export function useSiteConfig() {
  return useContext(SiteConfigContext);
}

/** Convenience hook: the configured WhatsApp number (digits only, with country code). */
export function useWhatsAppNumber() {
  const { config } = useSiteConfig();
  return (config.whatsapp_number || DEFAULT_WHATSAPP_NUMBER).replace(/\D/g, '');
}

/** Build a wa.me link, optionally with a pre-filled message. */
export function whatsappLink(number, message) {
  const digits = String(number || DEFAULT_WHATSAPP_NUMBER).replace(/\D/g, '');
  return message
    ? `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
    : `https://wa.me/${digits}`;
}
