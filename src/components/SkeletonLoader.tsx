import React from 'react';

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  circle?: boolean;
  animate?: boolean;
}

export function Skeleton({ 
  className = '', 
  width, 
  height, 
  circle = false,
  animate = true
}: SkeletonProps) {
  const baseClasses = "bg-gray-200";
  const animationClass = animate ? "animate-pulse" : "";
  const shapeClass = circle ? "rounded-full" : "rounded";
  
  const style: React.CSSProperties = {
    width: width || '100%',
    height: height || '1rem',
  };
   
  return (
    <div 
      className={`${baseClasses} ${animationClass} ${shapeClass} ${className}`}
      style={style}
    />
  );
}

export function GameCardSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-pulse">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
        </div>
        <div className="h-6 w-20 bg-gray-200 rounded-full"></div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex items-center">
            <div className="h-4 w-4 bg-gray-200 rounded mr-2"></div>
            <div className="flex-1">
              <div className="h-3 bg-gray-200 rounded w-full mb-1"></div>
              <div className="h-3 bg-gray-200 rounded w-2/3"></div>
            </div>
          </div>
        ))}
      </div>

      <div className="h-4 bg-gray-200 rounded w-full mb-4"></div>

      <div className="flex justify-between items-center">
        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
        <div className="h-8 bg-gray-200 rounded w-1/4"></div>
      </div>
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8 mb-8 animate-pulse">
      <div className="flex flex-col lg:flex-row items-start lg:items-center space-y-6 lg:space-y-0 lg:space-x-8">
        <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gray-200 rounded-full"></div>
        <div className="flex-1 min-w-0 w-full">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4 space-y-4 sm:space-y-0">
            <div className="min-w-0 flex-1">
              <div className="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-6 bg-gray-200 rounded-full w-1/4"></div>
            </div>
            <div className="h-10 bg-gray-200 rounded w-32"></div>
          </div>
          <div className="h-4 bg-gray-200 rounded w-full mt-4"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6 mt-2"></div>
        </div>
      </div>
    </div>
  );
}

export function MapSkeleton() {
  return (
    <div className="h-full w-full bg-gray-100 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 bg-gray-200 rounded-lg mb-4 mx-auto animate-pulse"></div>
        <div className="h-4 bg-gray-200 rounded w-32 mx-auto mb-2 animate-pulse"></div>
        <div className="h-3 bg-gray-200 rounded w-24 mx-auto animate-pulse"></div>
      </div>
    </div>
  );
}