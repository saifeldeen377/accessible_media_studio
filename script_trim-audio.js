// ─────────────────────────────────────────────────────────────
// TOOL 5 — TRIM AUDIO
// ─────────────────────────────────────────────────────────────

let trimAudioCacheId = null;
let trimAudioCacheBuffer = null;

async function getTrimBuffer(asset) {
  if (trimAudioCacheId === asset.id && trimAudioCacheBuffer) return trimAudioCacheBuffer;
  trimAudioCacheBuffer = await decodeAudio(asset.objectURL);
  trimAudioCacheId = asset.id;
  return trimAudioCacheBuffer;
}

function initTrimAudio() {
  const statusEl = document.getElementById('ta-status');
  const taStart = document.getElementById('ta-start');
  const taEnd = document.getElementById('ta-end');

  taStart.addEventListener('input', () => {
    const start = parseFloat(taStart.value) || 0;
    taEnd.min = (start + 0.1).toFixed(1);
    if (taEnd.value && parseFloat(taEnd.value) <= start) {
      taEnd.value = (start + 0.1).toFixed(1);
    }
  });

  document.getElementById('btn-ta-preview').addEventListener('click', async () => {
    const assetId = document.getElementById('ta-audio-select').value;
    if (!assetId) { alert('Please select an audio file from the library.'); return; }

    const asset  = getAsset(assetId);
    const start  = parseFloat(document.getElementById('ta-start').value) || 0;
    const endRaw = document.getElementById('ta-end').value;

    statusEl.textContent = 'Loading preview…';
    announce('Loading audio preview…');

    const buffer = await getTrimBuffer(asset);
    const end    = endRaw ? parseFloat(endRaw) : buffer.duration;
    const dur    = end - start;

    if (dur <= 0) { alert('Trim End must be after Trim Start.'); return; }

    if (trimPreviewSource) { try { trimPreviewSource.stop(); } catch (_) {} }

    const ctx         = getAudioCtx();
    trimPreviewSource = ctx.createBufferSource();
    trimPreviewSource.buffer = buffer;
    trimPreviewSource.connect(ctx.destination);
    trimPreviewSource.start(0, start, dur);
    trimPreviewSource.onended = () => { statusEl.textContent = 'Preview finished.'; };

    statusEl.textContent = `Previewing from ${start}s to ${end.toFixed(1)}s (${dur.toFixed(1)}s total).`;
    announce(`Playing preview from ${start}s to ${end.toFixed(1)}s.`);
  });

  document.getElementById('btn-ta-stop').addEventListener('click', () => {
    if (trimPreviewSource) { try { trimPreviewSource.stop(); } catch (_) {} trimPreviewSource = null; }
    statusEl.textContent = 'Stopped.';
    announce('Preview stopped.');
  });

  document.getElementById('btn-ta-export').addEventListener('click', async () => {
    const assetId = document.getElementById('ta-audio-select').value;
    if (!assetId) { alert('Please select an audio file from the library.'); return; }

    const asset  = getAsset(assetId);
    const start  = parseFloat(document.getElementById('ta-start').value) || 0;
    const endRaw = document.getElementById('ta-end').value;

    statusEl.textContent = 'Rendering trimmed audio…';
    announce('Rendering trimmed audio, please wait…');

    const buffer = await getTrimBuffer(asset);
    const end    = endRaw ? parseFloat(endRaw) : buffer.duration;
    const dur    = end - start;

    if (dur <= 0) { alert('Trim End must be after Trim Start.'); return; }

    const sr      = buffer.sampleRate;
    const numCh   = buffer.numberOfChannels;
    const offline = new OfflineAudioContext(numCh, Math.ceil(dur * sr), sr);
    const src     = offline.createBufferSource();
    src.buffer    = buffer;
    src.connect(offline.destination);
    src.start(0, start, dur);

    const trimmed = await offline.startRendering();
    downloadBlob(await audioBufferToWav(trimmed), `${asset.name}_trimmed.wav`);
    statusEl.textContent = 'Done! Trimmed audio downloaded as WAV.';
    announce('Trimmed audio downloaded as WAV.');
  });
}

