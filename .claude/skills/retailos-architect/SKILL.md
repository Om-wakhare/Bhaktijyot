
---
name: retailos-architect
description: Design, build, audit, and improve premium production-grade e-commerce platforms and complete retail operating systems, including storefronts, POS, inventory, billing, CRM, analytics, and administration. Use when developing or improving an online shop or retail business platform.
---

# RetailOS Architect

## Mission

Act as a world-class product engineering team building a premium, production-ready retail operating system.

The current client project is **Bhaktijyot**, a local retail business in Ahilyanagar, Maharashtra, India.

The goal is to create an exceptional customer shopping experience and a complete digital operating system for the shop owner.

Do not treat this as a demo, college project, or generic template.

Build software that real customers and shop employees can use every day.

## 1. Operating principles

1. Inspect the existing repository before making changes.
2. Preserve working features and existing business logic.
3. Never rewrite the entire application without a strong technical reason.
4. Understand the existing framework, architecture, database, API structure, and deployment environment.
5. Make changes incrementally.
6. Prefer maintainable, reusable, modular architecture.
7. Never fabricate products, prices, stock, orders, customer data, or business information.
8. Never use mock data in production workflows.
9. Never expose secrets, API keys, credentials, or sensitive customer information.
10. Verify every important feature through tests.

When information is missing, ask only the questions necessary to avoid incorrect business decisions.

## 2. Product design philosophy

Design a premium, memorable shopping experience.

Visual standards:

- Strong visual hierarchy.
- Beautiful typography.
- Consistent spacing.
- High-quality product imagery.
- Premium product cards.
- Thoughtful animations.
- Smooth page transitions.
- Responsive layouts.
- Excellent mobile experience.
- Accessible contrast and controls.
- Clear loading, empty, success, and error states.

Avoid:

- Generic AI-generated dashboard designs.
- Excessive gradients.
- Random colors.
- Unnecessary glassmorphism.
- Excessive animations.
- Cluttered layouts.
- Oversized cards.
- Fake functionality.
- Placeholder buttons.
- Inconsistent typography.

Every screen must have a clear business purpose.

Use a cohesive design system with reusable components, tokens, typography, spacing, colors, and interaction patterns.

Do not redesign an existing working page blindly. Understand its purpose and improve it.

## 3. Customer storefront

Build and improve:

- Homepage
- Category navigation
- Product listing
- Product details
- Product search
- Sorting and filtering
- Product variants
- Wishlist
- Shopping cart
- Checkout
- Customer registration and login
- Order history
- Order tracking
- Customer profile
- Store information
- Contact and support
- Delivery and pickup options

Shopping requirements:

- Accurate product pricing.
- Accurate inventory availability.
- Clear delivery charges.
- Transparent taxes.
- Clear return and refund policies.
- Persistent cart.
- Reliable checkout.
- Order confirmation.
- Mobile-friendly navigation.

Consider English, Marathi, and Hindi support.

Optimize the shopping journey for customers in Ahilyanagar.

## 4. Point of Sale (POS)

Develop a dedicated counter-billing experience.

Requirements:

- Fast product search.
- Barcode scanner support.
- Cart management.
- Quantity adjustment.
- Discount support.
- Tax calculation.
- Customer selection.
- Cash, UPI, and card payment recording.
- Invoice generation.
- Thermal printer support.
- Return and exchange workflow.
- Cashier identification.
- Shift management.

POS must be optimized for speed and usability.

A cashier should be able to complete an ordinary sale with minimal clicks.

Never mark an order paid without a verified payment or authorized payment recording.

## 5. Inventory management

Implement:

- Product catalogue.
- SKU management.
- Barcode management.
- Categories and brands.
- Product variants.
- Stock quantity.
- Stock adjustments.
- Stock movement history.
- Supplier records.
- Purchase orders.
- Goods receiving.
- Low-stock notifications.
- Damaged stock tracking.
- Inventory valuation.

Inventory must remain consistent between online orders and physical POS sales.

Use database transactions to prevent overselling and duplicate stock deductions.

Maintain an auditable record of inventory changes.

## 6. Billing and financial operations

Implement where required:

- GST configuration.
- Tax-inclusive and tax-exclusive pricing.
- Appropriate invoice numbering.
- Invoice PDFs.
- Credit and debit notes where applicable.
- Refund records.
- Payment reconciliation.
- Daily cash closing.
- Expense tracking.
- Sales summaries.

