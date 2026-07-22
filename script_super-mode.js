// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// TOOL 7 — Super Merger (سوبر مود)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// Headphone calibration variables
let smHeadphoneLatencySec = 0; 
let isCalibrating = false;
let calibrationTicksPlayed = 0;
let calibrationTapsCount = 0;
let tickIntervalId = null;
const tapTimeDiffs = [];
let calibrationStartTime = 0;

function initSuperMode() {
 const enterBtn = document.getElementById('btn-enter-super-mode');
 const overlay = document.getElementById('super-mode-overlay');
 setupFocusTrap(overlay);
 const closeBtn = document.getElementById('btn-close-super-mode');
 const baseSelect = document.getElementById('sm-base-select');
 const overlayForm = document.getElementById('form-sm-overlay');
 const goBtn = document.getElementById('btn-sm-go');
 const playPauseBtn = document.getElementById('btn-sm-play-pause');
 const exportBtn = document.getElementById('btn-sm-export');
 const resetMixBtn = document.getElementById('btn-sm-reset-mix');
 const exitToSetupBtn = document.getElementById('btn-sm-exit-to-setup');

 const btnManageOverlays = document.getElementById('btn-sm-manage-overlays');
 const btnManageClose = document.getElementById('btn-sm-manage-overlays-close');
 const btnManageReset = document.getElementById('btn-sm-manage-overlays-reset');
 const manageDialog = document.getElementById('sm-manage-overlays-dialog');
 setupFocusTrap(manageDialog);

 const baseVolInput = document.getElementById('sm-base-volume');
 const baseVolVal = document.getElementById('sm-base-vol-val');
 baseVolInput.addEventListener('input', () =>{
 baseVolVal.textContent = baseVolInput.value;
 if (smBaseAsset) {
 smBaseAsset.volume = parseFloat(baseVolInput.value) / 100;
 }
 if (smBaseAudio) {
 smBaseAudio.volume = parseFloat(baseVolInput.value) / 100;
 }
 });

 const overlayVolInput = document.getElementById('sm-overlay-volume');
 const overlayVolVal = document.getElementById('sm-overlay-vol-val');
 overlayVolInput.addEventListener('input', () =>{
 overlayVolVal.textContent = overlayVolInput.value;
 });

 enterBtn.addEventListener('click', enterSuperMode);
 closeBtn.addEventListener('click', exitSuperMode);

 baseSelect.addEventListener('change', () =>{
 const id = baseSelect.value;
 smBaseAsset = getAsset(id);
 if (smBaseAsset) {
 smBaseAsset.volume = parseFloat(baseVolInput.value) / 100;
 }
 updateSmGoButton();
 });

 document.getElementById('sm-overlay-key').addEventListener('input', (e) =>{
     e.target.setCustomValidity('');
 });

 overlayForm.addEventListener('submit', e =>{
 e.preventDefault();
 const assetId = document.getElementById('sm-overlay-select').value;
 const rawKey = document.getElementById('sm-overlay-key').value.trim().toLowerCase();

 if (!assetId) { announce('Please select an audio file.', true); return; }
 if (!rawKey) { announce('Please type a shortcut key.', true); return; }

 const exists = smOverlays.find(o =>o.key.toLowerCase() === rawKey);
 if (exists) {
     const keyInput = document.getElementById('sm-overlay-key');
     keyInput.setCustomValidity(`The key "${rawKey.toUpperCase()}" is already assigned to "${exists.name}". Choose a different key.`);
     keyInput.reportValidity();
     return;
 }

 const asset = getAsset(assetId);
 const volVal = parseFloat(overlayVolInput.value) || 100;
 const behaviorVal = document.getElementById('sm-overlay-behavior').value;
 smOverlays.push({
 id: `sm-overlay-${++smOverlayIdCounter}`,
 assetId,
 name: asset.name,
 key: rawKey,
 volume: volVal / 100,
 behavior: behaviorVal
 });

    const behaviorText = behaviorVal === 'overlap'? 'with overlap behavior': 'with cutoff behavior';
    announce(`Assigned key "${rawKey.toUpperCase()}" to "${asset.name}" at ${Math.round(volVal)}% volume, ${behaviorText}.`, true);
    
    renderSmShortcutsTable();
    document.getElementById('sm-overlay-select').value = '';
    document.getElementById('sm-overlay-key').value = '';
    overlayVolInput.value = 100;
    overlayVolVal.textContent = '100';
 });

 goBtn.addEventListener('click', startSuperModeLive);
 
 const continueBtn = document.getElementById('btn-sm-continue');
 if (continueBtn) {
     continueBtn.addEventListener('click', continueSuperModeLive);
 }
 exportBtn.addEventListener('click', () =>exportSuperModeWav(false));
 document.getElementById('btn-sm-save').addEventListener('click', () =>exportSuperModeWav(true));
 resetMixBtn.addEventListener('click', resetAndRecordFromScratch);
 exitToSetupBtn.addEventListener('click', exitToSetupView);

 btnManageOverlays.addEventListener('click', () =>{
    smManageEditId = null;
    renderManageOverlaysList();
    manageDialog.showModal();
    if (smOverlays.length === 0) {
        announce('There are no overlays added yet.', true);
    }
 });

 btnManageClose.addEventListener('click', () =>{
    smManageEditId = null;
    manageDialog.close();
    btnManageOverlays.focus();
 });

 btnManageReset.addEventListener('click', () =>{
    smOverlays.length = 0;
    renderManageOverlaysList();
    renderSmShortcutsTable();
    btnManageClose.focus();
    announce('All overlays reset.');
 });

 // Global key listener
 window.addEventListener('keydown', e =>{
 if (e.key === 'Escape'&& smActive) {
    if (manageDialog.open) {
        e.preventDefault();
        if (smManageEditId !== null) {
            announce("Edit cancelled.", true);
            const oldId = smManageEditId;
            smManageEditId = null;
            const card = document.querySelector(`.sm-card[data-id="${oldId}"]`);
            if (card) {
                card.querySelector('.sm-summary-view').hidden = false;
                card.querySelector('.sm-edit-view').hidden = true;
                const btn = card.querySelector('.btn-manage-edit');
                if (btn) btn.focus();
            }
        } else {
            manageDialog.close();
            btnManageOverlays.focus();
        }
        return;
    }
    const liveView = document.getElementById('sm-live-view');
    if (liveView && !liveView.hidden) {
        e.preventDefault();
        if (typeof exitToSetupView === 'function') {
            exitToSetupView();
        }
        return;
    }

    e.preventDefault();
    exitSuperMode();
    return;
 }

 const tag = e.target.tagName.toLowerCase();
 if (tag === 'input'|| tag === 'textarea'|| tag === 'select') return;

 // m key globally to open
 if (e.key.toLowerCase() === 'm'&& !smActive) {
 const stOverlay = document.getElementById('super-trim-overlay');
 if (stOverlay && !stOverlay.hidden && stOverlay.style.display !== 'none') return; // Don't open if Super Trim is open
 e.preventDefault();
 enterSuperMode();
 }
 });

 // Live Mixer keys listener
 window.addEventListener('keydown', e =>{
 if (e.repeat && e.key !== 'ArrowLeft'&& e.key !== 'ArrowRight') return; // Prevent duplicate triggers (allow held arrows)
 if (!smActive || !smBaseAudio) return;

 const liveView = document.getElementById('sm-live-view');
 if (liveView.hidden) return;

 const tag = e.target.tagName.toLowerCase();
 if (tag === 'input'|| tag === 'textarea'|| tag === 'select') return;

 const pressedKey = e.key.toLowerCase();
 const isShift = e.shiftKey;
 const isAlt = e.altKey;
 const isCtrl = e.ctrlKey;

 // â”€â”€â”€ Spacebar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 if (e.key === ''|| e.code === 'Space') {
 e.preventDefault();
 
  if (isCtrl && isShift) {
    // â”€â”€ Ctrl+Shift+Space: Cancel Silent Gap â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    handleCancelGap();
  } else if (isCtrl) {
  // ── Ctrl+Space: Soft Pause / Punch-In ──────────────────────────────
 const isAtEnd = smBaseAudio.currentTime >= (smBaseAudio.duration || 0) - 0.05;
 
 if (isAtEnd) {
     if (smIsActive()) {
         smRegularPauseBase(); // Timeline playing ->stop
     } else {
         smResumeBase(true);   // Timeline paused ->resume and punch-in
     }
 } else {
     if (smSoftPaused) {
         smResumeBase(true); // Punch in
     } else if (!smBaseAudio.paused) {
         smSoftPauseBase();  // Soft Pause
     } else {
         smResumeBase(true); // Punch in from replay gap
     }
 }

 } else if (isShift) {
 // â”€â”€ Shift+Space: Full Play/Pause (Hard) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 if (smIsActive()) {
 smRegularPauseBase(); // Hard pause everything
 } else {
 smResumeBase(false); // Normal resume (do not punch in)
 }

 } else {
 // â”€â”€ bare Space: Restart playback from 0 â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 restartSmPlayback();
 }

 return;
 }

 // Timeline navigation: ArrowLeft (seek back) & ArrowRight (seek forward)
 if (e.key === 'ArrowRight'|| e.code === 'ArrowRight') {
 e.preventDefault();
 if (isCtrl) {
 handleDeleteNext();
 } else {
 seekSmTimeline(5);
 }
 return;
 }
 if (e.key === 'ArrowLeft'|| e.code === 'ArrowLeft') {
 e.preventDefault();
 if (isCtrl) {
 handleDeletePrevious();
 } else {
 seekSmTimeline(-5);
 }
 return;
 }

 // Overlay shortcuts
 const overlay = smOverlays.find(o =>o.key.toLowerCase() === pressedKey);
 if (overlay) {
 e.preventDefault();
 if (isAlt && isShift) {
 cancelActiveOverlay(overlay);
 } else if (isShift) {
 toggleOverlayPauseResume(overlay);
 } else if (!isAlt) {
 triggerOverlayStart(overlay);
 }
 }
 });

  // --- Headphone Latency Calibration ---
  const calibrateBtn = document.getElementById('btn-sm-calibrate-headphones');
  const calibrationDialog = document.getElementById('sm-calibration-dialog');
  const startCalibrateBtn = document.getElementById('btn-start-calibration');
  const calibrationStatus = document.getElementById('calibration-status');
  const latencyDisplay = document.getElementById('sm-latency-display');
  const calibrationInstructions = document.getElementById('calibration-instructions');

  calibrateBtn.addEventListener('click', () =>{
      // Reset state before starting
      isCalibrating = false;
      calibrationTicksPlayed = 0;
      calibrationTapsCount = 0;
      tapTimeDiffs.length = 0;
      if (tickIntervalId) clearInterval(tickIntervalId);
      
      calibrationStatus.textContent = "Ready. Click start or press Space.";
      calibrationDialog.showModal();
      
      // Focus the application role container to trigger Focus Mode in Screen Readers immediately
      calibrationInstructions.focus(); 
  });

  function playCalibrationTick(time) {
      const ctx = getAudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, time); // Tick frequency
      
      gain.gain.setValueAtTime(0.5, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05); // Short 50ms tick
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(time);
      osc.stop(time + 0.06);
      
      nextTickTime = time; 
      calibrationTicksPlayed++;
  }

  function startTicking() {
      if (isCalibrating) return;
      isCalibrating = true;
      calibrationStatus.textContent = "Listen and tap Space in sync! (0/5)";
      
      const ctx = getAudioCtx();
      if (ctx.state === 'suspended') ctx.resume();
      
      calibrationStartTime = ctx.currentTime + 1.0;
      playCalibrationTick(calibrationStartTime);
      
      let tickCount = 1;
      tickIntervalId = setInterval(() =>{
          playCalibrationTick(calibrationStartTime + tickCount);
          tickCount++;
      }, 1000);
  }

  startCalibrateBtn.addEventListener('click', (e) =>{
      e.stopPropagation();
      startTicking();
      calibrationInstructions.focus(); // Keep focus trapped in application mode
  });

  calibrationDialog.addEventListener('keydown', (e) =>{
      if (e.key === 'Escape') {
          e.stopPropagation(); // Prevent exiting super mode
          if (tickIntervalId) clearInterval(tickIntervalId);
          isCalibrating = false;
          calibrationDialog.close();
          calibrateBtn.focus(); // Exit application mode and return focus
          return;
      }
      
      if (e.key === ''|| e.code === 'Space') {
          e.preventDefault(); // Prevent page scroll or default button click
          e.stopPropagation(); // Prevent entering live recording logic
          
          if (!isCalibrating) {
              startTicking();
              return;
          }
          
          if (calibrationTicksPlayed === 0) return;
          
          const ctx = getAudioCtx();
          const userTapTime = ctx.currentTime;
          
          // Find the exact expected time for the closest tick
          let timeSinceStart = userTapTime - calibrationStartTime;
          let expectedTickTime = calibrationStartTime + Math.round(timeSinceStart);
          
          let diff = userTapTime - expectedTickTime;
          
          tapTimeDiffs.push(diff);
          calibrationTapsCount++;
          
          // Removed text update here so screen reader doesn't speak over ticks
          
          if (calibrationTapsCount >= 5) {
              clearInterval(tickIntervalId);
              isCalibrating = false;
              
              // Calculate average latency
              const sum = tapTimeDiffs.reduce((a, b) =>a + b, 0);
              let avgLatency = sum / tapTimeDiffs.length;
              
              // Floor negative or tiny positive values to 0
              if (avgLatency < 0.02) avgLatency = 0; 
              
              smHeadphoneLatencySec = avgLatency;
              
              const ms = Math.round(smHeadphoneLatencySec * 1000);
              calibrationStatus.textContent = `Done! Delay calibrated: ${ms} ms`;
              latencyDisplay.textContent = `Current headphone delay correction: ${ms} ms`;
              announce(`Calibration complete. Delay set to ${ms} milliseconds.`, true);
              
              setTimeout(() =>{
                  calibrationDialog.close();
                  calibrateBtn.focus();
              }, 1500);
          }
      }
  });
}

