import { Component } from 'react';

export class ErrorBoundary extends Component {
  constructor(p) { super(p); this.state = { err: false }; }
  static getDerivedStateFromError() { return { err: true }; }
  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info?.componentStack);
  }
  render() { return this.state.err ? (this.props.fallback ?? null) : this.props.children; }
}
