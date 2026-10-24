// 学習サイト共通の仕組み。「自然言語処理入門」と同じ構成（ホーム・分野マップ・章・実験・印刷）を、
// content.js の SITE / AREAS / SOURCES / FIELDS / LESSONS から組み立てる。サイト間で同じファイルを使う。
const $=(s,root=document)=>root.querySelector(s);
const $$=(s,root=document)=>[...root.querySelectorAll(s)];
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad=n=>String(n).padStart(2,'0');
const plain=h=>String(h).replace(/<[^>]*>/g,' ');

// ---------- 保存（このブラウザだけ） ----------
let state={done:[],notes:{},answers:{}};
function loadState(){
  try{const s=JSON.parse(localStorage.getItem(SITE.key));if(s&&Array.isArray(s.done)){state={done:s.done,notes:s.notes||{},answers:s.answers||{}};return}}catch(e){}
  // 旧レイアウト（{done:{id:true},memo:{id:{n:text}}}）の進捗とメモを引き継ぐ
  try{const o=SITE.legacyKey&&JSON.parse(localStorage.getItem(SITE.legacyKey));if(o&&o.done){
    state.done=Object.keys(o.done).filter(k=>o.done[k]).map(k=>Number(k)-1).filter(i=>i>=0&&i<LESSONS.length);
    Object.entries(o.memo||{}).forEach(([k,v])=>{state.answers[Number(k)-1]=v});save()}}catch(e){}
}
function save(){state.updatedAt=Date.now();let ok=true;try{localStorage.setItem(SITE.key,JSON.stringify(state))}catch(e){ok=false}if(typeof queueSync==='function')queueSync();return ok}
const hasLearn=()=>typeof srsSeen==='function';

// ---------- 本文で使う部品 ----------
const bars=(labels,values,max=1,opts={})=>`<div class="bars">${labels.map((l,i)=>`<div class="barrow"><span>${l}</span><div class="bartrack"><div class="barfill ${(opts.crit||[]).includes(i)?'crit':''}" style="width:${Math.max(0,Math.min(100,values[i]/max*100))}%"></div></div><span>${opts.fmt?opts.fmt(values[i]):values[i]}</span></div>`).join('')}</div>`;

function lessonSearchText(l){
  return plain([l.title,l.subtitle,l.summary,l.goal,...(l.tags||[]),...l.sections.flat(),...l.takeaways].join(' ')).normalize('NFKC').toLowerCase();
}