function enterSuperMode() {
 stopAllLibraryPreviews();
 stopMergeAudio();
 if (trimPreviewSource) { try { trimPreviewSource.stop(); } catch(_) {} trimPreviewSource = null; }

 smActive = true;
 document.getElementById('super-mode-overlay').hidden = false;
 document.getElementById('sm-setup-view').hidden = false;
 document.getElementById('sm-live-view').hidden = true;
 setAppBackgroundInert(true);

 // Hide header control buttons initially
 document.getElementById('btn-sm-export').style.display = 'none';
 document.getElementById('btn-sm-save').style.display = 'none';
 document.getElementById('btn-sm-reset-mix').style.display = 'none';

 // Restore setup state if exists, otherwise reset
 if (smBaseAsset) {
     const baseSelect = document.getElementById('sm-base-select');
     let exists = false;
     for (let i = 0; i < baseSelect.options.length; i++) {
         if (baseSelect.options[i].value === smBaseAsset.id) { exists = true; break; }
     }
     if (exists) {
         baseSelect.value = smBaseAsset.id;
         if (smBaseAsset.volume !== undefined) {
             document.getElementById('sm-base-volume').value = Math.round(smBaseAsset.volume * 100);
             document.getElementById('sm-base-vol-val').textContent = Math.round(smBaseAsset.volume * 100);
         }
     } else {
         smBaseAsset = null;
         smOverlays.length = 0;
         smRecordedClips.length = 0;
         baseSelect.value = '';
     }
 } else {
     document.getElementById('sm-base-select').value = '';
     document.getElementById('sm-base-volume').value = 100;
     document.getElementById('sm-base-vol-val').textContent = '100';
 }
 
 document.getElementById('sm-overlay-select').value = '';
 document.getElementById('sm-overlay-key').value = '';
 document.getElementById('sm-overlay-volume').value = 100;
 document.getElementById('sm-overlay-vol-val').textContent = '100';

 renderSmShortcutsTable();
 updateSmGoButton();

 // Shift focus to container immediately for direct NVDA focus jump
 const container = document.querySelector('.sm-container');
 container.setAttribute('tabindex', '-1');
 container.focus();

 // announce("Super Merger Setup Opened. Choose a base audio to start.");
}

function exitSuperMode() {
 smActive = false;
 document.getElementById('super-mode-overlay').hidden = true;
 document.getElementById('btn-sm-export').style.display = 'none';
 document.getElementById('btn-sm-save').style.display = 'none';
 document.getElementById('btn-sm-reset-mix').style.display = 'none';
  // Preserve the exact exit point so they can "Continue" later
  if (smBaseAudio) {
      smLastBaseTime = smBaseAudio.currentTime;
  }
  
  // Close any active base segments safely
  if (smBaseSegmentStartSource !== null && smBaseAudio) {
      const duration = smBaseAudio.currentTime - smBaseSegmentStartSource;
      if (duration >0) {
          smBaseSegments.push({ timelineStart: smBaseSegmentStartTimeline, sourceStart: smBaseSegmentStartSource, duration });
      }
      smBaseSegmentStartTimeline = null;
      smBaseSegmentStartSource = null;
  }

  // Cap active overlays but PRESERVE tails so we don't chop them off harshly
  if (typeof capActiveOverlayRecordings === 'function') {
      capActiveOverlayRecordings(true);
  }

  setAppBackgroundInert(false);
  stopSmAudio();
 const trigger = document.getElementById('btn-enter-super-mode');
 if (trigger) trigger.focus();
}

function updateSmGoButton() {
  const goBtn = document.getElementById('btn-sm-go');
  const continueBtn = document.getElementById('btn-sm-continue');
  goBtn.disabled = !smBaseAsset;
  
  if (continueBtn) {
      if (smBaseAsset && (smRecordedClips.length >0 || smVirtualTime >0)) {
          continueBtn.style.display = 'inline-block';
      } else {
          continueBtn.style.display = 'none';
      }
  }
}

function renderSmShortcutsTable() {
    const summary = document.getElementById('sm-shortcuts-summary');
    if (summary) {
        const count = smOverlays.length;
        summary.textContent = `${count} overlay${count === 1 ? '': 's'} configured.`;
    }
}

let smManageEditId = null;

function renderManageOverlaysList() {
    const listContainer = document.getElementById('sm-manage-overlays-list');
    const resetBtn = document.getElementById('btn-sm-manage-overlays-reset');
    
    Array.from(listContainer.children).forEach(child =>{
        if (child.id !== 'sm-manage-overlays-empty') {
            child.remove();
        }
    });
    
    if (smOverlays.length === 0) {
        document.getElementById('sm-manage-overlays-empty').style.display = '';
        resetBtn.style.display = 'none';
        smManageEditId = null;
        return;
    }
    
    document.getElementById('sm-manage-overlays-empty').style.display = 'none';
    resetBtn.style.display = 'inline-block';
    
    smOverlays.forEach((item, idx) =>{
        const card = document.createElement('fieldset');
        card.className = 'sm-card data-row';
        card.setAttribute('data-id', item.id);
        card.style.border = '1px solid var(--border)';
        card.style.padding = '10px 15px';
        card.style.position = 'relative';
        card.style.marginBottom = '10px';
        
        const volPct = Math.round((item.volume !== undefined ? item.volume : 1.0) * 100);
        const isCutoff = item.behavior === 'cutoff';
        const detailsText = `${escapeHTML(item.name)}, ${item.key.toUpperCase()}, ${volPct}%, ${item.behavior}`;
        
        let optionsHtml = '<option value="" disabled>Select from library...</option>';
        if (typeof assetLibrary !== 'undefined') {
            assetLibrary.forEach(asset =>{
                const selected = asset.id === item.assetId ? 'selected': '';
                optionsHtml += `<option value="${asset.id}" ${selected}>${escapeHTML(asset.name)}</option>`;
            });
        }
        
        const isEditing = smManageEditId === item.id;
        
        card.innerHTML = `
            <div class="sm-summary-view" style="display: flex; gap: 10px; align-items: center;" ${isEditing ? 'hidden': ''}>
                <button class="btn btn-secondary btn-manage-edit" style="flex: 1; text-align: left;">Edit ${detailsText}</button>
                <button class="btn btn-danger btn-manage-delete" style="flex: 1; text-align: left;">Remove ${detailsText}</button>
            </div>
            
            <div class="sm-edit-view" ${!isEditing ? 'hidden': ''}>
                <legend style="font-weight: bold; padding: 0 5px;">Editing Overlay ${idx + 1}</legend>
                <div class="form-grid" style="grid-template-columns: 1fr; gap: 10px;">
                    <div class="control-group">
                        <label>Select Audio File:</label>
                        <select class="sm-edit-file" aria-label="Audio file">${optionsHtml}</select>
                    </div>
                    <div class="control-group">
                        <label>Shortcut Key (single letter/number):</label>
                        <input type="text" class="sm-edit-key" maxlength="1" value="${item.key.toUpperCase()}" aria-label="Shortcut" style="width: 100%;">
                    </div>
                    <div class="control-group">
                        <label>Overlay Volume: <span class="sm-edit-vol-val">${volPct}</span>%</label>
                        <input type="range" class="sm-edit-vol" min="0" max="100" step="5" value="${volPct}" aria-label="Volume">
                    </div>
                    <div class="control-group">
                        <label>Trigger Behavior:</label>
                        <select class="sm-edit-behavior" aria-label="Behavior" style="width: 100%; padding: 8px; border-radius: var(--radius-sm); background: var(--bg-main); border: 1px solid var(--border); color: var(--text);">
                            <option value="overlap" ${!isCutoff ? 'selected': ''}>Overlap (Play on top)</option>
                            <option value="cutoff" ${isCutoff ? 'selected': ''}>Cutoff (Restart sound)</option>
                        </select>
                    </div>
                    <div style="text-align: right; margin-top: 10px;">
                        <button class="btn btn-sm btn-success btn-manage-save">Save</button>
                    </div>
                </div>
            </div>
        `;
        
        // --- Edit View Events ---
        const fileSelect = card.querySelector('.sm-edit-file');
        fileSelect.addEventListener('change', (e) =>{
            const newAssetId = e.target.value;
            const newAsset = typeof getAsset === 'function'? getAsset(newAssetId) : null;
            if (newAsset) {
                item.assetId = newAssetId;
                item.name = newAsset.name;
                renderSmShortcutsTable();
                updateCardSummaryText();
                // announce("Audio file updated to " + newAsset.name);
            }
        });
        
        card.querySelector('.sm-edit-key').addEventListener('change', (e) =>{
            const val = e.target.value.toLowerCase();
            if (val && !smOverlays.find((o, i) =>i !== idx && o.key.toLowerCase() === val)) {
                item.key = val;
                renderSmShortcutsTable();
                updateCardSummaryText();
            } else {
                e.target.value = item.key.toUpperCase();
                announce("Invalid or duplicate shortcut key.", true);
            }
        });
        
        const volInput = card.querySelector('.sm-edit-vol');
        const volVal = card.querySelector('.sm-edit-vol-val');
        volInput.addEventListener('input', (e) =>{
            volVal.textContent = e.target.value;
        });
        volInput.addEventListener('change', (e) =>{
            item.volume = parseFloat(e.target.value) / 100;
            renderSmShortcutsTable();
            updateCardSummaryText();
        });
        
        card.querySelector('.sm-edit-behavior').addEventListener('change', (e) =>{
            item.behavior = e.target.value;
            renderSmShortcutsTable();
            updateCardSummaryText();
        });
        
        function updateCardSummaryText() {
            const vPct = Math.round((item.volume !== undefined ? item.volume : 1.0) * 100);
            const newText = `${escapeHTML(item.name)}, ${item.key.toUpperCase()}, ${vPct}%, ${item.behavior}`;
            card.querySelector('.btn-manage-edit').textContent = `Edit ${newText}`;
            card.querySelector('.btn-manage-delete').textContent = `Remove ${newText}`;
        }
        
        card.querySelector('.btn-manage-save').addEventListener('click', () =>{
            announce("Changes saved.", true);
            smManageEditId = null;
            card.querySelector('.sm-edit-view').hidden = true;
            card.querySelector('.sm-summary-view').hidden = false;
            card.querySelector('.btn-manage-edit').focus();
        });
        
        // --- Summary View Events ---
        card.querySelector('.btn-manage-edit').addEventListener('click', () =>{
            // Close any currently open edits
            document.querySelectorAll('#sm-manage-overlays-list .sm-card').forEach(c =>{
                c.querySelector('.sm-edit-view').hidden = true;
                c.querySelector('.sm-summary-view').hidden = false;
            });
            smManageEditId = item.id;
            card.querySelector('.sm-summary-view').hidden = true;
            card.querySelector('.sm-edit-view').hidden = false;
            card.querySelector('.sm-edit-file').focus();
        });
        
        card.querySelector('.btn-manage-delete').addEventListener('click', () =>{
            smOverlays.splice(idx, 1);
            
            renderManageOverlaysList();
            renderSmShortcutsTable();
            updateSmGoButton();
            
            // After render, get all delete buttons currently in the DOM
            const newDeleteBtns = document.querySelectorAll('#sm-manage-overlays-list .btn-manage-delete');
            if (newDeleteBtns.length >0) {
                // Focus the item that slid into the current index, or the last item
                const targetIdx = Math.min(idx, newDeleteBtns.length - 1);
                newDeleteBtns[targetIdx].focus();
            } else {
                document.getElementById('btn-sm-manage-overlays-close').focus();
            }
            announce("Deleted overlay.", true);
        });
        
        listContainer.appendChild(card);
    });
}




