// 学習サイト共通：学習科学にもとづく学び方の仕組みと、同期・AI への質問。app.js より先に読み込む（関数は app.js から呼ぶ）。
// 根拠：練習テストと分散学習（Dunlosky ら 2013、Donoghue & Hattie 2021）、連続再学習（Rawson & Dunlosky）、
// 交互練習（Brunmair & Richter 2019）、事前の質問（Pan & Carpenter 2023）、確信度と誤りの修正（Butterfield & Metcalfe 2001）。
// 同期と AI は、共通の API（study-api）を通す。合言葉はこのブラウザにだけ保存し、OpenAI の鍵はサーバー側にだけ置く。
const STUDY_API=/^(127\.0\.0\.1|localhost)$/.test(location.hostname)?'http://127.0.0.1:8787':'https://study-api.gakutoyashiro.workers.dev'; // 手元で試すときは、手元の API を使う
const STUDY_SITES=[['学習ノート（ホーム）','https://study-home.gakutoyashiro.workers.dev/'],['Snowflake','https://snowflake-learning.gakutoyashiro.workers.dev/'],['データマネジメント','https://data-management.gakutoyashiro.workers.dev/'],['コンサルティングスキル','https://consulting-skills.gakutoyashiro.workers.dev/'],['プロジェクトマネジメント','https://project-management.gakutoyashiro.workers.dev/']];
const BOX_DAYS=[1,3,7,14,30,60]; // 復習の間隔（日）。正解して自信があれば次の箱へ、間違えたら最初の箱へ

