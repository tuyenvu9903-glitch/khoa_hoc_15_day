/* v10 P3 — đề rút gọn 30 câu/60 phút, thi theo scenario, thống kê theo task statement, thuật ngữ EN–VI */
(function(){
const V=window.V10;if(!V)return;const SC=V.sc,TS=V.ts,M=window.V10MODES;
M.half={n:2,per:15,ms:60*60000,title:'Đề rút gọn · 2/6 scenario · 30 câu / 60 phút'};
/* nút thi theo scenario (dùng ở menu thi thử và tab 6 Scenario) */
window.V10scBtns=el=>{const sid=el.dataset.sc;el.innerHTML='<button class="secondary" data-go="sc:'+sid+'">▶ Thi riêng scenario này · 15 câu / 30 phút</button>';el.querySelector('button').onclick=()=>{s.view='mock';save();startMock('sc:'+sid)}};
const _draw=drawMock;
drawMock=function(){_draw.apply(this,arguments);const m=s.mock,top=document.querySelector('#mockView .v10menu');if(m||!top)return;
 const es=s.examStats||{},st=k=>{const e=es[k];return e&&e.last?' <small>· lần gần nhất '+e.last.ok+'/'+e.last.n+' ('+e.last.pct+'%)</small>':''};
 const d=document.createElement('div');d.innerHTML='<div class="excard"><button class="exstart" id="mockHalf">⏳ Đề rút gọn</button> <span class="muted">2 scenario ngẫu nhiên × 15 câu · 30 câu / 60 phút (cùng tỉ lệ độ khó với đề chuẩn)</span>'+st('half')+'</div>'+
  '<div class="excard"><b>🎬 Thi theo scenario</b> <span class="muted">15 câu / 30 phút trong một scenario</span><div class="scgrid">'+SC.map((S,i)=>'<button class="secondary" data-sc="'+S.id+'">'+(i+1)+'. '+esc(S.titleEn)+st('sc:'+S.id)+'</button>').join('')+'</div></div>';
 top.appendChild(d);$('mockHalf').onclick=()=>startMock('half');d.querySelectorAll('[data-sc]').forEach(b=>b.onclick=()=>startMock('sc:'+b.dataset.sc))};
/* thống kê lỗi theo task statement */
const _st=drawStats;
drawStats=function(){_st.apply(this,arguments);const box=$('statsView');if(!box)return;const R={};
 for(const id in (s.checked||{})){const q=byId[id];if(!q||!q.ts||!s.checked[id])continue;const r=R[q.ts]=R[q.ts]||{n:0,ok:0,g:0,mn:0,mok:0};r.n++;if(eq(q,s.answers[id])){r.ok++;if(s.guessed[id])r.g++}}
 const A=s.tsMock||{};for(const k in A){const r=R[k]=R[k]||{n:0,ok:0,g:0,mn:0,mok:0};r.mn+=A[k][1];r.mok+=A[k][0]}
 const ks=Object.keys(TS).sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));
 const rate=r=>{const n=r.n+r.mn,w=(r.n-r.ok)+(r.mn-r.mok);return n?w/n:-1};
 const rows=ks.map(k=>({k,r:R[k]||{n:0,ok:0,g:0,mn:0,mok:0}}));const worst=rows.filter(x=>rate(x.r)>0).sort((a,b)=>rate(b.r)-rate(a.r)).slice(0,5);
 let h='<h2>🎯 Tỉ lệ sai theo task statement (Exam Guide v0.2)</h2><p class="muted">Gộp câu đã chấm khi học + mọi lần thi thử. “Sai” = trả lời sai; câu đúng nhờ đoán được tính riêng.</p>';
 if(worst.length)h+='<p><b>Cần ôn nhất:</b> '+worst.map(x=>x.k+' ('+Math.round(rate(x.r)*100)+'% sai)').join(' · ')+'</p>';
 h+='<table class="ds tsstat"><tr><th>Task</th><th>Nội dung</th><th>Học: đúng/đã làm</th><th>Đoán</th><th>Thi thử: đúng/câu</th><th>Tỉ lệ sai</th></tr>'+rows.map(({k,r})=>{const e=rate(r);return '<tr><td><b>'+k+'</b></td><td>'+esc(TS[k])+'</td><td>'+r.ok+'/'+r.n+'</td><td>'+r.g+'</td><td>'+r.mok+'/'+r.mn+'</td><td'+(e>=0.4?' class="bad"':'')+'>'+(e<0?'—':Math.round(e*100)+'%')+'</td></tr>'}).join('')+'</table>';
 const d=document.createElement('div');d.className='tsbox';d.innerHTML=h;box.appendChild(d)};
/* thuật ngữ EN–VI */
const GL=window.V10GLOSS||[];
function drawGloss(card){const f=card.dataset.f||'',dom=card.dataset.d||'all';const nf=f.toLowerCase();
 const list=GL.filter(g=>(dom==='all'||g.d===dom)&&(!nf||(g.en+' '+g.vi+' '+g.ex).toLowerCase().includes(nf)));
 card.innerHTML='<h2 style="margin-top:0">📖 Thuật ngữ EN–VI ('+GL.length+')</h2><p class="muted">Từ khóa giữ tiếng Anh như trong đề; phần () là giải thích ngắn cho người mới; mỗi thuật ngữ có ví dụ thực tế.</p><div class="actions"><input id="glQ" placeholder="Tìm thuật ngữ…" value="'+esc(f)+'" style="flex:1;min-width:200px;padding:8px;border-radius:10px;border:1px solid var(--line)"><select id="glD">'+['all','D1','D2','D3','D4','D5','Thi'].map(x=>'<option value="'+x+'"'+(x===dom?' selected':'')+'>'+(x==='all'?'Tất cả':x==='Thi'?'Về kỳ thi':x)+'</option>').join('')+'</select></div>'+
  '<div class="gl">'+list.map(g=>'<div class="glr"><b>'+esc(g.en)+'</b> <span class="muted">· '+g.d+'</span><div class="vi">('+esc(g.vi)+')</div><div class="glex">💡 '+esc(g.ex)+'</div></div>').join('')+(list.length?'':'<p class="muted">Không có kết quả.</p>')+'</div>';
 const q=card.querySelector('#glQ');q.oninput=()=>{card.dataset.f=q.value;drawGloss(card);const n=card.querySelector('#glQ');n.focus();n.setSelectionRange(n.value.length,n.value.length)};
 card.querySelector('#glD').onchange=e=>{card.dataset.d=e.target.value;drawGloss(card)}}
if(window.V10tab)V10tab('tabGloss','📖 Thuật ngữ','gloss',drawGloss);
const css=document.createElement('style');css.textContent='.scgrid{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}.tsbox{margin-top:18px}.tsstat td.bad{color:#b91c1c;font-weight:700}.gl{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px;margin-top:10px}.glr{border:1px solid var(--line);border-radius:12px;padding:10px 12px}.glex{font-size:14px;margin-top:4px}';document.head.appendChild(css);
render();
})();
