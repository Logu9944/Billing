/**
 * Utility functions for sanitizing inputs and preventing injection vulnerabilities.
 */

/**
 * Escapes special regex characters to prevent ReDoS (Regular Expression Denial of Service)
 * and regex syntax errors in MongoDB $regex queries.
 * @param {string} text - The raw query string
 * @returns {string} - Escaped string safe for $regex
 */
export function escapeRegex(text) {
  if (typeof text !== 'string') return '';
  // Limit search query length to 100 characters to prevent excessive processing
  const trimmed = text.trim().slice(0, 100);
  return trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Strips null bytes and dangerous control characters from user text input.
 * @param {string} input - Raw string input
 * @returns {string} - Cleaned string
 */
export function sanitizeText(input) {
  if (typeof input !== 'string') return '';
  return input.replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F]/g, '').trim();
}
