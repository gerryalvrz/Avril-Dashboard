import { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
};

const VARIANT_CLASS: Record<Variant, string> = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  ghost: 'btn-ghost',
};

export default function Button({ variant = 'primary', className = '', ...props }: ButtonProps) {
  return <button className={`${VARIANT_CLASS[variant]} ${className}`.trim()} {...props} />;
}
