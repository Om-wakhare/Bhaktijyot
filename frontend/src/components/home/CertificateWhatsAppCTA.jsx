import { Link } from 'react-router-dom';
import { ShieldCheck, ArrowRight } from 'lucide-react';
import { useWhatsAppNumber, whatsappLink } from '../../services/siteConfig';
import { WhatsAppIcon } from '../ui/WhatsAppIcon';

export function CertificateWhatsAppCTA() {
  const whatsappNumber = useWhatsAppNumber();

  return (
    <section className="bg-ivory py-14">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid sm:grid-cols-2 gap-5">
          {/* Certificate card — white */}
          <div className="relative overflow-hidden rounded-2xl bg-white border border-gold/30 shadow-sm p-8 flex flex-col justify-between gap-6">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center" aria-hidden="true">
              <ShieldCheck className="h-7 w-7 text-primary" />
            </div>
            <div className="space-y-2">
              <div className="text-[11px] font-semibold uppercase tracking-widest text-primary">Lab Certified</div>
              <h3 className="font-display text-2xl font-semibold text-espresso">Verify Your Gemstone Certificate</h3>
              <p className="text-sm text-espresso/70 leading-relaxed">
                Every gemstone certificate is verifiable online using our image-based system. Enter your certificate ID to confirm authenticity instantly.
              </p>
            </div>
            <Link
              to="/verify"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-white text-sm font-semibold hover:bg-primary-dark transition-colors self-start group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2"
            >
              Verify Certificate
              <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
            </Link>
          </div>

          {/* WhatsApp card — espresso */}
          <div className="relative overflow-hidden rounded-2xl bg-espresso p-8 flex flex-col justify-between gap-6">
            {/* Decorative glow */}
            <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-gold/15 blur-2xl" aria-hidden="true" />
            <div className="relative h-14 w-14 rounded-2xl bg-gold/15 flex items-center justify-center" aria-hidden="true">
              <WhatsAppIcon className="h-7 w-7 text-gold" />
            </div>
            <div className="relative space-y-2">
              <div className="text-[11px] font-semibold uppercase tracking-widest text-gold">Fastest Response</div>
              <h3 className="font-display text-2xl font-semibold text-white">Order &amp; Ask on WhatsApp</h3>
              <p className="text-sm text-white/70 leading-relaxed">
                Share product links, ask about gemstone selection, get customization help — all on WhatsApp. Average response in under 30 minutes.
              </p>
            </div>
            <a
              href={whatsappLink(whatsappNumber)}
              target="_blank"
              rel="noopener noreferrer"
              className="relative inline-flex items-center gap-2 px-6 py-3 rounded-full border-[1.5px] border-gold-400/75 text-cream text-sm font-semibold shadow-[0_0_8px_rgba(212,175,55,0.40),0_0_20px_rgba(212,175,55,0.14)] hover:bg-gold/10 hover:shadow-[0_0_14px_rgba(212,175,55,0.60),0_0_32px_rgba(212,175,55,0.24)] transition-all self-start group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-espresso"
            >
              <WhatsAppIcon className="h-4 w-4" />
              Chat on WhatsApp
              <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
