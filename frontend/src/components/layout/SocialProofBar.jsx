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
      <Star className="h-3.5 w-3.5 fill-gold text-gold shrink-0" aria-hidden="true" />
      <span className="text-xs font-bold text-espresso">{stat.value}</span>
      <span className="text-xs text-espresso/70">{stat.label}</span>
    </div>
  );
}

/** One copy of the badge row used by the marquee. */
function BadgeRow({ duplicate = false }) {
  return (
    <ul
      className={`flex items-center shrink-0 ${duplicate ? 'motion-reduce:hidden' : ''}`}
      aria-hidden={duplicate ? 'true' : undefined}
    >
      {STATS.map((stat) => (
        <li key={stat.label} className="flex items-center">
          <Badge stat={stat} />
          <span className="px-5 text-gold/60" aria-hidden="true">✦</span>
        </li>
      ))}
    </ul>
  );
}

export function SocialProofBar() {
  return (
    <div className="border-b border-espresso/10 py-3 overflow-hidden" style={{ backgroundColor: '#F4E4D1' }}>

      {/* Wide screens — static evenly-spaced row (5 badges need ~700px, so lg+) */}
      <div className="hidden lg:block max-w-screen-xl mx-auto px-10">
        <ul className="flex items-center justify-between">
          {STATS.map((stat) => (
            <li key={stat.label}><Badge stat={stat} /></li>
          ))}
        </ul>
      </div>

      {/* Phones & tablets — marquee (shared .bj-marquee classes) */}
      <div className="lg:hidden bj-marquee overflow-hidden">
        <div className="bj-marquee-track" style={{ '--bj-marquee-duration': '22s' }}>
          <BadgeRow />
          <BadgeRow duplicate />
        </div>
      </div>
    </div>
  );
}
