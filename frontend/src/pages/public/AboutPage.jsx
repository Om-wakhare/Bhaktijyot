import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck, Gem, Heart } from 'lucide-react';

export function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-16">

      {/* Hero */}
      <div className="space-y-4">
        <div className="text-[11px] font-semibold uppercase tracking-widest text-primary">Our Story</div>
        <h1 className="font-display text-5xl font-semibold text-espresso leading-tight">About Bhaktijyot</h1>
        <p className="text-warmBrown/70 text-lg leading-relaxed max-w-2xl">
          For over 40 years, Bhaktijyot has been Ahmednagar's most trusted source for authentic gemstones, crystal malas, and sacred pooja essentials.
        </p>
      </div>

      {/* Story sections */}
      <div className="grid sm:grid-cols-3 gap-6">
        {[
          {
            icon: Gem,
            title: 'Certified Gemstones',
            desc: 'Every gemstone report is produced using an image-based certificate system that can be verified online — giving your customers complete peace of mind.',
          },
          {
            icon: ShieldCheck,
            title: 'Verified Authenticity',
            desc: 'Our certificates are verifiable at any time, from anywhere. Download the certificate image and share it with confidence.',
          },
          {
            icon: Heart,
            title: 'Sourced with Devotion',
            desc: 'From rudraksha malas to crystal bracelets — each product is curated with care for quality, spiritual significance, and authenticity.',
          },
        ].map(({ icon: Icon, title, desc }) => (
          <div key={title} className="bg-white rounded-2xl p-6 border border-stone-100 shadow-sm space-y-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-semibold text-warmBrown">{title}</h3>
            <p className="text-sm text-warmBrown/60 leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>

      {/* Body */}
      <div className="prose prose-stone max-w-none">
        <div className="space-y-4 text-warmBrown/70 text-sm leading-relaxed">
          <p>
            Bhaktijyot is a gemstone laboratory and spiritual shop focused on authenticity, transparency, and devotion.
            Every gemstone report is produced independently using an image-based certificate system that can be verified
            online by your customers.
          </p>
          <p>
            The shop offers a curated selection of malas, rudraksha, crystals, and other spiritual products. Our goal is to
            support both offline and online sales with a simple, reliable system that works for walk-in customers, social
            media orders, and more.
          </p>
          <p>
            Based in Ahmednagar, Maharashtra, we have served thousands of families across India and abroad — helping them
            find genuine gemstones, understand their properties, and connect more deeply with their spiritual practice.
          </p>
        </div>
      </div>

      {/* CTA */}
      <div className="flex flex-wrap gap-4">
        <Link to="/products" className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-primary text-white font-semibold text-sm hover:bg-primary-dark transition-colors group">
          Shop Now <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
        </Link>
        <Link to="/verify" className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full border border-espresso/20 text-espresso font-semibold text-sm hover:border-primary hover:text-primary transition-colors">
          Verify Certificate
        </Link>
      </div>
    </div>
  );
}
