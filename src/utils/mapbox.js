const DEFAULT_STYLE = 'mapbox/streets-v12';
const DEFAULT_ATTRIBUTION =
  'Map data © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>';

function normalizeStyle(style) {
  if (!style) return DEFAULT_STYLE;
  const trimmed = style.trim();
  if (!trimmed) return DEFAULT_STYLE;
  if (trimmed.startsWith('mapbox://styles/')) {
    return trimmed.replace('mapbox://styles/', '');
  }
  if (trimmed.startsWith('styles/')) {
    return trimmed.replace('styles/', '');
  }
  return trimmed;
}

export function getMapboxTileLayer(styleOverride) {
  const token = (process.env.REACT_APP_MAPBOX_ACCESS_TOKEN || '').trim();
  if (!token) return null;
  const style = normalizeStyle(styleOverride || process.env.REACT_APP_MAPBOX_STYLE_URL);
  return {
    url: `https://api.mapbox.com/styles/v1/${style}/tiles/256/{z}/{x}/{y}?access_token=${token}`,
    attribution: DEFAULT_ATTRIBUTION,
  };
}

export { DEFAULT_ATTRIBUTION };