// ---------- コース（SITE.tracks が true のサイトだけ。EXAMS ごとに章を分ける） ----------
const useTracks=()=>!!SITE.tracks&&hasExams();
const trackInfo=t=>EXAMS.find(e=>e.id===t);
const trackLessons=t=>LESSONS.map((_,i)=>i).filter(i=>!t||LESSONS[i].exam===t);
function currentTrack(){
  if(!useTracks())return null;
  let m=location.hash.match(/^#track-(\w+)$/);if(m&&trackInfo(m[1]))return m[1];
  m=location.hash.match(/^#chapter-(\d+)$/);if(m&&LESSONS[m[1]-1])return LESSONS[m[1]-1].exam;
  return state.track&&trackInfo(state.track)?state.track:null;
}
// 表示用の章番号（コースがあれば、コースの中での番号）
const chapterNo=i=>useTracks()?trackLessons(LESSONS[i].exam).indexOf(i)+1:i+1;
const chapterLabel=i=>useTracks()?`${trackInfo(LESSONS[i].exam).short} 第${chapterNo(i)}章`:`第${i+1}章`;
const mapHash=t=>t?`#track-${t}`:'#home';

// ---------- サイドバー ----------
function nav(){
  const q=$('#search').value.normalize('NFKC').trim().toLowerCase();
  const active=location.hash||'#home';
  const t=currentTrack();
  let html='';
  if(useTracks())html+=`<div class="track-switch" role="group" aria-label="コースの切り替え">${EXAMS.map(e=>`<a href="#track-${e.id}" class="${e.id===t?'active':''}" ${e.id===t?'aria-current="true"':''}>${e.short}</a>`).join('')}</div>`;
  html+=`<a class="navitem ${active==='#home'?'active':''}" href="#home"><span class="num">⌂</span>${useTracks()?'ホーム（コース一覧）':'学習マップ'}</a>`;
  if(t)html+=`<a class="navitem ${active===`#track-${t}`?'active':''}" href="#track-${t}"><span class="num">▤</span>${trackInfo(t).title}の学習マップ</a>`;
  html+=`<a class="navitem ${active==='#fields'?'active':''}" href="#fields"><span class="num">◇</span>${SITE.fieldsNav}</a>${hasExams()?`<a class="navitem ${active==='#exam'?'active':''}" href="#exam"><span class="num">✎</span>模擬試験</a>`:''}${hasLearn()?(()=>{const n=dueCount(t||'all');return `<a class="navitem ${active==='#review'?'active':''}" href="#review"><span class="num">↻</span>今日の復習${n?` <b class="due-badge">${n}</b>`:''}</a><a class="navitem ${active==='#progress'?'active':''}" href="#progress"><span class="num">▥</span>進捗</a><a class="navitem ${active==='#method'?'active':''}" href="#method"><span class="num">?</span>このサイトの学び方</a><a class="navitem ${active==='#settings'?'active':''}" href="#settings"><span class="num">⚙</span>${getSettings().session?'ログイン中（AI・同期）':'ログインと AI'}</a>`})():''}`;
  let hits=0;
  if(useTracks()&&!t&&!q)html+='<p class="empty">コースを選ぶと、そのコースの章が表示されます。</p>';
  AREAS.forEach(a=>{
    if(useTracks()&&!q&&(!t||(a.exam&&a.exam!==t)))return;
    const items=LESSONS.map((l,i)=>({l,i})).filter(({l})=>l.area===a.id&&(!q||lessonSearchText(l).includes(q)));
    if(!items.length)return;
    hits+=items.length;
    if(!q)html+=`<div class="nav-phase">${a.name}</div>`;
    html+=items.map(({l,i})=>{const cur=active===`#chapter-${i+1}`;return `<a class="navitem ${cur?'active':''} ${state.done.includes(i)?'done':''}" href="#chapter-${i+1}" ${cur?'aria-current="page"':''}><span class="num">${state.done.includes(i)?'✓':pad(chapterNo(i))}</span>${q&&useTracks()?`<small class="nav-track">${trackInfo(l.exam).short}</small> `:''}${l.title}</a>`}).join('');
  });
  if(q&&!hits)html+='<p class="empty">該当する章がありません。</p>';
  $('#nav').innerHTML=html;
  const scope=trackLessons(t),done=scope.filter(i=>state.done.includes(i)).length;
  $('#count').textContent=`${done} / ${scope.length}`;
  $('#progress').max=scope.length;$('#progress').value=done;
}

// ---------- ホーム ----------
function sourceLinks(keys){return keys.map(k=>{const [t,u]=SOURCES[k];return u?`<a href="${u}" target="_blank" rel="noopener">${t} ↗</a>`:`<span class="src">${t}</span>`}).join('')}
function home(){
  if(useTracks())return tracksHome();
  const next=LESSONS.findIndex((_,i)=>!state.done.includes(i));
  const start=next<0?0:next;
  const planned=AREAS.reduce((n,a)=>n+(a.planned||[]).length,0);
  return `<div class="home"><div class="hero"><div><p class="eyebrow">${SITE.eyebrow}</p><h1>${SITE.heroTitle}</h1><p class="lead">${SITE.lead}</p><a class="primary" href="#chapter-${start+1}">${state.done.length?`続きから：第${start+1}章`:'第1章から始める'} <span aria-hidden="true">↗</span></a></div><div class="hero-visual" aria-label="${esc(SITE.heroLabel)}">${SITE.heroVisual}</div></div>
<div class="facts">${SITE.facts.map(([b,s])=>`<div><b>${b}</b><span>${s}</span></div>`).join('')}</div>
${hasLearn()?todayPanel(null):''}
<a class="field-teaser" href="#fields"><span>${SITE.teaser[0]}</span><b>${SITE.teaser[1]}</b><small>${SITE.teaser[2]} →</small></a>
${SITE.homeExtra||''}
<div class="sectionhead"><h2>学習マップ</h2><small>${planned?`公開 ${LESSONS.length}章 · 準備中 ${planned}章`:`全${LESSONS.length}章を${AREAS.length}つの段階に分けています。`}</small></div>
${AREAS.map((a,n)=>{const ls=LESSONS.map((l,i)=>({l,i})).filter(({l})=>l.area===a.id);return `<section class="phase"><div class="phase-label">PHASE ${pad(n+1)}<b>${a.name}</b>${a.lead}</div><div class="cards">${ls.map(({l,i})=>`<a class="chaptercard" href="#chapter-${i+1}"><span class="index">${pad(i+1)} ${state.done.includes(i)?'✓':''}</span><h3>${l.title}</h3><p>${l.subtitle}</p><small>学習時間の目安 ${l.time}分 <span aria-hidden="true">↗</span></small></a>`).join('')}${(a.planned||[]).map(t=>`<div class="chaptercard planned"><span class="index">準備中</span><h3>${t}</h3><p>学んだ順に追加します</p></div>`).join('')}</div></section>`}).join('')}
<div class="guide"><h3>学習の進め方（3ステップ）</h3>${SITE.steps.map(([t,d],i)=>`<p><b>${i+1}. ${t}</b> ${d}</p>`).join('')}<p>${SITE.stepsNote}</p></div>
${SITE.schedule?`<div class="sectionhead"><h2>${SITE.schedule.title}</h2><small>${SITE.schedule.small}</small></div><div class="schedule">${SITE.schedule.weeks.map((x,i)=>`<div><b>Week ${i+1}</b>${x}</div>`).join('')}</div>`:''}
<div class="sectionhead"><h2>この教材について・参考資料</h2></div><div class="sources"><p>${SITE.about}</p>${sourceLinks(SITE.homeSources)}</div></div>`;
}

function phasesHtml(areas){
  return areas.map((a,n)=>{const ls=LESSONS.map((l,i)=>({l,i})).filter(({l})=>l.area===a.id);return `<section class="phase"><div class="phase-label">PHASE ${pad(n+1)}<b>${a.name}</b>${a.lead}</div><div class="cards">${ls.map(({l,i})=>`<a class="chaptercard" href="#chapter-${i+1}"><span class="index">${pad(chapterNo(i))} ${state.done.includes(i)?'✓':''}</span><h3>${l.title}</h3><p>${l.subtitle}</p><small>学習時間の目安 ${l.time}分 <span aria-hidden="true">↗</span></small></a>`).join('')}</div></section>`}).join('');
}
function tracksHome(){
  return `<div class="home"><div class="hero"><div><p class="eyebrow">${SITE.eyebrow}</p><h1>${SITE.heroTitle}</h1><p class="lead">${SITE.lead}</p><a class="primary" href="#track-${state.track&&trackInfo(state.track)?state.track:EXAMS[0].id}">${state.track&&trackInfo(state.track)?`続きから：${trackInfo(state.track).title}`:`${EXAMS[0].title}から始める`} <span aria-hidden="true">↗</span></a></div><div class="hero-visual" aria-label="${esc(SITE.heroLabel)}">${SITE.heroVisual}</div></div>
<div class="facts">${SITE.facts.map(([b,s])=>`<div><b>${b}</b><span>${s}</span></div>`).join('')}</div>
${hasLearn()?todayPanel(null):''}
<div class="sectionhead"><h2>コースを選ぶ</h2><small>資格ごとに分かれています</small></div><p class="lead" style="max-width:none;margin:-8px 0 16px">${SITE.trackIntro||''}</p>
<div class="track-cards">${EXAMS.map(e=>{const ls=trackLessons(e.id),d=ls.filter(i=>state.done.includes(i)).length,q=ls.reduce((n,i)=>n+LESSONS[i].quiz.length,0);return `<a class="track-card" href="#track-${e.id}"><span class="index">${e.name}</span><h3>${e.title}</h3><p>${e.lead}</p><ul><li>${ls.length}章 · 練習問題 ${q}問</li><li>${e.info[0][1]} · ${e.info[3][1]}</li><li>前提：${e.info[4][1]}</li></ul><div class="track-progress"><progress max="${ls.length}" value="${d}"></progress><small>${d} / ${ls.length} 章 完了</small></div><span class="go">コースを開く →</span></a>`}).join('')}</div>
<a class="field-teaser" href="#fields"><span>${SITE.teaser[0]}</span><b>${SITE.teaser[1]}</b><small>${SITE.teaser[2]} →</small></a>
<div class="guide"><h3>学習の進め方（3ステップ）</h3>${SITE.steps.map(([t,d],i)=>`<p><b>${i+1}. ${t}</b> ${d}</p>`).join('')}<p>${SITE.stepsNote}</p></div>
<div class="sectionhead"><h2>この教材について・参考資料</h2></div><div class="sources"><p>${SITE.about}</p>${sourceLinks(SITE.homeSources)}</div></div>`;
}
function trackHome(t){
  const e=trackInfo(t),ls=trackLessons(t),next=ls.find(i=>!state.done.includes(i)),start=next===undefined?ls[0]:next;
  const count=d=>ls.filter(i=>LESSONS[i].domain===d).length;
  return `<div class="home"><div class="lesson-nav"><a href="#home">ホーム</a> / ${e.title}</div><p class="eyebrow">${e.name}</p><h1>${e.title}</h1><p class="lead" style="max-width:760px">${e.lead}</p>
<p style="margin-top:18px;display:flex;gap:12px;flex-wrap:wrap"><a class="primary" href="#chapter-${start+1}">${ls.some(i=>state.done.includes(i))?`続きから：第${chapterNo(start)}章`:'第1章から始める'} <span aria-hidden="true">↗</span></a><a class="home-link" href="#exam" style="padding:10px 18px">このコースの模擬試験 →</a></p>
${hasLearn()?todayPanel(t):''}
<div class="sectionhead"><h2>試験の概要</h2><small>公式の認定ページで確認（2026-10-24）</small></div>
${table(['項目','内容'],e.info)}
${table(['領域','配点','このコースの章'],e.domains.map(([d,n,w])=>[`${d} ${n}`,`${w}%`,`${count(d)}章`]))}
<div class="sectionhead"><h2>学習マップ</h2><small>全${ls.length}章を、試験の領域ごとに並べています。</small></div>
${phasesHtml(AREAS.filter(a=>a.exam===t))}
${e.schedule?`<div class="sectionhead"><h2>4週間の進め方（例）</h2><small>ペースは自由です</small></div><div class="schedule">${e.schedule.map((x,i)=>`<div><b>Week ${i+1}</b>${x}</div>`).join('')}</div>`:''}
<div class="sectionhead"><h2>参考資料</h2></div><div class="sources">${sourceLinks([e.source,'docs'].filter(k=>SOURCES[k]))}</div></div>`;
}

// ---------- 分野マップ ----------
function fieldItem(item){
  const [name,type,desc,example,chapter,label]=item;
  return `<details class="topic" data-search="${esc(plain(item.join(' ')).toLowerCase())}"><summary><span class="topic-name">${name}</span><span class="type-tag">${type}</span><span class="topic-plus" aria-hidden="true">＋</span></summary><div class="topic-body"><p>${desc}</p><div class="topic-example">${example}</div>${chapter?`<p><a href="#chapter-${chapter}">${chapterLabel(chapter-1)} ${LESSONS[chapter-1].title}で学ぶ →</a></p>`:`<span class="topic-future">${label||'発展 · このサイトではまだ扱っていません'}</span>`}</div></details>`;
}
function fieldsPage(){
  const total=FIELDS.branches.reduce((a,g)=>a+g.items.length,0);
  return `<article class="field-page"><p class="eyebrow">${FIELDS.eyebrow}</p><h1>${FIELDS.title}</h1><p class="summary">${FIELDS.summary}</p>${FIELDS.note?`<div class="note">${FIELDS.note}</div>`:''}
<div class="map-tools"><label for="field-search">分野・用語を探す<input type="search" id="field-search" placeholder="${FIELDS.placeholder}"></label><button id="expand-fields">説明をすべて開く</button><button id="collapse-fields">説明をすべて閉じる</button></div>
<p id="field-status" role="status" aria-live="polite">${total}項目 · 項目を開くと説明・例・関連章を表示</p>
<div class="map-root"><span class="logo">${SITE.logo}</span><div><b>${FIELDS.root[0]}</b><small>${FIELDS.root[1]}</small></div></div>
<div class="field-tree">${FIELDS.branches.map((g,i)=>`<section class="field-branch"><div class="branch-header"><span class="branch-number">${pad(i+1)}</span><div><h2>${g.name}</h2><p>${g.idea}</p></div></div><p class="branch-description">${g.description}</p><div class="branch-items">${g.items.map(fieldItem).join('')}</div></section>`).join('')}</div>
<p class="field-empty" hidden>該当する項目がありません。検索語を変えてください。</p>
${FIELDS.after||''}<a class="primary" href="#home">学習マップへ →</a>
<div class="sources" style="margin-top:28px"><b>参考</b>${sourceLinks(FIELDS.sources)}<p>分類と短い説明は、この教材の学習用に独自に整理したものです。</p></div></article>`;
}
function initFields(){
  const topics=$$('.topic');
  $('#field-search').oninput=()=>{
    const q=$('#field-search').value.normalize('NFKC').trim().toLowerCase();let count=0;
    $$('.field-branch').forEach(b=>{let v=0;const head=b.querySelector('h2').textContent.toLowerCase();b.querySelectorAll('.topic').forEach(t=>{const m=t.dataset.search.includes(q)||head.includes(q);t.hidden=!m;if(m){v++;count++}});b.hidden=v===0});
    $('#field-status').textContent=`${count} / ${topics.length}項目${q?' · 検索結果':' · 項目を開くと説明・例・関連章を表示'}`;
    $('.field-empty').hidden=count>0;
  };
  $('#expand-fields').onclick=()=>topics.filter(t=>!t.hidden).forEach(t=>t.open=true);
  $('#collapse-fields').onclick=()=>topics.forEach(t=>t.open=false);
}

// ---------- 実験（TRY IT YOURSELF） ----------
// compare：良い例と悪い例のどちらが良いかを選ぶ（全章に自動で付く）
// classify：項目ごとに分類を選び、答え合わせ
// slider：値を動かすと、状態が言葉と図で変わる（式は見せない）
// builder：型に沿って書き、文章にまとめてコピー
function labsOf(l,i){return [{type:'compare',ex:l.example,flip:i%2===1},...(l.labs||[])]}
function labMarkup(lab,print){
  switch(lab.type){
  case 'compare':{const [a,b]=lab.flip?[lab.ex.good,lab.ex.bad]:[lab.ex.bad,lab.ex.good];
    return `<h3>どちらが良い？</h3><p>同じ場面の2つのやり方です。良いと思う方を選んでください。</p><div class="choice-cards"><div data-card="0"><b>A</b>${a}</div><div data-card="1"><b>B</b>${b}</div></div><div class="lab-actions"><button data-pick="0">Aが良い</button><button data-pick="1">Bが良い</button></div><div class="labresult" aria-live="polite">${print?`<p><b>答え：${lab.flip?'A':'B'}</b></p><p>${lab.ex.why}</p>`:'<p>選ぶと、何を変えたかの説明が出ます。</p>'}</div>`}
  case 'classify':
    return `<h3>${lab.title}</h3><p>${lab.intro}</p><ol class="sortlist">${lab.items.map(([t,ans,why],j)=>`<li data-i="${j}"><span class="mark">${t}</span><select aria-label="${esc(plain(t))}の分類"><option value="">選ぶ…</option>${lab.options.map((o,k)=>`<option value="${k}">${o}</option>`).join('')}</select><p class="why" ${print?'':'hidden'}>答え：${lab.options[ans]}。${why}</p></li>`).join('')}</ol><div class="lab-actions"><button data-check>答え合わせ</button><button data-reset>やり直す</button></div><div class="labresult" aria-live="polite"><p>すべて選んでから答え合わせをしてください。</p></div>`;
  case 'slider':
    return `<h3>${lab.title}</h3><p>${lab.intro}</p><div class="labgrid">${lab.inputs.map(x=>`<div><label>${x.label}：<output data-out="${x.id}">${x.value}${x.unit||''}</output></label><input type="range" data-in="${x.id}" min="${x.min}" max="${x.max}" step="${x.step||1}" value="${x.value}"></div>`).join('')}</div><div class="labresult" aria-live="polite"></div>`;
  case 'builder':
    return `<h3>${lab.title}</h3><p>${lab.intro}</p>${lab.fields.map(f=>`<label>${f.label}</label>${f.multiline?`<textarea data-in="${f.id}" rows="2" maxlength="500">${esc(f.value)}</textarea>`:`<input data-in="${f.id}" maxlength="200" value="${esc(f.value)}">`}`).join('')}<div class="labresult builder-out" aria-live="polite"></div><div class="lab-actions"><button data-copy>文章をコピー</button><span class="copy-status" role="status"></span></div>`;
  case 'checklist':
    return `<h3>${lab.title}</h3><p>${lab.intro}</p><div class="checks">${lab.items.map((t,j)=>`<label><input type="checkbox" data-in="${j}">${t}</label>`).join('')}</div><div class="labresult" aria-live="polite"></div>`;
  }
}
function initLab(lab,el,interactive=true){
  const result=$('.labresult',el);
  const values=()=>Object.fromEntries($$('[data-in]',el).map(x=>[x.dataset.in,x.type==='checkbox'?x.checked:x.type==='range'?Number(x.value):x.value]));
  const update=()=>{
    if(lab.type==='slider'){const v=values();lab.inputs.forEach(x=>{$(`[data-out="${x.id}"]`,el).value=v[x.id]+(x.unit||'')});result.innerHTML=lab.render(v)}
    if(lab.type==='builder')result.textContent=lab.render(values());
    if(lab.type==='checklist'){const v=values();const n=Object.values(v).filter(Boolean).length;result.innerHTML=lab.render(n,lab.items.length,v)}
  };
  update();
  if(!interactive)return;
  $$('[data-in]',el).forEach(x=>x.addEventListener('input',update));
  if(lab.type==='compare')$$('[data-pick]',el).forEach(b=>b.onclick=()=>{
    const pick=Number(b.dataset.pick),good=lab.flip?0:1,ok=pick===good;
    $$('[data-card]',el).forEach(c=>c.classList.remove('picked-ok','picked-ng'));
    $(`[data-card="${pick}"]`,el).classList.add(ok?'picked-ok':'picked-ng');
    result.innerHTML=`<p><b>${ok?'その通りです。':`良いのは${good?'B':'A'}です。`}</b></p><p>${lab.ex.why}</p>`;
  });
  if(lab.type==='classify'){
    $('[data-check]',el).onclick=()=>{let ok=0,blank=0;
      $$('.sortlist li',el).forEach(li=>{const [, ans]=lab.items[li.dataset.i];const v=$('select',li).value;li.classList.remove('ok','ng');if(v===''){blank++;return}const hit=Number(v)===ans;if(hit)ok++;li.classList.add(hit?'ok':'ng');$('.why',li).hidden=false});
      result.innerHTML=`<p><b>${ok} / ${lab.items.length} 問 正解</b>${blank?`（未選択 ${blank}）`:''}</p><p>${ok===lab.items.length?'すべて正解です。':'説明を読んで、間違えた項目の考え方を確かめましょう。'}</p>`};
    $('[data-reset]',el).onclick=()=>{$$('.sortlist li',el).forEach(li=>{li.classList.remove('ok','ng');$('select',li).value='';$('.why',li).hidden=true});result.innerHTML='<p>すべて選んでから答え合わせをしてください。</p>'};
  }
  if(lab.type==='builder')$('[data-copy]',el).onclick=()=>copyText(result.textContent,$('.copy-status',el));
}
async function copyText(text,target){try{await navigator.clipboard.writeText(text);target.textContent='コピーしました'}catch(e){target.textContent='コピーできません。表示された文章を選択してコピーしてください。'}}

// ---------- 理解チェック ----------
// quiz の1問は [問い, 選択肢, 正解, 解説]。正解が配列なら「複数選ぶ」問題になる。
const isMulti=a=>Array.isArray(a);
const sameSet=(x,y)=>x.length===y.length&&x.every(v=>y.includes(v));
const letter=j=>String.fromCharCode(65+j);
// SITE.shuffleOptions が true なら、選択肢の並びを入れ替えて表示する（正解の位置が偏らないように）。
// 章の理解チェックでは問いごとに決まった並び、模擬試験では毎回ランダム。data-answer は元の番号のまま。
function seededOrder(n,text){let h=2166136261;for(const ch of text)h=Math.imul(h^ch.charCodeAt(0),16777619);
  const rnd=()=>{h=Math.imul(h^(h>>>15),2246822507);h=Math.imul(h^(h>>>13),3266489909);return((h^=h>>>16)>>>0)/4294967296};
  const o=[...Array(n).keys()];for(let i=n-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[o[i],o[j]]=[o[j],o[i]]}return o}
function optionOrder(opts,q,mode){if(!SITE.shuffleOptions)return [...opts.keys()];return mode==='exam'?shuffle([...opts.keys()]):seededOrder(opts.length,q)}
function quizItem([q,opts,a,why],k,{print=false,label=`Q${k+1}`,mode='practice'}={}){
  const multi=isMulti(a);
  return `<div class="qitem" data-q="${k}"><p>${label}. ${q}${multi?` <span class="multi-tag">${a.length}つ選ぶ</span>`:''}</p>${optionOrder(opts,q,mode).map((j,pos)=>`<button class="answer" data-answer="${j}" aria-pressed="false">${letter(pos)}. ${opts[j]}</button>`).join('')}${multi&&!print&&mode==='practice'?'<button class="check-multi">回答する</button>':''}<div class="feedback" role="status" aria-live="polite"></div><div class="print-only">正解：${(multi?a:[a]).map(x=>opts[x]).join('／')}。${why}</div></div>`;
}
const selectedOf=item=>$$('.answer.selected',item).map(b=>Number(b.dataset.answer));
function markQuiz(item,[, ,a,why],extra=''){
  const correct=isMulti(a)?a:[a],sel=selectedOf(item),ok=sameSet(sel,correct);
  $$('.answer',item).forEach(b=>{const j=Number(b.dataset.answer);b.classList.toggle('correct',correct.includes(j)&&(ok||sel.includes(j)||extra!==''));b.classList.toggle('wrong',sel.includes(j)&&!correct.includes(j))});
  return ok;
}
function bindQuizItem(item,q,mode='practice',onAnswer=null){
  const multi=isMulti(q[2]);
  $$('.answer',item).forEach(btn=>btn.onclick=()=>{
    if(!multi)$$('.answer',item).forEach(b=>{b.classList.remove('selected');b.setAttribute('aria-pressed','false')});
    btn.classList.toggle('selected',multi?undefined:true);btn.setAttribute('aria-pressed',btn.classList.contains('selected'));
    if(mode==='practice'&&!multi){const ok=markQuiz(item,q);$('.feedback',item).textContent=ok?'正解です。'+q[3]:'もう一度考えてみましょう。';if(onAnswer)onAnswer(ok)}
  });
  const check=$('.check-multi',item);
  if(check)check.onclick=()=>{const sel=selectedOf(item);if(!sel.length){$('.feedback',item).textContent=`${q[2].length}つ選んでから回答してください。`;return}
    const ok=markQuiz(item,q);$('.feedback',item).textContent=ok?'正解です。'+q[3]:`もう一度考えてみましょう（正解は${q[2].length}つです）。`;if(onAnswer)onAnswer(ok)};
}

// ---------- 模擬試験（content.js に EXAMS があるサイトだけ） ----------
const hasExams=()=>typeof EXAMS!=='undefined';
const examOf=l=>hasExams()&&l.exam?EXAMS.find(e=>e.id===l.exam):null;
let examRun=null;
function examPool(id){return LESSONS.flatMap((l,i)=>(id==='all'||l.exam===id)?l.quiz.map((q,k)=>({q,i,exam:l.exam,domain:l.domain})):[])}
function shuffle(a){a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function examPage(){
  const hist=(state.exams||[]).slice(-5).reverse();
  return `<article class="lesson exam-page"><div class="lesson-nav"><a href="${mapHash(currentTrack())}">学習マップ</a> / 模擬試験</div><p class="eyebrow">PRACTICE EXAM</p><h1>模擬試験</h1><p class="summary">${SITE.examIntro||''}</p>
<div class="lab"><span class="lab-heading">SETTINGS</span><h3>出題の範囲と問題数</h3><div class="labgrid"><div><label for="exam-scope">範囲</label><select id="exam-scope">${EXAMS.map(e=>`<option value="${e.id}" ${e.id===state.track?'selected':''}>${e.name}（${examPool(e.id).length}問から）</option>`).join('')}<option value="all">すべての章（${examPool('all').length}問から）</option></select></div><div><label for="exam-count">問題数</label><select id="exam-count"><option value="10">10問</option><option value="20" selected>20問</option><option value="0">全問</option></select></div></div><div class="lab-actions"><button class="primary" id="exam-start">開始する</button></div></div>
${hist.length?`<div class="takeaways"><h3>これまでの結果（このブラウザに保存）</h3><ul>${hist.map(h=>`<li>${h.date} · ${h.name} · ${h.correct} / ${h.total}問（${Math.round(h.correct/h.total*100)}%）</li>`).join('')}</ul></div>`:''}
<div id="exam-area"></div></article>`;
}
function initExam(){
  $('#exam-start').onclick=()=>{const id=$('#exam-scope').value,n=Number($('#exam-count').value);const pool=shuffle(examPool(id));
    examRun={id,name:$('#exam-scope').selectedOptions[0].textContent.replace(/（.*$/,''),items:n?pool.slice(0,n):pool};
    $('#exam-area').innerHTML=`<div class="quiz"><h3>${examRun.items.length}問 · すべて選んでから、最後に採点します</h3>${examRun.items.map((it,k)=>quizItem(it.q,k,{label:`問${k+1}`,mode:'exam'})).join('')}<div class="lab-actions"><button class="primary" id="exam-grade">採点する</button><span class="feedback" id="exam-warn"></span></div></div><div id="exam-result"></div>`;
    $$('#exam-area .qitem').forEach((item,k)=>bindQuizItem(item,examRun.items[k].q,'exam'));
    $('#exam-grade').onclick=gradeExam;$('#exam-area').scrollIntoView({behavior:'smooth'})};
}
function gradeExam(){
  const items=$$('#exam-area .qitem');const blank=items.filter(it=>!selectedOf(it).length).length;
  if(blank&&!$('#exam-grade').dataset.confirm){$('#exam-grade').dataset.confirm='1';$('#exam-warn').textContent=`未回答が${blank}問あります。このまま採点するなら、もう一度押してください。`;return}
  let correct=0;const by={};
  items.forEach((item,k)=>{const it=examRun.items[k],ok=markQuiz(item,it.q,'show');if(ok)correct++;
    const key=it.exam+'|'+it.domain;by[key]=by[key]||[0,0];by[key][1]++;if(ok)by[key][0]++;
    $$('.answer',item).forEach(b=>b.disabled=true);
    $('.feedback',item).innerHTML=`${ok?'○ 正解。':'× 不正解。'}${it.q[3]} <a href="#chapter-${it.i+1}">${chapterLabel(it.i)}で復習 →</a>`});
  $('#exam-grade').remove();$('#exam-warn').textContent='';
  const total=items.length,pct=Math.round(correct/total*100);
  const rows=EXAMS.flatMap(e=>e.domains.map(([d,name,w])=>{const r=by[e.id+'|'+d];return r?[`${e.short} ${d} ${name}`,`${w}%`,`${r[0]} / ${r[1]}`,`${Math.round(r[0]/r[1]*100)}%`]:null}).filter(Boolean));
  $('#exam-result').innerHTML=`<div class="lab"><span class="lab-heading">RESULT</span><div class="metrics"><div class="metric ${pct<75?'warn':''}">${correct} / ${total}<small>正解数</small></div><div class="metric ${pct<75?'warn':''}">${pct}%<small>正答率</small></div></div><p>${pct>=85?'よくできています。間違えた問題の章だけ見直しましょう。':pct>=75?'あと一歩です。正答率の低い領域から復習しましょう。':'正答率の低い領域の章を読み直してから、もう一度挑戦しましょう。'}</p>${table(['領域','配点','正解','正答率'],rows)}<p class="muted" style="font-size:12px">${SITE.examNote||''}</p></div>`;
  state.exams=[...(state.exams||[]),{date:new Date().toLocaleDateString('ja-JP'),name:examRun.name,correct,total}].slice(-20);save();
  $('#exam-result').scrollIntoView({behavior:'smooth'});
}

// ---------- 章 ----------
function lesson(i,print=false){
  const l=LESSONS[i],n=LESSONS.length,area=AREAS.find(a=>a.id===l.area);
  const ans=state.answers[i]||{},ex=examOf(l);
  const t=useTracks()?l.exam:null,list=trackLessons(t),pos=list.indexOf(i),prev=list[pos-1],next=list[pos+1],map=mapHash(t);
  return `<article class="lesson" data-chapter="${i}"><div class="lesson-nav"><a href="${map}">${t?trackInfo(t).title:'学習マップ'}</a> / ${area.name} / 第${chapterNo(i)}章</div>
<p class="eyebrow">${t?trackInfo(t).short.toUpperCase()+' · ':''}CHAPTER ${pad(chapterNo(i))} / ${pad(list.length)} · 学習時間の目安 ${l.time}分</p><h1>${l.title}</h1><p class="summary">${l.summary}</p><div class="tags">${ex?`<span class="tag-exam">${ex.short} · 領域 ${l.domain} ${ex.domains.find(d=>d[0]===l.domain)[1]}</span>`:''}${l.tags.map(t=>`<span>${t}</span>`).join('')}</div>
<div class="objectives"><b>この章のゴール</b><p>${l.goal}</p></div>
${!print&&hasLearn()?`<section class="pretest"><h3>読む前に、予想してみる</h3><p>答えを知らなくて大丈夫です。先に予想してから読むと、本文の中で答えを探しながら読めるので、記憶に残りやすくなります。</p>${l.quiz.slice(0,2).map((q,k)=>quizItem(q,k,{label:`予想${k+1}`})).join('')}</section>`:''}
${l.sections.map(([t,b],j)=>`<section><h2><span class="secnum">${pad(j+1)}</span>${t}</h2>${b}</section>`).join('')}
${labsOf(l,i).map((lab,k)=>`<div class="lab" data-lab="${k}"><span class="lab-heading">TRY IT YOURSELF${labsOf(l,i).length>1?` · ${k+1}`:''}</span>${labMarkup(lab,print)}</div>`).join('')}
<div class="quiz"><h3>理解チェック</h3>${l.quiz.map((q,k)=>quizItem(q,k,{print})).join('')}</div>
<section class="exercise"><h3>自分の手で考える</h3>${l.exercise.map((e,k)=>`<div class="ex"><p>${k+1}. ${e.q}</p>${print?'':`<textarea data-answer-box="${k}" aria-label="演習${k+1}の自分の答え" placeholder="自分の答えを書いてみましょう（このブラウザに保存されます）">${esc(ans[k]||'')}</textarea>`}<details ${print?'open':''}><summary>解答の例を見る</summary><p>${e.a}</p></details></div>`).join('')}</section>
${print||!hasLearn()?`<div class="takeaways"><h3>この章のまとめ</h3><ul>${l.takeaways.map(t=>`<li>${t}</li>`).join('')}</ul></div>`:`<div class="takeaways recall"><h3>何も見ずに、思い出してみる</h3><p>この章の要点を、本文を見ずに書き出してみましょう（3つが目安）。思い出す練習そのものが、記憶を強くします。</p><textarea data-recall rows="4" placeholder="例：〇〇は△△のための仕組み。□□のときに使う…">${esc((state.recall||{})[i]||'')}</textarea><div class="lab-actions"><button data-reveal-take>書けたら、まとめと比べる</button></div><ul data-take ${(state.recallSeen||{})[i]?'':'hidden'}>${l.takeaways.map(t=>`<li>${t}</li>`).join('')}</ul></div>`}
${print?'':`<div class="memo"><label for="memo">学習メモ</label><textarea id="memo" placeholder="今日理解したこと、まだ疑問なこと、自分の言葉での説明…">${esc(state.notes[i]||'')}</textarea><small id="memo-status" aria-live="polite">このブラウザに保存します（同期を設定すると、ほかの端末にも反映）。</small></div>
${hasLearn()?aiInline(i):''}
<div class="lesson-bottom"><a href="${prev!==undefined?`#chapter-${prev+1}`:map}">← ${prev!==undefined?'前の章':'学習マップ'}</a><button class="primary" id="complete">${state.done.includes(i)?'✓ 完了済み（取り消す）':'この章を完了にする'}</button><a href="${next!==undefined?`#chapter-${next+1}`:map}">${next!==undefined?'次の章':t?'コースの学習マップ':'学習マップ'} →</a></div>`}
<div class="sources"><b>参考資料</b>${sourceLinks(l.sources)}</div></article>`;
}
function bindLesson(i){
  const l=LESSONS[i];
  labsOf(l,i).forEach((lab,k)=>initLab(lab,$(`.lab[data-lab="${k}"]`)));
  $$('.pretest .qitem').forEach(item=>bindQuizItem(item,l.quiz[item.dataset.q]));
  $$('.quiz .qitem').forEach(item=>{const k=Number(item.dataset.q);bindQuizItem(item,l.quiz[k],'practice',ok=>{if(hasLearn())srsSeen(i,k,ok)})});
  if(hasLearn()){const ta=$('[data-recall]');if(ta){ta.oninput=()=>{state.recall[i]=ta.value;state.textT['recall:'+i]=Date.now();save()};$('[data-reveal-take]').onclick=()=>{$('[data-take]').hidden=false;state.recallSeen[i]=1;markActivity();save()}}bindAiInline($('#main'))}
  $$('[data-answer-box]').forEach(t=>t.oninput=()=>{state.answers[i]=state.answers[i]||{};state.answers[i][t.dataset.answerBox]=t.value;state.textT=state.textT||{};state.textT['answers:'+i]=Date.now();save()});
  $('#memo').oninput=()=>{state.notes[i]=$('#memo').value;state.textT=state.textT||{};state.textT['notes:'+i]=Date.now();$('#memo-status').textContent=save()?'メモをこのブラウザに保存しました。':'保存できません。メモをコピーして手元に残してください。'};
  $('#complete').onclick=()=>{state.done=state.done.includes(i)?state.done.filter(v=>v!==i):[...state.done,i];state.doneT=state.doneT||{};state.doneT[i]=Date.now();if(hasLearn()&&state.done.includes(i)){srsAddChapter(i);markActivity()}const ok=save();nav();
    $('#complete').textContent=state.done.includes(i)?'✓ 完了済み（取り消す）':'この章を完了にする';
    if(!ok)$('#memo-status').textContent='ブラウザ保存が使えないため、再読込すると進捗が消えます。'};
}

// ---------- 印刷（全章） ----------
function cleanPrintDocument(){$('#print-document')?.remove();document.body.classList.remove('print-all')}
function preparePrintDocument(){
  cleanPrintDocument();
  const out=document.createElement('div');out.id='print-document';
  out.innerHTML=`<p class="print-intro">${SITE.name} · ${SITE.title}。実験は初期設定の状態、演習とクイズは答えを表示しています。</p>`+home()+fieldsPage()+LESSONS.map((_,i)=>lesson(i,true)).join('');
  $$('.lesson',out).forEach((root,i)=>labsOf(LESSONS[i],i).forEach((lab,k)=>initLab(lab,$(`.lab[data-lab="${k}"]`,root),false)));
  $$('details',out).forEach(d=>d.open=true);
  $$('.quiz .answer',out).forEach(b=>{const d=document.createElement('div');d.className='print-choice';d.textContent=b.textContent;b.replaceWith(d)});
  $$('.lab input:not([type=checkbox]),.lab select,.lab textarea',out).forEach(x=>{const d=document.createElement('div');d.className='print-value';d.textContent=x.tagName==='SELECT'?'':x.value;x.replaceWith(d)});
  $$('button,.map-tools',out).forEach(x=>x.remove());
  $$('[id]',out).forEach(x=>x.removeAttribute('id'));$$('[for]',out).forEach(x=>x.removeAttribute('for'));
  document.body.appendChild(out);document.body.classList.add('print-all');
}

// ---------- 画面の切り替え ----------
function render(focus=false){
  const legacy=location.hash.match(/^#l(\d+)$/);
  if(legacy){history.replaceState(null,'',`#chapter-${legacy[1]}`)}
  nav();
  const m=location.hash.match(/^#chapter-(\d+)$/);const i=m?Number(m[1])-1:-1;
  const tr=currentTrack();if(tr&&state.track!==tr){state.track=tr;save()}
  const tm=location.hash.match(/^#track-(\w+)$/);
  const lp={'#review':['今日の復習',()=>reviewPage(),()=>initReview()],'#progress':['進捗',()=>progressPage(),()=>initProgress()],'#method':['このサイトの学び方',()=>methodPage(),()=>{}],'#settings':['ログインと AI',()=>settingsPage(),()=>initSettings()]}[location.hash];
  if(lp&&hasLearn()){$('#main').innerHTML=lp[1]();document.title=`${lp[0]}｜${SITE.name}`;lp[2]()}
  else if(tm&&useTracks()&&trackInfo(tm[1])){$('#main').innerHTML=trackHome(tm[1]);document.title=`${trackInfo(tm[1]).title}｜${SITE.name}`}
  else if(location.hash==='#exam'&&hasExams()){$('#main').innerHTML=examPage();document.title=`模擬試験｜${SITE.name}`;initExam()}
  else if(location.hash==='#fields'){$('#main').innerHTML=fieldsPage();document.title=`${SITE.fieldsNav}｜${SITE.name}`;initFields()}
  else if(i<0||i>=LESSONS.length){$('#main').innerHTML=home();document.title=`${SITE.title}｜${SITE.name}`}
  else{$('#main').innerHTML=lesson(i);document.title=`${chapterLabel(i)} ${LESSONS[i].title}｜${SITE.name}`;bindLesson(i)}
  if(focus){window.scrollTo({top:0,behavior:'instant'});$('#main').focus({preventScroll:true})}
}
if(typeof consumeConnectHash==='function')consumeConnectHash();
loadState();if(hasLearn())ensureLearnState();
$('#search').oninput=nav;
$('.skip').onclick=e=>{e.preventDefault();$('#main').focus()};
window.addEventListener('hashchange',()=>render(true));
$('#print').onclick=()=>{preparePrintDocument();window.print()};
window.addEventListener('afterprint',cleanPrintDocument);
render();
if(hasLearn()){syncNow().then(()=>{if(syncInfo.state==='ok')render()});window.addEventListener('focus',()=>{if(getSettings().token)syncNow()})}
