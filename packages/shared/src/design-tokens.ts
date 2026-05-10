/**
 * Class Models — premium look (referentie huidige site; aanpasbaar via thema-API later)
 */
export const cmDesign = {
  colors: {
    ink: '#080516',
    burgundy: '#6f121b',
    burgundyDeep: '#851018',
    muted: '#667085',
    /** Iets warmere neutrale rand / vlakken (burgundy-tint i.p.v. koud grijs-blauw). */
    line: '#e0d6d9',
    panel: '#f9f5f6',
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
