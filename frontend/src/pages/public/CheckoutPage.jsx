import { useCallback, useId, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Truck, ShieldCheck, Package, CircleAlert, LoaderCircle, RotateCw } from 'lucide-react';
import { useCart, formatINR } from '../../services/cart';
import api, { getErrorMessage } from '../../services/apiClient';
import { useWhatsAppNumber, whatsappLink } from '../../services/siteConfig';
import { mediaUrl } from '../../services/media';
import { WhatsAppIcon } from '../../components/ui/WhatsAppIcon';

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Jammu & Kashmir', 'Ladakh', 'Chandigarh', 'Puducherry',
  'Andaman & Nicobar', 'Dadra & Nagar Haveli', 'Lakshadweep',
];

const BRAND_GREEN = '#1D3D2C';
const RAZORPAY_SRC = 'https://checkout.razorpay.com/v1/checkout.js';

const EMPTY_FORM = {
  customer_name: '',
  customer_phone: '',
  customer_email: '',
  customer_address: '',
  customer_city: '',
  customer_state: '',
  customer_pincode: '',
  notes: '',
};

// Order in which fields appear — used to focus the first invalid one
const FIELD_ORDER = Object.keys(EMPTY_FORM);

/* ── Validation — mirrors the server rules (app/core/validators.py) ── */

/** 10-digit Indian mobile; accepts +91 / 91 / 0 prefixes and spaces. Returns null if invalid. */
function normalizeIndianMobile(value) {
  let digits = String(value || '').replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  return /^[6-9]\d{9}$/.test(digits) ? digits : null;
}

function validateField(name, raw) {
  const v = String(raw ?? '').trim();
  switch (name) {
    case 'customer_name':
      if (!v) return 'Please enter your full name.';
      if (v.length > 255) return 'Name must be at most 255 characters.';
      return '';
    case 'customer_phone':
      if (!v) return 'Please enter your mobile number.';
      return normalizeIndianMobile(v) ? '' : 'Enter a valid 10-digit Indian mobile number.';
    case 'customer_email':
      if (!v) return '';
      if (v.length > 255 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) return 'Enter a valid email address.';
      return '';
    case 'customer_address':
      if (!v) return 'Please enter your delivery address.';
      if (v.length > 1000) return 'Address must be at most 1000 characters.';
      return '';
    case 'customer_city':
      if (!v) return 'Please enter your city.';
      if (v.length > 100) return 'City must be at most 100 characters.';
      return '';
    case 'customer_state':
      return v ? '' : 'Please select your state.';
    case 'customer_pincode':
      if (!v) return 'Please enter your pincode.';
      return /^[1-9]\d{5}$/.test(v) ? '' : 'Enter a valid 6-digit pincode.';
    case 'notes':
      return v.length > 1000 ? 'Notes must be at most 1000 characters.' : '';
    default:
      return '';
  }
}

function validateAll(form) {
  const errors = {};
  FIELD_ORDER.forEach((name) => {
    const msg = validateField(name, form[name]);
    if (msg) errors[name] = msg;
  });
  return errors;
}

/** Map a FastAPI 422 response onto form fields (loc = ['body', '<field>', ...]). */
function fieldErrorsFrom422(err) {
  const detail = err?.response?.status === 422 ? err.response.data?.detail : null;
  if (!Array.isArray(detail)) return null;
  const errors = {};
  detail.forEach((d) => {
    const field = Array.isArray(d?.loc) ? d.loc[1] : null;
    if (field && field in EMPTY_FORM && !errors[field]) {
      const msg = String(d?.msg || '').replace(/^Value error,\s*/i, '');
      errors[field] = msg ? `${msg.charAt(0).toUpperCase()}${msg.slice(1)}` : 'Please check this field.';
    }
  });
  return Object.keys(errors).length ? errors : null;
}

/* ── Razorpay ── */

