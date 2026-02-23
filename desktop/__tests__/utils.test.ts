import { describe, it, expect } from 'vitest';
import { cn } from '../src/lib/utils';

describe('cn utility', () => {
  // Test Case: Ensures tailwind-merge correctly prioritizes conflicting classes
  it('should merge tailwind classes', () => {
    expect(cn('px-2', 'py-2')).toBe('px-2 py-2');
    // Expectation: 'px-4' should overwrite 'px-2' to prevent style bloat/conflicts
    expect(cn('px-2', 'px-4')).toBe('px-4'); 
  });

  // Test Case: Verifies clsx integration for boolean flags in class strings
  it('should handle conditional classes', () => {
    expect(cn('px-2', true && 'py-2', false && 'm-2')).toBe('px-2 py-2');
  });
});

