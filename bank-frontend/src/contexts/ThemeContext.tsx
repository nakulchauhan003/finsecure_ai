import { createContext, useState, useEffect, ReactNode } from 'react';

/**
 * RTL/Direction context — complements next-themes (which handles dark/light).
 * Usage: wrap app with <DirectionProvider> and call useDirection() in components.
 */

type Direction = 'ltr' | 'rtl';

interface DirectionContextType {
  direction: Direction;
  toggleDirection: () => void;
  setDirection: (dir: Direction) => void;
  isRTL: boolean;
}

const DirectionContext = createContext<DirectionContextType | null>(null);

export function DirectionProvider({ children }: { children: ReactNode }) {
  const [direction, setDirectionState] = useState<Direction>(() => {
    const saved = localStorage.getItem('finscope_dir');
    return (saved as Direction) || 'ltr';
  });

  useEffect(() => {
    document.documentElement.dir = direction;
    localStorage.setItem('finscope_dir', direction);
  }, [direction]);

  const toggleDirection = () => setDirectionState(prev => prev === 'ltr' ? 'rtl' : 'ltr');
  const setDirection = (d: Direction) => setDirectionState(d);

  return (
    <DirectionContext.Provider value={{ direction, toggleDirection, setDirection, isRTL: direction === 'rtl' }}>
      {children}
    </DirectionContext.Provider>
  );
}

export default DirectionContext;
