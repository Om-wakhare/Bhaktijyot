import { useEffect, useState, lazy, Suspense } from 'react';
import api from '../../services/apiClient';
import { useCart } from '../../services/cart';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { SocialProofBar } from '../../components/layout/SocialProofBar';
import { HeroSection } from '../../components/home/HeroSection';
import { ThreeWorldCards } from '../../components/home/ThreeWorldCards';
import { NewArrivals } from '../../components/home/NewArrivals';
import { DiscountsSection } from '../../components/home/DiscountsSection';
import { CertificateWhatsAppCTA } from '../../components/home/CertificateWhatsAppCTA';
import { ConsultExpertSection } from '../../components/home/ConsultExpertSection';
import { WhyBhaktijyot } from '../../components/home/WhyBhaktijyot';
import { CustomerReviews } from '../../components/home/CustomerReviews';
import { InstagramReels } from '../../components/home/InstagramReels';

const CrystalStorySection = lazy(() =>
  import('../../components/home/CrystalStorySection')
    .then(m => ({ default: m.CrystalStorySection }))
);

export function HomePage() {
  const [products, setProducts] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [siteConfig, setSiteConfig] = useState({});
  const [loading, setLoading] = useState(true);
  const { addItem } = useCart();

  useEffect(() => {
    async function load() {
      try {
        const [prodRes, reviewsRes, configRes] = await Promise.all([
          api.get('/products/catalog', { params: { sort: 'newest', page: 1, limit: 24 } }),
          api.get('/reviews/feed', { params: { limit: 12 } }).catch(() => ({ data: [] })),
          api.get('/site-config').catch(() => ({ data: {} })),
        ]);
        setProducts(prodRes.data?.items || prodRes.data || []);
        setReviews(reviewsRes.data?.items || reviewsRes.data || []);
        setSiteConfig(configRes.data || {});
      } catch {
        // silently degrade — individual API errors already caught above
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const whatsappNumber = siteConfig.whatsapp_number || '918484913170';

  return (
    <>
      <SocialProofBar />

      <HeroSection
        tagLabel={siteConfig.hero_tag_label}
        heading={siteConfig.hero_heading}
        subline={siteConfig.hero_subline}
        ctaText={siteConfig.hero_cta_text}
        ctaUrl={siteConfig.hero_cta_url}
        heroImage={siteConfig.hero_image}
        trustLine={siteConfig.hero_trust_line}
      />

      <ThreeWorldCards />

      <NewArrivals
        products={products}
        loading={loading}
        whatsappNumber={whatsappNumber}
        onAddToCart={addItem}
      />

      <ErrorBoundary fallback={null}>
        <Suspense fallback={null}>
          <CrystalStorySection />
        </Suspense>
      </ErrorBoundary>

      <DiscountsSection
        products={products}
        loading={loading}
        whatsappNumber={whatsappNumber}
        onAddToCart={addItem}
      />

      <ConsultExpertSection whatsappNumber={whatsappNumber} />

      <CertificateWhatsAppCTA whatsappNumber={whatsappNumber} />

      <WhyBhaktijyot />

      <CustomerReviews reviews={reviews} loading={loading} />

      <InstagramReels />
    </>
  );
}
