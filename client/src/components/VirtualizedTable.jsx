import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Table } from 'react-bootstrap';

const VirtualizedTable = ({ data, headers, height, rowHeight, renderCell, className }) => {
  const containerRef = useRef(null);
  const rowRefs = useRef({});
  const [scrollTop, setScrollTop] = useState(0);
  const [visibleRows, setVisibleRows] = useState([]);
  const [rowHeights, setRowHeights] = useState(new Map());

  // Function to calculate and update row heights
  const measureRowHeights = useCallback(() => {
    const newRowHeights = new Map();
    let totalHeight = 0;
    
    // First, check if a fixed height is provided (for performance on large tables)
    if (rowHeight) {
      newRowHeights.set('fixed', rowHeight);
      totalHeight = data.length * rowHeight;
    } else {
      // If no fixed height, measure each row that has been rendered
      Object.keys(rowRefs.current).forEach(index => {
        const rowElement = rowRefs.current[index];
        if (rowElement) {
          const rowH = rowElement.offsetHeight;
          newRowHeights.set(parseInt(index), rowH);
          totalHeight += rowH;
        }
      });
      // Fallback for unmeasured rows
      const measuredRowsCount = newRowHeights.size;
      const unmeasuredRowsCount = data.length - measuredRowsCount;
      const averageHeight = measuredRowsCount > 0 ? Array.from(newRowHeights.values()).reduce((sum, h) => sum + h, 0) / measuredRowsCount : 50; // Default estimate
      totalHeight += unmeasuredRowsCount * averageHeight;
      newRowHeights.set('totalHeight', totalHeight);
    }
    setRowHeights(newRowHeights);
  }, [data, rowHeight]);

  // Set up ResizeObserver to automatically measure rows when content changes
  useEffect(() => {
    if (!containerRef.current || rowHeight) return;

    const observer = new ResizeObserver(() => {
      measureRowHeights();
    });

    Object.values(rowRefs.current).forEach(row => {
      if (row) observer.observe(row);
    });

    return () => {
      observer.disconnect();
    };
  }, [data, rowHeight, measureRowHeights]);

  // Handle scroll event
  const handleScroll = useCallback(() => {
    if (containerRef.current) {
      setScrollTop(containerRef.current.scrollTop);
    }
  }, []);

  const totalHeight = useMemo(() => {
    if (rowHeight) return data.length * rowHeight;
    return rowHeights.get('totalHeight') || data.length * 50; // Use a default estimate
  }, [data.length, rowHeight, rowHeights]);
  
  const startIndex = useMemo(() => {
    if (rowHeight) {
      return Math.max(0, Math.floor(scrollTop / rowHeight) - 5);
    }
    // For dynamic heights, we have to iterate through the map
    let offset = 0;
    let index = 0;
    while (offset < scrollTop - 5 * 50 && index < data.length) { // Estimate 5 rows buffer
      offset += rowHeights.get(index) || 50;
      index++;
    }
    return index;
  }, [scrollTop, data.length, rowHeight, rowHeights]);

  const endIndex = useMemo(() => {
    if (rowHeight) {
      const visibleCount = Math.ceil(height / rowHeight) + 10;
      return Math.min(data.length, startIndex + visibleCount);
    }
    let offset = 0;
    let index = startIndex;
    const visibleHeight = height + 10 * 50; // Estimate 10 rows buffer
    while (offset < visibleHeight && index < data.length) {
      offset += rowHeights.get(index) || 50;
      index++;
    }
    return index;
  }, [startIndex, data.length, height, rowHeight, rowHeights]);

  const paddingTop = useMemo(() => {
    if (rowHeight) return startIndex * rowHeight;
    let padding = 0;
    for (let i = 0; i < startIndex; i++) {
      padding += rowHeights.get(i) || 50;
    }
    return padding;
  }, [startIndex, rowHeight, rowHeights]);

  useEffect(() => {
    const visibleData = data.slice(startIndex, endIndex);
    setVisibleRows(visibleData);
  }, [data, startIndex, endIndex]);

  return (
    <div
      ref={containerRef}
      style={{ height: `${height}px`, overflowY: 'auto' }}
      onScroll={handleScroll}
      className={className}
    >
      <div style={{ height: `${totalHeight}px` }}>
        <Table striped bordered hover className="mb-0" style={{ transform: `translateY(${paddingTop}px)` }}>
          <thead>
            <tr>
              {headers.map(header => (
                <th key={header.key} style={{ width: header.width, minWidth: header.width }}>{header.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row, relativeIndex) => {
              const originalIndex = startIndex + relativeIndex;
              return (
                <tr
                  key={originalIndex}
                  ref={el => (rowRefs.current[originalIndex] = el)}
                >
                  {headers.map((header, cellIndex) => (
                    <td key={cellIndex} className="text-wrap">
                      {renderCell(row, header, originalIndex, cellIndex)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </Table>
      </div>
    </div>
  );
};

export default VirtualizedTable;
