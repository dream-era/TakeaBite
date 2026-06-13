// Strip HTML tags and dangerous characters from text input
export function sanitizeText(input: string): string {
  if (!input) return ''
  return input
    .replace(/[<>]/g, '')           // Remove < and > (XSS)
    .replace(/javascript:/gi, '')    // Remove JS protocol
    .replace(/on\w+=/gi, '')         // Remove event handlers
    .trim()
}

// Sanitize for display in HTML (encode special chars)
export function escapeHtml(text: string): string {
  if (!text) return ''
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }
  return text.replace(/[&<>"']/g, m => map[m])
}

// Sanitize item name for kitchen display
export function sanitizeItemName(name: string): string {
  return sanitizeText(name).slice(0, 100)
}

// Sanitize special instructions
export function sanitizeInstructions(text: string): string {
  return sanitizeText(text).slice(0, 300)
}

// Validate UUID helper
export function isValidUUID(str: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}
