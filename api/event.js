const storage = require('../lib/storage');
const config = require('../config.json');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const attendees = await storage.getList('attendees');

  return res.status(200).json({
    eventName: config.eventName,
    eventDate: config.eventDate,
    eventDescription: config.eventDescription,
    maxAttendees: config.maxAttendees,
    currentAttendees: attendees.length,
    spotsRemaining: config.maxAttendees - attendees.length,
  });
};
