export interface WebFaviconPalette {
  readonly background: string;
  readonly foreground: string;
  readonly border: string;
  readonly accent: string;
}

const SVG_DATA_URL_PREFIX = "data:image/svg+xml,";

const CHIP8NX_MARK_PATH = `
  M2 0h1v1H2z M8 0h1v1H8z
  M3 1h1v1H3z M7 1h1v1H7z
  M2 2h7v1H2z
  M1 3h2v1H1z M4 3h3v1H4z M8 3h2v1H8z
  M0 4h11v1H0z
  M0 5h1v1H0z M2 5h7v1H2z M10 5h1v1h-1z
  M0 6h1v1H0z M2 6h1v1H2z M8 6h1v1H8z M10 6h1v1h-1z
  M3 7h2v1H3z M6 7h2v1H6z
`.trim();

/**
 * Creates a theme-aware SVG favicon for the Chip8NX Web application.
 *
 * @remarks
 * The favicon deliberately uses the same semantic palette as the Web UI
 * rather than owning brand-specific colors. This keeps the application
 * identity consistent across every supported theme.
 */
export function createWebFaviconDataUrl(palette: WebFaviconPalette): string {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" shape-rendering="crispEdges">
      <rect width="32" height="32" rx="5" fill="${palette.background}"/>
      <rect x="1" y="1" width="30" height="30" rx="4" fill="none" stroke="${palette.border}" stroke-width="2"/>

      <g transform="translate(5 5) scale(2)" fill="${palette.foreground}">
        <path d="${CHIP8NX_MARK_PATH}" />
      </g>

      <rect x="6" y="26" width="20" height="2" fill="${palette.accent}"/>
    </svg>
  `.trim();

  return `${SVG_DATA_URL_PREFIX}${encodeURIComponent(svg)}`;
}
