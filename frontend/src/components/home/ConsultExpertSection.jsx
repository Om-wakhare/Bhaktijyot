import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import api from '../../services/apiClient';

/* ── Shared typographic tokens (mirrors HeroSection) ── */
const GOLD = '#D4AF37';
const DARK = '#1C1209';

/* Light-bg typography — same scale as hero, adapted for cream/white surface */
const H_PRIMARY = {
  fontFamily: 'inherit',
  fontSize: 'clamp(2.1rem, 3.6vw, 3.4rem)',
  lineHeight: 1.1,
  fontWeight: 700,
  color: DARK,
  textShadow: '0 0 18px rgba(212,175,55,0.45), 0 0 40px rgba(212,175,55,0.18)',
};
const H_EYEBROW = {
  color: GOLD,
  fontSize: '0.8rem',
  fontWeight: 600,
  letterSpacing: '0.05em',
};
const H_SECONDARY = {
  color: 'rgba(28,18,9,0.65)',
  fontSize: '0.95rem',
  lineHeight: 1.7,
};

/* Card — white background, gold glowing border */
const GOLD_BORDER = '1.5px solid rgba(212,175,55,0.75)';
const GOLD_GLOW   = '0 0 10px rgba(212,175,55,0.5), 0 0 24px rgba(212,175,55,0.2), inset 0 0 12px rgba(212,175,55,0.08)';

/* Card heading — same Playfair Display scale, dark text, gold glow for light bg */
const CARD_H_PRIMARY = {
  fontFamily: 'inherit',
  fontSize: 'clamp(1.8rem, 2.8vw, 2.3rem)',
  lineHeight: 1.1,
  fontWeight: 700,
  color: DARK,
  textShadow: '0 0 18px rgba(212,175,55,0.45), 0 0 40px rgba(212,175,55,0.18)',
  marginBottom: '0.4rem',
};
const CARD_H_EYEBROW = {
  color: GOLD,
  fontSize: '0.7rem',
  fontWeight: 700,
  letterSpacing: '0.22em',
  textTransform: 'uppercase',
  marginBottom: '0.6rem',
};
const CARD_H_SECONDARY = {
  color: 'rgba(28,18,9,0.50)',
  fontSize: '0.85rem',
  lineHeight: 1.6,
  marginBottom: '1.75rem',
};

/* Input — white bg, gold border, dark text */
const inp = {
  background: '#FFFFFF',
  border: '1.5px solid rgba(212,175,55,0.55)',
  borderRadius: 8,
  padding: '0.75rem 1rem',
  color: DARK,
  fontSize: '0.9rem',
  outline: 'none',
  width: '100%',
  fontFamily: 'inherit',
};

const BULLETS = [
  'Crystal Healing Sessions',
  'Gemstone Recommendations',
  'Vastu & Spiritual Guidance',
  'Certified & Personalised',
];

const TYPES = [
  'Crystal Healing',
  'Gemstone Recommendation',
  'Vastu Guidance',
  'General Query',
];

export function ConsultExpertSection({ whatsappNumber = '918484913170' }) {
  const [form, setForm] = useState({ name: '', phone: '', type: TYPES[0] });
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/consultations', {
        name: form.name,
        phone: form.phone,
        consultation_type: form.type,
      });
    } catch {
      // open WhatsApp regardless
    } finally {
      setLoading(false);
    }
    const msg =
      `Hello Bhaktijyot! I'd like to book a consultation.\n\n` +
      `Name: ${form.name}\nWhatsApp: ${form.phone}\nType: ${form.type}\n\n` +
      `Looking forward to hearing from you!`;
    window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <section style={{ background: '#F4E4D1' }} className="py-16 lg:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">

          {/* ── LEFT — hero typography on light bg ── */}
          <div className="space-y-6">

            <p style={H_EYEBROW}>✨ Certified Gemologist · Crystal Healer Since 1985</p>

            <h2 className="font-display" style={H_PRIMARY}>Consult an Expert</h2>

            <p style={H_SECONDARY}>
              Not sure which crystal or gemstone is right for you? Get a personalised recommendation
              from our certified gemologist — available in person and over WhatsApp.
            </p>

            <div className="flex flex-wrap gap-2">
              {BULLETS.map((b) => (
                <span key={b} style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                  border: '1px solid rgba(212,175,55,0.55)',
                  background: 'rgba(212,175,55,0.10)',
                  color: '#6B4A0A',
                  fontSize: '0.73rem', fontWeight: 600,
                  padding: '0.35rem 0.85rem', borderRadius: 999,
                }}>
                  <span style={{ color: GOLD }}>✓</span> {b}
                </span>
              ))}
            </div>

            <div className="pt-1">
              <Link
                to="/consult"
                className="inline-flex items-center gap-2 px-9 py-3.5 text-sm font-bold uppercase tracking-[0.12em] transition-all hover:scale-[1.02]"
                style={{
                  borderRadius: '5px',
                  color: DARK,
                  background: 'transparent',
                  border: GOLD_BORDER,
                  boxShadow: GOLD_GLOW,
                  textDecoration: 'none',
                }}
              >
                Book a Free Consultation <ArrowRight style={{ width: 15, height: 15 }} />
              </Link>
            </div>

            <p style={{ color: 'rgba(28,18,9,0.40)', fontSize: '0.72rem', fontWeight: 500 }}>
              Sessions available in person &amp; over WhatsApp
            </p>
          </div>

          {/* ── RIGHT — white card with gold glowing border ── */}
          <div style={{
            background: '#FFFFFF',
            border: GOLD_BORDER,
            borderRadius: '1.25rem',
            padding: 'clamp(1.75rem,4vw,2.5rem)',
            boxShadow: GOLD_GLOW,
          }}>
            <p style={CARD_H_EYEBROW}>✦ Quick Booking ✦</p>

            <h3 className="font-display" style={CARD_H_PRIMARY}>Get in Touch</h3>

            <p style={CARD_H_SECONDARY}>Fill in the details and we'll connect on WhatsApp</p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <input required type="text" placeholder="Your Name"       value={form.name}  onChange={set('name')}  style={inp} />
              <input required type="tel"  placeholder="WhatsApp Number" value={form.phone} onChange={set('phone')} style={inp} />
              <select value={form.type} onChange={set('type')} style={{
                ...inp, cursor: 'pointer', appearance: 'none',
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23D4AF37' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', paddingRight: '2.5rem',
              }}>
                {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>

              <button
                type="submit" disabled={loading}
                className="transition-all hover:scale-[1.02]"
                style={{
                  marginTop: '0.35rem', padding: '0.9rem',
                  borderRadius: 8,
                  border: GOLD_BORDER,
                  background: 'transparent',
                  boxShadow: loading ? 'none' : GOLD_GLOW,
                  color: DARK, fontWeight: 800, fontSize: '0.82rem',
                  textTransform: 'uppercase', letterSpacing: '0.16em',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1,
                  fontFamily: 'inherit',
                }}
              >
                {loading ? 'Saving…' : 'Book on WhatsApp'}
              </button>
            </form>

            <div style={{ borderTop: '1px solid rgba(212,175,55,0.25)', marginTop: '1.25rem', paddingTop: '1rem', textAlign: 'center' }}>
              <Link
                to="/consult"
                style={{ color: '#8B5E0A', fontSize: '0.75rem', fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: 3 }}
              >
                Full booking form with date &amp; time →
              </Link>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
