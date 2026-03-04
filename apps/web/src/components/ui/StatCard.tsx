'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

type TrendDirection = 'up' | 'down' | 'neutral';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  /** Trend percentage (e.g. 12 = +12%) */
  trend?: number;
  trendLabel?: string;
  icon?: ReactNode;
  /** Tailwind bg color class for icon background */
  iconBg?: string;
  /** Whether this card links somewhere */
  href?: string;
  onClick?: () => void;
  /** Highlight the card (e.g. red for alerts) */
  alert?: boolean;
  loading?: boolean;
  className?: string;
}

function TrendBadge({ trend }: { trend: number }) {
  const dir: TrendDirection = trend > 0 ? 'up' : trend < 0 ? 'down' : 'neutral';
  const abs = Math.abs(trend);
  const cfg = {
    up: { cls: 'bg-green-50 text-green-700', Icon: TrendingUp },
    down: { cls: 'bg-red-50 text-red-700', Icon: TrendingDown },
    neutral: { cls: 'bg-gray-100 text-gray-500', Icon: Minus },
  }[dir];

  return (
    <span className={cn('inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold', cfg.cls)}>
      <cfg.Icon className="h-3 w-3" />
      {dir !== 'neutral' && `${abs}%`}
    </span>
  );
}

/**
 * Enterprise-grade KPI stat card with trend indicator.
 * Replaces the basic div cards in the dashboard.
 */
export function StatCard({
  title,
  value,
  subtitle,
  trend,
  trendLabel,
  icon,
  iconBg = 'bg-amber-100',
  onClick,
  alert = false,
  loading = false,
  className,
}: StatCardProps) {
  const Tag = onClick ? 'button' : 'div';

  return (
    <Tag
      onClick={onClick}
      className={cn(
        'group relative rounded-xl border bg-white p-5 shadow-sm transition-all text-left w-full',
        onClick && 'cursor-pointer hover:shadow-md hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-600',
        alert
          ? 'border-red-300 ring-1 ring-red-200'
          : 'border-gray-200 hover:border-amber-200',
        className,
      )}
    >
      {/* Alert pulse */}
      {alert && (
        <span className="absolute right-3 top-3 flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
        </span>
      )}

      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-500 truncate">{title}</p>

          {loading ? (
            <div className="mt-2 h-8 w-20 animate-pulse rounded-md bg-gray-200" />
          ) : (
            <p className={cn('mt-1 text-3xl font-bold tracking-tight', alert ? 'text-red-600' : 'text-gray-900')}>
              {value}
            </p>
          )}

          {(trend !== undefined || trendLabel || subtitle) && (
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              {trend !== undefined && <TrendBadge trend={trend} />}
              {(trendLabel || subtitle) && (
                <span className="text-xs text-gray-400">{trendLabel ?? subtitle}</span>
              )}
            </div>
          )}
        </div>

        {icon && (
          <div className={cn('rounded-xl p-3 flex-shrink-0', iconBg)}>
            {icon}
          </div>
        )}
      </div>
    </Tag>
  );
}
