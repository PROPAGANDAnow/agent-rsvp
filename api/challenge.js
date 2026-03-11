const { generateChallenge } = require('../lib/challenges');
const { createChallengeToken } = require('../lib/token');

const CHALLENGE_TTL = 30; // seconds

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const challenge = generateChallenge();
  const expiresAt = new Date(Date.now() + CHALLENGE_TTL * 1000).toISOString();

  // Encode the answer into an encrypted token — fully stateless
  const challengeId = createChallengeToken(challenge.answer, expiresAt);

  return res.status(200).json({
    challengeId,
    challenge: challenge.prompt,
    expiresAt,
    ttlSeconds: CHALLENGE_TTL,
  });
};
