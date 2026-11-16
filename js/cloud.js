// クラウド同期（Firestore の REST API）。families/{合言葉のハッシュ}/profiles/{プロフィールID} に1人1ドキュメント。
import { CLOUD } from './cloud-config.js';

export const cloudReady = () => !!(CLOUD.projectId && CLOUD.apiKey);
const base = () => `https://firestore.googleapis.com/v1/projects/${CLOUD.projectId}/databases/(default)/documents`;
const key = () => `key=${encodeURIComponent(CLOUD.apiKey)}`;

const famCache = {};
/** 合言葉そのものは送らず、ハッシュを置き場所の名前にする */
async function famId(code) {
  if (famCache[code]) return famCache[code];
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('kanji-kakitori:' + code.trim()));
  return (famCache[code] = [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join(''));
}
async function call(url, opt) {
  const r = await fetch(url, opt);
  if (!r.ok) {
    let msg = r.status + '';
    try { msg = (await r.json()).error.message || msg; } catch { /* 本文なし */ }
    throw new Error(msg);
  }
  return r.status === 204 ? null : r.json();
}

export async function pullAll(code) {
  const j = await call(`${base()}/families/${await famId(code)}/profiles?pageSize=100&${key()}`);
  const out = [];
  for (const d of (j && j.documents) || []) {
    try { out.push(JSON.parse(d.fields.json.stringValue)); } catch { /* こわれたデータは無視 */ }
  }
  return out;
}
export async function pushProfile(code, p, keepalive = false) {
  await call(`${base()}/families/${await famId(code)}/profiles/${encodeURIComponent(p.id)}?${key()}`, {
    method: 'PATCH', keepalive,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: { json: { stringValue: JSON.stringify(p) }, updated: { integerValue: String(Date.now()) } } }),
  });
}
export async function removeProfile(code, id) {
  await call(`${base()}/families/${await famId(code)}/profiles/${encodeURIComponent(id)}?${key()}`, { method: 'DELETE' });
}
