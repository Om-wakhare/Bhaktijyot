import { useState, useId, useRef, useEffect } from 'react';
import { ChevronDown, Gem, Sparkles, Home, MessageCircle } from 'lucide-react';
import api, { getErrorMessage } from '../../services/apiClient';
import { useWhatsAppNumber, whatsappLink } from '../../services/siteConfig';
import { WhatsAppIcon } from '../../components/ui/WhatsAppIcon';

const TYPES = [
  'Crystal Healing',
  'Gemstone Recommendation',
  'Vastu Guidance',
  'General Query',
];

const TIMES = [
  'Morning (9 am – 12 pm)',
  'Afternoon (12 pm – 4 pm)',
  'Evening (4 pm – 8 pm)',
];

const SERVICES = [
  {
    icon: <Gem style={{ width: 24, height: 24 }} />,
    title: 'Gemstone Matching',
    desc: 'Personalised stone selection based on your birth chart, intent, and energy needs.',
  },
  {
    icon: <Sparkles style={{ width: 24, height: 24 }} />,
    title: 'Crystal Healing',
    desc: 'Guidance on chakra alignment, placement, and programming your crystals for daily use.',
  },
  {
    icon: <Home style={{ width: 24, height: 24 }} />,
    title: 'Vastu Guidance',
    desc: 'Strategic placement of crystals and gemstones to harmonise your home or workspace.',
  },
  {
    icon: <MessageCircle style={{ width: 24, height: 24 }} />,
    title: 'WhatsApp Follow-up',
    desc: 'Every consultation includes a follow-up message with written notes and recommendations.',
  },
];

const FAQS = [
  {
    q: 'How long is a typical consultation?',
    a: '30–60 minutes depending on the type. Crystal healing and gemstone matching sessions usually take 45 minutes. General queries are often resolved in 20–30 minutes.',
  },
  {
    q: 'Is the consultation free?',
    a: 'The initial consultation is complimentary. In-depth personalised reports, birth chart analysis, or ongoing follow-ups may be chargeable — this will be discussed transparently before any charges apply.',
  },
  {
    q: 'Is it available online or in-person only?',
    a: 'Both. You can visit us at our store in Ahmednagar or book a WhatsApp call/chat consultation from anywhere in the world.',
  },
  {
    q: 'What should I bring or prepare?',
    a: "For a gemstone or crystal consultation, knowing your date of birth helps. Otherwise just bring your questions! If you have existing gemstones you'd like assessed, bring those along too.",
  },
];

const inp = {
  width: '100%',
  padding: '0.75rem 1rem',
  border: '1.5px solid #D4C0A0',
  borderRadius: 10,
  fontSize: '0.9rem',
  color: '#1C1209',
  background: '#FFFFFF',
  outline: 'none',
  transition: 'border-color 0.18s, box-shadow 0.18s',
  fontFamily: 'inherit',
};
const INPUT_CLASS = 'focus:ring-2 focus:ring-gold-400/50';

const LABEL = {
  display: 'block',
  fontSize: '0.71rem',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.10em',
  color: '#7A5C3B',
  marginBottom: '0.4rem',
};

const SELECT_ARROW = {
  cursor: 'pointer',
  appearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23C9A84C' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 1rem center',
  paddingRight: '2.5rem',
};

const GOLD_BUTTON = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.5rem',
  background: 'linear-gradient(135deg, #C9A84C 0%, #A07830 100%)',
  color: '#1C1209',
  fontWeight: 700,
  fontSize: '0.87rem',
  textTransform: 'uppercase',
  letterSpacing: '0.14em',
  padding: '1rem',
  borderRadius: 12,
  border: 'none',
  boxShadow: '0 6px 24px rgba(201,168,76,0.30)',
  textDecoration: 'none',
  cursor: 'pointer',
};

/** Same rule as the backend: 10 digits starting 6–9, optional +91 / 0 prefix and spaces. */
function isIndianMobile(value) {
  let digits = String(value || '').replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  return /^[6-9]\d{9}$/.test(digits);
}

