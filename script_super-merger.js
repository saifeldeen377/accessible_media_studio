// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// TOOL 7 — Super Merger
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

 // ── Effects Setup ──────────────────────────────────────────────
 const effectTypeSelect = document.getElementById('sm-effect-type');
 const effectParamGroup = document.getElementById('sm-effect-param-group');
 const effectParamInput = document.getElementById('sm-effect-param');
 const effectParamLabel = document.getElementById('sm-effect-param-label');
 const effectForm = document.getElementById('form-sm-effect');
 const effectKeyInput = document.getElementById('sm-effect-key');
 const manageEffectsDialog = document.getElementById('sm-manage-effects-dialog');
 const btnManageEffects = document.getElementById('btn-sm-manage-effects');
 const btnManageEffectsClose = document.getElementById('btn-sm-manage-effects-close');
 const btnManageEffectsReset = document.getElementById('btn-sm-manage-effects-reset');

 setupFocusTrap(manageEffectsDialog);

 // Populate effect type dropdown
 Object.entries(SM_EFFECT_TYPES).forEach(([key, def]) => {
  const opt = document.createElement('option');
  opt.value = key;
  opt.textContent = def.name;
  effectTypeSelect.appendChild(opt);
 });

 // Show/hide param input based on effect type
 effectTypeSelect.addEventListener('change', () => {
  const def = SM_EFFECT_TYPES[effectTypeSelect.value];
  if (def && def.hasParams) {
   effectParamGroup.hidden = false;
   effectParamLabel.textContent = def.paramLabel + ':';
   effectParamInput.min = def.paramMin;
   effectParamInput.max = def.paramMax;
   effectParamInput.value = def.paramDefault;
  } else {
   effectParamGroup.hidden = true;
  }
 });

 effectKeyInput.addEventListener('input', (e) => {
  e.target.setCustomValidity('');
 });

 // Effect form submit
 effectForm.addEventListener('submit', e => {
  e.preventDefault();
  const effectType = effectTypeSelect.value;
  const rawKey = effectKeyInput.value.trim().toLowerCase();
  const target = document.getElementById('sm-effect-target').value;

  if (!effectType) { announce('Please select an effect type.', true); return; }
  if (!rawKey) { announce('Please type a shortcut key.', true); return; }

  // Check for duplicate keys across overlays AND effects
  const overlayConflict = smOverlays.find(o => o.key.toLowerCase() === rawKey);
  const effectConflict = smEffects.find(ef => ef.key.toLowerCase() === rawKey);
  if (overlayConflict || effectConflict) {
   effectKeyInput.setCustomValidity(`The key "${rawKey.toUpperCase()}" is already assigned. Choose a different key.`);
   effectKeyInput.reportValidity();
   return;
  }

  const def = SM_EFFECT_TYPES[effectType];
  const params = {};
  if (def && def.hasParams) {
   params.repeatCount = parseInt(effectParamInput.value) || def.paramDefault;
   params.value = parseFloat(effectParamInput.value) || def.paramDefault;
  }

  smEffects.push({
   id: `sm-effect-${++smEffectIdCounter}`,
   effectType,
   key: rawKey,
   target,
   params
  });

  const targetNames = { all: 'Everything', base_only: 'Base Only', overlays_only: 'Overlays Only' };
  let paramAnnounce = '';
  if (params.value !== undefined) paramAnnounce = ` with level ${params.value}`;
  announce(`Added effect "${def.name}" on key "${rawKey.toUpperCase()}", applied to ${targetNames[target]}${paramAnnounce}.`, true);

  renderSmShortcutsTable();
  effectTypeSelect.value = '';
  effectKeyInput.value = '';
  effectParamGroup.hidden = true;
 });

 // Manage Effects dialog
 btnManageEffects.addEventListener('click', () => {
  renderManageEffectsList();
  manageEffectsDialog.showModal();
  if (smEffects.length === 0) {
   announce('There are no effects added yet.', true);
  }
 });

 btnManageEffectsClose.addEventListener('click', () => {
  manageEffectsDialog.close();
  btnManageEffects.focus();
 });

 btnManageEffectsReset.addEventListener('click', () => {
  smEffects.length = 0;
  renderManageEffectsList();
  renderSmShortcutsTable();
  btnManageEffectsClose.focus();
  announce('All effects reset.');
 });

 // Global key listener
 window.addEventListener('keydown', e =>{
 if (e.key === 'Escape'&& smActive) {
    if (manageEffectsDialog.open) {
        e.preventDefault();
        manageEffectsDialog.close();
        btnManageEffects.focus();
        return;
    }
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

 // ────────────────────────────────────────────────────────────────────────────
 if (e.key === ' '|| e.code === 'Space') {
 e.preventDefault();
 
  if (isCtrl && isShift) {
    // ── Ctrl+Shift+Space: Cancel Silent Gap ──────────────────────────────────
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
 return; // prevent falling through
 }

 // Effect shortcuts
 const effect = smEffects.find(ef => ef.key.toLowerCase() === pressedKey);
 if (effect && smIsActive()) {
  if (isAlt && isShift) {
   e.preventDefault();
   clearEffectRecordings(effect);
   return;
  } else if (!isAlt && !isShift) {
   e.preventDefault();
   toggleSmEffect(effect);
   return;
  }
 }
 });

  // --- Additional Settings Collapsible Toggle (Accessible Button, not a list) ---
  const toggleAdvBtn = document.getElementById('btn-toggle-sm-advanced');
  const advPanel = document.getElementById('sm-advanced-settings-panel');
  const advIndicator = document.getElementById('sm-advanced-toggle-indicator');
  if (toggleAdvBtn && advPanel) {
    toggleAdvBtn.addEventListener('click', () => {
      const isExpanded = toggleAdvBtn.getAttribute('aria-expanded') === 'true';
      toggleAdvBtn.setAttribute('aria-expanded', String(!isExpanded));
      advPanel.style.display = isExpanded ? 'none' : 'block';
      if (advIndicator) {
        advIndicator.innerHTML = isExpanded ? '&#9662;' : '&#9652;';
      }
    });
  }

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
      
      if (e.key === ' ' || e.code === 'Space') {
          e.preventDefault(); // Prevent page scroll or default button click
          e.stopPropagation(); // Prevent entering live recording logic
          
          if (window._isCalibrationFinished) return;
          
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
              
              window._isCalibrationFinished = true;
              setTimeout(() =>{
                  calibrationDialog.close();
                  calibrateBtn.focus();
                  window._isCalibrationFinished = false;
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
 const overlay = document.getElementById('super-mode-overlay');
 const container = document.querySelector('.sm-container');
 if (container) container.classList.remove('sm-live-active');
 if (overlay) {
     overlay.classList.remove('sm-live-active');
     overlay.hidden = false;
 }

 const setupView = document.getElementById('sm-setup-view');
 const liveView = document.getElementById('sm-live-view');
 if (setupView) {
     setupView.hidden = false;
     setupView.style.display = 'block';
     setupView.removeAttribute('aria-hidden');
     setupView.removeAttribute('inert');
 }
 if (liveView) {
     liveView.hidden = true;
     liveView.style.display = 'none';
     liveView.setAttribute('aria-hidden', 'true');
     liveView.setAttribute('inert', '');
 }
 setAppBackgroundInert(true);

 const goBtn = document.getElementById('btn-sm-go');
 const continueBtn = document.getElementById('btn-sm-continue');
 if (goBtn) {
     goBtn.style.display = '';
     goBtn.removeAttribute('tabindex');
     goBtn.removeAttribute('aria-hidden');
 }
 if (continueBtn) {
     continueBtn.removeAttribute('tabindex');
     continueBtn.removeAttribute('aria-hidden');
 }

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
         document.getElementById('sm-base-select').value = '';
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
 if (container) {
   container.setAttribute('tabindex', '-1');
   container.focus();
 }

 // announce("Super Merger Setup Opened. Choose a base audio to start.");
}

function exitSuperMode() {
  smActive = false;
  const overlay = document.getElementById('super-mode-overlay');
  const container = document.querySelector('.sm-container');
  if (container) container.classList.remove('sm-live-active');
  if (overlay) {
      overlay.classList.remove('sm-live-active');
      overlay.hidden = true;
  }
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
      if (duration > 0) {
          smBaseSegments.push({ timelineStart: smBaseSegmentStartTimeline, sourceStart: smBaseSegmentStartSource, duration });
      }
      smBaseSegmentStartTimeline = null;
      smBaseSegmentStartSource = null;
  }

  // Cap active overlays but PRESERVE tails so we don't chop them off harshly
  if (typeof capActiveOverlayRecordings === 'function') {
      capActiveOverlayRecordings(true);
  }

  deactivateAllSmEffects(true, false);
  setAppBackgroundInert(false);
  stopSmAudio();

  const setupView = document.getElementById('sm-setup-view');
  const liveView = document.getElementById('sm-live-view');
  if (setupView) {
      setupView.hidden = true;
      setupView.style.display = 'none';
      setupView.setAttribute('aria-hidden', 'true');
      setupView.setAttribute('inert', '');
  }
  if (liveView) {
      liveView.hidden = true;
      liveView.style.display = 'none';
      liveView.setAttribute('aria-hidden', 'true');
      liveView.setAttribute('inert', '');
  }

  const trigger = document.getElementById('btn-enter-super-mode');
  if (trigger) trigger.focus();
}

function updateSmGoButton() {
  const goBtn = document.getElementById('btn-sm-go');
  const continueBtn = document.getElementById('btn-sm-continue');
  const liveView = document.getElementById('sm-live-view');
  const isLive = liveView && (!liveView.hidden || liveView.style.display !== 'none');

  if (isLive) {
      if (goBtn) {
          goBtn.disabled = true;
          goBtn.style.display = 'none';
          goBtn.setAttribute('tabindex', '-1');
          goBtn.setAttribute('aria-hidden', 'true');
      }
      if (continueBtn) {
          continueBtn.disabled = true;
          continueBtn.style.display = 'none';
          continueBtn.setAttribute('tabindex', '-1');
          continueBtn.setAttribute('aria-hidden', 'true');
      }
      return;
  }

  if (goBtn) {
      goBtn.disabled = !smBaseAsset;
      goBtn.style.display = '';
      goBtn.removeAttribute('tabindex');
      goBtn.removeAttribute('aria-hidden');
  }
  
  if (continueBtn) {
      if (smBaseAsset && (smRecordedClips.length > 0 || smVirtualTime > 0)) {
          continueBtn.style.display = 'inline-block';
          continueBtn.disabled = false;
          continueBtn.removeAttribute('tabindex');
          continueBtn.removeAttribute('aria-hidden');
      } else {
          continueBtn.style.display = 'none';
      }
  }
}

function renderSmShortcutsTable() {
    const summary = document.getElementById('sm-shortcuts-summary');
    if (summary) {
        const overlayCount = smOverlays.length;
        const effectCount = smEffects.length;
        summary.textContent = `${overlayCount} overlay${overlayCount === 1 ? '' : 's'} configured. ${effectCount} effect${effectCount === 1 ? '' : 's'} configured.`;
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


// ── Audio Effects Engine ──────────────────────────────────────────────

/**
 * Create Web Audio effect nodes for a given effect type.
 * Returns { input: AudioNode, output: AudioNode, allNodes: AudioNode[] }
 */
function createEffectNodes(ctx, effectType, params) {
 const nodes = [];
 let input, output;

 switch (effectType) {
  case 'phone': {
   const filter = ctx.createBiquadFilter();
   filter.type = 'bandpass';
   filter.frequency.value = 1500;
   filter.Q.value = 5.0;
   
   const makeup = ctx.createGain();
   makeup.gain.value = 3.5;
   
   filter.connect(makeup);
   nodes.push(filter, makeup);
   input = filter;
   output = makeup;
   break;
  }
  case 'echo': {
   const dry = ctx.createGain();
   dry.gain.value = 1.0;
   const wet = ctx.createGain();
   wet.gain.value = 0.5;
   const delay = ctx.createDelay(2.0);
   delay.delayTime.value = 0.3;
   const feedback = ctx.createGain();
   feedback.gain.value = 0.35;
   const merger = ctx.createGain();
   merger.gain.value = 1.0;

   dry.connect(merger);
   delay.connect(wet);
   wet.connect(merger);
   delay.connect(feedback);
   feedback.connect(delay);

   input = ctx.createGain();
   input.gain.value = 1.0;
   input.connect(dry);
   input.connect(delay);

   nodes.push(input, dry, wet, delay, feedback, merger);
   output = merger;
   break;
  }
  case 'doubling': {
   const count = (params && params.repeatCount) ? params.repeatCount : 3;
   const gapSec = 0.02;
   const merger = ctx.createGain();
   merger.gain.value = 0.8;

   input = ctx.createGain();
   input.gain.value = 1.0;

   const origGain = ctx.createGain();
   origGain.gain.value = 1.0;
   input.connect(origGain);
   origGain.connect(merger);
   nodes.push(origGain);

   for (let i = 1; i <= count; i++) {
    const d = ctx.createDelay(2.0);
    d.delayTime.value = gapSec * i;
    const g = ctx.createGain();
    g.gain.value = Math.max(0.3, 1.0 - (i * 0.15));
    input.connect(d);
    d.connect(g);
    g.connect(merger);
    nodes.push(d, g);
   }

   nodes.push(input, merger);
   output = merger;
   break;
  }
  case 'lowpass': {
   const filter = ctx.createBiquadFilter();
   filter.type = 'lowpass';
   filter.frequency.value = 400;
   filter.Q.value = 1.0;
   
   const makeup = ctx.createGain();
   makeup.gain.value = 1.5;
   filter.connect(makeup);
   
   nodes.push(filter, makeup);
   input = filter;
   output = makeup;
   break;
  }
  case 'highpass': {
   const filter = ctx.createBiquadFilter();
   filter.type = 'highpass';
   filter.frequency.value = 3000;
   filter.Q.value = 1.0;
   
   const makeup = ctx.createGain();
   makeup.gain.value = 1.5;
   filter.connect(makeup);
   
   nodes.push(filter, makeup);
   input = filter;
   output = makeup;
   break;
  }
  case 'distortion': {
   const waveshaper = ctx.createWaveShaper();
   const amount = 50;
   const samples = 44100;
   const curve = new Float32Array(samples);
   const deg = Math.PI / 180;
   for (let i = 0; i < samples; i++) {
    const x = (i * 2) / samples - 1;
    curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
   }
   waveshaper.curve = curve;
   waveshaper.oversample = '4x';
   
   const makeup = ctx.createGain();
   makeup.gain.value = 1.2;
   waveshaper.connect(makeup);
   
   nodes.push(waveshaper, makeup);
   input = waveshaper;
   output = makeup;
   break;
  }
  case 'robot': {
   const osc = ctx.createOscillator();
   osc.type = 'sine';
   osc.frequency.value = 50;
   
   const ringMod = ctx.createGain();
   ringMod.gain.value = 0;
   osc.connect(ringMod.gain);
   osc.start();
   
   const makeup = ctx.createGain();
   makeup.gain.value = 2.0;
   ringMod.connect(makeup);
   
   nodes.push(osc, ringMod, makeup);
   input = ringMod;
   output = makeup;
   break;
  }
  case 'tremolo': {
   const speed = (params && params.value !== undefined) ? params.value : 5;
   const hz = 2 + ((speed - 1) / 9) * 13;
   
   const osc = ctx.createOscillator();
   osc.type = 'sine';
   osc.frequency.value = hz;
   
   const tremoloGain = ctx.createGain();
   tremoloGain.gain.value = 0.5;
   
   const oscGain = ctx.createGain();
   oscGain.gain.value = 0.5;
   
   osc.connect(oscGain);
   oscGain.connect(tremoloGain.gain);
   osc.start();
   
   const makeup = ctx.createGain();
   makeup.gain.value = 1.8;
   tremoloGain.connect(makeup);
   
   nodes.push(osc, oscGain, tremoloGain, makeup);
   input = tremoloGain;
   output = makeup;
   break;
  }
  case 'pitch': {
   const amount = (params && params.value !== undefined) ? params.value : 5;
   const pitchMult = ((amount - 5) / 5.0) * 0.8;

   const jungle = new Jungle(ctx);
   jungle.setPitchOffset(pitchMult);

   input = ctx.createGain();
   output = ctx.createGain();
   output.gain.value = 1.5;
   
   input.connect(jungle.input);
   jungle.output.connect(output);

   nodes.push(input, jungle.input, jungle.output, output, ...(jungle.allNodes || []));
   break;
  }
  case 'autopan': {
   const speed = (params && params.value !== undefined) ? params.value : 5;
   const freq = 0.1 + ((speed - 1) / 9) * 4.9;
   
   const panner = ctx.createStereoPanner();
   panner.pan.value = 0;

   const lfo = ctx.createOscillator();
   lfo.type = 'sine';
   lfo.frequency.value = freq;
   lfo.connect(panner.pan);
   lfo.start();

   const makeup = ctx.createGain();
   makeup.gain.value = 1.2;
   panner.connect(makeup);

   nodes.push(panner, lfo, makeup);
   input = panner;
   output = makeup;
   break;
  }
  case 'reverb': {
   const size = (params && params.value !== undefined) ? params.value : 5;
   const duration = 1.0 + ((size - 1) / 9) * 4.0;
   const sr = ctx.sampleRate;
   const length = sr * duration;
   const impulse = ctx.createBuffer(2, length, sr);
   const left = impulse.getChannelData(0);
   const right = impulse.getChannelData(1);
   for (let i = 0; i < length; i++) {
    const decay = Math.exp(-i / (sr * (duration / 4)));
    left[i] = (Math.random() * 2 - 1) * decay;
    right[i] = (Math.random() * 2 - 1) * decay;
   }

   const convolver = ctx.createConvolver();
   convolver.buffer = impulse;

   const dry = ctx.createGain();
   dry.gain.value = 1.0;
   const wet = ctx.createGain();
   wet.gain.value = 0.6;
   const merger = ctx.createGain();

   input = ctx.createGain();
   input.connect(dry);
   input.connect(convolver);
   convolver.connect(wet);
   dry.connect(merger);
   wet.connect(merger);

   nodes.push(input, dry, convolver, wet, merger);
   output = merger;
   break;
  }
  case 'radio': {
   const bass = ctx.createBiquadFilter();
   bass.type = 'lowshelf';
   bass.frequency.value = 150;
   bass.gain.value = 18;

   const treble = ctx.createBiquadFilter();
   treble.type = 'highshelf';
   treble.frequency.value = 3500;
   treble.gain.value = 10;

   const compressor = ctx.createDynamicsCompressor();
   compressor.threshold.value = -45;
   compressor.knee.value = 0;
   compressor.ratio.value = 20;
   compressor.attack.value = 0.003;
   compressor.release.value = 0.05;

   const makeUp = ctx.createGain();
   makeUp.gain.value = 3.5;

   bass.connect(treble);
   treble.connect(compressor);
   compressor.connect(makeUp);

   input = bass;
   output = makeUp;
   nodes.push(bass, treble, compressor, makeUp);
   break;
  }
  case 'walkietalkie': {
   const bandpass = ctx.createBiquadFilter();
   bandpass.type = 'bandpass';
   bandpass.frequency.value = 1200;
   bandpass.Q.value = 2.0;

   const shaper = ctx.createWaveShaper();
   const amount = 80;
   const samples = 44100;
   const curve = new Float32Array(samples);
   const deg = Math.PI / 180;
   for (let i = 0; i < samples; i++) {
    const x = (i * 2) / samples - 1;
    curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
   }
   shaper.curve = curve;
   shaper.oversample = '4x';

   const highpass = ctx.createBiquadFilter();
   highpass.type = 'highpass';
   highpass.frequency.value = 2000;

   const makeup = ctx.createGain();
   makeup.gain.value = 3.0;

   bandpass.connect(shaper);
   shaper.connect(highpass);
   highpass.connect(makeup);

   input = bandpass;
   output = makeup;
   nodes.push(bandpass, shaper, highpass, makeup);
   break;
  }
  case 'flanger': {
   const intensity = (params && params.value !== undefined) ? params.value : 5;
   const speed = 0.1 + ((intensity - 1) / 9) * 2.0;
   
   const dry = ctx.createGain();
   dry.gain.value = 1.0;
   const wet = ctx.createGain();
   wet.gain.value = 0.7;

   const delay = ctx.createDelay(0.02);
   delay.delayTime.value = 0.005;

   const lfo = ctx.createOscillator();
   lfo.type = 'sine';
   lfo.frequency.value = speed;
   
   const lfoGain = ctx.createGain();
   lfoGain.gain.value = 0.004;
   
   lfo.connect(lfoGain);
   lfoGain.connect(delay.delayTime);
   lfo.start();

   const feedback = ctx.createGain();
   feedback.gain.value = 0.5;

   input = ctx.createGain();
   input.connect(dry);
   input.connect(delay);
   
   delay.connect(wet);
   delay.connect(feedback);
   feedback.connect(delay);

   const merger = ctx.createGain();
   merger.gain.value = 1.0;
   dry.connect(merger);
   wet.connect(merger);

   nodes.push(input, dry, wet, delay, lfo, lfoGain, feedback, merger);
   output = merger;
   break;
  }
 }

 return { input, output, allNodes: nodes };
}


/**
 * Rebuild the audio routing for base and overlay buses based on active effects.
 * Called whenever an effect is toggled on or off.
 */
function rebuildEffectRouting() {
 if (!smBaseBusNode || !smOverlayBusNode) return;

 const activeArr = Object.values(activeSmEffects).filter(e => e.state === 'active');

 const baseEffects = activeArr.filter(e => e.target === 'base_only' || e.target === 'all');
 const overlayEffects = activeArr.filter(e => e.target === 'overlays_only' || e.target === 'all');

 // Disconnect buses
 try { smBaseBusNode.disconnect(); } catch(_) {}
 try { smOverlayBusNode.disconnect(); } catch(_) {}

 // Disconnect all effect outputs to prevent duplicating the signal path
 activeArr.forEach(eff => {
  if (eff.baseNodes && eff.baseNodes.output) {
   try { eff.baseNodes.output.disconnect(); } catch(_) {}
  }
  if (eff.overlayNodes && eff.overlayNodes.output) {
   try { eff.overlayNodes.output.disconnect(); } catch(_) {}
  }
 });

 // Build base chain
 if (baseEffects.length === 0) {
  smBaseBusNode.connect(masterCompressor);
 } else {
  let prev = smBaseBusNode;
    baseEffects.forEach(eff => {
   if (eff.baseNodes) {
    prev.connect(eff.baseNodes.input);
    prev = eff.baseNodes.output;
   }
  });
  prev.connect(masterCompressor);
 }

 // Build overlay chain
 if (overlayEffects.length === 0) {
  smOverlayBusNode.connect(masterCompressor);
 } else {
  let prev = smOverlayBusNode;
    overlayEffects.forEach(eff => {
   if (eff.overlayNodes) {
    prev.connect(eff.overlayNodes.input);
    prev = eff.overlayNodes.output;
   }
  });
  prev.connect(masterCompressor);
 }
}

/**
 * Safely stop and disconnect all audio nodes associated with an effect.
 */
function disposeEffectNodes(effectNodes) {
  if (!effectNodes || !effectNodes.allNodes) return;
  effectNodes.allNodes.forEach(node => {
    try {
      if (typeof node.stop === 'function') {
        node.stop();
      }
    } catch (_) {}
    try {
      if (typeof node.disconnect === 'function') {
        node.disconnect();
      }
    } catch (_) {}
  });
}

/**
 * Find all segments connected (touching or contiguous) to targetEntry for the same effect.
 */
function getSmConnectedSegments(targetEntry, effectType, effectId, overlapBehavior) {
  if (!targetEntry) return [];
  const isMatch = (r) => {
    if (overlapBehavior === 'auto_stop') {
      return r.effectType === effectType;
    }
    return r.effectId === effectId;
  };

  const cluster = new Set([targetEntry]);
  let added = true;
  while (added) {
    added = false;
    for (const r of smRecordedEffects) {
      if (cluster.has(r) || !isMatch(r)) continue;
      const rEnd = r.timelineEnd !== null ? r.timelineEnd : Infinity;
      for (const item of cluster) {
        const itemEnd = item.timelineEnd !== null ? item.timelineEnd : Infinity;
        const touchesOrOverlaps = 
          (r.timelineStart <= itemEnd + 0.08 && rEnd >= item.timelineStart - 0.08);
        if (touchesOrOverlaps) {
          cluster.add(r);
          added = true;
          break;
        }
      }
    }
  }
  return Array.from(cluster);
}

/**
 * Revert any overwrites (truncations, swallowed entries, splits) made by an effect recording.
 */
function restoreEffectOverwrites(recordEntry) {
  if (!recordEntry || !recordEntry.overwrites || !recordEntry.overwrites.length) return false;
  let restoredAny = false;
  recordEntry.overwrites.forEach(ow => {
    if (ow.action === 'truncated_left') {
      const target = smRecordedEffects.find(r => r.id === ow.targetId);
      if (target) {
        target.timelineStart = ow.originalStart;
        restoredAny = true;
      }
    } else if (ow.action === 'truncated_right') {
      const target = smRecordedEffects.find(r => r.id === ow.targetId);
      if (target) {
        target.timelineEnd = ow.originalEnd;
        restoredAny = true;
      }
    } else if (ow.action === 'swallowed') {
      if (ow.savedEntry && !smRecordedEffects.some(r => r.id === ow.savedEntry.id)) {
        smRecordedEffects.push(ow.savedEntry);
        restoredAny = true;
      }
    } else if (ow.action === 'split') {
      const target = smRecordedEffects.find(r => r.id === ow.targetId);
      if (target) {
        target.timelineEnd = ow.originalEnd;
        restoredAny = true;
      }
      if (ow.splitClipId) {
        const splitIdx = smRecordedEffects.findIndex(r => r.id === ow.splitClipId);
        if (splitIdx !== -1) smRecordedEffects.splice(splitIdx, 1);
      }
    }
  });
  return restoredAny;
}

/**
 * Finalize a recorded effect entry by setting its end time and subtracting
 * any overlapping recorded intervals of the same shortcut or same type.
 */
function finalizeEffectRecording(recordEntry, effect) {
  if (!recordEntry || recordEntry.timelineEnd === null) return;

  // Discard corrupted or negligible recordings
  if (recordEntry.timelineEnd <= recordEntry.timelineStart + 0.02) {
    const idx = smRecordedEffects.findIndex(r => r.id === recordEntry.id);
    if (idx !== -1) smRecordedEffects.splice(idx, 1);
    return;
  }

  recordEntry.createdAt = recordEntry.createdAt || Date.now();
  recordEntry.overwrites = recordEntry.overwrites || [];

  const S = recordEntry.timelineStart;
  const E = recordEntry.timelineEnd;
  const idStr = effect.id;
  const effectType = effect.effectType;
  const overlapBehavior = document.getElementById('sm-effect-overlap-behavior')?.value || 'auto_stop';
  const clearBehavior = document.getElementById('sm-effect-clear-behavior')?.value || 'unified';

  const newClips = [];
  for (let i = smRecordedEffects.length - 1; i >= 0; i--) {
    const r = smRecordedEffects[i];
    if (r.id === recordEntry.id) continue;

    // In auto_stop mode, mutual exclusion applies to ALL effects of the same type!
    // In allow mode, mutual exclusion only applies to the same effectId (preventing duplicate overlapping records of the same shortcut).
    const shouldSubtract = (r.effectId === idStr) || 
      (overlapBehavior === 'auto_stop' && r.effectType === effectType);

    if (shouldSubtract) {
      const O_start = r.timelineStart;
      const O_end = r.timelineEnd !== null ? r.timelineEnd : Infinity;
      const originalEnd = r.timelineEnd;

      if (O_end <= S || (O_start >= E && Math.abs(O_start - E) > 0.05)) {
        // No overlap and not touching end
      } else if (O_start >= S && O_end <= E) {
        // Fully swallowed
        recordEntry.overwrites.push({
          action: 'swallowed',
          savedEntry: JSON.parse(JSON.stringify(r))
        });
        smRecordedEffects.splice(i, 1);
      } else if (O_start < S && O_end > E) {
        // Encompasses -> split into two
        const splitId = `smfx-${++smRecordedEffectIdCounter}`;
        recordEntry.overwrites.push({
          action: 'split',
          targetId: r.id,
          originalEnd: originalEnd,
          splitClipId: splitId
        });
        r.timelineEnd = S;
        newClips.push({
          ...r,
          id: splitId,
          timelineStart: E,
          timelineEnd: originalEnd,
          createdAt: r.createdAt || Date.now()
        });
      } else if (O_start < S && O_end > S) {
        // Overlaps left -> truncate right
        recordEntry.overwrites.push({
          action: 'truncated_right',
          targetId: r.id,
          originalEnd: originalEnd,
          newEnd: S
        });
        r.timelineEnd = S;
      } else if ((O_start < E && O_end > E) || Math.abs(O_start - E) <= 0.05) {
        // Overlaps right or touches right at the stop point E
        if (clearBehavior === 'unified') {
          // In Unified mode: the user stopped this effect at E!
          // The touching downstream piece is swallowed so the effect cleanly stops at E.
          recordEntry.overwrites.push({
            action: 'swallowed',
            savedEntry: JSON.parse(JSON.stringify(r))
          });
          smRecordedEffects.splice(i, 1);
        } else {
          // Sequential mode: keep remainder starting at E, but track overwrite for undo
          recordEntry.overwrites.push({
            action: 'truncated_left',
            targetId: r.id,
            originalStart: O_start,
            newStart: E
          });
          r.timelineStart = E;
        }
      }
    }
  }
  smRecordedEffects.push(...newClips);
}

/**
 * Toggle an effect on or off during live mixing or review playback.
 */
function toggleSmEffect(effect) {
  const overlapBehavior = document.getElementById('sm-effect-overlap-behavior')?.value || 'auto_stop';
  const clearBehavior = document.getElementById('sm-effect-clear-behavior')?.value || 'unified';

  // 1. Only search for LIVE active instances (exclude review instances!)
  const liveId = Object.keys(activeSmEffects).find(k => 
    !activeSmEffects[k].isReview && 
    activeSmEffects[k].effectId === effect.id && 
    activeSmEffects[k].state === 'active'
  );

  // 2. Search for REVIEW active instance of this effect (or same type in auto_stop mode)
  const reviewId = Object.keys(activeSmEffects).find(k => 
    activeSmEffects[k].isReview && 
    (activeSmEffects[k].effectId === effect.id || 
     (overlapBehavior === 'auto_stop' && activeSmEffects[k].effectType === effect.effectType))
  );

  // 3. Search for any recorded effect of this type currently active at smVirtualTime (including open-ended ongoing recordings)
  const activeRecordEntry = (!liveId && !reviewId) ? smRecordedEffects.find(r => 
    (r.effectId === effect.id || (overlapBehavior === 'auto_stop' && r.effectType === effect.effectType)) &&
    r.timelineStart <= smVirtualTime && 
    (r.timelineEnd === null || r.timelineEnd > smVirtualTime)
  ) : null;

  if (liveId) {
    // ── Deactivate Live Recording ──
    const active = activeSmEffects[liveId];
    active.state = 'inactive';

    // Record end time
    const recordEntry = smRecordedEffects.find(r => r.id === active.recordEntryId);
    if (recordEntry) {
      const now = getAudioCtx().currentTime;
      const elapsed = Math.max(0, now - smLastUpdateTime);
      let calculatedEnd = smVirtualTime + elapsed;
      if (smHeadphoneLatencySec > 0) {
        calculatedEnd = Math.max(0, calculatedEnd - smHeadphoneLatencySec);
      }
      recordEntry.timelineEnd = Math.max(recordEntry.timelineStart + 0.02, calculatedEnd);
      finalizeEffectRecording(recordEntry, effect);
    }

    // Disconnect and stop effect nodes
    if (active.baseNodes) disposeEffectNodes(active.baseNodes);
    if (active.overlayNodes) disposeEffectNodes(active.overlayNodes);

    delete activeSmEffects[liveId];
    rebuildEffectRouting();

    const typeName = SM_EFFECT_TYPES[effect.effectType] ? SM_EFFECT_TYPES[effect.effectType].name : effect.effectType;
    announce(`Effect ${typeName} off.`);
    renderSmActiveKeysList();
    renderSmMixLog();
  } else if (reviewId || activeRecordEntry) {
    // ── Turn off / Punch out Review Playback or Ongoing Recorded Effect ──
    if (reviewId) {
      const rev = activeSmEffects[reviewId];
      if (rev.baseNodes) disposeEffectNodes(rev.baseNodes);
      if (rev.overlayNodes) disposeEffectNodes(rev.overlayNodes);
      delete activeSmEffects[reviewId];
      rebuildEffectRouting();
    }

    // Stop / punch out the recorded effect at current virtual time
    const activeRecs = smRecordedEffects.filter(r => 
      (r.effectId === effect.id || (overlapBehavior === 'auto_stop' && r.effectType === effect.effectType)) &&
      r.timelineStart <= smVirtualTime && 
      (r.timelineEnd === null || r.timelineEnd > smVirtualTime)
    );

    let punchOutTime = smVirtualTime;
    if (smHeadphoneLatencySec > 0) {
      punchOutTime = Math.max(0, punchOutTime - smHeadphoneLatencySec);
    }

    if (clearBehavior === 'unified') {
      activeRecs.forEach(r => {
        const connected = getSmConnectedSegments(r, effect.effectType, effect.id, overlapBehavior);
        r.timelineEnd = Math.max(r.timelineStart + 0.02, punchOutTime);
        finalizeEffectRecording(r, effect);
        // In Unified mode: remove any connected downstream segments starting at or after punchOutTime
        connected.forEach(c => {
          if (c !== r && c.timelineStart >= punchOutTime - 0.05) {
            const idx = smRecordedEffects.indexOf(c);
            if (idx !== -1) smRecordedEffects.splice(idx, 1);
          }
        });
      });
    } else {
      activeRecs.forEach(r => {
        r.timelineEnd = Math.max(r.timelineStart + 0.02, punchOutTime);
        finalizeEffectRecording(r, effect);
      });
    }

    const typeName = SM_EFFECT_TYPES[effect.effectType] ? SM_EFFECT_TYPES[effect.effectType].name : effect.effectType;
    announce(`Effect ${typeName} off.`);
    renderSmActiveKeysList();
    renderSmMixLog();
  } else {
    // ── Activate ──
    if (overlapBehavior === 'auto_stop') {
      // 1. Mutual exclusion: stop any other live effect of the SAME TYPE
      const activeSameType = Object.keys(activeSmEffects).filter(k => 
        !activeSmEffects[k].isReview && 
        activeSmEffects[k].effectType === effect.effectType && 
        activeSmEffects[k].state === 'active' &&
        activeSmEffects[k].effectId !== effect.id
      );
      activeSameType.forEach(k => {
        const activeObj = activeSmEffects[k];
        const ef = smEffects.find(e => e.id === activeObj.effectId) || { id: activeObj.effectId, effectType: activeObj.effectType };
        toggleSmEffect(ef);
      });

      // 2. Kill any review playback of the SAME TYPE currently playing!
      const reviewSameType = Object.keys(activeSmEffects).filter(k => 
        activeSmEffects[k].isReview && 
        activeSmEffects[k].effectType === effect.effectType
      );
      reviewSameType.forEach(revKey => {
        const rev = activeSmEffects[revKey];
        if (rev.baseNodes) disposeEffectNodes(rev.baseNodes);
        if (rev.overlayNodes) disposeEffectNodes(rev.overlayNodes);
        delete activeSmEffects[revKey];
      });

      // 3. Cap any open-ended prior recordings of the SAME TYPE starting before or at current time
      const now = getAudioCtx().currentTime;
      const elapsed = Math.max(0, now - smLastUpdateTime);
      let calculatedStart = smVirtualTime + elapsed;
      if (smHeadphoneLatencySec > 0) {
        calculatedStart = Math.max(0, calculatedStart - smHeadphoneLatencySec);
      }
      smRecordedEffects.forEach(r => {
        if ((r.effectId === effect.id || r.effectType === effect.effectType) &&
            r.timelineEnd === null && r.timelineStart <= calculatedStart) {
          r.timelineEnd = Math.max(r.timelineStart + 0.02, calculatedStart);
          finalizeEffectRecording(r, effect);
        }
      });
    }

    // Overwrite protection: Kill any review playback of this specific effect
    const reviewIdToKill = Object.keys(activeSmEffects).find(k => 
      activeSmEffects[k].isReview && 
      activeSmEffects[k].effectId === effect.id
    );
    if (reviewIdToKill) {
      const rev = activeSmEffects[reviewIdToKill];
      if (rev.baseNodes) disposeEffectNodes(rev.baseNodes);
      if (rev.overlayNodes) disposeEffectNodes(rev.overlayNodes);
      delete activeSmEffects[reviewIdToKill];
    }

    const ctx = getAudioCtx();
    const id = `smfx-${++smRecordedEffectIdCounter}`;
    const now = ctx.currentTime;
    const elapsed = Math.max(0, now - smLastUpdateTime);

    const entry = {
      effectId: effect.id,
      effectType: effect.effectType,
      target: effect.target,
      params: effect.params || {},
      state: 'active',
      baseNodes: null,
      overlayNodes: null,
      recordEntryId: id,
      isReview: false
    };

    // Create separate node chains for base and overlay paths as needed
    if (effect.target === 'base_only' || effect.target === 'all') {
      entry.baseNodes = createEffectNodes(ctx, effect.effectType, effect.params);
    }
    if (effect.target === 'overlays_only' || effect.target === 'all') {
      entry.overlayNodes = createEffectNodes(ctx, effect.effectType, effect.params);
    }

    activeSmEffects[id] = entry;

    // Record start time
    let calculatedStart = smVirtualTime + elapsed;
    if (smHeadphoneLatencySec > 0) {
      calculatedStart = Math.max(0, calculatedStart - smHeadphoneLatencySec);
    }

    smRecordedEffects.push({
      id: id,
      effectId: effect.id,
      effectType: effect.effectType,
      timelineStart: calculatedStart,
      timelineEnd: null, // filled when deactivated
      target: effect.target,
      params: effect.params || {},
      createdAt: Date.now(),
      overwrites: []
    });

    rebuildEffectRouting();

    const typeName = SM_EFFECT_TYPES[effect.effectType] ? SM_EFFECT_TYPES[effect.effectType].name : effect.effectType;
    announce(`Effect ${typeName} on.`);
    renderSmActiveKeysList();
    renderSmMixLog();
  }
}

/**
 * Deactivate all currently active effects (called on stop/pause/exit).
 * If rememberForResume is true, saves live effects into smPendingLiveEffects
 * so they automatically resume when playback starts again.
 */
function deactivateAllSmEffects(includeReview = true, rememberForResume = false, capLiveRecordings = true) {
  if (!rememberForResume) {
    smPendingLiveEffects = [];
  }
  Object.keys(activeSmEffects).forEach(id => {
    const active = activeSmEffects[id];
    if (!includeReview && active.isReview) return;
    if (active.state === 'active' && !active.isReview) {
      if (capLiveRecordings) {
        const recordEntry = smRecordedEffects.find(r => r.id === active.recordEntryId);
        if (recordEntry && recordEntry.timelineEnd === null) {
          recordEntry.timelineEnd = smVirtualTime;
          const effectObj = smEffects.find(e => e.id === active.effectId) || { id: active.effectId, effectType: active.effectType };
          finalizeEffectRecording(recordEntry, effectObj);
        }
      }
      if (rememberForResume) {
        smPendingLiveEffects.push({
          effectId: active.effectId,
          effectType: active.effectType,
          target: active.target,
          params: active.params
        });
      }
    }
    if (active.baseNodes) disposeEffectNodes(active.baseNodes);
    if (active.overlayNodes) disposeEffectNodes(active.overlayNodes);
    delete activeSmEffects[id];
  });
  rebuildEffectRouting();
}

/**
 * Render the manage effects list inside the dialog.
 */
function renderManageEffectsList() {
 const listContainer = document.getElementById('sm-manage-effects-list');
 const resetBtn = document.getElementById('btn-sm-manage-effects-reset');

 Array.from(listContainer.children).forEach(child => {
  if (child.id !== 'sm-manage-effects-empty') child.remove();
 });

 if (smEffects.length === 0) {
  document.getElementById('sm-manage-effects-empty').style.display = '';
  resetBtn.style.display = 'none';
  return;
 }

 document.getElementById('sm-manage-effects-empty').style.display = 'none';
 resetBtn.style.display = 'inline-block';

 smEffects.forEach((item, idx) => {
  const card = document.createElement('div');
  card.className = 'sm-card data-row';
  card.style.border = '1px solid var(--border)';
  card.style.padding = '10px 15px';
  card.style.marginBottom = '10px';

  const typeName = SM_EFFECT_TYPES[item.effectType] ? SM_EFFECT_TYPES[item.effectType].name : item.effectType;
  const targetNames = { all: 'Everything', base_only: 'Base Only', overlays_only: 'Overlays Only' };
  const targetText = targetNames[item.target] || item.target;
  let paramText = '';
  if (item.params && item.params.value !== undefined) {
   paramText = `, Level: ${item.params.value}`;
  }
  const detailsText = `${typeName}, Key: ${item.key.toUpperCase()}, Target: ${targetText}${paramText}`;

  card.innerHTML = `
   <div style="display: flex; gap: 10px; align-items: center;">
    <span style="flex: 1;">${detailsText}</span>
    <button class="btn btn-danger btn-sm btn-effect-delete" aria-label="Remove ${typeName}">Remove</button>
   </div>
  `;

  card.querySelector('.btn-effect-delete').addEventListener('click', () => {
   smEffects.splice(idx, 1);
   renderManageEffectsList();
   renderSmShortcutsTable();
   announce(`Deleted effect ${typeName}.`, true);
  });

  listContainer.appendChild(card);
 });
}


// Every base player ever created is tracked here so stopSmAudio can silence all of them,
// even ones that were orphaned by a double start.
const SM_ALL_PLAYERS = new Set();

class WebAudioPlayer {
 constructor(buffer) {
 this.buffer = buffer;
 this.sourceNode = null;
 this.gainNode = null;
 this.isPlaying = false;
 this.playStartTime = 0;
 this.pausedOffset = 0;
 this.volume = 1.0;
 this.outputNode = null; // Custom output node (e.g. bus node); falls back to masterCompressor
 this.endedTriggered = false; // used by updateSmTimeline to fire once
 this._ended = false; // true only after natural playback completion
 SM_ALL_PLAYERS.add(this);
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
  gain.connect(this.outputNode || masterCompressor);

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

  stop() {
    this.stopNode();
    this.pausedOffset = 0;
    this.isPlaying = false;
    this._ended = true;
  }
}

function getAssetByteSize(asset) {
  if (!asset) return 1000000;
  if (asset.file && asset.file.size) return asset.file.size;
  if (asset.size) return asset.size;
  return 1000000;
}

let smIsSessionLoading = false;
let smUserOverrideEndStop = false;

async function startSuperModeLive() {
 if (!smBaseAsset) return;
 const liveView = document.getElementById('sm-live-view');
 if (liveView && (!liveView.hidden || liveView.style.display !== 'none')) return;
 if (smIsSessionLoading) {
     announce("Please wait, the session audio is currently loading...", true);
     return;
 }

 const goBtn = document.getElementById('btn-sm-go');
 const continueBtn = document.getElementById('btn-sm-continue');
 const container = document.querySelector('.sm-container');
 const overlay = document.getElementById('super-mode-overlay');

 smUserOverrideEndStop = false;
 if (smRecordedClips.length > 0) {
  const proceed = confirm("Your previous work will be deleted if you start a new session.\n\nIf you want to resume it instead, press Cancel and use the 'Continue Recording'button.\n\nPress OK to delete old work and start fresh.");
  if (!proceed) {
      if (goBtn) {
          goBtn.disabled = false;
          goBtn.style.display = '';
          goBtn.removeAttribute('tabindex');
          goBtn.removeAttribute('aria-hidden');
          goBtn.focus();
      }
      if (continueBtn) {
          continueBtn.removeAttribute('tabindex');
          continueBtn.removeAttribute('aria-hidden');
          continueBtn.disabled = false;
          continueBtn.style.display = 'inline-block';
      }
      return;
  }
 }

  if (container) container.classList.add('sm-live-active');
  if (overlay) overlay.classList.add('sm-live-active');

  // Cleanly wipe any lingering session audio and effects
  stopSmAudio();
  deactivateAllSmEffects();
  smRecordedClips.length = 0;
  smRecordedEffects.length = 0;
  smBaseSegments.length = 0;
  smBaseSegmentStartTimeline = null;
  smBaseSegmentStartSource = null;
  smSoftPaused = false;
  if (smTimelineTimer) { clearInterval(smTimelineTimer); smTimelineTimer = null; }
  const _logEl = document.getElementById('sm-mix-log');
  if (_logEl) _logEl.innerHTML = '<li class="empty-log">No clips recorded yet. Press shortcut keys while the base audio is playing.</li>';

  smIsSessionLoading = true;
  const originalGoBtnText = goBtn ? goBtn.textContent : 'Go Now';
  
  const allAssetObjects = [smBaseAsset, ...smOverlays.map(o => getAsset(o.assetId))].filter(Boolean);
  const totalBytes = allAssetObjects.reduce((acc, a) => acc + getAssetByteSize(a), 0) || 1;
  
  if (goBtn && totalBytes > 30 * 1024 * 1024) {
      goBtn.textContent = 'Loading... Please wait';
  }

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
    smIsSessionLoading = false;
    if (loadingAnnounceTimer) clearInterval(loadingAnnounceTimer);
    if (container) container.classList.remove('sm-live-active');
    if (overlay) overlay.classList.remove('sm-live-active');
    console.error(err);
    alert("Error pre-decoding audio files: " + err.message);
    if (goBtn) {
        goBtn.textContent = originalGoBtnText;
        goBtn.disabled = false;
        goBtn.style.display = '';
        goBtn.removeAttribute('tabindex');
        goBtn.removeAttribute('aria-hidden');
        goBtn.focus();
    }
    return;
  }
  
  smIsSessionLoading = false;
  if (loadingAnnounceTimer) clearInterval(loadingAnnounceTimer);
  
  if (goBtn) {
      goBtn.textContent = originalGoBtnText;
      goBtn.disabled = true;
      goBtn.style.display = 'none';
      goBtn.setAttribute('tabindex', '-1');
      goBtn.setAttribute('aria-hidden', 'true');
  }
  if (continueBtn) {
      continueBtn.disabled = true;
      continueBtn.style.display = 'none';
      continueBtn.setAttribute('tabindex', '-1');
      continueBtn.setAttribute('aria-hidden', 'true');
  }

  const setupView = document.getElementById('sm-setup-view');
  if (setupView) {
      setupView.hidden = true;
      setupView.style.display = 'none';
      setupView.setAttribute('aria-hidden', 'true');
      setupView.setAttribute('inert', '');
  }
  if (liveView) {
      liveView.hidden = false;
      liveView.style.display = 'block';
      liveView.removeAttribute('aria-hidden');
      liveView.removeAttribute('inert');
      liveView.setAttribute('tabindex', '-1');
      liveView.focus();
  }

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

  // Initialize Effects Buses
  const ctx = getAudioCtx();
  smBaseBusNode = ctx.createGain();
  smBaseBusNode.gain.value = 1.0;
  smBaseBusNode.connect(masterCompressor);

  smOverlayBusNode = ctx.createGain();
  smOverlayBusNode.gain.value = 1.0;
  smOverlayBusNode.connect(masterCompressor);

  // Create base audio player using Web Audio API
  const baseBuf = decodedAudioBuffers[smBaseAsset.id];
  smBaseAudio = new WebAudioPlayer(baseBuf);
  smBaseAudio.outputNode = smBaseBusNode; // Route base through bus
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

  smTimelineTimer = setInterval(updateSmTimeline, 20);

  // Shift focus to container immediately for direct NVDA focus jump when live mixer starts
  if (container) {
    container.setAttribute('tabindex', '-1');
    container.focus();
  }
  setTimeout(() => {
    const liveExitBtn = document.getElementById('btn-sm-exit-to-setup');
    if (document.activeElement === goBtn || document.activeElement === continueBtn || !document.activeElement || document.activeElement === document.body) {
      if (liveExitBtn) {
        liveExitBtn.focus();
      } else if (container) {
        container.setAttribute('tabindex', '-1');
        container.focus();
      }
    }
  }, 50);

  // announce("Live Mixer Active.");
}

async function continueSuperModeLive() {
  if (!smBaseAsset) return;
  const liveView = document.getElementById('sm-live-view');
  if (liveView && (!liveView.hidden || liveView.style.display !== 'none')) return;
  if (smIsSessionLoading) {
      announce("Please wait, the session audio is currently loading...", true);
      return;
  }

  const goBtn = document.getElementById('btn-sm-go');
  const continueBtn = document.getElementById('btn-sm-continue');
  const container = document.querySelector('.sm-container');
  const overlay = document.getElementById('super-mode-overlay');

  if (container) container.classList.add('sm-live-active');
  if (overlay) overlay.classList.add('sm-live-active');

  smIsSessionLoading = true;
  const originalContinueText = continueBtn ? continueBtn.textContent : 'Continue Recording';

  const allAssetObjects = [smBaseAsset, ...smOverlays.map(o => getAsset(o.assetId))].filter(Boolean);
  const totalBytes = allAssetObjects.reduce((acc, a) => acc + getAssetByteSize(a), 0) || 1;

  if (continueBtn && totalBytes > 30 * 1024 * 1024) {
      continueBtn.textContent = 'Loading... Please wait';
  }

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
    smIsSessionLoading = false;
    if (loadingAnnounceTimer) clearInterval(loadingAnnounceTimer);
    if (container) container.classList.remove('sm-live-active');
    if (overlay) overlay.classList.remove('sm-live-active');
    console.error(err);
    alert("Error pre-decoding audio files: " + err.message);
    if (continueBtn) {
        continueBtn.textContent = originalContinueText;
        continueBtn.disabled = false;
        continueBtn.style.display = 'inline-block';
        continueBtn.removeAttribute('tabindex');
        continueBtn.removeAttribute('aria-hidden');
        continueBtn.focus();
    }
    return;
  }

  smIsSessionLoading = false;
  if (loadingAnnounceTimer) clearInterval(loadingAnnounceTimer);

  if (continueBtn) {
      continueBtn.textContent = originalContinueText;
  }
  if (goBtn) {
      goBtn.disabled = true;
      goBtn.style.display = 'none';
      goBtn.setAttribute('tabindex', '-1');
      goBtn.setAttribute('aria-hidden', 'true');
  }
  if (continueBtn) {
      continueBtn.disabled = true;
      continueBtn.style.display = 'none';
      continueBtn.setAttribute('tabindex', '-1');
      continueBtn.setAttribute('aria-hidden', 'true');
  }

  const setupView = document.getElementById('sm-setup-view');
  if (setupView) {
      setupView.hidden = true;
      setupView.style.display = 'none';
      setupView.setAttribute('aria-hidden', 'true');
      setupView.setAttribute('inert', '');
  }
  if (liveView) {
      liveView.hidden = false;
      liveView.style.display = 'block';
      liveView.removeAttribute('aria-hidden');
      liveView.removeAttribute('inert');
      liveView.setAttribute('tabindex', '-1');
      liveView.focus();
  }

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
  
  // Initialize Effects Buses
  const ctx = getAudioCtx();
  smBaseBusNode = ctx.createGain();
  smBaseBusNode.gain.value = 1.0;
  smBaseBusNode.connect(masterCompressor);

  smOverlayBusNode = ctx.createGain();
  smOverlayBusNode.gain.value = 1.0;
  smOverlayBusNode.connect(masterCompressor);
  
  // Re-create active effects chains if there were any running when we paused
  rebuildEffectRouting();

  // Re-create base audio player
  const baseBuf = decodedAudioBuffers[smBaseAsset.id];
  smBaseAudio = new WebAudioPlayer(baseBuf);
  smBaseAudio.outputNode = smBaseBusNode; // Route base through bus
  smBaseAudio.endedTriggered = false;
  smBaseAudio.volume = (smBaseAsset && smBaseAsset.volume !== undefined) ? smBaseAsset.volume : 1.0;
  
  smBaseAudio.currentTime = smLastBaseTime; // Resume from where we left off!

  document.getElementById('sm-total-duration').textContent = smBaseAudio.duration.toFixed(3);
  
  updatePlaybackStateUI('paused');
  
  if (!smTimelineTimer) {
     smTimelineTimer = setInterval(updateSmTimeline, 20);
  }

  if (container) {
    container.setAttribute('tabindex', '-1');
    container.focus();
  }
  setTimeout(() => {
    const liveExitBtn = document.getElementById('btn-sm-exit-to-setup');
    if (document.activeElement === goBtn || document.activeElement === continueBtn || !document.activeElement || document.activeElement === document.body) {
      if (liveExitBtn) {
        liveExitBtn.focus();
      } else if (container) {
        container.setAttribute('tabindex', '-1');
        container.focus();
      }
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
 const activeSeg = smBaseSegments.find(seg =>smVirtualTime >= seg.timelineStart - 0.005 && smVirtualTime< seg.timelineStart + seg.duration);
 
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
 const hasActiveRecording = Object.keys(activeOverlayAudios).some(id => activeOverlayAudios[id].state === 'playing');

 if (endBehavior === 'continue') {
     smSoftPaused = true;
     smSoftPauseStartVirtual = smVirtualTime;
     smSoftPauseStartWall = now;
 } else if (endBehavior === 'stop_last_overlay') {
     if (hasActiveRecording) {
         smSoftPaused = true;
         smSoftPauseStartVirtual = smVirtualTime;
         smSoftPauseStartWall = now;
     } else {
         smRegularPauseBase();
     }
 } else {
     smRegularPauseBase();
 }
 }

 if (smBaseAudio && smBaseAudio.endedTriggered && smSoftPaused && !smUserOverrideEndStop) {
   const endBehavior = document.getElementById('sm-base-end-behavior').value;
   if (endBehavior === 'stop_last_overlay') {
     const hasActiveRecording = Object.keys(activeOverlayAudios).some(id => activeOverlayAudios[id].state === 'playing');
     if (!hasActiveRecording) {
       smRegularPauseBase();
     }
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

 // Always trigger overlays and effects that should be playing now
 triggerReviewPlaybacksAtCurrentTime();
 triggerReviewEffectsAtCurrentTime();
}

function triggerReviewEffectsAtCurrentTime() {
  if (!smTimelineTimer) return;
  const overlapBehavior = document.getElementById('sm-effect-overlap-behavior')?.value || 'auto_stop';
  let stateChanged = false;

  smRecordedEffects.forEach(eff => {
    const effEnd = eff.timelineEnd !== null ? eff.timelineEnd : Infinity;
    const isActiveNow = smVirtualTime >= eff.timelineStart && smVirtualTime <= effEnd;
    const existingKey = `review-${eff.id}`;
    
    // Prevent review playback if the user is currently recording a live effect:
    // In auto_stop mode: if ANY live effect of same effectType is active, suppress review.
    // In allow mode: if live effect of same effectId is active, suppress review.
    const isLiveActive = Object.values(activeSmEffects).some(a => {
      if (a.isReview || a.state !== 'active') return false;
      if (overlapBehavior === 'auto_stop') {
        return a.effectType === eff.effectType;
      }
      return a.effectId === eff.effectId;
    });

    if (isLiveActive) {
      if (activeSmEffects[existingKey]) {
        const active = activeSmEffects[existingKey];
        if (active.baseNodes) disposeEffectNodes(active.baseNodes);
        if (active.overlayNodes) disposeEffectNodes(active.overlayNodes);
        delete activeSmEffects[existingKey];
        rebuildEffectRouting();
        stateChanged = true;
      }
      return;
    }

    // In auto_stop mode: prevent two REVIEW effects of the SAME TYPE from playing simultaneously
    if (isActiveNow && overlapBehavior === 'auto_stop') {
      const otherActiveSameTypeReview = Object.keys(activeSmEffects).find(k => 
        activeSmEffects[k].isReview && 
        activeSmEffects[k].effectType === eff.effectType &&
        k !== existingKey
      );
      if (otherActiveSameTypeReview) {
        return; // Don't stack reviews of the same type
      }
    }
    
    if (isActiveNow && !activeSmEffects[existingKey]) {
      const ctx = getAudioCtx();
      const entry = {
        effectId: eff.effectId,
        effectType: eff.effectType,
        target: eff.target,
        params: eff.params,
        state: 'active',
        baseNodes: null,
        overlayNodes: null,
        isReview: true
      };
      
      if (eff.target === 'base_only' || eff.target === 'all') entry.baseNodes = createEffectNodes(ctx, eff.effectType, eff.params);
      if (eff.target === 'overlays_only' || eff.target === 'all') entry.overlayNodes = createEffectNodes(ctx, eff.effectType, eff.params);
      
      activeSmEffects[existingKey] = entry;
      rebuildEffectRouting();
      stateChanged = true;
    } else if (!isActiveNow && activeSmEffects[existingKey]) {
      const active = activeSmEffects[existingKey];
      if (active.baseNodes) disposeEffectNodes(active.baseNodes);
      if (active.overlayNodes) disposeEffectNodes(active.overlayNodes);
      delete activeSmEffects[existingKey];
      rebuildEffectRouting();
      stateChanged = true;
    }
  });

  if (stateChanged) {
    renderSmActiveKeysList();
  }
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
  if (smSoftPaused) {
      const gapDuration = smVirtualTime - smSoftPauseStartVirtual;
      if (gapDuration > 0.001) {
          smRecordedClips.forEach(c =>{
              if (!c.isGapClip && c.timelineStart > smSoftPauseStartVirtual + 0.001) {
                  c.timelineStart += gapDuration;
              }
          });
          smBaseSegments.forEach(seg =>{
              if (seg.timelineStart >= smSoftPauseStartVirtual - 0.001) {
                  if (Math.abs(seg.timelineStart - smSoftPauseStartVirtual) < 0.001) {
                      seg.timelineStart = smVirtualTime;
                  } else {
                      seg.timelineStart += gapDuration;
                  }
              }
          });
          
          let maxEnd = smVirtualTime;
          smBaseSegments.forEach(s => maxEnd = Math.max(maxEnd, s.timelineStart + s.duration));
          smRecordedClips.forEach(c => {
              const buf = decodedAudioBuffers[c.assetId];
              if (buf) {
                  const cs = c.cropStart || 0;
                  const ce = c.cropEnd != null ? Math.min(c.cropEnd, buf.duration) : buf.duration;
                  maxEnd = Math.max(maxEnd, c.timelineStart + (ce - cs));
              }
          });
          // Shift smRecordedEffects across the gap so effects stay in sync with audio
          const newSplitEffects = [];
          smRecordedEffects.forEach(eff => {
              if (eff.timelineStart > smSoftPauseStartVirtual + 0.001) {
                  eff.timelineStart += gapDuration;
                  if (eff.timelineEnd !== null) eff.timelineEnd += gapDuration;
              } else if (eff.timelineStart <= smSoftPauseStartVirtual && eff.timelineEnd !== null && eff.timelineEnd > smSoftPauseStartVirtual) {
                  const oldEnd = eff.timelineEnd;
                  eff.timelineEnd = smSoftPauseStartVirtual;
                  newSplitEffects.push({
                      ...eff,
                      id: `smfx-${++smRecordedEffectIdCounter}`,
                      timelineStart: smVirtualTime,
                      timelineEnd: oldEnd + gapDuration
                  });
              }
          });
          smRecordedEffects.push(...newSplitEffects);

          smTotalRecordedDuration = maxEnd;
      }
      // Clear playedClipIds for clips now in the future so they
      // can be triggered at their new shifted positions
      smRecordedClips.forEach(c =>{
          if (c.timelineStart >= smVirtualTime - 0.01) {
              playedClipIds.delete(c.id);
          }
      });
  } else {
      punchInTimeline();
  }
  smSoftPaused = false;
 
   if (smBaseAudio.ended || smBaseAudio.currentTime >= (smBaseAudio.duration || 0) - 0.05) {
   smBaseAudio.endedTriggered = true;
   smUserOverrideEndStop = true;
   smSoftPaused = true;
  smSoftPauseStartVirtual = smVirtualTime;
  smSoftPauseStartWall = getAudioCtx().currentTime;
  updatePlaybackStateUI('soft-paused');
 if (!smTimelineTimer) {
     smLastUpdateTime = getAudioCtx().currentTime;
     smTimelineTimer = setInterval(updateSmTimeline, 20);
 }
  } else {
    // Check if there's an existing segment at the current position.
    // If so, enter REPLAY mode (not recording) to avoid duplicating segments.
    const existingSeg = smBaseSegments.find(seg =>
        smVirtualTime >= seg.timelineStart - 0.01 &&
        smVirtualTime < seg.timelineStart + seg.duration
    );
    if (existingSeg) {
      // Replay mode: let updateSmTimeline handle segment-based playback
      smBaseSegmentStartTimeline = null;
      smBaseSegmentStartSource = null;
      const targetTime = existingSeg.sourceStart + (smVirtualTime - existingSeg.timelineStart);
      if (Math.abs(smBaseAudio.currentTime - targetTime) > 0.05) {
        smBaseAudio.currentTime = targetTime;
      }
      if (smBaseAudio.currentTime < smBaseAudio.duration) {
        smBaseAudio.play().catch(e =>console.error(e));
      }
    } else {
      // Recording mode: past all recorded segments or in a gap
      smBaseSegmentStartTimeline = smVirtualTime;
      smBaseSegmentStartSource   = smBaseAudio.currentTime;
      smBaseAudio.play().catch(e =>console.error(e));
    }
    updatePlaybackStateUI('playing');
  }
 } else {
  // Normal resume (Space) - Just resume the clock and UI state
  if (smBaseAudio && (smBaseAudio.ended || smBaseAudio.endedTriggered || smBaseAudio.currentTime >= (smBaseAudio.duration || 0) - 0.05)) {
  smUserOverrideEndStop = true;
  smSoftPaused = true;
  smWasSoftPaused = false;
  smSoftPauseStartVirtual = smVirtualTime;
  smSoftPauseStartWall = getAudioCtx().currentTime;
  updatePlaybackStateUI('soft-paused');
  } else if (smWasSoftPaused) {
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
 const activeSeg = smBaseSegments.find(seg =>smVirtualTime >= seg.timelineStart - 0.005 && smVirtualTime< seg.timelineStart + seg.duration);
 if (smVirtualTime >= smTotalRecordedDuration || activeSeg) {
 if (activeSeg) {
  const targetTime = activeSeg.sourceStart + (smVirtualTime - activeSeg.timelineStart);
  if (Math.abs(smBaseAudio.currentTime - targetTime) > 0.05) {
   smBaseAudio.currentTime = targetTime;
  }
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

 // Resume any live effects that were preserved across pause
 if (smPendingLiveEffects && smPendingLiveEffects.length > 0) {
  const toResume = [...smPendingLiveEffects];
  smPendingLiveEffects = [];
  toResume.forEach(p => {
   const effectObj = smEffects.find(e => e.id === p.effectId) || p;
   toggleSmEffect(effectObj);
  });
 }

 if (!smTimelineTimer) {
 smTimelineTimer = setInterval(updateSmTimeline, 20);
 }
}

function smRegularPauseBase() {
  if (!smBaseAudio) return;
  smBaseAudio.pause();
  smWasSoftPaused = smSoftPaused;
  smSoftPaused = false;
  smUserOverrideEndStop = false;
 
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
 deactivateAllSmEffects(false, true); // preserve live active effects for seamless resume
 
 updatePlaybackStateUI('paused');
}

function smSoftPauseBase() {
 if (!smBaseAudio) return;
 
 smBaseAudio.pause();
 smSoftPaused = true;
 smWasSoftPaused = false;
 smSoftPauseStartVirtual = smVirtualTime;
 smSoftPauseStartWall = getAudioCtx().currentTime;
 
 let newlyPushedSeg = null;
 // Close current segment
 if (smBaseSegmentStartSource !== null) {
 const duration = smBaseAudio.currentTime - smBaseSegmentStartSource;
 if (duration >0) {
 newlyPushedSeg = { timelineStart: smBaseSegmentStartTimeline, sourceStart: smBaseSegmentStartSource, duration };
 smBaseSegments.push(newlyPushedSeg);
 }
 }
 smBaseSegmentStartTimeline = null;
 smBaseSegmentStartSource = null;

 // Split any existing segment that spans the pause point.
 // Without this, a segment covering e.g. timeline 0-30 would still cover
 // the gap region during replay. We split it into "before" and "after"
 // so the "after" part can be shifted forward when the gap closes.
 const splitPoint = smVirtualTime;
 const newSegs = [];
  smBaseSegments.forEach(seg => {
    if (seg === newlyPushedSeg) {
      newSegs.push(seg);
      return;
    }
    const segEnd = seg.timelineStart + seg.duration;
     if (seg.timelineStart < splitPoint - 0.05 && segEnd > splitPoint + 0.05) {
      const beforeDur = splitPoint - seg.timelineStart;
     const afterDur = segEnd - splitPoint;
     const afterSourceStart = seg.sourceStart + beforeDur;
     newSegs.push({ timelineStart: seg.timelineStart, sourceStart: seg.sourceStart, duration: beforeDur });
     newSegs.push({ timelineStart: splitPoint, sourceStart: afterSourceStart, duration: afterDur });
   } else {
     newSegs.push(seg);
   }
 });
 smBaseSegments = newSegs;

 updatePlaybackStateUI('soft-paused');
 if (!smTimelineTimer) {
 smLastUpdateTime = getAudioCtx().currentTime;
 smTimelineTimer = setInterval(updateSmTimeline, 20);
 }
}

function cleanAndMergeBaseSegments() {
  if (!smBaseSegments || smBaseSegments.length === 0) return;

  smBaseSegments.sort((a, b) => a.timelineStart - b.timelineStart);

  const merged = [];
  for (let seg of smBaseSegments) {
    if (seg.duration <= 0.001) continue;

    if (merged.length === 0) {
      merged.push({ timelineStart: seg.timelineStart, sourceStart: seg.sourceStart, duration: seg.duration });
    } else {
      const prev = merged[merged.length - 1];
      const prevTimelineEnd = prev.timelineStart + prev.duration;
      const prevSourceEnd = prev.sourceStart + prev.duration;

      if (Math.abs(seg.timelineStart - prevTimelineEnd) < 0.05 && Math.abs(seg.sourceStart - prevSourceEnd) < 0.05) {
        prev.duration += seg.duration;
      } else {
        merged.push({ timelineStart: seg.timelineStart, sourceStart: seg.sourceStart, duration: seg.duration });
      }
    }
  }
  smBaseSegments = merged;
}

function handleCancelGap() {
  if (!smBaseAudio) return;
  if (!smTimelineTimer) return;
  if (smBaseAudio.ended || smBaseAudio.endedTriggered || smBaseAudio.currentTime >= (smBaseAudio.duration || 0) - 0.1) {
    return;
  }

  const isManualSoftPause = smSoftPaused;
  const isReplayGap = !smSoftPaused &&
                      smBaseSegmentStartSource === null &&
                      smBaseAudio.paused &&
                      smVirtualTime < smTotalRecordedDuration;

  if (!isManualSoftPause && !isReplayGap) return;

  // ── Determine gap boundaries ─────────────────────────────────────────
  let gapStart, gapEnd;
  if (isManualSoftPause) {
    gapStart = smSoftPauseStartVirtual;
    gapEnd   = smVirtualTime;
  } else {
    gapStart = 0;
    gapEnd   = smTotalRecordedDuration;
    for (const seg of smBaseSegments) {
      const segEnd = seg.timelineStart + seg.duration;
      if (segEnd <= smVirtualTime) gapStart = Math.max(gapStart, segEnd);
      if (seg.timelineStart > smVirtualTime) gapEnd = Math.min(gapEnd, seg.timelineStart);
    }
  }

  // ── Identify ALL overlays in the gap ─────────────────────────────────
  const clipIdsToDelete = new Set();

  // Check smRecordedClips
  smRecordedClips.forEach(c => {
    if (c.timelineStart < gapStart - 0.001 || c.timelineStart >= gapEnd + 0.001) return;
    if (isManualSoftPause && !c.isGapClip) return;
    clipIdsToDelete.add(c.id);
  });

  // Check activeOverlayAudios (currently playing/recording)
  Object.keys(activeOverlayAudios).forEach(id => {
    const a = activeOverlayAudios[id];
    if (!a.clipEntry) return;
    // For gap detection, check the clip's isGapClip flag directly
    if (isManualSoftPause) {
      if (a.clipEntry.isGapClip) {
        clipIdsToDelete.add(a.clipEntry.id);
      }
    } else {
      if (a.startTimeInBase !== null &&
          a.startTimeInBase >= gapStart - 0.001 &&
          a.startTimeInBase < gapEnd + 0.001) {
        clipIdsToDelete.add(a.clipEntry.id);
      }
    }
  });

  const hasOverlaysInGap = clipIdsToDelete.size > 0;

  // ── Apply setting ────────────────────────────────────────────────────
  const settingEl = document.getElementById('sm-cancel-gap-behavior');
  const setting = settingEl ? settingEl.value : 'always';

  if (setting === 'empty_only' && hasOverlaysInGap) {
    announce('Gap not cancelled: overlays exist in the silent period.', true);
    return;
  }

  // ── Delete all identified overlays ───────────────────────────────────
  if (hasOverlaysInGap) {
    clipIdsToDelete.forEach(clipId => {
      const active = activeOverlayAudios[clipId];
      if (active) {
        try { active.sourceNode.stop(); } catch(_) {}
        delete activeOverlayAudios[clipId];
      }
    });

    for (let i = smRecordedClips.length - 1; i >= 0; i--) {
      if (clipIdsToDelete.has(smRecordedClips[i].id)) {
        smRecordedClips.splice(i, 1);
      }
    }

    clipIdsToDelete.forEach(id => playedClipIds.delete(id));

    reviewOverlayPlaybacks.forEach(p => {
      if (clipIdsToDelete.has(p.clip.id)) {
        try { p.sourceNode.stop(); } catch(_) {}
        if (p.timerId) clearTimeout(p.timerId);
      }
    });
    reviewOverlayPlaybacks = reviewOverlayPlaybacks.filter(p => !clipIdsToDelete.has(p.clip.id));
  }

  // ── Shift/recalculate timeline ───────────────────────────────────────
  const gapDuration = gapEnd - gapStart;

  // Remove any effects that were recorded inside the canceled gap
  for (let i = smRecordedEffects.length - 1; i >= 0; i--) {
    const e = smRecordedEffects[i];
    if (e.timelineStart >= gapStart - 0.001 && e.timelineStart < gapEnd + 0.001) {
      smRecordedEffects.splice(i, 1);
    }
  }

  if (isManualSoftPause) {
    // Manual soft pause: segments haven't been shifted yet.
    // Merge the split segments back together (undo the split from smSoftPauseBase).
    cleanAndMergeBaseSegments();
    // Recalculate total duration from actual data
    let maxEnd = 0;
    smBaseSegments.forEach(s => maxEnd = Math.max(maxEnd, s.timelineStart + s.duration));
    smRecordedClips.forEach(c => maxEnd = Math.max(maxEnd, c.timelineStart));
    smRecordedEffects.forEach(e => maxEnd = Math.max(maxEnd, e.timelineEnd || e.timelineStart));
    smTotalRecordedDuration = Math.max(maxEnd, gapStart);
  } else {
    // Replay gap: future segments WERE shifted forward, shift them back
    smBaseSegments.forEach(seg => {
      if (seg.timelineStart >= gapEnd) seg.timelineStart -= gapDuration;
    });
    smRecordedClips.forEach(c => {
      if (c.timelineStart >= gapEnd) c.timelineStart -= gapDuration;
    });
    smRecordedEffects.forEach(e => {
      if (e.timelineStart >= gapEnd) {
        e.timelineStart -= gapDuration;
        if (e.timelineEnd !== null) e.timelineEnd -= gapDuration;
      }
    });
    smTotalRecordedDuration = Math.max(0, smTotalRecordedDuration - gapDuration);
    cleanAndMergeBaseSegments();
  }

  // ── Reset state and resume ───────────────────────────────────────────
  smSoftPaused = false;
  smWasSoftPaused = false;
  smVirtualTime = gapStart;
  playedClipIds.clear();
  smLastUpdateTime = getAudioCtx().currentTime;

  // Resume playback from gapStart
  smBaseSegmentStartTimeline = null;
  smBaseSegmentStartSource = null;
  const activeSeg = smBaseSegments.find(seg => gapStart >= seg.timelineStart && gapStart < seg.timelineStart + seg.duration);
  if (activeSeg) {
    smBaseAudio.currentTime = activeSeg.sourceStart + (gapStart - activeSeg.timelineStart);
    smBaseAudio.play().then(() => {
      updatePlaybackStateUI('playing');
    }).catch(err => console.error(err));
  } else {
    smBaseSegmentStartTimeline = gapStart;
    smBaseSegmentStartSource = smBaseAudio.currentTime;
    smBaseAudio.play().then(() => {
      updatePlaybackStateUI('playing');
    }).catch(err => console.error(err));
  }

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

 // Deactivate all live effects cleanly at current virtual time before rewinding to 0
 deactivateAllSmEffects(true, false, false);

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
  const baseDuration = smBaseAudio.duration || 0;

  // ── Determine the true ceiling for seeking ──────────────────────────
  // For BACKWARD: use getSmTotalVirtualDuration() (timeline extent).
  // For FORWARD:  use baseDuration so we can skip ahead in the source
  //               audio even when we haven't "recorded" that far yet.
  const maxDur = (seconds > 0)
    ? Math.max(baseDuration, getSmTotalVirtualDuration())
    : getSmTotalVirtualDuration();

  // Prevent seeking past boundaries
  if (seconds > 0 && smBaseAudio.currentTime >= baseDuration - 0.05) return;
  if (seconds < 0 && smVirtualTime <= 0) return;

  smUserOverrideEndStop = false;
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

  // Disconnect effect audio nodes so they don't linger across time jump, but do NOT cap ongoing live effect recordings
  deactivateAllSmEffects(true, false, false);

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

  // ── Compute new virtual time ─────────────────────────────────────────
  let newVirtualTime = oldVirtualTime + seconds;
  if (newVirtualTime < 0) newVirtualTime = 0;
  if (maxDur > 0 && newVirtualTime > maxDur) newVirtualTime = maxDur;

  const actualSeekAmount = newVirtualTime - oldVirtualTime;
  if (actualSeekAmount === 0) return;

  // 5. Update timeline position
  smVirtualTime = newVirtualTime;

  // 6. Map newVirtualTime to smBaseSegments correctly
  const activeSeg = smBaseSegments.find(seg => 
    newVirtualTime >= seg.timelineStart - 0.005 && newVirtualTime < seg.timelineStart + seg.duration
  );

  // ── Determine whether we are seeking forward past all recorded content ──
  const isFwdPastRecorded = (seconds > 0) && (newVirtualTime >= (smTotalRecordedDuration || 0) - 0.01) && !activeSeg;

  if (activeSeg) {
    // Landed inside a recorded base audio segment
    const offsetInSegment = newVirtualTime - activeSeg.timelineStart;
    smBaseAudio.currentTime = activeSeg.sourceStart + offsetInSegment;
    smSoftPaused = false;
    smWasSoftPaused = false;
  } else if (isFwdPastRecorded) {
    // ── Forward seek past the recording frontier ───────────────────────
    // Advance the base audio source by the seek amount so playback
    // continues from the right position (no phantom gap).
    let newSourceTime = smBaseAudio.currentTime + Math.abs(actualSeekAmount);
    if (newSourceTime > baseDuration) newSourceTime = baseDuration;
    smBaseAudio.currentTime = newSourceTime;

    // Create a base segment covering the skipped region so it replays
    // correctly later (the audio was "heard" even though we skipped).
    const skippedSourceStart = newSourceTime - Math.abs(actualSeekAmount);
    if (skippedSourceStart >= 0 && Math.abs(actualSeekAmount) > 0.01) {
      smBaseSegments.push({
        timelineStart: oldVirtualTime,
        sourceStart: Math.max(0, skippedSourceStart),
        duration: newSourceTime - Math.max(0, skippedSourceStart)
      });
    }

    smSoftPaused = false;
    smWasSoftPaused = false;
  } else {
    // Landed in a recorded gap (backward seek into a gap, etc.)
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

  // Expand recorded duration to cover the new position
  if (newVirtualTime > (smTotalRecordedDuration || 0)) {
    smTotalRecordedDuration = newVirtualTime;
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

  // Trigger review/ongoing effects at the new virtual time immediately
  triggerReviewEffectsAtCurrentTime();

  // ── 8. Auto-resume playback after seeking ────────────────────────────
  // Check if base audio has reached the end after seeking
  const baseEnded = smBaseAudio.currentTime >= baseDuration - 0.05;

  if (baseEnded) {
    // Base audio exhausted — stop gracefully
    smBaseAudio.endedTriggered = true;
    smRegularPauseBase();
    return;
  }

  if (!smTimelineTimer) {
    // Timeline was fully paused; resume normally
    smResumeBase(false);
  } else if (isFwdPastRecorded) {
    // Forward seek past frontier: start a new live recording segment
    smBaseSegmentStartTimeline = smVirtualTime;
    smBaseSegmentStartSource = smBaseAudio.currentTime;
    smBaseAudio.play().catch(e => console.error(e));
    updatePlaybackStateUI('playing');
  } else if (smVirtualTime >= (smTotalRecordedDuration || 0) && !smSoftPaused && smBaseAudio.currentTime < baseDuration) {
    // Reached the frontier: instantly resume live recording
    smBaseSegmentStartTimeline = smVirtualTime;
    smBaseSegmentStartSource = smBaseAudio.currentTime;
    smBaseAudio.play().catch(e => console.error(e));
    updatePlaybackStateUI('playing');
  } else if (activeSeg && smBaseAudio.paused && smBaseAudio.currentTime < baseDuration) {
    // Replaying a known segment
    smBaseAudio.play().catch(e => console.error(e));
    updatePlaybackStateUI('playing');
  } else if (!activeSeg) {
    // Navigating through a silent gap during replay
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
 gain.connect(smOverlayBusNode || masterCompressor);

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
  behavior: behavior,
  isGapClip: !!smSoftPaused
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
 const playingInstances = instances.filter(a => a.state === 'playing');
 const targets = playingInstances.length > 0 ? playingInstances : instances;
 targets.forEach(active =>{
 if (active.state === 'playing') {
 if (active.sourceNode) active.sourceNode.onended = null;
 active.state = 'paused';
 active.userPaused = true; // Mark as manually paused by user
 try { active.sourceNode.stop(); } catch(_) {}
 
 const elapsedWall = getAudioCtx().currentTime - active.playStartTime;
 active.pausedAtOffset += elapsedWall;

  if (active.startTimeInBase !== null && (isPlayingBase || smSoftPaused)) {
      const played = elapsedWall;
      active.clipEntry.cropEnd = active.clipEntry.cropStart + played;
      active.startTimeInBase = null;
  }
  renderSmMixLog();
 } else if (active.state === 'paused') {
 active.state = 'playing';
 active.userPaused = false; // Clear manual pause flag on user resume

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
       const played = getAudioCtx().currentTime - active.playStartTime;
       curr.clipEntry.cropEnd = active.buffer ? active.buffer.duration : 0;
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
 active.state = 'paused';
 try { active.sourceNode.stop(); } catch(_) {}
 const elapsed = ctxNow - active.playStartTime;
 active.pausedAtOffset += elapsed;
 if (active.startTimeInBase !== null) {
     active.clipEntry.cropEnd = active.clipEntry.cropStart + elapsed;
     active.startTimeInBase = null;
 }
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
 if (active.userPaused) {
 delete activeOverlayAudios[active.clipEntry.id];
 } else {
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
  curr.clipEntry.cropEnd = active.buffer ? active.buffer.duration : 0;
  }
 delete activeOverlayAudios[active.clipEntry.id];
 renderSmActiveKeysList();
 renderSmMixLog();
 }
 }
 };
 }
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
 const activeClipIds = new Set(Object.values(activeOverlayAudios).map(a => a.clipEntry.id));
 const activeEffectIds = new Set(Object.keys(activeSmEffects).filter(k => activeSmEffects[k].state === 'active' && activeSmEffects[k].recordEntryId).map(k => activeSmEffects[k].recordEntryId));
 
 const allItems = [];
 smRecordedClips.forEach(c => {
  if (!activeClipIds.has(c.id) && !c.isGapClip) allItems.push({ type: 'clip', data: c, time: c.timelineStart });
 });
 smRecordedEffects.forEach(e => {
  if (!activeEffectIds.has(e.id)) allItems.push({ type: 'effect', data: e, time: e.timelineStart });
 });

 let prevItem = null;
 for (let item of allItems) {
  if (item.time <= smVirtualTime) {
   if (!prevItem || item.time > prevItem.time) prevItem = item;
  }
 }

 if (prevItem) {
  deleteTimelineItem(prevItem);
 } else {
  announce("none");
 }
}

function handleDeleteNext() {
 const activeClipIds = new Set(Object.values(activeOverlayAudios).map(a => a.clipEntry.id));
 const activeEffectIds = new Set(Object.keys(activeSmEffects).filter(k => activeSmEffects[k].state === 'active' && activeSmEffects[k].recordEntryId).map(k => activeSmEffects[k].recordEntryId));
 
 const allItems = [];
 smRecordedClips.forEach(c => {
  if (!activeClipIds.has(c.id) && !c.isGapClip) allItems.push({ type: 'clip', data: c, time: c.timelineStart });
 });
 smRecordedEffects.forEach(e => {
  if (!activeEffectIds.has(e.id)) allItems.push({ type: 'effect', data: e, time: e.timelineStart });
 });

 let nextItem = null;
 for (let item of allItems) {
  if (item.time > smVirtualTime) {
   if (!nextItem || item.time < nextItem.time) nextItem = item;
  }
 }

 if (nextItem) {
  deleteTimelineItem(nextItem);
 } else {
  announce("none");
 }
}

function deleteTimelineItem(itemWrapper) {
  if (itemWrapper.type === 'clip') {
    deleteClip(itemWrapper.data);
  } else if (itemWrapper.type === 'effect') {
    deleteEffectRecording(itemWrapper.data);
  }
}

function deleteEffectRecording(effectRec) {
  const overlapBehavior = document.getElementById('sm-effect-overlap-behavior')?.value || 'auto_stop';
  const clearBehavior = document.getElementById('sm-effect-clear-behavior')?.value || 'unified';

  let restoredAny = false;
  if (clearBehavior === 'unified') {
    const connected = getSmConnectedSegments(effectRec, effectRec.effectType, effectRec.effectId, overlapBehavior);
    connected.forEach(c => {
      const idx = smRecordedEffects.indexOf(c);
      if (idx !== -1) smRecordedEffects.splice(idx, 1);
    });
  } else {
    const index = smRecordedEffects.indexOf(effectRec);
    if (index > -1) {
      smRecordedEffects.splice(index, 1);
      restoredAny = restoreEffectOverwrites(effectRec);
    }
  }

  const undoBehavior = document.getElementById('sm-undo-behavior')?.value || 'seek';
  if (undoBehavior === 'seek') {
    const seekAmount = effectRec.timelineStart - smVirtualTime;
    seekSmTimeline(seekAmount); 
  } else {
    deactivateAllSmEffects();
    triggerReviewEffectsAtCurrentTime();
  }

  const effectInfo = SM_EFFECT_TYPES[effectRec.effectType];
  const name = effectInfo ? effectInfo.name : "effect";
  if (restoredAny) {
    announce("Deleted latest " + name + "; restored prior recording.");
  } else {
    announce("Deleted " + name);
  }
  renderSmMixLog();
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

function clearEffectRecordings(effect) {
  const overlapBehavior = document.getElementById('sm-effect-overlap-behavior')?.value || 'auto_stop';
  const clearBehavior = document.getElementById('sm-effect-clear-behavior')?.value || 'unified';
  const typeName = SM_EFFECT_TYPES[effect.effectType] ? SM_EFFECT_TYPES[effect.effectType].name : effect.effectType;
  
  let deletedSomething = false;
  const alertEl = document.getElementById('sm-live-alert');

  // 1. Check if it's currently actively being recorded (live)
  const liveId = Object.keys(activeSmEffects).find(k => 
    !activeSmEffects[k].isReview && 
    activeSmEffects[k].effectId === effect.id && 
    activeSmEffects[k].state === 'active'
  );

  if (liveId) {
    const active = activeSmEffects[liveId];
    if (active.baseNodes) disposeEffectNodes(active.baseNodes);
    if (active.overlayNodes) disposeEffectNodes(active.overlayNodes);
    
    if (active.recordEntryId) {
      const idx = smRecordedEffects.findIndex(r => r.id === active.recordEntryId);
      if (idx !== -1) {
        const rec = smRecordedEffects[idx];
        if (clearBehavior === 'sequential') {
          restoreEffectOverwrites(rec);
        }
        smRecordedEffects.splice(idx, 1);
      }
    }
    
    delete activeSmEffects[liveId];
    rebuildEffectRouting();
    deletedSomething = true;
    announce(`Canceled live effect recording for ${typeName}.`);
    
    if (alertEl) {
      alertEl.textContent = `Removed live effect "${typeName}" (${effect.key.toUpperCase()})`;
      alertEl.style.color = 'var(--success)';
      if (window.smAlertTimeout) clearTimeout(window.smAlertTimeout);
      window.smAlertTimeout = setTimeout(() => { alertEl.textContent = ''; }, 3000);
    }
  } else {
    // 2. Check if it's currently active in review mode or recorded at this time
    const reviewId = Object.keys(activeSmEffects).find(k => 
      activeSmEffects[k].isReview && 
      (activeSmEffects[k].effectId === effect.id || (overlapBehavior === 'auto_stop' && activeSmEffects[k].effectType === effect.effectType))
    );
    if (reviewId) {
      const active = activeSmEffects[reviewId];
      if (active.baseNodes) disposeEffectNodes(active.baseNodes);
      if (active.overlayNodes) disposeEffectNodes(active.overlayNodes);
      delete activeSmEffects[reviewId];
      rebuildEffectRouting();
    }

    // Find which recorded effects match this effect at current virtual time
    let matchingRecs = smRecordedEffects.filter(r => 
      (r.effectId === effect.id || (overlapBehavior === 'auto_stop' && r.effectType === effect.effectType)) &&
      r.timelineStart <= smVirtualTime && 
      (r.timelineEnd === null || r.timelineEnd >= smVirtualTime)
    );

    // If none directly at current virtual time, look across all recordings of this effect
    if (matchingRecs.length === 0) {
      matchingRecs = smRecordedEffects.filter(r => 
        (r.effectId === effect.id || (overlapBehavior === 'auto_stop' && r.effectType === effect.effectType))
      );
    }

    if (matchingRecs.length > 0) {
      if (clearBehavior === 'unified') {
        const allToDelete = new Set();
        matchingRecs.forEach(r => {
          const connected = getSmConnectedSegments(r, effect.effectType, effect.id, overlapBehavior);
          connected.forEach(c => allToDelete.add(c));
        });

        allToDelete.forEach(c => {
          const idx = smRecordedEffects.indexOf(c);
          if (idx !== -1) smRecordedEffects.splice(idx, 1);
        });

        deletedSomething = true;
        announce(`Deleted unified effect for ${typeName}.`);
        if (alertEl) {
          alertEl.textContent = `Deleted playback effect "${typeName}" (${effect.key.toUpperCase()})`;
          alertEl.style.color = 'var(--success)';
          if (window.smAlertTimeout) clearTimeout(window.smAlertTimeout);
          window.smAlertTimeout = setTimeout(() => { alertEl.textContent = ''; }, 3000);
        }
      } else {
        // Sequential mode: delete latest pass first, restore previous pass
        matchingRecs.sort((a, b) => {
          const timeA = a.createdAt || 0;
          const timeB = b.createdAt || 0;
          if (timeB !== timeA) return timeB - timeA;
          const numA = parseInt((a.id || '').replace(/\D/g, ''), 10) || 0;
          const numB = parseInt((b.id || '').replace(/\D/g, ''), 10) || 0;
          return numB - numA;
        });

        const latest = matchingRecs[0];
        const idx = smRecordedEffects.indexOf(latest);
        if (idx !== -1) smRecordedEffects.splice(idx, 1);

        const restored = restoreEffectOverwrites(latest);
        deletedSomething = true;
        if (restored) {
          announce(`Removed latest recording for ${typeName}; restored previous recording.`);
        } else {
          announce(`Deleted playback effect for ${typeName}.`);
        }
        if (alertEl) {
          alertEl.textContent = `Deleted pass for "${typeName}" (${effect.key.toUpperCase()})`;
          alertEl.style.color = 'var(--success)';
          if (window.smAlertTimeout) clearTimeout(window.smAlertTimeout);
          window.smAlertTimeout = setTimeout(() => { alertEl.textContent = ''; }, 3000);
        }
      }

      triggerReviewEffectsAtCurrentTime();
    } else if (reviewId) {
      deletedSomething = true;
      announce(`Stopped playback effect for ${typeName}.`);
    } else {
      announce(`No active playback for ${typeName} to remove.`, true);
    }
  }

  if (deletedSomething) {
    renderSmActiveKeysList();
    renderSmMixLog();
  }
}


function renderSmActiveKeysList() {
 const keysList = document.getElementById('sm-active-keys-list');
 keysList.innerHTML = '';
 
 if (smOverlays.length === 0 && smEffects.length === 0) {
  keysList.innerHTML = '<p class="field-hint">No shortcuts configured.</p>';
  return;
 }

 smOverlays.forEach(o => {
  const div = document.createElement('div');
  div.className = 'sm-key-badge-item';
  
  const instances = Object.values(activeOverlayAudios).filter(a => a.overlayId === o.id);
  let badgeClass = '';
  let statusSpan = '';
  
  if (instances.length > 0) {
   const isAnyPlaying = instances.some(a => a.state === 'playing');
   if (isAnyPlaying) {
    badgeClass = 'kbd-badge-playing';
    statusSpan = `<span class="sm-badge-status-text sm-badge-status-playing">${instances.length > 1 ? instances.length + 'x ' : ''}Playing</span>`;
   } else {
    badgeClass = 'kbd-badge-paused';
    statusSpan = `<span class="sm-badge-status-text sm-badge-status-paused">${instances.length > 1 ? instances.length + 'x ' : ''}Paused</span>`;
   }
  }

  div.innerHTML = `
   <span class="kbd-badge ${badgeClass}">${o.key.toUpperCase()}</span>
   <span class="sm-key-name">${escapeHTML(o.name)}</span>
   ${statusSpan}
  `;
  keysList.appendChild(div);
 });

 smEffects.forEach(ef => {
  const div = document.createElement('div');
  div.className = 'sm-key-badge-item';
  
  const activeInstance = Object.values(activeSmEffects).find(a => a.effectId === ef.id && a.state === 'active');
  const isPending = smPendingLiveEffects && smPendingLiveEffects.some(p => p.effectId === ef.id);
  let badgeClass = '';
  let statusSpan = '';
  
  if (activeInstance) {
   badgeClass = 'kbd-badge-playing';
   statusSpan = `<span class="sm-badge-status-text sm-badge-status-playing" style="color: #64ffda; border-color: #64ffda;">Active</span>`;
  } else if (isPending) {
   badgeClass = 'kbd-badge-paused';
   statusSpan = `<span class="sm-badge-status-text sm-badge-status-paused" style="color: #facc15; border-color: #facc15;">Paused</span>`;
  }

  const typeName = SM_EFFECT_TYPES[ef.effectType] ? SM_EFFECT_TYPES[ef.effectType].name : ef.effectType;
  div.innerHTML = `
   <span class="kbd-badge ${badgeClass}" style="${activeInstance ? 'background-color: rgba(100,255,218,0.1); border-color: #64ffda; color: #64ffda;' : ''}">${ef.key.toUpperCase()}</span>
   <span class="sm-key-name">[FX] ${escapeHTML(typeName)}</span>
   ${statusSpan}
  `;
  keysList.appendChild(div);
 });
}

function renderSmMixLog() {
 const logUl = document.getElementById('sm-mix-log');
 logUl.innerHTML = '';

 const combined = [
  ...smRecordedClips.map(c => ({ type: 'clip', ...c })),
  ...smRecordedEffects.map(e => ({ type: 'effect', ...e }))
 ];

 if (combined.length === 0) {
  logUl.innerHTML = '<li class="empty-log">No clips or effects recorded yet. Press shortcut keys while the base audio is playing.</li>';
  return;
 }

 combined.sort((a, b) => a.timelineStart - b.timelineStart);

 combined.forEach(item => {
  const li = document.createElement('li');
  if (item.type === 'clip') {
   let cropText = '';
   if (item.cropStart > 0 || item.cropEnd !== null) {
    const startSec = item.cropStart.toFixed(3);
    const endSec = item.cropEnd !== null ? item.cropEnd.toFixed(3) + 's' : 'end';
    cropText = ` (crop: ${startSec}s → ${endSec})`;
   }
   li.innerHTML = `<span class="log-time">[${item.timelineStart.toFixed(3)}s]</span>${escapeHTML(item.name)}${cropText}`;
  } else {
   const typeName = SM_EFFECT_TYPES[item.effectType] ? SM_EFFECT_TYPES[item.effectType].name : item.effectType;
   const endText = item.timelineEnd !== null ? ` → ${item.timelineEnd.toFixed(3)}s` : ' → (active)';
   li.innerHTML = `<span class="log-time">[${item.timelineStart.toFixed(3)}s${endText}]</span> <span style="color: #64ffda;">[FX] ${escapeHTML(typeName)}</span> applied to ${item.target}`;
  }
  logUl.appendChild(li);
 });

 const container = logUl.parentElement;
 container.scrollTop = container.scrollHeight;
}

function stopSmAudio() {
 // Silence EVERY player ever created (not just the current one)
 SM_ALL_PLAYERS.forEach(p => {
   try { p.stop(); } catch(_) {}
   try { if (p.gainNode) p.gainNode.disconnect(); } catch(_) {}
 });
 SM_ALL_PLAYERS.clear();
 smBaseAudio = null;

 // Cut the old buses so anything still routed through them goes silent
 try { if (smBaseBusNode) smBaseBusNode.disconnect(); } catch(_) {}
 try { if (smOverlayBusNode) smOverlayBusNode.disconnect(); } catch(_) {}
 if (smTimelineTimer) {
  clearInterval(smTimelineTimer);
  smTimelineTimer = null;
 }
 Object.keys(activeOverlayAudios).forEach(id =>{
  if (activeOverlayAudios[id] && activeOverlayAudios[id].sourceNode) {
   try { activeOverlayAudios[id].sourceNode.stop(); } catch(_) {}
  }
 });
 Object.keys(activeOverlayAudios).forEach(k => delete activeOverlayAudios[k]);
 if (typeof stopReviewPlaybackEntry === 'function' && Array.isArray(reviewOverlayPlaybacks)) {
  reviewOverlayPlaybacks.forEach(p => stopReviewPlaybackEntry(p));
 }
 reviewOverlayPlaybacks = [];
}

function exitToSetupView() {
  const container = document.querySelector('.sm-container');
  if (container) container.classList.remove('sm-live-active');
  const overlay = document.getElementById('super-mode-overlay');
  if (overlay) overlay.classList.remove('sm-live-active');

  // Preserve the exact exit point so they can "Continue" later
  if (smBaseAudio) {
      smLastBaseTime = smBaseAudio.currentTime;
  }

  // Close any active base segments safely
  if (smBaseSegmentStartSource !== null && smBaseAudio) {
      const duration = smBaseAudio.currentTime - smBaseSegmentStartSource;
      if (duration > 0) {
          smBaseSegments.push({ timelineStart: smBaseSegmentStartTimeline, sourceStart: smBaseSegmentStartSource, duration });
      }
      smBaseSegmentStartTimeline = null;
      smBaseSegmentStartSource = null;
  }

  // Cap active overlays but PRESERVE tails so we don't chop them off harshly
  if (typeof capActiveOverlayRecordings === 'function') {
      capActiveOverlayRecordings(true);
  }
  
  // Cap active effect records too (they will be restored upon "Continue")
  deactivateAllSmEffects(true, true);

  stopSmAudio();

  const setupView = document.getElementById('sm-setup-view');
  const liveView = document.getElementById('sm-live-view');

  if (liveView) {
      liveView.hidden = true;
      liveView.style.display = 'none';
      liveView.setAttribute('aria-hidden', 'true');
      liveView.setAttribute('inert', '');
  }

  if (setupView) {
      setupView.hidden = false;
      setupView.style.display = 'block';
      setupView.removeAttribute('aria-hidden');
      setupView.removeAttribute('inert');
  }

  const goBtn = document.getElementById('btn-sm-go');
  const continueBtn = document.getElementById('btn-sm-continue');
  if (goBtn) {
      goBtn.style.display = '';
      goBtn.removeAttribute('tabindex');
      goBtn.removeAttribute('aria-hidden');
  }
  if (continueBtn) {
      continueBtn.removeAttribute('tabindex');
      continueBtn.removeAttribute('aria-hidden');
  }

  // Hide header control buttons
  document.getElementById('btn-sm-export').style.display = 'none';
  document.getElementById('btn-sm-save').style.display = 'none';
  document.getElementById('btn-sm-reset-mix').style.display = 'none';

  updateSmGoButton();

  // Focus setup view or continue button to enable smooth NVDA transition
  if (continueBtn && continueBtn.style.display !== 'none' && !continueBtn.disabled) {
      continueBtn.focus();
  } else if (goBtn && !goBtn.disabled) {
      goBtn.focus();
  } else if (setupView) {
      setupView.focus();
  }
}

function resetAndRecordFromScratch() {
 if (!smBaseAudio) return;

 const confirmReset = confirm("Are you sure you want to clear all recordings and start recording from scratch?");
 if (!confirmReset) return;

 // 1. Clear recorded data
 smRecordedClips.length = 0;
 smRecordedEffects.length = 0;
 smBaseSegments.length = 0;

 deactivateAllSmEffects();

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

  cleanAndMergeBaseSegments();

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

  let totalDuration = smTotalRecordedDuration || 0;
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

  // --- Effects Offline Routing Setup ---
  const offlineBaseBus = offline.createGain();
  offlineBaseBus.gain.value = 1.0;
  const offlineOverlayBus = offline.createGain();
  offlineOverlayBus.gain.value = 1.0;

  let currentOfflineEffects = [];

  function rebuildOfflineRouting() {
   try { offlineBaseBus.disconnect(); } catch(_) {}
   try { offlineOverlayBus.disconnect(); } catch(_) {}
   
   currentOfflineEffects.forEach(eff => {
    if (eff.baseNodes && eff.baseNodes.output) {
     try { eff.baseNodes.output.disconnect(); } catch(_) {}
    }
    if (eff.overlayNodes && eff.overlayNodes.output) {
     try { eff.overlayNodes.output.disconnect(); } catch(_) {}
    }
   });

   const baseEffects = currentOfflineEffects.filter(e => e.target === 'base_only' || e.target === 'all');
   const overlayEffects = currentOfflineEffects.filter(e => e.target === 'overlays_only' || e.target === 'all');
   
   if (baseEffects.length === 0) {
    offlineBaseBus.connect(exportCompressor);
   } else {
    let prev = offlineBaseBus;
    baseEffects.forEach(eff => {
     if (eff.baseNodes) {
      prev.connect(eff.baseNodes.input);
      prev = eff.baseNodes.output;
     }
    });
    prev.connect(exportCompressor);
   }
   
   if (overlayEffects.length === 0) {
    offlineOverlayBus.connect(exportCompressor);
   } else {
    let prev = offlineOverlayBus;
    overlayEffects.forEach(eff => {
     if (eff.overlayNodes) {
      prev.connect(eff.overlayNodes.input);
      prev = eff.overlayNodes.output;
     }
    });
    prev.connect(exportCompressor);
   }
  }

  // Gather effect boundary events
  const effectEvents = [];
  smRecordedEffects.forEach(e => {
   effectEvents.push({ time: e.timelineStart, type: 'start', effect: e });
   if (e.timelineEnd !== null) {
    effectEvents.push({ time: e.timelineEnd, type: 'end', effect: e });
   } else {
    effectEvents.push({ time: totalDuration, type: 'end', effect: e });
   }
  });

  effectEvents.sort((a, b) => a.time - b.time);
  
  const eventsByTime = {};
  effectEvents.forEach(ev => {
   const frame = Math.floor(ev.time * sr);
   const quantizedTime = frame / sr;
   if (!eventsByTime[quantizedTime]) eventsByTime[quantizedTime] = [];
   eventsByTime[quantizedTime].push(ev);
  });

  const overlapBehavior = document.getElementById('sm-effect-overlap-behavior')?.value || 'auto_stop';

  // Init routing at time 0
  if (eventsByTime[0]) {
   eventsByTime[0].forEach(ev => {
    if (ev.type === 'start') {
     if (overlapBehavior === 'auto_stop') {
      for (let i = currentOfflineEffects.length - 1; i >= 0; i--) {
       if (currentOfflineEffects[i].effectType === ev.effect.effectType) {
        const old = currentOfflineEffects[i];
        if (old.baseNodes) disposeEffectNodes(old.baseNodes);
        if (old.overlayNodes) disposeEffectNodes(old.overlayNodes);
        currentOfflineEffects.splice(i, 1);
       }
      }
     }
     const entry = { ...ev.effect, baseNodes: null, overlayNodes: null };
     if (entry.target === 'base_only' || entry.target === 'all') entry.baseNodes = createEffectNodes(offline, entry.effectType, entry.params);
     if (entry.target === 'overlays_only' || entry.target === 'all') entry.overlayNodes = createEffectNodes(offline, entry.effectType, entry.params);
     currentOfflineEffects.push(entry);
    }
   });
   delete eventsByTime[0];
  }
  rebuildOfflineRouting();

  // Schedule suspends for graph changes
  Object.keys(eventsByTime).map(Number).sort((a,b)=>a-b).forEach(time => {
   if (time > 0 && time < totalDuration) {
    offline.suspend(time).then(() => {
     eventsByTime[time].forEach(ev => {
      if (ev.type === 'start') {
       if (overlapBehavior === 'auto_stop') {
        for (let i = currentOfflineEffects.length - 1; i >= 0; i--) {
         if (currentOfflineEffects[i].effectType === ev.effect.effectType) {
          const old = currentOfflineEffects[i];
          if (old.baseNodes) disposeEffectNodes(old.baseNodes);
          if (old.overlayNodes) disposeEffectNodes(old.overlayNodes);
          currentOfflineEffects.splice(i, 1);
         }
        }
       }
       const entry = { ...ev.effect, baseNodes: null, overlayNodes: null };
       if (entry.target === 'base_only' || entry.target === 'all') entry.baseNodes = createEffectNodes(offline, entry.effectType, entry.params);
       if (entry.target === 'overlays_only' || entry.target === 'all') entry.overlayNodes = createEffectNodes(offline, entry.effectType, entry.params);
       currentOfflineEffects.push(entry);
      } else {
       const idx = currentOfflineEffects.findIndex(x => x.id === ev.effect.id);
       if (idx > -1) {
        const active = currentOfflineEffects[idx];
        if (active.baseNodes) disposeEffectNodes(active.baseNodes);
        if (active.overlayNodes) disposeEffectNodes(active.overlayNodes);
        currentOfflineEffects.splice(idx, 1);
       }
      }
     });
     rebuildOfflineRouting();
     offline.resume();
    });
   }
  });
  // --- End Effects Setup ---

  const baseVolume = (smBaseAsset && smBaseAsset.volume !== undefined) ? smBaseAsset.volume : 1.0;

  exportSegments.forEach(seg =>{
  const baseSrc = offline.createBufferSource();
  baseSrc.buffer = baseBuffer;
  const baseGain = offline.createGain();
  baseGain.gain.value = baseVolume;
  baseSrc.connect(baseGain);
  baseGain.connect(offlineBaseBus); // Route to base bus
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
  gain.connect(offlineOverlayBus); // Route to overlay bus

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
    saveBlobToLibrary(wavBlob, 'super_merger_mix', 'audio');
  } else {
    downloadBlob(wavBlob, 'super_merger_mix.wav');
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
// Copyright 2012, Google Inc.
// All rights reserved.
// 
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are
// met:
// 
//     * Redistributions of source code must retain the above copyright
// notice, this list of conditions and the following disclaimer.
//     * Redistributions in binary form must reproduce the above
// copyright notice, this list of conditions and the following disclaimer
// in the documentation and/or other materials provided with the
// distribution.
//     * Neither the name of Google Inc. nor the names of its
// contributors may be used to endorse or promote products derived from
// this software without specific prior written permission.
// 
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
// "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
// LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
// A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
// OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
// SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
// LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
// DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
// THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
// (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
// OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

function createFadeBuffer(context, activeTime, fadeTime) {
    var length1 = activeTime * context.sampleRate;
    var length2 = (activeTime - 2*fadeTime) * context.sampleRate;
    var length = length1 + length2;
    var buffer = context.createBuffer(1, length, context.sampleRate);
    var p = buffer.getChannelData(0);
    
    console.log("createFadeBuffer() length = " + length);
    
    var fadeLength = fadeTime * context.sampleRate;

    var fadeIndex1 = fadeLength;
    var fadeIndex2 = length1 - fadeLength;
    
    // 1st part of cycle
    for (var i = 0; i < length1; ++i) {
        var value;
        
        if (i < fadeIndex1) {
            value = Math.sqrt(i / fadeLength);
        } else if (i >= fadeIndex2) {
            value = Math.sqrt(1 - (i - fadeIndex2) / fadeLength);
        } else {
            value = 1;
        }
        
        p[i] = value;
    }

    // 2nd part
    for (var i = length1; i < length; ++i) {
        p[i] = 0;
    }
    
    
    return buffer;
}

function createDelayTimeBuffer(context, activeTime, fadeTime, shiftUp) {
    var length1 = activeTime * context.sampleRate;
    var length2 = (activeTime - 2*fadeTime) * context.sampleRate;
    var length = length1 + length2;
    var buffer = context.createBuffer(1, length, context.sampleRate);
    var p = buffer.getChannelData(0);

    console.log("createDelayTimeBuffer() length = " + length);
    
    // 1st part of cycle
    for (var i = 0; i < length1; ++i) {
        if (shiftUp)
          // This line does shift-up transpose
          p[i] = (length1-i)/length;
        else
          // This line does shift-down transpose
          p[i] = i / length1;
    }

    // 2nd part
    for (var i = length1; i < length; ++i) {
        p[i] = 0;
    }

    return buffer;
}

var delayTime = 0.030;
var fadeTime = 0.015;
var bufferTime = 0.030;

function Jungle(context) {
    this.context = context;
    // Create nodes for the input and output of this "module".
    var input = context.createGain();
    var output = context.createGain();
    this.input = input;
    this.output = output;
    
    // Delay modulation.
    var mod1 = context.createBufferSource();
    var mod2 = context.createBufferSource();
    var mod3 = context.createBufferSource();
    var mod4 = context.createBufferSource();
    this.shiftDownBuffer = createDelayTimeBuffer(context, bufferTime, fadeTime, false);
    this.shiftUpBuffer = createDelayTimeBuffer(context, bufferTime, fadeTime, true);
    mod1.buffer = this.shiftDownBuffer;
    mod2.buffer = this.shiftDownBuffer;
    mod3.buffer = this.shiftUpBuffer;
    mod4.buffer = this.shiftUpBuffer;
    mod1.loop = true;
    mod2.loop = true;
    mod3.loop = true;
    mod4.loop = true;

    // for switching between oct-up and oct-down
    var mod1Gain = context.createGain();
    var mod2Gain = context.createGain();
    var mod3Gain = context.createGain();
    mod3Gain.gain.value = 0;
    var mod4Gain = context.createGain();
    mod4Gain.gain.value = 0;

    mod1.connect(mod1Gain);
    mod2.connect(mod2Gain);
    mod3.connect(mod3Gain);
    mod4.connect(mod4Gain);

    // Delay amount for changing pitch.
    var modGain1 = context.createGain();
    var modGain2 = context.createGain();

    var delay1 = context.createDelay();
    var delay2 = context.createDelay();
    mod1Gain.connect(modGain1);
    mod2Gain.connect(modGain2);
    mod3Gain.connect(modGain1);
    mod4Gain.connect(modGain2);
    modGain1.connect(delay1.delayTime);
    modGain2.connect(delay2.delayTime);

    // Crossfading.
    var fade1 = context.createBufferSource();
    var fade2 = context.createBufferSource();
    var fadeBuffer = createFadeBuffer(context, bufferTime, fadeTime);
    fade1.buffer = fadeBuffer
    fade2.buffer = fadeBuffer;
    fade1.loop = true;
    fade2.loop = true;

    var mix1 = context.createGain();
    var mix2 = context.createGain();
    mix1.gain.value = 0;
    mix2.gain.value = 0;

    fade1.connect(mix1.gain);    
    fade2.connect(mix2.gain);
        
    // Connect processing graph.
    input.connect(delay1);
    input.connect(delay2);    
    delay1.connect(mix1);
    delay2.connect(mix2);
    mix1.connect(output);
    mix2.connect(output);
    
    // Start
    var t = context.currentTime + 0.050;
    var t2 = t + bufferTime - fadeTime;
    mod1.start(t);
    mod2.start(t2);
    mod3.start(t);
    mod4.start(t2);
    fade1.start(t);
    fade2.start(t2);

    this.mod1 = mod1;
    this.mod2 = mod2;
    this.mod1Gain = mod1Gain;
    this.mod2Gain = mod2Gain;
    this.mod3Gain = mod3Gain;
    this.mod4Gain = mod4Gain;
    this.modGain1 = modGain1;
    this.modGain2 = modGain2;
    this.fade1 = fade1;
    this.fade2 = fade2;
    this.mix1 = mix1;
    this.mix2 = mix2;
    this.delay1 = delay1;
    this.delay2 = delay2;
    this.allNodes = [
        input, output, mod1, mod2, mod3, mod4,
        mod1Gain, mod2Gain, mod3Gain, mod4Gain,
        modGain1, modGain2, delay1, delay2,
        fade1, fade2, mix1, mix2
    ];
    
    this.setDelay(delayTime);
}

Jungle.prototype.setDelay = function(delayTime) {
    this.modGain1.gain.setTargetAtTime(0.5*delayTime, 0, 0.010);
    this.modGain2.gain.setTargetAtTime(0.5*delayTime, 0, 0.010);
}

var previousPitch = -1;

Jungle.prototype.setPitchOffset = function(mult) {
        if (mult>0) { // pitch up
            this.mod1Gain.gain.value = 0;
            this.mod2Gain.gain.value = 0;
            this.mod3Gain.gain.value = 1;
            this.mod4Gain.gain.value = 1;
        } else { // pitch down
            this.mod1Gain.gain.value = 1;
            this.mod2Gain.gain.value = 1;
            this.mod3Gain.gain.value = 0;
            this.mod4Gain.gain.value = 0;
        }
        this.setDelay(delayTime*Math.abs(mult));
    previousPitch = mult;
}
