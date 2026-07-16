// ─────────────────────────────────────────────────────────────
// BOOT
// ─────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () =>{
  try {
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
    initSuperCut();

    await initDatabase();
    await loadLibraryFromDB();
    await preloadAssets();

    document.getElementById('panel-merge-audio').hidden = false;
  } catch (e) {
    alert("BOOT ERROR:\n" + e.name + ": " + e.message + "\n\nStack:\n" + e.stack);
  }
});
