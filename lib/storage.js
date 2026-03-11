/**
 * Storage abstraction — uses Vercel KV if available, falls back to file-based /tmp storage.
 * In-memory won't work on serverless (each invocation is isolated), so we use /tmp as a
 * shared filesystem cache within the same Vercel instance.
 */

const fs = require('fs');
const path = require('path');

let kv = null;

try {
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    kv = require('@vercel/kv').kv;
  }
} catch (_) {}

// File-based fallback using /tmp (persists across invocations on same instance)
const STORE_DIR = path.join('/tmp', 'agent-rsvp-store');

function ensureDir() {
  if (!fs.existsSync(STORE_DIR)) {
    fs.mkdirSync(STORE_DIR, { recursive: true });
  }
}

function filePath(key) {
  // Sanitize key for filesystem
  return path.join(STORE_DIR, encodeURIComponent(key) + '.json');
}

const fileStore = {
  get(key) {
    ensureDir();
    const fp = filePath(key);
    if (!fs.existsSync(fp)) return null;
    try {
      const data = JSON.parse(fs.readFileSync(fp, 'utf-8'));
      if (data.expireAt && Date.now() > data.expireAt) {
        fs.unlinkSync(fp);
        return null;
      }
      return data.value;
    } catch {
      return null;
    }
  },
  set(key, value, ttl) {
    ensureDir();
    const data = { value };
    if (ttl) data.expireAt = Date.now() + ttl * 1000;
    fs.writeFileSync(filePath(key), JSON.stringify(data));
  },
  del(key) {
    const fp = filePath(key);
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
  },
};

const storage = {
  async get(key) {
    if (kv) return kv.get(key);
    return fileStore.get(key);
  },

  async set(key, value, options = {}) {
    if (kv) {
      const kvOpts = {};
      if (options.ttl) kvOpts.ex = options.ttl;
      return kv.set(key, value, kvOpts);
    }
    fileStore.set(key, value, options.ttl);
  },

  async del(key) {
    if (kv) return kv.del(key);
    fileStore.del(key);
  },

  async appendToList(key, item) {
    if (kv) {
      const list = (await kv.get(key)) || [];
      list.push(item);
      await kv.set(key, list);
      return list;
    }
    const list = fileStore.get(key) || [];
    list.push(item);
    fileStore.set(key, list);
    return list;
  },

  async getList(key) {
    if (kv) return (await kv.get(key)) || [];
    return fileStore.get(key) || [];
  },
};

module.exports = storage;
