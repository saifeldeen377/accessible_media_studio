// ─────────────────────────────────────────────────────────────
// GLOBALS
// ─────────────────────────────────────────────────────────────
let audioCtx = null;
let assetIdCounter = 0;
const assetLibrary = []; // { id, name, type:'audio'|'video'|'image', objectURL }

let dbInstance = null; // IndexedDB reference

// Per-tool clip lists and their counters (instead of Date.now() to prevent collisions)
const maClips = []; // Merge Audio clips
let maClipIdCounter = 0;

const mvClips = []; // Merge Video clips
let mvClipIdCounter = 0;

const avSlides = []; // Audio→Video image slides
let avSlideIdCounter = 0;

// Active preview source (for Stop button)
let previewSource = null;
let trimPreviewSource = null;

// Super Mode globals
let smActive = false;
let smBaseAsset = null;
const smOverlays = []; // { id, assetId, name, key, volume }
let smOverlayIdCounter = 0;
const smRecordedClips = []; // { id, assetId, name, timelineStart, cropStart, cropEnd, volume }
let smRecordedClipIdCounter = 0;
let smBaseAudio = null;
let smTimelineTimer = null;
let smVirtualTime = 0;
let smSoftPaused = false;
let smWasSoftPaused = false;
let smReviewMode = false;
let smLastUpdateTime = 0;
let smSoftPauseStartVirtual = 0;
let smSoftPauseStartWall = 0;
let smBaseSegments = []; // { timelineStart, sourceStart, duration }

// Safety lock to prevent accidental tab closing during long exports
let isExportingMedia = false;
window.addEventListener('beforeunload', (e) =>{
 if (isExportingMedia) {
 e.preventDefault();
 e.returnValue = ''; // Standard way to trigger browser warning
 }
});
let smBaseSegmentStartTimeline = 0;
let smBaseSegmentStartSource = 0;
let smTotalRecordedDuration = 0; // Captured when base ends or recording stops; defines the true end of the mix
let smLastBaseTime = 0; // The time the base audio was at when the user pressed Escape
const activeOverlayAudios = {}; // id ->{ sourceNode, gainNode, buffer, state, clipEntry, startTimeInBase, playStartTime, pausedAtOffset }
let reviewOverlayPlaybacks = []; // Array of active review playback entries
const decodedAudioBuffers = {};

async function getDecodedBuffer(assetId) {
 if (decodedAudioBuffers[assetId]) return decodedAudioBuffers[assetId];
 const asset = getAsset(assetId);
 if (!asset) return null;
 const buffer = await decodeAudio(asset.file);
 decodedAudioBuffers[assetId] = buffer;
 return buffer;
}
let playedClipIds = new Set(); // Set of clip IDs already triggered in the current review run

function stopReviewPlaybackEntry(p) {
 if (p.timerId) {
 clearTimeout(p.timerId);
 p.timerId = null;
 }
 if (p.sourceNode) {
 try { p.sourceNode.stop(); } catch (_) {}
 }
}

/**
 * Returns true when the virtual timeline is actively advancing
 * (either the base is physically playing, OR we are in soft-pause / post-end continuation).
 * Use this instead of !smBaseAudio.paused everywhere a recording or review playback
 * should happen.
 */
function smIsActive() {
 if (!smBaseAudio) return false;
 // If the timeline timer is running, the virtual timeline is advancing.
 // This correctly covers Live Recording, Soft Paused gaps, and Replay gaps.
 return smTimelineTimer !== null;
}

