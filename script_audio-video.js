// ─────────────────────────────────────────────────────────────
// TOOL 3 — AUDIO → VIDEO (SLIDESHOW)
// ─────────────────────────────────────────────────────────────

function initAudioToVideo() {
 const form = document.getElementById('form-av-images');

 form.addEventListener('submit', e =>{
 e.preventDefault();
 const assetId = document.getElementById('av-image-select').value;
 if (!assetId) { alert('Please select an image from the library.'); return; }

 const asset = getAsset(assetId);
 const start = parseFloat(document.getElementById('av-img-start').value) || 0;
 const end = parseFloat(document.getElementById('av-img-end').value);

 if (isNaN(end) || end<= start) {
 alert('"Show until"must be a number greater than "Show from".');
 return;
 }

 avSlides.push({ id: `av-slide-${++avSlideIdCounter}`, assetId, name: asset.name, start, end });
 renderAvTable();
 form.reset();
 announce(`"${asset.name}"added: shown from ${start}s to ${end}s.`);
 });

 document.getElementById('btn-av-export').addEventListener('click', () => exportAudioToVideo(false));
 document.getElementById('btn-av-save').addEventListener('click', () => exportAudioToVideo(true));
}

function renderAvTable() {
 const tbody = document.getElementById('av-tbody');
 document.getElementById('av-empty').style.display = avSlides.length ? 'none' : '';
 tbody.querySelectorAll('tr.data-row').forEach(r =>r.remove());

 avSlides.forEach(slide =>{
 const tr = document.createElement('tr');
 tr.className = 'data-row';
 tr.innerHTML = `
<td>${escapeHTML(slide.name)}</td>
<td>${slide.start}s</td>
<td>${slide.end}s</td>
<td><button class="btn btn-sm btn-danger"
 onclick="removeAvSlide('${slide.id}')"
 aria-label="Remove ${escapeHTML(slide.name)}">✕</button></td>
 `;
 tbody.appendChild(tr);
 });
}

window.removeAvSlide = function(id) {
 const idx = avSlides.findIndex(s =>s.id === id);
 if (idx !== -1) avSlides.splice(idx, 1);
 renderAvTable();
};

async function exportAudioToVideo(isSaveToLib = false) {
  if (isExportingMedia) { alert('An export is already in progress. Please wait.'); return; }
  const audioAssetId = document.getElementById('av-audio-select').value;
  if (!audioAssetId) { alert('Please select an audio file in Step 1.'); return; }
  if (avSlides.length === 0) { alert('Please add at least one image slide in Step 2.'); return; }

 const statusEl = document.getElementById('av-status');
 statusEl.textContent = 'Generating slideshow video… please wait.';
 announce('Generating slideshow video, please wait…');

 alert("Important: Please keep this tab active and do not minimize the browser until the export is complete. Switching tabs may cause the video to stutter or fail.");

 const audioAsset = getAsset(audioAssetId);
 const totalDur = Math.max(...avSlides.map(s =>s.end));

 // Pre-load all images
 const imgCache = {};
 await Promise.all(avSlides.map(slide =>new Promise(res =>{
 const asset = getAsset(slide.assetId);
 const img = new Image();
 img.onload = () =>{ imgCache[slide.id] = img; res(); };
 img.onerror = () =>{ console.warn('Failed to load image for slide', slide.id); res(); };
 img.src = asset.objectURL;
 })));

 // Canvas + Audio setup
 const canvas = document.createElement('canvas');
 canvas.width = 1280; 
 canvas.height = 720;
 // Use first image dimensions if available, but cap at 1080p
 if (avSlides.length > 0 && imgCache[avSlides[0].id]) {
 const firstImg = imgCache[avSlides[0].id];
 let w = firstImg.width;
 let h = firstImg.height;

 // Cap at 1920x1080 preserving aspect ratio
 if (w > 1920 || h > 1080) {
 const scale = Math.min(1920 / w, 1080 / h);
 w = Math.round(w * scale);
 h = Math.round(h * scale);
 }

 canvas.width = w - (w % 2);
 canvas.height = h - (h % 2);
 }
 const ctx2d = canvas.getContext('2d');

 const actx = getAudioCtx();
 const audioBuffer = await decodeAudio(audioAsset.file);
 const audioSrc = actx.createBufferSource();
 audioSrc.buffer = audioBuffer;
 const audioDest = actx.createMediaStreamDestination();
 audioSrc.connect(audioDest);

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
 canvasStream.getTracks().forEach(t => t.stop()); // Free memory
 const durationMs = Date.now() - recordStart;
 const blob = new Blob(chunks, { type: recorder.mimeType });
 const fileName = 'slideshow_video.webm';
 
 if (window.ysFixWebmDuration && blob.type.includes('webm')) {
 window.ysFixWebmDuration(blob, durationMs, fixedBlob =>{
  if (isSaveToLib) saveBlobToLibrary(fixedBlob, 'slideshow_video', 'video');
  else downloadBlob(fixedBlob, fileName);
 });
 } else {
 if (!window.ysFixWebmDuration && blob.type.includes('webm')) {
 console.warn('fix-webm-duration library not loaded. Video duration might be inaccurate.');
 announce('Warning: Video duration might be inaccurate because the fix-webm-duration library is missing.');
 }
  if (isSaveToLib) saveBlobToLibrary(blob, 'slideshow_video', 'video');
  else downloadBlob(blob, fileName);
 }

 if (isSaveToLib) {
   statusEl.textContent = 'Saved to Library!';
 } else {
   statusEl.textContent = 'Done! Slideshow video downloaded.';
   announce('Slideshow video downloaded.');
 }
 };

 audioSrc.start(actx.currentTime);
 recordStart = Date.now();
 recorder.start(100);
 const startWall = actx.currentTime;

 isExportingMedia = true;
 const progressEl = document.getElementById('av-progress');
 if (progressEl) { progressEl.style.display = 'block'; progressEl.value = 0; }
 let lastAnnouncedProgress = -1;
 try {
 await new Promise(resolve =>{
 const draw = () =>{
 const elapsed = actx.currentTime - startWall;
 const pct = (elapsed / totalDur) * 100;
 if (progressEl) progressEl.value = pct;

 const threshold = Math.floor(pct / 25) * 25;
 if (threshold >0 && threshold !== lastAnnouncedProgress && threshold % 25 === 0 && threshold<= 100) {
 statusEl.textContent = `Generating slideshow video... ${threshold}%`;
 lastAnnouncedProgress = threshold;
 }

 if (elapsed >= totalDur) {
 try { audioSrc.stop(); } catch (_) {}
 recorder.stop();
 resolve();
 return;
 }

 // Black background
 ctx2d.fillStyle = '#000';
 ctx2d.fillRect(0, 0, canvas.width, canvas.height);

 // Find the slide that should be visible now
 const current = avSlides.find(s =>elapsed >= s.start && elapsed< s.end);
 if (current && imgCache[current.id]) {
 const img = imgCache[current.id];
 const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
 const x = (canvas.width - img.width * scale) / 2;
 const y = (canvas.height - img.height * scale) / 2;
 ctx2d.drawImage(img, x, y, img.width * scale, img.height * scale);
 }

 requestAnimationFrame(draw);
 };
 requestAnimationFrame(draw);
 });
 } finally {
 isExportingMedia = false;
 if (progressEl) progressEl.style.display = 'none';
 }
}

