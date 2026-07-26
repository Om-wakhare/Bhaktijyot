import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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

const TYPES = [
  'Crystal Healing',
  'Gemstone Recommendation',
  'Vastu Guidance',
  'General Query',
];

/* ───────────────────────────────────────────────────────────────
   EXPERTS — edit these with your real team.
   To add a photo: drop the image in src/assets, import it at the
   top (e.g. `import expert1 from '../../assets/expert1.jpg'`) and
   set `photo: expert1`. Leave photo:null to show an initials avatar.
─────────────────────────────────────────────────────────────── */
const EXPERTS = [
  {
    name: 'Pandit Ramesh Shastri',
    speciality: 'Vedic Astrology & Gemstones',
    experience: '40+ years experience',
    photo: null,
    tags: ['Kundli Reading', 'Gemstone Match'],
  },
  {
    name: 'Dr. Meera Joshi',
    speciality: 'Crystal Healing Therapist',
    experience: 'Certified · 15+ years',
    photo: null,
    tags: ['Crystal Healing', 'Chakra Balancing'],
  },
  {
    name: 'Acharya Vikram Rao',
    speciality: 'Vastu & Spiritual Guidance',
    experience: '25+ years experience',
    photo: null,
    tags: ['Vastu Shastra', 'Rudraksha'],
  },
];

function initials(name) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

