// ─────────────────────────────────────────────────────────────
// BOOT
// ─────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () =>{
 initLibrary();
 initTabs();
 initMergeAudio();
 initMergeVideo();
 initAudioToVideo();
 initVideoToAudio();
 initTrimAudio();
 initTrimVideo();
 initSuperMode();
 initSuperTrimAudio();

 // Connect to IndexedDB and restore previously saved files
 await initDatabase();
 await loadLibraryFromDB();

 // Preload synthesized demo sounds and gradient image
 await preloadAssets();

 // Ensure first tab panel is visible
 document.getElementById('panel-merge-audio').hidden = false;
});
