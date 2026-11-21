import { ProductMarquee } from './ProductMarquee';

// Module-level so the object identity is stable between renders
const NEW_ARRIVALS_PARAMS = { sort: 'newest', page: 1, limit: 12 };

export function NewArrivals() {
  return (
    <ProductMarquee
      id="new-arrivals"
      eyebrow="✦ Just In ✦"
      title="New Arrivals"
      viewAllTo="/products?sort=newest"
      viewAllLabel="View All"
      params={NEW_ARRIVALS_PARAMS}
    />
  );
}
