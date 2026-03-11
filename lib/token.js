const crypto = require('crypto');

// Server-side secret for signing challenge tokens
// In production, set CHALLENGE_SECRET env var
const SECRET = process.env.CHALLENGE_SECRET || 'agent-rsvp-default-secret-change-me';

/**
 * Create a signed, opaque challenge token containing the answer and expiry.
 * This makes challenges stateless — no shared storage needed.
 */
function createChallengeToken(answer, expiresAt) {
  const payload = JSON.stringify({ answer: String(answer), expiresAt, nonce: crypto.randomUUID() });
  const iv = crypto.randomBytes(16);
  const key = crypto.scryptSync(SECRET, 'salt', 32);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(payload, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  // Token = iv:encrypted
  return iv.toString('hex') + ':' + encrypted;
}

/**
 * Decode and verify a challenge token.
 * Returns { answer, expiresAt } or null if invalid.
 */
function decodeChallengeToken(token) {
  try {
    const [ivHex, encrypted] = token.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const key = crypto.scryptSync(SECRET, 'salt', 32);
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return JSON.parse(decrypted);
  } catch {
    return null;
  }
}

module.exports = { createChallengeToken, decodeChallengeToken };
