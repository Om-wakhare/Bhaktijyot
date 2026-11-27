import { matchPath, useLocation } from 'react-router-dom';
import { useWhatsAppNumber, whatsappLink } from '../../services/siteConfig';
import { WhatsAppIcon } from '../ui/WhatsAppIcon';

/**
 * Floating "Chat on WhatsApp" button. Uses the number from Admin → Settings; the
 * `whatsappNumber` prop is only a fallback.
 *
 * Hidden below `md` on product pages: they have their own fixed bottom bar (with an
 * Enquire-on-WhatsApp button) that this would otherwise cover.
 */
export function FloatingWhatsApp({ whatsappNumber }) {
  const configured = useWhatsAppNumber();
  const { pathname } = useLocation();
  const number = configured || whatsappNumber;
  const onProductPage = !!matchPath('/products/:id', pathname);

  return (
    <a
      href={whatsappLink(number)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with Bhaktijyot on WhatsApp (opens in a new tab)"
      className={`${onProductPage ? 'hidden md:flex' : 'flex'} fixed bottom-6 right-6 z-50 items-center gap-2 bg-primary text-white rounded-full shadow-lg shadow-primary/30 pl-3 pr-4 py-3 hover:bg-primary-dark transition-all hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-cream`}
      style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
    >
      <WhatsAppIcon className="h-5 w-5 shrink-0" />
      <span className="text-xs font-semibold" aria-hidden="true">WhatsApp</span>
    </a>
  );
}
