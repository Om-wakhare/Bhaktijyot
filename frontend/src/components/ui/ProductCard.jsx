import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { mediaUrl } from '../../services/media';
import { useWishlist } from '../../services/wishlist';
import { useCart, validPrice, normalizeStock, primaryImagePath } from '../../services/cart';
import { useWhatsAppNumber, whatsappLink } from '../../services/siteConfig';
import { WhatsAppIcon } from './WhatsAppIcon';

/* ── Icon helpers ── */
function HeartIcon({ filled }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24"
         fill={filled ? 'currentColor' : 'none'}
         stroke="currentColor" strokeWidth="1.8"
         strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  );
}

function BagIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24"
         fill="none" stroke="currentColor" strokeWidth="2"
         strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}
         aria-hidden="true" focusable="false">
      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
      <line x1="3" y1="6" x2="21" y2="6"/>
      <path d="M16 10a4 4 0 01-8 0"/>
    </svg>
  );
}

function CheckIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24"
         fill="none" stroke="currentColor" strokeWidth="2.4"
         strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}
         aria-hidden="true" focusable="false">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function LightningIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}
         aria-hidden="true" focusable="false">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  );
}

const BRASS   = '#C9A84C';
const SINDOOR = '#C02020';

const cardVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: (i) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.44, ease: [0, 0, 0.58, 1], delay: Math.min(i, 8) * 0.07 },
  }),
};

/**
 * Storefront product card. Handles add-to-cart itself (via useCart), so extra props such as
 * `onAddToCart` or `whatsappNumber` passed by older callers are accepted and ignored.
 *
 * Markup: the image and the title are links; the wishlist and cart buttons are siblings of
 * those links (never nested inside them).
 */