class WebAudioPlayer {
 constructor(buffer) {
 this.buffer = buffer;
 this.sourceNode = null;
 this.gainNode = null;
 this.isPlaying = false;
 this.playStartTime = 0;
 this.pausedOffset = 0;
 this.volume = 1.0;
 this.endedTriggered = false; // used by updateSmTimeline to fire once
 this._ended = false; // true only after natural playback completion
 }

 get duration() {
 return this.buffer ? this.buffer.duration : 0;
 }

 get currentTime() {
 if (!this.isPlaying) return this.pausedOffset;
 const ctx = getAudioCtx();
 const elapsed = ctx.currentTime - this.playStartTime;
 let t = this.pausedOffset + elapsed;
 if (t >this.duration) t = this.duration;
 return t;
 }

 set currentTime(val) {
 this._ended = false; // seeking resets the ended state
 this.pausedOffset = val;
 if (this.pausedOffset< 0) this.pausedOffset = 0;
 if (this.pausedOffset >this.duration) this.pausedOffset = this.duration;

 if (this.isPlaying) {
 this.stopNode();
 this.playNode();
 }
 }

 get paused() {
 return !this.isPlaying;
 }

 get ended() {
 return this._ended;
 }

 playNode() {
 if (!this.buffer) return;
 const ctx = getAudioCtx();
 const src = ctx.createBufferSource();
 src.buffer = this.buffer;

 const gain = ctx.createGain();
 gain.gain.value = this.volume;

 src.connect(gain);
 gain.connect(masterCompressor);

 src.start(0, this.pausedOffset);

 this.sourceNode = src;
 this.gainNode = gain;
 this.playStartTime = ctx.currentTime;
 this.isPlaying = true;
 this._ended = false;

 src.onended = () =>{
 if (this.sourceNode === src) {
 this.pausedOffset = this.duration;
 this.isPlaying = false;
 this._ended = true;
 this.sourceNode = null;
 }
 };
 }

 stopNode() {
 if (this.sourceNode) {
 try { this.sourceNode.stop(); } catch(_) {}
 this.sourceNode = null;
 }
 }

 play() {
 return new Promise((resolve) =>{
 if (this.isPlaying) {
 resolve();
 return;
 }
 if (this._ended) {
 // Base finished naturally â€” do NOT restart it, just resolve.
 // Callers that need to continue the timeline handle this themselves.
 resolve();
 return;
 }
 const ctx = getAudioCtx();
 if (ctx.state === 'suspended') {
 ctx.resume().then(() =>{
 this.playNode();
 resolve();
 });
 } else {
 this.playNode();
 resolve();
 }
 });
 }

 pause() {
 if (!this.isPlaying) return;
 this.stopNode();
 const ctx = getAudioCtx();
 const elapsed = ctx.currentTime - this.playStartTime;
 this.pausedOffset += elapsed;
 this.isPlaying = false;
 }
}

function getAssetByteSize(asset) {
  if (!asset) return 1000000;
  if (asset.file && asset.file.size) return asset.file.size;
  if (asset.size) return asset.size;
  return 1000000;
}

async function startSuperModeLive() {
 if (!smBaseAsset) return;

 if (smRecordedClips.length > 0) {
 const proceed = confirm("Your previous work will be deleted if you start a new session.\n\nIf you want to resume it instead, press Cancel and use the 'Continue Recording'button.\n\nPress OK to delete old work and start fresh.");
 if (!proceed) {
     const goBtn = document.getElementById('btn-sm-go');
     if (goBtn) goBtn.focus();
     return;
 }
 // User confirmed fresh start — wipe old session data
 smRecordedClips.length = 0;
 smBaseSegments.length = 0;
 smBaseSegmentStartTimeline = null;
 smBaseSegmentStartSource = null;
 smSoftPaused = false;
 if (smTimelineTimer) { clearInterval(smTimelineTimer); smTimelineTimer = null; }
 if (smBaseAudio) { try { smBaseAudio.pause(); } catch(_) {} smBaseAudio = null; }
 const _logEl = document.getElementById('sm-mix-log');
 if (_logEl) _logEl.innerHTML = '<li class="empty-log">No clips recorded yet. Press shortcut keys while the base audio is playing.</li>';
 }

  const goBtn = document.getElementById('btn-sm-go');
  const originalGoBtnText = goBtn ? goBtn.textContent : 'Go Now';
  if (goBtn) {
      goBtn.disabled = true;
      goBtn.textContent = 'Loading... Please wait';
      const manageBtn = document.getElementById('btn-sm-manage-overlays');
      if (manageBtn) manageBtn.focus();
  }

  const allAssetObjects = [smBaseAsset, ...smOverlays.map(o => getAsset(o.assetId))].filter(Boolean);
  const totalBytes = allAssetObjects.reduce((acc, a) => acc + getAssetByteSize(a), 0) || 1;

  // Announce IMMEDIATELY on click, and repeat every 5 seconds ONLY if total size > 30MB
  let loadingAnnounceTimer = null;
  if (totalBytes > 30 * 1024 * 1024) {
      announce(`Loading session audio... Please wait.`);
      loadingAnnounceTimer = setInterval(() => {
          announce(`Loading... Please wait.`);
      }, 5000);
  }

  try {
    await Promise.all(allAssetObjects.map(asset => getDecodedBuffer(asset.id)));
  } catch (err) {
    if (loadingAnnounceTimer) clearInterval(loadingAnnounceTimer);
    console.error(err);
    alert("Error pre-decoding audio files: " + err.message);
    if (goBtn) {
        goBtn.disabled = false;
        goBtn.textContent = originalGoBtnText;
    }
    return;
  }
  
  if (loadingAnnounceTimer) clearInterval(loadingAnnounceTimer);
  
  if (goBtn) {
      goBtn.disabled = false;
      goBtn.textContent = originalGoBtnText;
  }

  document.getElementById('sm-setup-view').hidden = true;
  document.getElementById('sm-live-view').hidden = false;

  // Show header control buttons when live mixer is active
  document.getElementById('btn-sm-export').style.display = 'inline-block';
  document.getElementById('btn-sm-save').style.display = 'inline-block';
  document.getElementById('btn-sm-reset-mix').style.display = 'inline-block';

  renderSmActiveKeysList();

  // Reset stats
  document.getElementById('sm-current-time').textContent = '0.0';
  document.getElementById('sm-total-duration').textContent = '0.0';
  const progressEl = document.getElementById('sm-progress-bar');
  progressEl.style.width = '0%';
  progressEl.parentElement.setAttribute('aria-valuenow', '0');

  // Create base audio player using Web Audio API
  const baseBuf = decodedAudioBuffers[smBaseAsset.id];
  smBaseAudio = new WebAudioPlayer(baseBuf);
   smBaseAudio.endedTriggered = false;
  smBaseAudio.volume = (smBaseAsset && smBaseAsset.volume !== undefined) ? smBaseAsset.volume : 1.0;
  
  document.getElementById('sm-total-duration').textContent = smBaseAudio.duration.toFixed(3);
  
  // Start playing
  smBaseAudio.play().then(() => {
  smBaseSegmentStartTimeline = 0;
  smBaseSegmentStartSource = 0;
  smLastUpdateTime = getAudioCtx().currentTime;
  updatePlaybackStateUI('playing');
  syncRecordActiveOverlays();
  }).catch(err => {
  console.error(err);
  updatePlaybackStateUI('paused');
  });

  smTimelineTimer = setInterval(updateSmTimeline, 100);

  // Shift focus to container immediately for direct NVDA focus jump when live mixer starts
  setTimeout(() => {
  const container = document.querySelector('.sm-container');
  if (container) {
  container.setAttribute('tabindex', '-1');
  container.focus();
  }
  }, 100);

  // announce("Live Mixer Active.");
}

