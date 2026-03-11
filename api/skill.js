const fs = require('fs');
const path = require('path');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const skillPath = path.join(__dirname, '..', 'skill', 'SKILL.md');
  const content = fs.readFileSync(skillPath, 'utf-8');

  const format = req.query.format;
  if (format === 'json') {
    return res.status(200).json({ skill: content });
  }

  res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
  return res.status(200).send(content);
};