// ---------- 日付 ----------
const ymd=d=>{const x=new Date(d);return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`};
const todayStr=()=>ymd(Date.now());
const addDays=(n,from=Date.now())=>ymd(new Date(from).getTime()+n*86400000);
const daysBetween=(a,b)=>Math.round((new Date(b+'T00:00:00')-new Date(a+'T00:00:00'))/86400000);

// ---------- 状態の補い（古い保存データでも動くように） ----------
function ensureLearnState(){
  state.srs=state.srs||{};state.days=state.days||{};state.targets=state.targets||{};state.recall=state.recall||{};state.recallSeen=state.recallSeen||{};
  state.calib=state.calib||{hi:[0,0],lo:[0,0]};state.doneT=state.doneT||{};state.textT=state.textT||{};
}
const markActivity=()=>{const d=todayStr();state.days[d]=(state.days[d]||0)+1};
const itemKey=(i,k)=>`${LESSONS[i].title}#${k}`;            // 章を足しても変わらない鍵（章の題名＋問題の番号）
function itemFromKey(key){const p=key.lastIndexOf('#');const title=key.slice(0,p),k=Number(key.slice(p+1));const i=LESSONS.findIndex(l=>l.title===title);return i<0||!LESSONS[i].quiz[k]?null:{i,k,q:LESSONS[i].quiz[k]}}
const scopeOf=i=>(typeof useTracks==='function'&&useTracks())?LESSONS[i].exam:'_site';

// ---------- 間隔をあけた復習 ----------
// 章の理解チェックで初めて答えたとき（または章を完了したとき）に復習の対象に入れ、翌日から出題する。
function srsSeen(i,k,ok){ensureLearnState();const key=itemKey(i,k);if(!state.srs[key])state.srs[key]={b:0,due:addDays(1),t:Date.now(),n:1,c:ok?1:0};markActivity();save()}
function srsAddChapter(i){ensureLearnState();LESSONS[i].quiz.forEach((_,k)=>{const key=itemKey(i,k);if(!state.srs[key])state.srs[key]={b:0,due:addDays(1),t:Date.now(),n:0,c:0}});save()}
function intervalCap(i){const tg=state.targets[scopeOf(i)];if(!tg||!tg.date)return Infinity;const left=daysBetween(todayStr(),tg.date);return left<=1?1:Math.max(1,Math.floor(left*0.2))} // 試験までの残りの約2割を上限に
function srsReview(i,k,ok,conf){
  ensureLearnState();const key=itemKey(i,k);const it=state.srs[key]||{b:0,n:0,c:0};
  it.n++;if(ok)it.c++;
  if(ok&&conf==='hi')it.b=Math.min(it.b+1,BOX_DAYS.length-1);else if(!ok){it.b=0;if(conf==='hi')it.hc=(it.hc||0)+1}
  it.due=addDays(Math.min(BOX_DAYS[it.b],intervalCap(i)));it.t=Date.now();state.srs[key]=it;
  const c=state.calib[conf==='hi'?'hi':'lo'];c[1]++;if(ok)c[0]++;
  markActivity();save();
}
function dueItems(scope){ensureLearnState();const t=todayStr();return Object.entries(state.srs).filter(([,v])=>v.due<=t).map(([key])=>itemFromKey(key)).filter(Boolean).filter(x=>!scope||scope==='all'||scopeOf(x.i)===scope)}
function dueCount(scope){return dueItems(scope).length}

// ---------- 今日やること（ホームの上部） ----------
function todayPanel(t){
  ensureLearnState();const scope=t||(typeof useTracks==='function'&&useTracks()?null:'all');const due=dueCount(scope||'all');
  const ls=typeof trackLessons==='function'?trackLessons(t):LESSONS.map((_,i)=>i);const next=ls.find(i=>!state.done.includes(i));
  const tg=state.targets[t||'_site'];const left=tg&&tg.date?daysBetween(todayStr(),tg.date):null;
  return `<div class="today"><div><b>今日やること</b><span>${due?`復習 ${due}問`:'復習はありません'}${next!==undefined?` · 次の章：${chapterLabel(next)} ${LESSONS[next].title}`:' · すべての章を完了'}${left!==null&&left>=0?` · 目標日まで ${left}日`:''}</span></div><div class="today-actions">${due?`<a class="primary" href="#review">復習する（${due}問）</a>`:''}${next!==undefined?`<a class="home-link" href="#chapter-${next+1}">次の章へ</a>`:''}<a class="home-link" href="#progress">進捗を見る</a></div></div>`;
}

// ---------- 今日の復習 ----------
let reviewRun=null;
function reviewScopes(){return (typeof useTracks==='function'&&useTracks())?[...EXAMS.map(e=>[e.id,e.title]),['all','すべてのコース']]:[['all','すべての章']]}
function reviewPage(){
  ensureLearnState();const cur=(typeof currentTrack==='function'&&currentTrack())||'all';
  const scopes=reviewScopes();const total=Object.keys(state.srs).length;
  return `<article class="lesson"><div class="lesson-nav"><a href="#home">ホーム</a> / 今日の復習</div><p class="eyebrow">SPACED RETRIEVAL</p><h1>今日の復習</h1>
<p class="summary">学んだ章の問題を、日をあけて思い出します。章をまぜて出題し、答える前に確信度を選びます。間違えた問題は、この回の最後にもう一度出ます。</p>
${total?'':`<div class="note">まだ復習する問題がありません。章の理解チェックに答えるか、章を完了にすると、翌日から復習に入ります。</div>`}
<div class="lab"><span class="lab-heading">SETTINGS</span><div class="labgrid"><div><label for="rv-scope">範囲</label><select id="rv-scope">${scopes.map(([id,n])=>`<option value="${id}" ${id===cur?'selected':''}>${n}（今日 ${dueCount(id)}問）</option>`).join('')}</select></div><div><label for="rv-count">問題数</label><select id="rv-count"><option value="10">10問</option><option value="20" selected>20問</option><option value="0">期限の来た全問</option></select></div></div>
<div class="lab-actions"><button class="primary" id="rv-start">復習を始める</button><button id="rv-ahead">期限前の問題も練習する</button></div></div>
<div id="rv-area"></div></article>`;
}
function initReview(){
  const start=ahead=>{const scope=$('#rv-scope').value,n=Number($('#rv-count').value);
    let items=ahead?Object.keys(state.srs).map(itemFromKey).filter(Boolean).filter(x=>scope==='all'||scopeOf(x.i)===scope):dueItems(scope);
    items=shuffle(items);if(n)items=items.slice(0,n);
    if(!items.length){$('#rv-area').innerHTML='<p class="empty">この範囲には、今日復習する問題はありません。「期限前の問題も練習する」で前倒しもできます。</p>';return}
    reviewRun={queue:items.map(x=>({...x,tries:0})),done:0,first:0,firstOk:0,hiWrong:[],total:items.length};showCard()};
  $('#rv-start').onclick=()=>start(false);$('#rv-ahead').onclick=()=>start(true);
}
function showCard(){
  const area=$('#rv-area');const it=reviewRun.queue[0];
  if(!it){const r=reviewRun;area.innerHTML=`<div class="lab"><span class="lab-heading">RESULT</span><div class="metrics"><div class="metric">${r.firstOk} / ${r.first}<small>1回目で正解</small></div><div class="metric ${r.hiWrong.length?'warn':''}">${r.hiWrong.length}<small>自信ありで間違えた</small></div></div>${r.hiWrong.length?`<p><b>思い込みに注意：</b>自信があったのに間違えた問題です。早めにもう一度出題します。</p><ul>${r.hiWrong.map(x=>`<li><a href="#chapter-${x.i+1}">${chapterLabel(x.i)} ${LESSONS[x.i].title}</a>：${x.q[0]}</li>`).join('')}</ul>`:''}<p>次の復習の予定は、<a href="#progress">進捗</a>で確認できます。</p></div>`;area.scrollIntoView({behavior:'smooth'});return}
  const n=reviewRun.total-reviewRun.queue.length+1;
  area.innerHTML=`<div class="quiz review-card"><p class="muted" style="font-size:12px;margin:0 0 6px">${reviewRun.done+1}問目（残り ${reviewRun.queue.length}）· ${chapterLabel(it.i)} ${LESSONS[it.i].title}${it.tries?' · もう一度':''}</p>${quizItem(it.q,0,{label:'Q',mode:'exam'})}
<div class="conf-row"><span>答えを選んだら、確信度を選んで回答：</span><button class="primary" data-conf="hi">自信あり</button><button data-conf="lo">自信なし</button></div><div class="rv-after" hidden><div class="lab-actions"><button class="primary" id="rv-next">次へ</button><a href="#chapter-${it.i+1}">章を読み直す</a></div>${aiInline(it.i,`問題：${plain(it.q[0])}\n選択肢：${it.q[1].map((o,j)=>`${letter(j)}. ${plain(o)}`).join(' / ')}\n正解：${(isMulti(it.q[2])?it.q[2]:[it.q[2]]).map(j=>plain(it.q[1][j])).join('、')}\n解説：${plain(it.q[3])}\n\nこの問題の考え方を、別の例を使って説明してください。`)}</div></div>`;
  const item=$('.review-card .qitem');bindQuizItem(item,it.q,'exam');
  $$('[data-conf]',area).forEach(b=>b.onclick=()=>{
    const sel=selectedOf(item);if(!sel.length){$('.feedback',item).textContent='先に答えを選んでください。';return}
    const conf=b.dataset.conf,ok=markQuiz(item,it.q,'show');
    $$('.answer',item).forEach(x=>x.disabled=true);$$('[data-conf]',area).forEach(x=>x.disabled=true);
    if(it.tries===0){reviewRun.first++;if(ok)reviewRun.firstOk++;srsReview(it.i,it.k,ok,conf);if(!ok&&conf==='hi')reviewRun.hiWrong.push(it)}
    $('.feedback',item).innerHTML=`${ok?'○ 正解。':'× 不正解。'}${it.q[3]}${!ok?' この回の最後に、もう一度出ます。':''}`;
    reviewRun.queue.shift();reviewRun.done++;if(!ok&&it.tries<2)reviewRun.queue.push({...it,tries:it.tries+1}); // 正解できるまで、この回の中でもう一度
    $('.rv-after',area).hidden=false;bindAiInline(area);$('#rv-next').onclick=showCard;$('#rv-next').focus();nav();
  });
}

// ---------- 進捗 ----------
function progressPage(){
  ensureLearnState();const tracks=(typeof useTracks==='function'&&useTracks())?EXAMS.map(e=>[e.id,e.title,trackLessons(e.id)]):[['_site',SITE.title,LESSONS.map((_,i)=>i)]];
  const week=Array.from({length:7},(_,d)=>addDays(d));const dueBy=d=>Object.values(state.srs).filter(v=>d===todayStr()?v.due<=d:v.due===d).length;
  const days=Array.from({length:28},(_,d)=>addDays(d-27));const maxAct=Math.max(1,...days.map(d=>state.days[d]||0));
  const c=state.calib,pct=([a,b])=>b?Math.round(a/b*100)+'%':'—';
  return `<article class="lesson"><div class="lesson-nav"><a href="#home">ホーム</a> / 進捗</div><p class="eyebrow">PROGRESS</p><h1>学習の進捗</h1>
<p class="summary">章の完了・正答率・復習の予定・学習した日を、1か所で見ます。${syncStatusText()}</p>
${tracks.map(([id,title,ls])=>{const done=ls.filter(i=>state.done.includes(i)).length;const tg=state.targets[id];const left=tg&&tg.date?daysBetween(todayStr(),tg.date):null;const remain=ls.length-done;
  const groups=(typeof useTracks==='function'&&useTracks())?trackInfo(id).domains.map(([d,n,w])=>[`${d} ${n}（${w}%）`,ls.filter(i=>LESSONS[i].domain===d)]):AREAS.map(a=>[a.name,ls.filter(i=>LESSONS[i].area===a.id)]).filter(([,x])=>x.length);
  const acc=group=>{let n=0,cc=0;group.forEach(i=>LESSONS[i].quiz.forEach((_,k)=>{const v=state.srs[itemKey(i,k)];if(v){n+=v.n;cc+=v.c}}));return [cc,n]};
  return `<section class="lab"><span class="lab-heading">${esc(title)}</span><div class="metrics"><div class="metric">${done} / ${ls.length}<small>完了した章</small></div><div class="metric">${dueCount(id==='_site'?'all':id)}<small>今日の復習</small></div>${left!==null?`<div class="metric ${left<14?'warn':''}">${left}日<small>目標日まで</small></div>`:''}</div>
<label>目標日（受験日など）<input type="date" data-target="${id}" value="${tg&&tg.date||''}" style="max-width:220px"></label>${left!==null&&left>0&&remain>0?`<p>残り${remain}章を、目標日の1週間前までに終えるなら、<b>1日あたり約${Math.max(1,Math.ceil(remain/Math.max(1,left-7))*10)/10}章</b>のペースです。復習の間隔は、目標日に間に合うよう短めに調整されます。</p>`:''}
${table(['領域','章','完了','正答率（理解チェック・復習）'],groups.map(([name,g])=>{const a=acc(g);return [name,`${g.length}`,`${g.filter(i=>state.done.includes(i)).length}`,a[1]?`${pct(a)}（${a[1]}回）`:'—']}))}</section>`}).join('')}
<section class="lab"><span class="lab-heading">REVIEW SCHEDULE</span><h3>この先7日の復習の予定</h3>${bars(week.map((d,i)=>i?d.slice(5):'今日'),week.map(dueBy),Math.max(5,...week.map(dueBy)),{fmt:x=>x+'問'})}</section>
<section class="lab"><span class="lab-heading">CALIBRATION</span><h3>確信度と正答率</h3><p>「自信あり」で答えた問題の正答率が、「自信なし」より十分に高ければ、自分の理解を正しく見積もれています。「自信あり」で間違える問題が多いときは、わかったつもりになっている部分があります。</p><div class="metrics"><div class="metric">${pct(c.hi)}<small>自信あり（${c.hi[1]}回）</small></div><div class="metric">${pct(c.lo)}<small>自信なし（${c.lo[1]}回）</small></div></div></section>
<section class="lab"><span class="lab-heading">STUDY DAYS</span><h3>最近4週間の学習</h3><div class="heat">${days.map(d=>`<span title="${d}：${state.days[d]||0}" style="opacity:${state.days[d]?0.25+0.75*(state.days[d]/maxAct):1};background:${state.days[d]?'var(--accent)':'var(--tint)'}"></span>`).join('')}</div><p class="muted" style="font-size:12px">短い時間でも、毎日少しずつ思い出すほうが、まとめて長く学ぶより記憶に残ります（分散学習）。</p></section>
</article>`;
}
function initProgress(){$$('[data-target]').forEach(x=>x.onchange=()=>{state.targets[x.dataset.target]={date:x.value,t:Date.now()};save();render()})}

// ---------- このサイトの学び方（根拠） ----------
const METHOD_SOURCES=[
  ['Dunlosky ら（2013）Improving Students’ Learning With Effective Learning Techniques','https://doi.org/10.1177/1529100612453266'],
  ['Donoghue & Hattie（2021）A Meta-Analysis of Ten Learning Techniques','https://doi.org/10.3389/feduc.2021.581216'],
  ['Rowland（2014）The effect of testing versus restudy on retention','https://doi.org/10.1037/a0037559'],
  ['Cepeda ら（2008）Spacing Effects in Learning','https://doi.org/10.1111/j.1467-9280.2008.02209.x'],
  ['Karpicke & Roediger（2007）Expanding retrieval practice…','https://doi.org/10.1037/0278-7393.33.4.704'],
  ['Brunmair & Richter（2019）Similarity matters: interleaved learning','https://doi.org/10.1037/bul0000209'],
  ['Pan & Carpenter（2023）Prequestioning and Pretesting Effects','https://doi.org/10.1007/s10648-023-09814-5'],
  ['Bisra ら（2018）Inducing Self-Explanation: a Meta-Analysis','https://doi.org/10.1007/s10648-018-9434-x'],
  ['Butterfield & Metcalfe（2001）Errors committed with high confidence are hypercorrected','https://doi.org/10.1037/0278-7393.27.6.1491'],
];
function methodPage(){
  return `<article class="lesson"><div class="lesson-nav"><a href="#home">ホーム</a> / このサイトの学び方</div><p class="eyebrow">HOW THIS SITE TEACHES</p><h1>このサイトの学び方</h1>
<p class="summary">学習科学の研究で効果が確かめられている方法から逆算して、サイトの仕組みを作っています。読むだけで終わらせず、「思い出す」「日をあけて繰り返す」「まぜて練習する」を、毎日少しずつ行います。</p>
${table(['学び方','研究で分かっていること','このサイトでの形'],[
 ['思い出す練習（練習テスト）','読み直すより記憶に残る。10の学習法を比べたレビューで「効果が高い」と評価された2つのうちの1つ。答えのあとに正解と解説を見ると、さらに効く','章ごとの理解チェック、今日の復習、模擬試験。答えたあとに解説を表示'],
 ['日をあけて繰り返す（分散学習）','一度にまとめて学ぶより、日をあけたほうが長く残る。覚えておきたい期間が長いほど、間隔を長くするのがよい','答えた問題を翌日から復習に入れ、正解して自信があれば間隔を1→3→7→14→30→60日と延ばす。目標日が近いと間隔を短くする'],
 ['正解できるまで繰り返す（連続再学習）','1回の学習で終わらず、正解できるまで思い出すことを、日をあけて何度か行うと、1週間後の記憶が大きく上がった研究がある','復習で間違えた問題は、その回の最後にもう一度出る'],
 ['まぜて練習する（交互練習）','似た概念を見分ける練習で、特に効果がある','復習と模擬試験は、章や領域をまぜて出題。分類の実験で、似た機能を見分ける'],
 ['読む前に予想する（事前の質問）','答えを知らなくても、先に予想してから読むと、学びが深まることが多い','章の最初に「読む前に予想」の問題'],
 ['自分で説明する（自己説明）','「なぜそうなるか」を自分の言葉で説明すると、理解が深まる','演習、「何も見ずに思い出す」欄、学習メモ、AI に「別の例で説明して」と聞く'],
 ['確信度を意識する','自信を持って間違えた答えは、正解を見ると直りやすい。ただし時間がたつと元に戻りやすい','復習で確信度を選び、「自信ありで間違えた」問題を記録して、翌日にもう一度出す'],
 ['読み直し・線引き','わかった気になりやすく、記憶にはあまり残らない','読むだけで終わらない作りにし、まとめは思い出してから表示する'],
])}
<div class="guide"><h3>おすすめの1日の進め方（20〜40分）</h3><p><b>1. 今日の復習から（5〜10分）。</b>期限の来た問題を、確信度を選びながら解く。</p><p><b>2. 新しい章を1つ（15〜25分）。</b>読む前に予想 → 本文と実験 → 理解チェック → 何も見ずに思い出す。</p><p><b>3. 分からないところは AI に聞く。</b>答えを聞くより、「別の例で」「自分の説明は合っている？」と聞くと理解が深まる。</p><p><b>4. 週に1回、模擬試験。</b>領域ごとの正答率を見て、弱い領域の章に戻る。</p></div>
<div class="sources"><b>参考文献</b>${METHOD_SOURCES.map(([t,u])=>`<a href="${u}" target="_blank" rel="noopener">${t} ↗</a>`).join('')}<p>効果の大きさは、研究の条件（学ぶ内容・期間・対象）によって変わります。多くの研究は、事実を覚えるような課題で、数日以内の記憶を測っています。</p></div></article>`;
}

// ---------- 同期（PC とスマホで同じ進み具合） ----------
const SETTINGS_KEY='study-settings';
function getSettings(){try{return JSON.parse(localStorage.getItem(SETTINGS_KEY))||{}}catch(e){return {}}}
function setSettings(s){try{localStorage.setItem(SETTINGS_KEY,JSON.stringify(s))}catch(e){}}
const siteId=()=>SITE.key.replace(/-v\d+$/,'');
let syncTimer=null,syncInfo={state:'off',at:null,msg:''};
function syncStatusText(){const s=getSettings();if(!s.token)return ' 進み具合は、このブラウザだけに保存しています（<a href="#settings">同期を設定</a>）。';return syncInfo.state==='ok'?` 同期済み（${new Date(syncInfo.at).toLocaleTimeString('ja-JP')}）。`:syncInfo.state==='error'?` 同期できませんでした：${esc(syncInfo.msg)}`:' 同期の準備中です。'}
async function api(path,opt={}){const s=getSettings();if(!s.token)throw new Error('合言葉が設定されていません');
  const r=await fetch(STUDY_API+path,{...opt,headers:{'Content-Type':'application/json','Authorization':'Bearer '+s.token,...(opt.headers||{})}});
  const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||`HTTP ${r.status}`);return j}
