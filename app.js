const escapeHtml = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const inlineFmt = s => escapeHtml(s)
  .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
  .replace(/`([^`]+?)`/g,'<code>$1</code>')
  .replace(/\[REAL\]/g,'<span class="verdict v-real">จริง</span>')
  .replace(/\[FAKE\]/g,'<span class="verdict v-fake">มั่ว</span>');

// ---- tiny self-contained syntax highlighter (go / sql / ts / css) ----
const KW = {
  go:'func var const type struct interface map chan go defer return if else for range switch case default select package import break continue fallthrough goto nil true false iota make new append len cap copy delete panic recover error string bool byte rune int int8 int16 int32 int64 uint uint8 uint16 uint32 uint64 uintptr float32 float64',
  ts:'const let var function return if else for while do switch case default break continue new class extends implements interface type enum import export from as await async yield typeof instanceof in of this null undefined void true false readonly static public private protected get set string number boolean any unknown never object Promise Array',
  sql:'SELECT INSERT UPDATE DELETE FROM WHERE AND OR NOT NULL IS IN LIKE BETWEEN ORDER BY GROUP HAVING LIMIT OFFSET JOIN LEFT RIGHT INNER OUTER FULL CROSS ON AS DISTINCT COUNT SUM AVG MIN MAX CREATE TABLE INDEX VIEW PRIMARY KEY FOREIGN REFERENCES CONSTRAINT UNIQUE CHECK DEFAULT CASCADE RESTRICT SET VALUES INTO RETURNING WITH UNION ALL EXISTS CASE WHEN THEN ELSE END ASC DESC USING GIST EXCLUDE GENERATED ALWAYS IDENTITY BEGIN COMMIT ROLLBACK ALTER ADD COLUMN DROP INT INTEGER BIGINT SMALLINT TEXT VARCHAR CHAR NUMERIC DECIMAL FLOAT DOUBLE BOOLEAN BOOL DATE TIMESTAMP TIMESTAMPTZ DATERANGE JSONB JSON UUID SERIAL PK FK',
  css:'display flex grid block none inline inline-block absolute relative fixed sticky auto hidden visible scroll center column row wrap nowrap solid dashed dotted margin padding border width height color background position top left right bottom overflow transform transition important min-width max-width min-height max-height flow-root'
};
const KWSET = {};
for (const k in KW) KWSET[k] = new Set(KW[k].split(' '));
const COMMENT = {
  go:'\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/',
  ts:'\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/',
  sql:'--[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/',
  css:'\\/\\*[\\s\\S]*?\\*\\/'
};
function detectLang(code, fb){
  if(/\b(SELECT|INSERT|UPDATE|DELETE|CREATE\s+TABLE|REFERENCES|PRIMARY\s+KEY|FOREIGN\s+KEY|FROM|WHERE|JOIN|ON\s+DELETE)\b/i.test(code)) return 'sql';
  if(/\bfunc\b|\bpackage\b|\bdefer\b|\bchan\b|:=|\bfmt\./.test(code)) return 'go';
  if(/@media|[.#][\w-]+\s*\{|^\s*[\w-]+\s*:\s*[^;\n]+;/m.test(code)) return 'css';
  if(/=>|\b(const|let|interface|useEffect|useState|async|await|import|export)\b/.test(code)) return 'ts';
  return fb || 'go';
}
function catLang(cat){
  if(cat.startsWith('go-') || cat==='unit-test' || cat==='system-design') return 'go';
  if(cat==='sql' || cat==='db-design' || cat==='db-modeling') return 'sql';
  if(cat==='css') return 'css';
  return 'ts';
}
function highlight(code, lang){
  lang = KWSET[lang] ? lang : 'go';
  const set = KWSET[lang], ci = lang==='sql';
  const re = new RegExp('('+COMMENT[lang]+')|("(?:[^"\\\\]|\\\\.)*"|\'(?:[^\'\\\\]|\\\\.)*\'|`(?:[^`\\\\]|\\\\.)*`)|(#[0-9a-fA-F]{3,8}\\b|\\b\\d[\\w.]*)|([A-Za-z_][\\w-]*)','g');
  let out='', last=0, m;
  while((m = re.exec(code))){
    out += escapeHtml(code.slice(last, m.index));
    let cls;
    if(m[1]) cls='c-cmt';
    else if(m[2]) cls='c-str';
    else if(m[3]) cls='c-num';
    else { const key = ci ? m[4].toUpperCase() : m[4];
      cls = set.has(key) ? 'c-kw' : (code[re.lastIndex]==='(' ? 'c-fn' : null); }
    out += cls ? `<span class="${cls}">${escapeHtml(m[0])}</span>` : escapeHtml(m[0]);
    last = re.lastIndex;
  }
  return out + escapeHtml(code.slice(last));
}

const fmt = (s, lang) => {
  // pull block-level chunks (code fences, md tables) out first so their layout survives.
  // \x01 sentinel survives escapeHtml + the inline replaces and never collides with text.
  const blocks = [];
  const stash = html => `\x01${blocks.push(html)-1}\x01`;
  s = s.replace(/```\r?\n?([\s\S]*?)```/g,(_,code)=>{
    code = code.replace(/\r?\n$/,'');
    return stash(`<pre class="code">${highlight(code, detectLang(code, lang))}</pre>`);
  });
  // markdown tables: header row, |---| separator, then >=1 body rows
  s = s.replace(/^\|(.+)\|[ \t]*\r?\n\|[ \t:|-]+\|[ \t]*\r?\n((?:\|.*\|[ \t]*\r?\n?)+)/gm,(_,head,body)=>{
    const cells = r => r.split('|').slice(1,-1).map(c=>inlineFmt(c.trim()));
    const th = cells('|'+head+'|').map(c=>`<th>${c}</th>`).join('');
    const trs = body.trimEnd().split(/\r?\n/).map(r=>`<tr>${cells(r).map(c=>`<td>${c}</td>`).join('')}</tr>`).join('');
    return stash(`<table class="atable"><thead><tr>${th}</tr></thead><tbody>${trs}</tbody></table>`);
  });
  s = inlineFmt(s).replace(/\n\n/g,'</p><p>').replace(/\n/g,'<br>');
  // restore blocks, breaking out of the wrapping <p>
  s = s.replace(/\x01(\d+)\x01/g,(_,i)=>`</p>${blocks[+i]}<p>`);
  return s
    .replace(/<br>\s*<\/p>(<pre|<table)/g,'</p>$1')
    .replace(/(<\/pre>|<\/table>)<p>\s*<br>/g,'$1<p>')
    .replace(/<p>\s*<\/p>/g,'');
};

const nav=document.getElementById('nav'),main=document.getElementById('main'),sidebar=document.getElementById('sidebar');
const groups=[...new Set(DATA.map(d=>d.group))];
groups.forEach(g=>{
  const wrap=document.createElement('div');wrap.className='navgroup';
  const p=document.createElement('p');p.textContent=g;wrap.appendChild(p);
  DATA.filter(d=>d.group===g).forEach(d=>{
    const b=document.createElement('button');b.className='navitem';b.dataset.cat=d.cat;
    b.innerHTML=`<span>${escapeHtml(d.title.replace(/^.*?·\s*/,''))}</span><span class="ct">${d.problems.length}</span>`;
    b.onclick=()=>{render(d.cat);if(window.innerWidth<=860)sidebar.classList.remove('open');};
    wrap.appendChild(b);
  });
  nav.appendChild(wrap);
});
function render(cat){
  const d=DATA.find(x=>x.cat===cat);
  const lang=catLang(cat);
  document.querySelectorAll('.navitem').forEach(n=>n.classList.toggle('active',n.dataset.cat===cat));
  let html=`<div class="crumb">${escapeHtml(d.group)} / <b>${escapeHtml(d.title)}</b></div>`;
  html+=`<h2 class="section">${escapeHtml(d.title)}</h2>`;
  html+=`<p class="section-desc">${escapeHtml(d.desc)}</p>`;
  html+=`<div class="tip"><b>วิธีใช้:</b> วิเคราะห์เองก่อน — โจทย์ <b>🤖 ตัดสิน AI</b> ให้แยกว่า AI ตอบข้อไหนจริง/มั่ว แล้วค่อยกดเฉลย (active recall จำแม่นกว่าอ่านเฉยๆ)</div>`;
  d.problems.forEach((p,i)=>{
    const tagClass=p.type==='find'?'find':p.type==='judge'?'judge':'concept';
    const tagText=p.type==='find'?'🔍 หาบั๊ก':p.type==='judge'?'🤖 ตัดสิน AI':'💡 ออกแบบ/อธิบาย';
    const id=`${cat}-${i}`;
    html+=`<div class="card"><div class="card-head"><span class="qnum">${String(i+1).padStart(2,'0')}</span><h3>${escapeHtml(p.title)}</h3><span class="tag ${tagClass}">${tagText}</span></div><pre class="code" data-code="${id}"></pre>`;
    if(p.ai)html+=`<div class="ai-block"><div class="ai-label">คำตอบที่ AI ให้ — จริงหรือมั่ว?</div><div class="ai-text" data-ai="${id}"></div></div>`;
    const note=p.note?`<div class="concept-note"><span class="cn-label">💡 แนวคิด</span><p>${fmt(p.note,lang)}</p></div>`:'';
    html+=`<button class="reveal-btn" onclick="toggle('${id}')" id="btn-${id}">▸ ดูเฉลย</button><div class="answer" id="ans-${id}"><h4>เฉลย</h4><p>${fmt(p.answer,lang)}</p>${note}</div></div>`;
  });
  html+=`<div class="foot">// จบหมวดนี้ — เลือกหมวดอื่นจาก sidebar ได้เลย · ${d.problems.length} โจทย์</div>`;
  main.innerHTML=html;
  d.problems.forEach((p,i)=>{
    const id=`${cat}-${i}`;
    const codeEl=main.querySelector(`[data-code="${id}"]`);if(codeEl)codeEl.innerHTML=highlight(p.code, lang);
    if(p.ai){const aiEl=main.querySelector(`[data-ai="${id}"]`);if(aiEl)aiEl.textContent=p.ai;}
  });
  window.scrollTo(0,0);
  try{localStorage.setItem('crd-cat',cat);}catch(e){}
  if(location.hash.slice(1)!==cat) history.replaceState(null,'','#'+cat);
}
window.toggle=function(id){
  const a=document.getElementById('ans-'+id),b=document.getElementById('btn-'+id);
  const open=a.classList.toggle('show');b.textContent=open?'▾ ซ่อนเฉลย':'▸ ดูเฉลย';
};
document.getElementById('menuBtn').onclick=()=>sidebar.classList.toggle('open');
const valid=c=>DATA.some(d=>d.cat===c);
let saved;try{saved=localStorage.getItem('crd-cat');}catch(e){}
const initial=[location.hash.slice(1),saved].find(valid)||DATA[0].cat;
render(initial);
window.addEventListener('hashchange',()=>{const c=location.hash.slice(1);if(valid(c)&&c!==document.querySelector('.navitem.active')?.dataset.cat)render(c);});
