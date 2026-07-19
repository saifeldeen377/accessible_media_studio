// ─────────────────────────────────────────────────────────────
// TOOL 1 — MERGE AUDIO
// ─────────────────────────────────────────────────────────────

function initMergeAudio() {
 const form = document.getElementById('form-merge-audio');
 const volIn = document.getElementById('ma-volume');
 const volVal = document.getElementById('ma-vol-val');

 volIn.addEventListener('input', () =>{
 volVal.textContent = volIn.value;
 volIn.setAttribute('aria-valuenow', volIn.value);
 });

 form.addEventListener('submit', e =>{
 e.preventDefault();
 const assetId = document.getElementById('ma-sound-select').value;
 if (!assetId) { alert('Please select an audio file from the library.'); return; }

 const asset = getAsset(assetId);
 const cropStart = parseFloat(document.getElementById('ma-crop-start').value) || 0;
 const cropEndRaw = document.getElementById('ma-crop-end').value;
 if (cropEndRaw && parseFloat(cropEndRaw) <= cropStart) {
  alert('Crop End must be strictly greater than Crop Start.');
  return;
 }

 maClips.push({
 id: `ma-clip-${++maClipIdCounter}`,
 assetId,
 name: asset.name,
 timelineStart: parseFloat(document.getElementById('ma-start').value) || 0,
 cropStart: cropStart,
 cropEnd: cropEndRaw ? parseFloat(cropEndRaw) : null,
 volume: parseInt(volIn.value) / 100,
 });

 renderMaTable();
 form.reset();
 volVal.textContent = '100';
 announce(`"${asset.name}"added to the merge list.`);
 });

 document.getElementById('btn-ma-play').addEventListener('click', previewMergeAudio);
 document.getElementById('btn-ma-stop').addEventListener('click', stopMergeAudio);
 document.getElementById('btn-ma-export').addEventListener('click', () => exportMergeAudio(false));
 document.getElementById('btn-ma-save').addEventListener('click', () => exportMergeAudio(true));
}

function renderMaTable() {
 const tbody = document.getElementById('ma-tbody');
 document.getElementById('ma-empty').style.display = maClips.length ? 'none' : '';
 tbody.querySelectorAll('tr.data-row').forEach(r =>r.remove());

 maClips.forEach(clip =>{
 const tr = document.createElement('tr');
 tr.className = 'data-row';
 const crop = `${clip.cropStart}s → ${clip.cropEnd != null ? clip.cropEnd + 's' : 'end of file'}`;
 tr.innerHTML = `
<td>${escapeHTML(clip.name)}</td>
<td>${clip.timelineStart}s</td>
<td>${crop}</td>
<td>${Math.round(clip.volume * 100)}%</td>
<td><button class="btn btn-sm btn-danger"
 onclick="removeMaClip('${clip.id}')"
 aria-label="Remove ${escapeHTML(clip.name)}">✕</button></td>
 `;
 tbody.appendChild(tr);
 });
}

window.removeMaClip = function(id) {
 const idx = maClips.findIndex(c =>c.id === id);
 if (idx !== -1) maClips.splice(idx, 1);
 renderMaTable();
};

async function buildMixedBuffer() {
 if (maClips.length === 0) { alert('Add at least one audio clip first.'); return null; }

 let decoded;
 try {
  decoded = await Promise.all(maClips.map(async clip =>{
  const buf = await decodeAudio(getAsset(clip.assetId).file);
  return { clip, buf };
  }));
 } catch (err) {
  alert("Error decoding one or more audio files. They may be corrupted or unsupported.");
  return null;
 }

 // Calculate total output duration
 let totalDuration = 0;
 decoded.forEach(({ clip, buf }) =>{
 const cs = clip.cropStart;
 const ce = clip.cropEnd != null ? Math.min(clip.cropEnd, buf.duration) : buf.duration;
 const dur = Math.max(0, ce - cs);
 totalDuration = Math.max(totalDuration, clip.timelineStart + dur);
 });

 if (totalDuration<= 0) { alert('Clips result in zero duration. Check your crop settings.'); return null; }

 try {
  const sr = getAudioCtx().sampleRate;
  const offline = new OfflineAudioContext(2, Math.ceil(totalDuration * sr), sr);

  const exportCompressor = offline.createDynamicsCompressor();
  exportCompressor.threshold.setValueAtTime(-2, 0);
  exportCompressor.knee.setValueAtTime(0, 0);
  exportCompressor.ratio.setValueAtTime(20, 0);
  exportCompressor.attack.setValueAtTime(0.005, 0);
  exportCompressor.release.setValueAtTime(0.05, 0);
  exportCompressor.connect(offline.destination);

  decoded.forEach(({ clip, buf }) =>{
  const cs = clip.cropStart;
  const ce = clip.cropEnd != null ? Math.min(clip.cropEnd, buf.duration) : buf.duration;
  const dur = ce - cs;
  
  if (dur<= 0) return; // Prevent negative duration crash

  const src = offline.createBufferSource();
  src.buffer = buf;

  const gain = offline.createGain();
  gain.gain.value = clip.volume;

  src.connect(gain);
  gain.connect(exportCompressor);
  src.start(clip.timelineStart, cs, dur);
  });

  return await offline.startRendering();
  } catch (e) {
  alert("Error: The mix is too long or requires too much memory. Try reducing the length or number of clips.");
  return null;
  }
}

