function normalizeOrigin(raw?: string): string | null {
  if (!raw) return null;

  try {
    return new URL(raw).origin;
  } catch {
    try {
      return new URL(`http://${raw}`).origin;
    } catch {
      return null;
    }
  }
}

export function resolveApiUrl(path: string): string {
  const origin = normalizeOrigin(process.env.NEXT_PUBLIC_API_URL);
  if (origin) {
    return new URL(path, `${origin}/`).toString();
  }

  if (typeof window !== 'undefined') {
    return new URL(path, window.location.origin).toString();
  }

  return path;
}

export function resolveWebSocketUrl(path: string): string {
  const browserOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  const configuredOrigin = normalizeOrigin(process.env.NEXT_PUBLIC_CENTRAL_SERVER_URL);
  const baseOrigin = configuredOrigin ?? browserOrigin;
  const httpUrl = new URL(path, `${baseOrigin}/`);

  httpUrl.protocol = httpUrl.protocol === 'https:' ? 'wss:' : 'ws:';
  return httpUrl.toString();
}
