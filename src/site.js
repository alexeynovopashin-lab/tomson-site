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
  // photo school announcements: upcoming first (soonest on top), then past ones marked «прошло»
  var evl=document.querySelector('.ev-list');
  if(evl){
    var today=new Date().toISOString().slice(0,10);
    var evs=[].slice.call(evl.children).map(function(el,i){var d=el.dataset.date||'';return{el:el,d:d,past:!d||d<today,i:i}});
    evs.sort(function(a,b){if(a.past!==b.past)return a.past?1:-1;if(a.past)return(b.d||'').localeCompare(a.d||'')||a.i-b.i;return a.d.localeCompare(b.d)});
    evs.forEach(function(e){e.el.classList.toggle('past',e.past);evl.appendChild(e.el)});
  }
  // request form: sends to the form function, shows «sent» or the error in place
  var rf=document.querySelector('form.rform');
  if(rf){
    var opened=Date.now(),st=rf.querySelector('.rf-status'),sb=rf.querySelector('button[type=submit]'),label=sb.textContent;
    function say(t,cls){st.textContent=t;st.className='rf-status rf-wide '+(cls||'')}
    function post(body,again){
      return fetch(rf.dataset.api,{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify(body)}).then(function(r){
        // one instance serves the form: a simultaneous request may be turned away once, try again
        if(r.status===429&&again)return new Promise(function(ok){setTimeout(ok,2500)}).then(function(){return post(body,false)});
        return r;
      });
    }
    rf.addEventListener('submit',function(e){
      e.preventDefault();
      var v=function(n){return(rf.elements[n].value||'').trim()};
      if(!v('name')||(v('phone').match(/\d/g)||[]).length<5){say(rf.dataset.errFields,'bad');(v('name')?rf.elements.phone:rf.elements.name).focus();return}
      sb.disabled=true;sb.textContent=rf.dataset.sending;say('');
      var body={name:v('name'),phone:v('phone'),interest:v('interest'),message:v('message'),website:v('website'),elapsed:Date.now()-opened,page:location.pathname};
      post(body,true).then(function(r){
        if(r.ok){rf.reset();rf.classList.add('done');say(rf.dataset.sent,'good');return}
        say(r.status===429?rf.dataset.errRate:r.status===400?rf.dataset.errFields:rf.dataset.err,'bad');
      }).catch(function(){say(rf.dataset.err,'bad')}).then(function(){sb.disabled=false;sb.textContent=label});
    });
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
