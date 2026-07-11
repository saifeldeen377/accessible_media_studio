// ─────────────────────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────────────────────
let masterCompressor = null;

function getAudioCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    masterCompressor = audioCtx.createDynamicsCompressor();
    // Configure compressor to act as a brickwall limiter to prevent digital clipping
    masterCompressor.threshold.setValueAtTime(-2, audioCtx.currentTime);
    masterCompressor.knee.setValueAtTime(0, audioCtx.currentTime);
    masterCompressor.ratio.setValueAtTime(20, audioCtx.currentTime);
    masterCompressor.attack.setValueAtTime(0.005, audioCtx.currentTime);
    masterCompressor.release.setValueAtTime(0.05, audioCtx.currentTime);
    masterCompressor.connect(audioCtx.destination);
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

function announce(msg, assertive = false) {
  const el = document.getElementById(assertive ? 'assertive-announcement' : 'announcement');
  el.textContent = '';
  setTimeout(() => { el.textContent = msg; }, 50);
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000); // Revoke after allowing browser to start download
}

async function decodeAudio(objectURL) {
  try {
    const ctx      = getAudioCtx();
    const response = await fetch(objectURL);
    
    // Check headers for content-length as a primary warning
    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 50 * 1024 * 1024) {
      const confirmDecode = confirm("Warning: This audio file is larger than 50MB. Decoding it into memory may cause the browser tab to slow down or restart on systems with limited RAM (e.g. 4GB). Do you want to proceed?");
      if (!confirmDecode) throw new Error("Decoding canceled by user due to file size safety.");
    }

    const buffer   = await response.arrayBuffer();

    // Second-line check on raw arrayBuffer size (decompressed size warning)
    if (buffer.byteLength > 150 * 1024 * 1024) {
      const confirmDecode = confirm("Warning: The raw data buffer is larger than 150MB. Decoding this might consume substantial RAM. Do you want to proceed?");
      if (!confirmDecode) throw new Error("Decoding canceled by user due to memory size safety.");
    }

    return await ctx.decodeAudioData(buffer);
  } catch (err) {
    console.error("Audio Decode Error:", err);
    alert("فشل في معالجة الملف الصوتي (Decode Error): " + err.message);
    throw err;
  }
}

/** Encode an AudioBuffer as a 16-bit PCM WAV Blob */
function audioBufferToWav(buffer) {
  return new Promise((resolve, reject) => {
    const numCh      = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const length     = buffer.length;

    const channels = [];
    for (let c = 0; c < numCh; c++) {
      channels.push(buffer.getChannelData(c));
    }

    const workerCode = `
      self.onmessage = function(e) {
        try {
          const { channels, numCh, sampleRate, length } = e.data;
          const bitsPerSample = 16;
          const bytesPerSample = bitsPerSample / 8;
          const blockAlign = numCh * bytesPerSample;

          const interleaved = new Float32Array(length * numCh);
          let idx = 0;
          for (let i = 0; i < length; i++) {
            for (let c = 0; c < numCh; c++) interleaved[idx++] = channels[c][i];
          }

          const dataSize = interleaved.length * bytesPerSample;
          const ab  = new ArrayBuffer(44 + dataSize);
          const view = new DataView(ab);
          const ws  = (off, str) => { for (let i = 0; i < str.length; i++) view.setUint8(off + i, str.charCodeAt(i)); };

          ws(0,  'RIFF'); view.setUint32(4,  36 + dataSize, true); ws(8, 'WAVE');
          ws(12, 'fmt '); view.setUint32(16, 16,             true);
          view.setUint16(20, 1,          true);
          view.setUint16(22, numCh,      true);
          view.setUint32(24, sampleRate, true);
          view.setUint32(28, sampleRate * blockAlign, true);
          view.setUint16(32, blockAlign,      true);
          view.setUint16(34, bitsPerSample,   true);
          ws(36, 'data'); view.setUint32(40, dataSize, true);

          let off = 44;
          for (let i = 0; i < interleaved.length; i++) {
            const s = Math.max(-1, Math.min(1, interleaved[i]));
            view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
            off += 2;
          }

          self.postMessage(ab, [ab]);
        } catch(err) {
          self.postMessage({ error: err.message });
        }
      };
    `;
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const worker = new Worker(URL.createObjectURL(blob));

    worker.onmessage = (e) => {
      if (e.data && e.data.error) {
        reject(new Error(e.data.error));
      } else {
        resolve(new Blob([e.data], { type: 'audio/wav' }));
      }
      worker.terminate();
    };

    worker.onerror = (err) => {
      reject(err);
      worker.terminate();
    };

    worker.postMessage({ channels, numCh, sampleRate, length });
  });
}

function getSupportedVideoMime() {
  const types = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm'
  ];
  return types.find(t => MediaRecorder.isTypeSupported(t)) || 'video/webm';
}

function getAsset(id) { return assetLibrary.find(a => a.id === id); }

function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