async function continueSuperModeLive() {
  if (!smBaseAsset) return;

  const continueBtn = document.getElementById('btn-sm-continue');
  const originalContinueText = continueBtn ? continueBtn.textContent : 'Continue Recording';
  if (continueBtn) {
      continueBtn.disabled = true;
      continueBtn.textContent = 'Loading... Please wait';
      const manageBtn = document.getElementById('btn-sm-manage-overlays');
      if (manageBtn) manageBtn.focus();
  }

  const allAssetObjects = [smBaseAsset, ...smOverlays.map(o => getAsset(o.assetId))].filter(Boolean);
  const totalBytes = allAssetObjects.reduce((acc, a) => acc + getAssetByteSize(a), 0) || 1;

  let loadingAnnounceTimer = null;
  if (totalBytes > 30 * 1024 * 1024) {
      announce(`Loading session audio... Please wait.`);
      loadingAnnounceTimer = setInterval(() => {
          announce(`Loading... Please wait.`);
      }, 5000);
  }

  try {
    await Promise.all(allAssetObjects.map(asset => getDecodedBuffer(asset.id)));
  } catch (err) {
    if (loadingAnnounceTimer) clearInterval(loadingAnnounceTimer);
    console.error(err);
    alert("Error pre-decoding audio files: " + err.message);
    if (continueBtn) {
        continueBtn.disabled = false;
        continueBtn.textContent = originalContinueText;
    }
    return;
  }

  if (loadingAnnounceTimer) clearInterval(loadingAnnounceTimer);

  if (continueBtn) {
      continueBtn.disabled = false;
      continueBtn.textContent = originalContinueText;
  }

  document.getElementById('sm-setup-view').hidden = true;
  document.getElementById('sm-live-view').hidden = false;

  document.getElementById('btn-sm-export').style.display = 'inline-block';
  document.getElementById('btn-sm-save').style.display = 'inline-block';
  document.getElementById('btn-sm-reset-mix').style.display = 'inline-block';

  renderSmActiveKeysList();
  renderSmMixLog();

  // Clear active overlays and review playback state
  Object.keys(activeOverlayAudios).forEach(k => delete activeOverlayAudios[k]);
  reviewOverlayPlaybacks = [];

  // DO NOT reset timeline state! Keep smVirtualTime, smRecordedClips, smBaseSegments intact.
  smSoftPaused = false;
  smWasSoftPaused = false;
  smLastUpdateTime = getAudioCtx().currentTime;
  
  // Re-create base audio player
  const baseBuf = decodedAudioBuffers[smBaseAsset.id];
  smBaseAudio = new WebAudioPlayer(baseBuf);
  smBaseAudio.endedTriggered = false;
  smBaseAudio.volume = (smBaseAsset && smBaseAsset.volume !== undefined) ? smBaseAsset.volume : 1.0;
  
  smBaseAudio.currentTime = smLastBaseTime; // Resume from where we left off!

  document.getElementById('sm-total-duration').textContent = smBaseAudio.duration.toFixed(3);
  
  updatePlaybackStateUI('paused');
  
  if (!smTimelineTimer) {
     smTimelineTimer = setInterval(updateSmTimeline, 100);
  }

  setTimeout(() => {
    const container = document.querySelector('.sm-container');
    if (container) {
      container.setAttribute('tabindex', '-1');
      container.focus();
    }
    announce("Session resumed.");
    
    // Auto-resume playback correctly using standard logic
    smResumeBase(false);
  }, 100);
}

function updateSmTimeline() {
 if (!smBaseAudio) return;

 const ctx = getAudioCtx();
 const now = ctx.currentTime;
 const elapsed = now - smLastUpdateTime;
 smLastUpdateTime = now;

 // REPLAY MODE checking
 // We are replaying if we are within the boundaries of recorded history,
 // NOT actively soft-paused overriding it,
 // and NOT actively recording a new segment overriding it.
 const isReplaying = smVirtualTime < smTotalRecordedDuration && !smSoftPaused && smBaseSegmentStartSource === null;
  if (isReplaying) {
 // â”€â”€ REPLAY MODE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 const activeSeg = smBaseSegments.find(seg =>smVirtualTime >= seg.timelineStart && smVirtualTime< seg.timelineStart + seg.duration);
 
 if (activeSeg) {
  // We are inside a recorded segment ->Base audio should play
  
  // Smoothly advance using hardware clock unconditionally so we never get stuck
  smVirtualTime += elapsed;

  if (smBaseAudio.paused) {
    smBaseAudio.currentTime = activeSeg.sourceStart + (smVirtualTime - activeSeg.timelineStart);
    if (smBaseAudio.currentTime < smBaseAudio.duration) {
      smBaseAudio.play().catch(e =>console.error(e));
    }
  } else {
    // Drift correction ONLY if base audio is actually playing (not stuck at end)
    if (smBaseAudio.currentTime < smBaseAudio.duration) {
      const expected = activeSeg.timelineStart + (smBaseAudio.currentTime - activeSeg.sourceStart);
      if (Math.abs(smVirtualTime - expected) >0.3) smVirtualTime = expected;
    }
  }
 } else {
 // We are in a recorded GAP ->Base audio should pause
 if (!smBaseAudio.paused) {
 smBaseAudio.pause();
 }
 smVirtualTime += elapsed;
 }

 if (smVirtualTime >= smTotalRecordedDuration) {
 smVirtualTime = smTotalRecordedDuration;
 const baseEnded = smBaseAudio.currentTime >= (smBaseAudio.duration || 0);

 if (!baseEnded && !smBaseAudio.paused) {
 // Base is still playing, transition seamlessly to live recording
 smBaseSegmentStartTimeline = smVirtualTime;
 smBaseSegmentStartSource = smBaseAudio.currentTime;
 } else if (!baseEnded && smBaseAudio.paused) {
 // Base is paused (in a gap), transition seamlessly to live gap recording (soft pause)
 smSoftPaused = true;
 smSoftPauseStartVirtual = smVirtualTime;
 smSoftPauseStartWall = now;
 updatePlaybackStateUI('soft-paused');
 } else {
 // Base is ended. Check behavior
 const endBehavior = document.getElementById('sm-base-end-behavior').value;
 const baseDur = smBaseAudio.duration || 0;
 const hasActiveRecording = Object.keys(activeOverlayAudios).some(id =>{
     const a = activeOverlayAudios[id];
     return a.state === 'playing'&& a.startTimeInBase !== null;
 });
          if (endBehavior === 'continue'|| smTotalRecordedDuration >baseDur + 0.05 || hasActiveRecording) {
              smSoftPaused = true;
              smSoftPauseStartVirtual = smVirtualTime;
              smSoftPauseStartWall = now;
              // updatePlaybackStateUI('soft-paused');
          } else {
              smRegularPauseBase();
              return;
          }
 }
 }

 } else {
 // â”€â”€ RECORDING MODE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 const baseEnded = smBaseAudio.ended || smBaseAudio.currentTime >= (smBaseAudio.duration || 0) - 0.05;
 const basePlaying = !smBaseAudio.paused && !baseEnded;

 if (basePlaying && smBaseSegmentStartSource !== null) {
 // Smoothly advance using hardware clock to avoid blocky HTML5 updates
 smVirtualTime += elapsed;
 // Drift correction
 const expected = smBaseSegmentStartTimeline + (smBaseAudio.currentTime - smBaseSegmentStartSource);
 if (Math.abs(smVirtualTime - expected) >0.3) smVirtualTime = expected;
 } else if (smSoftPaused) {
 // Soft-pause gap: compute exact time via hardware clock
 smVirtualTime = smSoftPauseStartVirtual + (now - smSoftPauseStartWall);
 }

 // Detect natural end of base audio (fires once)
 if (baseEnded && !smBaseAudio.endedTriggered) {
 smBaseAudio.endedTriggered = true;

 // Close the current segment
 if (smBaseSegmentStartSource !== null) {
 const segDur = smBaseAudio.currentTime - smBaseSegmentStartSource;
 if (segDur >0) {
 smBaseSegments.push({
 timelineStart: smBaseSegmentStartTimeline,
 sourceStart: smBaseSegmentStartSource,
 duration: segDur
 });
 }
 smBaseSegmentStartTimeline = null;
 smBaseSegmentStartSource = null;
 }

 const endBehavior = document.getElementById('sm-base-end-behavior').value;
 const hasActiveRecording = Object.keys(activeOverlayAudios).some(id =>{
     const a = activeOverlayAudios[id];
     return a.state === 'playing'&& a.startTimeInBase !== null;
 });
          if (endBehavior === 'continue'|| hasActiveRecording) {
              smSoftPaused = true;
              smSoftPauseStartVirtual = smVirtualTime;
              smSoftPauseStartWall = now;
              // updatePlaybackStateUI('soft-paused');
          } else {
              // STOP
              smRegularPauseBase();
          }
 }
 }

 // Always keep expanding the absolute max boundary of our recorded timeline
 smTotalRecordedDuration = Math.max(smTotalRecordedDuration || 0, smVirtualTime);

 // Update UI
 const displayDur = Math.max(smBaseAudio.duration || 0, smTotalRecordedDuration);
 document.getElementById('sm-current-time').textContent = smVirtualTime.toFixed(3);
 if (displayDur >0) {
 document.getElementById('sm-total-duration').textContent = displayDur.toFixed(3);
 const pct = Math.min((smVirtualTime / displayDur) * 100, 100);
 const progressEl = document.getElementById('sm-progress-bar');
 progressEl.style.width = `${pct}%`;
 progressEl.parentElement.setAttribute('aria-valuenow', Math.round(pct));
 }

 // Always trigger overlays that should be playing now
 triggerReviewPlaybacksAtCurrentTime();
}


function toggleSmPlayPause() {
 if (!smBaseAudio) return;

 if (smIsActive()) {
 smRegularPauseBase();
 } else {
 smResumeBase();
 }
}

function punchInTimeline() {
 // Clear any future segments since we are manually overwriting them
 smBaseSegments = smBaseSegments.filter(seg =>{
 if (seg.timelineStart >= smVirtualTime) return false;
 if (seg.timelineStart + seg.duration >smVirtualTime) {
 seg.duration = smVirtualTime - seg.timelineStart;
 }
 return true;
 });
}

