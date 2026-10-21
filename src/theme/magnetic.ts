/**
 * Magnetic blue-dark palette for the 3D scene and HTML overlays.
 * Values come from the Magnetic reference app (blue-dark) computed styles;
 * keep in sync with the `--mg-*` custom properties in index.css.
 */
export const MAGNETIC = {
  page: '#1b232d',
  surface: '#23282e',
  surfaceGlass: 'rgba(35, 40, 46, 0.92)',
  border: '#3f4a57',
  borderStrong: '#656c75',
  text: '#f7f7f7',
  text2: '#c8d1dc',
  text3: '#9da7b4',
  accent: '#2774d9',
  accentHover: '#0d5cbd',
  focus: '#3e84e5',
  accentOnDark: '#649ef5',
  glowBlue: '#233a64',
  glowMagenta: '#4d3246',
  floor: '#151b23',
  dome: '#3f4a57',
  font:
    "'Inter Variable', Inter, 'CiscoSansTT', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
} as const
