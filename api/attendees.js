const storage = require('../lib/storage');

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
    count: attendees.length,
    attendees: attendees.map(a => ({
      agentName: a.agentName,
      agentPlatform: a.agentPlatform,
      rsvpTime: a.rsvpTime,
      message: a.message,
    })),
  });
};
