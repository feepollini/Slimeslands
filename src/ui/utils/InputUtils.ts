export function bindLongPress(el: HTMLElement, callback: () => void, ms = 650) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let moved = false;
  const start = () => { moved = false; timer = setTimeout(() => { if (!moved) callback(); }, ms); };
  const cancel = () => { if (timer) { clearTimeout(timer); timer = null; } };
  const onMove = () => { moved = true; cancel(); };
  el.addEventListener('mousedown', start);
  el.addEventListener('touchstart', start, { passive: true });
  el.addEventListener('mouseup', cancel);
  el.addEventListener('mouseleave', cancel);
  el.addEventListener('touchmove', onMove, { passive: true });
  el.addEventListener('touchend', cancel);
}