let maPreviewOffset = 0;
let maPreviewStartTime = 0;
let maIsPreviewing = false;
let maPreviewBuffer = null;

async function previewMergeAudio() {
  const btnPreview = document.getElementById('btn-ma-play');
  const btnReplay = document.getElementById('btn-ma-replay-preview');

  if (maIsPreviewing) {
    if (previewSource) { try { previewSource.stop(); } catch (_) {} }
    maPreviewOffset += (getAudioCtx().currentTime - maPreviewStartTime);
    maIsPreviewing = false;
    btnPreview.textContent = '▶️ Resume Mix';
    btnPreview.setAttribute('aria-label', `Resume mix preview`);
    announce('Preview paused.');
    return;
  }

  if (!maPreviewBuffer || maPreviewOffset === 0) {
    announce('Rendering preview…');
    btnPreview.textContent = 'Rendering...';
    maPreviewBuffer = await buildMixedBuffer();
    if (!maPreviewBuffer) {
      btnPreview.textContent = 'Preview Mix';
      return;
    }
  }

  if (maPreviewOffset >= maPreviewBuffer.duration) maPreviewOffset = 0;

  stopMergeAudio(false); // Stop playback without resetting offset
  const ctx = getAudioCtx();
  previewSource = ctx.createBufferSource();
  previewSource.buffer = maPreviewBuffer;
  previewSource.connect(ctx.destination);
  previewSource.start(0, maPreviewOffset);
  maPreviewStartTime = ctx.currentTime;
  maIsPreviewing = true;
  btnPreview.textContent = '⏸️ Pause Mix';
  btnPreview.setAttribute('aria-label', `Pause mix preview`);
  btnReplay.style.display = 'inline-block';
  announce('Playing merged audio preview.');

  previewSource.onended = () => {
    if (!maIsPreviewing) return; // Means it was paused
    maIsPreviewing = false;
    maPreviewOffset = 0;
    btnPreview.textContent = 'Preview Mix';
    btnPreview.setAttribute('aria-label', `Preview mix`);
    if (btnReplay) {
      if (document.activeElement === btnReplay) btnPreview.focus();
      btnReplay.style.display = 'none';
    }
    announce('Preview finished.');
  };
}

function stopMergeAudio(resetOffset = true) {
  if (previewSource) { try { previewSource.stop(); } catch (_) {} previewSource = null; }
  if (resetOffset) {
    maIsPreviewing = false;
    maPreviewOffset = 0;
    const btnPreview = document.getElementById('btn-ma-play');
    const btnReplay = document.getElementById('btn-ma-replay-preview');
    if (btnPreview) {
      btnPreview.textContent = 'Preview Mix';
      btnPreview.setAttribute('aria-label', `Preview mix`);
    }
    if (btnReplay) {
      if (document.activeElement === btnReplay && btnPreview) btnPreview.focus();
      btnReplay.style.display = 'none';
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const btnReplay = document.getElementById('btn-ma-replay-preview');
  if (btnReplay) {
    btnReplay.addEventListener('click', () => {
      maPreviewOffset = 0;
      maIsPreviewing = false;
      if (previewSource) { try { previewSource.stop(); } catch (_) {} }
      document.getElementById('btn-ma-play').click();
      announce('Preview replayed.');
    });
  }
});

async function exportMergeAudio(isSaveToLib = false) {
  if (isExportingMedia) { alert("An export is already in progress. Please wait."); return; }
  isExportingMedia = true;
  try {
  announce('Rendering merged audio, please wait…');
  const buffer = await buildMixedBuffer();
  if (!buffer) return;
  const blob = await audioBufferToWav(buffer);
  if (isSaveToLib) {
    saveBlobToLibrary(blob, 'merged_audio', 'audio');
  } else {
    downloadBlob(blob, 'merged_audio.wav');
    announce('Merged audio downloaded as WAV.');
  }
  } finally {
  isExportingMedia = false;
  }
}
