(function(){
  var nav=document.querySelector('nav.main'),btn=document.querySelector('.menu-btn');
  if(btn)btn.addEventListener('click',function(){var o=nav.classList.toggle('open');btn.setAttribute('aria-expanded',o)});
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
