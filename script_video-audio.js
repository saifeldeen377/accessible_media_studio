// ─────────────────────────────────────────────────────────────
// TOOL 4 — VIDEO → AUDIO
// ─────────────────────────────────────────────────────────────

function initVideoToAudio() {
 document.getElementById('btn-va-export').addEventListener('click', async () =>{
 const assetId = document.getElementById('va-video-select').value;
 if (!assetId) { alert('Please select a video file from the library.'); return; }

 const asset = getAsset(assetId);
 const statusEl = document.getElementById('va-status');
 statusEl.textContent = 'Extracting audio track…';
 announce('Extracting audio from video, please wait…');

 try {
 const buffer = await decodeAudio(asset.file);
 downloadBlob(await audioBufferToWav(buffer), `${asset.name}_audio.wav`);
 statusEl.textContent = 'Done! Audio extracted and downloaded as WAV.';
 announce('Audio extracted and downloaded as WAV.');
 } catch (err) {
 console.error(err);
 statusEl.textContent = 'Error: Could not extract audio. The video may have no audio track, or the format is not supported by your browser.';
 announce('Error: could not extract audio.', true);
 }
 });
}

