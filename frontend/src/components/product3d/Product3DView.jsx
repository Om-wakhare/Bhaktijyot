import { Suspense, lazy } from 'react';
import { Box } from 'lucide-react';
import { ErrorBoundary } from '../ErrorBoundary';
import { canRender3D } from './modelSpec';

// three.js + the viewer download only when a 3D view is actually shown
const ProductModelViewer = lazy(() => import('./ProductModelViewer'));

function Placeholder({ children }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-[inherit] bg-gradient-to-b from-ivory to-cream-100 p-6 text-center text-sm text-espresso/70">
      <Box className="h-6 w-6 text-espresso/40" aria-hidden="true" />
      {children}
    </div>
  );
}

/**
 * Lazy 3D preview with loading and "not supported" states.
 * Pass `spec` (from resolveModel) or a `product`.
 */
export function Product3DView({ product, spec, className = '', label }) {
  if (!canRender3D()) {
    return <Placeholder>3D preview isn&apos;t available on this device. The photos show the actual piece.</Placeholder>;
  }
  return (
    <ErrorBoundary fallback={<Placeholder>The 3D preview couldn&apos;t load. Please use the photos.</Placeholder>}>
      <Suspense
        fallback={
          <Placeholder>
            <span className="inline-block h-1.5 w-24 overflow-hidden rounded-full bg-espresso/10">
              <span className="block h-full w-1/2 animate-pulse rounded-full bg-gold-600/70" />
            </span>
            Loading 3D view…
          </Placeholder>
        }
      >
        <ProductModelViewer product={product} spec={spec} className={className} label={label} />
      </Suspense>
    </ErrorBoundary>
  );
}

/** One-line honesty note to show under a 3D preview. */
export function Product3DNote({ className = '' }) {
  return (
    <p className={`text-xs text-espresso/65 ${className}`}>
      3D preview is an illustration made from the product photos. The colour and pattern of the actual piece can differ.
    </p>
  );
}
