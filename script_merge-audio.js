// ─────────────────────────────────────────────────────────────
// TOOL 1 — MERGE AUDIO
// ─────────────────────────────────────────────────────────────

function initMergeAudio() {
  const form   = document.getElementById('form-merge-audio');
  const volIn  = document.getElementById('ma-volume');
  const volVal = document.getElementById('ma-vol-val');

  volIn.addEventListener('input', () => {
    volVal.textContent = volIn.value;
    volIn.setAttribute('aria-valuenow', volIn.value);
  });

  form.addEventListener('submit', e => {
    e.preventDefault();
    const assetId = document.getElementById('ma-sound-select').value;
    if (!assetId) { alert('Please select an audio file from the library.'); return; }

    const asset = getAsset(assetId);
    const cropEndRaw = document.getElementById('ma-crop-end').value;

    maClips.push({
      id:            `ma-clip-${++maClipIdCounter}`,
      assetId,
      name:          asset.name,
      timelineStart: parseFloat(document.getElementById('ma-start').value)      || 0,
      cropStart:     parseFloat(document.getElementById('ma-crop-start').value) || 0,
      cropEnd:       cropEndRaw ? parseFloat(cropEndRaw) : null,
      volume:        parseInt(volIn.value) / 100,
    });

    renderMaTable();
    form.reset();
    volVal.textContent = '100';
    announce(`"${asset.name}" added to the merge list.`);
  });

  document.getElementById('btn-ma-play').addEventListener('click',   previewMergeAudio);
  document.getElementById('btn-ma-stop').addEventListener('click',   stopMergeAudio);
  document.getElementById('btn-ma-export').addEventListener('click', exportMergeAudio);
}

function renderMaTable() {
  const tbody = document.getElementById('ma-tbody');
  document.getElementById('ma-empty').style.display = maClips.length ? 'none' : '';
  tbody.querySelectorAll('tr.data-row').forEach(r => r.remove());

  maClips.forEach(clip => {
    const tr   = document.createElement('tr');
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
  const idx = maClips.findIndex(c => c.id === id);
  if (idx !== -1) maClips.splice(idx, 1);
  renderMaTable();
};

async function buildMixedBuffer() {
  if (maClips.length === 0) { alert('Add at least one audio clip first.'); return null; }

  const decoded = await Promise.all(maClips.map(async clip => {
    const buf = await decodeAudio(getAsset(clip.assetId).objectURL);
    return { clip, buf };
  }));

  // Calculate total output duration
  let totalDuration = 0;
  decoded.forEach(({ clip, buf }) => {
    const cs  = clip.cropStart;
    const ce  = clip.cropEnd != null ? Math.min(clip.cropEnd, buf.duration) : buf.duration;
    const dur = Math.max(0, ce - cs);
    totalDuration = Math.max(totalDuration, clip.timelineStart + dur);
  });

  if (totalDuration <= 0) { alert('Clips result in zero duration. Check your crop settings.'); return null; }

  const sr      = getAudioCtx().sampleRate;
  const offline = new OfflineAudioContext(2, Math.ceil(totalDuration * sr), sr);

  const exportCompressor = offline.createDynamicsCompressor();
  exportCompressor.threshold.setValueAtTime(-2, 0);
  exportCompressor.knee.setValueAtTime(0, 0);
  exportCompressor.ratio.setValueAtTime(20, 0);
  exportCompressor.attack.setValueAtTime(0.005, 0);
  exportCompressor.release.setValueAtTime(0.05, 0);
  exportCompressor.connect(offline.destination);

  decoded.forEach(({ clip, buf }) => {
    const cs   = clip.cropStart;
    const ce   = clip.cropEnd != null ? Math.min(clip.cropEnd, buf.duration) : buf.duration;
    const dur  = ce - cs;

    const src  = offline.createBufferSource();
    src.buffer = buf;

    const gain = offline.createGain();
    gain.gain.value = clip.volume;

    src.connect(gain);
    gain.connect(exportCompressor);
    src.start(clip.timelineStart, cs, dur);
  });

  return offline.startRendering();
}

async function previewMergeAudio() {
  announce('Rendering preview…');
  const buffer = await buildMixedBuffer();
  if (!buffer) return;

  stopMergeAudio();
  const ctx = getAudioCtx();
  previewSource        = ctx.createBufferSource();
  previewSource.buffer = buffer;
  previewSource.connect(ctx.destination);
  previewSource.start();
  announce('Playing merged audio preview.');
}

function stopMergeAudio() {
  if (previewSource) { try { previewSource.stop(); } catch (_) {} previewSource = null; }
}

async function exportMergeAudio() {
  announce('Rendering merged audio, please wait…');
  const buffer = await buildMixedBuffer();
  if (!buffer) return;
  downloadBlob(await audioBufferToWav(buffer), 'merged_audio.wav');
  announce('Merged audio downloaded as WAV.');
}

