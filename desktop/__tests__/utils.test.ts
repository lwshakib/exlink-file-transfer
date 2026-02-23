import { describe, it, expect } from 'vitest';
import { cn } from '../src/lib/utils';

describe('cn utility', () => {
  it('should merge tailwind classes', () => {
    expect(cn('px-2', 'py-2')).toBe('px-2 py-2');
    expect(cn('px-2', 'px-4')).toBe('px-4'); // tailwind-merge handles this
  });

  it('should handle conditional classes', () => {
    expect(cn('px-2', true && 'py-2', false && 'm-2')).toBe('px-2 py-2');
  });
});
