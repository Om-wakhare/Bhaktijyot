import { Link } from 'react-router-dom';
import {
  LegalPage,
  LegalSection,
  LegalList,
  LegalContact,
  BUSINESS_NAME,
} from './PrivacyPolicyPage';

const A = 'font-semibold text-primary underline underline-offset-2';

export function TermsPage() {
  return (
    <LegalPage
      eyebrow="Please Read"
      title="Terms & Conditions"
      intro={`These terms apply when you use this website or place an order with ${BUSINESS_NAME} ("we", "us"). By using the website or placing an order, you agree to them.`}
    >
      <LegalSection title="About us">
        <p>
          {BUSINESS_NAME} sells gemstones, crystals, rudraksha and pooja essentials and is based in
          Ahilyanagar (Ahmednagar), Maharashtra, India. Our contact details are at the end of this page.
        </p>
      </LegalSection>

      <LegalSection title="Using this website">
        <LegalList>
          <li>
            You must be 18 or older to place an order, or order with the involvement of a parent or guardian.
          </li>
          <li>
            Please give accurate details when you order, book a consultation or write a review, and don&apos;t try to
            disrupt, hack or misuse the website.
          </li>
          <li>
            The text, photos, logo and designs on this website belong to {BUSINESS_NAME} or are used with
            permission. Please don&apos;t copy them for commercial use without our written permission.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection title="Our products">
        <LegalList>
          <li>
            We describe and photograph every product as accurately as we can. Gemstones, crystals and rudraksha are
            natural, and many of our items are handmade, so colour, size, shape, weight and markings can differ a
            little from the photos — and screens show colours differently. This natural variation is not a defect.
          </li>
          <li>
            Where a gemstone comes with a certificate, you can check it on our{' '}
            <Link to="/verify" className={A}>Verify Certificate</Link> page.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection title="Spiritual and wellness information">
        <p>
          Information about the astrological, spiritual or healing properties of our products, and guidance given
          during consultations, is based on traditional beliefs and practice. It is not medical, psychological,
          legal or financial advice, and we can&apos;t promise any particular result. For health concerns, please
          consult a qualified professional.
        </p>
      </LegalSection>

      <LegalSection title="Prices and payment">
        <LegalList>
          <li>All prices are in Indian Rupees (₹). The amount shown at checkout is the amount you pay.</li>
          <li>
            Payments are processed securely by Razorpay. Your order is confirmed only once the payment is
            successful.
          </li>
          <li>
            Items are held for you for a short time while you complete payment. If the payment isn&apos;t completed,
            they are released for other customers.
          </li>
          <li>
            If an item turns out to be unavailable, or a product was listed with an obvious error in its price or
            description, we may cancel that order and refund the full amount you paid.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection title="Shipping, cancellations, returns and refunds">
        <p>
          These are explained on our{' '}
          <Link to="/shipping-returns" className={A}>Shipping, Cancellation &amp; Refund Policy</Link> page.
        </p>
      </LegalSection>

      <LegalSection title="Consultations">
        <p>
          Submitting the consultation form is a request — we confirm the time with you on WhatsApp. If any part of
          a consultation is chargeable, we will tell you before any charge applies.
        </p>
      </LegalSection>

      <LegalSection title="Reviews">
        <LegalList>
          <li>Reviews should be honest, about your own experience, and free of offensive or personal content.</li>
          <li>We check every review before it appears, and we may decline or remove reviews that break these rules.</li>
          <li>
            By submitting a review you allow us to show it on our website together with the name you entered.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection title="Our responsibility">
        <p>
          As far as the law allows, our total responsibility for any order is limited to the amount you paid for
          that order, and we are not responsible for indirect losses. Nothing in these terms takes away your rights
          under the Consumer Protection Act, 2019 or any other law that protects you.
        </p>
      </LegalSection>

      <LegalSection title="Governing law">
        <p>
          These terms are governed by the laws of India. Any dispute will be subject to the jurisdiction of the
          courts at Ahilyanagar (Ahmednagar), Maharashtra.
        </p>
      </LegalSection>

      <LegalSection title="Changes to these terms">
        <p>
          We may update these terms from time to time. The &ldquo;Last updated&rdquo; date at the top shows when they
          last changed; the version on this page when you place an order applies to that order. Also see our{' '}
          <Link to="/privacy" className={A}>Privacy Policy</Link>.
        </p>
      </LegalSection>

      <LegalSection title="Contact us">
        <LegalContact />
      </LegalSection>
    </LegalPage>
  );
}
