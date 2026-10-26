(function(global){
'use strict';

if(global.VexRecordReader)return;

function mount(config){
  config=config||{};
  var root=document.querySelector(config.rootSelector||'[data-record-reader-root]');
  if(!root)throw new Error('VEX_RECORD_READER_ROOT_MISSING');

  var sourceBase=config.sourceBase||'';
  var witnessUrl=config.witnessUrl||null;
  var phaseWitnessUrl=config.phaseWitnessUrl||witnessUrl;
  var documentUrl=config.documentUrl||null;
  var documentTargetSelector=config.documentTargetSelector||null;
  var documentSectionSelector=config.documentSectionSelector||null;
  var documentBeginMarker=config.documentBeginMarker||null;
  var documentEndMarker=config.documentEndMarker||null;
  var prefix=config.classPrefix||'rr';
  var controlIds=config.controlIds||{};
  var phaseSelector=config.phaseSelector||'[data-reader-component="phase"]';
  var trackButtonSelector=config.trackButtonSelector||'[data-go]';
  var previousSelector=config.previousSelector||('#'+prefix+'-prev');
  var nextSelector=config.nextSelector||('#'+prefix+'-next');
  var positionSelector=config.positionSelector||('#'+prefix+'-reader-position');
  var capstoneSelector=config.capstoneSelector||('#'+prefix+'-capstone');
  var trackScrollSelector=config.trackScrollSelector||('.'+prefix+'-track-scroll');
  var fabTriggerId=config.fabTriggerId||'vex-spiral-trigger';

  var sets=Array.prototype.slice.call(root.querySelectorAll(phaseSelector));
  var track=Array.prototype.slice.call(root.querySelectorAll(trackButtonSelector));
  var prev=root.querySelector(previousSelector)||document.querySelector(previousSelector);
  var next=root.querySelector(nextSelector)||document.querySelector(nextSelector);
  var pos=root.querySelector(positionSelector)||document.querySelector(positionSelector);
  var cap=root.querySelector(capstoneSelector)||document.querySelector(capstoneSelector);
  var trackScroller=root.querySelector(trackScrollSelector)||document.querySelector(trackScrollSelector);
  var recordCount=sets.filter(function(section){return section.dataset.derived!=='true';}).length;
  var current=0;
  var phaseWitnessSourcePromise=null;
  var transcriptAutoRate=1;
  var transcriptAutoBasePx=24;

  function cls(name){return prefix+'-'+name;}
  function selectClass(name){return '.'+cls(name);}
  function esc(s){return String(s).replace(/[&<>"']/g,function(c){return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];});}
  function inline(s){
    var x=esc(s);
    x=x.replace(/\x60([^\x60]+)\x60/g,'<code class="'+cls('inline-code')+'">$1</code>');
    x=x.replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>');
    x=x.replace(/\*([^*]+)\*/g,'<em>$1</em>');
    x=x.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,'<a href="$2" target="_blank" rel="noopener">$1</a>');
    return x;
  }
  function tableCells(line){return line.trim().replace(/^\||\|$/g,'').split('|').map(function(c){return c.trim();});}
  function dividerRow(line){var cells=tableCells(line);return cells.length>0&&cells.every(function(c){return /^:?-{3,}:?$/.test(c);});}
  function renderTable(lines){
    if(lines.length<2||!dividerRow(lines[1]))return lines.map(function(line){return '<p class="'+cls('source-p')+'">'+inline(line)+'</p>';}).join('');
    var head=tableCells(lines[0]),rows=lines.slice(2).map(tableCells);
    return '<div class="'+cls('table-wrap')+'" data-reader-component="semantic-table"><table class="'+cls('table')+'"><thead><tr>'+head.map(function(c){return '<th>'+inline(c)+'</th>';}).join('')+'</tr></thead><tbody>'+rows.map(function(row){return '<tr>'+row.map(function(c){return '<td>'+inline(c)+'</td>';}).join('')+'</tr>';}).join('')+'</tbody></table></div>';
  }
  function renderBlocks(lines){
    var out=[],para=[],listType=null,list=[],table=[],quote=[],inCode=false,code=[];
    function flushPara(){if(para.length){out.push('<p class="'+cls('source-p')+'">'+inline(para.join(' '))+'</p>');para=[];}}
    function flushList(){if(list.length){var tag=listType==='ol'?'ol':'ul';out.push('<'+tag+' class="'+cls('list')+'" data-reader-component="source-list">'+list.map(function(x){return '<li>'+inline(x)+'</li>';}).join('')+'</'+tag+'>');list=[];listType=null;}}
    function flushTable(){if(table.length){out.push(renderTable(table));table=[];}}
    function flushQuote(){if(quote.length){out.push('<blockquote class="'+cls('source-quote')+'" data-reader-component="source-quote">'+quote.map(inline).join('<br>')+'</blockquote>');quote=[];}}
    function flushAll(){flushPara();flushList();flushTable();flushQuote();}
    lines.forEach(function(line){
      if(line.slice(0,3)==='~~~'||(line.length>=3&&line.charCodeAt(0)===96&&line.charCodeAt(1)===96&&line.charCodeAt(2)===96)){
        flushAll();
        if(inCode){out.push('<pre class="'+cls('source-code')+'" data-reader-component="source-code">'+esc(code.join('\n'))+'</pre>');code=[];inCode=false;}
        else{inCode=true;}
        return;
      }
      if(inCode){code.push(line);return;}
      if(/^\s*\|.*\|\s*$/.test(line)){flushPara();flushList();flushQuote();table.push(line);return;}else{flushTable();}
      var lm=line.match(/^\s*(\d+\.|[-*])\s+(.+)/);
      if(lm){flushPara();flushQuote();var type=/\d+\./.test(lm[1])?'ol':'ul';if(listType&&listType!==type)flushList();listType=type;list.push(lm[2]);return;}else{flushList();}
      if(/^>\s?/.test(line)){flushPara();quote.push(line.replace(/^>\s?/,''));return;}else{flushQuote();}
      if(!line.trim()){flushPara();return;}
      var heading=line.match(/^(#{1,4})\s+(.+)/);
      if(heading){flushPara();var level=Math.min(4,Math.max(3,heading[1].length+1));out.push('<h'+level+' class="'+cls('source-heading')+'">'+inline(heading[2])+'</h'+level+'>');return;}
      if(/^---+$/.test(line.trim())){flushPara();out.push('<hr>');return;}
      para.push(line.trim());
    });
    flushAll();
    if(inCode&&code.length)out.push('<pre class="'+cls('source-code')+'" data-reader-component="source-code">'+esc(code.join('\n'))+'</pre>');
    return out.join('');
  }
  function renderBody(body){
    var lines=body.replace(/^\s+|\s+$/g,'').split(/\r?\n/),turns=[],cur=null,pre=[];
    lines.forEach(function(line){
      var speaker=line.match(/^\*\*(Victor|Vex):\*\*\s*$/);
      if(speaker){if(cur)turns.push(cur);cur={speaker:speaker[1],lines:[]};}
      else if(cur){cur.lines.push(line);}
      else{pre.push(line);}
    });
    if(cur)turns.push(cur);
    var out=[];
    if(pre.some(function(x){return x.trim();}))out.push(renderBlocks(pre));
    turns.forEach(function(turn){
      var speakerClass=turn.speaker.toLowerCase(),raw=turn.lines.join('\n').trim(),content;
      if(turn.speaker==='Vex'&&/^\[EMPTY VISIBLE ASSISTANT RESPONSE/.test(raw)){
        content='<div class="'+cls('silence')+'" data-reader-component="intentional-silence"><div class="'+cls('silence-space')+'" aria-hidden="true"></div><div class="'+cls('archive-note')+'">'+esc(raw)+'</div></div>';
      }else{
        content=renderBlocks(turn.lines);
      }
      out.push('<section class="'+cls('turn')+' '+cls('turn--'+speakerClass)+'" data-reader-component="speaker-turn" data-speaker="'+speakerClass+'"><div class="'+cls('turn-speaker')+'">'+esc(turn.speaker)+'</div>'+content+'</section>');
    });
    return out.join('');
  }
  function renderDocument(raw){return renderBlocks(raw.replace(/^\s+|\s+$/g,'').split(/\r?\n/));}
  function exchanges(raw){
    var parts=raw.split(/\n## Exchange\s+/),list=[];
    for(var i=1;i<parts.length;i++){
      var m=parts[i].match(/^(\d+)(?:[ \t]+[—–-][ \t]+[^\n]+)?[ \t]*\n([\s\S]*)$/);
      if(!m)continue;
      list.push({n:parseInt(m[1],10),body:m[2].replace(/\n---\s*$/,'').trim()});
    }
    return list;
  }
  function templateText(name){
    var id=controlIds[name];
    if(!id)return '';
    var node=document.getElementById(id);
    return node?node.textContent:'';
  }
  function phaseWitnessSource(){
    if(!phaseWitnessUrl)return Promise.reject(new Error('PHASE_WITNESS_UNAVAILABLE'));
    if(!phaseWitnessSourcePromise){
      phaseWitnessSourcePromise=fetch(phaseWitnessUrl).then(function(r){if(!r.ok)throw new Error(String(r.status));return r.text();});
    }
    return phaseWitnessSourcePromise;
  }
  function phaseWitnessBody(raw,index){
    var n=String(index).padStart(2,'0'),open='<!-- WITNESS-PHASE '+n+' -->',close='<!-- /WITNESS-PHASE '+n+' -->',a=raw.indexOf(open),b=raw.indexOf(close);
    if(a<0||b<a)throw new Error('PHASE_WITNESS_SECTION_MISSING:'+n);
    return raw.slice(a+open.length,b).trim().replace(/^## Phase\s+\d{2}[^\n]*\n?/,'').trim();
  }
  function loadPhaseWitness(section){
    if(!phaseWitnessUrl||section.dataset.witnessLoaded==='true'||section.dataset.derived==='true')return;
    var target=section.querySelector('[data-reader-component="witness-dialogue"]'),index=parseInt(section.dataset.set,10);
    if(!target||!index)return;
    phaseWitnessSource().then(function(raw){
      target.innerHTML=renderDocument(phaseWitnessBody(raw,index));
      section.dataset.witnessLoaded='true';
    }).catch(function(){
      target.textContent=templateText('sourceUnavailable');
    });
  }
  function boundedDocumentBody(raw){
    var body=raw;
    if(documentBeginMarker){
      var a=body.indexOf(documentBeginMarker);
      if(a<0)throw new Error('DOCUMENT_BEGIN_MARKER_MISSING');
      body=body.slice(a+documentBeginMarker.length);
    }
    if(documentEndMarker){
      var b=body.indexOf(documentEndMarker);
      if(b<0)throw new Error('DOCUMENT_END_MARKER_MISSING');
      body=body.slice(0,b);
    }
    return body.trim();
  }
  function loadDocument(){
    if(!documentUrl||!documentTargetSelector)return Promise.reject(new Error('DOCUMENT_SOURCE_UNAVAILABLE'));
    var target=root.querySelector(documentTargetSelector)||document.querySelector(documentTargetSelector);
    if(!target)return Promise.reject(new Error('DOCUMENT_TARGET_MISSING'));
    var section=documentSectionSelector?(root.querySelector(documentSectionSelector)||document.querySelector(documentSectionSelector)):target.closest('[data-reader-component="document"]');
    if(section)installTranscriptControls(section);
    return fetch(documentUrl).then(function(r){if(!r.ok)throw new Error(String(r.status));return r.text();}).then(function(raw){
      var body=boundedDocumentBody(raw);
      target.innerHTML=renderDocument(body);
      target.dataset.loaded='true';
      if(section){
        var loading=section.querySelector(selectClass('transcript-loading'));
        if(loading)loading.remove();
      }
      root.dispatchEvent(new CustomEvent('vextreme:recorddocumentloaded',{detail:{target:target}}));
      return target;
    }).catch(function(err){
      target.textContent=templateText('sourceUnavailable')||'Source projection unavailable.';
      throw err;
    });
  }

  function wholeWitnessBody(raw){return raw.split('<!-- PHASE-WITNESS-APPENDIX -->')[0].trim();}
  function loadWitness(section){
    if(!witnessUrl||section.dataset.loaded==='true')return;
    var target=section.querySelector(selectClass('witness-essay'))||section.querySelector('[data-reader-component="whole-record-witness-body"]');
    if(!target)return;
    fetch(witnessUrl).then(function(r){if(!r.ok)throw new Error(String(r.status));return r.text();}).then(function(raw){
      target.innerHTML=renderDocument(wholeWitnessBody(raw));
      section.dataset.loaded='true';
    }).catch(function(){
      target.textContent=templateText('sourceUnavailable');
    });
  }

  function transcriptRateLabel(value){var n=Math.round(value*100)/100;return String(n).replace(/\.00$/,'').replace(/(\.\d)0$/,'$1')+'×';}
  function setTranscriptAutoState(section,running){
    var a=section&&section._vexRecordAuto;if(!a)return;
    a.running=running;
    a.button.textContent=running?'Ⅱ':'▶';
    a.button.classList.toggle('is-running',running);
    a.button.setAttribute('aria-label',templateText(running?'autoPauseAria':'autoStartAria'));
    a.button.title=templateText(running?'autoPauseTitle':'autoStartTitle');
  }
  function pauseTranscriptAutoScroll(section){
    var a=section&&section._vexRecordAuto;if(!a)return;
    if(a.raf)cancelAnimationFrame(a.raf);
    a.raf=0;a.last=0;a.position=a.viewport.scrollTop;
    setTranscriptAutoState(section,false);
  }
  function transcriptAutoFrame(section,ts){
    var a=section&&section._vexRecordAuto;if(!a||!a.running)return;
    if(!a.last)a.last=ts;
    var dt=Math.min(80,Math.max(0,ts-a.last));a.last=ts;
    var max=Math.max(0,a.viewport.scrollHeight-a.viewport.clientHeight);
    if(max<=0){pauseTranscriptAutoScroll(section);return;}
    a.position=Math.min(max,a.position+transcriptAutoBasePx*transcriptAutoRate*dt/1000);
    a.viewport.scrollTop=a.position;
    if(a.position>=max-1){pauseTranscriptAutoScroll(section);return;}
    a.raf=requestAnimationFrame(function(t){transcriptAutoFrame(section,t);});
  }
  function startTranscriptAutoScroll(section){
    var a=section&&section._vexRecordAuto;if(!a)return;
    var max=Math.max(0,a.viewport.scrollHeight-a.viewport.clientHeight);
    if(a.viewport.scrollTop>=max-1)a.viewport.scrollTop=0;
    a.position=a.viewport.scrollTop;a.last=0;
    setTranscriptAutoState(section,true);
    a.raf=requestAnimationFrame(function(t){transcriptAutoFrame(section,t);});
  }
  function updateTranscriptAutoRate(value){
    transcriptAutoRate=Math.max(.5,Math.min(2,parseFloat(value)||1));
    root.querySelectorAll(selectClass('scroll-rate')).forEach(function(rate){rate.value=String(transcriptAutoRate);});
    root.querySelectorAll(selectClass('scroll-rate-value')).forEach(function(output){output.textContent=transcriptRateLabel(transcriptAutoRate);});
  }
  function refreshTranscriptControlStrings(section){
    if(!section||!section._vexRecordAuto)return;
    setTranscriptAutoState(section,section._vexRecordAuto.running);
    section._vexRecordAuto.rate.setAttribute('aria-label',templateText('autoSpeed'));
    section._vexRecordAuto.rate.title=templateText('autoSpeedTitle');
  }
  function installTranscriptControls(section){
    if(!section||section.dataset.derived==='true'||section._vexRecordAuto)return;
    var bar=section.querySelector(selectClass('source-bar')),viewport=section.querySelector('[data-reader-component="transcript-viewport"]');
    if(!bar||!viewport)return;
    var tools=document.createElement('div');tools.className=cls('source-tools');tools.setAttribute('data-reader-component','transcript-tools');
    var controls=document.createElement('div');controls.className=cls('autoscroll');controls.setAttribute('data-reader-component','transcript-autoscroll');
    var button=document.createElement('button');button.type='button';button.className=cls('scroll-toggle');button.textContent='▶';
    var rate=document.createElement('input');rate.type='range';rate.className=cls('scroll-rate');rate.min='.5';rate.max='2';rate.step='.25';rate.value=String(transcriptAutoRate);
    var output=document.createElement('output');output.className=cls('scroll-rate-value');output.textContent=transcriptRateLabel(transcriptAutoRate);
    controls.append(button,rate,output);tools.appendChild(controls);
    var links=bar.querySelector(selectClass('source-links'));if(links)tools.appendChild(links);
    bar.appendChild(tools);
    section._vexRecordAuto={viewport:viewport,button:button,rate:rate,output:output,running:false,raf:0,last:0,position:viewport.scrollTop};
    refreshTranscriptControlStrings(section);
    button.addEventListener('click',function(){if(section._vexRecordAuto.running)pauseTranscriptAutoScroll(section);else startTranscriptAutoScroll(section);});
    rate.addEventListener('input',function(){updateTranscriptAutoRate(rate.value);});
    ['wheel','touchstart','pointerdown','keydown'].forEach(function(type){
      viewport.addEventListener(type,function(){if(section._vexRecordAuto.running)pauseTranscriptAutoScroll(section);},{passive:type!=='keydown'});
    });
  }
  function loadSet(section){
    if(section.dataset.derived==='true'){loadWitness(section);return;}
    installTranscriptControls(section);
    loadPhaseWitness(section);
    if(section.dataset.loaded==='true')return;
    var files=(section.dataset.files||'').split('|').filter(Boolean),from=parseInt(section.dataset.from,10),to=parseInt(section.dataset.to,10);
    var loading=section.querySelector(selectClass('transcript-loading')),target=section.querySelector(selectClass('transcript'));
    if(!target)return;
    Promise.all(files.map(function(file){return fetch(sourceBase+file).then(function(r){if(!r.ok)throw new Error(String(r.status));return r.text();});})).then(function(texts){
      var all=[];texts.forEach(function(raw){all=all.concat(exchanges(raw));});
      all=all.filter(function(e){return e.n>=from&&e.n<=to;}).sort(function(a,b){return a.n-b.n;});
      var exchangeLabel=templateText('exchangeLabel');
      target.innerHTML=all.map(function(e){return '<article class="'+cls('exchange')+'" data-reader-component="exchange" data-exchange="'+e.n+'"><div class="'+cls('exchange-index')+'">'+esc(exchangeLabel)+' '+String(e.n).padStart(2,'0')+'</div>'+renderBody(e.body)+'</article>';}).join('');
      if(loading)loading.remove();
      section.dataset.loaded='true';
    }).catch(function(){
      if(loading)loading.textContent=templateText('sourceUnavailable');
    });
  }
  function railFabClearance(){
    if(!trackScroller)return 0;
    var fab=document.getElementById(fabTriggerId);if(!fab)return 0;
    var sr=trackScroller.getBoundingClientRect(),fr=fab.getBoundingClientRect();
    if(fr.bottom<=sr.top||fr.top>=sr.bottom||fr.left>=sr.right||fr.right<=sr.left)return 0;
    return Math.max(0,sr.right-Math.max(sr.left,fr.left-12));
  }
  function centerActive(smooth){
    var button=track[current];if(!button||!trackScroller)return;
    var max=Math.max(0,trackScroller.scrollWidth-trackScroller.clientWidth),usable=Math.max(160,trackScroller.clientWidth-railFabClearance()),start=button.offsetLeft,end=start+button.offsetWidth;
    if(current===track.length-2&&track[current+1])end=track[current+1].offsetLeft+track[current+1].offsetWidth;
    var span=end-start,target=start-Math.max(0,(usable-span)/2);
    trackScroller.scrollTo({left:Math.max(0,Math.min(max,target)),behavior:smooth===false?'auto':'smooth'});
  }
  function show(index,scroll){
    sets.forEach(function(section){pauseTranscriptAutoScroll(section);});
    current=Math.max(0,Math.min(sets.length-1,index));
    sets.forEach(function(section,i){section.hidden=i!==current;section.classList.toggle('is-active',i===current);});
    track.forEach(function(button,i){button.classList.toggle('is-current',i===current);button.classList.toggle('is-past',i<current);button.setAttribute('aria-current',i===current?'step':'false');});
    if(prev)prev.disabled=current===0;
    if(pos){
      if(current<recordCount)pos.textContent=String(current+1).padStart(2,'0')+' / '+String(recordCount).padStart(2,'0');
      else{
        var badge=sets[current].querySelector(selectClass('set-badge'));
        pos.textContent=badge?badge.textContent:'Witness';
      }
    }
    if(cap)cap.classList.toggle('is-on',current===sets.length-1);
    loadSet(sets[current]);
    var viewport=sets[current].querySelector('[data-reader-component="transcript-viewport"]');if(viewport)viewport.scrollTop=0;
    var anchor=sets[current].id||('set-'+String(current+1).padStart(2,'0'));
    if(scroll!==false&&history.replaceState)history.replaceState(null,'','#'+anchor);
    if(scroll!==false){
      var trackRoot=root.querySelector(config.trackRootSelector||selectClass('track'));
      if(trackRoot)trackRoot.scrollIntoView({behavior:'smooth',block:'start'});
    }
    centerActive(scroll!==false);
  }

  if(!sets.length&&documentUrl&&documentTargetSelector){
    var documentSection=documentSectionSelector?(root.querySelector(documentSectionSelector)||document.querySelector(documentSectionSelector)):null;
    global.addEventListener('vextreme:languagechange',function(){if(documentSection)refreshTranscriptControlStrings(documentSection);});
    loadDocument().catch(function(){});
    return {
      loadDocument:loadDocument,
      pauseAll:function(){if(documentSection)pauseTranscriptAutoScroll(documentSection);}
    };
  }

  track.forEach(function(button){button.addEventListener('click',function(){show(parseInt(button.dataset.go,10)-1,true);});});
  if(prev)prev.addEventListener('click',function(){show(current-1,true);});
  if(next)next.addEventListener('click',function(){if(current<sets.length-1)show(current+1,true);else if(cap)cap.scrollIntoView({behavior:'smooth',block:'start'});});
  document.addEventListener('keydown',function(e){if(e.key==='ArrowLeft'&&current>0)show(current-1,true);if(e.key==='ArrowRight'&&current<sets.length-1)show(current+1,true);});
  global.addEventListener('vextreme:languagechange',function(){sets.forEach(function(section){refreshTranscriptControlStrings(section);});});
  global.addEventListener('load',function(){requestAnimationFrame(function(){centerActive(false);});});

  var hash=(location.hash||'').replace(/^#/,'');
  if(hash){
    sets.some(function(section,i){if(section.id===hash){current=i;return true;}return false;});
  }
  show(current,false);

  return {
    show:show,
    loadSet:loadSet,
    pauseAll:function(){sets.forEach(function(section){pauseTranscriptAutoScroll(section);});}
  };
}

global.VexRecordReader={mount:mount};

}(window));

// [VXG RealForever]
