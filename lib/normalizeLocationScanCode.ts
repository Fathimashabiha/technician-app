/** Extract LQR-… code from raw scan text or location scan URLs. */
export function normalizeLocationScanCode(raw: string): string {
  let code = raw.trim();
  if (!code) return code;

  try {
    if (/^https?:\/\//i.test(code)) {
      const url = new URL(code);
      const fromPath = extractCodeFromPath(url.pathname);
      if (fromPath) return fromPath;
    } else if (code.startsWith('/')) {
      const url = new URL(code, 'http://scan.local');
      const fromPath = extractCodeFromPath(url.pathname);
      if (fromPath) return fromPath;
    }
  } catch {
    // not a URL
  }

  const embedded = code.match(/\/locations\/scan\/([^?#/]+)/i);
  if (embedded?.[1]) return decodeURIComponent(embedded[1]);

  return code;
}

function extractCodeFromPath(pathname: string): string | null {
  const match = pathname.match(/\/locations\/scan\/([^/]+)/i);
  if (match?.[1]) return decodeURIComponent(match[1]);
  return null;
}
