import React from 'react';
import { List, AutoSizer, WindowScroller, ListRowProps } from 'react-virtualized';

interface VirtualizedListProps<T> {
  items: T[];
  rowHeight: number | ((info: { index: number }) => number);
  renderRow: (item: T, index: number, style: React.CSSProperties) => React.ReactNode;
  className?: string;
  overscanRowCount?: number;
  scrollElement?: HTMLElement | null;
}

export default function VirtualizedList<T>({
  items,
  rowHeight,
  renderRow,
  className = '',
  overscanRowCount = 10,
  scrollElement
}: VirtualizedListProps<T>) {
  const rowRenderer = ({ index, key, style }: ListRowProps) => {
    return (
      <div key={key} style={style}>
        {renderRow(items[index], index, style)}
      </div>
    );
  };
 
  return (
    <div className={className}>
      <WindowScroller scrollElement={scrollElement || window as any}>
        {({ height, isScrolling, onChildScroll, scrollTop }) => (
          <AutoSizer disableHeight>
            {({ width }) => (
              <List
                autoHeight
                height={height || 500}
                isScrolling={isScrolling}
                onScroll={onChildScroll}
                overscanRowCount={overscanRowCount}
                rowCount={items.length}
                rowHeight={rowHeight}
                rowRenderer={rowRenderer}
                scrollTop={scrollTop}
                width={width}
              />
            )}
          </AutoSizer>
        )}
      </WindowScroller>
    </div>
  );
}