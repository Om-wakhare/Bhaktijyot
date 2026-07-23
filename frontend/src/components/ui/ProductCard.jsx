import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { mediaUrl } from '../../services/media';
import { useWishlist } from '../../services/wishlist';

/* ── Icon helpers ── */
function HeartIcon({ filled }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24"
         fill={filled ? 'currentColor' : 'none'}
         stroke="currentColor" strokeWidth="1.8"
         strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  );
}

function BagIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24"
         fill="none" stroke="currentColor" strokeWidth="2"
         strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
      <line x1="3" y1="6" x2="21" y2="6"/>
      <path d="M16 10a4 4 0 01-8 0"/>
    </svg>
  );
}

function LightningIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  );
}

function TruckIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24"
         fill="none" stroke="currentColor" strokeWidth="2"
         strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <rect x="1" y="3" width="15" height="13"/>
      <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
      <circle cx="5.5" cy="18.5" r="2.5"/>
      <circle cx="18.5" cy="18.5" r="2.5"/>
    </svg>
  );
}

const FOREST  = '#1D3D2C';
const FOREST_D = '#152C1F';
const BRASS   = '#C9A84C';
const BRASS_D = '#A8840A';
const SINDOOR = '#C02020';

const cardVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: (i) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.44, ease: 'easeOut', delay: i * 0.07 },
  }),
};

