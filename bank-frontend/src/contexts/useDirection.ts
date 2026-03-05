import { useContext } from 'react';
import DirectionContext from './ThemeContext';

export function useDirection() {
  const ctx = useContext(DirectionContext);
  if (!ctx) throw new Error('useDirection must be used within DirectionProvider');
  return ctx;
}
