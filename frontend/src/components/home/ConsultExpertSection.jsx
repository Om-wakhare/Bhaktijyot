import { useState, useEffect, useId, useRef } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import api, { getErrorMessage } from '../../services/apiClient';
import { useWhatsAppNumber, whatsappLink } from '../../services/siteConfig';
import { WhatsAppIcon } from '../ui/WhatsAppIcon';

/* ── Shared typographic tokens (mirrors HeroSection) ── */
const GOLD = '#D4AF37';
const DARK = '#1C1209';

/* Light-bg typography — same scale as hero, adapted for cream/white surface.
   No fontFamily here: the `font-display` class on the element sets Playfair. */
const H_PRIMARY = {
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
  color: 'rgba(28,18,9,0.70)',
  fontSize: '0.95rem',
  lineHeight: 1.7,
};

/* Card — white background, gold glowing border */
const GOLD_BORDER = '1.5px solid rgba(212,175,55,0.75)';
const GOLD_GLOW   = '0 0 10px rgba(212,175,55,0.5), 0 0 24px rgba(212,175,55,0.2), inset 0 0 12px rgba(212,175,55,0.08)';

/* Card heading — same Playfair Display scale, dark text, gold glow for light bg */
const CARD_H_PRIMARY = {
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
  color: 'rgba(28,18,9,0.65)',
  fontSize: '0.85rem',
  lineHeight: 1.6,
  marginBottom: '1.75rem',
};

/* Input — white bg, gold border, dark text (focus ring comes from INPUT_CLASS) */
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
const INPUT_CLASS = 'focus:ring-2 focus:ring-gold-400/50 transition-shadow';

/* Gold-glow button look shared by the submit button and the WhatsApp link */
const GOLD_BUTTON = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.5rem',
  padding: '0.9rem',
  borderRadius: 8,
  border: GOLD_BORDER,
  background: 'transparent',
  boxShadow: GOLD_GLOW,
  color: DARK,
  fontWeight: 800,
  fontSize: '0.82rem',
  textTransform: 'uppercase',
  letterSpacing: '0.16em',
  textDecoration: 'none',
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
    qualification: 'Certified Vedic Gemologist (GIA)',
    experience: '40+ years of experience',
    speciality: 'Vedic Astrology & Gemstones',
    photo: null,
  },
  {
    name: 'Dr. Meera Joshi',
    qualification: 'Certified Crystal Healing Therapist',
    experience: '15+ years of experience',
    speciality: 'Crystal Healing & Chakra Balancing',
    photo: null,
  },
];

function initials(name) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

/** Same rule as the backend: 10 digits starting 6–9, optional +91 / 0 prefix and spaces. */
function isIndianMobile(value) {
  let digits = String(value || '').replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  return /^[6-9]\d{9}$/.test(digits);
}

function bookingMessage(form) {
  return (
    `Hello Bhaktijyot! I'd like to book a consultation.\n\n` +
    `Name: ${form.name.trim()}\nWhatsApp: ${form.phone.trim()}\nType: ${form.type}\n\n` +
    `Looking forward to hearing from you!`
  );
}

function prefersReducedMotion() {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/* Full-size image card — photo fills the card, details overlaid at the bottom */
function ExpertCard({ expert }) {
  return (
    <div
      style={{
        position: 'relative',
        height: '100%',
        minHeight: 440,
        borderRadius: '1.25rem',
        overflow: 'hidden',
        border: GOLD_BORDER,
        boxShadow: GOLD_GLOW,
      }}
    >
      {/* Full-bleed photo, or gradient placeholder with initials */}
      {expert.photo ? (
        <img
          src={expert.photo}
          alt={expert.name}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(160deg, #1D3D2C 0%, #2A5A40 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <span className="font-display" style={{ color: 'rgba(212,175,55,0.45)', fontSize: '5.5rem', fontWeight: 700 }}>
            {initials(expert.name)}
          </span>
        </div>
      )}

      {/* Bottom gradient for readability */}
      <div aria-hidden="true" style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to top, rgba(15,8,2,0.94) 0%, rgba(15,8,2,0.55) 38%, transparent 68%)',
      }} />

      {/* Details */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '1.75rem 1.75rem 2rem' }}>
        <p style={{ color: GOLD, fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
          {expert.speciality}
        </p>
        <h3 className="font-display" style={{ color: '#FFF5E6', fontSize: 'clamp(1.5rem, 2.4vw, 1.9rem)', fontWeight: 700, lineHeight: 1.15 }}>
          {expert.name}
        </h3>
        <p style={{ color: 'rgba(255,245,230,0.85)', fontSize: '0.86rem', fontWeight: 600, marginTop: '0.45rem' }}>
          {expert.qualification}
        </p>
        <p style={{ color: 'rgba(255,245,230,0.72)', fontSize: '0.78rem', fontWeight: 500, marginTop: '0.2rem' }}>
          {expert.experience}
        </p>
      </div>
    </div>
  );
}

