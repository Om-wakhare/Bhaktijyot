import { Component } from 'react';

/**
 * Catches render errors so one broken component can't blank the whole site.
 *
 * Props:
 *  - fallback:  node to render on error. Pass `null` explicitly to hide a
 *               non-essential section silently. Defaults to <DefaultFallback/>.
 *  - resetKey:  when this value changes (e.g. the route path) the boundary
 *               clears its error, so navigating away recovers the page.
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { err: false };
  }

  static getDerivedStateFromError() {
    return { err: true };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info?.componentStack);
  }

  componentDidUpdate(prevProps) {
    if (this.state.err && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ err: false });
    }
  }

  render() {
    if (!this.state.err) return this.props.children;
    if ('fallback' in this.props) return this.props.fallback;
    return <DefaultFallback />;
  }
}

function DefaultFallback() {
  return (
    <div role="alert" className="max-w-xl mx-auto px-6 py-24 text-center space-y-4">
      <h1 className="font-display text-2xl font-semibold text-espresso">Something went wrong</h1>
      <p className="text-sm text-espresso/70">
        This page couldn&apos;t be displayed. Please try again — if it keeps happening, contact us on WhatsApp.
      </p>
      <div className="flex justify-center gap-3">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="px-5 py-2.5 rounded-full bg-primary text-white text-sm font-semibold hover:bg-primary-dark transition-colors"
        >
          Reload page
        </button>
        <a
          href="/"
          className="px-5 py-2.5 rounded-full border border-espresso/20 text-espresso text-sm font-semibold hover:border-primary hover:text-primary transition-colors"
        >
          Go to home
        </a>
      </div>
    </div>
  );
}