function smResumeBase(isPunchIn = false) {
 if (!smBaseAudio) return;

 if (isPunchIn) {
 punchInTimeline();
 smSoftPaused = false;
 
  if (smBaseAudio.ended || smBaseAudio.currentTime >= (smBaseAudio.duration || 0) - 0.05) {
  smBaseAudio.endedTriggered = true;
  smSoftPaused = true;
  smSoftPauseStartVirtual = smVirtualTime;
  smSoftPauseStartWall = getAudioCtx().currentTime;
  updatePlaybackStateUI('soft-paused');
 if (!smTimelineTimer) {
     smLastUpdateTime = getAudioCtx().currentTime;
     smTimelineTimer = setInterval(updateSmTimeline, 100);
 }
  } else {
    smBaseSegmentStartTimeline = smVirtualTime;
    smBaseSegmentStartSource   = smBaseAudio.currentTime;
    smBaseAudio.play().then(() =>{
      updatePlaybackStateUI('playing');
    }).catch(err =>console.error(err));
  }
 } else {
 // Normal resume (Space) - Just resume the clock and UI state
 if (smWasSoftPaused) {
 smSoftPaused = true;
 smWasSoftPaused = false;
 smSoftPauseStartVirtual = smVirtualTime;
 smSoftPauseStartWall = getAudioCtx().currentTime;
 updatePlaybackStateUI('soft-paused');
 } else if (smSoftPaused) {
 smSoftPauseStartVirtual = smVirtualTime;
 smSoftPauseStartWall = getAudioCtx().currentTime;
 updatePlaybackStateUI('soft-paused');
 } else {
 const activeSeg = smBaseSegments.find(seg =>smVirtualTime >= seg.timelineStart && smVirtualTime< seg.timelineStart + seg.duration);
 if (smVirtualTime >= smTotalRecordedDuration || activeSeg) {
 if (activeSeg) {
 smBaseAudio.currentTime = activeSeg.sourceStart + (smVirtualTime - activeSeg.timelineStart);
 }
 
  if (smBaseAudio.currentTime < smBaseAudio.duration) smBaseAudio.play().catch(e =>console.error(e));
 
 // If we were paused outside of any recorded boundary, start recording again
 if (smVirtualTime >= smTotalRecordedDuration && smBaseSegmentStartSource === null) {
 smBaseSegmentStartTimeline = smVirtualTime;
 smBaseSegmentStartSource = smBaseAudio.currentTime;
 }
 }
 updatePlaybackStateUI('playing');
 }
 }

 smLastUpdateTime = getAudioCtx().currentTime;
 resumeSmAllOverlays();
 syncRecordActiveOverlays();
 if (!smTimelineTimer) {
 smTimelineTimer = setInterval(updateSmTimeline, 100);
 }
}

function smRegularPauseBase() {
 if (!smBaseAudio) return;
 smBaseAudio.pause();
 smWasSoftPaused = smSoftPaused;
 smSoftPaused = false;
 
 // Close current segment
 if (smBaseSegmentStartSource !== null) {
 const duration = smBaseAudio.currentTime - smBaseSegmentStartSource;
 if (duration >0) {
 smBaseSegments.push({ timelineStart: smBaseSegmentStartTimeline, sourceStart: smBaseSegmentStartSource, duration });
 }
 }
 smBaseSegmentStartTimeline = null;
 smBaseSegmentStartSource = null;

 clearInterval(smTimelineTimer);
 smTimelineTimer = null;
 pauseSmAllOverlays();
 
 updatePlaybackStateUI('paused');
}

function smSoftPauseBase() {
 if (!smBaseAudio) return;
 
 punchInTimeline();
 
 smBaseAudio.pause();
 smSoftPaused = true;
 smWasSoftPaused = false;
 smSoftPauseStartVirtual = smVirtualTime;
 smSoftPauseStartWall = getAudioCtx().currentTime;
 
 // Close current segment
 if (smBaseSegmentStartSource !== null) {
 const duration = smBaseAudio.currentTime - smBaseSegmentStartSource;
 if (duration >0) {
 smBaseSegments.push({ timelineStart: smBaseSegmentStartTimeline, sourceStart: smBaseSegmentStartSource, duration });
 }
 smBaseSegmentStartTimeline = null;
 smBaseSegmentStartSource = null;
 }

 updatePlaybackStateUI('soft-paused');
 if (!smTimelineTimer) {
 smLastUpdateTime = getAudioCtx().currentTime;
 smTimelineTimer = setInterval(updateSmTimeline, 100);
 }
}

function handleCancelGap() {
  if (!smBaseAudio) return;

  // Case 3: Recording stopped â†’ do nothing
  if (!smTimelineTimer) return;

  // Base has ended or is extremely close to the end â†’ do nothing
  if (smBaseAudio.ended || smBaseAudio.endedTriggered || smBaseAudio.currentTime >= (smBaseAudio.duration || 0) - 0.1) {
    return;
  }

  const isManualSoftPause = smSoftPaused;
  // Replay gap: timer running, base physically paused, not soft-paused, still in replay territory
  const isReplayGap = !smSoftPaused &&
                      smBaseSegmentStartSource === null &&
                      smBaseAudio.paused &&
                      smVirtualTime < smTotalRecordedDuration;

  // Case 1: base playing normally or base ended â†’ do nothing
  if (!isManualSoftPause && !isReplayGap) return;

  // â”€â”€ Determine gap boundaries â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  let gapStart, gapEnd;
  if (isManualSoftPause) {
    gapStart = smSoftPauseStartVirtual;
    gapEnd   = smVirtualTime;
  } else {
    // Replay gap: find from smBaseSegments
    gapStart = 0;
    gapEnd   = smTotalRecordedDuration;
    for (const seg of smBaseSegments) {
      const segEnd = seg.timelineStart + seg.duration;
      if (segEnd <= smVirtualTime) gapStart = Math.max(gapStart, segEnd);
      if (seg.timelineStart >smVirtualTime) gapEnd = Math.min(gapEnd, seg.timelineStart);
    }
  }

  const setting = document.getElementById('sm-cancel-gap-behavior').value;
  const clipsInGap  = smRecordedClips.filter(c =>c.timelineStart >= gapStart && c.timelineStart < gapEnd);
  const activeInGap = Object.values(activeOverlayAudios).filter(
    a =>a.startTimeInBase !== null && a.startTimeInBase >= gapStart
  );
  const hasOverlaysInGap = clipsInGap.length >0 || activeInGap.length >0;

  if (setting === 'empty_only'&& hasOverlaysInGap) {
    announce('Gap not cancelled: overlays exist in the silent period.', true);
    return;
  }

  // Remove overlays in the gap
  if (hasOverlaysInGap) {
    activeInGap.forEach(active =>{
      try { active.sourceNode.stop(); } catch(_) {}
      delete activeOverlayAudios[active.clipEntry.id];
    });
    clipsInGap.forEach(c =>{
      const idx = smRecordedClips.indexOf(c);
      if (idx !== -1) smRecordedClips.splice(idx, 1);
      playedClipIds.delete(c.id);
    });
  }

  const gapDuration = gapEnd - gapStart;

  // â”€â”€ REPLAY GAP: compress timeline (shift everything after the gap) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (isReplayGap) {
    smBaseSegments.forEach(seg =>{
      if (seg.timelineStart >= gapEnd) seg.timelineStart -= gapDuration;
    });
    smRecordedClips.forEach(c =>{
      if (c.timelineStart >= gapEnd) c.timelineStart -= gapDuration;
    });
    smTotalRecordedDuration -= gapDuration;
    smVirtualTime            = gapStart;
    playedClipIds.clear();
    smLastUpdateTime = getAudioCtx().currentTime;
    smResumeBase(false); // will find the now-shifted segment at gapStart and resume replay
    renderSmMixLog();
    announce('Replay gap removed. Continuing from before the gap.');
    return;
  }

  // â”€â”€ MANUAL SOFT-PAUSE: cancel gap, rewind timeline â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const sourcePos = smBaseAudio.currentTime; // pausedOffset while not playing
  smSoftPaused            = false;
  smVirtualTime           = gapStart;
  smTotalRecordedDuration = gapStart;
  smLastUpdateTime        = getAudioCtx().currentTime;

  smBaseSegmentStartTimeline = gapStart;
  smBaseSegmentStartSource   = sourcePos;

  smBaseAudio.play().then(() =>{
    updatePlaybackStateUI('playing');
  }).catch(err =>console.error(err));

  renderSmActiveKeysList();
  renderSmMixLog();
  announce('Silent gap cancelled. Continuing from before the gap.');
}

function updatePlaybackStateUI(state) {
 const btn = document.getElementById('btn-sm-play-pause');
 const badge = document.getElementById('sm-playback-state-text');
 
 if (badge) {
 if (state === 'playing') {
 badge.textContent = 'Playing';
 badge.className = 'status-badge status-playing';
 } else if (state === 'soft-paused') {
 badge.textContent = 'Soft Paused';
 badge.className = 'status-badge status-soft-paused';
 } else {
 badge.textContent = 'Paused';
 badge.className = 'status-badge status-paused';
 }
 }

 if (btn) {
 if (state === 'playing') {
 btn.textContent = 'Pause';
 } else {
 btn.textContent = 'Play';
 }
 }
}

function restartSmPlayback() {
 if (!smBaseAudio) return;

 // Cap any current live recordings, but PRESERVE tails so export includes natural reverb!
 capActiveOverlayRecordings(true);

 // Stop ALL live active overlays immediately
 Object.keys(activeOverlayAudios).forEach(id =>{
 if (activeOverlayAudios[id] && activeOverlayAudios[id].sourceNode) {
 try { activeOverlayAudios[id].sourceNode.stop(); } catch(_) {}
 }
 delete activeOverlayAudios[id];
 });
 renderSmActiveKeysList();

 // Stop ALL review overlay playbacks immediately
 reviewOverlayPlaybacks.forEach(p =>stopReviewPlaybackEntry(p));
 reviewOverlayPlaybacks = [];

 // Reset review tracking so clips re-trigger from 0.0s
 playedClipIds.clear();

 // Close the active base segment if we were recording
 if (smBaseSegmentStartSource !== null) {
 const duration = smBaseAudio.currentTime - smBaseSegmentStartSource;
 if (duration >0) {
 smBaseSegments.push({ timelineStart: smBaseSegmentStartTimeline, sourceStart: smBaseSegmentStartSource, duration });
 }
 smBaseSegmentStartTimeline = null;
 smBaseSegmentStartSource = null;
 }

 // Reset virtual time and state
 smVirtualTime = 0;
 smSoftPaused = false;
 smLastUpdateTime = getAudioCtx().currentTime;

  smBaseAudio.currentTime = 0;
  smBaseAudio.endedTriggered = false;

  // Normal replay from 0.0s (do NOT punch in, so we preserve the timeline)
  smSoftPaused = false;
  smWasSoftPaused = false;
  smResumeBase(false);
}

function getSmTotalVirtualDuration() {
  if (!smBaseAudio) return 0;

  // Start with base duration, captured recorded duration, and current virtual time
  let maxDur = Math.max(
    smBaseAudio.duration || 0,
    smTotalRecordedDuration || 0,
    smVirtualTime
  );

  // Also check end times of all recorded overlay clips
  smRecordedClips.forEach(c =>{
    const buf = decodedAudioBuffers[c.assetId];
    if (buf) {
      const cs = c.cropStart || 0;
      const ce = c.cropEnd != null ? Math.min(c.cropEnd, buf.duration) : buf.duration;
      const clipEndTime = c.timelineStart + (ce - cs);
      maxDur = Math.max(maxDur, clipEndTime);
    }
  });

  return maxDur;
}