export function ProductCard({ product, index = 0 }) {
  const { toggle, has } = useWishlist();
  const { addItem } = useCart();
  const whatsappNumber = useWhatsAppNumber();
  const reduceMotion = useReducedMotion();
  const wished = has(product.id);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const [feedback, setFeedback] = useState(null); // 'added' | 'max' | null
  const feedbackTimer = useRef(null);

  useEffect(() => () => clearTimeout(feedbackTimer.current), []);

  const href        = `/products/${product.id}`;
  const rawImage    = primaryImagePath(product);
  const image       = rawImage && !imgFailed ? mediaUrl(rawImage) : null;
  const price       = validPrice(product.price);
  const mrp         = validPrice(product.mrp);
  const hasDiscount = price !== null && mrp !== null && mrp > price;
  const discountPct = hasDiscount ? Math.round((1 - price / mrp) * 100) : 0;
  const stock       = normalizeStock(product.stock);
  const isOOS       = stock === 0;
  const isLowStock  = stock > 0 && stock <= 5;
  const onRequest   = price === null;
  const canBuy      = !onRequest && !isOOS;
  const rating      = Number(product.rating_avg ?? product.rating ?? 0);
  const ratingCount = Number(product.rating_count ?? product.review_count ?? 0);

  const handleAdd = () => {
    const ok = addItem(product, 1);
    setFeedback(ok ? 'added' : 'max');
    clearTimeout(feedbackTimer.current);
    feedbackTimer.current = setTimeout(() => setFeedback(null), 1800);
  };

  const enquireHref = whatsappLink(
    whatsappNumber,
    `Namaste! I'd like to know the price of "${product.name}" from Bhaktijyot.\n${window.location.origin}${href}`,
  );

  const addLabel = feedback === 'added' ? 'Added' : feedback === 'max' ? 'Max in cart' : null;

  return (
    <motion.div
      custom={index}
      variants={cardVariants}
      initial={reduceMotion ? false : 'hidden'}
      animate="visible"
      className="group relative flex flex-col bj-card"
    >

      {/* ── Image block ── */}
      <div className="relative overflow-hidden bj-card-img">
        {/* Image link — a duplicate of the title link, so it's skipped by keyboard / screen readers */}
        <Link to={href} className="absolute inset-0 block" tabIndex={-1} aria-hidden="true">
          {/* Loading shimmer */}
          {!imgLoaded && image && <div className="absolute inset-0 shimmer-bg" />}

          {image ? (
            <img
              src={image}
              alt=""
              loading="lazy"
              decoding="async"
              onLoad={() => setImgLoaded(true)}
              onError={() => setImgFailed(true)}
              className={`absolute inset-0 w-full h-full bj-img-zoom ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
              style={{ objectFit: 'cover', transition: 'opacity 0.3s, transform 0.45s ease' }}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-5xl" style={{ color: BRASS, opacity: 0.12 }}>◈</span>
            </div>
          )}

          {/* Out-of-stock overlay */}
          {isOOS && (
            <div className="absolute inset-0 z-[1] flex items-center justify-center bg-cream-50/80">
              <span className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase bg-espresso text-cream"
                    style={{ letterSpacing: '0.16em' }}>
                Out of Stock
              </span>
            </div>
          )}
        </Link>

        {/* Badge — sindoor pill, top-left */}
        {product.badge && (
          <span
            className="absolute top-2.5 left-2.5 z-10 px-2.5 py-1 text-[9px] font-black uppercase rounded-full pointer-events-none"
            style={{
              background: 'linear-gradient(135deg, #5A1010, #9A1818)',
              color: '#FFF8F0',
              letterSpacing: '0.12em',
            }}
          >
            {product.badge}
          </span>
        )}

        {/* Wishlist — top-right */}
        <button
          type="button"
          onClick={() => toggle(product.id)}
          aria-label={`Save ${product.name} to wishlist`}
          aria-pressed={wished}
          className="absolute top-2 right-2 z-10 w-8 h-8 flex items-center justify-center rounded-full bj-wish-btn"
          style={{ color: wished ? '#F4E4D1' : '#8B6845' }}
        >
          <HeartIcon filled={wished} />
        </button>

        {/* Quick-add — slides up on card hover (pointer devices only, see .bj-quick-wrap) */}
        {canBuy && (
          <div className="bj-quick-wrap">
            <button
              type="button"
              onClick={handleAdd}
              className="bj-quick-btn"
              aria-label={`Quick add ${product.name} to cart`}
            >
              {feedback === 'added' ? <CheckIcon size={13} /> : <BagIcon size={13} />}
              {addLabel || 'Quick Add'}
            </button>
          </div>
        )}
      </div>

      {/* ── Info block ── */}
      <div className="flex flex-col flex-1" style={{ padding: '13px 13px 15px', gap: '8px' }}>

        {/* Name — the card's main link */}
        <h3
          className="line-clamp-2 text-espresso"
          style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontSize: '13.5px', fontWeight: 600,
            lineHeight: 1.38,
          }}
        >
          <Link to={href} className="hover:underline focus-visible:underline">
            {product.name}
          </Link>
        </h3>

        {/* Stars */}
        {rating > 0 && (
          <div className="flex items-center gap-1">
            <span role="img" aria-label={`Rated ${rating.toFixed(1)} out of 5`} className="flex items-center gap-1">
              {Array.from({ length: 5 }, (_, i) => (
                <svg key={i} width="12" height="12" viewBox="0 0 12 12" style={{ flexShrink: 0 }} aria-hidden="true">
                  <polygon
                    points="6,1 7.5,4.5 11,4.5 8.5,7 9.5,11 6,9 2.5,11 3.5,7 1,4.5 4.5,4.5"
                    fill={i < Math.round(rating) ? BRASS : '#D8C8A8'}
                  />
                </svg>
              ))}
            </span>
            {ratingCount > 0 && (
              <span className="ml-0.5 text-espresso/70" style={{ fontSize: '11px' }}>
                {rating.toFixed(1)} ({ratingCount.toLocaleString('en-IN')})
              </span>
            )}
          </div>
        )}

        {/* Price */}
        {onRequest ? (
          <div className="text-primary" style={{ fontSize: '13px', fontWeight: 700 }}>
            Price on request
          </div>
        ) : (
          <div className="flex items-baseline gap-1.5 flex-wrap" style={{ fontVariantNumeric: 'tabular-nums' }}>
            <span className="text-primary" style={{ fontSize: '15px', fontWeight: 700 }}>
              ₹{price.toLocaleString('en-IN')}
            </span>
            {hasDiscount && (
              <>
                <span className="line-through text-espresso/70" style={{ fontSize: '12px' }}>
                  <span className="sr-only">MRP </span>₹{mrp.toLocaleString('en-IN')}
                </span>
                <span className="bg-primary-50 text-primary" style={{
                  fontSize: '10px', fontWeight: 700,
                  padding: '2px 7px', borderRadius: '4px',
                }}>
                  {discountPct}% off
                </span>
              </>
            )}
          </div>
        )}

        {/* Low-stock note (only when the stock is tracked and low) */}
        {canBuy && isLowStock && (
          <span className="flex items-center gap-1 font-semibold" style={{ fontSize: '11px', color: SINDOOR }}>
            <LightningIcon />
            Only {stock} left
          </span>
        )}

        <div className="flex-1" />

        {/* CTA */}
        {canBuy ? (
          <button
            type="button"
            onClick={handleAdd}
            className="w-full flex items-center justify-center gap-2 bj-cta"
            aria-label={`Add ${product.name} to cart`}
          >
            {feedback === 'added' ? <CheckIcon size={14} /> : <BagIcon size={14} />}
            {addLabel || 'Add to Cart'}
          </button>
        ) : onRequest && !isOOS ? (
          <a
            href={enquireHref}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 bj-cta"
            aria-label={`Enquire about ${product.name} on WhatsApp`}
          >
            <WhatsAppIcon className="h-3.5 w-3.5" />
            Enquire on WhatsApp
          </a>
        ) : (
          <div
            className="w-full flex items-center justify-center bg-espresso/6 text-espresso/70"
            style={{
              padding: '10px', borderRadius: '7px',
              fontSize: '11px', fontWeight: 700,
              letterSpacing: '0.10em', textTransform: 'uppercase',
            }}
          >
            Out of Stock
          </div>
        )}

        {/* Announce cart feedback to screen readers */}
        <span className="sr-only" aria-live="polite">
          {feedback === 'added'
            ? `${product.name} added to cart`
            : feedback === 'max'
            ? `You already have the maximum quantity of ${product.name} in your cart`
            : ''}
        </span>
      </div>

    </motion.div>
  );
}
