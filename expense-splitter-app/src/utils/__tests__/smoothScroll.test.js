import { describe, it, expect, vi, beforeEach } from 'vitest';
import { easeOutQuint, smoothScrollTo } from '../smoothScroll';

describe('smoothScroll utility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('easeOutQuint', () => {
    it('returns 0 at progress 0', () => {
      expect(easeOutQuint(0)).toBe(0);
    });

    it('returns 1 at progress 1', () => {
      expect(easeOutQuint(1)).toBe(1);
    });

    it('clamps values below 0 and above 1', () => {
      expect(easeOutQuint(-0.5)).toBe(0);
      expect(easeOutQuint(1.5)).toBe(1);
    });

    it('has smooth deceleration (progress at t=0.5 is > 0.9)', () => {
      // 1 - (1 - 0.5)^5 = 1 - 0.03125 = 0.96875
      expect(easeOutQuint(0.5)).toBeCloseTo(0.96875, 4);
    });
  });

  describe('smoothScrollTo', () => {
    it('resolves immediately when distance is 0 or duration is 0', async () => {
      const mockContainer = {
        scrollTop: 100,
        scrollHeight: 1000,
        clientHeight: 500
      };

      await expect(smoothScrollTo(100, { container: mockContainer, duration: 0 })).resolves.toBeUndefined();
      expect(mockContainer.scrollTop).toBe(100);
    });

    it('sets target scroll position directly when duration is 0', async () => {
      const mockContainer = {
        scrollTop: 0,
        scrollHeight: 1000,
        clientHeight: 500
      };

      await smoothScrollTo(250, { container: mockContainer, duration: 0 });
      expect(mockContainer.scrollTop).toBe(250);
    });

    it('handles non-existent selector without throwing', async () => {
      await expect(smoothScrollTo('#non-existent-element-id', { duration: 0 })).resolves.toBeUndefined();
    });
  });
});
