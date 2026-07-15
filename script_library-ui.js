// ─────────────────────────────────────────────────────────────
// SHARED MEDIA LIBRARY
// ─────────────────────────────────────────────────────────────

function initLibrary() {
 const fileInput = document.getElementById('lib-file-input');
 const nameInput = document.getElementById('lib-file-name');
 const btnAdd = document.getElementById('btn-add-to-library');

 // Auto-fill name from filename
 fileInput.addEventListener('change', () =>{
 if (fileInput.files[0] && !nameInput.value.trim()) {
 nameInput.value = fileInput.files[0].name.replace(/\.[^.]+$/, '');
 }
 });

 btnAdd.addEventListener('click', () =>{
 const file = fileInput.files[0];
 const name = nameInput.value.trim();

 if (!file) { alert('Please choose a file.'); return; }
 if (!name) { alert('Please give the file a name.'); return; }

 let type = null;
 if (file.type) {
 if (file.type.startsWith('audio/')) type = 'audio';
 else if (file.type.startsWith('video/')) type = 'video';
 else if (file.type.startsWith('image/')) type = 'image';
 }
 if (!type && file.name) {
 const ext = file.name.split('.').pop().toLowerCase();
 const audioExts = ['mp3', 'wav', 'ogg', 'aac', 'm4a', 'flac', 'wma', 'opus', 'mp4a'];
 const videoExts = ['mp4', 'webm', 'ogg', 'avi', 'mov', 'mkv', 'flv', 'm4v'];
 const imageExts = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'bmp', 'tiff'];
 if (audioExts.includes(ext)) type = 'audio';
 else if (videoExts.includes(ext)) type = 'video';
 else if (imageExts.includes(ext)) type = 'image';
 }

 if (!type) { alert('Unsupported file type. Please upload audio, video, or image files.'); return; }

  if (file.size > 100 * 1024 * 1024) {
  if (!confirm(`The file "${file.name}" is over 100MB. Processing very large files might cause the browser to slow down or crash. Are you sure you want to continue?`)) {
  nameInput.value = '';
  fileInput.value = '';
  return;
  }
  }

  const id = `asset-${++assetIdCounter}`;
  const objectURL = URL.createObjectURL(file);
  assetLibrary.push({ id, name, type, objectURL, file });

 // Persist to IndexedDB so the file survives page refresh
 dbSaveAsset(id, name, type, file);

 renderLibrary();
 populateAllSelects();

 nameInput.value = '';
 fileInput.value = '';
 announce(`"${name}"added to the library.`);
 });
}

function renderLibrary() {
 const container = document.getElementById('library-items');
 container.innerHTML = '';

 if (assetLibrary.length === 0) {
 container.innerHTML = '<p class="empty-hint">No files uploaded yet. Upload a file above to get started.</p>';
 return;
 }

 assetLibrary.forEach(asset =>{
 const item = document.createElement('div');
 item.className = 'library-item';
 item.setAttribute('role', 'listitem');
 
 let btnText = '';
 let btnAria = '';
 if (asset.type === 'image') {
 btnText = '👁️ Show Image';
 btnAria = `Show image preview for ${escapeHTML(asset.name)}`;
 } else if (asset.type === 'audio') {
 btnText = '️ Play';
 btnAria = `Play preview for ${escapeHTML(asset.name)}`;
 } else if (asset.type === 'video') {
 btnText = '️ Play Video';
 btnAria = `Play video preview for ${escapeHTML(asset.name)}`;
 }

 item.innerHTML = `
<div class="library-item-main">
<span class="asset-icon">${asset.type === 'audio' ? '' : asset.type === 'video' ? '' : ''}</span>
<span class="asset-name">${escapeHTML(asset.name)}</span>
<span class="asset-type">${asset.type}</span>
<div class="library-item-actions">
<button id="btn-prev-${asset.id}"class="btn btn-sm btn-preview"onclick="toggleLibraryPreview('${asset.id}')"aria-label="${btnAria}">${btnText}</button>
<button class="btn btn-sm btn-danger"
 onclick="removeAsset('${asset.id}')"
 aria-label="Remove ${escapeHTML(asset.name)} from library">✕</button>
</div>
</div>
<div id="preview-container-${asset.id}"class="library-item-preview"hidden></div>
 `;
 container.appendChild(item);
 });
}

const activeLibraryAudios = {};

