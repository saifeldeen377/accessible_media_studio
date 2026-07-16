// ─────────────────────────────────────────────────────────────
// TOOL 8 - SUPER TRIM AUDIO
// ─────────────────────────────────────────────────────────────

let staTimer = null;

// Web Audio API playback engine to ensure 100% sample-accurate sync
let trimPlaySource = null;
let trimPlayStartTime = 0;
let trimPlayOffset = 0;
let trimIsPlaying = false;
let trimBuffer = null;

let trimStart = 0;
let trimEnd = null;

function initSuperTrimAudio() {
 const select = document.getElementById('sta-audio-select');
 const btnPlay = document.getElementById('btn-sta-play');
 const btnStop = document.getElementById('btn-sta-stop');
 const timeDisplay = document.getElementById('sta-time-display');
 const displayStart = document.getElementById('sta-start-display');
 const displayEnd = document.getElementById('sta-end-display');
 const btnPreview = document.getElementById('btn-sta-preview');
 const btnExport = document.getElementById('btn-sta-export');
 const statusEl = document.getElementById('sta-status');
 const announcer = document.getElementById('sta-sr-announcer');

 const btnEnter = document.getElementById('btn-enter-super-trim');
 const btnClose = document.getElementById('btn-close-super-trim');
 const overlay = document.getElementById('super-trim-overlay');
 const mainApp = document.querySelector('main');
 const footerApp = document.querySelector('footer');
 const container = overlay.querySelector('.sm-container');

 setupFocusTrap(overlay);

 btnEnter.addEventListener('click', () => {
    overlay.hidden = false;
    overlay.style.display = 'flex';
    setAppBackgroundInert(true);
    container.focus();
    announce('Entered Super Trim Audio. Application mode active.');
  });

 // Global key listener for t
 window.addEventListener('keydown', e =>{
 const tag = e.target.tagName.toLowerCase();
 if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

 if (e.key.toLowerCase() === 't' && (overlay.hidden || overlay.style.display === 'none')) {
 const smOverlay = document.getElementById('super-mode-overlay');
 if (smOverlay && !smOverlay.hidden) return; // Don't open if Super Merger is open
 e.preventDefault();
 btnEnter.click();
 }
 });

 btnClose.addEventListener('click', () => {
    stopAudio();
    overlay.hidden = true;
    overlay.style.display = 'none';
    setAppBackgroundInert(false);
    btnEnter.focus();
    announce('Exited Super Trim Audio.');
  });

 function formatTime(secs) {
 return Number(secs).toFixed(3) + "s";
 }

 function getCurrentTime() {
 if (trimIsPlaying) {
 return trimPlayOffset + (getAudioCtx().currentTime - trimPlayStartTime);
 }
 return trimPlayOffset;
 }

 function updateTimeDisplay() {
 timeDisplay.textContent = formatTime(getCurrentTime());
 }

  function stopAudio() {
    if (trimPlaySource) {
      trimPlaySource.onended = null;
      try { trimPlaySource.stop(); } catch(e) {}
 trimPlaySource = null;
 }
 trimIsPlaying = false;
 trimPlayOffset = 0;
 clearInterval(staTimer);
 updateTimeDisplay();
 btnPlay.textContent = "Play (Space)";
 if (document.activeElement === btnStop) { btnPlay.focus(); }
 btnStop.disabled = true;
 }

 function seekAudio(seconds) {
 if (!trimBuffer) return;
 
 let current = trimIsPlaying ? getCurrentTime() : trimPlayOffset;
 let newOffset = current + seconds;
 if (newOffset< 0) newOffset = 0;
 if (newOffset >= trimBuffer.duration) newOffset = trimBuffer.duration - 0.1;

 if (trimPlaySource) {
 trimPlaySource.onended = null;
 try { trimPlaySource.stop(); } catch(e) {}
 }
 
 const ctx = getAudioCtx();
 trimPlaySource = ctx.createBufferSource();
 trimPlaySource.buffer = trimBuffer;
 trimPlaySource.connect(masterCompressor);
 
 trimPlayOffset = newOffset;
 trimPlaySource.start(0, trimPlayOffset);
 trimPlayStartTime = ctx.currentTime;
 trimIsPlaying = true;
 lastPlayedWasPreview = false;
 
 btnPlay.textContent = "Pause (Space)";
 btnStop.disabled = false;
 clearInterval(staTimer);
 staTimer = setInterval(updateTimeDisplay, 100);
 
 trimPlaySource.onended = () =>{
 if (!trimIsPlaying) return; 
 trimIsPlaying = false;
 trimPlayOffset = trimBuffer.duration;
 btnPlay.textContent = "Play (Space)";
 if (document.activeElement === btnStop) { btnPlay.focus(); }
 btnStop.disabled = true;
 clearInterval(staTimer);
 updateTimeDisplay();
 };
 
 updateTimeDisplay();
 }

  // Handle Play/Pause
  let trimIsLoading = false;
  let currentStaAssetId = null;
  async function togglePlay() {
  if (!select.value) {
  alert("Please select an audio file first.");
  return;
  }
  if (trimIsLoading) {
      alert("Please wait, the track is still loading...");
      return;
  }
 
    if (trimIsPlaying) {
      // Pause
      trimPlayOffset += getAudioCtx().currentTime - trimPlayStartTime;
      if (trimPlaySource) {
        trimPlaySource.onended = null;
        try { trimPlaySource.stop(); } catch(e) {}
 trimPlaySource = null;
 }
 trimIsPlaying = false;
 btnPlay.textContent = "Resume (Space)";
 clearInterval(staTimer);
 } else {
  // Play

  btnPlay.disabled = true;
  trimIsLoading = true;
  try {
    if (currentStaAssetId !== select.value || !trimBuffer) {
    trimBuffer = await decodeAudio(getAsset(select.value).objectURL);
    currentStaAssetId = select.value;
    trimPlayOffset = 0;
    }
  } catch (err) {
    statusEl.textContent = "Error loading audio file.";
    btnPlay.disabled = false;
    trimIsLoading = false;
    return;
  }
  btnPlay.disabled = false;
  trimIsLoading = false;
  statusEl.textContent = "";

  if (trimPlayOffset >= trimBuffer.duration) trimPlayOffset = 0;

 const ctx = getAudioCtx();
 trimPlaySource = ctx.createBufferSource();
 trimPlaySource.buffer = trimBuffer;
 trimPlaySource.connect(masterCompressor); // Route through master
 
 trimPlaySource.start(0, trimPlayOffset);
 trimPlayStartTime = ctx.currentTime;
 trimIsPlaying = true;
 lastPlayedWasPreview = false;
 
 btnPlay.textContent = "Pause (Space)";
 btnStop.disabled = false;
 staTimer = setInterval(updateTimeDisplay, 100);

 trimPlaySource.onended = () =>{
 if (!trimIsPlaying) return; // stopped manually
 trimIsPlaying = false;
 trimPlayOffset = trimBuffer.duration;
 btnPlay.textContent = "Play (Space)";
 if (document.activeElement === btnStop) { btnPlay.focus(); }
 btnStop.disabled = true;
 clearInterval(staTimer);
 updateTimeDisplay();
 };
 }
 }

 btnPlay.addEventListener('click', togglePlay);
 btnStop.addEventListener('click', stopAudio);

 function playClickSound(isStart) {
 const ctx = getAudioCtx();
 if (!ctx) return;
 const osc = ctx.createOscillator();
 const gain = ctx.createGain();
 osc.type = 'sine';
 osc.frequency.setValueAtTime(isStart ? 1200 : 800, ctx.currentTime);
 osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.03);
 gain.gain.setValueAtTime(0.5, ctx.currentTime);
 gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.03);
 osc.connect(gain);
 gain.connect(ctx.destination);
 osc.start();
 osc.stop(ctx.currentTime + 0.03);
 }

   function markStart() {
     const curr = getCurrentTime();
     trimStart = curr;
     displayStart.textContent = curr.toFixed(2) + "s";
     if (trimEnd === null && trimBuffer) {
       trimEnd = trimBuffer.duration;
       displayEnd.textContent = trimEnd.toFixed(2) + "s";
     }
     playClickSound(true);
     displayStart.style.backgroundColor = "rgba(40, 167, 69, 0.4)";
     setTimeout(() => displayStart.style.backgroundColor = "", 300);
   }
 
   function markEnd() {
     const curr = getCurrentTime();
     trimEnd = curr;
     displayEnd.textContent = curr.toFixed(2) + "s";
     playClickSound(false);
     displayEnd.style.backgroundColor = "rgba(220, 53, 69, 0.4)";
     setTimeout(() => displayEnd.style.backgroundColor = "", 300);
   }

 document.addEventListener('keydown', (e) =>{
 if (overlay.hidden) return;

 const code = e.code;
 
 // Do not intercept Space if typing in an input or focusing a button
 if (code === 'Space' && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'BUTTON')) return;

 if (code === 'Escape') {
 e.preventDefault();
 btnClose.click();
 return;
 }

 if (code === 'Space') {
 e.preventDefault();
 togglePlay();
 } else if (code === 'KeyS' || code === 'BracketLeft') {
 e.preventDefault();
 markStart();
 } else if (code === 'KeyE' || code === 'BracketRight') {
 e.preventDefault();
 markEnd();
 } else if (code === 'ArrowRight') {
 e.preventDefault();
 if (lastPlayedWasPreview) seekPreview(5);
 else seekAudio(5);
 } else if (code === 'ArrowLeft') {
 e.preventDefault();
 if (lastPlayedWasPreview) seekPreview(-5);
 else seekAudio(-5);
 }
 });

 let previewSrc = null;
 let isPreviewing = false;
 let previewStartTime = 0;
 let previewPlayOffset = 0;
 let lastPlayedWasPreview = false;

 function seekPreview(seconds) {
 if (!previewSrc && previewStartTime === 0) return;
 
 const actx = getAudioCtx();
  let currentRelativeTime = previewPlayOffset;
  if (isPreviewing) {
  currentRelativeTime += (actx.currentTime - previewStartTime);
  }
  let newRelativeOffset = currentRelativeTime + seconds;
  
  const start = trimStart;
  let end = trimEnd;
  if (end === null || end <= start) end = trimBuffer.duration;
  const trimDuration = end - start;

 if (newRelativeOffset< 0) newRelativeOffset = 0;
 if (newRelativeOffset >= trimDuration) newRelativeOffset = trimDuration - 0.1;

 if (previewSrc) {
 previewSrc.onended = null;
 try { previewSrc.stop(); } catch(_) {}
 }
 
 previewSrc = actx.createBufferSource();
 previewSrc.buffer = trimBuffer;
 previewSrc.connect(masterCompressor);
 
 previewPlayOffset = newRelativeOffset;
 previewStartTime = actx.currentTime;
 
 previewSrc.start(0, start + previewPlayOffset, trimDuration - previewPlayOffset);
 isPreviewing = true;
 lastPlayedWasPreview = true;
 
 previewSrc.onended = () =>{
 isPreviewing = false;
 previewPlayOffset = trimDuration;
 statusEl.textContent = "Preview finished.";
 };
 }

 btnPreview.addEventListener('click', async () =>{
  if (!select.value) return alert("Select a file");
  if (trimIsLoading) {
      alert("Please wait, the track is still loading...");
      return;
  }
 
 if (isPreviewing) {
 if (previewSrc) {
 previewSrc.onended = null;
 try { previewSrc.stop(); } catch(_) {}
 previewSrc = null;
 }
 isPreviewing = false;
 statusEl.textContent = "Preview stopped.";
 return;
 }

  if (trimIsPlaying) stopAudio();

  if (!trimBuffer) {
 
    btnPreview.disabled = true;
    trimIsLoading = true;
    try {
      trimBuffer = await decodeAudio(getAsset(select.value).objectURL);
      currentStaAssetId = select.value;
    } catch (err) {
      statusEl.textContent = "Error loading audio file.";
      btnPreview.disabled = false;
      trimIsLoading = false;
      return;
    }
    btnPreview.disabled = false;
    trimIsLoading = false;
    statusEl.textContent = "";
  }
  
  const actx = getAudioCtx();
  const buffer = trimBuffer;
  const start = trimStart;
  let end = trimEnd;
  if (start >= buffer.duration) { alert('Start time cannot exceed file duration.'); return; }
  if (end === null || end > buffer.duration) end = buffer.duration;
  if (end <= start) { alert('Trim End must be after Trim Start.'); return; }

 previewPlayOffset = 0;
 previewStartTime = actx.currentTime;
 
 previewSrc = actx.createBufferSource();
 previewSrc.buffer = buffer;
 previewSrc.connect(masterCompressor);
 previewSrc.start(0, start, end - start);
 isPreviewing = true;
 lastPlayedWasPreview = true;
 
 statusEl.textContent = "Previewing trimmed audio...";
 
 previewSrc.onended = () =>{
 isPreviewing = false;
 previewPlayOffset = end - start;
 statusEl.textContent = "Preview finished.";
 };
 });

 btnExport.addEventListener('click', async () =>{
  if (isExportingMedia) { alert('An export is already in progress. Please wait.'); return; }
  if (!select.value) return alert("Select a file to trim");
  const asset = getAsset(select.value);
 
 statusEl.textContent = "Processing... please wait.";
 announce("Processing trim... please wait.");
 
 try {
 isExportingMedia = true; // Block tab closure
 
 if (!trimBuffer) trimBuffer = await decodeAudio(asset.objectURL);
 const buffer = trimBuffer;

  const start = trimStart;
  let end = trimEnd;
  if (end === null || end > buffer.duration) end = buffer.duration;
  if (start >= buffer.duration) throw new Error("Start time cannot exceed file duration.");
  if (end > buffer.duration) end = buffer.duration;
  const dur = end - start;

  if (dur<= 0) throw new Error("Trim End must be after Trim Start.");

 const sr = buffer.sampleRate;
 const numCh = buffer.numberOfChannels;
 const offline = new OfflineAudioContext(numCh, Math.ceil(dur * sr), sr);
 const src = offline.createBufferSource();
 src.buffer = buffer;
 src.connect(offline.destination);
 src.start(0, start, dur);

 const trimmed = await offline.startRendering();
 const wavBlob = await audioBufferToWav(trimmed);
 
 downloadBlob(wavBlob, `${asset.name}_super_trimmed.wav`);
 
 statusEl.textContent = "Trim completed successfully!";
 announce("Trim completed successfully");
 } catch(err) {
 statusEl.textContent = "Error: "+ err.message;
 announce("Error during trim: "+ err.message, true);
 alert("Error: "+ err.message); // Explicit alert to ensure user knows WHY it failed
 } finally {
 isExportingMedia = false;
 }
 });

 select.addEventListener('change', () => {
   stopAudio();
   // Stop preview and reset values
   if (isPreviewing) {
     if (previewSrc) {
       previewSrc.onended = null;
       try { previewSrc.stop(); } catch(_) {}
       previewSrc = null;
     }
     isPreviewing = false;
   }
   trimStart = 0;
   trimEnd = null;
   displayStart.textContent = 'Not set';
   displayEnd.textContent = 'Not set';
   statusEl.textContent = '';
 });
}
