export function createCommandConsole({ onOpen = () => {}, onClose = () => {}, execute }) {
  const panel = document.querySelector('#command-console');
  const form = panel.querySelector('form');
  const field = panel.querySelector('input');
  const status = panel.querySelector('[role="status"]');
  let open = false;
  let busy = false;

  function close() {
    if (busy) return;
    open = false;
    panel.hidden = true;
    field.blur();
    onClose();
  }
  function show() {
    open = true;
    panel.hidden = false;
    status.textContent = 'stage2 → começo da fase · powers → próximos poderes · final → ligação · night → fase noturna · delegacia → interior · Enter para executar';
    onOpen();
    field.focus();
    field.select();
  }
  window.addEventListener('keydown', event => {
    if (event.key === 'F7') {
      event.preventDefault(); event.stopImmediatePropagation();
      if (!event.repeat) { if (open) close(); else show(); }
      return;
    }
    if (!open) return;
    event.stopImmediatePropagation();
    if (event.key === 'Escape') { event.preventDefault(); close(); }
    else if (event.key === 'Enter') {
      event.preventDefault();
      if (!busy) form.requestSubmit();
    }
  }, true);
  for (const type of ['keyup', 'pointerdown']) {
    window.addEventListener(type, event => {
      if (open) event.stopImmediatePropagation();
    }, true);
  }
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy) return;
    const command = field.value.trim().toLowerCase();
    if (!command) return;
    busy = true;
    field.disabled = true;
    status.textContent = 'Carregando fase...';
    try {
      await execute(command);
      busy = false;
      field.disabled = false;
      close();
    } catch (error) {
      busy = false;
      field.disabled = false;
      status.textContent = error.message;
      field.focus(); field.select();
    }
  });
  return { get isOpen() { return open; } };
}
