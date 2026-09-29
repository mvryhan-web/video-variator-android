(() => {
  const root=document.documentElement;
  root.classList.add('vu-starting');
  const ready=()=>{root.classList.remove('vu-starting');clearTimeout(fallback);};
  // A missing script must never leave a permanently blank page.
  const fallback=setTimeout(ready,6000);
  document.addEventListener('DOMContentLoaded',()=>requestAnimationFrame(ready),{once:true});
})();
