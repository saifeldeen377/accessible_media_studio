// ─────────────────────────────────────────────────────────────
// TOOL 9 - Super Cut Audio (Live Cut)
// ─────────────────────────────────────────────────────────────

let sctTimer = null;
let sctPlaySource = null;
let sctPlayStartTime = 0;
let sctPlayOffset = 0;
let sctIsPlaying = false;
let sctBuffer = null;

let sctCutRegions = [];
let sctActiveCut = { start: null, end: null, id: null };
let sctLastAction = null;
let sctCutCounter = 0;

let sctPreviewNodes = [];
let issctPreviewing = false;
let sctPreviewStartTime = 0;
let sctPreviewPlayOffset = 0;
let sctLastPlayedWasPreview = false;
let currentsctAssetId = null;
let sctIsLoading = false;

function initSuperCut() {
  const select = document.getElementById('sct-audio-select');
  const btnPlay = document.getElementById('btn-sct-play');
  const btnStop = document.getElementById('btn-sct-stop');
  const timeDisplay = document.getElementById('sct-time-display');
  const displayStart = document.getElementById('sct-start-display');
  const displayEnd = document.getElementById('sct-end-display');
  const tbody = document.getElementById('sct-cuts-tbody');
  const cutsCountDisplay = document.getElementById('sct-cuts-count');
  
  const btnManageCuts = document.getElementById('btn-sct-manage-cuts');
  const btnManageClose = document.getElementById('btn-sct-manage-close');
  const btnManageDeleteAll = document.getElementById('btn-sct-delete-all');
  const manageDialog = document.getElementById('sct-manage-dialog');
  
  const btnPreview = document.getElementById('btn-sct-preview');
  const btnExport = document.getElementById('btn-sct-export');
  const statusEl = document.getElementById('sct-status');
  const announcer = document.getElementById('sct-sr-announcer');

  const btnEnter = document.getElementById('btn-enter-super-cut');
  const btnClose = document.getElementById('btn-close-super-cut');
  const overlay = document.getElementById('super-cut-overlay');
  const mainApp = document.querySelector('main');
  const footerApp = document.querySelector('footer');
  const container = overlay.querySelector('.sm-container');

  setupFocusTrap(overlay);

  btnEnter.addEventListener('click', () => {
    overlay.hidden = false;
    overlay.style.display = 'flex';
    setAppBackgroundInert(true);
    container.focus();
    announce('Entered Super Cut Audio. Application mode active.');
  });

  btnManageCuts.addEventListener('click', () => {
    manageDialog.showModal();
    if (sctCutRegions.length === 0 && (sctActiveCut.start === null || sctActiveCut.end === null)) {
      announce('There are no cuts registered to manage or delete.', true);
    }
    btnManageClose.focus();
  });

  btnManageClose.addEventListener('click', () => {
    manageDialog.close();
    btnManageCuts.focus();
  });

  btnManageDeleteAll.addEventListener('click', () => {
    if (!confirm('Are you sure you want to delete all cuts?')) return;
    sctCutRegions = [];
    sctActiveCut = { start: null, end: null, id: null };
    sctLastAction = null;
    displayStart.textContent = 'Not set';
    displayEnd.textContent = 'Not set';
    renderCutsTable();
    btnManageClose.focus();
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
    setAppBackgroundInert(false);
    btnEnter.focus();
    announce('Exited Super Cut Audio.');
  });

  select.addEventListener('change', () => {
    stopAudio();
    stopPreview();
    sctCutRegions = [];
    sctActiveCut = { start: null, end: null, id: null };
    sctLastAction = null;
    displayStart.textContent = 'Not set';
    displayEnd.textContent = 'Not set';
    renderCutsTable();
  });

  function formatTime(secs) {
    return Number(secs).toFixed(3) + "s";
  }

  function getAbsoluteTimeFromPreview(relativeTime) {
    const keepRegions = getKeepRegions(sctBuffer ? sctBuffer.duration : 0);
    let accumulated = 0;
    for (let region of keepRegions) {
      const dur = region.end - region.start;
      if (relativeTime <= accumulated + dur) {
        return region.start + (relativeTime - accumulated);
      }
      accumulated += dur;
    }
    return sctBuffer ? sctBuffer.duration : 0;
  }

  function getCurrentTime() {
    if (sctIsPlaying) {
      return sctPlayOffset + (getAudioCtx().currentTime - sctPlayStartTime);
    }
    if (issctPreviewing) {
      let relativeTime = sctPreviewPlayOffset + (getAudioCtx().currentTime - sctPreviewStartTime);
      return getAbsoluteTimeFromPreview(relativeTime);
    }
    return sctPlayOffset;
  }

  function updateTimeDisplay() {
    timeDisplay.textContent = formatTime(getCurrentTime());
  }

  function stopAudio() {
    if (sctPlaySource) {
      sctPlaySource.onended = null;
      try { sctPlaySource.stop(); } catch(e) {}
      sctPlaySource = null;
    }
    sctIsPlaying = false;
    sctPlayOffset = 0;
    clearInterval(sctTimer);
    updateTimeDisplay();
    btnPlay.textContent = "Play (Space)";
    if (document.activeElement === btnStop) { btnPlay.focus(); }
    btnStop.disabled = true;
    sctLastPlayedWasPreview = false;
  }

  function seekAudio(seconds) {
    if (!sctBuffer) return;
    
    let current = sctIsPlaying ? getCurrentTime() : sctPlayOffset;
    let newOffset = current + seconds;
    if (newOffset < 0) newOffset = 0;
    if (newOffset >= sctBuffer.duration) newOffset = sctBuffer.duration - 0.1;

    if (sctPlaySource) {
      sctPlaySource.onended = null;
      try { sctPlaySource.stop(); } catch(e) {}
    }
    
    const ctx = getAudioCtx();
    sctPlaySource = ctx.createBufferSource();
    sctPlaySource.buffer = sctBuffer;
    sctPlaySource.connect(masterCompressor);
    
    sctPlayOffset = newOffset;
    sctPlaySource.start(0, sctPlayOffset);
    sctPlayStartTime = ctx.currentTime;
    sctIsPlaying = true;
    sctLastPlayedWasPreview = false;
    
    btnPlay.textContent = "Pause (Space)";
    btnStop.disabled = false;
    clearInterval(sctTimer);
    sctTimer = setInterval(updateTimeDisplay, 100);
    
    sctPlaySource.onended = () => {
      if (!sctIsPlaying) return; 
      sctIsPlaying = false;
      sctPlayOffset = sctBuffer.duration;
      btnPlay.textContent = "Play (Space)";
      if (document.activeElement === btnStop) { btnPlay.focus(); }
      btnStop.disabled = true;
      clearInterval(sctTimer);
      updateTimeDisplay();
    };
    
    updateTimeDisplay();
  }

  async function togglePlay() {
    if (!select.value) {
      alert("Please select an audio file first.");
      return;
    }
    if (sctIsLoading) {
      alert("Please wait, the track is still loading...");
      return;
    }
    if (issctPreviewing) {
      stopPreview();
    }
    
    if (sctIsPlaying) {
      sctPlayOffset += getAudioCtx().currentTime - sctPlayStartTime;
      if (sctPlaySource) {
        sctPlaySource.onended = null;
        try { sctPlaySource.stop(); } catch(e) {}
        sctPlaySource = null;
      }
      sctIsPlaying = false;
      btnPlay.textContent = "Resume (Space)";
      clearInterval(sctTimer);
    } else {

      sctIsLoading = true;
      try {
        if (currentsctAssetId !== select.value || !sctBuffer) {
          sctBuffer = await decodeAudio(getAsset(select.value).objectURL);
          currentsctAssetId = select.value;
          sctPlayOffset = 0;
        }
      } catch (err) {
        statusEl.textContent = "Error loading audio file.";
        sctIsLoading = false;
        return;
      }
      sctIsLoading = false;
      statusEl.textContent = "";

      if (sctPlayOffset >= sctBuffer.duration) sctPlayOffset = 0;

      const ctx = getAudioCtx();
      sctPlaySource = ctx.createBufferSource();
      sctPlaySource.buffer = sctBuffer;
      sctPlaySource.connect(masterCompressor); 
      
      sctPlaySource.start(0, sctPlayOffset);
      sctPlayStartTime = ctx.currentTime;
      sctIsPlaying = true;
      sctLastPlayedWasPreview = false;
      
      btnPlay.textContent = "Pause (Space)";
      btnStop.disabled = false;
      sctTimer = setInterval(updateTimeDisplay, 100);

      sctPlaySource.onended = () => {
        if (!sctIsPlaying) return; 
        sctIsPlaying = false;
        sctPlayOffset = sctBuffer.duration;
        btnPlay.textContent = "Play (Space)";
        if (document.activeElement === btnStop) { btnPlay.focus(); }
        btnStop.disabled = true;
        clearInterval(sctTimer);
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
    if (!sctBuffer) return;
    const curr = getCurrentTime();
    
    if (sctLastAction === 'end') {
      sctActiveCut = { start: null, end: null, id: null };
    }

    sctActiveCut.start = curr;
    if (sctActiveCut.end === null) sctActiveCut.end = sctBuffer.duration;

    if (!sctActiveCut.id) sctActiveCut.id = 'cut-' + (++sctCutCounter);

    const idx = sctCutRegions.findIndex(c => c.id === sctActiveCut.id);
    if (idx === -1) {
      sctCutRegions.push({ ...sctActiveCut });
    } else {
      sctCutRegions[idx] = { ...sctActiveCut };
    }

    displayStart.textContent = sctActiveCut.start.toFixed(2) + "s";
    displayEnd.textContent = sctActiveCut.end.toFixed(2) + "s";
    sctLastAction = 'start';

    renderCutsTable();

    playClickSound(true);
    displayStart.style.backgroundColor = "rgba(40, 167, 69, 0.4)";
    setTimeout(() => displayStart.style.backgroundColor = "", 300);
  }

  function markEnd() {
    if (!sctBuffer) return;
    const curr = getCurrentTime();
    
    if (sctLastAction === null) {
      sctActiveCut.start = 0;
    }

    if (curr <= sctActiveCut.start) {
      announce("End time cannot be before start time.");
      return;
    }

    sctActiveCut.end = curr;
    if (sctActiveCut.start === null) sctActiveCut.start = 0;

    if (!sctActiveCut.id) sctActiveCut.id = 'cut-' + (++sctCutCounter);

    const idx = sctCutRegions.findIndex(c => c.id === sctActiveCut.id);
    if (idx === -1) {
      sctCutRegions.push({ ...sctActiveCut });
    } else {
      sctCutRegions[idx] = { ...sctActiveCut };
    }
    
    displayStart.textContent = sctActiveCut.start.toFixed(2) + "s";
    displayEnd.textContent = sctActiveCut.end.toFixed(2) + "s";
    sctLastAction = 'end';

    renderCutsTable();

    playClickSound(false);
    displayEnd.style.backgroundColor = "rgba(220, 53, 69, 0.4)";
    setTimeout(() => displayEnd.style.backgroundColor = "", 300);
  }

  function renderCutsTable() {
    sctCutRegions.sort((a, b) => a.start - b.start);
    
    cutsCountDisplay.textContent = sctCutRegions.length;

    if (sctCutRegions.length === 0) {
      btnManageDeleteAll.style.display = 'none';
    } else {
      btnManageDeleteAll.style.display = 'inline-block';
    }

    if (sctCutRegions.length === 0 && sctActiveCut.start === null) {
      tbody.innerHTML = '<tr id="sct-cuts-empty"><td colspan="4" class="empty-cell"> No cuts defined yet.</td></tr>';
      return;
    }

    tbody.innerHTML = '';
    
    let count = 1;
    sctCutRegions.forEach((cut) => {
      const tr = document.createElement('tr');
      const isCurrentActive = (cut.id === sctActiveCut.id);
      if (isCurrentActive) {
        tr.style.backgroundColor = "rgba(124, 111, 255, 0.1)"; 
      }
      
      tr.innerHTML = `
        <td>${count++}</td>
        <td>${cut.start.toFixed(2)} s</td>
        <td>${cut.end.toFixed(2)} s</td>
        <td>
          <button class="btn btn-danger btn-sm" aria-label="Remove cut from ${cut.start.toFixed(2)} to ${cut.end.toFixed(2)}">Remove</button>
        </td>
      `;
      tr.querySelector('button').addEventListener('click', () => {
        sctCutRegions = sctCutRegions.filter(c => c.id !== cut.id);
        
        let nextFocus = tr.nextElementSibling?.querySelector('button');
        if (!nextFocus) nextFocus = tr.previousElementSibling?.querySelector('button');
        if (!nextFocus) nextFocus = btnManageClose;

        tr.remove();

        cutsCountDisplay.textContent = sctCutRegions.length;

        if (cut.id === sctActiveCut.id) {
          sctActiveCut = { start: null, end: null, id: null };
          sctLastAction = null;
          displayStart.textContent = 'Not set';
          displayEnd.textContent = 'Not set';
        }
        
        if (sctCutRegions.length === 0 && sctActiveCut.start === null) {
            renderCutsTable();
            btnManageClose.focus();
        } else {
            let counter = 1;
            tbody.querySelectorAll('tr').forEach(row => {
                const td = row.querySelector('td:first-child');
                if (td && !td.textContent.includes('Active')) {
                    td.textContent = counter++;
                }
            });
            nextFocus?.focus();
        }
      });
      tbody.appendChild(tr);
    });

    if (sctActiveCut.start !== null && !sctCutRegions.find(c => c.id === sctActiveCut.id)) {
      const tr = document.createElement('tr');
      tr.style.backgroundColor = "rgba(124, 111, 255, 0.1)"; 
      tr.innerHTML = `
        <td>${count} (Active)</td>
        <td>${sctActiveCut.start.toFixed(2)} s</td>
        <td>...</td>
        <td>
          <button class="btn btn-danger btn-sm" aria-label="Cancel active cut starting at ${sctActiveCut.start.toFixed(2)}">Cancel</button>
        </td>
      `;
      tr.querySelector('button').addEventListener('click', () => {
        sctActiveCut = { start: null, end: null, id: null };
        sctLastAction = null;
        displayStart.textContent = 'Not set';
        displayEnd.textContent = 'Not set';
        
        let nextFocus = tr.previousElementSibling?.querySelector('button');
        if (!nextFocus) nextFocus = btnManageClose;
        
        tr.remove();
        
        if (sctCutRegions.length === 0) {
            renderCutsTable();
            btnManageClose.focus();
        } else {
            nextFocus?.focus();
        }
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
      if (manageDialog.open) {
        e.preventDefault();
        manageDialog.close();
        btnManageCuts.focus();
        return;
      }
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
      if (sctLastPlayedWasPreview) seekPreview(5);
      else seekAudio(5); 
    } else if (code === 'ArrowLeft') {
      e.preventDefault();
      if (sctLastPlayedWasPreview) seekPreview(-5);
      else seekAudio(-5);
    }
  });

  function getKeepRegions(bufferDuration) {
    let sortedCuts = [...sctCutRegions].sort((a, b) => a.start - b.start);
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
    if (!issctPreviewing) return;
    sctPreviewNodes.forEach(node => {
      node.onended = null;
      try { node.stop(); } catch(e) {}
    });
    sctPreviewNodes = [];
    issctPreviewing = false;
    btnPreview.textContent = "Preview Remaining Audio";
    statusEl.textContent = "Preview stopped.";
  }

  btnPreview.addEventListener('click', async () => {
    if (!select.value) return alert("Select a file");
    if (sctIsLoading) {
      alert("Please wait, the track is still loading...");
      return;
    }
    
    if (issctPreviewing) {
      stopPreview();
      return;
    }

    if (sctIsPlaying) stopAudio();

    if (!sctBuffer) {

      sctIsLoading = true;
      try {
        sctBuffer = await decodeAudio(getAsset(select.value).objectURL);
        currentsctAssetId = select.value;
      } catch (err) {
        statusEl.textContent = "Error loading audio file.";
        sctIsLoading = false;
        return;
      }
      sctIsLoading = false;
      statusEl.textContent = "";
    }
    
    const keepRegions = getKeepRegions(sctBuffer.duration);
    if (keepRegions.length === 0) {
      alert("Everything is cut! Nothing to preview.");
      return;
    }

    const ctx = getAudioCtx();
    
    issctPreviewing = true;
    sctPreviewNodes = [];
    sctPreviewStartTime = ctx.currentTime;
    sctPreviewPlayOffset = 0;
    
    let scheduleTime = ctx.currentTime;
    for (let region of keepRegions) {
      const dur = region.end - region.start;
      if (dur <= 0) continue;
      
      const source = ctx.createBufferSource();
      source.buffer = sctBuffer;
      source.connect(masterCompressor);
      source.start(scheduleTime, region.start, dur);
      
      sctPreviewNodes.push(source);
      scheduleTime += dur;
    }

    if (sctPreviewNodes.length > 0) {
      const lastNode = sctPreviewNodes[sctPreviewNodes.length - 1];
      lastNode.onended = () => {
        if (!issctPreviewing) return;
        issctPreviewing = false;
        btnPreview.textContent = "Preview Remaining Audio";
        statusEl.textContent = "Preview finished.";
      };
    }

    sctLastPlayedWasPreview = true;
    btnPreview.textContent = "Stop Preview";
    statusEl.textContent = "Previewing remaining audio...";
    announce("Previewing remaining audio.");
  });

  function seekPreview(seconds) {
    if (!issctPreviewing && sctPreviewStartTime === 0) return;
    
    const actx = getAudioCtx();
    let currentRelativeTime = sctPreviewPlayOffset;
    if (issctPreviewing) {
      currentRelativeTime += (actx.currentTime - sctPreviewStartTime);
    }
    let newRelativeOffset = currentRelativeTime + seconds;
    
    const keepRegions = getKeepRegions(sctBuffer.duration);
    const totalDur = keepRegions.reduce((sum, r) => sum + (r.end - r.start), 0);
    
    if (newRelativeOffset >= totalDur) newRelativeOffset = totalDur - 0.1;
    if (newRelativeOffset < 0) newRelativeOffset = 0;

    stopPreview();
    
    issctPreviewing = true;
    sctPreviewNodes = [];
    sctPreviewStartTime = actx.currentTime;
    sctPreviewPlayOffset = newRelativeOffset;

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
      source.buffer = sctBuffer;
      source.connect(masterCompressor);
      source.start(scheduleTime, playStartOffset, playDuration);
      sctPreviewNodes.push(source);
      
      scheduleTime += playDuration;
      accumulated += dur;
    }

    if (sctPreviewNodes.length > 0) {
      const lastNode = sctPreviewNodes[sctPreviewNodes.length - 1];
      lastNode.onended = () => {
        if (!issctPreviewing) return;
        issctPreviewing = false;
        btnPreview.textContent = "Preview Remaining Audio";
        statusEl.textContent = "Preview finished.";
      };
    }
    
    sctLastPlayedWasPreview = true;
    btnPreview.textContent = "Stop Preview";
    statusEl.textContent = "Previewing remaining audio...";
  }

  btnExport.addEventListener('click', async () => {
    if (isExportingMedia) { alert('An export is already in progress. Please wait.'); return; }
    if (!select.value) return alert("Select a file to process");
    
    const asset = getAsset(select.value);
    
    try {
      isExportingMedia = true;
      btnExport.textContent = "Exporting...";
      
      statusEl.textContent = "Processing... please wait.";
      announce("Processing remaining audio... please wait.");
      
      if (!sctBuffer) sctBuffer = await decodeAudio(asset.objectURL);
      
      const keepRegions = getKeepRegions(sctBuffer.duration);
      if (keepRegions.length === 0) throw new Error("Everything is cut! Cannot export empty file.");

      const totalDur = keepRegions.reduce((sum, r) => sum + (r.end - r.start), 0);
      const sr = sctBuffer.sampleRate;
      const numCh = sctBuffer.numberOfChannels;
      const offline = new OfflineAudioContext(numCh, Math.ceil(totalDur * sr), sr);
      
      let scheduleTime = 0;
      for (let region of keepRegions) {
        const dur = region.end - region.start;
        if (dur <= 0) continue;
        const src = offline.createBufferSource();
        src.buffer = sctBuffer;
        src.connect(offline.destination);
        src.start(scheduleTime, region.start, dur);
        scheduleTime += dur;
      }

      const cutBuffer = await offline.startRendering();
      const wavBlob = await audioBufferToWav(cutBuffer);
      
      downloadBlob(wavBlob, `${asset.name}_super_cut.wav`);
      statusEl.textContent = "Export complete!";
      announce("Export complete.");
    } catch (err) {
      statusEl.textContent = "Error: " + err.message;
      announce("Error during export.");
    } finally {
      isExportingMedia = false;
      btnExport.textContent = "Download Remaining WAV";
    }
  });

}