export function ProductCard({ product, index = 0, onAddToCart }) {
  const { toggle, has } = useWishlist();
  const wished = has(product.id);
  const [imgLoaded, setImgLoaded] = useState(false);

  const rawImage    = product.images?.[0]?.image_path || product.image_path;
  const image       = rawImage ? mediaUrl(rawImage) : null;
  const hasDiscount = product.mrp && Number(product.mrp) > Number(product.price);
  const discountPct = hasDiscount
    ? Math.round((1 - Number(product.price) / Number(product.mrp)) * 100)
    : 0;
  const isOOS      = product.stock === 0;
  const isLowStock = !isOOS && Number(product.stock) > 0 && Number(product.stock) <= 5;
  const rating     = Number(product.rating_avg ?? product.rating ?? 0);
  const ratingCount = product.rating_count ?? product.review_count ?? 0;

  return (
    <motion.div
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      className="group relative flex flex-col bj-card"
    >

      {/* ── Image block ── */}
      <Link to={`/products/${product.id}`} className="block" aria-label={product.name}>
        <div className="relative overflow-hidden bj-card-img">

          {/* Loading shimmer */}
          {!imgLoaded && image && <div className="absolute inset-0 shimmer-bg" />}

          {image ? (
            <img
              src={image}
              alt={product.name}
              onLoad={() => setImgLoaded(true)}
              className={`absolute inset-0 w-full h-full bj-img-zoom ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
              style={{ objectFit: 'cover', transition: 'opacity 0.3s, transform 0.45s ease' }}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-5xl" style={{ color: '#C9A84C', opacity: 0.12 }}>◈</span>
            </div>
          )}

          {/* Badge — sindoor pill, top-left */}
          {product.badge && (
            <span
              className="absolute top-2.5 left-2.5 z-10 px-2.5 py-1 text-[9px] font-black uppercase rounded-full"
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
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(product.id); }}
            aria-label={wished ? 'Remove from wishlist' : 'Add to wishlist'}
            aria-pressed={wished}
            className="absolute top-2 right-2 z-10 w-8 h-8 flex items-center justify-center rounded-full bj-wish-btn"
            style={{ color: wished ? '#F4E4D1' : '#8B6845' }}
          >
            <HeartIcon filled={wished} />
          </button>

          {/* Quick-add — slides up on card hover */}
          {!isOOS && (
            <div className="bj-quick-wrap">
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onAddToCart?.(product); }}
                className="bj-quick-btn"
                aria-label={`Quick add ${product.name} to cart`}
              >
                <BagIcon size={13} />
                Quick Add
              </button>
            </div>
          )}

          {/* Out-of-stock overlay */}
          {isOOS && (
            <div className="absolute inset-0 z-10 flex items-center justify-center"
                 style={{ background: 'rgba(253,250,245,0.80)' }}>
              <span className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase"
                    style={{ letterSpacing: '0.16em', background: '#1C1209', color: '#F4E4D1' }}>
                Out of Stock
              </span>
            </div>
          )}
        </div>
      </Link>

      {/* ── Info block ── */}
      <div className="flex flex-col flex-1" style={{ padding: '13px 13px 15px', gap: '8px' }}>

        {/* Name — clickable */}
        <Link to={`/products/${product.id}`}>
          <h3
            className="line-clamp-2 hover:underline"
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: '13.5px', fontWeight: 600,
              color: '#1C1209', lineHeight: 1.38,
            }}
          >
            {product.name}
          </h3>
        </Link>

        {/* Stars */}
        {rating > 0 && (
          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }, (_, i) => (
              <svg key={i} width="12" height="12" viewBox="0 0 12 12" style={{ flexShrink: 0 }}>
                <polygon
                  points="6,1 7.5,4.5 11,4.5 8.5,7 9.5,11 6,9 2.5,11 3.5,7 1,4.5 4.5,4.5"
                  fill={i < Math.round(rating) ? BRASS : '#D8C8A8'}
                />
              </svg>
            ))}
            {ratingCount > 0 && (
              <span className="ml-0.5" style={{ fontSize: '11px', color: '#9E8068' }}>
                {rating.toFixed(1)} ({ratingCount.toLocaleString('en-IN')})
              </span>
            )}
          </div>
        )}

        {/* Price */}
        <div className="flex items-baseline gap-1.5 flex-wrap" style={{ fontVariantNumeric: 'tabular-nums' }}>
          <span style={{ fontSize: '15px', fontWeight: 700, color: FOREST }}>
            ₹{Number(product.price ?? 0).toLocaleString('en-IN')}
          </span>
          {hasDiscount && (
            <>
              <span className="line-through" style={{ fontSize: '12px', color: '#9E8068' }}>
                ₹{Number(product.mrp).toLocaleString('en-IN')}
              </span>
              <span style={{
                fontSize: '10px', fontWeight: 700,
                padding: '2px 7px', borderRadius: '4px',
                background: '#E8F2EA', color: FOREST,
              }}>
                {discountPct}% off
              </span>
            </>
          )}
        </div>

        {/* Urgency / shipping micro-row */}
        <div className="flex items-center gap-2" style={{ minHeight: '16px' }}>
          {isLowStock && (
            <span className="flex items-center gap-1 font-semibold" style={{ fontSize: '11px', color: SINDOOR }}>
              <LightningIcon />
              Only {product.stock} left
            </span>
          )}
          {!isOOS && !isLowStock && (
            <span className="flex items-center gap-1 font-semibold" style={{ fontSize: '11px', color: BRASS_D }}>
              <TruckIcon />
              Free Shipping
            </span>
          )}
        </div>

        <div className="flex-1" />

        {/* CTA */}
        {!isOOS ? (
          onAddToCart ? (
            <button
              type="button"
              onClick={() => onAddToCart(product)}
              className="w-full flex items-center justify-center gap-2 bj-cta"
            >
              <BagIcon size={14} />
              Add to Cart
            </button>
          ) : (
            <Link
              to={`/products/${product.id}`}
              className="w-full flex items-center justify-center gap-2 bj-cta"
            >
              <BagIcon size={14} />
              View Product
            </Link>
          )
        ) : (
          <div
            className="w-full flex items-center justify-center"
            style={{
              padding: '10px', borderRadius: '7px',
              fontSize: '11px', fontWeight: 700,
              letterSpacing: '0.10em', textTransform: 'uppercase',
              background: 'rgba(28,18,9,0.06)', color: '#9E8068',
            }}
          >
            Out of Stock
          </div>
        )}
      </div>

    </motion.div>
  );
}
