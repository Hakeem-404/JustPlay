import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw } from 'lucide-react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  pullDownThreshold?: number;
  maxPullDownDistance?: number;
  backgroundColor?: string;
  pullingContent?: React.ReactNode;
  refreshingContent?: React.ReactNode;
}
 
export default function PullToRefresh({
  onRefresh,
  children,
  pullDownThreshold = 80,
  maxPullDownDistance = 120,
  backgroundColor = 'bg-gray-100',
  pullingContent,
  refreshingContent
}: PullToRefreshProps) {
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef<number | null>(null);
  const lastYRef = useRef<number | null>(null);

  useEffect(() => {
    // Only enable pull-to-refresh on touch devices
    if (window.matchMedia('(pointer: coarse)').matches) {
      const container = containerRef.current;
      if (!container) return;

      const handleTouchStart = (e: TouchEvent) => {
        // Only enable pull-to-refresh when at the top of the page
        if (window.scrollY === 0) {
          startYRef.current = e.touches[0].clientY;
          lastYRef.current = e.touches[0].clientY;
          setIsPulling(true);
        }
      };

      const handleTouchMove = (e: TouchEvent) => {
        if (!startYRef.current || !lastYRef.current) return;
        
        const currentY = e.touches[0].clientY;
        const deltaY = currentY - startYRef.current;
        lastYRef.current = currentY;

        // Only allow pulling down when at the top of the page
        if (window.scrollY === 0 && deltaY > 0) {
          // Calculate pull distance with resistance
          const newPullDistance = Math.min(
            maxPullDownDistance,
            deltaY * 0.5 // Add resistance factor
          );
          
          setPullDistance(newPullDistance);
          
          // Prevent default scrolling behavior
          e.preventDefault();
        }
      };

      const handleTouchEnd = async () => {
        if (!isPulling) return;
        
        if (pullDistance >= pullDownThreshold) {
          // Trigger refresh
          setIsRefreshing(true);
          setPullDistance(pullDownThreshold); // Keep indicator visible during refresh
          
          try {
            await onRefresh();
          } catch (error) {
            console.error('Refresh failed:', error);
          } finally {
            setIsRefreshing(false);
            setPullDistance(0);
          }
        } else {
          // Reset without refreshing
          setPullDistance(0);
        }
        
        setIsPulling(false);
        startYRef.current = null;
        lastYRef.current = null;
      };

      container.addEventListener('touchstart', handleTouchStart, { passive: false });
      container.addEventListener('touchmove', handleTouchMove, { passive: false });
      container.addEventListener('touchend', handleTouchEnd);
      container.addEventListener('touchcancel', handleTouchEnd);

      return () => {
        container.removeEventListener('touchstart', handleTouchStart);
        container.removeEventListener('touchmove', handleTouchMove);
        container.removeEventListener('touchend', handleTouchEnd);
        container.removeEventListener('touchcancel', handleTouchEnd);
      };
    }
  }, [onRefresh, isPulling, pullDistance, pullDownThreshold, maxPullDownDistance]);

  // Calculate progress percentage
  const progress = Math.min(100, (pullDistance / pullDownThreshold) * 100);

  return (
    <div ref={containerRef} className="relative overflow-hidden">
      {/* Pull indicator */}
      {(isPulling || isRefreshing) && (
        <div 
          className={`absolute left-0 right-0 flex items-center justify-center ${backgroundColor} transition-transform z-10`}
          style={{ 
            height: `${pullDownThreshold}px`,
            transform: `translateY(${pullDistance - pullDownThreshold}px)`
          }}
        >
          {isRefreshing ? (
            refreshingContent || (
              <div className="flex items-center space-x-2">
                <RefreshCw className="h-5 w-5 text-blue-600 animate-spin" />
                <span className="text-sm font-medium text-blue-600">Refreshing...</span>
              </div>
            )
          ) : (
            pullingContent || (
              <div className="flex items-center space-x-2">
                <RefreshCw 
                  className="h-5 w-5 text-blue-600 transition-transform" 
                  style={{ transform: `rotate(${progress * 3.6}deg)` }}
                />
                <span className="text-sm font-medium text-blue-600">
                  {progress >= 100 ? 'Release to refresh' : 'Pull down to refresh'}
                </span>
              </div>
            )
          )}
        </div>
      )}
      
      {/* Content */}
      <div
        style={{
          transform: isPulling || isRefreshing ? `translateY(${pullDistance}px)` : 'none',
          transition: isPulling ? 'none' : 'transform 0.2s ease-out'
        }}
      >
        {children}
      </div>
    </div>
  );
}