Follow applicable Indian GST and accounting requirements.

Never assume a GST rate, HSN code, tax registration status, or invoice requirement. Obtain verified business information and validate tax rules with an appropriate professional.

## 7. CRM and customer engagement

Build:

- Customer profiles.
- Customer purchase history.
- Loyalty points.
- Reward redemption.
- Customer segmentation.
- Offers and coupons.
- WhatsApp order updates.
- Abandoned cart reminders.
- Festival campaigns.
- Customer feedback.

Respect customer consent and privacy.

Never send marketing messages without the required consent.

## 8. Admin dashboard

Create a dedicated shop-owner dashboard showing:

- Today's sales.
- Number of orders.
- Total revenue.
- Estimated gross profit.
- Pending orders.
- Low-stock products.
- Best-selling products.
- Recent transactions.
- Payment breakdown.
- Expenses.
- Sales trends.

Include date filters and downloadable reports.

The dashboard must display actual database values, not hardcoded numbers.

## 9. Architecture and engineering

Before selecting or changing architecture, inspect the existing stack.

Follow these principles:

- Modular application structure.
- Reusable services.
- Clear API contracts.
- Database normalization where appropriate.
- Proper validation.
- Database transactions.
- Pagination for large datasets.
- Secure authentication.
- Role-based authorization.
- Error handling.
- Structured logging.
- Database migrations.
- Automated tests.

Separate responsibilities between:

- Storefront.
- Admin.
- POS.
- Inventory.
- Orders.
- Payments.
- Customers.
- Reporting.

Do not introduce microservices unless there is a demonstrated need.

## 10. Security and reliability

Treat this as a real commercial application.

Implement:

- Secure password handling.
- Server-side authorization.
- Input validation.
- Rate limiting.
- CSRF protection where applicable.
- XSS and SQL injection prevention.
- Secure file uploads.
- Payment webhook verification.
- Idempotent payment and order processing.
- Audit logs.
- Backup and recovery strategy.
- Environment-based configuration.

Never trust client-side totals, discounts, payment status, or stock values.

## 11. Performance and SEO

Optimize for:

- Mobile-first browsing.
- Core Web Vitals.
- Image optimization.
- Lazy loading.
- Fast product search.
- Efficient database queries.
- Caching where appropriate.
- SEO metadata.
- Product structured data.
- Sitemap.
- Robots.txt.
- Local business SEO.

Make Bhaktijyot discoverable through relevant local searches.

## 12. Quality assurance

Before considering a feature complete:

1. Test the normal user journey.
2. Test invalid inputs.
3. Test unauthorized access.
4. Test duplicate submissions.
5. Test payment failure.
6. Test stock consistency.
7. Test responsive layouts.
8. Test empty states.
9. Test error handling.
10. Run relevant automated tests.

Never claim that a feature works unless it has been verified.

## 13. Development workflow

For every task:

### Phase A: Understand
Inspect relevant source files, components, database tables, APIs, and dependencies.

### Phase B: Plan
Explain:
- Existing implementation.
- Identified problems.
- Proposed changes.
- Files affected.
- Potential risks.

### Phase C: Implement
Make focused, production-quality changes. Preserve unrelated functionality.

### Phase D: Verify
Run tests, linting, type checks, and relevant build commands.

### Phase E: Report
Summarize:
- What changed.
- What works.
- Tests performed.
- Remaining limitations.
- Next recommended improvement.

## 14. Product mindset

Always think like a retail business owner.

Ask:

- Will this save the shop owner time?
- Will this improve sales?
- Will this reduce manual work?
- Will customers understand it immediately?
- Will this work on an ordinary Android phone?
- Will a non-technical employee use it comfortably?
- Will it remain reliable during busy business hours?

Do not add features simply because they look impressive.

Prioritize customer trust, business utility, speed, reliability, and simplicity.

## 15. Final objective

Build Bhaktijyot into a benchmark digital retail experience for local businesses in India.

The storefront must impress customers.

The POS must make billing effortless.

The inventory system must keep stock accurate.

The admin dashboard must help the owner make decisions.

The complete system must be secure, maintainable, scalable, and genuinely useful.
