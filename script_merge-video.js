// ─────────────────────────────────────────────────────────────
// TOOL 2 — MERGE VIDEO
// ─────────────────────────────────────────────────────────────

function initMergeVideo() {
 const form = document.getElementById('form-merge-video');

 form.addEventListener('submit', e =>{
 e.preventDefault();
 const assetId = document.getElementById('mv-video-select').value;
 if (!assetId) { alert('Please select a video file from the library.'); return; }

 const asset = getAsset(assetId);
 const cropEndRaw = document.getElementById('mv-crop-end').value;

 mvClips.push({
 id: `mv-clip-${++mvClipIdCounter}`,
 assetId,
 name: asset.name,
 cropStart: parseFloat(document.getElementById('mv-crop-start').value) || 0,
 cropEnd: cropEndRaw ? parseFloat(cropEndRaw) : null,
 });

 renderMvTable();
 form.reset();
 announce(`"${asset.name}"added to the video merge queue.`);
 });

 document.getElementById('btn-mv-export').addEventListener('click', () => exportMergeVideo(false));
 document.getElementById('btn-mv-save').addEventListener('click', () => exportMergeVideo(true));
}

function renderMvTable() {
 const tbody = document.getElementById('mv-tbody');
 document.getElementById('mv-empty').style.display = mvClips.length ? 'none' : '';
 tbody.querySelectorAll('tr.data-row').forEach(r =>r.remove());

 mvClips.forEach((clip, i) =>{
 const tr = document.createElement('tr');
 tr.className = 'data-row';
 const crop = `${clip.cropStart}s → ${clip.cropEnd != null ? clip.cropEnd + 's' : 'end of file'}`;
 tr.innerHTML = `
<td>${i + 1}</td>
<td>${escapeHTML(clip.name)}</td>
<td>${crop}</td>
<td><button class="btn btn-sm btn-danger"
 onclick="removeMvClip('${clip.id}')"
 aria-label="Remove ${escapeHTML(clip.name)}">✕</button></td>
 `;
 tbody.appendChild(tr);
 });
}

window.removeMvClip = function(id) {
 const idx = mvClips.findIndex(c =>c.id === id);
 if (idx !== -1) mvClips.splice(idx, 1);
 renderMvTable();
};

async function exportMergeVideo(isSaveToLib = false) {
  if (isExportingMedia) { alert('An export is already in progress. Please wait.'); return; }
  if (mvClips.length === 0) { alert('Add at least one video clip first.'); return; }

 const statusEl = document.getElementById('mv-status');
 statusEl.textContent = 'Processing… this may take a while depending on video length.';
 announce('Merging videos, please wait…');

 const canvas = document.createElement('canvas');
 canvas.width = 1280; canvas.height = 720;
 const ctx2d = canvas.getContext('2d');

 const audioCtxLocal = getAudioCtx();
 const audioDest = audioCtxLocal.createMediaStreamDestination();

 const canvasStream = canvas.captureStream(30);
 const combinedStream = new MediaStream([
 ...canvasStream.getVideoTracks(),
 ...audioDest.stream.getAudioTracks(),
 ]);

 const recorder = new MediaRecorder(combinedStream, { mimeType: getSupportedVideoMime() });
 const chunks = [];
 recorder.ondataavailable = e =>{ if (e.data.size >0) chunks.push(e.data); };
 let recordStart = 0;
 recorder.onstop = () =>{
  canvasStream.getTracks().forEach(t => t.stop());
  const durationMs = Date.now() - recordStart;
 const blob = new Blob(chunks, { type: recorder.mimeType });
 const fileName = 'merged_video.webm';
 
  if (window.ysFixWebmDuration && blob.type.includes('webm')) {
  window.ysFixWebmDuration(blob, durationMs, fixedBlob =>{
  if (isSaveToLib) saveBlobToLibrary(fixedBlob, 'merged_video', 'video');
  else downloadBlob(fixedBlob, fileName);
  });
  } else {
  if (!window.ysFixWebmDuration && blob.type.includes('webm')) {
  console.warn('fix-webm-duration library not loaded. Video duration might be inaccurate.');
  announce('Warning: Video duration might be inaccurate because the fix-webm-duration library is missing.');
  }
  if (isSaveToLib) saveBlobToLibrary(blob, 'merged_video', 'video');
  else downloadBlob(blob, fileName);
  }
  
  if (isSaveToLib) {
    statusEl.textContent = 'Saved to Library!';
  } else {
    statusEl.textContent = 'Done! Merged video downloaded.';
    announce('Merged video downloaded.');
  }
  };

 recordStart = Date.now();
 recorder.start(100);

 isExportingMedia = true;
 const progressEl = document.getElementById('mv-progress');
 if (progressEl) { progressEl.style.display = 'block'; progressEl.value = 0; }
 try {
 let clipIndex = 0;
 let lastAnnouncedProgress = -1;
 for (const clip of mvClips) {
 const asset = getAsset(clip.assetId);
 statusEl.textContent = `Processing clip ${clipIndex + 1} of ${mvClips.length}...`;
 await playVideoClipToCanvas(asset.objectURL, clip.cropStart, clip.cropEnd, canvas, ctx2d, audioCtxLocal, audioDest, (progress) =>{
 const overallPct = ((clipIndex + progress) / mvClips.length) * 100;
 if (progressEl) progressEl.value = overallPct;
 
 const threshold = Math.floor(overallPct / 25) * 25;
 if (threshold >0 && threshold !== lastAnnouncedProgress && threshold % 25 === 0 && threshold<= 100) {
 statusEl.textContent = `Processing clip ${clipIndex + 1} of ${mvClips.length}... ${threshold}%`;
 lastAnnouncedProgress = threshold;
 }
 });
 clipIndex++;
 }
 recorder.stop();
 } finally {
 isExportingMedia = false;
 if (progressEl) progressEl.style.display = 'none';
 }
}

