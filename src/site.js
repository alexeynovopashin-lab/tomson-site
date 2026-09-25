(function(){
  var nav=document.querySelector('nav.main'),btn=document.querySelector('.menu-btn');
  if(btn)btn.addEventListener('click',function(){var o=nav.classList.toggle('open');btn.setAttribute('aria-expanded',o)});
  // equipment demo: VK player over the page; the iframe is removed on close so the video stops
  var vd=document.querySelector('dialog.vd');
  if(vd){
    var frame=vd.querySelector('.vd-frame');
    document.addEventListener('click',function(e){
      var b=e.target.closest&&e.target.closest('.eq-play');
      if(!b)return;
      frame.innerHTML='<iframe allow="autoplay; encrypted-media; fullscreen; picture-in-picture; screen-wake-lock" allowfullscreen></iframe>';
      frame.firstChild.src=b.dataset.video;
      frame.firstChild.title=b.dataset.title;
      vd.querySelector('.vd-title').textContent=b.dataset.title;
      vd.showModal();
    });
    vd.addEventListener('close',function(){frame.innerHTML=''});
    vd.querySelector('.vd-x').addEventListener('click',function(){vd.close()});
    vd.addEventListener('click',function(e){if(!e.target.closest('.vd-frame')&&!e.target.closest('.vd-title'))vd.close()});
  }
  var lb=document.querySelector('dialog.lb');
  if(!lb)return;
  var items=[].slice.call(document.querySelectorAll('.gallery .open')),i=0,img=lb.querySelector('img');
  function show(k){i=(k+items.length)%items.length;var s=items[i].querySelector('img');img.src=s.currentSrc||s.src;img.alt=s.alt}
  items.forEach(function(b,k){b.addEventListener('click',function(){show(k);lb.showModal()})});
  lb.querySelector('.x').addEventListener('click',function(){lb.close()});
  lb.querySelector('.p').addEventListener('click',function(){show(i-1)});
  lb.querySelector('.n').addEventListener('click',function(){show(i+1)});
  lb.addEventListener('click',function(e){if(e.target===lb||e.target.classList.contains('stage'))lb.close()});
  document.addEventListener('keydown',function(e){if(!lb.open)return;if(e.key==='ArrowLeft')show(i-1);if(e.key==='ArrowRight')show(i+1)});
})();