function seekSmTimeline(seconds) {
  if (!smBaseAudio) return;
  smBaseAudio.endedTriggered = false;
  const oldVirtualTime = smVirtualTime;
  const maxDur = getSmTotalVirtualDuration();
  
  // Prevent seeking past boundaries
  if (seconds > 0 && smVirtualTime >= maxDur) return;
  if (seconds < 0 && smVirtualTime <= 0) return;

  let newVirtualTime = oldVirtualTime + seconds;
  if (newVirtualTime < 0) newVirtualTime = 0;
  if (maxDur > 0 && newVirtualTime > maxDur) newVirtualTime = maxDur;

  const actualSeekAmount = newVirtualTime - oldVirtualTime;
  if (actualSeekAmount === 0) return;

  // 1. Cap active overlay recordings cleanly before jumping time
  capActiveOverlayRecordings(true);

  // 2. Stop any active overlay instances
  Object.keys(activeOverlayAudios).forEach(id => {
    if (activeOverlayAudios[id] && activeOverlayAudios[id].sourceNode) {
      try { activeOverlayAudios[id].sourceNode.stop(); } catch(_) {}
    }
    delete activeOverlayAudios[id];
  });
  renderSmActiveKeysList();

  // 3. Stop review overlays and clear trigger state
  if (typeof stopReviewPlaybackEntry === 'function') {
    reviewOverlayPlaybacks.forEach(p => stopReviewPlaybackEntry(p));
  } else {
    reviewOverlayPlaybacks.forEach(p => {
      if (p.sourceNode) {
        p.sourceNode.onended = null;
        try { p.sourceNode.stop(); } catch(_) {}
      }
      if (p.timerId) clearTimeout(p.timerId);
    });
  }
  reviewOverlayPlaybacks = [];
  playedClipIds.clear();

  // 4. Safely finalize any active base segment being recorded live
  if (smBaseSegmentStartSource !== null) {
    const duration = smBaseAudio.currentTime - smBaseSegmentStartSource;
    if (duration > 0) {
      smBaseSegments.push({
        timelineStart: smBaseSegmentStartTimeline,
        sourceStart: smBaseSegmentStartSource,
        duration: duration
      });
    }
    smBaseSegmentStartTimeline = null;
    smBaseSegmentStartSource = null;
  }

  // 4.5 AUTO-FILL: Preserve skipped base audio when fast-forwarding into unrecorded future
  // This completely fixes the issue of the skipped recording being "deleted"
  if (newVirtualTime > smTotalRecordedDuration) {
      let lastSourceEnd = smTotalRecordedDuration; 
      if (smBaseSegments.length > 0) {
          const lastSeg = smBaseSegments[smBaseSegments.length - 1];
          lastSourceEnd = lastSeg.sourceStart + (smTotalRecordedDuration - lastSeg.timelineStart);
      }
      const skippedDur = newVirtualTime - smTotalRecordedDuration;
      
      if (lastSourceEnd < (smBaseAudio.duration || 0)) {
          let durToAdd = skippedDur;
          if (lastSourceEnd + durToAdd > smBaseAudio.duration) {
              durToAdd = smBaseAudio.duration - lastSourceEnd;
          }
          if (durToAdd > 0) {
              smBaseSegments.push({
                  timelineStart: smTotalRecordedDuration,
                  sourceStart: lastSourceEnd,
                  duration: durToAdd
              });
          }
      }
      smTotalRecordedDuration = newVirtualTime;
  }

  // 5. Update timeline position
  smVirtualTime = newVirtualTime;

  // 6. Map newVirtualTime to smBaseSegments correctly
  const activeSeg = smBaseSegments.find(seg => 
    newVirtualTime >= seg.timelineStart && newVirtualTime < seg.timelineStart + seg.duration
  );

  if (activeSeg) {
    // Landed inside a recorded base audio segment
    const offsetInSegment = newVirtualTime - activeSeg.timelineStart;
    smBaseAudio.currentTime = activeSeg.sourceStart + offsetInSegment;
    smSoftPaused = false;
    smWasSoftPaused = false;
  } else {
    // Landed exactly on a boundary or in a gap
    let lastSegEndSource = 0;
    for (const seg of smBaseSegments) {
      if (seg.timelineStart + seg.duration <= newVirtualTime) {
        lastSegEndSource = Math.max(lastSegEndSource, seg.sourceStart + seg.duration);
      }
    }
    smBaseAudio.currentTime = lastSegEndSource;
    smBaseAudio.pause();
    smSoftPaused = false;
    smWasSoftPaused = false;
  }

  smLastUpdateTime = getAudioCtx().currentTime;

  // 7. Update UI counters and progress bar
  const totalVirtualDur = getSmTotalVirtualDuration();
  document.getElementById('sm-current-time').textContent = smVirtualTime.toFixed(3);
  document.getElementById('sm-total-duration').textContent = totalVirtualDur.toFixed(3);
  if (totalVirtualDur) {
    const pct = (smVirtualTime / totalVirtualDur) * 100;
    const progressEl = document.getElementById('sm-progress-bar');
    progressEl.style.width = `${pct}%`;
    progressEl.parentElement.setAttribute('aria-valuenow', Math.round(pct));
  }

  if (newVirtualTime >= maxDur) return;

  // 8. Auto-resume logic ensuring seamless transition without deleting data
  if (!smTimelineTimer) {
    smResumeBase(false);
  } else if (smVirtualTime >= smTotalRecordedDuration && !smSoftPaused && smBaseAudio.currentTime < smBaseAudio.duration) {
    // Reached the frontier: instantly resume live recording
    smBaseSegmentStartTimeline = smVirtualTime;
    smBaseSegmentStartSource = smBaseAudio.currentTime;
    smBaseAudio.play().catch(e => console.error(e));
    updatePlaybackStateUI('playing');
  } else if (activeSeg && smBaseAudio.paused && smBaseAudio.currentTime < smBaseAudio.duration) {
    // Replaying a known segment
    smBaseAudio.play().catch(e => console.error(e));
    updatePlaybackStateUI('playing');
  } else if (!activeSeg) {
    // Navigating through a silent gap
    updatePlaybackStateUI('playing');
  }
}


function triggerOverlayStart(overlay) {
 const asset = getAsset(overlay.assetId);
 if (!asset) return;

 const buffer = decodedAudioBuffers[overlay.assetId];
 if (!buffer) {
 getDecodedBuffer(overlay.assetId).then(buf =>{
 if (buf) triggerOverlayStart(overlay);
 });
 return;
 }

 const active_timeline = smIsActive(); // true when recording or soft-paused
 const overlayVol = (overlay.volume !== undefined) ? overlay.volume : 1.0;
 const behavior = overlay.behavior || 'overlap';

 if (behavior === 'cutoff') {
 const instances = Object.values(activeOverlayAudios).filter(a =>a.overlayId === overlay.id);
 instances.forEach(active =>{
 try { active.sourceNode.stop(); } catch(_) {}
 if (active.startTimeInBase !== null && active_timeline) {
 // Calculate precise elapsed time for crop
 const played = getAudioCtx().currentTime - active.playStartTime;
 active.clipEntry.cropEnd = active.clipEntry.cropStart + played;
 }
 delete activeOverlayAudios[active.clipEntry.id];
 });
 }

 const ctx = getAudioCtx();
 const src = ctx.createBufferSource();
 src.buffer = buffer;
 const gain = ctx.createGain();
 gain.gain.value = overlayVol;
 src.connect(gain);
 gain.connect(masterCompressor);

 // Calculate actual timeline start applying the latency correction
 let calculatedStart = active_timeline ? (smVirtualTime + (getAudioCtx().currentTime - smLastUpdateTime)) : 0;
 
 // Apply latency deduction only if actively recording and delay exists
 if (active_timeline && smHeadphoneLatencySec >0) {
     calculatedStart = Math.max(0, calculatedStart - smHeadphoneLatencySec);
 }

 const clip = {
 id: `sm-clip-${++smRecordedClipIdCounter}`,
 assetId: overlay.assetId,
 name: asset.name,
 timelineStart: calculatedStart,
 cropStart: 0,
 cropEnd: null,
 volume: overlayVol,
 behavior: behavior
 };

 const active = {
 overlayId: overlay.id,
 sourceNode: src,
 gainNode: gain,
 buffer: buffer,
 state: 'playing',
 clipEntry: clip,
 startTimeInBase: active_timeline ? clip.timelineStart : null,
 doNotSync: !active_timeline,
 playStartTime: getAudioCtx().currentTime,
 pausedAtOffset: 0
 };
 activeOverlayAudios[clip.id] = active;

 if (active_timeline) {
 smRecordedClips.push(clip);
 renderSmMixLog();
 playedClipIds.add(clip.id);
 }

 src.start(0);

 src.onended = () =>{
 const curr = activeOverlayAudios[clip.id];
 if (curr && curr.sourceNode === src) {
 if (curr.state === 'playing') {
 if (curr.startTimeInBase !== null && smIsActive()) {
 curr.clipEntry.cropEnd = curr.buffer ? curr.buffer.duration : buffer.duration;
 }
 delete activeOverlayAudios[clip.id];
 renderSmActiveKeysList();
 renderSmMixLog();
 }
 }
 };

 renderSmActiveKeysList();
}