const EMPTY_FORM = { name: '', phone: '', type: TYPES[0] };

export function ConsultExpertSection() {
  const whatsappNumber = useWhatsAppNumber();
  const uid = useId();
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sentMessage, setSentMessage] = useState(''); // set once the booking is saved
  const successHeadingRef = useRef(null);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  /* ── Expert carousel — auto-rotates, pauses on hover/focus and for reduced motion ── */
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused || EXPERTS.length < 2 || prefersReducedMotion()) return undefined;
    const t = setInterval(() => setActive((i) => (i + 1) % EXPERTS.length), 4500);
    return () => clearInterval(t);
  }, [paused]);

  // Move focus to the confirmation so screen-reader users hear it
  useEffect(() => {
    if (sentMessage) successHeadingRef.current?.focus();
  }, [sentMessage]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!isIndianMobile(form.phone)) {
      setError('Please enter a valid 10-digit Indian mobile number.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/consultations', {
        name: form.name.trim(),
        phone: form.phone.trim(),
        consultation_type: form.type,
      });
      // Opening WhatsApp here (after an await) would be popup-blocked on phones,
      // so show a real link the visitor taps instead.
      setSentMessage(bookingMessage(form));
    } catch (err) {
      setError(getErrorMessage(err, 'Could not send your request. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setForm(EMPTY_FORM);
    setSentMessage('');
    setError('');
  };

  const ids = {
    name: `${uid}-name`,
    phone: `${uid}-phone`,
    type: `${uid}-type`,
    error: `${uid}-error`,
  };

  return (
    <section style={{ background: '#F4E4D1' }} className="py-16 lg:py-24" aria-labelledby={`${uid}-heading`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ── Header — centered ── */}
        <div className="text-center max-w-2xl mx-auto mb-12 lg:mb-16">
          <p style={{ ...H_EYEBROW, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
            ✨ Meet Our Experts · Since 1985
          </p>
          <h2 id={`${uid}-heading`} className="font-display mt-3" style={H_PRIMARY}>Consult an Expert</h2>
          <p className="mx-auto mt-4" style={H_SECONDARY}>
            Not sure which crystal or gemstone is right for you? Get a personalised recommendation
            from our certified gemologists &amp; healers — in person or over WhatsApp.
          </p>
        </div>

        {/* ── Two columns — auto-rotating expert carousel (left) + form (right) ── */}
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-stretch">

          {/* ── LEFT — expert carousel (auto-rotating) ── */}
          <div
            role="group"
            aria-label="Our experts"
            style={{ overflow: 'hidden', borderRadius: '1.25rem' }}
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onFocus={() => setPaused(true)}
            onBlur={() => setPaused(false)}
          >
            <div style={{
              display: 'flex',
              height: '100%',
              transform: `translateX(-${active * 100}%)`,
              transition: 'transform 0.7s cubic-bezier(0.4,0,0.2,1)',
            }}>
              {EXPERTS.map((expert, i) => (
                <div
                  key={expert.name}
                  style={{ minWidth: '100%', display: 'flex' }}
                  aria-hidden={i === active ? undefined : 'true'}
                >
                  <div style={{ flex: 1 }}>
                    <ExpertCard expert={expert} />
                  </div>
                </div>
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
            {sentMessage ? (
              /* ── Success — the visitor taps a real link to open WhatsApp ── */
              <div className="flex flex-col items-center text-center">
                <div
                  aria-hidden="true"
                  className="h-14 w-14 rounded-full flex items-center justify-center mb-4"
                  style={{ background: 'rgba(212,175,55,0.10)', border: '1.5px solid rgba(212,175,55,0.45)' }}
                >
                  <CheckCircle className="h-7 w-7" style={{ color: GOLD }} />
                </div>
                <h3
                  ref={successHeadingRef}
                  tabIndex={-1}
                  className="font-display focus:outline-none"
                  style={{ ...CARD_H_PRIMARY, textAlign: 'center' }}
                >
                  Request Received
                </h3>
                <p style={{ ...CARD_H_SECONDARY, textAlign: 'center', marginBottom: '1.5rem' }}>
                  Thank you{form.name.trim() ? `, ${form.name.trim()}` : ''}! Tap below to send your details to us on
                  WhatsApp so we can confirm your consultation.
                </p>
                <a
                  href={whatsappLink(whatsappNumber, sentMessage)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full transition-all hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2"
                  style={GOLD_BUTTON}
                >
                  <WhatsAppIcon className="h-4 w-4" />
                  Continue on WhatsApp
                </a>
                <button
                  type="button"
                  onClick={reset}
                  className="mt-4 underline underline-offset-4 hover:text-espresso transition-colors"
                  style={{ color: '#7A5C3B', fontSize: '0.78rem', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  Book another consultation
                </button>
              </div>
            ) : (
              <>
                <p style={{ ...CARD_H_EYEBROW, textAlign: 'center' }}>✦ Quick Booking ✦</p>

                <h3 className="font-display" style={{ ...CARD_H_PRIMARY, textAlign: 'center' }}>Get in Touch</h3>

                <p style={{ ...CARD_H_SECONDARY, textAlign: 'center' }}>Fill in the details and we'll connect on WhatsApp</p>

                <form
                  onSubmit={handleSubmit}
                  style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}
                >
                  <label htmlFor={ids.name} className="sr-only">Your name</label>
                  <input
                    id={ids.name}
                    required
                    type="text"
                    autoComplete="name"
                    maxLength={200}
                    placeholder="Your Name"
                    value={form.name}
                    onChange={set('name')}
                    className={INPUT_CLASS}
                    style={inp}
                  />

                  <label htmlFor={ids.phone} className="sr-only">WhatsApp number (10-digit Indian mobile)</label>
                  <input
                    id={ids.phone}
                    required
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    maxLength={16}
                    placeholder="WhatsApp Number"
                    value={form.phone}
                    onChange={set('phone')}
                    aria-invalid={error ? 'true' : undefined}
                    aria-describedby={error ? ids.error : undefined}
                    className={INPUT_CLASS}
                    style={inp}
                  />

                  <label htmlFor={ids.type} className="sr-only">Consultation type</label>
                  <select
                    id={ids.type}
                    value={form.type}
                    onChange={set('type')}
                    className={INPUT_CLASS}
                    style={{
                      ...inp, cursor: 'pointer', appearance: 'none',
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23D4AF37' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
                      backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', paddingRight: '2.5rem',
                    }}
                  >
                    {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>

                  {error && (
                    <div id={ids.error} role="alert" style={{ fontSize: '0.8rem', color: '#B42318', lineHeight: 1.5 }}>
                      <p>{error}</p>
                      <p style={{ marginTop: '0.35rem', color: 'rgba(28,18,9,0.70)' }}>
                        You can also{' '}
                        <a
                          href={whatsappLink(whatsappNumber, bookingMessage(form))}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline underline-offset-2 font-semibold"
                          style={{ color: '#7A5C3B' }}
                        >
                          send your details on WhatsApp
                        </a>
                        .
                      </p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="transition-all hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2"
                    style={{
                      ...GOLD_BUTTON,
                      marginTop: '0.35rem',
                      boxShadow: loading ? 'none' : GOLD_GLOW,
                      cursor: loading ? 'not-allowed' : 'pointer',
                      opacity: loading ? 0.6 : 1,
                    }}
                  >
                    {loading ? 'Sending…' : 'Book on WhatsApp'}
                  </button>
                </form>
              </>
            )}

            <div style={{ borderTop: '1px solid rgba(212,175,55,0.25)', marginTop: '1.25rem', paddingTop: '1rem', textAlign: 'center' }}>
              <Link
                to="/consult"
                style={{ color: '#7A5C3B', fontSize: '0.75rem', fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: 3 }}
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
