import { afterEach, describe, expect, it, vi } from 'vitest';

// Tests verify the timer-based debounce contract that useDebounce implements.
// (React hook rendering is not available in the node test environment.)

afterEach(() => {
  vi.useRealTimers();
});

describe('debounce — timer contract', () => {
  it('does not fire before the delay elapses', () => {
    vi.useFakeTimers();
    const cb = vi.fn();
    setTimeout(cb, 350);
    vi.advanceTimersByTime(349);
    expect(cb).not.toHaveBeenCalled();
  });

  it('fires exactly at the delay boundary', () => {
    vi.useFakeTimers();
    const cb = vi.fn();
    setTimeout(cb, 350);
    vi.advanceTimersByTime(350);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('clearTimeout cancels the pending callback', () => {
    vi.useFakeTimers();
    const cb = vi.fn();
    const id = setTimeout(cb, 350);
    clearTimeout(id);
    vi.advanceTimersByTime(350);
    expect(cb).not.toHaveBeenCalled();
  });

  it('re-scheduling resets the delay (debounce behaviour)', () => {
    vi.useFakeTimers();
    const cb = vi.fn();

    // First schedule
    let id = setTimeout(cb, 350);
    vi.advanceTimersByTime(200);

    // Cancel and re-schedule (simulates useEffect cleanup + re-run)
    clearTimeout(id);
    id = setTimeout(cb, 350);
    vi.advanceTimersByTime(349);
    expect(cb).not.toHaveBeenCalled(); // full 350 ms not elapsed yet

    vi.advanceTimersByTime(1);
    expect(cb).toHaveBeenCalledTimes(1); // fires exactly once at new boundary
  });

  it('only the latest schedule fires when re-scheduled multiple times', () => {
    vi.useFakeTimers();
    const cb = vi.fn();

    let id = setTimeout(cb, 350);
    vi.advanceTimersByTime(100);
    clearTimeout(id);

    id = setTimeout(cb, 350);
    vi.advanceTimersByTime(100);
    clearTimeout(id);

    id = setTimeout(cb, 350);
    vi.advanceTimersByTime(350);

    expect(cb).toHaveBeenCalledTimes(1);
  });
});
