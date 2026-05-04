/**
 * Parses docId and pageId from a ClickUp doc URL.
 * Exported for use in DocsPage chat navigation.
 *
 * Formats:
 *   https://doc.clickup.com/{teamId}/d/h/{docId}/{pageId}
 *   https://doc.clickup.com/{teamId}/d/h/{docId}/{hash}/{pageId}
 */
export function parseClickUpUrl(url: string): { docId: string; pageId: string } | null {
  try {
    const { pathname } = new URL(url);
    const parts = pathname.split('/').filter(Boolean);
    if (parts.length < 5 || parts[1] !== 'd' || parts[2] !== 'h') return null;
    const docId = parts[3];
    const pageId = parts[parts.length - 1];
    return { docId, pageId };
  } catch {
    return null;
  }
}
