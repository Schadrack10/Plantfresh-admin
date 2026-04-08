export function getSubdomain(): string | null {
  const host = window.location.hostname;
  if (host.endsWith('.localhost')) return host.split('.')[0];
  const parts = host.split('.');
  if (parts.length >= 3) return parts[0];
  return null;
}