/** Today's date in the visitor's own timezone as YYYY-MM-DD (toISOString would use UTC). */
function todayLocal() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function bookingMessage(form) {
  return [
    `Hello Bhaktijyot! I'd like to book a consultation.`,
    ``,
    `Name: ${form.name.trim()}`,
    `WhatsApp: ${form.phone.trim()}`,
    `Type: ${form.type}`,
    form.concern.trim() ? `Concern: ${form.concern.trim()}` : null,
    form.date ? `Preferred Date: ${form.date}` : null,
    `Preferred Time: ${form.time}`,
    ``,
    `Looking forward to hearing from you!`,
  ].filter((l) => l !== null).join('\n');
}

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div style={{ borderBottom: '1px solid #E8D8C4', overflow: 'hidden' }}>
      <h3 style={{ margin: 0 }}>
        <button
          type="button"
          id={`${id}-q`}
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={`${id}-a`}
          className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400/60 rounded"
          style={{
            width: '100%', textAlign: 'left', background: 'none', border: 'none',
            padding: '1.1rem 0', display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', cursor: 'pointer', gap: '1rem', fontFamily: 'inherit',
          }}
        >
          <span style={{ fontWeight: 600, fontSize: '0.93rem', color: '#1C1209', lineHeight: 1.4 }}>{q}</span>
          <ChevronDown aria-hidden="true" style={{
            width: 18, height: 18, flexShrink: 0, color: '#C9A84C',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
          }} />
        </button>
      </h3>
      <div id={`${id}-a`} role="region" aria-labelledby={`${id}-q`} hidden={!open}>
        <p style={{ paddingBottom: '1.1rem', color: '#5A3E2B', fontSize: '0.87rem', lineHeight: 1.75, margin: 0 }}>
          {a}
        </p>
      </div>
    </div>
  );
}

const EMPTY_FORM = { name: '', phone: '', type: TYPES[0], concern: '', date: '', time: TIMES[0] };

