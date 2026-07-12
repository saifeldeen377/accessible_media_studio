// ─────────────────────────────────────────────────────────────
// PRELOADED PROCEDURAL ASSETS
// ─────────────────────────────────────────────────────────────

async function preloadAssets() {
 const ctx = getAudioCtx();
 const sr = ctx.sampleRate;

 // 1. Sine Beep (1 second, 440Hz)
 const beepBuffer = ctx.createBuffer(1, sr, sr);
 const beepData = beepBuffer.getChannelData(0);
 for (let i = 0; i< sr; i++) {
 beepData[i] = Math.sin(2 * Math.PI * 440 * (i / sr)) * Math.exp(-3 * (i / sr));
 }
 const beepWav = await audioBufferToWav(beepBuffer);
 const beepUrl = URL.createObjectURL(beepWav);
 assetLibrary.push({ id: `asset-pre-${++assetIdCounter}`, name: 'Ambient Beep', type: 'audio', objectURL: beepUrl });

 // 2. Laser Sweep (1.5 seconds, 800Hz to 150Hz)
 const laserBuffer = ctx.createBuffer(1, Math.ceil(1.5 * sr), sr);
 const laserData = laserBuffer.getChannelData(0);
 for (let i = 0; i< laserBuffer.length; i++) {
 const t = i / sr;
 const freq = 800 - 650 * (t / 1.5);
 laserData[i] = Math.sin(2 * Math.PI * freq * t) * (1 - t / 1.5);
 }
 const laserWav = await audioBufferToWav(laserBuffer);
 const laserUrl = URL.createObjectURL(laserWav);
 assetLibrary.push({ id: `asset-pre-${++assetIdCounter}`, name: 'Laser Sweep', type: 'audio', objectURL: laserUrl });

 // 3. Drum Hit (0.5 seconds, decaying white noise)
 const drumBuffer = ctx.createBuffer(1, Math.ceil(0.5 * sr), sr);
 const drumData = drumBuffer.getChannelData(0);
 for (let i = 0; i< drumBuffer.length; i++) {
 const t = i / sr;
 drumData[i] = (Math.random() * 2 - 1) * Math.exp(-10 * t);
 }
 const drumWav = await audioBufferToWav(drumBuffer);
 const drumUrl = URL.createObjectURL(drumWav);
 assetLibrary.push({ id: `asset-pre-${++assetIdCounter}`, name: 'Drum Hit', type: 'audio', objectURL: drumUrl });

 // 4. Synth Arpeggio (2 seconds)
 const melodyBuffer = ctx.createBuffer(1, 2 * sr, sr);
 const melodyData = melodyBuffer.getChannelData(0);
 const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
 for (let i = 0; i< melodyBuffer.length; i++) {
 const t = i / sr;
 const noteIndex = Math.floor(t * 4) % 4;
 const freq = notes[noteIndex];
 melodyData[i] = Math.sin(2 * Math.PI * freq * t) * 0.5 * (1 - (t % 0.5) / 0.5);
 }
 const melodyWav = await audioBufferToWav(melodyBuffer);
 const melodyUrl = URL.createObjectURL(melodyWav);
 assetLibrary.push({ id: `asset-pre-${++assetIdCounter}`, name: 'Synth Arpeggio', type: 'audio', objectURL: melodyUrl });

 // 5. Studio Logo Image
 const canvas = document.createElement('canvas');
 canvas.width = 800; canvas.height = 450;
 const ctx2d = canvas.getContext('2d');
 
 const grad = ctx2d.createLinearGradient(0, 0, 800, 450);
 grad.addColorStop(0, '#7c6fff');
 grad.addColorStop(1, '#080812');
 ctx2d.fillStyle = grad;
 ctx2d.fillRect(0, 0, 800, 450);

 ctx2d.fillStyle = '#ffffff';
 ctx2d.font = 'bold 40px "Outfit", sans-serif';
 ctx2d.textAlign = 'center';
 ctx2d.textBaseline = 'middle';
 ctx2d.fillText('ACCESSIBLE MEDIA STUDIO', 400, 200);
 
 ctx2d.fillStyle = 'rgba(255, 255, 255, 0.6)';
 ctx2d.font = '20px "Outfit", sans-serif';
 ctx2d.fillText('Studio Logo (Procedural)', 400, 260);

 canvas.toBlob(blob =>{
 const logoUrl = URL.createObjectURL(blob);
 assetLibrary.push({ id: `asset-pre-${++assetIdCounter}`, name: 'Studio Logo', type: 'image', objectURL: logoUrl });
 
 renderLibrary();
 populateAllSelects();
 }, 'image/png');
}

