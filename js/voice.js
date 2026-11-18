// Optional voice lines. Files live in voice/<id>.mp3; voice/list.json lists which ids exist.
import { loadJSON, saveJSON } from './ui.js';

const KEY = 'n1q-voice';
let have = null;
let current = null;

async function available() {
  if (have) return have;
  try {
    const r = await fetch('voice/list.json');
    const j = r.ok ? await r.json() : {};
    have = new Set((Array.isArray(j.files) ? j.files : []).filter((id) => /^\d{2}$/.test(id)));
  } catch {
    have = new Set();
  }
  return have;
}

export const voiceOn = () => loadJSON(KEY, true) !== false;
export function setVoice(on) {
  saveJSON(KEY, !!on);
  if (!on && current) current.pause();
}
export async function voiceCount() { return (await available()).size; }

/** Play voice line `id` if voices are on and the file exists. Never throws. */
export async function speak(id) {
  if (!id || !voiceOn()) return;
  if (!(await available()).has(id)) return;
  try {
    if (current) current.pause();
    current = new Audio(`voice/${id}.mp3`);
    current.volume = 0.9;
    await current.play();
  } catch { /* autoplay blocked or offline: stay quiet */ }
}