function stopAllLibraryPreviews() {
 // Stop all background audio elements
 Object.keys(activeLibraryAudios).forEach(key =>{
 activeLibraryAudios[key].pause();
 const otherBtn = document.getElementById(`btn-prev-${key}`);
 const otherAsset = getAsset(key);
 if (otherBtn && otherAsset) {
 otherBtn.textContent = otherAsset.type === 'audio' ? '️ Play' : '️ Play Video';
 otherBtn.setAttribute('aria-label', `Play preview for ${otherAsset.name}`);
 }
 const otherContainer = document.getElementById(`preview-container-${key}`);
 if (otherContainer) {
 otherContainer.innerHTML = '';
 otherContainer.hidden = true;
 }
 delete activeLibraryAudios[key];
 });

 // Stop any active video previews
 assetLibrary.forEach(asset =>{
 if (asset.type === 'video') {
 const otherContainer = document.getElementById(`preview-container-${asset.id}`);
 if (otherContainer && !otherContainer.hidden) {
 const vid = otherContainer.querySelector('video');
 if (vid) { try { vid.pause(); } catch (_) {} }
 otherContainer.innerHTML = '';
 otherContainer.hidden = true;
 const otherBtn = document.getElementById(`btn-prev-${asset.id}`);
 if (otherBtn) {
 otherBtn.textContent = '️ Play Video';
 otherBtn.setAttribute('aria-label', `Play video preview for ${asset.name}`);
 }
 }
 }
 });
}

window.toggleLibraryPreview = function(id) {
 const asset = getAsset(id);
 if (!asset) return;

 const btn = document.getElementById(`btn-prev-${id}`);
 const container = document.getElementById(`preview-container-${id}`);
 if (!btn || !container) return;

 if (asset.type === 'audio') {
 const isPlaying = activeLibraryAudios[id];

 if (isPlaying) {
 isPlaying.pause();
 delete activeLibraryAudios[id];
 btn.textContent = '️ Play';
 btn.setAttribute('aria-label', `Play preview for ${asset.name}`);
 container.innerHTML = '';
 container.hidden = true;
 announce(`Stopped preview for ${asset.name}.`);
 } else {
 stopAllLibraryPreviews();

 const aud = new Audio(asset.objectURL);
 aud.play().catch(err =>console.error("Preview play failed:", err));
 activeLibraryAudios[id] = aud;
 btn.textContent = '️ Stop';
 btn.setAttribute('aria-label', `Stop preview for ${asset.name}`);

 aud.onended = () =>{
 delete activeLibraryAudios[id];
 btn.textContent = '️ Play';
 btn.setAttribute('aria-label', `Play preview for ${asset.name}`);
 container.innerHTML = '';
 container.hidden = true;
 announce(`Finished preview for ${asset.name}.`);
 };
 announce(`Playing preview for ${asset.name}.`);
 }
 } else if (asset.type === 'video') {
 const isVisible = !container.hidden;

 if (isVisible) {
 const vid = container.querySelector('video');
 if (vid) { try { vid.pause(); } catch (_) {} }
 btn.textContent = '️ Play Video';
 btn.setAttribute('aria-label', `Play video preview for ${asset.name}`);
 container.innerHTML = '';
 container.hidden = true;
 announce(`Stopped video preview for ${asset.name}.`);
 } else {
 stopAllLibraryPreviews();

 container.hidden = false;
 container.innerHTML = `
<video id="vid-prev-${id}"src="${asset.objectURL}"autoplay controls playsinline></video>
 `;
 btn.textContent = '️ Stop';
 btn.setAttribute('aria-label', `Stop video preview for ${asset.name}`);
 
 const vid = document.getElementById(`vid-prev-${id}`);
 if (vid) {
 vid.onended = () =>{
 btn.textContent = '️ Play Video';
 btn.setAttribute('aria-label', `Play video preview for ${asset.name}`);
 container.innerHTML = '';
 container.hidden = true;
 announce(`Finished video preview for ${asset.name}.`);
 };
 }
 announce(`Showing and playing video preview for ${asset.name}.`);
 }
 } else if (asset.type === 'image') {
 const isVisible = !container.hidden;
 if (isVisible) {
 container.innerHTML = '';
 container.hidden = true;
 btn.textContent = '👁️ Show Image';
 btn.setAttribute('aria-label', `Show image preview for ${asset.name}`);
 announce(`Hidden image preview for ${asset.name}.`);
 } else {
 container.hidden = false;
 container.innerHTML = `
<img src="${asset.objectURL}"alt="Preview of ${escapeHTML(asset.name)}">
 `;
 btn.textContent = '👁️ Hide Image';
 btn.setAttribute('aria-label', `Hide image preview for ${asset.name}`);
 announce(`Showing image preview for ${asset.name} inline.`);
 }
 }
};