function triggerReviewPlaybacksAtCurrentTime() {
 // If the timeline is not ticking, do not trigger new playbacks
 if (!smTimelineTimer) return;

 const lookahead = 0.15; // 150ms lookahead to seamlessly schedule upcoming clips
 const actx = getAudioCtx();

 smRecordedClips.forEach(clip =>{
 if (playedClipIds.has(clip.id)) return;

 // Check if the clip is supposed to start within our current lookahead window
 if (smVirtualTime + lookahead >= clip.timelineStart) {
 const buffer = decodedAudioBuffers[clip.assetId];
 if (!buffer) return;

 const cropStart = clip.cropStart || 0;
 let relativeOffset = smVirtualTime - clip.timelineStart;
 let hardwareStartTime = 0; // 0 means play immediately

 if (relativeOffset< 0) {
 // The clip is strictly in the future (within the lookahead window).
 // Schedule it to play EXACTLY at its designated time on the hardware clock!
 hardwareStartTime = actx.currentTime + Math.abs(relativeOffset);
 relativeOffset = 0; // Do not skip any audio, start exactly from cropStart
 }

 const clipDur = (clip.cropEnd !== null && clip.cropEnd !== undefined)
 ? (clip.cropEnd - cropStart)
 : (buffer.duration - cropStart);

 const offsetInClip = cropStart + relativeOffset;
 const remainingSec = clipDur - relativeOffset;

 // Only play if we haven't completely passed the end of the clip
 if (offsetInClip< buffer.duration && remainingSec >0) {
 playedClipIds.add(clip.id); // mark as seen so it doesn't trigger again

 const src = actx.createBufferSource();
 src.buffer = buffer;
 const gain = actx.createGain();
 gain.gain.value = (clip.volume !== undefined) ? clip.volume : 1.0;
 src.connect(gain);
 gain.connect(masterCompressor);

 // Schedule playback (sub-millisecond accuracy)
 src.start(hardwareStartTime, offsetInClip, remainingSec);
 const entry = { sourceNode: src, gainNode: gain, clip, timerId: null };

 if (clip.behavior === 'cutoff') {
 // Choke any existing playbacks of the SAME asset
 reviewOverlayPlaybacks.forEach(p =>{
 if (p.clip.assetId === clip.assetId && p.sourceNode) {
 try { p.sourceNode.stop(hardwareStartTime); } catch(_) {}
 }
 });
 }

 reviewOverlayPlaybacks.push(entry);

 // Schedule stop precisely using the hardware clock instead of setTimeout
 if (clip.cropEnd !== null && clip.cropEnd !== undefined) {
 if (hardwareStartTime === 0) {
 src.stop(actx.currentTime + remainingSec);
 } else {
 src.stop(hardwareStartTime + remainingSec);
 }
 }

 src.onended = () =>{
 reviewOverlayPlaybacks = reviewOverlayPlaybacks.filter(p =>p !== entry);
 };
 }
 }
 });
}


// Global Preview Arrow Key Handler for Standard Tools & Library
window.addEventListener('keydown', (e) => {
  const tag = e.target.tagName.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
  if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;

  // Ignore Super Tools as they have their own handlers
  if (document.getElementById('panel-super-merger') && !document.getElementById('panel-super-merger').hidden) return;
  if (document.getElementById('panel-super-trim') && !document.getElementById('panel-super-trim').hidden) return;
  if (document.getElementById('panel-super-cut') && !document.getElementById('panel-super-cut').hidden) return;

  const seconds = e.key === 'ArrowRight' ? 5 : -5;
  
  // 1. Check Trim Audio
  const panelTrimAudio = document.getElementById('panel-trim-audio');
  if (panelTrimAudio && !panelTrimAudio.hidden && typeof window.seekTrimAudio === 'function') {
    e.preventDefault();
    window.seekTrimAudio(seconds);
    return;
  }
  
  // 2. Check Video Audio
  const panelVideoAudio = document.getElementById('panel-video-to-audio');
  if (panelVideoAudio && !panelVideoAudio.hidden && typeof window.seekVideoAudio === 'function') {
    e.preventDefault();
    window.seekVideoAudio(seconds);
    return;
  }
  
  // 3. Check Merge Audio
  const panelMergeAudio = document.getElementById('panel-merge-audio');
  if (panelMergeAudio && !panelMergeAudio.hidden && typeof window.seekMergeAudio === 'function') {
    e.preventDefault();
    window.seekMergeAudio(seconds);
    return;
  }
  
    // 4. Check Audio Video
  const panelAudioVideo = document.getElementById('panel-audio-to-video');
  if (panelAudioVideo && !panelAudioVideo.hidden && typeof window.seekAudioVideo === 'function') {
    e.preventDefault();
    window.seekAudioVideo(seconds);
    return;
  }
  
  // 5. Handle HTMLMediaElements (for Trim Video, Merge Video, Audio Video, and Library UI)
  const medias = document.querySelectorAll('audio, video');
  let handled = false;
  medias.forEach(media => {
     if (!media.paused && media.duration) {
        media.currentTime = Math.max(0, Math.min(media.duration, media.currentTime + seconds));
        handled = true;
     }
  });
  if (handled) {
    e.preventDefault();
  }
});
