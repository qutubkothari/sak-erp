import React from 'react';

export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div
      className={`animate-pulse rounded bg-gradient-to-r from-[#F4ECE2] via-[#E8DCC4] to-[#F4ECE2] bg-[length:200%_100%] ${className}`}
      style={{
        animation: 'shimmer 1.5s ease-in-out infinite',
      }}
    />
  );
};

export const SkeletonText: React.FC<{ lines?: number; className?: string }> = ({
  lines = 3,
  className = '',
}) => {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={`h-4 ${
            i === lines - 1 ? 'w-3/4' : 'w-full'
          }`}
        />
      ))}
    </div>
  );
};

export const SkeletonCard: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`rounded-2xl border border-[#E8DCC4] bg-white p-6 shadow-sm ${className}`}>
      <Skeleton className="mb-4 h-6 w-1/3" />
      <SkeletonText lines={3} />
    </div>
  );
};

export const SkeletonTable: React.FC<{ rows?: number; columns?: number }> = ({
  rows = 5,
  columns = 4,
}) => {
  return (
    <div className="rounded-2xl border border-[#E8DCC4] bg-white p-6 shadow-sm">
      {/* Header */}
      <div className="mb-4 flex gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-10 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div key={rowIdx} className="mb-3 flex gap-4">
          {Array.from({ length: columns }).map((_, colIdx) => (
            <Skeleton key={colIdx} className="h-8 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
};

export const SkeletonChart: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`rounded-2xl border border-[#E8DCC4] bg-white p-6 shadow-sm ${className}`}>
      <Skeleton className="mb-4 h-6 w-1/3" />
      <div className="flex h-64 items-end gap-2">
        {Array.from({ length: 8 }).map((_, i) => {
          const height = Math.random() * 100 + 50;
          return (
            <div
              key={i}
              className="animate-pulse rounded bg-gradient-to-r from-[#F4ECE2] via-[#E8DCC4] to-[#F4ECE2] bg-[length:200%_100%] flex-1"
              style={{ height: `${height}px`, animation: 'shimmer 1.5s ease-in-out infinite' }}
            />
          );
        })}
      </div>
    </div>
  );
};

export const SkeletonStats: React.FC = () => {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-[#E8DCC4] bg-white p-6 shadow-sm">
          <Skeleton className="mb-2 h-4 w-1/2" />
          <Skeleton className="mb-3 h-8 w-3/4" />
          <Skeleton className="h-3 w-full" />
        </div>
      ))}
    </div>
  );
};

export const LoadingSpinner: React.FC<{ size?: 'sm' | 'md' | 'lg'; className?: string }> = ({
  size = 'md',
  className = '',
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-3',
    lg: 'h-12 w-12 border-4',
  };

  return (
    <div
      className={`inline-block animate-spin rounded-full border-[#E8DCC4] border-t-[#6F4E37] ${sizeClasses[size]} ${className}`}
    />
  );
};

export const LoadingOverlay: React.FC<{ message?: string }> = ({
  message = 'Loading...',
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#F7F4EF]/80 backdrop-blur-sm">
      <div className="rounded-2xl border border-[#E8DCC4] bg-white p-8 shadow-lg">
        <div className="flex flex-col items-center gap-4">
          <LoadingSpinner size="lg" />
          <p className="text-sm font-medium text-[#36454F]">{message}</p>
        </div>
      </div>
    </div>
  );
};

export const PageLoader: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#F7F4EF] p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Skeleton className="mb-2 h-8 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <SkeletonStats />
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <SkeletonChart />
          <SkeletonChart />
        </div>
      </div>
    </div>
  );
};
