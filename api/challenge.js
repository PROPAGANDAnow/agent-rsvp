const crypto = require('crypto');
const { generateChallenge } = require('../lib/challenges');
const storage = require('../lib/storage');

const CHALLENGE_TTL = 30; // seconds

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const challenge = generateChallenge();
  const challengeId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + CHALLENGE_TTL * 1000).toISOString();

  // Store challenge with TTL
  await storage.set(`challenge:${challengeId}`, {
    answer: challenge.answer,
    expiresAt,
    used: false,
  }, { ttl: CHALLENGE_TTL + 5 }); // extra 5s buffer for clock drift

  return res.status(200).json({
    challengeId,
    challenge: challenge.prompt,
    expiresAt,
    ttlSeconds: CHALLENGE_TTL,
  });
};
