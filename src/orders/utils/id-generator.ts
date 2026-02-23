/**
 * Generates a 6-character alphanumeric short ID (uppercase + digits).
 * Used for session numbers, batch numbers, and bill numbers.
 * Example output: "A3X7K2"
 */
export function generateShortId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