// 2台の記録をまとめる：項目ごとに、新しく更新したほうを残す
function mergeState(a,b){
  const out={...a};const later=(ta,tb)=>(tb||0)>(ta||0);
  const chapters=new Set([...Object.keys(a.doneT||{}),...Object.keys(b.doneT||{})]);
  const done=new Set(a.done||[]);(b.done||[]).forEach(i=>{if(!(a.doneT||{})[i]&&!(b.doneT||{})[i])done.add(i)});
  chapters.forEach(i=>{const n=Number(i);const useB=later((a.doneT||{})[i],(b.doneT||{})[i]);const src=useB?b:a;if((src.done||[]).includes(n))done.add(n);else done.delete(n)});
  out.done=[...done];out.doneT={...(a.doneT||{}),...Object.fromEntries(Object.entries(b.doneT||{}).filter(([k,v])=>later((a.doneT||{})[k],v)))};
  out.textT={...(a.textT||{})};['notes','answers','recall'].forEach(f=>{out[f]={...(a[f]||{})}});
  Object.entries(b.textT||{}).forEach(([k,v])=>{if(later((a.textT||{})[k],v)){out.textT[k]=v;const [f,i]=k.split(':');if(b[f]&&b[f][i]!==undefined)out[f][i]=b[f][i]}});
  out.srs={...(a.srs||{})};Object.entries(b.srs||{}).forEach(([k,v])=>{if(!out.srs[k]||later(out.srs[k].t,v.t))out.srs[k]=v});
  out.days={...(a.days||{})};Object.entries(b.days||{}).forEach(([d,n])=>{out.days[d]=Math.max(out.days[d]||0,n)});
  out.targets={...(a.targets||{})};Object.entries(b.targets||{}).forEach(([k,v])=>{if(!out.targets[k]||later(out.targets[k].t,v.t))out.targets[k]=v});
  out.recallSeen={...(a.recallSeen||{}),...(b.recallSeen||{})};
  const seen=new Set();out.exams=[...(a.exams||[]),...(b.exams||[])].filter(e=>{const k=[e.date,e.name,e.correct,e.total].join('|');if(seen.has(k))return false;seen.add(k);return true}).slice(-20);
  out.calib=(b.updatedAt||0)>(a.updatedAt||0)?(b.calib||a.calib):(a.calib||b.calib);
  out.track=(b.updatedAt||0)>(a.updatedAt||0)?(b.track||a.track):(a.track||b.track);
  out.updatedAt=Math.max(a.updatedAt||0,b.updatedAt||0);
  return out;
}
async function syncNow(){
  if(!getSettings().token){syncInfo={state:'off'};return}
  try{const r=await api('/progress/'+siteId());if(r.data){const merged=mergeState(state,r.data);state=merged;ensureLearnState();try{localStorage.setItem(SITE.key,JSON.stringify(state))}catch(e){}}
    await api('/progress/'+siteId(),{method:'PUT',body:JSON.stringify({data:state})});syncInfo={state:'ok',at:Date.now()};
  }catch(e){syncInfo={state:'error',msg:e.message}}
  updateSyncBadge();
}
function queueSync(){if(!getSettings().token)return;clearTimeout(syncTimer);syncTimer=setTimeout(syncNow,2500)}
function updateSyncBadge(){const el=$('#sync-badge');if(el)el.innerHTML=syncStatusText()}

