import { Star } from 'lucide-react';

const STATS = [
  { value: '10,000+', label: 'Happy Customers' },
  { value: '40+',     label: 'Years of Trust' },
  { value: '4.9',     label: 'Average Rating' },
  { value: '100%',    label: 'Certified Authentic' },
  { value: '500+',    label: 'Products' },
];

export function SocialProofBar() {
  return (
    <div className="border-b border-espresso/10 py-3" style={{ backgroundColor: '#F4E4D1' }}>
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-10">
        <div className="flex items-center justify-between flex-wrap gap-y-2">
          {STATS.map((stat, i) => (
            <div key={i} className="flex items-center gap-1.5 whitespace-nowrap">
              <Star className="h-3.5 w-3.5 fill-gold text-gold shrink-0" />
              <span className="text-xs font-bold text-espresso">{stat.value}</span>
              <span className="text-xs text-espresso/55">{stat.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
