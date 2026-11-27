import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useWhatsAppNumber, whatsappLink } from '../../services/siteConfig';
import flower from '../../assets/flower.webp';

/* ─────────────────────────────────────────────────────────────────────────
   Shared building blocks for the three policy pages (Privacy, Terms,
   Shipping & Returns). Update LEGAL_LAST_UPDATED whenever any of them change.
───────────────────────────────────────────────────────────────────────── */

export const LEGAL_LAST_UPDATED = '24 November 2026';

export const BUSINESS_NAME = 'Bhaktijyot';
export const BUSINESS_ADDRESS =
  'Mangal Murti Apartment, opp. Sami Ganpati, Delhi Gate, Ahilyanagar (Ahmednagar), Maharashtra, India';

const POLICY_LINKS = [
  { to: '/privacy',          label: 'Privacy Policy' },
  { to: '/terms',            label: 'Terms & Conditions' },
  { to: '/shipping-returns', label: 'Shipping, Cancellation & Refund Policy' },
];

/** '918484913170' → '+91 84849 13170' */
function formatPhone(digits) {
  if (digits.length === 12 && digits.startsWith('91')) return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  if (digits.length === 10) return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  return `+${digits}`;
}

function slugify(text) {
  return String(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/** Page shell: heading, lotus divider, "last updated", ivory card, links to the other policies. */
export function LegalPage({ eyebrow, title, intro, children }) {
  const { pathname } = useLocation();
  useEffect(() => {
    const previous = document.title;
    document.title = `${title} | ${BUSINESS_NAME}`;
    return () => { document.title = previous; };
  }, [title]);

  return (
    <div className="bg-cream">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <header className="text-center mb-8">
          <p className="text-[0.7rem] font-extrabold uppercase tracking-[0.35em] text-gold-700 mb-3">
            <span aria-hidden="true">✦ </span>{eyebrow}<span aria-hidden="true"> ✦</span>
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-espresso leading-tight">{title}</h1>
          <img
            src={flower}
            alt=""
            className="mx-auto mt-1 w-full max-w-[200px]"
            style={{ mixBlendMode: 'multiply' }}
          />
          <p className="mt-2 text-xs text-espresso/65">Last updated: {LEGAL_LAST_UPDATED}</p>
        </header>

        <div className="bg-ivory rounded-2xl border border-gold/30 shadow-sm px-5 py-8 sm:p-10 space-y-8 text-[15px] leading-relaxed text-espresso/85">
          {intro && <p className="text-espresso">{intro}</p>}
          {children}
        </div>

        <nav aria-label="Our policies" className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm">
          {POLICY_LINKS.filter((l) => l.to !== pathname).map((l) => (
            <Link key={l.to} to={l.to} className="text-primary font-semibold underline-offset-2 hover:underline">
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}

/** A titled section with an anchor id (e.g. /privacy#what-we-collect). */
export function LegalSection({ title, id, children }) {
  const anchor = id || slugify(title);
  return (
    <section aria-labelledby={anchor} className="space-y-3 scroll-mt-32">
      <h2 id={anchor} className="font-display text-xl sm:text-2xl font-semibold text-espresso">{title}</h2>
      {children}
    </section>
  );
}

/** Bulleted list styled for the policy pages. */
export function LegalList({ children }) {
  return <ul className="list-disc pl-5 space-y-2 marker:text-gold">{children}</ul>;
}

/** Contact block — WhatsApp number comes from Admin → Settings. */
export function LegalContact() {
  const number = useWhatsAppNumber();
  return (
    <LegalList>
      <li>
        WhatsApp:{' '}
        <a
          href={whatsappLink(number)}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-primary underline underline-offset-2"
        >
          {formatPhone(number)}
        </a>{' '}
        (the quickest way to reach us)
      </li>
      <li>
        Address: <address className="inline not-italic">{BUSINESS_NAME}, {BUSINESS_ADDRESS}</address>
      </li>
    </LegalList>
  );
}

const A = 'font-semibold text-primary underline underline-offset-2';

export function PrivacyPolicyPage() {
  return (
    <LegalPage
      eyebrow="Your Privacy"
      title="Privacy Policy"
      intro={`This policy explains what personal information ${BUSINESS_NAME} ("we", "us") collects when you use this website, why we collect it, and how we look after it.`}
    >
      <LegalSection title="Who we are">
        <p>
          {BUSINESS_NAME} sells gemstones, crystals, rudraksha and pooja essentials and is based in
          Ahilyanagar (Ahmednagar), Maharashtra, India. If you have any question about this policy, contact us
          using the details at the end of this page.
        </p>
      </LegalSection>

      <LegalSection title="What we collect" id="what-we-collect">
        <LegalList>
          <li>
            <strong>When you place an order:</strong> your name, mobile number, delivery address (address, city,
            state and pincode), your email address if you choose to give it, any order notes, and the items you buy.
          </li>
          <li>
            <strong>When you book a consultation:</strong> your name and mobile (WhatsApp) number, the type of
            consultation, and — only if you fill them in — your concern and a preferred date and time.
          </li>
          <li>
            <strong>When you write a review:</strong> the name you want shown with your review, your rating and what
            you write. If a review form asks for a phone number or email, it is used only to check the review and is
            never shown publicly.
          </li>
          <li>
            <strong>When you track an order or verify a certificate:</strong> the order number and phone number, or
            the certificate ID, that you type in — used only to look up that record.
          </li>
        </LegalList>
        <p>
          You don&apos;t need an account to shop with us — we don&apos;t have customer accounts or customer passwords.
        </p>
      </LegalSection>

      <LegalSection title="Payments">
        <p>
          Online payments are processed by <strong>Razorpay</strong>, our payment gateway. Your card, UPI,
          net-banking or wallet details are entered in Razorpay&apos;s secure checkout and are never seen or stored by
          us. We only receive a payment reference and whether the payment succeeded. Razorpay&apos;s checkout window
          may use its own cookies to process your payment securely.
        </p>
      </LegalSection>

      <LegalSection title="What stays in your browser">
        <LegalList>
          <li>
            Your <strong>cart and wishlist</strong> are saved in your own browser (local storage) so they are still
            there when you come back. They are not sent to us until you place an order, and clearing your browser
            data removes them.
          </li>
          <li>
            If you close the announcement bar at the top of the site, your browser remembers that until you close
            the tab (session storage).
          </li>
          <li>We don&apos;t use advertising or analytics cookies or tracking tools on this website.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="How we use your information">
        <LegalList>
          <li>to process, pack and deliver your order, and to handle cancellations, returns and refunds;</li>
          <li>to contact you by phone or WhatsApp about your order or consultation;</li>
          <li>to show your review on the website — every review is checked by us before it appears;</li>
          <li>to keep the records we are required to keep by law (for example, accounting and tax records);</li>
          <li>to protect the website and our customers from fraud and misuse.</li>
        </LegalList>
        <p>We do not sell or rent your personal information to anyone.</p>
      </LegalSection>

      <LegalSection title="Who we share it with">
        <p>We share only what is needed, and only with:</p>
        <LegalList>
          <li><strong>Razorpay</strong> — to process your payment, under Razorpay&apos;s own privacy policy;</li>
          <li>
            <strong>the courier or delivery partner</strong> that delivers your parcel — your name, phone number and
            delivery address;
          </li>
          <li>
            <strong>WhatsApp (Meta)</strong> — when you choose to message us on WhatsApp, that conversation is also
            covered by WhatsApp&apos;s terms and privacy policy;
          </li>
          <li>the companies that host our website and database for us;</li>
          <li>government or law-enforcement authorities, when the law requires it.</li>
        </LegalList>
        <p>
          Our pages also load fonts from Google Fonts and, on the home page, post images from Instagram. When your
          browser loads these, those services may receive technical details such as your IP address.
        </p>
      </LegalSection>

      <LegalSection title="How long we keep it">
        <p>
          We keep order records for as long as we need them to complete your order and to meet legal, tax and
          accounting requirements. Consultation requests and reviews are kept while they help us serve you — you
          can ask us to delete them at any time.
        </p>
      </LegalSection>

      <LegalSection title="Keeping it safe">
        <p>
          The website uses an encrypted (HTTPS) connection, and order and customer details can only be viewed by
          the people who run the shop, through a password-protected admin area. No website can be 100% secure, but
          we take reasonable care to protect your information.
        </p>
      </LegalSection>

      <LegalSection title="Your choices and rights">
        <p>
          You can ask us what personal information we hold about you, ask us to correct or delete it, or withdraw
          your consent for us to use it, in line with India&apos;s Digital Personal Data Protection Act, 2023. Just
          message us on WhatsApp. We may need to keep some records (such as invoices) where the law requires it.
        </p>
        <p>
          If you are unhappy with how we have handled your information, please contact us first so we can put it
          right.
        </p>
      </LegalSection>

      <LegalSection title="Changes to this policy">
        <p>
          We may update this policy from time to time. The &ldquo;Last updated&rdquo; date at the top of this page
          shows when it last changed. See also our <Link to="/terms" className={A}>Terms &amp; Conditions</Link>.
        </p>
      </LegalSection>

      <LegalSection title="Contact us">
        <LegalContact />
      </LegalSection>
    </LegalPage>
  );
}
