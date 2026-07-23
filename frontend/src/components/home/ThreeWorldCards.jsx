import { Link, useSearchParams } from 'react-router-dom';

import catIdols     from '../../assets/cat-idols.png';
import catDiya      from '../../assets/cat-diya.png';
import catRudraksha from '../../assets/cat-rudraksha.png';
import catPooja     from '../../assets/cat-pooja.png';
import flower       from '../../assets/flower.png';

const CATEGORIES = [
  { key: 'idol',      label: 'Idols',            to: '/products?q=idol',      image: catIdols },
  { key: 'diya',      label: 'Diya',             to: '/products?q=diya',      image: catDiya },
  { key: 'rudraksha', label: 'Rudraksha',        to: '/products?q=rudraksha', image: catRudraksha },
  { key: 'pooja',     label: 'Pooja Essentials', to: '/products?world=pooja', image: catPooja },
];

export function ThreeWorldCards() {
  const [searchParams] = useSearchParams();
  const activeQ     = searchParams.get('q')     || '';
  const activeWorld = searchParams.get('world') || '';
  const isActive    = (cat) => activeQ === cat.key || activeWorld === cat.key;

  return (
    <section style={{ backgroundColor: '#F4E4D1' }} className="pt-8 pb-6 px-4 sm:px-8 lg:px-16">

      {/* Heading */}
      <div className="text-center mb-3">
        <h2
          className="font-sans font-black text-espresso uppercase"
          style={{ fontSize: 'clamp(1.6rem, 3vw, 2.4rem)', letterSpacing: '0.04em' }}
        >
          Shop Daily Pooja Essentials
        </h2>
        <p className="mt-1 text-sm font-medium" style={{ color: 'rgba(28,18,9,0.45)', fontStyle: 'italic' }}>
          I'd like to browse for...
        </p>
        <img
          src={flower}
          alt=""
          className="mx-auto mt-1 w-full max-w-[220px]"
          style={{ mixBlendMode: 'multiply' }}
        />
      </div>

      {/* 4 cards — full image with text overlay */}
      <div className="max-w-screen-lg mx-auto grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
        {CATEGORIES.map((cat) => {
          const active = isActive(cat);
          return (
            <Link
              key={cat.key}
              to={cat.to}
              className="group relative overflow-hidden rounded-2xl block transition-all duration-300 hover:-translate-y-1.5"
              style={{
                paddingBottom: '130%',
                boxShadow: active
                  ? '0 0 0 3px #1D3D2C, 0 8px 28px rgba(28,18,9,0.2)'
                  : '0 3px 18px rgba(28,18,9,0.12)',
              }}
            >
              {/* Full image */}
              <img
                src={cat.image}
                alt={cat.label}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />

              {/* Bottom gradient overlay for text readability */}
              <div
                className="absolute inset-x-0 bottom-0"
                style={{
                  height:     '45%',
                  background: 'linear-gradient(to top, rgba(15,8,2,0.82) 0%, rgba(15,8,2,0.4) 60%, transparent 100%)',
                }}
              />

              {/* Text + flower at bottom ON the image */}
              <div className="absolute inset-x-0 bottom-0 flex flex-col items-center pb-5 px-3">
                <span
                  className="font-black uppercase text-center tracking-widest"
                  style={{ fontSize: '12px', color: '#FFF5E6', letterSpacing: '0.15em' }}
                >
                  {cat.label}
                </span>
                <img
                  src={flower}
                  alt=""
                  className="mt-2 w-28"
                  style={{ filter: 'brightness(0) invert(1)', opacity: 0.75 }}
                />
              </div>
            </Link>
          );
        })}
      </div>

    </section>
  );
}
