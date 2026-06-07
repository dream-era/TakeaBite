import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionButton?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionButton,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center rounded-3xl border border-dashed border-neutral-200 bg-neutral-50/50 p-12 text-center shadow-sm ${className}`}>
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-neutral-100 mb-6">
        <Icon className="h-8 w-8 text-neutral-400" />
      </div>
      <h3 className="mb-2 text-xl font-bold text-neutral-900 tracking-tight">{title}</h3>
      <p className="mb-8 max-w-md text-sm text-neutral-500 leading-relaxed">{description}</p>
      {actionButton && <div>{actionButton}</div>}
    </div>
  );
}
