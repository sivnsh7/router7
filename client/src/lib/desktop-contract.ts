/**
 * Desktop bridge contract — single source of truth for:
 *   • the window globals contextBridge.exposeInMainWorld injects (desktop/src/preload.ts)
 *   • the localStorage token key written by preload and read by api.ts
 *   • the custom DOM event name for session expiry
 *
 * IMPORTANT: The string literals here are load-bearing across the Electron IPC
 * boundary. Changing them requires a simultaneous update of both
 * desktop/src/preload.ts and every renderer consumer that imports this file.
 * Add a contract test that imports this module and asserts the values match
 * what the bundled preload.js actually passes to exposeInMainWorld.
 */

/** Names under which preload.ts calls contextBridge.exposeInMainWorld. */
export const DESKTOP_GLOBALS = {
  DESKTOP:  '__ROUTER7_DESKTOP__',
  PLATFORM: '__ROUTER7_PLATFORM__',
  SESSION:  '__ROUTER7_SESSION__',
  VERSION:  '__ROUTER7_VERSION__',
} as const

/**
 * localStorage key written by preload.ts (via window.localStorage.setItem)
 * and read by getToken() in api.ts. Both sides must use this constant.
 */
export const DESKTOP_TOKEN_KEY = 'router7_dashboard_token'

/**
 * CustomEvent type dispatched on window when the dashboard session expires.
 * All addEventListener / dispatchEvent calls must import this so the string
 * cannot drift between producers and consumers.
 */
export const UNAUTHORIZED_EVENT = 'router7:unauthorized'

/** Typed overlay for window inside the Electron renderer. */
export type DesktopWindow = Window & {
  /** Set to true by preload before the renderer mounts. */
  [DESKTOP_GLOBALS.DESKTOP]?: boolean
  /** process.platform forwarded from the main process. */
  [DESKTOP_GLOBALS.PLATFORM]?: string
  /** Calls the main-process IPC handler to obtain a fresh session token. */
  [DESKTOP_GLOBALS.SESSION]?: () => Promise<string>
  /** Semver build version forwarded from the main process, or null. */
  [DESKTOP_GLOBALS.VERSION]?: string | null
}
