/* v10 — P1: Exam Guide v1.0, multiple-response, 6 scenarios, scenario-based mock (4 of 6) */
(function(){
const V=window.V10;if(!V)return;const G=V.guide,SC=V.sc,SCN={};SC.forEach(x=>SCN[x.id]=x);
for(const id in V.tag){if(byId[id]&&!byId[id].scenario)byId[id].scenario=V.tag[id]}
window.V10SCN=SCN;
window.V10hl=function(t,S){const e=esc(t);if(!S||!S.hl)return e;const ks=S.hl.map(esc).sort((a,b)=>b.length-a.length).map(k=>k.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'));
 return e.replace(new RegExp('(?<![A-Za-z0-9_À-ỹ])('+ks.join('|')+')(?![A-Za-z0-9_À-ỹ])','g'),'<mark class="kw">$1</mark>')};

const allQ=()=>{const seen=new Set(),o=[];Object.values(byId).forEach(q=>{if(!seen.has(q.id)){seen.add(q.id);o.push(q)}});return o};
const pool=sid=>allQ().filter(q=>q.scenario===sid);
// difficulty mix per 15-question scenario block: ~3 multiple-response, ~5 hard, rest standard
const TW={};(V.twins||[]).forEach((g,i)=>g.forEach(id=>TW[id]=i));window.V10TW=TW;
// near-duplicate guard: at most one question per twin group in one mock (used = groups already taken by earlier blocks)
function dedupe(a,used){const seen=new Set(used||[]),o=[];for(const q of a){const g=TW[q.id];if(g!=null){if(seen.has(g))continue;seen.add(g)}o.push(q)}return o}
function pickBlock(sid,n,used){const p0=shuf(pool(sid)),p=dedupe([...p0.filter(isMulti),...p0.filter(q=>!isMulti(q))],used),mr=p.filter(isMulti),hd=p.filter(q=>!isMulti(q)&&q.hard),st=p.filter(q=>!isMulti(q)&&!q.hard);
 const nMr=Math.min(mr.length,Math.round(n*0.2)),M=mr.slice(0,nMr),nHd=Math.max(0,Math.min(hd.length,Math.round(n*0.33)-M.filter(q=>q.hard).length));
 const out=[...M,...hd.slice(0,nHd)];for(const q of st){if(out.length>=n)break;out.push(q)}for(const q of p){if(out.length>=n)break;if(!out.includes(q))out.push(q)}
 return shuf(out).map(q=>q.id)}
window.V10pick=pickBlock;
const MODES={v10:{n:4,per:15,ms:120*60000,title:'Đề chuẩn v1.0 · 4/6 scenario · 60 câu / 120 phút'}};
window.V10MODES=MODES;
const _start=startMock;
startMock=function(k){if(k&&k.target)k=null;if(k==='rand')k='v10';
 let cfg=MODES[k],sids;
 if(!cfg&&typeof k==='string'&&k.startsWith('sc:')&&SCN[k.slice(3)]){cfg={per:15,ms:30*60000,title:'Theo scenario · '+SCN[k.slice(3)].titleEn+' · 15 câu / 30 phút'};sids=[k.slice(3)]}
 if(!cfg)return _start(k);
 sids=sids||shuf(SC.map(x=>x.id)).slice(0,cfg.n);const ids=[],secs=[];
 const used=new Set();sids.forEach(sid=>{const a=pickBlock(sid,cfg.per,used);a.forEach(id=>{if(TW[id]!=null)used.add(TW[id])});secs.push({sid,from:ids.length,n:a.length});ids.push(...a)});
 s.mock={k,ids,ans:{},perm:{},flags:{},i:0,start:Date.now(),submitted:false,ms:cfg.ms,title:cfg.title,sids,secs};save();render();toTop()};
function toTop(){try{scrollTo(0,0)}catch(e){}}
const secOf=(m,i)=>(m.secs||[]).find(x=>i>=x.from&&i<x.from+x.n);
window.scBox=function(q,m){const k=m.ids.indexOf(q.id),sec=secOf(m,k);if(!sec)return '';const S=SCN[sec.sid],no=m.secs.indexOf(sec)+1,first=k===sec.from;
 return '<details class="scbox"'+(first?' open':'')+'><summary>📂 Scenario '+no+'/'+m.secs.length+': <b>'+esc(S.titleEn)+'</b> · '+(ptLocked()?'question ':'câu ')+(k-sec.from+1)+'/'+sec.n+'</summary><p>'+V10hl(S.ctxEn,S)+'</p>'+(s.mode==='en'||ptLocked()?'':'<p class="vi">'+V10hl(S.ctxVi,S)+'</p>')+'</details>'};
const scaled=p=>Math.round(100+900*p);
window.V10scaled=scaled;
function resultExtra(m){const n=m.ids.length,ok=m.ids.filter(id=>eq(byId[id],m.ans[id])).length,p=n?ok/n:0,sc=scaled(p);
 let h='<div class="card v10res"><h3 style="margin-top:0">🎯 Điểm quy đổi ước lượng: '+sc+' / 1000 '+(sc>=G.pass_?'<span class="ok">≥ 720</span>':'<span class="bad">&lt; 720</span>')+'</h3><p class="muted">⚠️ Chỉ là ước lượng gần đúng: quy đổi tuyến tính 100 + 900 × tỉ lệ đúng. Exam Guide v1.0 chỉ nói điểm được báo trên thang 100–1.000, đậu từ 720 và có quy đổi để cân bằng độ khó giữa các đề — Anthropic không công bố công thức, nên con số này không dự đoán chắc chắn kết quả thật.</p>';
 if(m.secs&&m.secs.length){h+='<table class="ds"><tr><th>Scenario</th><th>Đúng</th><th>%</th></tr>'+m.secs.map(x=>{const a=m.ids.slice(x.from,x.from+x.n),o=a.filter(id=>eq(byId[id],m.ans[id])).length;return '<tr><td>'+esc(SCN[x.sid].titleEn)+'<span class="vi">'+esc(SCN[x.sid].titleVi)+'</span></td><td>'+o+'/'+a.length+'</td><td>'+Math.round(o/a.length*100)+'%</td></tr>'}).join('')+'</table>'}
 const by={};m.ids.forEach(id=>{const q=byId[id];by[q.domain]=by[q.domain]||[0,0];by[q.domain][1]++;if(eq(q,m.ans[id]))by[q.domain][0]++});
 h+='<p><b>Theo domain</b> (giống score report: % đúng theo domain, không dùng để quyết định đậu/trượt): '+Object.keys(by).sort().map(d=>d+' '+by[d][0]+'/'+by[d][1]+' ('+Math.round(by[d][0]/by[d][1]*100)+'%)').join(' · ')+'</p>';
 const mrN=m.ids.filter(id=>isMulti(byId[id])),mrOk=mrN.filter(id=>eq(byId[id],m.ans[id])).length;if(mrN.length)h+='<p class="muted">Câu chọn nhiều (multiple-response): '+mrOk+'/'+mrN.length+' — chấm tất cả hoặc không có điểm.</p>';
 return h+'</div>'}
const _draw=drawMock;
drawMock=function(){_draw.apply(this,arguments);const v=$('mockView'),m=s.mock;
 if(!m){const top=document.createElement('div');top.className='v10menu';
  const es=s.examStats||{},st=k=>{const e=es[k];return e&&e.last?'<br><small>Lần gần nhất: '+e.last.ok+'/'+e.last.n+' ('+e.last.pct+'%, ≈'+scaled(e.last.pct/100)+') · '+e.hist.length+' lần</small>':'<br><small class="muted">Chưa thi</small>'};
  top.innerHTML='<div class="excard v10main"><button class="exstart" id="mockStartV10">🆕 Đề chuẩn v1.0</button> <span class="muted">Rút ngẫu nhiên 4 trong 6 scenario, mỗi scenario 15 câu (≈3 câu chọn nhiều, ≈5 câu khó, còn lại mức chuẩn) · 60 câu / 120 phút</span>'+st('v10')+'</div>';
  v.insertBefore(top,v.querySelector('.exlist'));top.querySelector('#mockStartV10').onclick=()=>startMock('v10');}
 else if(m.submitted){const rs=v.querySelector('.res-sticky');if(rs){const d=document.createElement('div');d.innerHTML=resultExtra(m);rs.after(d.firstChild)}}};
const _sub=submitMock;
submitMock=function(auto){const m=s.mock;if(m&&!m.submitted){const t={};m.ids.forEach(id=>{const q=byId[id];const r=t[q.ts]=t[q.ts]||[0,0];r[1]++;if(eq(q,m.ans[id]))r[0]++});const A=s.tsMock=s.tsMock||{};for(const k in t){A[k]=A[k]||[0,0];A[k][0]+=t[k][0];A[k][1]+=t[k][1]}}return _sub.apply(this,arguments)};
// study view: show scenario + "choose N" tag
const _render=render;
render=function(){_render.apply(this,arguments);try{if((s.view==='study'||s.view==='review')){const q=cur();if(q&&q.scenario&&SCN[q.scenario]){$('kwTag').textContent='Guide '+q.ts+' · '+q.kw+' · 📂 '+q.scenario+' '+SCN[q.scenario].titleEn}}}catch(e){}};
const css=document.createElement('style');css.textContent='.scbox{border:1px solid var(--line);border-radius:12px;padding:8px 12px;margin:6px 0 10px;background:rgba(15,110,140,.05)}.scbox summary{cursor:pointer}.scbox p{margin:6px 0}.v10menu{margin:8px 0}.v10main{border:2px solid var(--vi)!important}.v10res{margin:12px 0}.v10res .ok{color:#15803d}.v10res .bad{color:#b91c1c}';document.head.appendChild(css);
render();
})();
/* v10 — scenarios tab + Exam Guide v1.0 panel */
(function(){
const V=window.V10;if(!V)return;const G=V.guide,SC=V.sc,SCN=window.V10SCN;
const DN={D1:'Agentic Architecture & Orchestration',D2:'Tool Design & MCP Integration',D3:'Claude Code Configuration & Workflows',D4:'Prompt Engineering & Structured Output',D5:'Context Management & Reliability'};
window.V10tab=function(id,label,view,draw){const tb=document.querySelector('.tabs');if(!tb||$(id))return;const b=document.createElement('button');b.id=id;b.textContent=label;tb.appendChild(b);
 const card=document.createElement('div');card.id=view+'View';card.className='card hidden';$('notesView').after(card);
 (window.V10views=window.V10views||{})[view]={b,card,draw};b.onclick=()=>{if(ptLocked())return;s.view=view;save();render();scrollTo(0,0)}};
const _tabs=tabs;tabs=function(){_tabs.apply(this,arguments);const vs=window.V10views||{};for(const k in vs){const on=s.view===k;vs[k].b.classList.toggle('on',on);vs[k].card.classList.toggle('hidden',!on);if(on)vs[k].draw(vs[k].card)}
 const mine=!!vs[s.view];const lab=$('lab');if(lab)lab.style.display=mine?'none':''};
function guideHtml(){const w=G.weights;return '<details class="g10" open><summary><b>📘 Exam Guide v'+G.version+' ('+G.effective+') — cấu trúc bài thi</b></summary><table class="ds">'+
 [['Exam code',G.code],['Số câu (items)',G.items],['Dạng câu','Multiple-choice (chọn một) và multiple-response (chọn nhiều); mỗi câu ghi rõ phải chọn bao nhiêu đáp án'],['Cấu trúc','4 scenario rút ngẫu nhiên từ bộ 6 scenario'],['Thời gian',G.minutes+' phút'],['Điểm đậu','Scaled score (điểm quy đổi) 720 trên thang 100–1.000'],['Kết quả','Đậu/trượt + điểm quy đổi, kèm % đúng theo từng domain (% theo domain không dùng để quyết định đậu/trượt)'],['Trọng số','D1 '+w.D1+'% · D2 '+w.D2+'% · D3 '+w.D3+'% · D4 '+w.D4+'% · D5 '+w.D5+'%'],['Lệ phí / hiệu lực',G.fee+' · '+G.validity],['Thi lại','Chờ 14 / 30 / 90 ngày sau lần trượt 1 / 2 / 3; tối đa 4 lần trong 12 tháng']].map(r=>'<tr><td><b>'+r[0]+'</b></td><td>'+esc(String(r[1]))+'</td></tr>').join('')+
 '</table><p class="muted">Nguồn: <a href="'+G.src+'" target="_blank" rel="noopener">Claude Certified Architect – Foundations Exam Guide, Version 1.0</a> (bản PDF công khai). Web này là tài liệu ôn tự biên soạn, không phải đề thật.</p></details>'}
window.V10guideHtml=guideHtml;
function drawScen(card){const st=sid=>{const p=Object.values(byId).filter(q=>q.scenario===sid);const u=[...new Map(p.map(q=>[q.id,q])).values()];return u};
 let h='<h2 style="margin-top:0">📂 6 Scenario của Exam Guide v1.0</h2>'+guideHtml()+'<p class="muted">Đoạn <b>Bối cảnh</b> lấy nguyên văn từ Exam Guide v1.0. Phần <b>Kiến trúc / Yêu cầu / Ràng buộc</b> là minh họa do khóa học tự viết để luyện tư duy, không phải nội dung chính thức.</p><span class="kwleg"><mark class="kw">Vàng</mark> = keyword nên để ý (tool/thành phần, ràng buộc/giới hạn, cụm báo hiệu đề thi)</span>';
 SC.forEach((S,k)=>{const qs=st(S.id),inBank=qs.filter(q=>BANK.has(q.id)),by={};qs.forEach(q=>by[q.domain]=(by[q.domain]||0)+1);
  h+='<details class="scen" id="scen_'+S.id+'"><summary><b>Scenario '+(k+1)+': '+esc(S.titleEn)+'</b><span class="vi">'+esc(S.titleVi)+'</span><small class="muted">'+qs.length+' câu liên kết · '+qs.filter(isMulti).length+' câu chọn nhiều · '+qs.filter(q=>q.hard).length+' câu khó · Primary domains: '+S.dom.join(', ')+'</small></summary>'+
  '<h4>Bối cảnh (Exam Guide v1.0)</h4><div class="enblk"><span class="lbadge">EN</span><p>'+V10hl(S.ctxEn,S)+'</p></div><div class="viblk"><span class="lbadge vb">VI</span><p>'+V10hl(S.ctxVi,S)+'</p></div>'+
  '<p class="muted">Primary domains: '+S.dom.map(d=>d+' '+DN[d]).join(' · ')+'</p>'+
  '<h4>🏗 Kiến trúc hệ thống (minh họa)</h4><ul>'+S.arch.map(x=>'<li>'+V10hl(x,S)+'</li>').join('')+'</ul>'+
  '<h4>✅ Yêu cầu</h4><ul>'+S.req.map(x=>'<li>'+V10hl(x,S)+'</li>').join('')+'</ul>'+
  '<h4>⛔ Ràng buộc</h4><ul>'+S.cons.map(x=>'<li>'+V10hl(x,S)+'</li>').join('')+'</ul>'+
  '<h4>🔗 Câu hỏi liên kết ('+qs.length+': '+Object.keys(by).sort().map(d=>d+' '+by[d]).join(' · ')+')</h4><div class="actions" data-sc="'+S.id+'"></div>'+
  '<p class="muted">'+inBank.length+' câu trong ngân hàng học theo ngày (bấm để mở), '+(qs.length-inBank.length)+' câu nằm trong Đề 1–4.</p><div class="sclinks">'+inBank.sort((a,b)=>a.day-b.day).map(q=>'<a href="#" data-id="'+q.id+'">'+(isMulti(q)?'☑ ':'')+'Ngày '+q.day+' · '+q.domain+' · '+q.ts+' · #'+q.id+'</a>').join('')+'</div></details>'});
 card.innerHTML=h;card.querySelectorAll('.sclinks a').forEach(a=>a.onclick=e=>{e.preventDefault();const q=byId[a.dataset.id];s.view='study';s.domain='all';$('domain').value='all';s.day=q.day;s.index=list().indexOf(q);sel=null;prac=null;newPerm(q);save();render();toQ()});
 if(window.V10scBtns)card.querySelectorAll('.actions[data-sc]').forEach(window.V10scBtns)}
V10tab('tabScen','📂 6 Scenario','scen',drawScen);
const css=document.createElement('style');css.textContent='.scen{border:1px solid var(--line);border-radius:14px;padding:10px 14px;margin:10px 0}.scen summary{cursor:pointer}.scen summary small{display:block;margin-top:4px}.scen h4{margin:12px 0 4px}.sclinks{display:flex;flex-wrap:wrap;gap:6px;max-height:240px;overflow:auto}.sclinks a{font-size:13px;border:1px solid var(--line);border-radius:8px;padding:2px 8px;text-decoration:none}.g10{border:1px solid var(--vi);border-radius:14px;padding:10px 14px;margin:10px 0}.g10 summary{cursor:pointer}';document.head.appendChild(css);
render();
})();

(function(){const c=document.createElement('style');c.textContent='mark.kw{background:#fff3a3;color:inherit;padding:0 3px;border-radius:4px;font-style:normal;font-weight:inherit;box-decoration-break:clone;-webkit-box-decoration-break:clone}mark.kw code,mark.kw *{font-weight:inherit}.scen{line-height:1.7;font-size:16px}.scen p,.scen li{line-height:1.7;margin:0}.scen li{margin:4px 0}.scen summary .vi{display:block!important;margin-top:2px;border:0;padding:0;font-weight:500}.enblk,.viblk{position:relative;border-radius:10px;padding:10px 14px;margin:8px 0 12px}.enblk{background:#f8fafc;border-left:4px solid #94a3b8}.viblk{background:#e8f5f8;border-left:4px solid #0a5a73;color:#0a5a73}.viblk p{color:#0a5a73}.lbadge{display:inline-block;font-size:11px;font-weight:700;letter-spacing:.5px;padding:1px 7px;border-radius:6px;background:#64748b;color:#fff;margin-bottom:6px}.lbadge.vb{background:#0a5a73}.vi{line-height:1.7}@media (prefers-color-scheme:dark){.enblk{background:#1e293b}.viblk{background:#0f2f38;color:#9be3f2}.viblk p{color:#9be3f2}mark.kw{background:#5c5420;color:#fff}}.kwleg{display:inline-block;font-size:13px;margin:4px 0 8px}';document.head.appendChild(c)})();
