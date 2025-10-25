import clsx from 'clsx';
import type { CompassVerdict } from '../types';

interface Props {
  value: number;
  verdict: CompassVerdict;
  size?: number;
}

const verdictStroke: Record<CompassVerdict, string> = {
  Likely: 'stroke-verdict-likely',
  Borderline: 'stroke-verdict-borderline',
  Unlikely: 'stroke-verdict-unlikely'
};

const verdictText: Record<CompassVerdict, string> = {
  Likely: 'text-verdict-likely',
  Borderline: 'text-verdict-borderline',
  Unlikely: 'text-verdict-unlikely'
};

export default function ScoreGauge({ value, verdict, size = 160 }: Props): JSX.Element {
  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(Math.max(value, 0), 100);
  const dashOffset = circumference - (progress / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-4">
      <svg width={size} height={size} className="overflow-visible">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth="12"
          className="stroke-slate-200 fill-none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth="12"
          className={clsx('fill-none transition-all', verdictStroke[verdict])}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        <text
          x="50%"
          y="50%"
          dominantBaseline="middle"
          textAnchor="middle"
          className={clsx('text-3xl font-semibold', verdictText[verdict])}
        >
          {Math.round(progress)}
        </text>
      </svg>
      <div className="text-center">
        <p className="text-sm uppercase tracking-wide text-slate-500">Compass Score</p>
        <p className={clsx('text-lg font-semibold', verdictText[verdict])}>{verdict}</p>
      </div>
    </div>
  );
}
