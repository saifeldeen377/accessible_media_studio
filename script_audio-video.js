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

  const btnPreview = document.getElementById('btn-av-preview');
  const btnReplay = document.getElementById('btn-av-replay-preview');
  const btnStop = document.getElementById('btn-av-stop');
  const container = document.getElementById('av-preview-container');
  const statusEl = document.getElementById('av-status');

  let avIsPreviewing = false;
  let avPreviewTimer = null;
  let avPreviewAudioSrc = null;
  let avPreviewStartTime = 0;
  let avPreviewOffset = 0;

  function stopAvPreview() {
    if (!avIsPreviewing && !avPreviewAudioSrc) return;
    if (avPreviewTimer) clearInterval(avPreviewTimer);
    if (avPreviewAudioSrc) {
      avPreviewAudioSrc.onended = null;
      try { avPreviewAudioSrc.stop(); } catch (e) {}
    }
    avIsPreviewing = false;
    avPreviewAudioSrc = null;
    avPreviewOffset = 0;
    container.innerHTML = '';
    container.hidden = true;
    
    if (btnPreview) {
      btnPreview.textContent = 'Preview Video';
      btnPreview.setAttribute('aria-label', `Preview video`);
    }
    if (btnReplay) {
      if (document.activeElement === btnReplay) btnPreview.focus();
      btnReplay.style.display = 'none';
    }
    if (btnStop) btnStop.style.display = 'none';
  }

  if (btnPreview) {
    btnPreview.addEventListener('click', async () => {
      const audioAssetId = document.getElementById('av-audio-select').value;
      if (!audioAssetId) { alert('Please select an audio file in Step 1.'); return; }
      if (avSlides.length === 0) { alert('Please add at least one image slide in Step 2.'); return; }

      if (avIsPreviewing) {
        if (avPreviewAudioSrc) {
          try { avPreviewAudioSrc.stop(); } catch (e) {}
          avPreviewOffset += (getAudioCtx().currentTime - avPreviewStartTime);
          avPreviewAudioSrc = null;
        }
        if (avPreviewTimer) clearInterval(avPreviewTimer);
        avIsPreviewing = false;
        btnPreview.textContent = '▶️ Resume Preview';
        btnPreview.setAttribute('aria-label', `Resume preview`);
        statusEl.textContent = 'Preview paused.';
        announce('Preview paused.');
        return;
      }

      const totalDur = Math.max(...avSlides.map(s => s.end));
      if (avPreviewOffset >= totalDur) avPreviewOffset = 0;

      const actx = getAudioCtx();
      if (actx.state === 'suspended') { await actx.resume(); }

      let audioBuffer;
      btnPreview.textContent = 'Loading...';
      try {
        audioBuffer = await decodeAudio(getAsset(audioAssetId).objectURL);
      } catch (err) {
        statusEl.textContent = "Error decoding audio file.";
        btnPreview.textContent = 'Preview Video';
        return;
      }

      // Pre-load all images
      const imgCache = {};
      await Promise.all(avSlides.map(slide => new Promise(res => {
        const asset = getAsset(slide.assetId);
        const img = new Image();
        img.onload = () => { imgCache[slide.id] = img; res(); };
        img.onerror = () => { console.warn('Failed to load image', slide.id); res(); };
        img.src = asset.objectURL;
      })));

      container.hidden = false;
      container.innerHTML = '<canvas width="1280" height="720" style="max-width:100%; max-height:400px; background:#000;"></canvas>';
      const canvas = container.querySelector('canvas');
      
      if (avSlides.length > 0 && imgCache[avSlides[0].id]) {
        const firstImg = imgCache[avSlides[0].id];
        let w = firstImg.width;
        let h = firstImg.height;
        if (w > 1920 || h > 1080) {
          const scale = Math.min(1920 / w, 1080 / h);
          w = Math.round(w * scale);
          h = Math.round(h * scale);
        }
        canvas.width = w - (w % 2);
        canvas.height = h - (h % 2);
      }
      const ctx2d = canvas.getContext('2d');

      avPreviewAudioSrc = actx.createBufferSource();
      avPreviewAudioSrc.buffer = audioBuffer;
      avPreviewAudioSrc.connect(actx.destination);
      
      avPreviewAudioSrc.start(0, avPreviewOffset);
      avPreviewStartTime = actx.currentTime;
      avIsPreviewing = true;
      
      btnPreview.textContent = '⏸️ Pause Preview';
      btnPreview.setAttribute('aria-label', `Pause preview`);
      if (btnReplay) btnReplay.style.display = 'inline-block';
      if (btnStop) btnStop.style.display = 'inline-block';

      statusEl.textContent = 'Previewing...';

      avPreviewAudioSrc.onended = () => {
        if (!avIsPreviewing) return; // paused
        stopAvPreview();
        statusEl.textContent = 'Preview finished.';
        announce('Preview finished.');
      };

      avPreviewTimer = setInterval(() => {
        const elapsed = avPreviewOffset + (actx.currentTime - avPreviewStartTime);
        if (elapsed >= totalDur) {
          stopAvPreview();
          statusEl.textContent = 'Preview finished.';
          announce('Preview finished.');
          return;
        }

        const slide = avSlides.find(s => elapsed >= s.start && elapsed < s.end);
        ctx2d.fillStyle = 'black';
        ctx2d.fillRect(0, 0, canvas.width, canvas.height);

        if (slide && imgCache[slide.id]) {
          const img = imgCache[slide.id];
          const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
          const dw = img.width * scale;
          const dh = img.height * scale;
          const dx = (canvas.width - dw) / 2;
          const dy = (canvas.height - dh) / 2;
          ctx2d.drawImage(img, dx, dy, dw, dh);
        }
      }, 33);
    });
  }

  if (btnReplay) {
    btnReplay.addEventListener('click', () => {
      avPreviewOffset = 0;
      if (avIsPreviewing) {
        if (avPreviewTimer) clearInterval(avPreviewTimer);
        if (avPreviewAudioSrc) {
          try { avPreviewAudioSrc.stop(); } catch (e) {}
        }
        avIsPreviewing = false;
      }
      if (btnPreview) btnPreview.click();
      announce('Preview replayed.');
    });
  }

  if (btnStop) {
    btnStop.addEventListener('click', () => {
      stopAvPreview();
      statusEl.textContent = 'Stopped.';
      announce('Preview stopped.');
    });
  }
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
  let audioBuffer;
  try {
    audioBuffer = await decodeAudio(audioAsset.file);
  } catch (err) {
    statusEl.textContent = "Error decoding audio file. It may be corrupted or unsupported.";
    announce("Error decoding audio file. It may be corrupted or unsupported.");
    btnGenerate.disabled = false;
    btnGenerate.textContent = "Generate Video";
    return;
  }
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
  let timerId;
  const draw = () =>{
  const elapsed = actx.currentTime - startWall;
  const pct = (elapsed / totalDur) * 100;
  if (progressEl) progressEl.value = pct;

   if (lastAnnouncedProgress === -1) lastAnnouncedProgress = 0;
   if (pct >= lastAnnouncedProgress + 25 && lastAnnouncedProgress < 100) {
     lastAnnouncedProgress += 25;
     statusEl.textContent = `Generating slideshow video... ${lastAnnouncedProgress}%`;
   }

  if (elapsed >= totalDur) {
  try { audioSrc.stop(); } catch (_) {}
  recorder.stop();
  clearInterval(timerId);
  resolve();
  return;
  }

  const slide = avSlides.find(s =>elapsed >= s.start && elapsed < s.end);
  ctx2d.fillStyle = 'black';
  ctx2d.fillRect(0, 0, canvas.width, canvas.height);

  if (slide && imgCache[slide.id]) {
  const img = imgCache[slide.id];
  const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  const dx = (canvas.width - dw) / 2;
  const dy = (canvas.height - dh) / 2;
  ctx2d.drawImage(img, dx, dy, dw, dh);
  }
  };
  timerId = setInterval(draw, 33);
  draw();
  });
 } finally {
 isExportingMedia = false;
 if (progressEl) progressEl.style.display = 'none';
 }

}
