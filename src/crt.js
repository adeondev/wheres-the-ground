const STORAGE_KEY = 'wheres-the-ground-crt';

export function createCrt() {
  let enabled = true;
  try { enabled = localStorage.getItem(STORAGE_KEY) !== 'off'; } catch { /* Preferência opcional. */ }

  function set(value) {
    enabled = value;
    document.body.classList.toggle('crt-on', enabled);
    try { localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off'); } catch { /* Jogo continua sem armazenamento. */ }
  }

  set(enabled);
  return {
    get enabled() { return enabled; },
    toggle() { set(!enabled); },
  };
}
