'use client';
import { useIndonesia } from './indonesia-map';
export default function LivingNetwork() {
  const paths = useIndonesia();
  return (
    <div className="living-network" aria-label="Ilustrasi bergerak koneksi lintas pulau Indonesia">
      <div className="visual-label"></div>
      <svg viewBox="0 0 950 385" aria-hidden="true">
        <defs>
          <linearGradient id="island-light">
            <stop stopColor="#7152a6" />
            <stop offset="1" stopColor="#292334" />
          </linearGradient>
        </defs>
        {paths.map((d, i) => (
          <path key={i} d={d} fill="url(#island-light)" stroke="#9e7ece" strokeWidth=".7" />
        ))}
        {[
          'M265 274 Q360 110 500 282',
          'M500 282 Q530 120 675 215',
          'M265 274 Q240 120 125 95',
          'M500 282 Q420 115 440 155',
          'M675 215 Q760 155 850 230',
        ].map((d, i) => (
          <g key={i}>
            <path d={d} fill="none" stroke="#c7a1ff" opacity=".35" />
            <path
              className="moving-signal"
              d={d}
              fill="none"
              stroke="#ede0ff"
              strokeWidth="2"
              style={{ animationDelay: `${i * -0.9}s` }}
            />
          </g>
        ))}
        {[
          [265, 274],
          [500, 282],
          [675, 215],
          [125, 95],
          [440, 155],
          [850, 230],
        ].map(([x, y], i) => (
          <g key={i}>
            <circle
              className="signal-ring"
              cx={x}
              cy={y}
              r="14"
              fill="none"
              stroke="#bb91fa"
              style={{ animationDelay: `${i * -0.8}s` }}
            />
            <circle cx={x} cy={y} r="4" fill="#ebdbff" />
          </g>
        ))}
      </svg>
      <div className="visual-caption"></div>
    </div>
  );
}
