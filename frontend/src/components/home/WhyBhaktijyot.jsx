import { ShieldCheck, Gem, Star, Truck, Clock, Users } from 'lucide-react';

const STATS = [
  { value: '10,000+', label: 'Happy Customers' },
  { value: '40+', label: 'Years in Business' },
  { value: '4.9★', label: 'Average Rating' },
  { value: '500+', label: 'Products' },
];

const FEATURES = [
  {
    icon: ShieldCheck,
    title: 'Lab-Certified Authenticity',
    desc: 'Every gemstone comes with an image-based certificate verifiable online. No fakes, no guesswork.',
  },
  {
    icon: Clock,
    title: '40+ Years of Trust',
    desc: "Bhaktijyot has been Ahmednagar's most trusted spiritual store since 1985.",
  },
  {
    icon: Truck,
    title: 'Pan-India Shipping',
    desc: 'We ship all across India. WhatsApp us for international enquiries.',
  },
];

export function WhyBhaktijyot() {
  return (
    <section className="bg-espresso py-16 lg:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">

          {/* Left column */}
          <div className="space-y-8">
            <div className="space-y-3">
              <div className="text-[11px] font-semibold uppercase tracking-widest text-primary">Our Promise</div>
              <h2 className="font-display text-3xl lg:text-4xl font-semibold text-white leading-snug">
                Why Families Trust Bhaktijyot
              </h2>
              <p className="text-white/60 text-sm leading-relaxed max-w-md">
                Authenticity, devotion, and transparency — these are not just words for us. They are the foundation of every product we sell.
              </p>
            </div>

            {/* 2×2 stat tiles */}
            <div className="grid grid-cols-2 gap-3">
              {STATS.map(({ value, label }) => (
                <div key={label} className="bg-white/6 border border-white/10 rounded-xl p-4 space-y-1">
                  <div className="font-display text-2xl font-semibold text-primary">{value}</div>
                  <div className="text-xs text-white/50">{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right column — feature cards */}
          <div className="space-y-4">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="flex gap-4 bg-white/5 border border-white/8 rounded-xl p-5 hover:bg-white/8 transition-colors"
              >
                <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-white">{title}</h3>
                  <p className="text-xs text-white/50 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
