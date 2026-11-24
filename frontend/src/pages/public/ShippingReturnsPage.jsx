import { Link } from 'react-router-dom';
import { LegalPage, LegalSection, LegalList, LegalContact } from './PrivacyPolicyPage';

/** How many days after delivery a damaged / incorrect item can be reported. */
export const RETURN_WINDOW_DAYS = 7;

const A = 'font-semibold text-primary underline underline-offset-2';

export function ShippingReturnsPage() {
  return (
    <LegalPage
      eyebrow="Orders & Delivery"
      title="Shipping, Cancellation & Refund Policy"
      intro="Here's how shipping, cancellations, returns and refunds work for orders placed on this website."
    >
      <LegalSection title="Shipping & delivery" id="shipping">
        <LegalList>
          <li>We currently ship to addresses within India. For orders outside India, please message us on WhatsApp first.</li>
          <li><strong>Shipping is free on all orders.</strong></li>
          <li>
            We dispatch your order after your payment is confirmed. Delivery time depends on your location and the
            courier.
          </li>
          <li>
            You can check the status of your order at any time on our{' '}
            <Link to="/track-order" className={A}>Track Order</Link> page, using your order number and phone number.
          </li>
          <li>
            Please make sure your address, pincode and phone number are correct. If a parcel can&apos;t be delivered,
            message us on WhatsApp and we&apos;ll work out the next steps with you.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection title="Cancellations" id="cancellations">
        <LegalList>
          <li>
            You can cancel your order <strong>before it is dispatched</strong>. Message us on WhatsApp with your
            order number; once we confirm the cancellation, we refund the full amount to your original payment
            method.
          </li>
          <li>
            Once an order has been dispatched it can no longer be cancelled. If it then arrives damaged or
            incorrect, see &ldquo;Returns &amp; replacements&rdquo; below.
          </li>
          <li>
            We may cancel an order ourselves — for example if an item is unavailable or we can&apos;t deliver to your
            pincode. If that happens, you receive a full refund.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection title="Returns & replacements" id="returns">
        <p>We accept returns only when an item arrives damaged or is not what you ordered.</p>
        <LegalList>
          <li>
            Tell us on WhatsApp <strong>within {RETURN_WINDOW_DAYS} days of delivery</strong>, with your order
            number and clear photos (or a short video) of the item and its packaging.
          </li>
          <li>
            We review every request. If we need the item back, we&apos;ll explain how to send it. After checking it,
            we arrange a replacement (if available) or a refund.
          </li>
          <li>Tip: recording a short video while you open the parcel makes any claim much quicker to resolve.</li>
        </LegalList>
        <p>We can&apos;t accept returns:</p>
        <LegalList>
          <li>reported more than {RETURN_WINDOW_DAYS} days after delivery;</li>
          <li>for a change of mind;</li>
          <li>for damage caused by use or handling after delivery;</li>
          <li>
            for the natural variation in colour, size, shape, texture or markings of gemstones, crystals, rudraksha
            and handmade items (see our <Link to="/terms" className={A}>Terms &amp; Conditions</Link>).
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection title="Refunds" id="refunds">
        <LegalList>
          <li>Approved refunds are paid back to your original payment method through Razorpay.</li>
          <li>
            We start the refund once a cancellation is confirmed or a return is approved (after inspection, where
            the item is sent back). How long it takes to show in your account depends on your bank or payment
            provider.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection title="Need help?">
        <p>Message us — we&apos;re happy to help with any question about your order.</p>
        <LegalContact />
      </LegalSection>
    </LegalPage>
  );
}
