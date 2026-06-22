import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'ghost' | 'danger' | 'neutral';

const variants: Record<Variant, string> = {
  primary: 'bg-flame text-paper hover:bg-flame-dark shadow-[var(--shadow-soft)]',
  ghost: 'bg-transparent text-flame hover:underline',
  danger: 'bg-transparent text-red-600 border border-red-200 hover:bg-red-50',
  neutral: 'bg-paper text-ink border border-bone hover:border-stone',
};

export function Button({
  variant = 'primary',
  loading,
  className = '',
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean }) {
  return (
    <button
      {...props}
      disabled={props.disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-[var(--radius-input)] px-5 py-2.5 text-sm font-semibold tracking-[0.015em] transition disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-ink">{label}</span>
      {children}
      {hint && <span className="text-xs text-ash">{hint}</span>}
    </label>
  );
}

export function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`rounded-[var(--radius-input)] border border-bone bg-paper px-4 py-2.5 text-sm text-ink outline-none placeholder:text-driftwood focus:border-flame focus:ring-2 focus:ring-flame/30 ${className}`}
    />
  );
}

export function Card({ className = '', children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={`rounded-[var(--radius-card)] border border-parchment/60 bg-paper p-8 ${className}`}
    >
      {children}
    </div>
  );
}

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'green' | 'red' | 'flame' }) {
  const tones = {
    neutral: 'bg-cream text-stone border-bone',
    green: 'bg-green-50 text-green-700 border-green-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    flame: 'bg-marigold text-ink border-flame/30',
  } as const;
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function Spinner() {
  return (
    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
  );
}

export function Alert({ kind, children }: { kind: 'error' | 'success'; children: ReactNode }) {
  const styles =
    kind === 'error'
      ? 'bg-red-50 text-red-700 border-red-200'
      : 'bg-green-50 text-green-700 border-green-200';
  return <div className={`rounded-[var(--radius-input)] border px-4 py-3 text-sm ${styles}`}>{children}</div>;
}