// ---------- 設定（合言葉・同期・書き出し） ----------
function settingsPage(){
  const s=getSettings();
  return `<article class="lesson"><div class="lesson-nav"><a href="#home">ホーム</a> / 同期と AI の設定</div><p class="eyebrow">SETTINGS</p><h1>同期と AI の設定</h1>
<p class="summary">合言葉を設定すると、PC とスマホで進み具合を同期し、各章で AI に質問できます。合言葉はこのブラウザにだけ保存されます。</p>
<div class="lab"><span class="lab-heading">PASSPHRASE</span><h3>合言葉</h3><label for="st-token">Cloudflare の study-api に設定した合言葉（ACCESS_TOKEN）</label><input id="st-token" type="password" autocomplete="off" value="${s.token?'••••••••••••':''}" placeholder="合言葉を入力">
<div class="lab-actions"><button class="primary" id="st-save">保存して接続を確かめる</button><button id="st-clear">このブラウザから消す</button><span id="st-msg" role="status"></span></div>
<p class="muted" style="font-size:12px">ほかの学習サイトは別々のサイトなので、合言葉もサイトごとに保存します。保存したあと、下のリンクから開くと、同じ合言葉が自動で設定されます（合言葉は URL の # 以降に入り、サーバーには送られません）。</p><div id="st-links"></div></div>
<div class="lab"><span class="lab-heading">SYNC</span><h3>同期</h3><p id="sync-badge">${syncStatusText()}</p><div class="lab-actions"><button id="st-sync">今すぐ同期</button></div></div>
<div class="lab"><span class="lab-heading">BACKUP</span><h3>記録の書き出しと読み込み</h3><p>同期を使わない場合や、念のための控えに使います。</p><div class="lab-actions"><button id="st-export">書き出す（JSON をコピー）</button><button id="st-import">読み込む（貼り付けた JSON とまとめる）</button></div><textarea id="st-json" rows="4" style="width:100%;margin-top:8px" placeholder="読み込むときは、ここに JSON を貼り付けてください"></textarea><span id="st-io" role="status"></span></div>
</article>`;
}
function siteLinks(token){return STUDY_SITES.filter(([,u])=>!location.href.startsWith(u)).map(([n,u])=>`<a href="${u}#connect=${encodeURIComponent(token)}" target="_blank" rel="noopener">${n} にも設定する ↗</a>`).join('<br>')}
function initSettings(){
  const s=getSettings();if(s.token)$('#st-links').innerHTML=siteLinks(s.token);
  $('#st-save').onclick=async()=>{const v=$('#st-token').value.trim();if(!v||v.startsWith('••')){$('#st-msg').textContent='合言葉を入力してください。';return}
    setSettings({...getSettings(),token:v});$('#st-msg').textContent='確かめています…';
    try{const h=await api('/health');$('#st-msg').textContent=`接続できました${h.ai?'（AI も利用できます）':'（AI の鍵は未設定です）'}。`;$('#st-links').innerHTML=siteLinks(v);syncNow()}catch(e){$('#st-msg').textContent='接続できません：'+e.message}};
  $('#st-clear').onclick=()=>{setSettings({});$('#st-token').value='';$('#st-links').innerHTML='';$('#st-msg').textContent='このブラウザから消しました。';syncInfo={state:'off'}};
  $('#st-sync').onclick=syncNow;
  $('#st-export').onclick=()=>copyText(JSON.stringify(state),$('#st-io'));
  $('#st-import').onclick=()=>{try{const b=JSON.parse($('#st-json').value);state=mergeState(state,b);ensureLearnState();save();$('#st-io').textContent='読み込んで、今の記録とまとめました。';nav()}catch(e){$('#st-io').textContent='JSON として読めませんでした。'}};
}
function consumeConnectHash(){const m=location.hash.match(/^#connect=(.+)$/);if(!m)return;setSettings({...getSettings(),token:decodeURIComponent(m[1])});history.replaceState(null,'','#settings')}

// ---------- AI に質問 ----------
function lessonContext(i){const l=LESSONS[i];return plain([`章：${l.title}`,`要約：${l.summary}`,`ゴール：${l.goal}`,...l.sections.map(([t,b])=>`【${t}】${b}`),`まとめ：${l.takeaways.join(' / ')}`].join('\n')).replace(/[ \t]+/g,' ').slice(0,9000)}
function aiInline(i,preset=''){
  return `<div class="ai-box" data-ai-chapter="${i}"><b>AI に質問する</b>${getSettings().token?'':`<p class="muted" style="font-size:12px;margin:4px 0">使うには、<a href="#settings">同期と AI の設定</a>で合言葉を設定してください。</p>`}
<div class="ai-chips">${['この章を、たとえ話で説明して','具体例をもう1つ挙げて','試験で間違えやすい点は？','私の理解を確かめて：'].map(c=>`<button type="button" data-chip="${esc(c)}">${c}</button>`).join('')}</div>
<textarea data-ai-q rows="3" maxlength="2000" placeholder="分からないところや、自分の説明が合っているかを聞いてみましょう">${esc(preset)}</textarea><div class="lab-actions"><button class="primary" data-ai-send>質問する</button><span class="muted" style="font-size:11px">章の本文を添えて送ります。答えは誤ることがあるので、大事な点は公式の資料で確認してください。</span></div><div class="ai-log" aria-live="polite"></div></div>`;
}
function bindAiInline(root){
  $$('.ai-box',root).forEach(box=>{if(box.dataset.bound)return;box.dataset.bound='1';const i=Number(box.dataset.aiChapter);const hist=[];
    $$('[data-chip]',box).forEach(c=>c.onclick=()=>{const t=$('[data-ai-q]',box);t.value=c.dataset.chip+(c.dataset.chip.endsWith('：')?'\n':'');t.focus()});
    $('[data-ai-send]',box).onclick=async()=>{const q=$('[data-ai-q]',box).value.trim();if(!q)return;const log=$('.ai-log',box);const btn=$('[data-ai-send]',box);
      log.insertAdjacentHTML('beforeend',`<div class="ai-q">${esc(q)}</div><div class="ai-a">考えています…</div>`);const a=log.lastElementChild;btn.disabled=true;
      try{const r=await api('/ask',{method:'POST',body:JSON.stringify({site:siteId(),chapter:LESSONS[i].title,context:lessonContext(i),question:q,history:hist.slice(-6)})});
        a.textContent=r.answer;hist.push({role:'user',content:q},{role:'assistant',content:r.answer});$('[data-ai-q]',box).value='';markActivity();save();
      }catch(e){a.textContent='質問できませんでした：'+e.message}finally{btn.disabled=false}};
  });
}