export function ConsultPage() {
  const whatsappNumber = useWhatsAppNumber();
  const uid = useId();
  const [form, setForm] = useState(EMPTY_FORM);
  const [sentMessage, setSentMessage] = useState(''); // set once the request is saved
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const successRef = useRef(null);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  // Announce / move focus to the confirmation once the request is saved
  useEffect(() => {
    if (sentMessage) successRef.current?.focus();
  }, [sentMessage]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaveError('');
    if (!isIndianMobile(form.phone)) {
      setSaveError('Please enter a valid 10-digit Indian mobile number.');
      return;
    }
    setSaving(true);
    try {
      await api.post('/consultations', {
        name: form.name.trim(),
        phone: form.phone.trim(),
        consultation_type: form.type,
        concern: form.concern.trim() || null,
        preferred_date: form.date || null,
        preferred_time: form.time,
      });
      // Opening WhatsApp automatically after an await is popup-blocked on phones,
      // so show a real link the visitor taps instead.
      setSentMessage(bookingMessage(form));
    } catch (err) {
      setSaveError(getErrorMessage(err, 'Could not send your request. Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  const bookAnother = () => {
    setForm(EMPTY_FORM);
    setSentMessage('');
    setSaveError('');
  };

  const ids = {
    name: `${uid}-name`,
    phone: `${uid}-phone`,
    type: `${uid}-type`,
    concern: `${uid}-concern`,
    date: `${uid}-date`,
    time: `${uid}-time`,
    error: `${uid}-error`,
  };

  return (
    <div style={{ background: '#FFF8F0', minHeight: '100vh' }}>

      {/* ── Hero ── */}
      <section style={{ background: '#F4E4D1', paddingTop: 'clamp(3rem,8vw,5rem)', paddingBottom: 'clamp(3rem,8vw,5rem)', textAlign: 'center' }}>
        <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 1.25rem' }}>
          <p className="text-gold-700" style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.42em', marginBottom: '1rem' }}>
            ✦ Certified Gemologist · Crystal Healer ✦
          </p>
          <h1 style={{ color: '#1C1209', fontSize: 'clamp(2.25rem,5vw,3.5rem)', fontWeight: 700, lineHeight: 1.1, letterSpacing: '-0.02em', marginBottom: '1.25rem' }}>
            Consult an Expert
          </h1>
          <p style={{ color: '#5A3E2B', fontSize: '1rem', lineHeight: 1.80, maxWidth: 520, margin: '0 auto' }}>
            Book a one-on-one consultation with our certified gemologist. Whether you need crystal healing guidance, gemstone matching, or Vastu advice — we're here to help.
          </p>
        </div>
      </section>

      {/* ── Credential strip ── */}
      <section style={{ background: '#1C1209', padding: '1.25rem 1rem' }}>
        <ul style={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.5rem 2.5rem' }}>
          {['Certified Gemologist', 'GIA Trained', '40+ Years Experience', '500+ Happy Clients'].map((b) => (
            <li key={b} style={{ color: '#C9A84C', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              <span aria-hidden="true">✦ </span>{b}
            </li>
          ))}
        </ul>
      </section>

      {/* ── What You Get ── */}
      <section style={{ padding: 'clamp(3rem,6vw,5rem) 1.25rem', background: '#FFF8F0' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <p className="text-gold-700" style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.40em', textAlign: 'center', marginBottom: '0.65rem' }}>
            ✦ Our Services ✦
          </p>
          <h2 style={{ color: '#1C1209', fontSize: 'clamp(1.6rem,3vw,2.2rem)', fontWeight: 600, textAlign: 'center', marginBottom: '2.5rem', letterSpacing: '-0.01em' }}>
            What You Get
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
            {SERVICES.map((s) => (
              <div key={s.title} style={{
                background: '#FFFFFF', border: '1px solid #EAD9C4', borderRadius: '1rem',
                padding: '1.75rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.85rem',
              }}>
                <span aria-hidden="true" style={{ color: '#C9A84C' }}>{s.icon}</span>
                <h3 style={{ color: '#1C1209', fontWeight: 700, fontSize: '0.95rem', margin: 0 }}>{s.title}</h3>
                <p style={{ color: '#7A5C3B', fontSize: '0.83rem', lineHeight: 1.70, margin: 0 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Booking Form ── */}
      <section style={{ padding: 'clamp(3rem,6vw,5rem) 1.25rem', background: '#F4E4D1' }}>
        <div style={{ maxWidth: 580, margin: '0 auto' }}>
          <p className="text-gold-700" style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.40em', textAlign: 'center', marginBottom: '0.65rem' }}>
            ✦ Book Now ✦
          </p>
          <h2 style={{ color: '#1C1209', fontSize: 'clamp(1.6rem,3vw,2.2rem)', fontWeight: 600, textAlign: 'center', marginBottom: '0.5rem', letterSpacing: '-0.01em' }}>
            Book a Free Consultation
          </h2>
          <p style={{ color: '#7A5C3B', fontSize: '0.85rem', textAlign: 'center', marginBottom: '2.25rem', lineHeight: 1.65 }}>
            Fill in the form and we'll connect via WhatsApp to confirm your slot.
          </p>

          {sentMessage ? (
            <div style={{
              background: '#FFFFFF', border: '1.5px solid #C9A84C', borderRadius: '1.25rem',
              padding: 'clamp(2rem,6vw,3rem) clamp(1.25rem,5vw,2rem)', textAlign: 'center',
            }}>
              <div aria-hidden="true" style={{ fontSize: '2.5rem', marginBottom: '1rem', color: '#C9A84C' }}>✦</div>
              <h3
                ref={successRef}
                tabIndex={-1}
                className="focus:outline-none"
                style={{ color: '#1C1209', fontWeight: 700, fontSize: '1.2rem', marginBottom: '0.65rem' }}
              >
                Request Received
              </h3>
              <p style={{ color: '#7A5C3B', fontSize: '0.88rem', lineHeight: 1.70, marginBottom: '1.5rem' }}>
                Thank you! We've saved your consultation request. Tap the button below to send your
                details to us on WhatsApp — we'll confirm your slot there.
              </p>
              <a
                href={whatsappLink(whatsappNumber, sentMessage)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                style={GOLD_BUTTON}
              >
                <WhatsAppIcon className="h-4 w-4" />
                Continue on WhatsApp
              </a>
              <button
                type="button"
                onClick={bookAnother}
                className="hover:text-espresso transition-colors"
                style={{
                  marginTop: '1rem', background: 'none', border: 'none', cursor: 'pointer',
                  color: '#7A5C3B', fontSize: '0.8rem', fontWeight: 600,
                  textDecoration: 'underline', textUnderlineOffset: 3, fontFamily: 'inherit',
                }}
              >
                Book another consultation
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{
              background: '#FFFFFF', borderRadius: '1.25rem',
              padding: 'clamp(1.25rem,4vw,2.25rem)', display: 'flex', flexDirection: 'column', gap: '1rem',
              boxShadow: '0 4px 32px rgba(28,18,9,0.08)',
            }}>
              {/* Two columns from 640px up; stacked on phones */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor={ids.name} style={LABEL}>Your Name *</label>
                  <input
                    id={ids.name}
                    required
                    type="text"
                    autoComplete="name"
                    maxLength={200}
                    placeholder="Full name"
                    value={form.name}
                    onChange={set('name')}
                    className={INPUT_CLASS}
                    style={inp}
                  />
                </div>
                <div>
                  <label htmlFor={ids.phone} style={LABEL}>WhatsApp Number *</label>
                  <input
                    id={ids.phone}
                    required
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    maxLength={16}
                    placeholder="+91 98765 43210"
                    value={form.phone}
                    onChange={set('phone')}
                    aria-invalid={saveError ? 'true' : undefined}
                    aria-describedby={saveError ? ids.error : undefined}
                    className={INPUT_CLASS}
                    style={inp}
                  />
                </div>
              </div>

              <div>
                <label htmlFor={ids.type} style={LABEL}>Consultation Type *</label>
                <select
                  id={ids.type}
                  value={form.type}
                  onChange={set('type')}
                  className={INPUT_CLASS}
                  style={{ ...inp, ...SELECT_ARROW }}
                >
                  {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div>
                <label htmlFor={ids.concern} style={LABEL}>Your Concern</label>
                <textarea
                  id={ids.concern}
                  rows={3}
                  maxLength={2000}
                  placeholder="Tell us what you're looking for or any specific questions…"
                  value={form.concern}
                  onChange={set('concern')}
                  className={INPUT_CLASS}
                  style={{ ...inp, resize: 'vertical', minHeight: 90 }}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor={ids.date} style={LABEL}>Preferred Date</label>
                  <input
                    id={ids.date}
                    type="date"
                    value={form.date}
                    onChange={set('date')}
                    min={todayLocal()}
                    className={INPUT_CLASS}
                    style={inp}
                  />
                </div>
                <div>
                  <label htmlFor={ids.time} style={LABEL}>Preferred Time</label>
                  <select
                    id={ids.time}
                    value={form.time}
                    onChange={set('time')}
                    className={INPUT_CLASS}
                    style={{ ...inp, ...SELECT_ARROW }}
                  >
                    {TIMES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              {saveError && (
                <div id={ids.error} role="alert" style={{ textAlign: 'center', fontSize: '0.8rem', lineHeight: 1.55 }}>
                  <p style={{ color: '#B42318', margin: 0 }}>{saveError}</p>
                  <p style={{ color: '#7A5C3B', margin: '0.35rem 0 0' }}>
                    You can also{' '}
                    <a
                      href={whatsappLink(whatsappNumber, bookingMessage(form))}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#5A3E2B', fontWeight: 700, textDecoration: 'underline', textUnderlineOffset: 2 }}
                    >
                      send your details on WhatsApp
                    </a>
                    .
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={saving}
                className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                style={{
                  ...GOLD_BUTTON,
                  marginTop: '0.5rem',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.7 : 1,
                  fontFamily: 'inherit',
                }}
              >
                {saving ? 'Sending…' : 'Book on WhatsApp'}
              </button>

              <p style={{ textAlign: 'center', fontSize: '0.72rem', color: '#7A5C3B', margin: 0 }}>
                Your details are saved securely and we'll confirm your slot via WhatsApp.
              </p>
            </form>
          )}
        </div>
      </section>

      {/* ── FAQ ── */}
      <section style={{ padding: 'clamp(3rem,6vw,5rem) 1.25rem', background: '#FFF8F0' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <p className="text-gold-700" style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.40em', textAlign: 'center', marginBottom: '0.65rem' }}>
            ✦ FAQ ✦
          </p>
          <h2 style={{ color: '#1C1209', fontSize: 'clamp(1.6rem,3vw,2.2rem)', fontWeight: 600, textAlign: 'center', marginBottom: '2rem', letterSpacing: '-0.01em' }}>
            Common Questions
          </h2>
          <div style={{ borderTop: '1px solid #E8D8C4' }}>
            {FAQS.map((f) => <FaqItem key={f.q} {...f} />)}
          </div>
        </div>
      </section>

    </div>
  );
}
