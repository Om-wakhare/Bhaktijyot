import { MapPin, Phone, Globe } from 'lucide-react';
import { useWhatsAppNumber, whatsappLink } from '../../services/siteConfig';
import { WhatsAppIcon } from '../../components/ui/WhatsAppIcon';
import { INSTAGRAM, IgIcon } from '../../components/home/InstagramReels';

/** '918484913170' → '+91 84849 13170' */
function formatPhone(digits) {
  if (digits.length === 12 && digits.startsWith('91')) return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  if (digits.length === 10) return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  return `+${digits}`;
}

const LINK_CLASS =
  'text-sm font-medium text-espresso hover:text-primary underline-offset-2 hover:underline transition-colors';

export function ContactPage() {
  const whatsappNumber = useWhatsAppNumber();
  const phoneDisplay = formatPhone(whatsappNumber);

  const cards = [
    {
      icon: MapPin,
      title: 'Visit Us',
      body: (
        <address className="not-italic text-sm text-espresso/75 leading-relaxed">
          Mangal Murti Apartment, opp. Sami Ganpati, Delhi Gate, Ahilyanagar, Maharashtra
        </address>
      ),
    },
    {
      icon: Phone,
      title: 'Call / WhatsApp',
      body: (
        <div className="space-y-1">
          <a href={`tel:+${whatsappNumber.length === 10 ? `91${whatsappNumber}` : whatsappNumber}`} className={LINK_CLASS}>
            {phoneDisplay}
          </a>
          <div>
            <a
              href={whatsappLink(whatsappNumber)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary-dark transition-colors"
            >
              <WhatsAppIcon className="h-3.5 w-3.5" />
              Message on WhatsApp
            </a>
          </div>
        </div>
      ),
    },
    {
      icon: IgIcon,
      title: 'Instagram',
      body: (
        <a href={INSTAGRAM.url} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
          {INSTAGRAM.handle}
        </a>
      ),
    },
    {
      icon: Globe,
      title: 'Website',
      body: <div className="text-sm text-espresso/75 leading-relaxed">www.bhaktijyot.com</div>,
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12">

      <div className="space-y-3">
        <div className="text-[11px] font-semibold uppercase tracking-widest text-primary">Get in Touch</div>
        <h1 className="font-display text-4xl sm:text-5xl font-semibold text-espresso">Contact Us</h1>
        <p className="text-espresso/70 text-lg max-w-xl">
          For orders, consultations, and gemstone queries — reach us on WhatsApp for the fastest response.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-5">
        {cards.map(({ icon: Icon, title, body }) => (
          <div key={title} className="bg-white rounded-2xl p-6 border border-gold/25 shadow-sm flex gap-4">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0" aria-hidden="true">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-espresso/60 mb-1">{title}</h2>
              {body}
            </div>
          </div>
        ))}
      </div>

      {/* WhatsApp CTA */}
      <div className="bg-primary/5 border border-primary/15 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center gap-5">
        <div className="flex-1">
          <h2 className="font-semibold text-espresso">Fastest response on WhatsApp</h2>
          <p className="text-sm text-espresso/70 mt-1">
            Share product links, ask about gemstone selection, or get help with your order — all on WhatsApp.
          </p>
        </div>
        <a
          href={whatsappLink(whatsappNumber)}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 inline-flex items-center gap-2.5 px-6 py-3 rounded-full bg-primary text-white font-semibold text-sm hover:bg-primary-dark transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2"
        >
          <WhatsAppIcon className="h-4 w-4" />
          Chat on WhatsApp
        </a>
      </div>
    </div>
  );
}
