document.addEventListener('gesturestart', e => e.preventDefault(), {passive:false});
document.addEventListener('gesturechange', e => e.preventDefault(), {passive:false});
document.addEventListener('gestureend', e => e.preventDefault(), {passive:false});
document.addEventListener('wheel', e => { if (e.ctrlKey || e.metaKey) e.preventDefault(); }, {passive:false});
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && ['+','-','=','0'].includes(e.key)) e.preventDefault();
});
let lastTouch = 0;
document.addEventListener('touchend', e => {
  const now = Date.now();
  if (now - lastTouch <= 300) e.preventDefault();
  lastTouch = now;
}, {passive:false});
