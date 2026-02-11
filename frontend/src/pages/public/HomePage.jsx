import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/apiClient';
import { mediaUrl } from '../../services/media';
import heroImage from '../../assets/hero-bhaktijyot.svg';
import tileGemstones from '../../assets/tile-gemstones.svg';
import tileRudraksha from '../../assets/tile-rudraksha.svg';
import tilePuja from '../../assets/tile-puja.svg';

const WHATSAPP_NUMBER = '918484913170';

function TrustItem({ title, desc }) {
  return (
    <div className="flex items-start gap-3">
      <div className="h-10 w-10 rounded-full bg-primary-light/60 border border-primary/20 flex items-center justify-center text-primary-dark font-bold">
        ✦
      </div>
      <div>
        <div className="text-sm font-semibold text-gray-900">{title}</div>
        <div className="text-xs text-gray-600">{desc}</div>
      </div>
    </div>
  );
}

function ProductCard({ p }) {
  const hasDiscount = p?.mrp && p?.price && Number(p.mrp) > Number(p.price);
  const discountPct = hasDiscount ? Math.round(((Number(p.mrp) - Number(p.price)) / Number(p.mrp)) * 100) : 0;
  return (
    <Link
      to={`/products/${p.id}`}
      className="min-w-[220px] max-w-[220px] bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="h-40 bg-gray-100 relative">
        {p.image_path ? (
          <img src={mediaUrl(p.image_path)} alt={p.name} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-xs text-gray-400">No image</div>
        )}
        {hasDiscount && (
          <div className="absolute top-2 left-2 bg-accent text-white text-[11px] font-bold px-2 py-1 rounded-full">
            {discountPct}% OFF
          </div>
        )}
      </div>
      <div className="p-3 space-y-1">
        <div className="text-sm font-semibold text-gray-900 line-clamp-2">{p.name}</div>
        <div className="flex items-center gap-2">
          {p.price !== null && p.price !== undefined && (
            <div className="text-sm font-bold text-primary-dark">₹ {Number(p.price).toLocaleString('en-IN')}</div>
          )}
          {hasDiscount && (
            <div className="text-xs text-gray-500 line-through">₹ {Number(p.mrp).toLocaleString('en-IN')}</div>
          )}
        </div>
        {p.rating_count > 0 && (
          <div className="text-xs text-gray-600">
            <span className="text-primary-dark">★</span> {Number(p.rating_avg ?? 0).toFixed(1)} ({p.rating_count})
          </div>
        )}
      </div>
    </Link>
  );
}

function HorizontalRow({ children }) {
  return (
    <div className="-mx-4 sm:mx-0">
      <div className="px-4 sm:px-0 flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory">
        {children}
      </div>
    </div>
  );
}

function ReviewCard({ r }) {
  return (
    <div className="min-w-[260px] max-w-[260px] bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <div className="text-primary-dark">{'★'.repeat(r.rating)}</div>
        {r.is_verified_offline && (
          <span className="text-[10px] font-bold uppercase tracking-wide bg-primary-light/40 text-primary-dark px-2 py-1 rounded-full">
            Verified
          </span>
        )}
      </div>
      <div className="mt-2 text-sm font-semibold text-gray-900 line-clamp-1">{r.title || r.product_name}</div>
      <div className="mt-1 text-xs text-gray-600 line-clamp-3">{r.comment}</div>
      <div className="mt-3 flex items-center gap-2">
        {r.product_image_path ? (
          <img src={mediaUrl(r.product_image_path)} alt="Product" className="h-10 w-10 rounded-md object-cover border border-gray-200" loading="lazy" />
        ) : (
          <div className="h-10 w-10 rounded-md bg-gray-100 border border-gray-200" />
        )}
        <div className="min-w-0">
          <div className="text-xs font-semibold text-gray-900 truncate">{r.product_name}</div>
          <div className="text-[11px] text-gray-500">— {r.reviewer_name}</div>
        </div>
      </div>
    </div>
  );
}

function SectionHeading({ eyebrow, title, subtitle }) {
  return (
    <div className="text-center max-w-2xl mx-auto">
      {eyebrow && (
        <div className="text-xs font-semibold tracking-widest text-primary-dark uppercase">{eyebrow}</div>
      )}
      <h2 className="mt-2 text-2xl sm:text-3xl font-display font-semibold tracking-wide text-gray-900">
        {title}
      </h2>
      {subtitle && <p className="mt-2 text-sm text-gray-600">{subtitle}</p>}
    </div>
  );
}

