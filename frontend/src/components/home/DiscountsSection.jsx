import { ProductMarquee } from './ProductMarquee';

// Module-level so the object identity is stable between renders.
// on_sale=true → only products whose MRP is above the selling price.
const DISCOUNT_PARAMS = { on_sale: true, sort: 'newest', limit: 24 };

/** "Discounts & Deals" strip — hidden entirely when nothing is on sale. */
export function DiscountsSection() {
  return (
    <ProductMarquee
      id="discounts"
      eyebrow="✦ Special Offers ✦"
      title="Discounts & Deals"
      viewAllTo="/products?on_sale=true"
      viewAllLabel="Shop All"
      params={DISCOUNT_PARAMS}
      maxItems={24}
      showSkeleton={false}
    />
  );
}