function toggleOverlayPauseResume(overlay) {
 const isPlayingBase = smBaseAudio && !smBaseAudio.paused;

 let handled = false;

 // 1. Check live recorded instances
 const instances = Object.values(activeOverlayAudios).filter(a =>a.overlayId === overlay.id);
 if (instances.length >0) {
 handled = true;
 instances.forEach(active =>{
 if (active.state === 'playing') {
 try { active.sourceNode.stop(); } catch(_) {}
 active.state = 'paused';
 
 const elapsedWall = getAudioCtx().currentTime - active.playStartTime;
 active.pausedAtOffset += elapsedWall;

  if (active.startTimeInBase !== null && (isPlayingBase || smSoftPaused)) {
      const played = elapsedWall;
      active.clipEntry.cropEnd = active.clipEntry.cropStart + played;
      active.startTimeInBase = null;
  }
 } else if (active.state === 'paused') {
 active.state = 'playing';

 const ctx = getAudioCtx();
 const src = ctx.createBufferSource();
 src.buffer = active.buffer;
 src.connect(active.gainNode);

 const shouldRecord = isPlayingBase || smSoftPaused;
 const oldClipId = active.clipEntry.id;

 if (shouldRecord) {
 let calculatedStart = smVirtualTime;
 if (smHeadphoneLatencySec >0) {
     calculatedStart = Math.max(0, calculatedStart - smHeadphoneLatencySec);
 }
 const timelineStart = calculatedStart;
 const newClip = {
 id: `sm-clip-${++smRecordedClipIdCounter}`,
 assetId: overlay.assetId,
 name: active.clipEntry.name,
 timelineStart: timelineStart,
 cropStart: active.pausedAtOffset,
 cropEnd: null,
 volume: (overlay.volume !== undefined) ? overlay.volume : 1.0,
 behavior: overlay.behavior || 'overlap'
 };

 smRecordedClips.push(newClip);
 active.clipEntry = newClip;
 active.startTimeInBase = (isPlayingBase || smSoftPaused) ? smVirtualTime : null;
 playedClipIds.add(newClip.id);
 
 activeOverlayAudios[newClip.id] = active;
 delete activeOverlayAudios[oldClipId];
 }

 src.start(0, active.pausedAtOffset);
 active.sourceNode = src;
 active.playStartTime = getAudioCtx().currentTime;

 src.onended = () =>{
 const currId = active.clipEntry.id;
 const curr = activeOverlayAudios[currId];
 if (curr && curr.sourceNode === src) {
 if (curr.state === 'playing') {
 curr.state = 'ended';
  if (curr.startTimeInBase !== null && (isPlayingBase || smSoftPaused)) {
      const played = elapsedWall;
      curr.clipEntry.cropEnd = active.buffer ? active.buffer.duration : buffer.duration;
  }
 delete activeOverlayAudios[currId];
 renderSmActiveKeysList();
 renderSmMixLog();
 }
 }
 };
 }
 });
 }

 // 2. If not a live instance, check if it is playing back from timeline in review mode
 const reviewEntries = reviewOverlayPlaybacks.filter(p =>p.clip.assetId === overlay.assetId && !p.paused);
 if (reviewEntries.length >0) {
 handled = true;
 reviewEntries.forEach(entry =>{
 // Stop the audio immediately
 if (entry.sourceNode) {
 entry.sourceNode.onended = null;
 try { entry.sourceNode.stop(); } catch(_) {}
 }
 if (entry.timerId) clearTimeout(entry.timerId);
 entry.paused = true;
 
  // Punch-out: permanently trim the clip's cropEnd using exact physical time elapsed
  const played = getAudioCtx().currentTime - entry.playStartTime;
  if (played >0) {
      entry.clip.cropEnd = (entry.clip.cropStart || 0) + played;
  }
 });
 // announce(`Paused timeline playback for ${overlay.name}.`, true);
 renderSmMixLog();
 }

 if (handled) renderSmActiveKeysList();
}


function syncRecordActiveOverlays() {
 if (!smIsActive()) return; // only sync while timeline is advancing

 const tb = smVirtualTime;

 Object.keys(activeOverlayAudios).forEach(id =>{
 const active = activeOverlayAudios[id];
 if (active.state === 'playing'&& active.startTimeInBase === null && !active.doNotSync) {
 const overlay = smOverlays.find(o =>o.id == active.overlayId);
 const clip = {
 id: `sm-clip-${++smRecordedClipIdCounter}`,
 assetId: active.clipEntry.assetId,
 name: active.clipEntry.name,
 timelineStart: tb,
 cropStart: active.pausedAtOffset + (getAudioCtx().currentTime - active.playStartTime),
 cropEnd: null,
 volume: overlay ? (overlay.volume !== undefined ? overlay.volume : 1.0) : 1.0,
 behavior: overlay ? (overlay.behavior || 'overlap') : 'overlap'
 };
 smRecordedClips.push(clip);
 active.clipEntry = clip;
 active.startTimeInBase = tb;
 playedClipIds.add(clip.id);
 
 activeOverlayAudios[clip.id] = active;
 if (clip.id !== id) delete activeOverlayAudios[id];
 }
 });

 renderSmMixLog();
}

function pauseSmAllOverlays() {
 const ctxNow = getAudioCtx().currentTime;

 Object.values(activeOverlayAudios).forEach(active =>{
 if (active.state === 'playing') {
 if (active.sourceNode) active.sourceNode.onended = null;
 try { active.sourceNode.stop(); } catch(_) {}
 active.state = 'paused';
 active.pausedAtOffset += (ctxNow - active.playStartTime);
 }
 });

 reviewOverlayPlaybacks.forEach(entry =>{
 if (!entry.paused) {
 if (entry.sourceNode) entry.sourceNode.onended = null;
 try { entry.sourceNode.stop(); } catch(_) {}
 if (entry.timerId) clearTimeout(entry.timerId);
 entry.paused = true;
 entry.pausedAtOffset = (entry.clip.cropStart || 0) + (smVirtualTime - entry.clip.timelineStart);
 }
 });
}

function resumeSmAllOverlays() {
 const ctx = getAudioCtx();
 const ctxNow = ctx.currentTime;

 Object.values(activeOverlayAudios).forEach(active =>{
 if (active.state === 'paused') {
 active.state = 'playing';
 const src = ctx.createBufferSource();
 src.buffer = active.buffer;
 src.connect(active.gainNode);
 src.start(0, active.pausedAtOffset);
 active.sourceNode = src;
 active.playStartTime = ctxNow;

 // Ensure cleanup logic remains intact
 src.onended = () =>{
 const curr = activeOverlayAudios[active.clipEntry.id];
 if (curr && curr.sourceNode === src) {
 if (curr.state === 'playing') {
 if (curr.startTimeInBase !== null && smIsActive()) {
  curr.clipEntry.cropEnd = active.buffer ? active.buffer.duration : buffer.duration;
  }
 delete activeOverlayAudios[active.clipEntry.id];
 renderSmActiveKeysList();
 renderSmMixLog();
 }
 }
 };
 }
 });

 reviewOverlayPlaybacks = reviewOverlayPlaybacks.filter(entry =>{
 if (entry.paused) {
 const buffer = decodedAudioBuffers[entry.clip.assetId];
 if (!buffer) return false;
 const cropStart = entry.clip.cropStart || 0;
 const clipDur = (entry.clip.cropEnd !== null && entry.clip.cropEnd !== undefined)
 ? (entry.clip.cropEnd - cropStart)
 : (buffer.duration - cropStart);
 const remainingSec = clipDur - (entry.pausedAtOffset - cropStart);
 
 if (remainingSec >0 && entry.pausedAtOffset< buffer.duration) {
 const src = ctx.createBufferSource();
 src.buffer = buffer;
 src.connect(entry.gainNode);
 src.start(0, entry.pausedAtOffset, remainingSec);
 entry.sourceNode = src;
 entry.paused = false;

 if (entry.clip.cropEnd !== null && entry.clip.cropEnd !== undefined) {
 entry.timerId = setTimeout(() =>{
 try { src.stop(); } catch(_) {}
 reviewOverlayPlaybacks = reviewOverlayPlaybacks.filter(p =>p !== entry);
 }, remainingSec * 1000);
 }

 src.onended = () =>{
 if (entry.timerId) clearTimeout(entry.timerId);
 reviewOverlayPlaybacks = reviewOverlayPlaybacks.filter(p =>p !== entry);
 };
 return true;
 }
 return false; // dropped if it finished
 }
 return true;
 });
}

function capActiveOverlayRecordings(preserveTail = false) {
 if (!smBaseAudio) return;
 const tb = smVirtualTime;

 Object.keys(activeOverlayAudios).forEach(id =>{
 const active = activeOverlayAudios[id];
 if (active.state === 'playing'&& active.startTimeInBase !== null) {
  if (!preserveTail) {
      const played = getAudioCtx().currentTime - active.playStartTime;
      active.clipEntry.cropEnd = active.clipEntry.cropStart + played;
  }
 active.startTimeInBase = null;
 }
 });

 renderSmMixLog();
}



function deleteClip(clip) {
 const index = smRecordedClips.indexOf(clip);
 if (index >-1) {
 smRecordedClips.splice(index, 1);
 
 // Completely kill any ongoing playback for this clip
 const matchingPlaybacks = reviewOverlayPlaybacks.filter(p =>p.clip.id === clip.id);
 matchingPlaybacks.forEach(p =>stopReviewPlaybackEntry(p));
 reviewOverlayPlaybacks = reviewOverlayPlaybacks.filter(p =>p.clip.id !== clip.id);
 
 playedClipIds.delete(clip.id);
 
 const undoBehavior = document.getElementById('sm-undo-behavior')?.value || 'seek';
 if (undoBehavior === 'seek') {
 const seekAmount = clip.timelineStart - smVirtualTime;
 seekSmTimeline(seekAmount); 
 }
 const asset = getAsset(clip.assetId);
 const name = asset ? asset.name : "overlay";
 announce("Deleted "+ name);
 renderSmMixLog();
 }
}

function handleDeletePrevious() {
 const activeClipIds = new Set(Object.values(activeOverlayAudios).map(a =>a.clipEntry.id));
 
 let prevClip = null;
 for (let c of smRecordedClips) {
 if (activeClipIds.has(c.id)) continue;
 if (c.timelineStart<= smVirtualTime) {
 if (!prevClip || c.timelineStart >prevClip.timelineStart) prevClip = c;
 }
 }

 if (prevClip) {
 deleteClip(prevClip);
 } else {
 announce("none");
 }
}

function handleDeleteNext() {
 const activeClipIds = new Set(Object.values(activeOverlayAudios).map(a =>a.clipEntry.id));
 
 let nextClip = null;
 for (let c of smRecordedClips) {
 if (activeClipIds.has(c.id)) continue;
 if (c.timelineStart >smVirtualTime) {
 if (!nextClip || c.timelineStart< nextClip.timelineStart) {
 nextClip = c;
 }
 }
 }

 if (nextClip) {
 deleteClip(nextClip);
 } else {
 announce("none");
 }
}

function cancelActiveOverlay(overlay) {
 const instances = Object.values(activeOverlayAudios).filter(a =>a.overlayId === overlay.id);
 const alertEl = document.getElementById('sm-live-alert');

 if (instances.length >0) {
 // Cancel active recordings
 instances.forEach(active =>{
 if (active.sourceNode) {
 try { active.sourceNode.stop(); } catch(_) {}
 }
 const clipIndex = smRecordedClips.indexOf(active.clipEntry);
 if (clipIndex !== -1) smRecordedClips.splice(clipIndex, 1);
 delete activeOverlayAudios[active.clipEntry.id];
 });
 
 renderSmActiveKeysList();
 renderSmMixLog();

 if (alertEl) {
 alertEl.textContent = `Removed active clip(s) for "${overlay.name}"(${overlay.key.toUpperCase()})`;
 alertEl.style.color = 'var(--success)';
 if (window.smAlertTimeout) clearTimeout(window.smAlertTimeout);
 window.smAlertTimeout = setTimeout(() =>{ alertEl.textContent = ''; }, 3000);
 }
 announce(`Removed active clip for ${overlay.name}.`, true);
 } else {
 // Look in reviewOverlayPlaybacks to delete previously recorded clips that are currently playing back
 const matchingEntries = reviewOverlayPlaybacks.filter(p =>p.clip.assetId === overlay.assetId);
 if (matchingEntries.length >0) {
 matchingEntries.forEach(revEntry =>{
 stopReviewPlaybackEntry(revEntry);
 
 // Remove from reviewOverlayPlaybacks
 const idx = reviewOverlayPlaybacks.indexOf(revEntry);
 if (idx !== -1) reviewOverlayPlaybacks.splice(idx, 1);

 // Remove from smRecordedClips completely
 const clipIndex = smRecordedClips.indexOf(revEntry.clip);
 if (clipIndex !== -1) smRecordedClips.splice(clipIndex, 1);
 
 // Remove from playedClipIds
 playedClipIds.delete(revEntry.clip.id);
 });

 renderSmMixLog();

 if (alertEl) {
 alertEl.textContent = `Deleted playback clip(s) for "${overlay.name}"(${overlay.key.toUpperCase()})`;
 alertEl.style.color = 'var(--success)';
 if (window.smAlertTimeout) clearTimeout(window.smAlertTimeout);
 window.smAlertTimeout = setTimeout(() =>{ alertEl.textContent = ''; }, 3000);
 }
 announce(`Deleted playback clip for ${overlay.name}.`, true);
 } else {
 if (alertEl) {
 alertEl.textContent = `No active recording or playback for "${overlay.name}"to remove.`;
 alertEl.style.color = '#f87171';
 if (window.smAlertTimeout) clearTimeout(window.smAlertTimeout);
 window.smAlertTimeout = setTimeout(() =>{ alertEl.textContent = ''; }, 3000);
 }
 announce(`No active playback for key ${overlay.key.toUpperCase()} to remove.`, true);
 }
 }
}


