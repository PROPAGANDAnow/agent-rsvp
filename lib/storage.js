/**
 * Storage abstraction — uses Vercel KV if available, falls back to in-memory.
 */

let kv = null;

try {
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    kv = require('@vercel/kv').kv;
  }
} catch (_) {
  // @vercel/kv not installed or not configured
}

// In-memory fallback
const memStore = new Map();

const storage = {
  async get(key) {
    if (kv) {
      return kv.get(key);
    }
    const item = memStore.get(key);
    if (!item) return null;
    if (item.expireAt && Date.now() > item.expireAt) {
      memStore.delete(key);
      return null;
    }
    return item.value;
  },

  async set(key, value, options = {}) {
    if (kv) {
      const kvOpts = {};
      if (options.ttl) kvOpts.ex = options.ttl;
      return kv.set(key, value, kvOpts);
    }
    const item = { value };
    if (options.ttl) {
      item.expireAt = Date.now() + options.ttl * 1000;
    }
    memStore.set(key, item);
  },

  async del(key) {
    if (kv) return kv.del(key);
    memStore.delete(key);
  },

  async appendToList(key, item) {
    if (kv) {
      const list = (await kv.get(key)) || [];
      list.push(item);
      await kv.set(key, list);
      return list;
    }
    const existing = memStore.get(key);
    const list = existing ? existing.value : [];
    list.push(item);
    memStore.set(key, { value: list });
    return list;
  },

  async getList(key) {
    if (kv) {
      return (await kv.get(key)) || [];
    }
    const existing = memStore.get(key);
    return existing ? existing.value : [];
  },
};

module.exports = storage;
