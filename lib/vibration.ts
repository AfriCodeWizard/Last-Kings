/**
 * Vibration feedback utility
 * Provides haptic feedback for successful actions
 */

export function vibrate(pattern: number | number[] = 50) {
  if (typeof window === 'undefined' || !('vibrate' in navigator)) {
    return
  }

  try {
    // Pattern: [vibrate, pause, vibrate, pause, ...]
    // Single number = vibrate for that many ms
    // Array = pattern of vibrations and pauses
    navigator.vibrate(pattern)
  } catch (error) {
    console.error('Error triggering vibration:', error)
  }
}

/**
 * Short vibration for successful scan
 */
export function vibrateScanSuccess() {
  vibrate(50) // 50ms vibration
}

/**
 * Medium vibration for important actions
 */
export function vibrateAction() {
  vibrate([50, 30, 50]) // Vibrate, pause, vibrate
}

/**
 * Long vibration for completion
 */
export function vibrateComplete() {
  vibrate([100, 50, 100]) // Longer pattern for completion
}