export function HomePage() {
  const [newArrivals, setNewArrivals] = useState([]);
  const [reviewsFeed, setReviewsFeed] = useState([]);
  const [loadingDynamic, setLoadingDynamic] = useState(true);

  useEffect(() => {
    const loadDynamic = async () => {
      setLoadingDynamic(true);
      try {
        const [prodRes, reviewsRes] = await Promise.all([
          api.get('/products/catalog', { params: { sort: 'newest', page: 1, limit: 24 } }),
          api.get('/reviews/feed', { params: { limit: 12 } }),
        ]);
        setNewArrivals(prodRes.data.items || []);
        setReviewsFeed(reviewsRes.data.items || []);
      } finally {
        setLoadingDynamic(false);
      }
    };
    loadDynamic();
  }, []);

  const discounted = useMemo(() => {
    return (newArrivals || []).filter((p) => p?.mrp && p?.price && Number(p.mrp) > Number(p.price)).slice(0, 12);
  }, [newArrivals]);

  return (
    <div className="space-y-14">
      <section className="rounded-3xl overflow-hidden border border-gray-200 bg-white shadow-sm">
        <div className="grid lg:grid-cols-[1.05fr,0.95fr]">
          <div className="p-7 sm:p-10 lg:p-12 bg-gradient-to-br from-white via-white to-primary-light/20">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary-light/20 px-3 py-1 text-[11px] font-semibold text-primary-dark">
              <span className="font-display">40+ years</span>
              <span className="text-gray-700">trusted by families</span>
            </div>

            <h1 className="mt-4 text-3xl sm:text-5xl font-display font-semibold tracking-wide text-gray-900">
              Authentic gemstones & sacred essentials
            </h1>
            <p className="mt-4 text-sm sm:text-base text-gray-700 max-w-xl">
              Bhaktijyot brings you certified gemstone reports and devotional products for daily worship. Shop our
              curated collection and verify your certificate online anytime.
            </p>

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <Link
                to="/products"
                className="inline-flex justify-center items-center px-6 py-3 rounded-full bg-primary text-white font-semibold text-sm shadow hover:bg-primary-dark"
              >
                Discover our range
              </Link>
              <Link
                to="/verify"
                className="inline-flex justify-center items-center px-6 py-3 rounded-full border border-gray-300 bg-white text-gray-900 font-semibold text-sm hover:border-primary"
              >
                Verify certificate
              </Link>
              <a
                href={`https://wa.me/${WHATSAPP_NUMBER}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex justify-center items-center px-6 py-3 rounded-full bg-green-500 text-white font-semibold text-sm shadow hover:bg-green-600"
              >
                Order on WhatsApp
              </a>
            </div>

            <div className="mt-8 grid gap-5 sm:grid-cols-3">
              <TrustItem
                title="Lab-style reports"
                desc="Image certificate generation & online verification."
              />
              <TrustItem
                title="Offline friendly"
                desc="Perfect for walk-in customers and local orders."
              />
              <TrustItem
                title="Quick support"
                desc="Fast ordering via WhatsApp for any product."
              />
            </div>
          </div>

          <div className="relative bg-gradient-to-b from-primary-light/15 to-white flex items-end">
            <img
              src={heroImage}
              alt="Bhaktijyot hero"
              className="w-full h-[320px] sm:h-[420px] lg:h-full object-cover"
              loading="lazy"
            />
            <div className="absolute inset-x-4 bottom-4 sm:inset-x-6 sm:bottom-6">
              <div className="rounded-2xl bg-white/90 backdrop-blur border border-gray-200 p-4 shadow-sm">
                <div className="text-xs font-semibold text-gray-600">Customer love</div>
                <div className="mt-1 flex items-center gap-2">
                  <div className="text-primary-dark">★★★★★</div>
                  <div className="text-xs text-gray-700">Growing reviews from our 40-year community</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <SectionHeading
          eyebrow="New"
          title="New arrivals"
          subtitle="Freshly added products from Bhaktijyot."
        />
        {loadingDynamic ? (
          <div className="text-sm text-gray-500">Loading new arrivals...</div>
        ) : newArrivals.length === 0 ? (
          <div className="text-sm text-gray-500">No products yet. Add products from admin.</div>
        ) : (
          <HorizontalRow>
            {newArrivals.slice(0, 12).map((p) => (
              <div key={p.id} className="snap-start">
                <ProductCard p={p} />
              </div>
            ))}
          </HorizontalRow>
        )}
      </section>

      <section className="space-y-6">
        <SectionHeading
          eyebrow="Deals"
          title="Discounts & offers"
          subtitle="Best value picks (MRP vs sale price)."
        />
        {loadingDynamic ? (
          <div className="text-sm text-gray-500">Loading offers...</div>
        ) : discounted.length === 0 ? (
          <div className="text-sm text-gray-500">No discounted products yet. Add MRP higher than price in admin.</div>
        ) : (
          <HorizontalRow>
            {discounted.map((p) => (
              <div key={p.id} className="snap-start">
                <ProductCard p={p} />
              </div>
            ))}
          </HorizontalRow>
        )}
      </section>

      <section className="space-y-6">
        <SectionHeading
          eyebrow="Reviews"
          title="What customers say"
          subtitle="Recent approved reviews from our community."
        />
        {loadingDynamic ? (
          <div className="text-sm text-gray-500">Loading reviews...</div>
        ) : reviewsFeed.length === 0 ? (
          <div className="text-sm text-gray-500">No reviews yet. Submit a review from a product page.</div>
        ) : (
          <HorizontalRow>
            {reviewsFeed.map((r) => (
              <div key={r.id} className="snap-start">
                <ReviewCard r={r} />
              </div>
            ))}
          </HorizontalRow>
        )}
      </section>

      <section className="bg-amber-50 border border-amber-100 rounded-2xl p-4 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="text-sm text-gray-800">
          <span className="font-semibold">Need guidance?</span> Talk to us on WhatsApp for product suggestions & gemstone report queries.
        </div>
        <a
          href={`https://wa.me/${WHATSAPP_NUMBER}`}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 px-5 py-2.5 rounded-full bg-green-500 text-white text-sm font-semibold hover:bg-green-600"
        >
          Chat on WhatsApp
        </a>
      </section>

      <section className="space-y-6">
        <SectionHeading
          eyebrow="Shop"
          title="Shop by category"
          subtitle="Religious goods, gemstones, and sacred essentials for your daily practice."
        />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            to="/products"
            className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow"
          >
            <img src={tileGemstones} alt="Gemstones" className="h-52 w-full object-cover" loading="lazy" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
            <div className="absolute inset-x-4 bottom-4">
              <div className="text-white text-lg font-display font-semibold tracking-wide">Gemstones</div>
              <div className="text-white/85 text-xs">Certified stones & lab-style reports</div>
              <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-gray-900">
                Explore
                <span className="text-primary">›</span>
              </div>
            </div>
          </Link>

          <Link
            to="/products"
            className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow"
          >
            <img src={tileRudraksha} alt="Rudraksha" className="h-52 w-full object-cover" loading="lazy" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
            <div className="absolute inset-x-4 bottom-4">
              <div className="text-white text-lg font-display font-semibold tracking-wide">Rudraksha & Malas</div>
              <div className="text-white/85 text-xs">For japa, meditation & protection</div>
              <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-gray-900">
                Explore
                <span className="text-primary">›</span>
              </div>
            </div>
          </Link>

          <Link
            to="/products"
            className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow"
          >
            <img src={tilePuja} alt="Puja items" className="h-52 w-full object-cover" loading="lazy" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
            <div className="absolute inset-x-4 bottom-4">
              <div className="text-white text-lg font-display font-semibold tracking-wide">Puja Essentials</div>
              <div className="text-white/85 text-xs">Daily worship items & spiritual remedies</div>
              <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-gray-900">
                Explore
                <span className="text-primary">›</span>
              </div>
            </div>
          </Link>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 shadow-sm">
          <div className="text-xs font-semibold text-primary-dark">Certificate verification</div>
          <div className="mt-2 text-2xl font-display font-semibold text-gray-900">Verify your gemstone report online</div>
          <p className="mt-2 text-sm text-gray-600">
            Enter your certificate code and instantly verify authenticity. Download the certificate image anytime.
          </p>
          <Link
            to="/verify"
            className="mt-4 inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-primary text-white text-sm font-semibold hover:bg-primary-dark"
          >
            Verify certificate
          </Link>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 shadow-sm">
          <div className="text-xs font-semibold text-primary-dark">Quick ordering</div>
          <div className="mt-2 text-2xl font-display font-semibold text-gray-900">Order quickly on WhatsApp</div>
          <p className="mt-2 text-sm text-gray-600">
            Share product links with us and get guidance for selection, pricing, and availability.
          </p>
          <a
            href={`https://wa.me/${WHATSAPP_NUMBER}`}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-green-500 text-white text-sm font-semibold hover:bg-green-600"
          >
            WhatsApp order
          </a>
        </div>
      </section>

      <section className="rounded-2xl bg-gray-900 text-gray-50 p-6 sm:p-10">
        <div className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr] items-center">
          <div>
            <div className="text-xs font-semibold tracking-widest text-primary-light uppercase">Why Bhaktijyot</div>
            <div className="mt-2 text-2xl sm:text-3xl font-display font-semibold">A traditional shop built on trust</div>
            <p className="mt-3 text-sm text-gray-300">
              We serve a community that values authenticity. From gemstones to devotional products, each item is curated
              with care.
            </p>
          </div>
          <div className="grid gap-3">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm font-semibold">Store-to-screen experience</div>
              <div className="text-xs text-gray-300 mt-1">Same guidance, now online with WhatsApp support.</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm font-semibold">Certificate-backed reports</div>
              <div className="text-xs text-gray-300 mt-1">Generate, verify, and download reports easily.</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

