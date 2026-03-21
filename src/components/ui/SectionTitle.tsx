import { HTMLAttributes } from 'react';

type SectionTitleProps = HTMLAttributes<HTMLDivElement> & {
  kicker?: string;
  title: string;
  subtitle?: string;
};

export default function SectionTitle({ kicker, title, subtitle, className = '', ...props }: SectionTitleProps) {
  return (
    <div className={className} {...props}>
      {kicker && <p className="ds-kicker mb-2">{kicker}</p>}
      <h2 className="modern-typography-medium gradient-text ds-heading">{title}</h2>
      {subtitle && <p className="text-sm text-muted mt-1">{subtitle}</p>}
    </div>
  );
}