window.removeAsset = function(id) {
  // Stop preview if this specific asset is currently playing
  if (activeLibraryAudios[id]) {
  activeLibraryAudios[id].pause();
  delete activeLibraryAudios[id];
  }
  const videoContainer = document.getElementById(`preview-container-${id}`);
  if (videoContainer && !videoContainer.hidden) {
  const vid = videoContainer.querySelector('video');
  if (vid) { try { vid.pause(); } catch (_) {} }
  videoContainer.innerHTML = '';
  videoContainer.hidden = true;
  }

  const idx = assetLibrary.findIndex(a =>a.id === id);
  if (idx !== -1) { 
  URL.revokeObjectURL(assetLibrary[idx].objectURL); 
  assetLibrary.splice(idx, 1); 
  }

 // Clean up orphaned data from other tools' timelines
 if (typeof maClips !== 'undefined') {
 const initialMa = maClips.length;
 const remainingMa = maClips.filter(c => c.assetId !== id);
 maClips.length = 0;
 maClips.push(...remainingMa);
 if (initialMa !== maClips.length && typeof renderMaTable === 'function') renderMaTable();
 }
 if (typeof mvClips !== 'undefined') {
 const initialMv = mvClips.length;
 const remainingMv = mvClips.filter(c => c.assetId !== id);
 mvClips.length = 0;
 mvClips.push(...remainingMv);
 if (initialMv !== mvClips.length && typeof renderMvTable === 'function') renderMvTable();
 }
 if (typeof avSlides !== 'undefined') {
 const initialAv = avSlides.length;
 const remainingAv = avSlides.filter(c => c.assetId !== id);
 avSlides.length = 0;
 avSlides.push(...remainingAv);
 if (initialAv !== avSlides.length && typeof renderAvTable === 'function') renderAvTable();
 }
  if (typeof smRecordedClips !== 'undefined') {
  const remainingSm = smRecordedClips.filter(c => c.assetId !== id);
  smRecordedClips.length = 0;
  smRecordedClips.push(...remainingSm);
  }
  if (typeof smOverlays !== 'undefined') {
  const initialSmO = smOverlays.length;
  const remainingSmO = smOverlays.filter(c => c.assetId !== id);
  smOverlays.length = 0;
  smOverlays.push(...remainingSmO);
  if (initialSmO !== smOverlays.length && typeof renderSmShortcutsTable === 'function') renderSmShortcutsTable();
  }

  // Remove decoded buffer from memory to prevent RAM leaks
  if (decodedAudioBuffers[id]) {
  delete decodedAudioBuffers[id];
  }
  
  // Clear tool-specific memory caches to prevent leaks
  if (typeof trimAudioCacheId !== 'undefined' && trimAudioCacheId === id) {
  trimAudioCacheId = null;
  trimAudioCacheBuffer = null;
  }
  if (typeof currentStaAssetId !== 'undefined' && currentStaAssetId === id) {
  currentStaAssetId = null;
  trimBuffer = null;
  }
  if (typeof currentSclAssetId !== 'undefined' && currentSclAssetId === id) {
  currentSclAssetId = null;
  if (typeof sclBuffer !== 'undefined') sclBuffer = null;
  if (typeof sclCutRegions !== 'undefined') sclCutRegions = [];
  if (typeof sclActiveCut !== 'undefined') sclActiveCut = { start: null, end: null, id: null };
  }
 // Remove from IndexedDB as well
 dbDeleteAsset(id);
 renderLibrary();
 populateAllSelects();
 announce('Asset removed from library.');
};

function populateAllSelects() {
 const configs = [
 { id: 'ma-sound-select', types: ['audio', 'video'] },
 { id: 'mv-video-select', types: ['video'] },
 { id: 'av-audio-select', types: ['audio', 'video'] },
 { id: 'av-image-select', types: ['image'] },
 { id: 'va-video-select', types: ['video'] },
 { id: 'ta-audio-select', types: ['audio', 'video'] },
 { id: 'tv-video-select', types: ['video'] },
 { id: 'sm-base-select', types: ['audio', 'video'] },
 { id: 'sm-overlay-select', types: ['audio', 'video'] },
 { id: 'sta-audio-select', types: ['audio', 'video'] },
 { id: 'scl-audio-select', types: ['audio', 'video'] },
 ];

 configs.forEach(({ id, types }) =>{
 const sel = document.getElementById(id);
 if (!sel) return;
 const prev = sel.value;
 sel.innerHTML = '<option value=""disabled>Select from library...</option>';
 const matching = assetLibrary.filter(a =>types.includes(a.type));
 matching.forEach(a =>{
 const opt = document.createElement('option');
 opt.value = a.id;
 opt.textContent = `${a.name} (${a.type})`;
 sel.appendChild(opt);
 });
 // Restore previous selection if still available
 if (assetLibrary.find(a =>a.id === prev)) sel.value = prev;
 else sel.value = '';
 });
}

