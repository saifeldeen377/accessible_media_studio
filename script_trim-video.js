// ─────────────────────────────────────────────────────────────
// TOOL 6 — TRIM VIDEO
// ─────────────────────────────────────────────────────────────

function initTrimVideo() {
  const tvStart = document.getElementById('tv-start');
  const tvEnd = document.getElementById('tv-end');

  tvStart.addEventListener('input', () => {
    const start = parseFloat(tvStart.value) || 0;
    tvEnd.min = (start + 0.1).toFixed(1);
    if (tvEnd.value && parseFloat(tvEnd.value) <= start) {
      tvEnd.value = (start + 0.1).toFixed(1);
    }
  });

  document.getElementById('btn-tv-export').addEventListener('click', async () => {
    const assetId = document.getElementById('tv-video-select').value;
    if (!assetId) { alert('Please select a video file from the library.'); return; }

    const asset    = getAsset(assetId);
    const start    = parseFloat(document.getElementById('tv-start').value) || 0;
    const endRaw   = document.getElementById('tv-end').value;
    const cropEnd  = endRaw ? parseFloat(endRaw) : null;

    const statusEl = document.getElementById('tv-status');
    statusEl.textContent = 'Trimming video… this may take a while.';
    announce('Trimming video, please wait…');

    const canvas = document.createElement('canvas');
    canvas.width = 1280; canvas.height = 720;
    const ctx2d  = canvas.getContext('2d');

    const actx      = getAudioCtx();
    const audioDest = actx.createMediaStreamDestination();

    const canvasStream   = canvas.captureStream(30);
    const combinedStream = new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...audioDest.stream.getAudioTracks(),
    ]);

    const recorder = new MediaRecorder(combinedStream, { mimeType: getSupportedVideoMime() });
    const chunks   = [];
    recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
    let recordStart = 0;
    recorder.onstop = () => {
      const durationMs = Date.now() - recordStart;
      const blob = new Blob(chunks, { type: recorder.mimeType });
      const fileName = `${asset.name}_trimmed.webm`;
      
      if (window.ysFixWebmDuration && blob.type.includes('webm')) {
        window.ysFixWebmDuration(blob, durationMs, fixedBlob => {
          downloadBlob(fixedBlob, fileName);
        });
      } else {
        if (!window.ysFixWebmDuration && blob.type.includes('webm')) {
          console.warn('fix-webm-duration library not loaded. Video duration might be inaccurate.');
          announce('Warning: Video duration might be inaccurate because the fix-webm-duration library is missing.');
        }
        downloadBlob(blob, fileName);
      }

      statusEl.textContent = 'Done! Trimmed video downloaded.';
      announce('Trimmed video downloaded.');
    };

    recordStart = Date.now();
    recorder.start(100);
    
    isExportingMedia = true;
    const progressEl = document.getElementById('tv-progress');
    if (progressEl) { progressEl.style.display = 'block'; progressEl.value = 0; }
    let lastAnnouncedProgress = -1;
    try {
      await playVideoClipToCanvas(asset.objectURL, start, cropEnd, canvas, ctx2d, actx, audioDest, (progress) => {
        const pct = progress * 100;
        if (progressEl) progressEl.value = pct;
        
        const threshold = Math.floor(pct / 25) * 25;
        if (threshold > 0 && threshold !== lastAnnouncedProgress && threshold % 25 === 0 && threshold <= 100) {
          statusEl.textContent = `Trimming video... ${threshold}%`;
          lastAnnouncedProgress = threshold;
        }
      });
      recorder.stop();
    } finally {
      isExportingMedia = false;
      if (progressEl) progressEl.style.display = 'none';
    }
  });
}

