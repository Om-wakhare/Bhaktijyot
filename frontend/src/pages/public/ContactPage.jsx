import { MapPin, Phone, Globe } from 'lucide-react';

function WhatsAppIcon({ className = 'h-5 w-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

const WHATSAPP = '918484913170';

export function ContactPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12">

      <div className="space-y-3">
        <div className="text-[11px] font-semibold uppercase tracking-widest text-primary">Get in Touch</div>
        <h1 className="font-display text-5xl font-semibold text-espresso">Contact Us</h1>
        <p className="text-warmBrown/60 text-lg max-w-xl">
          For orders, consultations, and gemstone queries — reach us on WhatsApp for the fastest response.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-5">
        {[
          {
            icon: MapPin,
            title: 'Visit Us',
            content: 'Mangal Murti Apartment, opp. Sami Ganpati, Delhi Gate, Ahilyanagar, Maharashtra',
          },
          {
            icon: Phone,
            title: 'Call / WhatsApp',
            content: '+91 84849 13170',
            href: `https://wa.me/${WHATSAPP}`,
          },
          {
            icon: Globe,
            title: 'Instagram',
            content: '@bhaktijyot_gems',
            href: 'https://instagram.com/bhaktijyot_gems',
          },
          {
            icon: Globe,
            title: 'Website',
            content: 'www.bhaktijyot.com',
          },
        ].map(({ icon: Icon, title, content, href }) => (
          <div key={title} className="bg-white rounded-2xl p-6 border border-stone-100 shadow-sm flex gap-4">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-1">{title}</div>
              {href ? (
                <a href={href} target="_blank" rel="noreferrer" className="text-sm text-warmBrown hover:text-primary transition-colors font-medium">
                  {content}
                </a>
              ) : (
                <div className="text-sm text-warmBrown/70 leading-relaxed">{content}</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* WhatsApp CTA */}
      <div className="bg-primary/5 border border-primary/15 rounded-2xl p-8 flex flex-col sm:flex-row items-start sm:items-center gap-5">
        <div className="flex-1">
          <h3 className="font-semibold text-espresso">Fastest response on WhatsApp</h3>
          <p className="text-sm text-warmBrown/60 mt-1">
            Share product links, ask about gemstone selection, or get help with your order — all on WhatsApp.
          </p>
        </div>
        <a
          href={`https://wa.me/${WHATSAPP}`}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 inline-flex items-center gap-2.5 px-6 py-3 rounded-full bg-primary text-white font-semibold text-sm hover:bg-primary-dark transition-colors"
        >
          <WhatsAppIcon className="h-4 w-4" />
          Chat on WhatsApp
        </a>
      </div>
    </div>
  );
}