function loadRazorpayScript() {
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise((resolve) => {
    // Don't leave the customer waiting forever on a stalled network
    const timer = setTimeout(() => resolve(!!window.Razorpay), 15000);
    const done = (ok) => { clearTimeout(timer); resolve(ok); };
    let script = document.getElementById('razorpay-script');
    if (script && script.dataset.failed === 'true') {
      script.remove(); // a previous attempt failed — try a fresh tag
      script = null;
    }
    if (!script) {
      script = document.createElement('script');
      script.id = 'razorpay-script';
      script.src = RAZORPAY_SRC;
      script.async = true;
      document.body.appendChild(script);
    }
    script.addEventListener('load', () => done(!!window.Razorpay), { once: true });
    script.addEventListener('error', () => {
      script.dataset.failed = 'true';
      done(false);
    }, { once: true });
  });
}

/* ── Small presentational pieces ── */

const INPUT_BASE =
  'w-full rounded-xl border bg-cream-50 px-3.5 py-3 text-sm text-espresso placeholder:text-espresso/35 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-60';

function inputClass(hasError) {
  return `${INPUT_BASE} ${hasError ? 'border-red-400 bg-red-50/40' : 'border-espresso/15 hover:border-espresso/30'}`;
}

function Field({ id, label, required, hint, error, className = '', children }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-xs font-semibold text-espresso/80 mb-1.5">
        {label}
        {required ? <span className="text-red-600" aria-hidden="true"> *</span> : (
          <span className="font-normal text-espresso/45"> (optional)</span>
        )}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-xs font-medium text-red-700">{error}</p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-[11px] text-espresso/50">{hint}</p>
      ) : null}
    </div>
  );
}

function SectionHeading({ step, children }) {
  return (
    <h2 className="flex items-center gap-3 font-display text-xl font-semibold text-espresso">
      <span className="h-7 w-7 shrink-0 rounded-full bg-gold/15 border border-gold/50 text-gold-dark text-xs font-bold font-sans flex items-center justify-center" aria-hidden="true">
        {step}
      </span>
      {children}
    </h2>
  );
}

/* ── Page ── */

