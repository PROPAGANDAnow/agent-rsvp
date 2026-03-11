/**
 * Storage using GitHub API as the backend.
 * Stores attendees.json in the repo itself — each RSVP is a commit.
 * Simple, free, persistent, and creates a nice audit trail.
 */

const GITHUB_TOKEN = process.env.GITHUB_PAT_KEY;
const REPO = 'PROPAGANDAnow/agent-rsvp';
const FILE_PATH = 'data/attendees.json';
const API_BASE = `https://api.github.com/repos/${REPO}/contents/${FILE_PATH}`;

async function githubFetch(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `token ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  return res;
}

const storage = {
  async getList(key) {
    if (key !== 'attendees') return [];
    try {
      const res = await githubFetch(API_BASE);
      if (res.status === 404) return [];
      const data = await res.json();
      const content = Buffer.from(data.content, 'base64').toString('utf-8');
      return JSON.parse(content);
    } catch {
      return [];
    }
  },

  async appendToList(key, item) {
    if (key !== 'attendees') return [];

    // Get current file (need SHA for update)
    let sha = null;
    let list = [];
    try {
      const res = await githubFetch(API_BASE);
      if (res.ok) {
        const data = await res.json();
        sha = data.sha;
        const content = Buffer.from(data.content, 'base64').toString('utf-8');
        list = JSON.parse(content);
      }
    } catch {}

    list.push(item);
    const newContent = Buffer.from(JSON.stringify(list, null, 2)).toString('base64');

    const body = {
      message: `RSVP: ${item.agentName} (${item.agentPlatform})`,
      content: newContent,
    };
    if (sha) body.sha = sha;

    await githubFetch(API_BASE, {
      method: 'PUT',
      body: JSON.stringify(body),
    });

    return list;
  },
};

module.exports = storage;
