// ─────────────────────────────────────────────────────────────
// TAB SWITCHING
// ─────────────────────────────────────────────────────────────

function initTabs() {
 const tabs = Array.from(document.querySelectorAll('[role="tab"]'));

 tabs.forEach((tab, i) =>{
 tab.addEventListener('click', () =>activateTab(tab, tabs));

 tab.addEventListener('keydown', e =>{
 if (e.key === 'ArrowRight') {
 const next = tabs[(i + 1) % tabs.length];
 next.focus(); activateTab(next, tabs);
 } else if (e.key === 'ArrowLeft') {
 const prev = tabs[(i - 1 + tabs.length) % tabs.length];
 prev.focus(); activateTab(prev, tabs);
 }
 });
 });
}

function activateTab(tab, tabs) {
 tabs.forEach(t =>{
 t.setAttribute('aria-selected', 'false');
 t.classList.remove('active');
 });
 document.querySelectorAll('[role="tabpanel"]').forEach(p =>{ p.hidden = true; });

 tab.setAttribute('aria-selected', 'true');
 tab.classList.add('active');
 document.getElementById(tab.getAttribute('aria-controls')).hidden = false;
 announce(`${tab.textContent.trim()} — tab selected.`);
}

