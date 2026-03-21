import { HTMLAttributes } from 'react';

type CardProps = HTMLAttributes<HTMLDivElement> & {
  muted?: boolean;
};

export default function Card({ muted = false, className = '', ...props }: CardProps) {
  const base = muted ? 'ds-card-muted' : 'ds-card';
  return <div className={`${base} ${className}`.trim()} {...props} />;
}
