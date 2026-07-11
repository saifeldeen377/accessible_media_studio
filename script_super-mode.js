// ─────────────────────────────────────────────────────────────
// TOOL 7 — Super Merger (سوبر مود)
// ─────────────────────────────────────────────────────────────

function initSuperMode() {
  const enterBtn = document.getElementById('btn-enter-super-mode');
  const closeBtn = document.getElementById('btn-close-super-mode');
  const baseSelect = document.getElementById('sm-base-select');
  const overlayForm = document.getElementById('form-sm-overlay');
  const goBtn = document.getElementById('btn-sm-go');
  const playPauseBtn = document.getElementById('btn-sm-play-pause');
  const exportBtn = document.getElementById('btn-sm-export');
  const resetMixBtn = document.getElementById('btn-sm-reset-mix');
  const exitToSetupBtn = document.getElementById('btn-sm-exit-to-setup');

  const baseVolInput = document.getElementById('sm-base-volume');
  const baseVolVal = document.getElementById('sm-base-vol-val');
  baseVolInput.addEventListener('input', () => {
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
  overlayVolInput.addEventListener('input', () => {
    overlayVolVal.textContent = overlayVolInput.value;
  });

  enterBtn.addEventListener('click', enterSuperMode);
  closeBtn.addEventListener('click', exitSuperMode);

  baseSelect.addEventListener('change', () => {
    const id = baseSelect.value;
    smBaseAsset = getAsset(id);
    if (smBaseAsset) {
      smBaseAsset.volume = parseFloat(baseVolInput.value) / 100;
    }
    updateSmGoButton();
  });

  overlayForm.addEventListener('submit', e => {
    e.preventDefault();
    const assetId = document.getElementById('sm-overlay-select').value;
    const rawKey = document.getElementById('sm-overlay-key').value.trim().toLowerCase();

    if (!assetId) { alert('Please select an audio file.'); return; }
    if (!rawKey) { alert('Please type a shortcut key.'); return; }

    const exists = smOverlays.find(o => o.key.toLowerCase() === rawKey);
    if (exists) {
      alert(`The key "${rawKey.toUpperCase()}" is already assigned to "${exists.name}". Choose a different key.`);
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

    renderSmShortcutsTable();
    document.getElementById('sm-overlay-select').value = '';
    document.getElementById('sm-overlay-key').value = '';
    overlayVolInput.value = 100;
    overlayVolVal.textContent = '100';
    const behaviorText = behaviorVal === 'overlap' ? 'with overlap behavior' : 'with cutoff behavior';
    announce(`Assigned key "${rawKey.toUpperCase()}" to "${asset.name}" at ${volVal}% volume, ${behaviorText}.`);
  });

  goBtn.addEventListener('click', startSuperModeLive);
  exportBtn.addEventListener('click', exportSuperModeWav);
  resetMixBtn.addEventListener('click', resetAndRecordFromScratch);
  exitToSetupBtn.addEventListener('click', exitToSetupView);

  // Global key listener
  window.addEventListener('keydown', e => {
    if (e.key === 'Escape' && smActive) {
      e.preventDefault();
      exitSuperMode();
      return;
    }

    const tag = e.target.tagName.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

    // m key globally to open
    if (e.key.toLowerCase() === 'm' && !smActive) {
      const stOverlay = document.getElementById('super-trim-overlay');
      if (stOverlay && !stOverlay.hidden && stOverlay.style.display !== 'none') return; // Don't open if Super Trim is open
      e.preventDefault();
      enterSuperMode();
    }
  });

  // Live Mixer keys listener
  window.addEventListener('keydown', e => {
    if (e.repeat) return; // Prevent duplicate triggers when holding keys
    if (!smActive || !smBaseAudio) return;

    const liveView = document.getElementById('sm-live-view');
    if (liveView.hidden) return;

    const tag = e.target.tagName.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

    const pressedKey = e.key.toLowerCase();
    const isShift = e.shiftKey;
    const isAlt = e.altKey;
    const isCtrl = e.ctrlKey;

    // ─── Spacebar ────────────────────────────────────────────────────────────
    if (e.key === ' ' || e.code === 'Space') {
      e.preventDefault();
      
      if (isCtrl) {
        // ── Ctrl+Space: Soft Pause / Punch-In ──────────────────────────────────────
        if (smSoftPaused) {
          const isActuallyEnded = smBaseAudio.ended || smBaseAudio.endedTriggered || (smBaseAudio.currentTime >= smBaseAudio.duration - 0.05);
          if (isActuallyEnded) {
            // We are soft-paused after the base audio ended -> Ctrl+Space should STOP the timeline.
            smRegularPauseBase();
          } else {
            // We are soft paused mid-track -> Punch In to resume base audio
            smResumeBase(true);
          }
        } else if (!smBaseAudio.paused) {
          // Base is playing -> Soft Pause it
          smSoftPauseBase();
        } else {
          // Base is paused (gap playback or ended) -> Punch In (will trigger soft-pause if ended)
          smResumeBase(true);
        }

      } else if (isShift) {
        // ── Shift+Space: Full Play/Pause (Hard) ───────────────────────────────────────
        if (smIsActive()) {
          smRegularPauseBase(); // Hard pause everything
        } else {
          smResumeBase(false); // Normal resume (do not punch in)
        }

      } else {
        // ── bare Space: Restart playback from 0 ──────────────────────────────
        restartSmPlayback();
      }

      return;
    }

    // Timeline navigation: ArrowLeft (seek back) & ArrowRight (seek forward)
    if (e.key === 'ArrowRight' || e.code === 'ArrowRight') {
      e.preventDefault();
      if (isCtrl) {
        handleDeleteNext();
      } else {
        seekSmTimeline(5);
      }
      return;
    }
    if (e.key === 'ArrowLeft' || e.code === 'ArrowLeft') {
      e.preventDefault();
      if (isCtrl) {
        handleDeletePrevious();
      } else {
        seekSmTimeline(-5);
      }
      return;
    }

    // Overlay shortcuts
    const overlay = smOverlays.find(o => o.key.toLowerCase() === pressedKey);
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
}

function enterSuperMode() {
  stopAllLibraryPreviews();
  stopMergeAudio();
  if (trimPreviewSource) { try { trimPreviewSource.stop(); } catch(_) {} trimPreviewSource = null; }

  smActive = true;
  document.getElementById('super-mode-overlay').hidden = false;
  document.getElementById('sm-setup-view').hidden = false;
  document.getElementById('sm-live-view').hidden = true;

  // Hide header control buttons initially
  document.getElementById('btn-sm-export').style.display = 'none';
  document.getElementById('btn-sm-reset-mix').style.display = 'none';

  // Reset setup state
  document.getElementById('sm-base-select').value = '';
  document.getElementById('sm-overlay-select').value = '';
  document.getElementById('sm-overlay-key').value = '';
  
  // Reset volume fields
  document.getElementById('sm-base-volume').value = 100;
  document.getElementById('sm-base-vol-val').textContent = '100';
  document.getElementById('sm-overlay-volume').value = 100;
  document.getElementById('sm-overlay-vol-val').textContent = '100';

  smBaseAsset = null;
  smOverlays.length = 0;
  smRecordedClips.length = 0;

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
  document.getElementById('btn-sm-reset-mix').style.display = 'none';
  stopSmAudio();
  const trigger = document.getElementById('btn-enter-super-mode');
  if (trigger) trigger.focus();
  // announce("Super Merger Closed.");
}

function updateSmGoButton() {
  const goBtn = document.getElementById('btn-sm-go');
  goBtn.disabled = !smBaseAsset;
}

function renderSmShortcutsTable() {
  const tbody = document.getElementById('sm-shortcuts-tbody');
  tbody.querySelectorAll('tr.data-row').forEach(r => r.remove());
  document.getElementById('sm-shortcuts-empty').style.display = smOverlays.length ? 'none' : '';

  smOverlays.forEach(item => {
    const tr = document.createElement('tr');
    tr.className = 'data-row';
    const volPct = Math.round((item.volume !== undefined ? item.volume : 1.0) * 100);
    const behaviorText = (item.behavior === 'cutoff') ? 'Cutoff' : 'Overlap';
    tr.innerHTML = `
      <td>${escapeHTML(item.name)}</td>
      <td><span class="kbd-badge">${item.key.toUpperCase()}</span></td>
      <td>${volPct}%</td>
      <td>${behaviorText}</td>
      <td><button class="btn btn-sm btn-danger" onclick="removeSmOverlay('${item.id}')" aria-label="Remove ${escapeHTML(item.name)}">✕</button></td>
    `;
    tbody.appendChild(tr);
  });
}

window.removeSmOverlay = function(id) {
  const idx = smOverlays.findIndex(o => o.id === id);
  if (idx !== -1) smOverlays.splice(idx, 1);
  renderSmShortcutsTable();
};

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
    this._ended = false;         // true only after natural playback completion
  }

  get duration() {
    return this.buffer ? this.buffer.duration : 0;
  }

  get currentTime() {
    if (!this.isPlaying) return this.pausedOffset;
    const ctx = getAudioCtx();
    const elapsed = ctx.currentTime - this.playStartTime;
    let t = this.pausedOffset + elapsed;
    if (t > this.duration) t = this.duration;
    return t;
  }

  set currentTime(val) {
    this._ended = false; // seeking resets the ended state
    this.pausedOffset = val;
    if (this.pausedOffset < 0) this.pausedOffset = 0;
    if (this.pausedOffset > this.duration) this.pausedOffset = this.duration;

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

    src.onended = () => {
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
    return new Promise((resolve) => {
      if (this.isPlaying) {
        resolve();
        return;
      }
      if (this._ended) {
        // Base finished naturally — do NOT restart it, just resolve.
        // Callers that need to continue the timeline handle this themselves.
        resolve();
        return;
      }
      const ctx = getAudioCtx();
      if (ctx.state === 'suspended') {
        ctx.resume().then(() => {
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

async function startSuperModeLive() {
  if (!smBaseAsset) return;

  if (smRecordedClips.length > 0) {
    const proceed = confirm("Starting a new mixer session will clear all your currently recorded clips. Do you want to proceed?");
    if (!proceed) return;
  }

  // Pre-decode base and overlays
  // announce("Pre-decoding assets for zero-latency mixing... Please wait.", true);
  try {
    await getDecodedBuffer(smBaseAsset.id);
    await Promise.all(smOverlays.map(o => getDecodedBuffer(o.assetId)));
  } catch (err) {
    console.error(err);
    alert("Error pre-decoding audio files: " + err.message);
    return;
  }

  document.getElementById('sm-setup-view').hidden = true;
  document.getElementById('sm-live-view').hidden = false;

  // Show header control buttons when live mixer is active
  document.getElementById('btn-sm-export').style.display = 'inline-block';
  document.getElementById('btn-sm-reset-mix').style.display = 'inline-block';

  renderSmActiveKeysList();

  // Reset stats
  document.getElementById('sm-current-time').textContent = '0.0';
  document.getElementById('sm-total-duration').textContent = '0.0';
  const progressEl = document.getElementById('sm-progress-bar');
  progressEl.style.width = '0%';
  progressEl.parentElement.setAttribute('aria-valuenow', '0');

  smRecordedClips.length = 0;
  renderSmMixLog();

  // Clear active overlays and review playback state
  Object.keys(activeOverlayAudios).forEach(k => delete activeOverlayAudios[k]);
  reviewOverlayPlaybacks = [];

  // Reset virtual timeline and segments
  smVirtualTime = 0;
  smSoftPaused = false;
  smTotalRecordedDuration = 0;
  smBaseSegments = [];
  smBaseSegmentStartTimeline = 0;
  smBaseSegmentStartSource = 0;
  smLastUpdateTime = getAudioCtx().currentTime;

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
    // ── REPLAY MODE ──────────────────────────────────────────────
    const activeSeg = smBaseSegments.find(seg => smVirtualTime >= seg.timelineStart && smVirtualTime < seg.timelineStart + seg.duration);
    
    if (activeSeg) {
      // We are inside a recorded segment -> Base audio should play
      if (smBaseAudio.paused && smBaseAudio.currentTime < smBaseAudio.duration) {
        smBaseAudio.currentTime = activeSeg.sourceStart + (smVirtualTime - activeSeg.timelineStart);
        smBaseAudio.play().catch(e => console.error(e));
      } else {
        // Smoothly advance using hardware clock to avoid blocky HTML5 updates
        smVirtualTime += elapsed;
        // Drift correction ONLY if base audio is actually playing (not stuck at end)
        if (!smBaseAudio.paused && smBaseAudio.currentTime < smBaseAudio.duration) {
          const expected = activeSeg.timelineStart + (smBaseAudio.currentTime - activeSeg.sourceStart);
          if (Math.abs(smVirtualTime - expected) > 0.3) smVirtualTime = expected;
        }
      }
    } else {
      // We are in a recorded GAP -> Base audio should pause
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
        if (endBehavior === 'continue') {
          smSoftPaused = true;
          smSoftPauseStartVirtual = smVirtualTime;
          smSoftPauseStartWall = now;
          updatePlaybackStateUI('soft-paused');
        } else {
          smRegularPauseBase();
          return;
        }
      }
    }

  } else {
    // ── RECORDING MODE ──────────────────────────────────────────
    const baseEnded = smBaseAudio.ended || smBaseAudio.currentTime >= (smBaseAudio.duration || 0) - 0.05;
    const basePlaying = !smBaseAudio.paused && !baseEnded;

    if (basePlaying && smBaseSegmentStartSource !== null) {
      // Smoothly advance using hardware clock to avoid blocky HTML5 updates
      smVirtualTime += elapsed;
      // Drift correction
      const expected = smBaseSegmentStartTimeline + (smBaseAudio.currentTime - smBaseSegmentStartSource);
      if (Math.abs(smVirtualTime - expected) > 0.3) smVirtualTime = expected;
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
        if (segDur > 0) {
          smBaseSegments.push({
            timelineStart: smBaseSegmentStartTimeline,
            sourceStart:   smBaseSegmentStartSource,
            duration:      segDur
          });
        }
        smBaseSegmentStartTimeline = null;
        smBaseSegmentStartSource   = null;
      }

      const endBehavior = document.getElementById('sm-base-end-behavior').value;
      if (endBehavior === 'continue') {
        smSoftPaused = true;
        smSoftPauseStartVirtual = smVirtualTime;
        smSoftPauseStartWall = now;
        updatePlaybackStateUI('soft-paused');
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
  if (displayDur > 0) {
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
  smBaseSegments = smBaseSegments.filter(seg => {
    if (seg.timelineStart >= smVirtualTime) return false;
    if (seg.timelineStart + seg.duration > smVirtualTime) {
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
      smSoftPaused = true;
      smSoftPauseStartVirtual = smVirtualTime;
      smSoftPauseStartWall = getAudioCtx().currentTime;
      updatePlaybackStateUI('soft-paused');
    } else {
      smBaseAudio.play().then(() => {
        smBaseSegmentStartTimeline = smVirtualTime;
        smBaseSegmentStartSource   = smBaseAudio.currentTime;
        updatePlaybackStateUI('playing');
      }).catch(err => console.error(err));
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
      const activeSeg = smBaseSegments.find(seg => smVirtualTime >= seg.timelineStart && smVirtualTime < seg.timelineStart + seg.duration);
      if (smVirtualTime >= smTotalRecordedDuration || activeSeg) {
        if (activeSeg) {
          smBaseAudio.currentTime = activeSeg.sourceStart + (smVirtualTime - activeSeg.timelineStart);
        }
        
        if (smBaseAudio.currentTime < smBaseAudio.duration) smBaseAudio.play().catch(e => console.error(e));
        
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
    if (duration > 0) {
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
    if (duration > 0) {
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
      btn.textContent = '⏸ Pause';
    } else {
      btn.textContent = '▶ Play';
    }
  }
}

function restartSmPlayback() {
  if (!smBaseAudio) return;

  // Cap any current live recordings, but PRESERVE tails so export includes natural reverb!
  capActiveOverlayRecordings(true);

  // Stop ALL live active overlays immediately
  Object.keys(activeOverlayAudios).forEach(id => {
    if (activeOverlayAudios[id] && activeOverlayAudios[id].sourceNode) {
      try { activeOverlayAudios[id].sourceNode.stop(); } catch(_) {}
    }
    delete activeOverlayAudios[id];
  });
  renderSmActiveKeysList();

  // Stop ALL review overlay playbacks immediately
  reviewOverlayPlaybacks.forEach(p => stopReviewPlaybackEntry(p));
  reviewOverlayPlaybacks = [];

  // Reset review tracking so clips re-trigger from 0.0s
  playedClipIds.clear();

  // Close the active base segment if we were recording
  if (smBaseSegmentStartSource !== null) {
    const duration = smBaseAudio.currentTime - smBaseSegmentStartSource;
    if (duration > 0) {
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
  smRecordedClips.forEach(c => {
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
  
  let newVirtualTime = oldVirtualTime + seconds;
  if (newVirtualTime < 0) newVirtualTime = 0;
  if (maxDur > 0 && newVirtualTime > maxDur) newVirtualTime = maxDur;
  
  const actualSeekAmount = newVirtualTime - oldVirtualTime;
  if (actualSeekAmount === 0) return;

  // If we were recording, close the segment BEFORE applying the seek jump
  if (smBaseSegmentStartSource !== null) {
    const segDur = smBaseAudio.currentTime - smBaseSegmentStartSource;
    if (segDur > 0) {
      smBaseSegments.push({ timelineStart: smBaseSegmentStartTimeline, sourceStart: smBaseSegmentStartSource, duration: segDur });
    }
  }

  // Cap any current live recordings (prevent overlapping timeline corruption)
  capActiveOverlayRecordings(true);

  // Stop ALL live active overlays immediately (so they don't keep playing out of sync)
  Object.keys(activeOverlayAudios).forEach(id => {
    if (activeOverlayAudios[id] && activeOverlayAudios[id].sourceNode) {
      try { activeOverlayAudios[id].sourceNode.stop(); } catch(_) {}
    }
    delete activeOverlayAudios[id];
  });
  renderSmActiveKeysList();

  // Stop ALL review overlay playbacks immediately
  reviewOverlayPlaybacks.forEach(p => stopReviewPlaybackEntry(p));
  reviewOverlayPlaybacks = [];

  // Reset review tracking so clips properly re-trigger at the new seeked time
  playedClipIds.clear();

  smVirtualTime = newVirtualTime;

  // Sync Base Audio Time precisely to the new virtual time
  const activeSeg = smBaseSegments.find(seg => smVirtualTime >= seg.timelineStart && smVirtualTime < seg.timelineStart + seg.duration);
  if (activeSeg) {
    smBaseAudio.currentTime = activeSeg.sourceStart + (smVirtualTime - activeSeg.timelineStart);
  } else {
    // We are seeking into a gap. Set base audio to the end of the nearest past segment.
    const pastSegs = smBaseSegments.filter(seg => seg.timelineStart <= smVirtualTime);
    if (pastSegs.length > 0) {
      const lastSeg = pastSegs[pastSegs.length - 1];
      smBaseAudio.currentTime = lastSeg.sourceStart + lastSeg.duration;
    } else {
      smBaseAudio.currentTime = 0;
    }
  }

  // If we were recording, open a new segment immediately after the jump
  if (smBaseSegmentStartSource !== null) {
    smBaseSegmentStartTimeline = smVirtualTime;
    smBaseSegmentStartSource = smBaseAudio.currentTime;
  }

  // CRITICAL FIX: If we were soft-paused (recording a gap), break out of it!
  // Otherwise, the next tick of updateSmTimeline will overwrite our seek with the old wall-clock time!
  if (smSoftPaused) {
    smSoftPaused = false;
    updatePlaybackStateUI('playing');
  }

  smLastUpdateTime = getAudioCtx().currentTime;

  const totalVirtualDur = getSmTotalVirtualDuration();
  document.getElementById('sm-current-time').textContent = smVirtualTime.toFixed(3);
  document.getElementById('sm-total-duration').textContent = totalVirtualDur.toFixed(3);
  if (totalVirtualDur) {
    const pct = (smVirtualTime / totalVirtualDur) * 100;
    const progressEl = document.getElementById('sm-progress-bar');
    progressEl.style.width = `${pct}%`;
    progressEl.parentElement.setAttribute('aria-valuenow', Math.round(pct));
  }

  // Auto-resume playback if it was stopped, so the user instantly hears the review
  if (!smTimelineTimer) {
    smResumeBase(false);
  }
}

function triggerOverlayStart(overlay) {
  const asset = getAsset(overlay.assetId);
  if (!asset) return;

  const buffer = decodedAudioBuffers[overlay.assetId];
  if (!buffer) {
    getDecodedBuffer(overlay.assetId).then(buf => {
      if (buf) triggerOverlayStart(overlay);
    });
    return;
  }

  const active_timeline = smIsActive(); // true when recording or soft-paused
  const overlayVol = (overlay.volume !== undefined) ? overlay.volume : 1.0;
  const behavior = overlay.behavior || 'overlap';

  if (behavior === 'cutoff') {
    const instances = Object.values(activeOverlayAudios).filter(a => a.overlayId === overlay.id);
    instances.forEach(active => {
      try { active.sourceNode.stop(); } catch(_) {}
      if (active.startTimeInBase !== null && active_timeline) {
        // Calculate precise elapsed time for crop
        const exactVirtualTime = smVirtualTime + (getAudioCtx().currentTime - smLastUpdateTime);
        const played = exactVirtualTime - active.startTimeInBase;
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

  const clip = {
    id: `sm-clip-${++smRecordedClipIdCounter}`,
    assetId: overlay.assetId,
    name: asset.name,
    timelineStart: active_timeline ? (smVirtualTime + (getAudioCtx().currentTime - smLastUpdateTime)) : 0,
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

  src.onended = () => {
    const curr = activeOverlayAudios[clip.id];
    if (curr && curr.sourceNode === src) {
      if (curr.state === 'playing') {
        if (curr.startTimeInBase !== null && smIsActive()) {
          const played = smVirtualTime - curr.startTimeInBase;
          curr.clipEntry.cropEnd = curr.clipEntry.cropStart + played;
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
  const instances = Object.values(activeOverlayAudios).filter(a => a.overlayId === overlay.id);
  if (instances.length > 0) {
    handled = true;
    instances.forEach(active => {
      if (active.state === 'playing') {
        try { active.sourceNode.stop(); } catch(_) {}
        active.state = 'paused';
        
        const elapsed = getAudioCtx().currentTime - active.playStartTime;
        active.pausedAtOffset += elapsed;

        if (active.startTimeInBase !== null && (isPlayingBase || smSoftPaused)) {
          const played = smVirtualTime - active.startTimeInBase;
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
          const timelineStart = (isPlayingBase || smSoftPaused) ? smVirtualTime : 0;
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

        src.onended = () => {
          const currId = active.clipEntry.id;
          const curr = activeOverlayAudios[currId];
          if (curr && curr.sourceNode === src) {
            if (curr.state === 'playing') {
              curr.state = 'ended';
              if (curr.startTimeInBase !== null && (isPlayingBase || smSoftPaused)) {
                const played = smVirtualTime - curr.startTimeInBase;
                curr.clipEntry.cropEnd = curr.clipEntry.cropStart + played;
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
  const reviewEntries = reviewOverlayPlaybacks.filter(p => p.clip.assetId === overlay.assetId && !p.paused);
  if (reviewEntries.length > 0) {
    handled = true;
    reviewEntries.forEach(entry => {
      // Stop the audio immediately
      if (entry.sourceNode) {
        entry.sourceNode.onended = null;
        try { entry.sourceNode.stop(); } catch(_) {}
      }
      if (entry.timerId) clearTimeout(entry.timerId);
      entry.paused = true;
      
      // Punch-out: permanently trim the clip's cropEnd to the current timeline position
      const played = smVirtualTime - entry.clip.timelineStart;
      if (played > 0) {
        entry.clip.cropEnd = (entry.clip.cropStart || 0) + played;
      }
    });
    announce(`Paused timeline playback for ${overlay.name}.`, true);
    renderSmMixLog();
  }

  if (handled) renderSmActiveKeysList();
}


function syncRecordActiveOverlays() {
  if (!smIsActive()) return; // only sync while timeline is advancing

  const tb = smVirtualTime;

  Object.keys(activeOverlayAudios).forEach(id => {
    const active = activeOverlayAudios[id];
    if (active.state === 'playing' && active.startTimeInBase === null && !active.doNotSync) {
      const overlay = smOverlays.find(o => o.id == active.overlayId);
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

  Object.values(activeOverlayAudios).forEach(active => {
    if (active.state === 'playing') {
      if (active.sourceNode) active.sourceNode.onended = null;
      try { active.sourceNode.stop(); } catch(_) {}
      active.state = 'paused';
      active.pausedAtOffset += (ctxNow - active.playStartTime);
    }
  });

  reviewOverlayPlaybacks.forEach(entry => {
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

  Object.values(activeOverlayAudios).forEach(active => {
    if (active.state === 'paused') {
      active.state = 'playing';
      const src = ctx.createBufferSource();
      src.buffer = active.buffer;
      src.connect(active.gainNode);
      src.start(0, active.pausedAtOffset);
      active.sourceNode = src;
      active.playStartTime = ctxNow;

      // Ensure cleanup logic remains intact
      src.onended = () => {
        const curr = activeOverlayAudios[active.clipEntry.id];
        if (curr && curr.sourceNode === src) {
          if (curr.state === 'playing') {
            if (curr.startTimeInBase !== null && smIsActive()) {
              const played = smVirtualTime - curr.startTimeInBase;
              curr.clipEntry.cropEnd = curr.clipEntry.cropStart + played;
            }
            delete activeOverlayAudios[active.clipEntry.id];
            renderSmActiveKeysList();
            renderSmMixLog();
          }
        }
      };
    }
  });

  reviewOverlayPlaybacks = reviewOverlayPlaybacks.filter(entry => {
    if (entry.paused) {
      const buffer = decodedAudioBuffers[entry.clip.assetId];
      if (!buffer) return false;
      const cropStart = entry.clip.cropStart || 0;
      const clipDur = (entry.clip.cropEnd !== null && entry.clip.cropEnd !== undefined)
        ? (entry.clip.cropEnd - cropStart)
        : (buffer.duration - cropStart);
      const remainingSec = clipDur - (entry.pausedAtOffset - cropStart);
      
      if (remainingSec > 0 && entry.pausedAtOffset < buffer.duration) {
        const src = ctx.createBufferSource();
        src.buffer = buffer;
        src.connect(entry.gainNode);
        src.start(0, entry.pausedAtOffset, remainingSec);
        entry.sourceNode = src;
        entry.paused = false;

        if (entry.clip.cropEnd !== null && entry.clip.cropEnd !== undefined) {
          entry.timerId = setTimeout(() => {
            try { src.stop(); } catch(_) {}
            reviewOverlayPlaybacks = reviewOverlayPlaybacks.filter(p => p !== entry);
          }, remainingSec * 1000);
        }

        src.onended = () => {
          if (entry.timerId) clearTimeout(entry.timerId);
          reviewOverlayPlaybacks = reviewOverlayPlaybacks.filter(p => p !== entry);
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

  Object.keys(activeOverlayAudios).forEach(id => {
    const active = activeOverlayAudios[id];
    if (active.state === 'playing' && active.startTimeInBase !== null) {
      if (!preserveTail) {
        const played = tb - active.startTimeInBase;
        active.clipEntry.cropEnd = active.clipEntry.cropStart + played;
      }
      active.startTimeInBase = null;
    }
  });

  renderSmMixLog();
}

function getEmptyGaps() {
  const gaps = [];
  for (let i = 0; i < smBaseSegments.length - 1; i++) {
    const s1 = smBaseSegments[i];
    const s2 = smBaseSegments[i+1];
    const s1End = s1.timelineStart + s1.duration;
    if (s2.timelineStart > s1End + 0.01) {
      gaps.push({ start: s1End, end: s2.timelineStart, index: i });
    }
  }
  // Open-ended gap
  if (smBaseSegments.length > 0) {
    const lastSeg = smBaseSegments[smBaseSegments.length - 1];
    const lastSegEnd = lastSeg.timelineStart + lastSeg.duration;
    if (smVirtualTime > lastSegEnd + 0.01) {
      gaps.push({ start: lastSegEnd, end: smVirtualTime, index: smBaseSegments.length - 1 });
    }
  }

  // Filter out gaps that contain overlays
  return gaps.filter(gap => {
    for (let c of smRecordedClips) {
      const cEnd = c.timelineStart + (c.cropEnd !== null ? (c.cropEnd - c.cropStart) : (decodedAudioBuffers[c.assetId]?.duration || 0) - c.cropStart);
      if (c.timelineStart < gap.end && cEnd > gap.start) return false;
    }
    return true;
  });
}

function deleteClip(clip) {
  const index = smRecordedClips.indexOf(clip);
  if (index > -1) {
    smRecordedClips.splice(index, 1);
    
    // Completely kill any ongoing playback for this clip
    const matchingPlaybacks = reviewOverlayPlaybacks.filter(p => p.clip.id === clip.id);
    matchingPlaybacks.forEach(p => stopReviewPlaybackEntry(p));
    reviewOverlayPlaybacks = reviewOverlayPlaybacks.filter(p => p.clip.id !== clip.id);
    
    playedClipIds.delete(clip.id);
    
    const undoBehavior = document.getElementById('sm-undo-behavior')?.value || 'seek';
    if (undoBehavior === 'seek') {
      const seekAmount = clip.timelineStart - smVirtualTime;
      seekSmTimeline(seekAmount); 
    }
    const asset = getAsset(clip.assetId);
    const name = asset ? asset.name : "overlay";
    announce("Deleted " + name);
    renderSmMixLog();
  }
}

function handleDeletePrevious() {
  const activeClipIds = new Set(Object.values(activeOverlayAudios).map(a => a.clipEntry.id));
  
  let prevClip = null;
  for (let c of smRecordedClips) {
    if (activeClipIds.has(c.id)) continue;
    if (c.timelineStart <= smVirtualTime) {
      if (!prevClip || c.timelineStart > prevClip.timelineStart) prevClip = c;
    }
  }

  if (prevClip) {
    deleteClip(prevClip);
  } else {
    announce("none");
  }
}

function handleDeleteNext() {
  const activeClipIds = new Set(Object.values(activeOverlayAudios).map(a => a.clipEntry.id));
  
  let nextClip = null;
  for (let c of smRecordedClips) {
    if (activeClipIds.has(c.id)) continue;
    if (c.timelineStart > smVirtualTime) {
      if (!nextClip || c.timelineStart < nextClip.timelineStart) {
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
  const instances = Object.values(activeOverlayAudios).filter(a => a.overlayId === overlay.id);
  const alertEl = document.getElementById('sm-live-alert');

  if (instances.length > 0) {
    // Cancel active recordings
    instances.forEach(active => {
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
      alertEl.textContent = `Removed active clip(s) for "${overlay.name}" (${overlay.key.toUpperCase()})`;
      alertEl.style.color = 'var(--success)';
      if (window.smAlertTimeout) clearTimeout(window.smAlertTimeout);
      window.smAlertTimeout = setTimeout(() => { alertEl.textContent = ''; }, 3000);
    }
    announce(`Removed active clip for ${overlay.name}.`, true);
  } else {
    // Look in reviewOverlayPlaybacks to delete previously recorded clips that are currently playing back
    const matchingEntries = reviewOverlayPlaybacks.filter(p => p.clip.assetId === overlay.assetId);
    if (matchingEntries.length > 0) {
      matchingEntries.forEach(revEntry => {
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
        alertEl.textContent = `Deleted playback clip(s) for "${overlay.name}" (${overlay.key.toUpperCase()})`;
        alertEl.style.color = 'var(--success)';
        if (window.smAlertTimeout) clearTimeout(window.smAlertTimeout);
        window.smAlertTimeout = setTimeout(() => { alertEl.textContent = ''; }, 3000);
      }
      announce(`Deleted playback clip for ${overlay.name}.`, true);
    } else {
      if (alertEl) {
        alertEl.textContent = `No active recording or playback for "${overlay.name}" to remove.`;
        alertEl.style.color = '#f87171';
        if (window.smAlertTimeout) clearTimeout(window.smAlertTimeout);
        window.smAlertTimeout = setTimeout(() => { alertEl.textContent = ''; }, 3000);
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
}

function renderSmMixLog() {
  const logUl = document.getElementById('sm-mix-log');
  logUl.innerHTML = '';

  if (smRecordedClips.length === 0) {
    logUl.innerHTML = '<li class="empty-log">No clips recorded yet. Press shortcut keys while the base audio is playing.</li>';
    return;
  }

  const sorted = [...smRecordedClips].sort((a, b) => a.timelineStart - b.timelineStart);
  sorted.forEach(c => {
    const li = document.createElement('li');
    let cropText = '';
    if (c.cropStart > 0 || c.cropEnd !== null) {
      const startSec = c.cropStart.toFixed(3);
      const endSec = c.cropEnd !== null ? c.cropEnd.toFixed(3) + 's' : 'end';
      cropText = ` (crop: ${startSec}s → ${endSec})`;
    }
    li.innerHTML = `<span class="log-time">[${c.timelineStart.toFixed(3)}s]</span> ${escapeHTML(c.name)}${cropText}`;
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
  Object.keys(activeOverlayAudios).forEach(id => {
    if (activeOverlayAudios[id] && activeOverlayAudios[id].sourceNode) {
      try { activeOverlayAudios[id].sourceNode.stop(); } catch(_) {}
    }
  });
  Object.keys(activeOverlayAudios).forEach(k => delete activeOverlayAudios[k]);
}

function exitToSetupView() {
  stopSmAudio();
  document.getElementById('sm-setup-view').hidden = false;
  document.getElementById('sm-live-view').hidden = true;

  // Hide header control buttons
  document.getElementById('btn-sm-export').style.display = 'none';
  document.getElementById('btn-sm-reset-mix').style.display = 'none';

  // Focus setup view to enable smooth NVDA transition
  const setupView = document.getElementById('sm-setup-view');
  if (setupView) {
    setupView.focus();
  }
}

function resetAndRecordFromScratch() {
  if (!smBaseAudio) return;

  const confirmReset = confirm("Are you sure you want to clear all recordings and start recording from scratch?");
  if (!confirmReset) return;

  // 1. Clear recorded data
  smRecordedClips.length = 0;
  smBaseSegments.length = 0;

  // 2. Stop any active physical audios
  Object.keys(activeOverlayAudios).forEach(id => {
    if (activeOverlayAudios[id] && activeOverlayAudios[id].sourceNode) {
      try { activeOverlayAudios[id].sourceNode.stop(); } catch(_) {}
    }
    delete activeOverlayAudios[id];
  });

  reviewOverlayPlaybacks.forEach(p => stopReviewPlaybackEntry(p));
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

async function exportSuperModeWav() {
  if (!smBaseAsset) return;
  // announce('Exporting merged WAV, please wait…');

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
  const uniqueIds = [...new Set(smRecordedClips.map(c => c.assetId))];
  const overlayBuffers = {};

  try {
    await Promise.all(uniqueIds.map(async id => {
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
  // Compile base segments list for rendering
  const exportSegments = [...smBaseSegments];
  if (smBaseAudio && !smBaseAudio.paused && smBaseSegmentStartSource !== null) {
    const activeDur = smBaseAudio.currentTime - smBaseSegmentStartSource;
    if (activeDur > 0) {
      exportSegments.push({
        timelineStart: smBaseSegmentStartTimeline,
        sourceStart: smBaseSegmentStartSource,
        duration: activeDur
      });
    }
  }

  // Total duration = max of:
  //  1. The captured smTotalRecordedDuration (includes silence gaps after base ended)
  //  2. End of the last base segment
  //  3. End of the last overlay clip
  let totalDuration = Math.max(baseBuffer.duration, smTotalRecordedDuration || 0);
  exportSegments.forEach(seg => {
    totalDuration = Math.max(totalDuration, seg.timelineStart + seg.duration);
  });

  smRecordedClips.forEach(c => {
    const buf = overlayBuffers[c.assetId];
    if (buf) {
      const cs = c.cropStart || 0;
      const ce = c.cropEnd != null ? Math.min(c.cropEnd, buf.duration) : buf.duration;
      const dur = Math.max(0, ce - cs);
      totalDuration = Math.max(totalDuration, c.timelineStart + dur);
    }
  });

  // Also honour the virtual clock — this captures silence recorded after the base ended
  totalDuration = Math.max(totalDuration, smVirtualTime, smTotalRecordedDuration || 0);

  const sr = getAudioCtx().sampleRate;
  const offline = new OfflineAudioContext(2, Math.ceil(totalDuration * sr), sr);

  const exportCompressor = offline.createDynamicsCompressor();
  exportCompressor.threshold.setValueAtTime(-2, 0);
  exportCompressor.knee.setValueAtTime(0, 0);
  exportCompressor.ratio.setValueAtTime(20, 0);
  exportCompressor.attack.setValueAtTime(0.005, 0);
  exportCompressor.release.setValueAtTime(0.05, 0);
  exportCompressor.connect(offline.destination);

  // Base audio volume
  const baseVolume = (smBaseAsset && smBaseAsset.volume !== undefined) ? smBaseAsset.volume : 1.0;

  // Render base audio in segments with gain
  exportSegments.forEach(seg => {
    const baseSrc = offline.createBufferSource();
    baseSrc.buffer = baseBuffer;
    const baseGain = offline.createGain();
    baseGain.gain.value = baseVolume;
    baseSrc.connect(baseGain);
    baseGain.connect(exportCompressor);
    baseSrc.start(seg.timelineStart, seg.sourceStart, seg.duration);
  });

  // Overlay sources with individual volumes
  smRecordedClips.forEach(c => {
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
    downloadBlob(await audioBufferToWav(rendered), 'super_mode_mix.wav');
    announce('Merged super mix downloaded successfully.');
  } catch (err) {
    console.error(err);
    alert('Error generating merged WAV file.');
    announce('Export failed.', true);
  }
}

