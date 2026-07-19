// ─────────────────────────────────────────────────────────────
// TOOL 6 — TRIM VIDEO
// ─────────────────────────────────────────────────────────────

function initTrimVideo() {
 const tvStart = document.getElementById('tv-start');
 const tvEnd = document.getElementById('tv-end');

 tvStart.addEventListener('input', () =>{
 const start = parseFloat(tvStart.value) || 0;
 tvEnd.min = (start + 0.1).toFixed(1);
 if (tvEnd.value && parseFloat(tvEnd.value)<= start) {
 tvEnd.value = (start + 0.1).toFixed(1);
 }
 });

  const btnPreview = document.getElementById('btn-tv-preview');
  const btnReplay = document.getElementById('btn-tv-replay-preview');
  const btnStop = document.getElementById('btn-tv-stop');
  const container = document.getElementById('tv-preview-container');
  const statusEl = document.getElementById('tv-status');

  let tvIsPreviewing = false;
  
  function stopTvPreview() {
    container.innerHTML = '';
    container.hidden = true;
    tvIsPreviewing = false;
    btnPreview.textContent = 'Preview Trim';
    btnPreview.setAttribute('aria-label', `Preview trim`);
    if (btnReplay) {
      if (document.activeElement === btnReplay) btnPreview.focus();
      btnReplay.style.display = 'none';
    }
    btnStop.style.display = 'none';
  }

  btnPreview.addEventListener('click', () => {
    const assetId = document.getElementById('tv-video-select').value;
    if (!assetId) { alert('Please select a video file from the library.'); return; }
    
    if (tvIsPreviewing) {
      const vid = container.querySelector('video');
      if (vid) {
        if (!vid.paused) {
          vid.pause();
          btnPreview.textContent = '▶️ Resume Trim';
          btnPreview.setAttribute('aria-label', `Resume trim preview`);
          statusEl.textContent = 'Preview paused.';

        } else {
          vid.play();
          btnPreview.textContent = '⏸️ Pause Trim';
          btnPreview.setAttribute('aria-label', `Pause trim preview`);
          statusEl.textContent = 'Preview resumed.';

        }
      }
      return;
    }

    const asset = getAsset(assetId);
    const start = parseFloat(tvStart.value) || 0;
    const endRaw = tvEnd.value;
    const end = endRaw ? parseFloat(endRaw) : Infinity;

    if (start >= end) { alert('Trim End must be after Trim Start.'); return; }

    container.hidden = false;
    container.innerHTML = `<video id="vid-tv-preview" src="${asset.objectURL}" autoplay controls playsinline></video>`;
    
    const vid = document.getElementById('vid-tv-preview');
    vid.currentTime = start;
    vid.play().catch(e => console.error(e));

    tvIsPreviewing = true;
    btnPreview.textContent = '⏸️ Pause Trim';
    btnPreview.setAttribute('aria-label', `Pause trim preview`);
    btnReplay.style.display = 'inline-block';
    btnStop.style.display = 'inline-block';
    statusEl.textContent = 'Previewing...';

    vid.ontimeupdate = () => {
      if (vid.currentTime >= end) {
        vid.pause();
        stopTvPreview();
        statusEl.textContent = 'Preview finished.';

      }
    };

    vid.onended = () => {
      stopTvPreview();
      statusEl.textContent = 'Preview finished.';

    };
  });

  btnReplay.addEventListener('click', () => {
    const vid = document.getElementById('vid-tv-preview');
    if (vid) {
      const start = parseFloat(tvStart.value) || 0;
      vid.currentTime = start;
      vid.play();
      btnPreview.textContent = '⏸️ Pause Trim';
      btnPreview.setAttribute('aria-label', `Pause trim preview`);
    }
  });

  btnStop.addEventListener('click', () => {
    stopTvPreview();
    statusEl.textContent = 'Stopped.';
  });

  const performTrimVideoExport = async (isSaveToLib) =>{
 if (isExportingMedia) { alert('An export is already in progress. Please wait.'); return; }
 const assetId = document.getElementById('tv-video-select').value;
 if (!assetId) { alert('Please select a video file from the library.'); return; }

 const asset = getAsset(assetId);
 const start = parseFloat(document.getElementById('tv-start').value) || 0;
 const endRaw = document.getElementById('tv-end').value;
 const cropEnd = endRaw ? parseFloat(endRaw) : null;

 const statusEl = document.getElementById('tv-status');
 statusEl.textContent = 'Trimming video… this may take a while.';
 announce('Trimming video, please wait…');

 const canvas = document.createElement('canvas');
 canvas.width = 1280; canvas.height = 720;
 const ctx2d = canvas.getContext('2d');

 const actx = getAudioCtx();
 const audioDest = actx.createMediaStreamDestination();

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
 const fileName = `${asset.name}_trimmed.webm`;
 const baseName = `${asset.name}_trimmed`;
 
 if (window.ysFixWebmDuration && blob.type.includes('webm')) {
 window.ysFixWebmDuration(blob, durationMs, fixedBlob =>{
  if (isSaveToLib) saveBlobToLibrary(fixedBlob, baseName, 'video');
  else downloadBlob(fixedBlob, fileName);
 });
 } else {
 if (!window.ysFixWebmDuration && blob.type.includes('webm')) {
 console.warn('fix-webm-duration library not loaded. Video duration might be inaccurate.');
 announce('Warning: Video duration might be inaccurate because the fix-webm-duration library is missing.');
 }
  if (isSaveToLib) saveBlobToLibrary(blob, baseName, 'video');
  else downloadBlob(blob, fileName);
 }

  if (isSaveToLib) {
    statusEl.textContent = 'Saved to Library!';
  } else {
    statusEl.textContent = 'Done! Trimmed video downloaded.';
    announce('Trimmed video downloaded.');
  }
 };

 recordStart = Date.now();
 recorder.start(100);
 
 isExportingMedia = true;
 const progressEl = document.getElementById('tv-progress');
 if (progressEl) { progressEl.style.display = 'block'; progressEl.value = 0; }
 let lastAnnouncedProgress = -1;
 try {
 await playVideoClipToCanvas(asset.objectURL, start, cropEnd, canvas, ctx2d, actx, audioDest, (progress) =>{
 const pct = progress * 100;
 if (progressEl) progressEl.value = pct;
 
  if (lastAnnouncedProgress === -1) lastAnnouncedProgress = 0;
  if (pct >= lastAnnouncedProgress + 25 && lastAnnouncedProgress < 100) {
    lastAnnouncedProgress += 25;
    statusEl.textContent = `Trimming video... ${lastAnnouncedProgress}%`;
  }
 });
 recorder.stop();
 } finally {
 isExportingMedia = false;
 if (progressEl) progressEl.style.display = 'none';
 }
 };

 document.getElementById('btn-tv-export').addEventListener('click', () => performTrimVideoExport(false));
 document.getElementById('btn-tv-save').addEventListener('click', () => performTrimVideoExport(true));
}

