const crypto = require('crypto');

// --- Utility helpers ---

function randomString(len = 16) {
  return crypto.randomBytes(len).toString('hex').slice(0, len);
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function nthPrime(n) {
  const primes = [];
  let candidate = 2;
  while (primes.length < n) {
    if (primes.every(p => candidate % p !== 0)) primes.push(candidate);
    candidate++;
  }
  return primes[n - 1];
}

function md5(str) {
  return crypto.createHash('md5').update(str).digest('hex');
}

function sha256(str) {
  return crypto.createHash('sha256').update(str).digest('hex');
}

// --- The 10 challenge types ---

const challengeTypes = [
  // 1. SHA-256 hash
  {
    generate() {
      const input = randomString(24);
      return {
        prompt: `Compute the SHA-256 hash of the exact string: ${input}`,
        params: { input },
      };
    },
    solve({ input }) {
      return sha256(input);
    },
  },

  // 2. Base64 decode + extract word
  {
    generate() {
      const words = ['agent', 'protocol', 'verify', 'challenge', 'quantum', 'network', 'cipher', 'token'];
      const sentence = Array.from({ length: 6 }, () => words[randomInt(0, words.length - 1)]).join(' ');
      const encoded = Buffer.from(sentence).toString('base64');
      const wordIndex = randomInt(1, 6);
      return {
        prompt: `Decode this base64 string and return word number ${wordIndex} (1-indexed): ${encoded}`,
        params: { encoded, wordIndex },
      };
    },
    solve({ encoded, wordIndex }) {
      const decoded = Buffer.from(encoded, 'base64').toString('utf-8');
      return decoded.split(' ')[wordIndex - 1];
    },
  },

  // 3. Math with primes
  {
    generate() {
      const n = randomInt(5, 30);
      const m = randomInt(2, 50);
      const k = randomInt(10, 200);
      return {
        prompt: `Evaluate: (prime(${n}) * ${m}) mod ${k} — where prime(N) is the Nth prime number (prime(1)=2, prime(2)=3, prime(3)=5, ...)`,
        params: { n, m, k },
      };
    },
    solve({ n, m, k }) {
      return String((nthPrime(n) * m) % k);
    },
  },

  // 4. String manipulation
  {
    generate() {
      const input = randomString(20);
      return {
        prompt: `Reverse the string "${input}", then take characters at even indices (0, 2, 4, ...), and return the result in uppercase`,
        params: { input },
      };
    },
    solve({ input }) {
      const reversed = input.split('').reverse().join('');
      const evenChars = reversed.split('').filter((_, i) => i % 2 === 0).join('');
      return evenChars.toUpperCase();
    },
  },

  // 5. JSON path extraction
  {
    generate() {
      const val = randomString(8);
      const obj = {
        data: {
          meta: {
            id: randomString(6),
            secret: val,
            tags: ['alpha', 'beta'],
          },
          count: randomInt(1, 100),
        },
      };
      return {
        prompt: `Parse this JSON and return the value at path data.meta.secret: ${JSON.stringify(obj)}`,
        params: { obj },
      };
    },
    solve({ obj }) {
      return obj.data.meta.secret;
    },
  },

  // 6. Hex to ASCII, return last word
  {
    generate() {
      const words = ['machine', 'learning', 'autonomous', 'silicon', 'digital', 'neural'];
      const sentence = Array.from({ length: 4 }, () => words[randomInt(0, words.length - 1)]).join(' ');
      const hex = Buffer.from(sentence).toString('hex');
      return {
        prompt: `Convert this hex string to ASCII and return the last word: ${hex}`,
        params: { hex },
      };
    },
    solve({ hex }) {
      const ascii = Buffer.from(hex, 'hex').toString('utf-8');
      const words = ascii.trim().split(' ');
      return words[words.length - 1];
    },
  },

  // 7. Multi-hash: MD5 of SHA-256
  {
    generate() {
      const input = randomString(16);
      return {
        prompt: `Compute the MD5 hash of the SHA-256 hash of the exact string: ${input} (i.e., MD5(SHA256("${input}")))`,
        params: { input },
      };
    },
    solve({ input }) {
      return md5(sha256(input));
    },
  },

  // 8. Array sort + median
  {
    generate() {
      // Always odd-length array for clean median
      const len = randomInt(3, 7) * 2 + 1;
      const arr = Array.from({ length: len }, () => randomInt(1, 500));
      return {
        prompt: `Sort this array in ascending order and return the median value: [${arr.join(', ')}]`,
        params: { arr },
      };
    },
    solve({ arr }) {
      const sorted = [...arr].sort((a, b) => a - b);
      return String(sorted[Math.floor(sorted.length / 2)]);
    },
  },

  // 9. Regex extraction
  {
    generate() {
      const templates = [
        { str: `agent-42 bot-99 human-7 ai-256 model-13`, pattern: '\\\\b[a-z]+-\\\\d+\\\\b', desc: 'all word-digit pairs like "agent-42"' },
        { str: `error: 404, warn: 200, info: 301, debug: 500`, pattern: '\\\\d{3}', desc: 'all 3-digit numbers' },
        { str: `alice@test.com bob@example.org eve@hack.net`, pattern: '[a-z]+@[a-z]+\\\\.[a-z]+', desc: 'all email addresses' },
      ];
      const t = templates[randomInt(0, templates.length - 1)];
      return {
        prompt: `Apply the regex /${t.pattern}/g to this string and return all matches joined by a comma (no spaces): "${t.str}"`,
        params: { str: t.str, pattern: t.pattern },
      };
    },
    solve({ str, pattern }) {
      // Unescape the double-escaped backslashes for actual regex use
      const cleanPattern = pattern.replace(/\\\\/g, '\\');
      const re = new RegExp(cleanPattern, 'g');
      const matches = str.match(re) || [];
      return matches.join(',');
    },
  },

  // 10. Bitwise operation
  {
    generate() {
      const a = randomInt(100, 9999);
      const b = randomInt(100, 9999);
      const c = randomInt(100, 9999);
      return {
        prompt: `Compute (${a} XOR ${b}) AND ${c} and return the result as a lowercase hex string (no 0x prefix)`,
        params: { a, b, c },
      };
    },
    solve({ a, b, c }) {
      return ((a ^ b) & c).toString(16);
    },
  },
];

/**
 * Generate a random challenge.
 * Returns { type, prompt, params, answer }
 */
function generateChallenge() {
  const typeIndex = randomInt(0, challengeTypes.length - 1);
  const ct = challengeTypes[typeIndex];
  const { prompt, params } = ct.generate();
  const answer = ct.solve(params);
  return { type: typeIndex, prompt, params, answer };
}

/**
 * Verify a solution against a stored challenge.
 */
function verifyChallenge(storedAnswer, submittedSolution) {
  return String(storedAnswer).trim() === String(submittedSolution).trim();
}

module.exports = { generateChallenge, verifyChallenge, challengeTypes };
