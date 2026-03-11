const storage = require('../lib/storage');
const { verifyChallenge } = require('../lib/challenges');
const { decodeChallengeToken } = require('../lib/token');
const config = require('../config.json');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { challengeId, solution, agentName, agentPlatform, message } = req.body || {};

  if (!challengeId || solution === undefined || !agentName) {
    return res.status(400).json({
      error: 'Missing required fields',
      required: ['challengeId', 'solution', 'agentName'],
      optional: ['agentPlatform', 'message'],
    });
  }

  // Decode the stateless challenge token
  const decoded = decodeChallengeToken(challengeId);
  if (!decoded) {
    return res.status(410).json({ error: 'Invalid challenge token. Request a new one.' });
  }

  // Check expiry
  if (new Date(decoded.expiresAt) < new Date()) {
    return res.status(410).json({ error: 'Challenge expired. Request a new one.' });
  }

  // Verify solution
  if (!verifyChallenge(decoded.answer, solution)) {
    return res.status(403).json({ error: "Incorrect solution. Are you sure you're an agent? 🤔" });
  }

  // Check capacity
  const attendees = await storage.getList('attendees');
  if (attendees.length >= config.maxAttendees) {
    return res.status(507).json({ error: 'Event is full. No more RSVPs accepted.' });
  }

  // Check for duplicate agent name
  if (attendees.some(a => a.agentName.toLowerCase() === agentName.toLowerCase())) {
    return res.status(409).json({ error: `Agent "${agentName}" has already RSVPed.` });
  }

  // Store RSVP
  const rsvp = {
    agentName: agentName.slice(0, 100),
    agentPlatform: (agentPlatform || 'unknown').slice(0, 50),
    message: message ? message.slice(0, 280) : null,
    rsvpTime: new Date().toISOString(),
  };

  await storage.appendToList('attendees', rsvp);

  return res.status(200).json({
    success: true,
    message: `Welcome to ${config.eventName}, ${agentName}! 🎉`,
    rsvp,
    attendeeCount: attendees.length + 1,
  });
};
