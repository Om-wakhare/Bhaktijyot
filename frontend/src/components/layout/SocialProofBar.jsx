import { Star } from 'lucide-react';

const STATS = [
  { value: '10,000+', label: 'Happy Customers' },
  { value: '40+',     label: 'Years of Trust' },
  { value: '4.9',     label: 'Average Rating' },
  { value: '100%',    label: 'Certified Authentic' },
  { value: '500+',    label: 'Products' },
];

function Badge({ stat }) {
  return (
    <div className="flex items-center gap-1.5 whitespace-nowrap">
      <Star className="h-3.5 w-3.5 fill-gold text-gold shrink-0" />
      <span className="text-xs font-bold text-espresso">{stat.value}</span>
      <span className="text-xs text-espresso/55">{stat.label}</span>
    </div>
  );
}

export function SocialProofBar() {
  return (
    <div className="border-b border-espresso/10 py-3 overflow-hidden" style={{ backgroundColor: '#F4E4D1' }}>

      {/* Desktop — static evenly-spaced row */}
      <div className="hidden sm:block max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-10">
        <div className="flex items-center justify-between">
          {STATS.map((stat, i) => <Badge key={i} stat={stat} />)}
        </div>
      </div>

      {/* Mobile — classic marquee */}
      <div className="sm:hidden">
        <div className="spb-marquee flex whitespace-nowrap">
          {[0, 1].map((k) => (
            <div key={k} className="flex items-center shrink-0">
              {STATS.map((stat, i) => (
                <div key={i} className="flex items-center">
                  <Badge stat={stat} />
                  <span className="px-5 text-gold/60" aria-hidden="true">✦</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .spb-marquee { width: max-content; animation: spb-scroll 22s linear infinite; }
        @keyframes spb-scroll {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