function renderSmActiveKeysList() {
 const keysList = document.getElementById('sm-active-keys-list');
 keysList.innerHTML = '';
 
 if (smOverlays.length === 0) {
 keysList.innerHTML = '<p class="field-hint">No shortcuts configured.</p>';
 return;
 }

 smOverlays.forEach(o =>{
 const div = document.createElement('div');
 div.className = 'sm-key-badge-item';
 
 const instances = Object.values(activeOverlayAudios).filter(a =>a.overlayId === o.id);
 let badgeClass = '';
 let statusSpan = '';
 
 if (instances.length >0) {
 const isAnyPlaying = instances.some(a =>a.state === 'playing');
 if (isAnyPlaying) {
 badgeClass = 'kbd-badge-playing';
 statusSpan = `<span class="sm-badge-status-text sm-badge-status-playing">${instances.length >1 ? instances.length + 'x ': ''}Playing</span>`;
 } else {
 badgeClass = 'kbd-badge-paused';
 statusSpan = `<span class="sm-badge-status-text sm-badge-status-paused">${instances.length >1 ? instances.length + 'x ': ''}Paused</span>`;
 }
 }

 div.innerHTML = `
<span class="kbd-badge ${badgeClass}">${o.key.toUpperCase()}</span>
<span class="sm-key-name">${escapeHTML(o.name)}</span>
 ${statusSpan}
 `;
 keysList.appendChild(div);
 });
}

function renderSmMixLog() {
 const logUl = document.getElementById('sm-mix-log');
 logUl.innerHTML = '';

 if (smRecordedClips.length === 0) {
 logUl.innerHTML = '<li class="empty-log">No clips recorded yet. Press shortcut keys while the base audio is playing.</li>';
 return;
 }

 const sorted = [...smRecordedClips].sort((a, b) =>a.timelineStart - b.timelineStart);
 sorted.forEach(c =>{
 const li = document.createElement('li');
 let cropText = '';
 if (c.cropStart >0 || c.cropEnd !== null) {
 const startSec = c.cropStart.toFixed(3);
 const endSec = c.cropEnd !== null ? c.cropEnd.toFixed(3) + 's': 'end';
 cropText = ` (crop: ${startSec}s â†’ ${endSec})`;
 }
 li.innerHTML = `<span class="log-time">[${c.timelineStart.toFixed(3)}s]</span>${escapeHTML(c.name)}${cropText}`;
 logUl.appendChild(li);
 });

 const container = logUl.parentElement;
 container.scrollTop = container.scrollHeight;
}

function stopSmAudio() {
 if (smBaseAudio) {
 try { smBaseAudio.pause(); } catch(_) {}
 smBaseAudio = null;
 }
 if (smTimelineTimer) {
 clearInterval(smTimelineTimer);
 smTimelineTimer = null;
 }
 Object.keys(activeOverlayAudios).forEach(id =>{
 if (activeOverlayAudios[id] && activeOverlayAudios[id].sourceNode) {
 try { activeOverlayAudios[id].sourceNode.stop(); } catch(_) {}
 }
 });
 Object.keys(activeOverlayAudios).forEach(k =>delete activeOverlayAudios[k]);
}

function exitToSetupView() {
  // Preserve the exact exit point so they can "Continue" later
  if (smBaseAudio) {
      smLastBaseTime = smBaseAudio.currentTime;
  }

  // Close any active base segments safely
  if (smBaseSegmentStartSource !== null && smBaseAudio) {
      const duration = smBaseAudio.currentTime - smBaseSegmentStartSource;
      if (duration >0) {
          smBaseSegments.push({ timelineStart: smBaseSegmentStartTimeline, sourceStart: smBaseSegmentStartSource, duration });
      }
      smBaseSegmentStartTimeline = null;
      smBaseSegmentStartSource = null;
  }

  // Cap active overlays but PRESERVE tails so we don't chop them off harshly
  if (typeof capActiveOverlayRecordings === 'function') {
      capActiveOverlayRecordings(true);
  }

  stopSmAudio();
 document.getElementById('sm-setup-view').hidden = false;
 document.getElementById('sm-live-view').hidden = true;

 // Hide header control buttons
 document.getElementById('btn-sm-export').style.display = 'none';
 document.getElementById('btn-sm-save').style.display = 'none';
 document.getElementById('btn-sm-reset-mix').style.display = 'none';

  // Focus setup view to enable smooth NVDA transition
  const setupView = document.getElementById('sm-setup-view');
  if (setupView) {
  setupView.focus();
  }
  
  updateSmGoButton();
}

function resetAndRecordFromScratch() {
 if (!smBaseAudio) return;

 const confirmReset = confirm("Are you sure you want to clear all recordings and start recording from scratch?");
 if (!confirmReset) return;

 // 1. Clear recorded data
 smRecordedClips.length = 0;
 smBaseSegments.length = 0;

 // 2. Stop any active physical audios
 Object.keys(activeOverlayAudios).forEach(id =>{
 if (activeOverlayAudios[id] && activeOverlayAudios[id].sourceNode) {
 try { activeOverlayAudios[id].sourceNode.stop(); } catch(_) {}
 }
 delete activeOverlayAudios[id];
 });

 reviewOverlayPlaybacks.forEach(p =>stopReviewPlaybackEntry(p));
 reviewOverlayPlaybacks = [];
 playedClipIds.clear();

 smVirtualTime = 0;
 smSoftPaused = false;
 smTotalRecordedDuration = 0;
 smBaseSegmentStartTimeline = 0;
 smBaseSegmentStartSource = 0;
 smLastUpdateTime = getAudioCtx().currentTime;

 // 4. Seek base audio to start
 smBaseAudio.currentTime = 0;
 smBaseAudio.endedTriggered = false;

 // 5. Update UI
 renderSmActiveKeysList();
 renderSmMixLog();
 updatePlaybackStateUI('playing');

 // 6. Resume base playing
 smResumeBase();
}

async function exportSuperModeWav(isSaveToLib = false) {
  if (isExportingMedia) { alert('An export is already in progress. Please wait.'); return; }
  if (!smBaseAsset) return;
  
  isExportingMedia = true;
  try {
  // Decode base audio
  let baseBuffer;
  try {
  baseBuffer = await decodeAudio(smBaseAsset.objectURL);
  } catch (err) {
  console.error(err);
  alert('Failed to decode base audio file.');
  return;
  }

  // Decode overlays
  const uniqueIds = [...new Set(smRecordedClips.map(c =>c.assetId))];
  const overlayBuffers = {};

  try {
  await Promise.all(uniqueIds.map(async id =>{
  const asset = getAsset(id);
  if (asset) {
  overlayBuffers[id] = await decodeAudio(asset.objectURL);
  }
  }));
  } catch (err) {
  console.error(err);
  alert('Failed to decode one or more overlay audio files.');
  return;
  }

  // Calculate total duration correctly with crops and segments
  const exportSegments = [...smBaseSegments];
  if (smBaseAudio && !smBaseAudio.paused && smBaseSegmentStartSource !== null) {
  const activeDur = smBaseAudio.currentTime - smBaseSegmentStartSource;
  if (activeDur >0) {
  exportSegments.push({
  timelineStart: smBaseSegmentStartTimeline,
  sourceStart: smBaseSegmentStartSource,
  duration: activeDur
  });
  }
  }

  let totalDuration = baseBuffer.duration || 0;
  exportSegments.forEach(seg =>{
  totalDuration = Math.max(totalDuration, seg.timelineStart + seg.duration);
  });

  smRecordedClips.forEach(c =>{
  const buf = overlayBuffers[c.assetId];
  if (buf) {
  const cs = c.cropStart || 0;
  const ce = c.cropEnd != null ? Math.min(c.cropEnd, buf.duration) : buf.duration;
  const dur = Math.max(0, ce - cs);
  totalDuration = Math.max(totalDuration, c.timelineStart + dur);
  }
  });

  const sr = getAudioCtx().sampleRate;
  const offline = new OfflineAudioContext(2, Math.ceil(totalDuration * sr), sr);

  const exportCompressor = offline.createDynamicsCompressor();
  exportCompressor.threshold.setValueAtTime(-2, 0);
  exportCompressor.knee.setValueAtTime(0, 0);
  exportCompressor.ratio.setValueAtTime(20, 0);
  exportCompressor.attack.setValueAtTime(0.005, 0);
  exportCompressor.release.setValueAtTime(0.05, 0);
  exportCompressor.connect(offline.destination);

  const baseVolume = (smBaseAsset && smBaseAsset.volume !== undefined) ? smBaseAsset.volume : 1.0;

  exportSegments.forEach(seg =>{
  const baseSrc = offline.createBufferSource();
  baseSrc.buffer = baseBuffer;
  const baseGain = offline.createGain();
  baseGain.gain.value = baseVolume;
  baseSrc.connect(baseGain);
  baseGain.connect(exportCompressor);
  baseSrc.start(seg.timelineStart, seg.sourceStart, seg.duration);
  });

  smRecordedClips.forEach(c =>{
  const buf = overlayBuffers[c.assetId];
  if (buf) {
  const src = offline.createBufferSource();
  src.buffer = buf;
  const gain = offline.createGain();
  gain.gain.value = (c.volume !== undefined) ? c.volume : 1.0;
  src.connect(gain);
  gain.connect(exportCompressor);

  const cs = c.cropStart || 0;
  const ce = c.cropEnd != null ? Math.min(c.cropEnd, buf.duration) : buf.duration;
  const dur = Math.max(0, ce - cs);

  src.start(c.timelineStart, cs, dur);
  }
  });

  try {
  const rendered = await offline.startRendering();
  const wavBlob = await audioBufferToWav(rendered);
  if (isSaveToLib) {
    saveBlobToLibrary(wavBlob, 'super_mode_mix', 'audio');
  } else {
    downloadBlob(wavBlob, 'super_mode_mix.wav');
    announce('Merged super mix downloaded successfully.');
  }
  } catch (err) {
  console.error(err);
  alert('Error generating merged WAV file.');
  announce('Export failed.', true);
  }
  } finally {
  isExportingMedia = false;
  }
}
