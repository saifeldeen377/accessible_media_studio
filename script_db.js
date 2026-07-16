// ─────────────────────────────────────────────────────────────
// INDEXEDDB — PERSISTENT LIBRARY
// ─────────────────────────────────────────────────────────────

const DB_NAME = 'MediaStudioDB';
const DB_VERSION = 1;
const STORE_NAME = 'media_assets';

function setDbStatus(msg, ok = true) {
 const el = document.getElementById('lib-db-status');
 if (!el) return;
 el.textContent = msg;
 el.style.color = ok ? '#4ade80' : '#f87171';
 el.style.borderColor = ok ? '#4ade80' : '#f87171';
}

function initDatabase() {
 return new Promise((resolve, reject) =>{
 const req = indexedDB.open(DB_NAME, DB_VERSION);

 req.onupgradeneeded = e =>{
 const db = e.target.result;
 if (!db.objectStoreNames.contains(STORE_NAME)) {
 const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
 store.createIndex('name', 'name', { unique: false });
 }
 };

 req.onsuccess = e =>{
 dbInstance = e.target.result;
 setDbStatus('✓ Library autosaved to browser', true);
 resolve(dbInstance);
 };

 req.onerror = e =>{
 setDbStatus('✗ Database unavailable — files won\'t persist', false);
 console.warn('IndexedDB error:', e.target.error);
 resolve(null); // Non-fatal: app still works without persistence
 };
 });
}

function dbSaveAsset(id, name, type, blob) {
 if (!dbInstance) return;
 try {
 const tx = dbInstance.transaction(STORE_NAME, 'readwrite');
 const store = tx.objectStore(STORE_NAME);
 const req = store.put({ id, name, type, blob });
 req.onerror = e =>{
 console.warn('IndexedDB save failed (quota?):', e.target.error);
 setDbStatus('⚠ Save failed — storage may be full', false);
 alert("Failed to save file to local database (storage might be full).");
 };
 } catch (err) {
 console.warn('IndexedDB transaction error:', err);
 alert("Error while attempting to save file to database: "+ err.message);
 }
}

function dbDeleteAsset(id) {
 if (!dbInstance) return;
 try {
 const tx = dbInstance.transaction(STORE_NAME, 'readwrite');
 const store = tx.objectStore(STORE_NAME);
 store.delete(id);
 } catch (err) {
 console.warn('IndexedDB delete error:', err);
 alert("Error while attempting to delete file from database: "+ err.message);
 }
}

async function loadLibraryFromDB() {
 if (!dbInstance) return;

 return new Promise(resolve =>{
 try {
 const tx = dbInstance.transaction(STORE_NAME, 'readonly');
 const store = tx.objectStore(STORE_NAME);
 const req = store.getAll();

 req.onsuccess = () =>{
 const records = req.result || [];
 records.forEach(record =>{
  // Re-create the objectURL from the persisted Blob
  const objectURL = URL.createObjectURL(record.blob);
  assetLibrary.push({ id: record.id, name: record.name, type: record.type, objectURL, file: record.blob });
 // Keep the counter above the max existing ID number
 const num = parseInt(record.id.replace('asset-', '')) || 0;
 if (num >assetIdCounter) assetIdCounter = num;
 });

 if (records.length >0) {
 renderLibrary();
 populateAllSelects();
 }
 resolve();
 };

 req.onerror = e =>{
 console.warn('IndexedDB load error:', e.target.error);
 alert("Failed to load files from local database.");
 resolve();
 };
 } catch (err) {
 console.warn('IndexedDB transaction error on load:', err);
 alert("Error while attempting to load database: "+ err.message);
 resolve();
 }
 });
}

