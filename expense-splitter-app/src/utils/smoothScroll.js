import { useEffect, useState, useRef } from 'react';
import { useMotionValue } from 'framer-motion';

/**
 * Quintic ease-out easing function: 1 - (1 - t)^5
 * Starts fast and decelerates with a luxurious, silky deceleration curve.
 */
export const easeOutQuint = (t) => 1 - Math.pow(1 - Math.min(Math.max(t, 0), 1), 5);

/**
 * Programmatic quintic ease-out scroll helper
 *
 * @param {number|HTMLElement|string} target - Scroll position in px, HTMLElement, or CSS selector
 * @param {object} options
 * @param {HTMLElement|null} options.container - Scrollable container (defaults to window / scrollingElement)
 * @param {number} options.offset - Pixel offset to adjust final scroll position (default: 0)
 * @param {number} options.duration - Duration in ms (default: 500)
 * @returns {Promise<void>}
 */
let activeScrollAnimation = null;

export const smoothScrollTo = (target, options = {}) => {
  const {
    container = null,
    offset = 0,
    duration = 500
  } = options;

  if (typeof window === 'undefined') return Promise.resolve();

  // Cancel any running programmatic animation
  if (activeScrollAnimation && typeof activeScrollAnimation.cancel === 'function') {
    activeScrollAnimation.cancel();
    activeScrollAnimation = null;
  }

  const isWindowContainer = !container || container === window || container === document.documentElement || container === document.body;
  const targetContainer = isWindowContainer ? (document.scrollingElement || document.documentElement || document.body) : container;

  const startPos = isWindowContainer ? (window.pageYOffset || document.documentElement.scrollTop || 0) : targetContainer.scrollTop;

  let endPos = 0;
  if (typeof target === 'number') {
    endPos = target + offset;
  } else {
    let el = null;
    if (typeof target === 'string') {
      try {
        el = document.querySelector(target);
      } catch {
        el = null;
      }
    } else if (target && target.nodeType === 1) {
      el = target;
    }

    if (!el) {
      return Promise.resolve();
    }

    if (isWindowContainer) {
      const rect = el.getBoundingClientRect();
      endPos = rect.top + (window.pageYOffset || document.documentElement.scrollTop || 0) + offset;
    } else {
      const containerRect = targetContainer.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      endPos = elRect.top - containerRect.top + targetContainer.scrollTop + offset;
    }
  }

  const maxScroll = isWindowContainer
    ? Math.max(0, document.documentElement.scrollHeight - window.innerHeight)
    : Math.max(0, targetContainer.scrollHeight - targetContainer.clientHeight);

  const finalTarget = Math.max(0, Math.min(endPos, maxScroll));
  const distance = finalTarget - startPos;

  if (Math.abs(distance) < 1 || duration <= 0) {
    if (isWindowContainer) {
      window.scrollTo(0, finalTarget);
    } else {
      targetContainer.scrollTop = finalTarget;
    }
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const startTime = performance.now();
    let cancelled = false;

    const tick = (now) => {
      if (cancelled) {
        resolve();
        return;
      }

      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = easeOutQuint(progress);
      const currentScroll = startPos + distance * ease;

      if (isWindowContainer) {
        window.scrollTo(0, currentScroll);
      } else {
        targetContainer.scrollTop = currentScroll;
      }

      if (progress < 1) {
        const rafId = requestAnimationFrame(tick);
        activeScrollAnimation = {
          cancel: () => {
            cancelled = true;
            cancelAnimationFrame(rafId);
          }
        };
      } else {
        activeScrollAnimation = null;
        resolve();
      }
    };

    const rafId = requestAnimationFrame(tick);
    activeScrollAnimation = {
      cancel: () => {
        cancelled = true;
        cancelAnimationFrame(rafId);
      }
    };
  });
};

/**
 * Inertial wheel smoothing hook
 * Intercepts wheel events on the container or window and applies inertial momentum smoothing.
 *
 * @param {React.RefObject<HTMLElement>|null} containerRef - Ref to scrollable container (null for window)
 * @param {boolean} enabled - Whether smooth scrolling is enabled
 */
