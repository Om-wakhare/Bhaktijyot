import { Link } from 'react-router-dom';
import flower from '../../assets/flower.webp';

export function NotFoundPage() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-6 px-4 py-16 text-center">
      <p aria-hidden="true" className="text-gold" style={{ fontSize: '4rem', lineHeight: 1 }}>◈</p>
      <div>
        <h1 className="font-display text-3xl font-bold text-espresso">
          Page Not Found
        </h1>
        <img
          src={flower}
          alt=""
          className="mx-auto mt-1 w-full max-w-[180px]"
          style={{ mixBlendMode: 'multiply' }}
        />
      </div>
      <p className="text-espresso/70 max-w-md">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-primary text-cream text-sm font-bold uppercase tracking-widest hover:bg-primary-dark transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2"
        >
          Back to Home
        </Link>
        <Link
          to="/products"
          className="inline-flex items-center gap-2 px-8 py-3 rounded-full border border-espresso/20 text-espresso text-sm font-bold uppercase tracking-widest hover:border-primary hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2"
        >
          Shop Products
        </Link>
      </div>
    </div>
  );
}
