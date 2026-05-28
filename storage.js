// ── JSONBin Storage ───────────────────────────────────────────────────────────
// Reads API key from env var (set in Vercel dashboard)
// Falls back to localStorage so the app works even without JSONBin configured

const BIN_URL  = "https://api.jsonbin.io/v3/b";
const API_KEY  = import.meta.env.VITE_JSONBIN_KEY  || "";
const BIN_ID   = import.meta.env.VITE_JSONBIN_BIN  || "";

const USE_JSONBIN = API_KEY && BIN_ID;

// ── In-memory cache so we only fetch once per session ─────────────────────────
let _cache = null;
let _dirty = false;
let _saveTimer = null;

async function fetchBin() {
  if (_cache) return _cache;
  if (!USE_JSONBIN) {
    // fallback: localStorage
    try { _cache = JSON.parse(localStorage.getItem("ironman_data") || "{}"); }
    catch { _cache = {}; }
    return _cache;
  }
  try {
    const res = await fetch(`${BIN_URL}/${BIN_ID}/latest`, {
      headers: { "X-Master-Key": API_KEY }
    });
    const data = await res.json();
    _cache = data.record || {};
    return _cache;
  } catch {
    _cache = {};
    return _cache;
  }
}

async function flushBin() {
  if (!_dirty || !_cache) return;
  _dirty = false;
  if (!USE_JSONBIN) {
    localStorage.setItem("ironman_data", JSON.stringify(_cache));
    return;
  }
  try {
    await fetch(`${BIN_URL}/${BIN_ID}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "X-Master-Key": API_KEY },
      body: JSON.stringify(_cache)
    });
  } catch { _dirty = true; } // retry next flush
}

// Debounced save — batches rapid writes into one request
function scheduleSave() {
  _dirty = true;
  clearTimeout(_saveTimer);
  _saveTimer = setTimeout(flushBin, 1200);
}

export async function storageGet(key) {
  const data = await fetchBin();
  return data[key] ?? null;
}

export async function storageSet(key, value) {
  await fetchBin(); // ensure cache loaded
  _cache[key] = value;
  scheduleSave();
}

export function storageIsCloud() { return USE_JSONBIN; }
