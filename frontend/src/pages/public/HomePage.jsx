import { lazy, Suspense } from 'react';
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

/**
 * Each section loads its own data (product strips, reviews, reels) and reads
 * site settings such as the WhatsApp number from the shared SiteConfigProvider,
 * so a slow or failing call only affects that one section.
 */
export function HomePage() {
  return (
    <>
      <SocialProofBar />

      <HeroSection />

      <ThreeWorldCards />

      <NewArrivals />

      <ErrorBoundary fallback={null}>
        <Suspense fallback={null}>
          <CrystalStorySection />
        </Suspense>
      </ErrorBoundary>

      <DiscountsSection />

      <ConsultExpertSection />

      <CertificateWhatsAppCTA />

      <WhyBhaktijyot />

      <CustomerReviews />

      <InstagramReels />
    </>
  );
}
