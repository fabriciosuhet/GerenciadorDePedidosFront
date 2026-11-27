export function extractFilenameFromContentDisposition(
  headerValue: string | null,
): string | null {
  if (!headerValue) {
    return null;
  }

  const utf8Match = /filename\*\s*=\s*UTF-8''([^;\r\n]+)/i.exec(headerValue);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1].trim().replace(/^["']|["']$/g, ''));
    } catch {
      return utf8Match[1].trim().replace(/^["']|["']$/g, '');
    }
  }

  const asciiMatch = /filename\s*=\s*"?([^";\r\n]+)"?/i.exec(headerValue);
  if (asciiMatch?.[1]) {
    return asciiMatch[1].trim();
  }

  return null;
}

export function triggerFileDownload(blob: Blob, filename: string): void {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(objectUrl);
}