export function CheckoutPage() {
  const { items, totalAmount, totalItems, clearCart, hasPriceOnRequest } = useCart();
  const navigate = useNavigate();
  const whatsappNumber = useWhatsAppNumber();
  const uid = useId();
  const fid = (name) => `${uid}-${name}`;

  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [phase, setPhase] = useState('idle'); // idle | preparing | paying | verifying
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  // Set when Razorpay took the payment but our server couldn't confirm it
  const [paymentIssue, setPaymentIssue] = useState(null);
  const [retrying, setRetrying] = useState(false);
  const busyRef = useRef(false);
  const errorRef = useRef(null);

  const busy = phase !== 'idle';

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (touched[name] || fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    setFieldErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
  };

  const focusFirstError = (errors) => {
    const first = FIELD_ORDER.find((name) => errors[name]);
    if (first) {
      const el = document.getElementById(fid(first));
      el?.focus();
    }
  };

  const showError = (msg) => {
    setError(msg);
    requestAnimationFrame(() => errorRef.current?.focus());
  };

  const fieldProps = (name) => ({
    id: fid(name),
    name,
    value: form[name],
    onChange: handleChange,
    onBlur: handleBlur,
    disabled: busy,
    'aria-invalid': fieldErrors[name] ? 'true' : undefined,
    'aria-describedby': fieldErrors[name] ? `${fid(name)}-error` : undefined,
    className: inputClass(!!fieldErrors[name]),
  });

  /* Confirm the payment with our server. Returns true on success. */
  const verifyPayment = useCallback(async (response, order, phone) => {
    try {
      await api.post('/orders/verify-payment', {
        razorpay_order_id: response.razorpay_order_id,
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_signature: response.razorpay_signature,
      });
      clearCart();
      navigate(`/order-success?order_id=${order.id}`, {
        replace: true,
        state: { orderId: order.id, phone, total: order.total_amount },
      });
      return true;
    } catch (err) {
      setPaymentIssue({
        orderId: order.id,
        total: order.total_amount,
        phone,
        paymentId: response.razorpay_payment_id,
        response,
        order,
        message: getErrorMessage(err, 'We couldn’t confirm your payment with our server.'),
      });
      // The payment went through, so the order is placed — don't let the cart be paid twice.
      clearCart();
      return false;
    }
  }, [clearCart, navigate]);

  const handleRetryVerification = async () => {
    if (!paymentIssue || retrying) return;
    setRetrying(true);
    await verifyPayment(paymentIssue.response, paymentIssue.order, paymentIssue.phone);
    setRetrying(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (busyRef.current) return; // no double submits
    setError('');
    setNotice('');

    const errors = validateAll(form);
    setFieldErrors(errors);
    setTouched(Object.fromEntries(FIELD_ORDER.map((n) => [n, true])));
    if (Object.keys(errors).length) {
      focusFirstError(errors);
      return;
    }
    if (hasPriceOnRequest) {
      showError('Some items in your cart are price on request. Please remove them from your cart to pay online.');
      return;
    }

    busyRef.current = true;
    setPhase('preparing');
    const release = () => {
      busyRef.current = false;
      setPhase('idle');
    };

    const phone = normalizeIndianMobile(form.customer_phone);

    try {
      // 1. Payment gateway first — if it can't load, no order is created and no stock is reserved.
      let keyId;
      try {
        const keyRes = await api.get('/orders/razorpay-key');
        keyId = keyRes.data?.key_id;
      } catch (err) {
        showError(getErrorMessage(err, 'Online payment is unavailable right now. Please try again shortly.'));
        release();
        return;
      }
      if (!keyId) {
        showError('Online payment is unavailable right now. Please contact us on WhatsApp to place your order.');
        release();
        return;
      }
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        showError('Couldn’t load the payment window. Please check your internet connection and try again.');
        release();
        return;
      }

      // 2. Create the order (reserves stock)
      let order;
      try {
        const payload = {
          items: items.map((i) => ({ product_id: i.product_id, quantity: i.quantity })),
          customer_name: form.customer_name.trim(),
          customer_phone: phone,
          customer_email: form.customer_email.trim() || null,
          customer_address: form.customer_address.trim(),
          customer_city: form.customer_city.trim(),
          customer_state: form.customer_state.trim(),
          customer_pincode: form.customer_pincode.trim(),
          notes: form.notes.trim() || null,
        };
        const orderRes = await api.post('/orders/checkout', payload);
        order = orderRes.data;
      } catch (err) {
        release();
        const mapped = fieldErrorsFrom422(err);
        if (mapped) {
          setFieldErrors((prev) => ({ ...prev, ...mapped }));
          setError('Please correct the highlighted details.');
          // wait for the inputs to be re-enabled before moving focus
          requestAnimationFrame(() => focusFirstError(mapped));
        } else {
          showError(getErrorMessage(err, 'We couldn’t place your order. Please try again.'));
        }
        return;
      }

      // 3. Open Razorpay
      const abandon = () => {
        // Release the reserved stock now (fire-and-forget; unpaid orders are also
        // released automatically after 30 minutes).
        api.post('/orders/abandon', { razorpay_order_id: order.razorpay_order_id }).catch(() => {});
      };
      setPhase('paying');
      let rzp;
      try {
        rzp = new window.Razorpay({
          key: keyId,
          amount: Math.round(Number(order.total_amount) * 100),
          currency: 'INR',
          name: 'Bhaktijyot',
          description: `Order #${order.id}`,
          order_id: order.razorpay_order_id,
          prefill: {
            name: form.customer_name.trim(),
            email: form.customer_email.trim() || undefined,
            contact: phone ? `+91${phone}` : undefined,
          },
          notes: { order_id: String(order.id) },
          theme: { color: BRAND_GREEN },
          handler: async (response) => {
            setNotice('');
            setPhase('verifying');
            const ok = await verifyPayment(response, order, phone);
            if (!ok) release();
          },
          modal: {
            ondismiss: () => {
              // Customer closed the window without paying
              abandon();
              setNotice('Payment was cancelled. Your cart is saved — you can try again whenever you’re ready.');
              release();
            },
          },
        });
        rzp.on?.('payment.failed', (resp) => {
          const reason = resp?.error?.description;
          setNotice(reason ? `Payment failed: ${reason}. You can retry in the payment window or close it.` : '');
        });
        rzp.open();
      } catch (err) {
        abandon();
        showError('Couldn’t open the payment window. Please try again.');
        release();
      }
    } catch (err) {
      showError(getErrorMessage(err, 'Something went wrong. Please try again.'));
      release();
    }
  };

  /* ── Payment taken but not confirmed: persistent help panel ── */
  if (paymentIssue) {
    const waMessage =
      `Namaste! I paid for my Bhaktijyot order #${paymentIssue.orderId} but the confirmation didn't complete.\n` +
      `Razorpay payment ID: ${paymentIssue.paymentId || 'not shown'}` +
      (paymentIssue.phone ? `\nPhone: ${paymentIssue.phone}` : '');
    return (
      <div className="max-w-xl mx-auto px-4 sm:px-6 py-16">
        <div role="alert" className="bg-ivory border border-gold/40 rounded-2xl shadow-sm p-6 sm:p-8 space-y-5">
          <div className="h-14 w-14 rounded-full bg-gold/15 border border-gold/40 flex items-center justify-center">
            <ShieldCheck className="h-7 w-7 text-gold-dark" aria-hidden="true" />
          </div>
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-gold-dark">Payment received</p>
            <h1 className="font-display text-2xl sm:text-3xl font-semibold text-espresso">
              We&apos;re confirming your order
            </h1>
            <p className="text-sm text-espresso/75 leading-relaxed">
              Your payment went through, but we couldn&apos;t confirm it with our server just now.
              <strong className="font-semibold text-espresso"> Your money is safe</strong> — our system
              reconciles payments automatically and your order will be confirmed without you paying again.
            </p>
          </div>

          <dl className="grid grid-cols-2 gap-3 text-sm bg-cream-50 border border-espresso/10 rounded-xl p-4">
            <div>
              <dt className="text-xs text-espresso/55">Order ID</dt>
              <dd className="font-bold text-espresso">#{paymentIssue.orderId}</dd>
            </div>
            <div>
              <dt className="text-xs text-espresso/55">Amount</dt>
              <dd className="font-bold text-espresso">{formatINR(paymentIssue.total)}</dd>
            </div>
            {paymentIssue.paymentId && (
              <div className="col-span-2">
                <dt className="text-xs text-espresso/55">Payment ID</dt>
                <dd className="font-mono text-xs text-espresso break-all">{paymentIssue.paymentId}</dd>
              </div>
            )}
          </dl>

          <p className="text-xs text-espresso/55">Details: {paymentIssue.message}</p>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={handleRetryVerification}
              disabled={retrying}
              className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-primary text-cream text-sm font-semibold hover:bg-primary-dark disabled:opacity-60 transition-colors"
            >
              {retrying
                ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
                : <RotateCw className="h-4 w-4" aria-hidden="true" />}
              {retrying ? 'Checking…' : 'Retry verification'}
            </button>
            <a
              href={whatsappLink(whatsappNumber, waMessage)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-[#25D366] text-white text-sm font-semibold hover:bg-[#1ebe5d] transition-colors"
            >
              <WhatsAppIcon className="h-4 w-4" />
              Contact us on WhatsApp
            </a>
          </div>

          <Link
            to={`/track-order?order_id=${paymentIssue.orderId}${paymentIssue.phone ? `&phone=${paymentIssue.phone}` : ''}`}
            className="block text-center text-xs font-semibold text-primary hover:underline"
          >
            Track this order
          </Link>
        </div>
      </div>
    );
  }

  if (phase === 'verifying') {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center space-y-4" role="status" aria-live="polite">
        <LoaderCircle className="h-10 w-10 mx-auto text-primary animate-spin" aria-hidden="true" />
        <h1 className="font-display text-2xl font-semibold text-espresso">Confirming your payment…</h1>
        <p className="text-sm text-espresso/60">Please don&apos;t close this page.</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center space-y-4">
        <div className="h-16 w-16 rounded-full bg-ivory-300/60 mx-auto flex items-center justify-center">
          <Package className="h-8 w-8 text-gold-dark" aria-hidden="true" />
        </div>
        <h1 className="font-display text-3xl font-semibold text-espresso">Nothing to check out</h1>
        <p className="text-sm text-espresso/60">Your cart is empty.</p>
        <Link to="/products" className="inline-flex items-center px-6 py-3 rounded-full bg-primary text-cream text-sm font-semibold hover:bg-primary-dark transition-colors">
          Browse Products
        </Link>
      </div>
    );
  }

  const submitLabel =
    phase === 'preparing' ? 'Preparing secure payment…'
    : phase === 'paying' ? 'Complete payment in the Razorpay window…'
    : `Pay ${formatINR(totalAmount)}`;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      <div className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-gold-dark">Secure checkout</p>
        <h1 className="font-display text-3xl sm:text-4xl font-semibold text-espresso">Checkout</h1>
        <p className="text-sm text-espresso/60">
          {totalItems} item{totalItems === 1 ? '' : 's'} · <Link to="/cart" className="font-semibold text-primary hover:underline">Edit cart</Link>
        </p>
      </div>

      {error && (
        <div
          ref={errorRef}
          tabIndex={-1}
          role="alert"
          className="flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-800 text-sm rounded-xl px-4 py-3 focus:outline-none"
        >
          <CircleAlert className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}
      {notice && !error && (
        <div role="status" className="bg-gold/10 border border-gold/40 text-espresso text-sm rounded-xl px-4 py-3">
          {notice}
        </div>
      )}
      {hasPriceOnRequest && (
        <div role="alert" className="bg-amber-50 border border-amber-200 text-amber-700 text-sm rounded-xl px-4 py-3">
          Some items in your cart are price on request and can&apos;t be paid online.{' '}
          <Link to="/cart" className="font-semibold underline underline-offset-2">Review your cart</Link> to continue.
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate aria-busy={busy ? 'true' : undefined}>
        <div className="grid gap-6 lg:grid-cols-[1fr,380px] items-start">
          {/* Shipping Details */}
          <section className="bg-ivory border border-gold/30 rounded-2xl p-5 sm:p-6 shadow-sm space-y-5" aria-label="Shipping details">
            <SectionHeading step="1">Contact details</SectionHeading>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id={fid('customer_name')} label="Full name" required error={fieldErrors.customer_name} className="sm:col-span-2">
                <input {...fieldProps('customer_name')} type="text" autoComplete="name" maxLength={255} placeholder="Your full name" />
              </Field>
              <Field
                id={fid('customer_phone')}
                label="Mobile number"
                required
                error={fieldErrors.customer_phone}
                hint="10-digit Indian mobile — order updates are sent here."
              >
                <input
                  {...fieldProps('customer_phone')}
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  maxLength={16}
                  placeholder="98765 43210"
                  aria-describedby={fieldErrors.customer_phone ? `${fid('customer_phone')}-error` : `${fid('customer_phone')}-hint`}
                />
              </Field>
              <Field id={fid('customer_email')} label="Email" error={fieldErrors.customer_email}>
                <input {...fieldProps('customer_email')} type="email" inputMode="email" autoComplete="email" maxLength={255} placeholder="you@example.com" />
              </Field>
            </div>

            <div className="pt-2 border-t border-gold/20" />
            <SectionHeading step="2">Delivery address</SectionHeading>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field id={fid('customer_address')} label="Address" required error={fieldErrors.customer_address} className="sm:col-span-2">
                <textarea
                  {...fieldProps('customer_address')}
                  autoComplete="street-address"
                  rows={3}
                  maxLength={1000}
                  placeholder="House / flat, street, area, landmark"
                  className={`${inputClass(!!fieldErrors.customer_address)} resize-none`}
                />
              </Field>
              <Field id={fid('customer_city')} label="City" required error={fieldErrors.customer_city}>
                <input {...fieldProps('customer_city')} type="text" autoComplete="address-level2" maxLength={100} placeholder="City" />
              </Field>
              <Field id={fid('customer_state')} label="State" required error={fieldErrors.customer_state}>
                <select {...fieldProps('customer_state')} autoComplete="address-level1">
                  <option value="">Select state</option>
                  {INDIAN_STATES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </Field>
              <Field id={fid('customer_pincode')} label="Pincode" required error={fieldErrors.customer_pincode}>
                <input
                  {...fieldProps('customer_pincode')}
                  type="text"
                  inputMode="numeric"
                  autoComplete="postal-code"
                  maxLength={6}
                  placeholder="6-digit pincode"
                />
              </Field>
              <Field id={fid('notes')} label="Order notes" error={fieldErrors.notes}>
                <input {...fieldProps('notes')} type="text" maxLength={1000} placeholder="Any special instructions" />
              </Field>
            </div>
          </section>

          {/* Order Summary */}
          <aside
            aria-labelledby={`${uid}-summary`}
            className="bg-ivory border border-gold/30 rounded-2xl p-5 sm:p-6 shadow-sm lg:sticky lg:top-32 space-y-4"
          >
            <h2 id={`${uid}-summary`} className="font-display text-xl font-semibold text-espresso">Order Summary</h2>

            <ul className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {items.map((item) => (
                <li key={item.product_id} className="flex items-center gap-3 text-sm">
                  <div className="relative h-12 w-12 shrink-0 rounded-lg overflow-hidden bg-cream-200">
                    {item.image_path ? (
                      <img src={mediaUrl(item.image_path)} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Package className="h-5 w-5 m-3.5 text-espresso/25" aria-hidden="true" />
                    )}
                    <span className="absolute top-0 right-0 min-w-[18px] h-[18px] px-1 rounded-bl-lg bg-espresso text-cream text-[10px] font-bold flex items-center justify-center" aria-hidden="true">
                      {item.quantity}
                    </span>
                  </div>
                  <span className="flex-1 min-w-0 text-espresso/80 line-clamp-2">
                    {item.name}<span className="sr-only">, quantity {item.quantity}</span>
                  </span>
                  <span className="shrink-0 font-semibold text-espresso">
                    {item.price !== null ? formatINR(item.price * item.quantity) : 'On request'}
                  </span>
                </li>
              ))}
            </ul>

            <div className="space-y-2 text-sm border-t border-gold/30 pt-3">
              <div className="flex justify-between text-espresso/70">
                <span>Subtotal</span>
                <span>{formatINR(totalAmount)}</span>
              </div>
              <div className="flex justify-between text-espresso/70">
                <span className="inline-flex items-center gap-1.5">
                  <Truck className="h-3.5 w-3.5" aria-hidden="true" /> Shipping
                </span>
                <span className="font-semibold text-primary">Free</span>
              </div>
            </div>

            <div className="border-t border-gold/30 pt-3 flex justify-between items-baseline text-espresso">
              <span className="font-semibold">Total</span>
              <span className="font-display text-2xl font-bold">{formatINR(totalAmount)}</span>
            </div>

            <button
              type="submit"
              disabled={busy || hasPriceOnRequest}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-full bg-primary text-cream text-sm font-semibold shadow-sm hover:bg-primary-dark disabled:opacity-60 disabled:cursor-not-allowed transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-ivory"
            >
              {busy
                ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
                : <Lock className="h-4 w-4" aria-hidden="true" />}
              {submitLabel}
            </button>

            <div className="flex items-center justify-center gap-1.5 text-[11px] text-espresso/55">
              <ShieldCheck className="h-3.5 w-3.5 text-gold-dark" aria-hidden="true" />
              Secured by Razorpay. Your payment info is safe.
            </div>
          </aside>
        </div>
      </form>
    </div>
  );
}
