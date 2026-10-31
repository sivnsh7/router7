export const COMMAND_PALETTE_EVENT = 'router7:command-palette'

export function openCommandPalette() {
  window.dispatchEvent(new CustomEvent(COMMAND_PALETTE_EVENT))
}
