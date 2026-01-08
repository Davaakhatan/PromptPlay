/**
 * TabContent Component
 * Wrapper for tab panel content with fade transitions
 */

import { ReactNode, useEffect, useState, useRef } from 'react';

interface TabContentProps {
  /** Whether this tab is currently active */
  isActive: boolean;
  /** The content to display */
  children: ReactNode;
  /** Optional class name for the wrapper */
  className?: string;
  /** Duration of the fade transition in ms (default: 150) */
  duration?: number;
}

/**
 * A wrapper component that provides smooth fade transitions for tab content.
 * Handles mounting/unmounting with proper animation timing.
 */
export function TabContent({
  isActive,
  children,
  className = '',
  duration = 150,
}: TabContentProps) {
  const [shouldRender, setShouldRender] = useState(isActive);
  const [opacity, setOpacity] = useState(isActive ? 1 : 0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (isActive) {
      // Show: mount immediately, then fade in
      setShouldRender(true);
      // Use requestAnimationFrame to ensure the element is mounted before fading in
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setOpacity(1);
        });
      });
    } else {
      // Hide: fade out, then unmount
      setOpacity(0);
      timeoutRef.current = setTimeout(() => {
        setShouldRender(false);
      }, duration);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isActive, duration]);

  if (!shouldRender) {
    return null;
  }

  return (
    <div
      className={className}
      style={{
        opacity,
        transition: `opacity ${duration}ms ease-in-out`,
      }}
    >
      {children}
    </div>
  );
}

export default TabContent;
