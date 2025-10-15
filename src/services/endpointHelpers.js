const HTTP_PATTERN = /^https?:\/\//i;

const normalizeEndpoint = (path) => {
  if (!path) return '';
  if (HTTP_PATTERN.test(path)) {
    return path.replace(/\/+$/, '');
  }
  const trimmed = path.trim();
  if (!trimmed) return '';
  const withLeadingSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return withLeadingSlash.replace(/\/+$/, '');
};

export const resolvePath = (...candidates) => {
  for (const candidate of candidates) {
    const resolved = normalizeEndpoint(candidate);
    if (resolved) {
      return resolved;
    }
  }
  return '';
};

export const pathWithId = (id, ...candidates) => {
  for (const candidate of candidates) {
    const resolved = normalizeEndpoint(candidate);
    if (!resolved) continue;
    if (resolved.includes(':id')) {
      return resolved.replace(':id', id);
    }
    return `${resolved}/${id}`;
  }
  return '';
};
