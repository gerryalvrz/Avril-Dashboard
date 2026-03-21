import { HTMLAttributes } from 'react';

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: 'brand' | 'neutral';
};

export default function Badge({ tone = 'neutral', className = '', ...props }: BadgeProps) {
  const toneClass = tone === 'brand' ? 'ds-badge-brand' : '';
  return <span className={`ds-badge ${toneClass} ${className}`.trim()} {...props} />;
}
