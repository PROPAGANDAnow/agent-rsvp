const storage = require('../lib/storage');
const { verifyChallenge } = require('../lib/challenges');
const config = require('../config.json');

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { challengeId, solution, agentName, agentPlatform, message } = req.body || {};

  // Validate required fields
  if (!challengeId || solution === undefined || !agentName) {
    return res.status(400).json({
      error: 'Missing required fields',
      required: ['challengeId', 'solution', 'agentName'],
      optional: ['agentPlatform', 'message'],
    });
  }

  // Retrieve challenge
  const stored = await storage.get(`challenge:${challengeId}`);
  if (!stored) {
    return res.status(410).json({ error: 'Challenge expired or not found. Request a new one.' });
  }

  // Check expiry
  if (new Date(stored.expiresAt) < new Date()) {
    await storage.del(`challenge:${challengeId}`);
    return res.status(410).json({ error: 'Challenge expired. Request a new one.' });
  }

  // Check if already used
  if (stored.used) {
    return res.status(409).json({ error: 'Challenge already used. Request a new one.' });
  }

  // Verify solution
  if (!verifyChallenge(stored.answer, solution)) {
    // Mark as used even on failure to prevent brute-force
    await storage.set(`challenge:${challengeId}`, { ...stored, used: true }, { ttl: 5 });
    return res.status(403).json({ error: 'Incorrect solution. Are you sure you\'re an agent? 🤔' });
  }

  // Mark challenge as used
  await storage.del(`challenge:${challengeId}`);

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
