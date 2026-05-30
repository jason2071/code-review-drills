const escapeHtml = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const fmt = s => escapeHtml(s)
  .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
  .replace(/`([^`]+?)`/g,'<code>$1</code>')
  .replace(/\[REAL\]/g,'<span class="verdict v-real">จริง</span>')
  .replace(/\[FAKE\]/g,'<span class="verdict v-fake">มั่ว</span>')
  .replace(/\n\n/g,'</p><p>').replace(/\n/g,'<br>');

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
    html+=`<button class="reveal-btn" onclick="toggle('${id}')" id="btn-${id}">▸ ดูเฉลย</button><div class="answer" id="ans-${id}"><h4>เฉลย</h4><p>${fmt(p.answer)}</p></div></div>`;
  });
  html+=`<div class="foot">// จบหมวดนี้ — เลือกหมวดอื่นจาก sidebar ได้เลย · ${d.problems.length} โจทย์</div>`;
  main.innerHTML=html;
  d.problems.forEach((p,i)=>{
    const id=`${cat}-${i}`;
    const codeEl=main.querySelector(`[data-code="${id}"]`);if(codeEl)codeEl.textContent=p.code;
    if(p.ai){const aiEl=main.querySelector(`[data-ai="${id}"]`);if(aiEl)aiEl.textContent=p.ai;}
  });
  window.scrollTo(0,0);
}
window.toggle=function(id){
  const a=document.getElementById('ans-'+id),b=document.getElementById('btn-'+id);
  const open=a.classList.toggle('show');b.textContent=open?'▾ ซ่อนเฉลย':'▸ ดูเฉลย';
};
document.getElementById('menuBtn').onclick=()=>sidebar.classList.toggle('open');
render(DATA[0].cat);
