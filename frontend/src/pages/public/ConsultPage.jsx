import { useState } from 'react';
import { ChevronDown, Gem, Sparkles, Home, MessageCircle } from 'lucide-react';
import api from '../../services/apiClient';

const WA = '918484913170';

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

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{
      borderBottom: '1px solid #E8D8C4',
      overflow: 'hidden',
    }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: '100%', textAlign: 'left', background: 'none', border: 'none',
          padding: '1.1rem 0', display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', cursor: 'pointer', gap: '1rem',
        }}
      >
        <span style={{ fontWeight: 600, fontSize: '0.93rem', color: '#1C1209', lineHeight: 1.4 }}>{q}</span>
        <ChevronDown style={{
          width: 18, height: 18, flexShrink: 0, color: '#C9A84C',
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s',
        }} />
      </button>
      {open && (
        <p style={{ paddingBottom: '1.1rem', color: '#5A3E2B', fontSize: '0.87rem', lineHeight: 1.75, margin: 0 }}>
          {a}
        </p>
      )}
    </div>
  );
}

export function ConsultPage() {
  const [form, setForm] = useState({
    name: '', phone: '', type: TYPES[0], concern: '', date: '', time: TIMES[0],
  });
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveError('');
    try {
      await api.post('/consultations', {
        name: form.name,
        phone: form.phone,
        consultation_type: form.type,
        concern: form.concern || null,
        preferred_date: form.date || null,
        preferred_time: form.time,
      });
    } catch {
      setSaveError('Could not save to server — opening WhatsApp anyway.');
    } finally {
      setSaving(false);
    }
    const lines = [
      `Hello Bhaktijyot! I'd like to book a consultation.`,
      ``,
      `Name: ${form.name}`,
      `WhatsApp: ${form.phone}`,
      `Type: ${form.type}`,
      form.concern ? `Concern: ${form.concern}` : null,
      form.date    ? `Preferred Date: ${form.date}` : null,
      `Preferred Time: ${form.time}`,
      ``,
      `Looking forward to hearing from you!`,
    ].filter((l) => l !== null).join('\n');
    window.open(`https://wa.me/${WA}?text=${encodeURIComponent(lines)}`, '_blank');
    setSubmitted(true);
  };

  return (
    <div style={{ background: '#FFF8F0', minHeight: '100vh' }}>

      {/* ── Hero ── */}
      <section style={{ background: '#F4E4D1', paddingTop: 'clamp(3rem,8vw,5rem)', paddingBottom: 'clamp(3rem,8vw,5rem)', textAlign: 'center' }}>
        <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 1.25rem' }}>
          <p style={{ color: '#C9A84C', fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.42em', marginBottom: '1rem' }}>
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
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.5rem 2.5rem' }}>
          {['Certified Gemologist', 'GIA Trained', '40+ Years Experience', '500+ Happy Clients'].map((b) => (
            <span key={b} style={{ color: '#C9A84C', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              ✦ {b}
            </span>
          ))}
        </div>
      </section>

      {/* ── What You Get ── */}
      <section style={{ padding: 'clamp(3rem,6vw,5rem) 1.25rem', background: '#FFF8F0' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <p style={{ color: '#C9A84C', fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.40em', textAlign: 'center', marginBottom: '0.65rem' }}>
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
                <span style={{ color: '#C9A84C' }}>{s.icon}</span>
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
          <p style={{ color: '#C9A84C', fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.40em', textAlign: 'center', marginBottom: '0.65rem' }}>
            ✦ Book Now ✦
          </p>
          <h2 style={{ color: '#1C1209', fontSize: 'clamp(1.6rem,3vw,2.2rem)', fontWeight: 600, textAlign: 'center', marginBottom: '0.5rem', letterSpacing: '-0.01em' }}>
            Book a Free Consultation
          </h2>
          <p style={{ color: '#7A5C3B', fontSize: '0.85rem', textAlign: 'center', marginBottom: '2.25rem', lineHeight: 1.65 }}>
            Fill in the form and we'll connect via WhatsApp to confirm your slot.
          </p>

          {submitted ? (
            <div style={{
              background: '#FFFFFF', border: '1.5px solid #C9A84C', borderRadius: '1.25rem',
              padding: '3rem 2rem', textAlign: 'center',
            }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>✦</div>
              <h3 style={{ color: '#1C1209', fontWeight: 700, fontSize: '1.2rem', marginBottom: '0.65rem' }}>
                Request Sent!
              </h3>
              <p style={{ color: '#7A5C3B', fontSize: '0.88rem', lineHeight: 1.70, marginBottom: '1.5rem' }}>
                WhatsApp has opened with your message. We'll confirm your consultation slot within a few hours.
              </p>
              <button
                onClick={() => setSubmitted(false)}
                style={{
                  background: 'linear-gradient(135deg, #C9A84C, #A07830)',
                  color: '#1C1209', fontWeight: 700, fontSize: '0.82rem',
                  textTransform: 'uppercase', letterSpacing: '0.12em',
                  padding: '0.75rem 2rem', borderRadius: 999, border: 'none', cursor: 'pointer',
                }}
              >
                Book Another
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{
              background: '#FFFFFF', borderRadius: '1.25rem',
              padding: 'clamp(1.5rem,4vw,2.25rem)', display: 'flex', flexDirection: 'column', gap: '1rem',
              boxShadow: '0 4px 32px rgba(28,18,9,0.08)',
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.71rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.10em', color: '#7A5C3B', marginBottom: '0.4rem' }}>Your Name *</label>
                  <input required type="text" placeholder="Full name" value={form.name} onChange={set('name')} style={inp} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.71rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.10em', color: '#7A5C3B', marginBottom: '0.4rem' }}>WhatsApp Number *</label>
                  <input required type="tel" placeholder="+91 98765 43210" value={form.phone} onChange={set('phone')} style={inp} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.71rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.10em', color: '#7A5C3B', marginBottom: '0.4rem' }}>Consultation Type *</label>
                <select value={form.type} onChange={set('type')} style={{ ...inp, cursor: 'pointer', appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23C9A84C' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', paddingRight: '2.5rem' }}>
                  {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.71rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.10em', color: '#7A5C3B', marginBottom: '0.4rem' }}>Your Concern</label>
                <textarea
                  rows={3} placeholder="Tell us what you're looking for or any specific questions…"
                  value={form.concern} onChange={set('concern')}
                  style={{ ...inp, resize: 'vertical', minHeight: 90 }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.71rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.10em', color: '#7A5C3B', marginBottom: '0.4rem' }}>Preferred Date</label>
                  <input type="date" value={form.date} onChange={set('date')} min={new Date().toISOString().split('T')[0]} style={inp} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.71rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.10em', color: '#7A5C3B', marginBottom: '0.4rem' }}>Preferred Time</label>
                  <select value={form.time} onChange={set('time')} style={{ ...inp, cursor: 'pointer', appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23C9A84C' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', paddingRight: '2.5rem' }}>
                    {TIMES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              {saveError && (
                <p style={{ color: '#B04030', fontSize: '0.78rem', margin: 0, textAlign: 'center' }}>
                  {saveError}
                </p>
              )}

              <button type="submit" disabled={saving} style={{
                marginTop: '0.5rem',
                background: 'linear-gradient(135deg, #C9A84C 0%, #A07830 100%)',
                color: '#1C1209', fontWeight: 700, fontSize: '0.87rem',
                textTransform: 'uppercase', letterSpacing: '0.14em',
                padding: '1rem', borderRadius: 12, border: 'none',
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.7 : 1,
                boxShadow: '0 6px 24px rgba(201,168,76,0.30)',
              }}>
                {saving ? 'Saving…' : 'Book on WhatsApp'}
              </button>

              <p style={{ textAlign: 'center', fontSize: '0.72rem', color: '#A07850', margin: 0 }}>
                Your details are saved securely and we'll confirm your slot via WhatsApp.
              </p>
            </form>
          )}
        </div>
      </section>

      {/* ── FAQ ── */}
      <section style={{ padding: 'clamp(3rem,6vw,5rem) 1.25rem', background: '#FFF8F0' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <p style={{ color: '#C9A84C', fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.40em', textAlign: 'center', marginBottom: '0.65rem' }}>
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
