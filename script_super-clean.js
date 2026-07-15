// ─────────────────────────────────────────────────────────────
// TOOL 9 - SUPER CLEAN AUDIO (Live Cut)
// ─────────────────────────────────────────────────────────────

let sclTimer = null;
let sclPlaySource = null;
let sclPlayStartTime = 0;
let sclPlayOffset = 0;
let sclIsPlaying = false;
let sclBuffer = null;

let sclCutRegions = [];
let sclActiveCut = { start: null, end: null, id: null };
let sclLastAction = null;
let sclCutCounter = 0;

let sclPreviewNodes = [];
let isSclPreviewing = false;
let sclPreviewStartTime = 0;
let sclPreviewPlayOffset = 0;
let sclLastPlayedWasPreview = false;
let currentSclAssetId = null;
let sclIsLoading = false;

function initSuperClean() {
  const select = document.getElementById('scl-audio-select');
  const btnPlay = document.getElementById('btn-scl-play');
  const btnStop = document.getElementById('btn-scl-stop');
  const timeDisplay = document.getElementById('scl-time-display');
  const inputStart = document.getElementById('scl-start');
  const inputEnd = document.getElementById('scl-end');
  const btnSetStart = document.getElementById('btn-scl-set-start');
  const btnSetEnd = document.getElementById('btn-scl-set-end');
  const tbody = document.getElementById('scl-cuts-tbody');
  
  const btnPreview = document.getElementById('btn-scl-preview');
  const btnExport = document.getElementById('btn-scl-export');
  const statusEl = document.getElementById('scl-status');
  const announcer = document.getElementById('scl-sr-announcer');

  const btnEnter = document.getElementById('btn-enter-super-clean');
  const btnClose = document.getElementById('btn-close-super-clean');
  const overlay = document.getElementById('super-clean-overlay');
  const mainApp = document.querySelector('main');
  const footerApp = document.querySelector('footer');
  const container = overlay.querySelector('.sm-container');

  btnEnter.addEventListener('click', () => {
    overlay.hidden = false;
    overlay.style.display = 'flex';
    mainApp.setAttribute('aria-hidden', 'true');
    footerApp.setAttribute('aria-hidden', 'true');
    container.focus();
    announce('Entered Super Clean Audio. Application mode active.');
  });

  // Global key listener for c
  window.addEventListener('keydown', (e) => {
    const tag = e.target.tagName.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

    if (e.key.toLowerCase() === 'c' && (overlay.hidden || overlay.style.display === 'none')) {
      const smOverlay = document.getElementById('super-mode-overlay');
      const stOverlay = document.getElementById('super-trim-overlay');
      if ((smOverlay && !smOverlay.hidden) || (stOverlay && !stOverlay.hidden)) return;
      e.preventDefault();
      btnEnter.click();
    }
  });

  btnClose.addEventListener('click', () => {
    stopAudio();
    stopPreview();
    overlay.hidden = true;
    overlay.style.display = 'none';
    mainApp.removeAttribute('aria-hidden');
    footerApp.removeAttribute('aria-hidden');
    btnEnter.focus();
    announce('Exited Super Clean Audio.');
  });

  select.addEventListener('change', () => {
    stopAudio();
    stopPreview();
    sclCutRegions = [];
    sclActiveCut = { start: null, end: null, id: null };
    sclLastAction = null;
    inputStart.value = '';
    inputEnd.value = '';
    renderCutsTable();
  });

  function formatTime(secs) {
    return Number(secs).toFixed(3) + "s";
  }

  function getCurrentTime() {
    if (sclIsPlaying) {
      return sclPlayOffset + (getAudioCtx().currentTime - sclPlayStartTime);
    }
    return sclPlayOffset;
  }

  function updateTimeDisplay() {
    timeDisplay.textContent = formatTime(getCurrentTime());
  }

  function stopAudio() {
    if (sclPlaySource) {
      sclPlaySource.onended = null;
      try { sclPlaySource.stop(); } catch(e) {}
      sclPlaySource = null;
    }
    sclIsPlaying = false;
    sclPlayOffset = 0;
    clearInterval(sclTimer);
    updateTimeDisplay();
    btnPlay.textContent = "Play (Space)";
    btnStop.disabled = true;
    sclLastPlayedWasPreview = false;
  }

  function seekAudio(seconds) {
    if (!sclBuffer) return;
    
    let current = sclIsPlaying ? getCurrentTime() : sclPlayOffset;
    let newOffset = current + seconds;
    if (newOffset < 0) newOffset = 0;
    if (newOffset >= sclBuffer.duration) newOffset = sclBuffer.duration - 0.1;

    if (sclPlaySource) {
      sclPlaySource.onended = null;
      try { sclPlaySource.stop(); } catch(e) {}
    }
    
    const ctx = getAudioCtx();
    sclPlaySource = ctx.createBufferSource();
    sclPlaySource.buffer = sclBuffer;
    sclPlaySource.connect(masterCompressor);
    
    sclPlayOffset = newOffset;
    sclPlaySource.start(0, sclPlayOffset);
    sclPlayStartTime = ctx.currentTime;
    sclIsPlaying = true;
    sclLastPlayedWasPreview = false;
    
    btnPlay.textContent = "Pause (Space)";
    btnStop.disabled = false;
    clearInterval(sclTimer);
    sclTimer = setInterval(updateTimeDisplay, 100);
    
    sclPlaySource.onended = () => {
      if (!sclIsPlaying) return; 
      sclIsPlaying = false;
      sclPlayOffset = sclBuffer.duration;
      btnPlay.textContent = "Play (Space)";
      btnStop.disabled = true;
      clearInterval(sclTimer);
      updateTimeDisplay();
    };
    
    updateTimeDisplay();
  }

  async function togglePlay() {
    if (!select.value) {
      alert("Please select an audio file first.");
      return;
    }
    if (sclIsLoading) return;
    if (isSclPreviewing) {
      stopPreview();
    }
    
    if (sclIsPlaying) {
      sclPlayOffset += getAudioCtx().currentTime - sclPlayStartTime;
      if (sclPlaySource) {
        sclPlaySource.onended = null;
        try { sclPlaySource.stop(); } catch(e) {}
        sclPlaySource = null;
      }
      sclIsPlaying = false;
      btnPlay.textContent = "Resume (Space)";
      clearInterval(sclTimer);
    } else {
      statusEl.textContent = "Loading audio engine...";
      btnPlay.disabled = true;
      sclIsLoading = true;
      try {
        if (currentSclAssetId !== select.value || !sclBuffer) {
          sclBuffer = await decodeAudio(getAsset(select.value).objectURL);
          currentSclAssetId = select.value;
          sclPlayOffset = 0;
        }
      } catch (err) {
        statusEl.textContent = "Error loading audio file.";
        btnPlay.disabled = false;
        sclIsLoading = false;
        return;
      }
      btnPlay.disabled = false;
      sclIsLoading = false;
      statusEl.textContent = "";

      if (sclPlayOffset >= sclBuffer.duration) sclPlayOffset = 0;

      const ctx = getAudioCtx();
      sclPlaySource = ctx.createBufferSource();
      sclPlaySource.buffer = sclBuffer;
      sclPlaySource.connect(masterCompressor); 
      
      sclPlaySource.start(0, sclPlayOffset);
      sclPlayStartTime = ctx.currentTime;
      sclIsPlaying = true;
      sclLastPlayedWasPreview = false;
      
      btnPlay.textContent = "Pause (Space)";
      btnStop.disabled = false;
      sclTimer = setInterval(updateTimeDisplay, 100);

      sclPlaySource.onended = () => {
        if (!sclIsPlaying) return; 
        sclIsPlaying = false;
        sclPlayOffset = sclBuffer.duration;
        btnPlay.textContent = "Play (Space)";
        btnStop.disabled = true;
        clearInterval(sclTimer);
        updateTimeDisplay();
      };
    }
  }

  btnPlay.addEventListener('click', togglePlay);
  btnStop.addEventListener('click', () => { stopAudio(); stopPreview(); });

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
    if (!sclBuffer) return;
    const curr = getCurrentTime();
    
    if (sclLastAction === 'end') {
      sclActiveCut = { start: null, end: null, id: null };
    }

    sclActiveCut.start = curr;
    if (sclActiveCut.end === null) sclActiveCut.end = sclBuffer.duration;

    if (!sclActiveCut.id) sclActiveCut.id = 'cut-' + (++sclCutCounter);

    const idx = sclCutRegions.findIndex(c => c.id === sclActiveCut.id);
    if (idx === -1) {
      sclCutRegions.push({ ...sclActiveCut });
    } else {
      sclCutRegions[idx] = { ...sclActiveCut };
    }

    inputStart.value = sclActiveCut.start.toFixed(2);
    inputEnd.value = sclActiveCut.end.toFixed(2);
    sclLastAction = 'start';

    renderCutsTable();

    playClickSound(true);
    inputStart.style.backgroundColor = "rgba(40, 167, 69, 0.4)";
    setTimeout(() => inputStart.style.backgroundColor = "", 300);
  }

  function markEnd() {
    if (!sclBuffer) return;
    const curr = getCurrentTime();
    
    if (sclLastAction === null) {
      sclActiveCut.start = 0;
    }

    if (curr <= sclActiveCut.start) {
      announce("End time cannot be before start time.");
      return;
    }

    sclActiveCut.end = curr;
    if (sclActiveCut.start === null) sclActiveCut.start = 0;

    if (!sclActiveCut.id) sclActiveCut.id = 'cut-' + (++sclCutCounter);

    const idx = sclCutRegions.findIndex(c => c.id === sclActiveCut.id);
    if (idx === -1) {
      sclCutRegions.push({ ...sclActiveCut });
    } else {
      sclCutRegions[idx] = { ...sclActiveCut };
    }
    
    inputStart.value = sclActiveCut.start.toFixed(2);
    inputEnd.value = sclActiveCut.end.toFixed(2);
    sclLastAction = 'end';

    renderCutsTable();

    playClickSound(false);
    inputEnd.style.backgroundColor = "rgba(220, 53, 69, 0.4)";
    setTimeout(() => inputEnd.style.backgroundColor = "", 300);
  }

  btnSetStart.addEventListener('click', markStart);
  btnSetEnd.addEventListener('click', markEnd);

  function renderCutsTable() {
    sclCutRegions.sort((a, b) => a.start - b.start);
    
    if (sclCutRegions.length === 0 && sclActiveCut.start === null) {
      tbody.innerHTML = '<tr id="scl-cuts-empty"><td colspan="4" class="empty-cell"> No cuts defined yet.</td></tr>';
      return;
    }

    tbody.innerHTML = '';
    
    let count = 1;
    sclCutRegions.forEach((cut) => {
      const tr = document.createElement('tr');
      const isCurrentActive = (cut.id === sclActiveCut.id);
      if (isCurrentActive) {
        tr.style.backgroundColor = "rgba(124, 111, 255, 0.1)"; 
      }
      
      tr.innerHTML = `
        <td>${count++}</td>
        <td>${cut.start.toFixed(2)} s</td>
        <td>${cut.end.toFixed(2)} s</td>
        <td>
          <button class="btn btn-danger btn-sm" aria-label="Remove cut">Remove</button>
        </td>
      `;
      tr.querySelector('button').addEventListener('click', () => {
        sclCutRegions = sclCutRegions.filter(c => c.id !== cut.id);
        if (cut.id === sclActiveCut.id) {
          sclActiveCut = { start: null, end: null, id: null };
          sclLastAction = null;
          inputStart.value = '';
          inputEnd.value = '';
        }
        renderCutsTable();
      });
      tbody.appendChild(tr);
    });

    if (sclActiveCut.start !== null && !sclCutRegions.find(c => c.id === sclActiveCut.id)) {
      const tr = document.createElement('tr');
      tr.style.backgroundColor = "rgba(124, 111, 255, 0.1)"; 
      tr.innerHTML = `
        <td>${count} (Active)</td>
        <td>${sclActiveCut.start.toFixed(2)} s</td>
        <td>...</td>
        <td>
          <button class="btn btn-danger btn-sm" aria-label="Cancel active cut">Cancel</button>
        </td>
      `;
      tr.querySelector('button').addEventListener('click', () => {
        sclActiveCut = { start: null, end: null, id: null };
        sclLastAction = null;
        inputStart.value = '';
        inputEnd.value = '';
        renderCutsTable();
      });
      tbody.appendChild(tr);
    }
  }

  // Global Keyboard listener ONLY when overlay is active
  document.addEventListener('keydown', (e) => {
    if (overlay.hidden) return;

    const code = e.code;
    const key = e.key.toLowerCase();
    
    if (code === 'Space' && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'BUTTON')) return;

    if (code === 'Escape') {
      e.preventDefault();
      btnClose.click();
      return;
    }

    if (code === 'Space') {
      e.preventDefault();
      togglePlay();
    } else if (code === 'KeyS' || key === '[') {
      e.preventDefault();
      markStart();
    } else if (code === 'KeyE' || key === ']') {
      e.preventDefault();
      markEnd();
    } else if (code === 'ArrowRight') {
      e.preventDefault();
      if (sclLastPlayedWasPreview) seekPreview(5);
      else seekAudio(5); 
    } else if (code === 'ArrowLeft') {
      e.preventDefault();
      if (sclLastPlayedWasPreview) seekPreview(-5);
      else seekAudio(-5);
    }
  });

  function getKeepRegions(bufferDuration) {
    let sortedCuts = [...sclCutRegions].sort((a, b) => a.start - b.start);
    let keepRegions = [];
    let currentPos = 0;

    for (let cut of sortedCuts) {
      if (cut.start > currentPos) {
        keepRegions.push({ start: currentPos, end: cut.start });
      }
      if (cut.end > currentPos) {
        currentPos = cut.end;
      }
    }
    if (currentPos < bufferDuration) {
      keepRegions.push({ start: currentPos, end: bufferDuration });
    }
    return keepRegions;
  }

  function stopPreview() {
    if (!isSclPreviewing) return;
    sclPreviewNodes.forEach(node => {
      node.onended = null;
      try { node.stop(); } catch(e) {}
    });
    sclPreviewNodes = [];
    isSclPreviewing = false;
    btnPreview.textContent = "Preview Cleaned Audio";
    statusEl.textContent = "Preview stopped.";
  }

  btnPreview.addEventListener('click', async () => {
    if (!select.value) return alert("Select a file");
    if (sclIsLoading) return;
    
    if (isSclPreviewing) {
      stopPreview();
      return;
    }

    if (sclIsPlaying) stopAudio();

    if (!sclBuffer) {
      statusEl.textContent = "Loading audio engine...";
      btnPreview.disabled = true;
      sclIsLoading = true;
      try {
        sclBuffer = await decodeAudio(getAsset(select.value).objectURL);
        currentSclAssetId = select.value;
      } catch (err) {
        statusEl.textContent = "Error loading audio file.";
        btnPreview.disabled = false;
        sclIsLoading = false;
        return;
      }
      btnPreview.disabled = false;
      sclIsLoading = false;
      statusEl.textContent = "";
    }
    
    const keepRegions = getKeepRegions(sclBuffer.duration);
    if (keepRegions.length === 0) {
      alert("Everything is cut! Nothing to preview.");
      return;
    }

    const ctx = getAudioCtx();
    
    isSclPreviewing = true;
    sclPreviewNodes = [];
    sclPreviewStartTime = ctx.currentTime;
    sclPreviewPlayOffset = 0;
    
    let scheduleTime = ctx.currentTime;
    for (let region of keepRegions) {
      const dur = region.end - region.start;
      if (dur <= 0) continue;
      
      const source = ctx.createBufferSource();
      source.buffer = sclBuffer;
      source.connect(masterCompressor);
      source.start(scheduleTime, region.start, dur);
      
      sclPreviewNodes.push(source);
      scheduleTime += dur;
    }

    if (sclPreviewNodes.length > 0) {
      const lastNode = sclPreviewNodes[sclPreviewNodes.length - 1];
      lastNode.onended = () => {
        if (!isSclPreviewing) return;
        isSclPreviewing = false;
        btnPreview.textContent = "Preview Cleaned Audio";
        statusEl.textContent = "Preview finished.";
      };
    }

    sclLastPlayedWasPreview = true;
    btnPreview.textContent = "Stop Preview";
    statusEl.textContent = "Previewing cleaned audio...";
    announce("Previewing cleaned audio.");
  });

  function seekPreview(seconds) {
    if (!isSclPreviewing && sclPreviewStartTime === 0) return;
    
    const actx = getAudioCtx();
    let currentRelativeTime = sclPreviewPlayOffset;
    if (isSclPreviewing) {
      currentRelativeTime += (actx.currentTime - sclPreviewStartTime);
    }
    let newRelativeOffset = currentRelativeTime + seconds;
    
    const keepRegions = getKeepRegions(sclBuffer.duration);
    const totalDur = keepRegions.reduce((sum, r) => sum + (r.end - r.start), 0);
    
    if (newRelativeOffset >= totalDur) newRelativeOffset = totalDur - 0.1;
    if (newRelativeOffset < 0) newRelativeOffset = 0;

    stopPreview();
    
    isSclPreviewing = true;
    sclPreviewNodes = [];
    sclPreviewStartTime = actx.currentTime;
    sclPreviewPlayOffset = newRelativeOffset;

    let scheduleTime = actx.currentTime;
    let accumulated = 0;
    
    for (let region of keepRegions) {
      let dur = region.end - region.start;
      if (dur <= 0) continue;
      
      let regionStart = accumulated;
      let regionEnd = accumulated + dur;

      if (newRelativeOffset >= regionEnd) {
        accumulated += dur;
        continue;
      }

      let playStartOffset = region.start;
      let playDuration = dur;

      if (newRelativeOffset > regionStart) {
        let skipInsideRegion = newRelativeOffset - regionStart;
        playStartOffset = region.start + skipInsideRegion;
        playDuration = dur - skipInsideRegion;
      }

      const source = actx.createBufferSource();
      source.buffer = sclBuffer;
      source.connect(masterCompressor);
      source.start(scheduleTime, playStartOffset, playDuration);
      sclPreviewNodes.push(source);
      
      scheduleTime += playDuration;
      accumulated += dur;
    }

    if (sclPreviewNodes.length > 0) {
      const lastNode = sclPreviewNodes[sclPreviewNodes.length - 1];
      lastNode.onended = () => {
        if (!isSclPreviewing) return;
        isSclPreviewing = false;
        btnPreview.textContent = "Preview Cleaned Audio";
        statusEl.textContent = "Preview finished.";
      };
    }
    
    sclLastPlayedWasPreview = true;
    btnPreview.textContent = "Stop Preview";
    statusEl.textContent = "Previewing cleaned audio...";
  }

  btnExport.addEventListener('click', async () => {
    if (isExportingMedia) { alert('An export is already in progress. Please wait.'); return; }
    if (!select.value) return alert("Select a file to clean");
    
    const asset = getAsset(select.value);
    
    try {
      isExportingMedia = true;
      btnExport.disabled = true;
      btnExport.textContent = "Exporting...";
      
      statusEl.textContent = "Processing... please wait.";
      announce("Processing cleaned audio... please wait.");
      
      if (!sclBuffer) sclBuffer = await decodeAudio(asset.objectURL);
      
      const keepRegions = getKeepRegions(sclBuffer.duration);
      if (keepRegions.length === 0) throw new Error("Everything is cut! Cannot export empty file.");

      const totalDur = keepRegions.reduce((sum, r) => sum + (r.end - r.start), 0);
      const sr = sclBuffer.sampleRate;
      const numCh = sclBuffer.numberOfChannels;
      const offline = new OfflineAudioContext(numCh, Math.ceil(totalDur * sr), sr);
      
      let scheduleTime = 0;
      for (let region of keepRegions) {
        const dur = region.end - region.start;
        if (dur <= 0) continue;
        const src = offline.createBufferSource();
        src.buffer = sclBuffer;
        src.connect(offline.destination);
        src.start(scheduleTime, region.start, dur);
        scheduleTime += dur;
      }

      const cleanedBuffer = await offline.startRendering();
      const wavBlob = await audioBufferToWav(cleanedBuffer);
      
      downloadBlob(wavBlob, `${asset.name}_super_cleaned.wav`);
      statusEl.textContent = "Export complete!";
      announce("Export complete.");
      
    } catch (err) {
      statusEl.textContent = "Error: " + err.message;
      announce("Error during export.");
    } finally {
      isExportingMedia = false;
      btnExport.disabled = false;
      btnExport.textContent = "Download Cleaned WAV";
    }
  });

}
