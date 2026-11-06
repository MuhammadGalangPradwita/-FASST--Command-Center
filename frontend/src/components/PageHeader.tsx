'use client';

import { ReactNode } from 'react';
import { RefreshCw, Plus, LucideIcon } from 'lucide-react';

interface PageHeaderProps {
  icon?: LucideIcon;
  badgeText?: string;
  title: string;
  subtitle?: string;
  refreshing?: boolean;
  onRefresh?: () => void;
  primaryAction?: {
    label: string;
    onClick?: () => void;
    href?: string;
    icon?: LucideIcon;
  };
  extraActions?: ReactNode;
}

const primaryClass =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-[#0d5c4d] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#09483c] active:scale-[0.98]';

export default function PageHeader({
  icon: Icon,
  badgeText,
  title,
  subtitle,
  refreshing,
  onRefresh,
  primaryAction,
  extraActions,
}: PageHeaderProps) {
  const PrimaryIcon = primaryAction?.icon || Plus;
  const hasActions = Boolean(onRefresh || extraActions || primaryAction);

  return (
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <div className="min-w-0">
        {badgeText && (
          <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-500">
            {Icon && <Icon className="h-3.5 w-3.5 text-slate-400" />}
            <span>{badgeText}</span>
          </div>
        )}
        <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>

      {hasActions && (
        <div className="flex flex-wrap items-center gap-2">
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={refreshing}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          )}

          {extraActions}

          {primaryAction &&
            (primaryAction.href ? (
              <a href={primaryAction.href} className={primaryClass}>
                <PrimaryIcon className="h-4 w-4" />
                {primaryAction.label}
              </a>
            ) : (
              <button type="button" onClick={primaryAction.onClick} className={primaryClass}>
                <PrimaryIcon className="h-4 w-4" />
                {primaryAction.label}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
