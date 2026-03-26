/**
 * Haptic feedback utilities.
 * navigator.vibrate is supported on Android Chrome and most Android WebViews.
 * iOS Safari intentionally ignores vibrate calls — all calls are safe no-ops on iOS.
 */
export const haptics = {
  tap:     () => navigator.vibrate?.(10),
  success: () => navigator.vibrate?.([10, 50, 10]),
  error:   () => navigator.vibrate?.([50, 30, 50]),
};