/** Plays a video clip into a canvas and audio destination, resolves when done */
function playVideoClipToCanvas(url, cropStart, cropEnd, canvas, ctx2d, actx, audioDest, onProgress) {
 return new Promise(resolve =>{
 const video = document.createElement('video');
 video.src = url;
 video.crossOrigin = 'anonymous';
 video.preload = 'auto';

 let audioSource = null;
 let animFrameId = null;
 let resolved = false;

 const cleanup = () =>{
 if (animFrameId) cancelAnimationFrame(animFrameId);
 if (audioSource) {
 try { audioSource.disconnect(); } catch (_) {}
 audioSource = null;
 }
 video.pause();
 };

  video.addEventListener('loadedmetadata', () =>{
  if (cropStart >= video.duration) {
  alert("Start time cannot exceed video duration.");
  if (!resolved) { resolved = true; cleanup(); resolve(); }
  return;
  }
  const endTime = cropEnd != null ? Math.min(cropEnd, video.duration) : video.duration;
  if (endTime <= cropStart) {
  alert("End time must be after start time.");
  if (!resolved) { resolved = true; cleanup(); resolve(); }
  return;
  }
  video.currentTime = cropStart;

 audioSource = actx.createMediaElementSource(video);
 audioSource.connect(audioDest);

 const draw = () =>{
 if (video.currentTime >= endTime || video.ended || video.paused) {
 if (!resolved) { resolved = true; cleanup(); resolve(); }
 return;
 }
 
 // Calculate letterboxing dimensions
 const scale = Math.min(canvas.width / video.videoWidth, canvas.height / video.videoHeight);
 const w = video.videoWidth * scale;
 const h = video.videoHeight * scale;
 const x = (canvas.width - w) / 2;
 const y = (canvas.height - h) / 2;
 
 // Draw black background and the centered video frame
 ctx2d.fillStyle = '#000';
 ctx2d.fillRect(0, 0, canvas.width, canvas.height);
 ctx2d.drawImage(video, x, y, w, h);
 if (onProgress) {
 const dur = endTime - cropStart;
 const curr = video.currentTime - cropStart;
 onProgress(dur >0 ? Math.max(0, Math.min(1, curr / dur)) : 0);
 }
 animFrameId = requestAnimationFrame(draw);
 };

 video.play().then(() =>{ animFrameId = requestAnimationFrame(draw); });

 video.addEventListener('timeupdate', () =>{
 if (video.currentTime >= endTime) {
 if (!resolved) { resolved = true; cleanup(); resolve(); }
 }
 }, { once: false });

 video.addEventListener('ended', () =>{
 if (!resolved) { resolved = true; cleanup(); resolve(); }
 }, { once: true });
 });

 video.load();
 });
}

