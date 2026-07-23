import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-6 px-4 text-center">
      <p style={{ fontSize: '4rem', lineHeight: 1 }}>◈</p>
      <h1 className="font-display text-3xl font-bold" style={{ color: '#1C1209' }}>
        Page Not Found
      </h1>
      <p style={{ color: 'rgba(28,18,9,0.55)', maxWidth: '28rem' }}>
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link
        to="/"
        className="inline-flex items-center gap-2 px-8 py-3 rounded-full text-sm font-bold uppercase tracking-widest"
        style={{ background: '#1D3D2C', color: '#F4E4D1' }}
      >
        Back to Home
      </Link>
    </div>
  );
}
