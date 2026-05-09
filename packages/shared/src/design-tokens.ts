/**
 * Class Models — premium look (referentie huidige site; aanpasbaar via thema-API later)
 */
export const cmDesign = {
  colors: {
    ink: '#080516',
    burgundy: '#6f121b',
    burgundyDeep: '#851018',
    muted: '#667085',
    line: '#d8dee7',
    panel: '#f7f8fb',
    white: '#ffffff',
    success: '#15934a',
    danger: '#b42318',
  },
  font: {
    serif: "Georgia, 'Times New Roman', serif",
    sans: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  },
  radius: {
    sm: '6px',
    md: '10px',
    lg: '14px',
  },
} as const;
