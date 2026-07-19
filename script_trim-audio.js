// ─────────────────────────────────────────────────────────────
// TOOL 5 — TRIM AUDIO
// ─────────────────────────────────────────────────────────────

let trimAudioCacheId = null;
let trimAudioCacheBuffer = null;

async function getTrimBuffer(asset) {
 if (trimAudioCacheId === asset.id && trimAudioCacheBuffer) return trimAudioCacheBuffer;
 try {
  trimAudioCacheBuffer = await decodeAudio(asset.file);
 } catch (err) {
  trimAudioCacheId = null;
  throw err;
 }
 trimAudioCacheId = asset.id;
 return trimAudioCacheBuffer;
}

function initTrimAudio() {
 const statusEl = document.getElementById('ta-status');
 const taStart = document.getElementById('ta-start');
 const taEnd = document.getElementById('ta-end');

  taStart.addEventListener('input', () =>{
    const start = parseFloat(taStart.value) || 0;
    taEnd.min = (start + 0.1).toFixed(1);
    if (taEnd.value && parseFloat(taEnd.value)<= start) {
      taEnd.value = (start + 0.1).toFixed(1);
    }
  });

  let taPreviewOffset = 0;
  let taPreviewStartTime = 0;
  let taIsPreviewing = false;
  
  const btnPreview = document.getElementById('btn-ta-preview');
  const btnReplay = document.getElementById('btn-ta-replay-preview');

  btnPreview.addEventListener('click', async () =>{
  const assetId = document.getElementById('ta-audio-select').value;
  if (!assetId) { alert('Please select an audio file from the library.'); return; }

  const asset = getAsset(assetId);
  const start = parseFloat(document.getElementById('ta-start').value) || 0;
  const endRaw = document.getElementById('ta-end').value;

  const buffer = await getTrimBuffer(asset);
  let end = endRaw ? parseFloat(endRaw) : buffer.duration;
  if (start >= buffer.duration) { alert('Start time cannot exceed file duration.'); return; }
  if (end > buffer.duration) end = buffer.duration;
  const dur = end - start;

  if (dur<= 0) { alert('Trim End must be after Trim Start.'); return; }

  if (taIsPreviewing) {
    if (trimPreviewSource) { try { trimPreviewSource.stop(); } catch (_) {} }
    taPreviewOffset += (getAudioCtx().currentTime - taPreviewStartTime);
    taIsPreviewing = false;
    btnPreview.textContent = '▶️ Resume Trim';
    btnPreview.setAttribute('aria-label', `Resume trim preview`);
    statusEl.textContent = '';

    return;
  }

  if (taPreviewOffset >= dur) taPreviewOffset = 0;

  statusEl.textContent = 'Loading preview…';
  
  if (trimPreviewSource) { try { trimPreviewSource.stop(); } catch (_) {} }

  const ctx = getAudioCtx();
  trimPreviewSource = ctx.createBufferSource();
  trimPreviewSource.buffer = buffer;
  trimPreviewSource.connect(ctx.destination);
  trimPreviewSource.start(0, start + taPreviewOffset, dur - taPreviewOffset);
  taPreviewStartTime = ctx.currentTime;
  taIsPreviewing = true;
  btnPreview.textContent = '⏸️ Pause Trim';
  btnPreview.setAttribute('aria-label', `Pause trim preview`);
  btnReplay.style.display = 'inline-block';
  
  trimPreviewSource.onended = () =>{ 
    if (!taIsPreviewing) return; // Means it was paused
    taIsPreviewing = false;
    taPreviewOffset = 0;
    btnPreview.textContent = 'Preview Trim';
    btnPreview.setAttribute('aria-label', `Preview trim`);
    if (btnReplay) {
      if (document.activeElement === btnReplay) btnPreview.focus();
      btnReplay.style.display = 'none';
    }
    statusEl.textContent = ''; 

  };

  statusEl.textContent = '';
  });

  btnReplay.addEventListener('click', async () => {
    taPreviewOffset = 0;
    taIsPreviewing = false;
    if (trimPreviewSource) { try { trimPreviewSource.stop(); } catch (_) {} }
    btnPreview.click();
  });

  document.getElementById('btn-ta-stop').addEventListener('click', () =>{
  if (trimPreviewSource) { try { trimPreviewSource.stop(); } catch (_) {} trimPreviewSource = null; }
  taIsPreviewing = false;
  taPreviewOffset = 0;
  btnPreview.textContent = 'Preview Trim';
  btnPreview.setAttribute('aria-label', `Preview trim`);
  if (btnReplay) {
    if (document.activeElement === btnReplay) btnPreview.focus();
    btnReplay.style.display = 'none';
  }
  statusEl.textContent = 'Stopped.';
  });

  const performTrimAudioExport = async (isSaveToLib) =>{
 if (isExportingMedia) { alert('An export is already in progress. Please wait.'); return; }
 const assetId = document.getElementById('ta-audio-select').value;
 if (!assetId) { alert('Please select an audio file from the library.'); return; }

 const asset = getAsset(assetId);
 const start = parseFloat(document.getElementById('ta-start').value) || 0;
 const endRaw = document.getElementById('ta-end').value;

 statusEl.textContent = 'Rendering trimmed audio…';
 announce('Rendering trimmed audio, please wait…');

 let buffer;
 try {
  buffer = await getTrimBuffer(asset);
 } catch (err) {
  statusEl.textContent = 'Error: Could not decode audio. The file may be corrupted or unsupported.';
  announce('Error: Could not decode audio.');
  return;
 }
 let end = endRaw ? parseFloat(endRaw) : buffer.duration;
 if (start >= buffer.duration) { alert('Start time cannot exceed file duration.'); return; }
 if (end > buffer.duration) end = buffer.duration;
 const dur = end - start;

 if (dur<= 0) { alert('Trim End must be after Trim Start.'); return; }

 isExportingMedia = true;
 try {
 const sr = buffer.sampleRate;
 const numCh = buffer.numberOfChannels;
 const offline = new OfflineAudioContext(numCh, Math.ceil(dur * sr), sr);
 const src = offline.createBufferSource();
 src.buffer = buffer;
 src.connect(offline.destination);
 src.start(0, start, dur);

 const trimmed = await offline.startRendering();
 const wavBlob = await audioBufferToWav(trimmed);
 if (isSaveToLib) {
   saveBlobToLibrary(wavBlob, `${asset.name}_trimmed`, 'audio');
   statusEl.textContent = 'Saved to Library!';
 } else {
   downloadBlob(wavBlob, `${asset.name}_trimmed.wav`);
   statusEl.textContent = 'Done! Trimmed audio downloaded as WAV.';
   announce('Trimmed audio downloaded as WAV.');
 }
 } catch (err) {
 statusEl.textContent = 'Error: Trim duration is too long or requires too much memory.';
 announce('Error: Trim duration is too long or requires too much memory.', true);
 alert("Error: The trim duration requires too much memory. Try reducing the length.");
 return;
 } finally {
 isExportingMedia = false;
 }
 };

 document.getElementById('btn-ta-export').addEventListener('click', () => performTrimAudioExport(false));
 document.getElementById('btn-ta-save').addEventListener('click', () => performTrimAudioExport(true));
}