function ExpertCard({ expert, whatsappNumber }) {
  const consult = () => {
    const msg = `Hello Bhaktijyot! I'd like to consult with ${expert.name} (${expert.speciality}).`;
    window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      className="flex flex-col items-center text-center transition-all hover:-translate-y-1.5"
      style={{
        background: '#FFFFFF',
        border: GOLD_BORDER,
        borderRadius: '1.25rem',
        boxShadow: GOLD_GLOW,
        padding: '2rem 1.5rem 1.75rem',
      }}
    >
      {/* Photo / initials avatar */}
      <div
        style={{
          width: 104, height: 104, borderRadius: '50%',
          border: '2px solid rgba(212,175,55,0.75)',
          boxShadow: '0 0 0 4px rgba(212,175,55,0.12), 0 6px 18px rgba(28,18,9,0.15)',
          overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'linear-gradient(145deg, #1D3D2C 0%, #2A5A40 100%)',
          marginBottom: '1.1rem', flexShrink: 0,
        }}
      >
        {expert.photo ? (
          <img src={expert.photo} alt={expert.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span style={{ color: GOLD, fontSize: '2rem', fontWeight: 700, fontFamily: 'inherit' }}>
            {initials(expert.name)}
          </span>
        )}
      </div>

      {/* Name */}
      <h3 className="font-display" style={{ color: DARK, fontSize: '1.15rem', fontWeight: 700, lineHeight: 1.2 }}>
        {expert.name}
      </h3>

      {/* Speciality */}
      <p style={{ color: '#8B5E0A', fontSize: '0.82rem', fontWeight: 600, marginTop: '0.3rem' }}>
        {expert.speciality}
      </p>

      {/* Experience */}
      <p style={{ color: 'rgba(28,18,9,0.45)', fontSize: '0.72rem', fontWeight: 500, marginTop: '0.2rem' }}>
        {expert.experience}
      </p>

      {/* Tags */}
      <div className="flex flex-wrap justify-center gap-1.5" style={{ marginTop: '0.9rem' }}>
        {expert.tags.map((t) => (
          <span key={t} style={{
            border: '1px solid rgba(212,175,55,0.5)',
            background: 'rgba(212,175,55,0.10)',
            color: '#6B4A0A',
            fontSize: '0.66rem', fontWeight: 600,
            padding: '0.25rem 0.6rem', borderRadius: 999,
          }}>{t}</span>
        ))}
      </div>

      {/* Consult button */}
      <button
        type="button"
        onClick={consult}
        className="transition-all hover:scale-[1.03]"
        style={{
          marginTop: '1.35rem', width: '100%', padding: '0.7rem',
          borderRadius: 8, border: GOLD_BORDER, background: 'transparent',
          boxShadow: GOLD_GLOW, color: DARK, fontWeight: 800, fontSize: '0.72rem',
          textTransform: 'uppercase', letterSpacing: '0.14em', cursor: 'pointer',
          fontFamily: 'inherit',
        }}
      >
        Consult on WhatsApp
      </button>
    </div>
  );
}

export function ConsultExpertSection({ whatsappNumber = '918484913170' }) {
  const [form, setForm] = useState({ name: '', phone: '', type: TYPES[0] });
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  /* ── Expert carousel ── */
  const [active, setActive] = useState(0);
  const go = (dir) => setActive((i) => (i + dir + EXPERTS.length) % EXPERTS.length);
  useEffect(() => {
    const t = setInterval(() => setActive((i) => (i + 1) % EXPERTS.length), 4500);
    return () => clearInterval(t);
  }, []);

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

        {/* ── Header — centered ── */}
        <div className="text-center max-w-2xl mx-auto mb-12 lg:mb-16">
          <p style={{ ...H_EYEBROW, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
            ✨ Meet Our Experts · Since 1985
          </p>
          <h2 className="font-display mt-3" style={H_PRIMARY}>Consult an Expert</h2>
          <p className="mx-auto mt-4" style={H_SECONDARY}>
            Not sure which crystal or gemstone is right for you? Get a personalised recommendation
            from our certified gemologists &amp; healers — in person or over WhatsApp.
          </p>
        </div>

        {/* ── Two columns — carousel (left) + form (right) ── */}
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">

          {/* ── LEFT — expert carousel ── */}
          <div className="relative">
            {/* Sliding track */}
            <div style={{ overflow: 'hidden', borderRadius: '1.25rem' }}>
              <div style={{
                display: 'flex',
                transform: `translateX(-${active * 100}%)`,
                transition: 'transform 0.6s cubic-bezier(0.4,0,0.2,1)',
              }}>
                {EXPERTS.map((expert) => (
                  <div key={expert.name} style={{ minWidth: '100%', padding: '4px' }}>
                    <ExpertCard expert={expert} whatsappNumber={whatsappNumber} />
                  </div>
                ))}
              </div>
            </div>

            {/* Prev / Next arrows */}
            <button
              type="button" aria-label="Previous expert" onClick={() => go(-1)}
              className="absolute top-1/2 -translate-y-1/2 -left-3 lg:-left-5 flex items-center justify-center transition-all hover:scale-110"
              style={{
                width: 40, height: 40, borderRadius: '50%', background: '#FFFFFF',
                border: GOLD_BORDER, boxShadow: GOLD_GLOW, color: DARK, cursor: 'pointer',
              }}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button" aria-label="Next expert" onClick={() => go(1)}
              className="absolute top-1/2 -translate-y-1/2 -right-3 lg:-right-5 flex items-center justify-center transition-all hover:scale-110"
              style={{
                width: 40, height: 40, borderRadius: '50%', background: '#FFFFFF',
                border: GOLD_BORDER, boxShadow: GOLD_GLOW, color: DARK, cursor: 'pointer',
              }}
            >
              <ChevronRight className="h-5 w-5" />
            </button>

            {/* Dots */}
            <div className="flex items-center justify-center gap-2 mt-5">
              {EXPERTS.map((expert, i) => (
                <button
                  key={expert.name} type="button" aria-label={`Go to ${expert.name}`}
                  onClick={() => setActive(i)}
                  style={{
                    height: 8, borderRadius: 999, cursor: 'pointer', border: 'none',
                    width: i === active ? 24 : 8,
                    background: i === active ? GOLD : 'rgba(212,175,55,0.35)',
                    transition: 'all 0.3s',
                  }}
                />
              ))}
            </div>
          </div>

          {/* ── RIGHT — booking form ── */}
          <div style={{
            background: '#FFFFFF',
            border: GOLD_BORDER,
            borderRadius: '1.25rem',
            padding: 'clamp(1.75rem,4vw,2.5rem)',
            boxShadow: GOLD_GLOW,
          }}>
            <p style={{ ...CARD_H_EYEBROW, textAlign: 'center' }}>✦ Quick Booking ✦</p>

            <h3 className="font-display" style={{ ...CARD_H_PRIMARY, textAlign: 'center' }}>Get in Touch</h3>

            <p style={{ ...CARD_H_SECONDARY, textAlign: 'center' }}>Fill in the details and we'll connect on WhatsApp</p>

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