export const useSmoothScroll = (containerRef = null, enabled = true) => {
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    // Check user preference for reduced motion
    const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const getElement = () => {
      if (containerRef && containerRef.current) return containerRef.current;
      return window;
    };

    const targetEl = getElement();
    if (!targetEl) return;

    const isWindow = targetEl === window;
    const scrollEl = isWindow ? (document.scrollingElement || document.documentElement || document.body) : targetEl;

    let targetScroll = isWindow ? (window.pageYOffset || scrollEl.scrollTop || 0) : scrollEl.scrollTop;
    let currentScroll = targetScroll;
    let isRunning = false;
    let rafId = null;

    const getMaxScroll = () => {
      if (isWindow) {
        return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      }
      return Math.max(0, scrollEl.scrollHeight - scrollEl.clientHeight);
    };

    const updateScroll = () => {
      const maxScroll = getMaxScroll();
      targetScroll = Math.max(0, Math.min(targetScroll, maxScroll));

      // Inertial damping interpolation
      const delta = targetScroll - currentScroll;
      if (Math.abs(delta) > 0.5) {
        currentScroll += delta * 0.12;
        if (isWindow) {
          window.scrollTo(0, currentScroll);
        } else {
          scrollEl.scrollTop = currentScroll;
        }
        rafId = requestAnimationFrame(updateScroll);
      } else {
        currentScroll = targetScroll;
        if (isWindow) {
          window.scrollTo(0, currentScroll);
        } else {
          scrollEl.scrollTop = currentScroll;
        }
        isRunning = false;
      }
    };

    const handleWheel = (e) => {
      // Don't intercept horizontal scrolling, pinch zoom (ctrl/meta), or non-vertical wheel
      if (e.ctrlKey || e.metaKey || e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        return;
      }

      const maxScroll = getMaxScroll();
      if (maxScroll <= 0) return;

      const currentActual = isWindow ? (window.pageYOffset || scrollEl.scrollTop || 0) : scrollEl.scrollTop;

      // Sync if user dragged scrollbar or scrolled externally
      if (!isRunning) {
        currentScroll = currentActual;
        targetScroll = currentActual;
      }

      // Delta normalization: handle line / page delta modes
      let delta = e.deltaY;
      if (e.deltaMode === 1) delta *= 32;
      else if (e.deltaMode === 2) delta *= window.innerHeight;

      const nextTarget = Math.max(0, Math.min(targetScroll + delta, maxScroll));

      // Only preventDefault if we are actually scrolling within bounds
      if ((delta > 0 && currentActual < maxScroll) || (delta < 0 && currentActual > 0)) {
        e.preventDefault();
        targetScroll = nextTarget;

        if (!isRunning) {
          isRunning = true;
          rafId = requestAnimationFrame(updateScroll);
        }
      }
    };

    targetEl.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      targetEl.removeEventListener('wheel', handleWheel);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [containerRef, enabled]);
};

/**
 * Scroll progress indicator hook
 *
 * @param {number} threshold - Scroll threshold in px for `scrolled` state (default: 20)
 * @param {React.RefObject<HTMLElement>|null} containerRef - Container to measure (null for window)
 * @returns {{ progress: import('framer-motion').MotionValue<number>, scrolled: boolean }}
 */
export const useScrollProgress = (threshold = 20, containerRef = null) => {
  const progress = useMotionValue(0);
  const [scrolled, setScrolled] = useState(false);
  const scrolledRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const isWindow = !containerRef || !containerRef.current;
    const target = isWindow ? window : containerRef.current;
    if (!target) return;

    const scrollEl = isWindow ? (document.scrollingElement || document.documentElement || document.body) : target;

    const handleScroll = () => {
      const scrollTop = isWindow ? (window.pageYOffset || scrollEl.scrollTop || 0) : scrollEl.scrollTop;
      const maxScroll = isWindow
        ? Math.max(1, document.documentElement.scrollHeight - window.innerHeight)
        : Math.max(1, scrollEl.scrollHeight - scrollEl.clientHeight);

      const ratio = Math.max(0, Math.min(scrollTop / maxScroll, 1));
      progress.set(ratio);

      const isPastThreshold = scrollTop > threshold;
      if (isPastThreshold !== scrolledRef.current) {
        scrolledRef.current = isPastThreshold;
        setScrolled(isPastThreshold);
      }
    };

    handleScroll();
    target.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      target.removeEventListener('scroll', handleScroll);
    };
  }, [threshold, containerRef, progress]);

  return { progress, scrolled };
};

export default {
  easeOutQuint,
  smoothScrollTo,
  useSmoothScroll,
  useScrollProgress
};
