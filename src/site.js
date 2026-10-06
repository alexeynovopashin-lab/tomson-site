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
      if(rf.elements.agree&&!rf.elements.agree.checked){say(rf.dataset.errAgree,'bad');rf.elements.agree.focus();return}
      sb.disabled=true;sb.textContent=rf.dataset.sending;say('');
      var body={name:v('name'),phone:v('phone'),interest:v('interest'),message:v('message'),website:v('website'),elapsed:Date.now()-opened,page:location.pathname};
      post(body,true).then(function(r){
        if(r.ok){rf.reset();rf.classList.add('done');say(rf.dataset.sent,'good');return}
        say(r.status===429?rf.dataset.errRate:r.status===400?rf.dataset.errFields:rf.dataset.err,'bad');
      }).catch(function(){say(rf.dataset.err,'bad')}).then(function(){sb.disabled=false;sb.textContent=label});
    });
  }
  // site search: loads the pages listed on /poisk/ once, looks through their text in the browser
  var sres=document.querySelector('.s-results');
  if(sres){
    var sf=document.querySelector('form.sform'),sq=sf.elements.q,ss=document.querySelector('.s-status'),spages=JSON.parse(sres.dataset.pages),sdocs=null;
    var norm=function(t){return t.toLowerCase().replace(/ё/g,'е')};
    // crude Russian stem: «вспышки» finds «вспышка», «циклорамой» finds «циклорама»
    var stem=function(w){return w.length>=5?w.slice(0,Math.max(4,w.length-2)):w};
    var rx=function(t){return t.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')};
    // a word has to start with the term: «ёлка» must not find «тарелка»
    var has=function(n,w){return new RegExp('(^|[^a-zа-я0-9])'+rx(w)).test(n)};
    function load(){
      if(sdocs)return Promise.resolve(sdocs);
      return Promise.all(spages.map(function(pg){
        return fetch(pg.url).then(function(r){if(!r.ok)throw r.status;return r.text()}).then(function(html){
          var main=new DOMParser().parseFromString(html,'text/html').querySelector('main');
          var blocks=[];
          if(main)[].forEach.call(main.querySelectorAll('h1,h2,h3,p,li,dt,dd,summary,figcaption'),function(el){
            if(el.querySelector('p,li,h2,h3'))return; // keep the innermost text only
            var t=el.textContent.replace(/\s+/g,' ').trim();if(t.length<2)return;
            var a=el.closest('[id]');blocks.push({t:t,n:norm(t),id:a&&a.id});
          });
          return{url:pg.url,title:pg.title,blocks:blocks};
        });
      })).then(function(d){sdocs=d;return d});
    }
    function mark(li,text,terms){
      var n=norm(text),i=0,re=new RegExp('(?:^|[^a-zа-я0-9])((?:'+terms.map(rx).join('|')+')[a-zа-я0-9]*)','g'),m;
      while((m=re.exec(n))){var at=m.index+m[0].length-m[1].length;if(at>i)li.appendChild(document.createTextNode(text.slice(i,at)));var k=document.createElement('mark');k.textContent=text.slice(at,at+m[1].length);li.appendChild(k);i=at+m[1].length}
      if(i<text.length)li.appendChild(document.createTextNode(text.slice(i)));
    }
    function cut(t,terms){ // a window of text around the first hit
      if(t.length<=220)return t;var n=norm(t),at=Math.min.apply(null,terms.map(function(w){var j=n.indexOf(w);return j<0?1e9:j}));
      var from=Math.max(0,Math.min(at-80,t.length-220));return(from?'… ':'')+t.slice(from,from+220).trim()+(from+220<t.length?' …':'');
    }
    function run(q){
      var terms=norm(q).split(/[^a-zа-я0-9]+/).filter(function(w){return w.length>1}).map(stem);
      sres.innerHTML='';
      if(!terms.length){ss.textContent=q.trim()?ss.dataset.none:'';return}
      ss.textContent=ss.dataset.loading;
      load().then(function(docs){
        var hits=docs.map(function(d){
          var all=d.blocks.map(function(b){return b.n}).join(' ')+' '+norm(d.title);
          if(!terms.every(function(w){return has(all,w)}))return null;
          var bl=d.blocks.filter(function(b){return terms.some(function(w){return has(b.n,w)})});
          var score=bl.length+(terms.some(function(w){return has(norm(d.title),w)})?5:0);
          return{d:d,bl:bl.slice(0,3),score:score};
        }).filter(Boolean).sort(function(a,b){return b.score-a.score});
        ss.textContent=hits.length?ss.dataset.found.replace('{n}',hits.length):ss.dataset.none;
        hits.forEach(function(h){
          var li=document.createElement('li'),a=document.createElement('a');
          a.href=h.d.url+(h.bl[0]&&h.bl[0].id?'#'+h.bl[0].id:'');a.className='s-title';a.textContent=h.d.title;li.appendChild(a);
          h.bl.forEach(function(b){var p=document.createElement('p');mark(p,cut(b.t,terms),terms);li.appendChild(p)});
          sres.appendChild(li);
        });
      }).catch(function(){sdocs=null;ss.textContent=ss.dataset.err});
    }
    sf.addEventListener('submit',function(e){e.preventDefault();var q=sq.value.trim();history.replaceState(null,'',q?'?q='+encodeURIComponent(q):location.pathname);run(q)});
    var q0=new URLSearchParams(location.search).get('q');
    if(q0){sq.value=q0;run(q0)}else sq.focus();
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
