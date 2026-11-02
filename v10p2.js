/* v10 P2 — guess→SRS, export/import tiến độ, Lab tích hợp */
(function(){
/* 1) Đúng nhưng đánh dấu "Tôi đoán" → vẫn đưa vào ôn lặp lại (SRS) */
const _su=srsUpdate;srsUpdate=function(q,ok){return _su(q,ok&&!(s.guessed&&s.guessed[q.id]))};
if(!s.v10guess){const t=today();for(const id in (s.guessed||{})){const q=byId[id];if(!q||!s.guessed[id]||!s.checked[id]||!eq(q,s.answers[id]))continue;const r=s.srs[id];if(!r||r.mastered||r.due>t)s.srs[id]={streak:0,due:t,last:''}}s.v10guess=true;save()}
/* 2) Export / Import JSON */
const keys=()=>Object.keys(localStorage).filter(k=>k.startsWith('ccarf'));
function exportJSON(){const data={};keys().forEach(k=>data[k]=localStorage.getItem(k));const blob=new Blob([JSON.stringify({app:'ccarf',version:10,exported:new Date().toISOString(),data},null,1)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='ccarf-progress-'+today()+'.json';document.body.appendChild(a);a.click();a.remove()}
function importJSON(file){const fr=new FileReader();fr.onload=()=>{try{const o=JSON.parse(fr.result);if(!o||o.app!=='ccarf'||typeof o.data!=='object')throw new Error('File không phải bản xuất của web này');
  const ks=Object.keys(o.data).filter(k=>k.startsWith('ccarf'));if(!ks.length)throw new Error('File không có dữ liệu');ks.forEach(k=>{if(typeof o.data[k]!=='string')throw new Error('Sai định dạng: '+k);JSON.parse(o.data[k])});
  if(!confirm('Nhập tiến độ từ file ('+(o.exported||'?').slice(0,10)+')? Tiến độ hiện tại trên máy này sẽ bị GHI ĐÈ.'))return;
  keys().forEach(k=>localStorage.removeItem(k));ks.forEach(k=>localStorage.setItem(k,o.data[k]));location.reload()}catch(e){alert('Không nhập được: '+e.message)}};fr.readAsText(file)}
const act=$('resetAll')&&$('resetAll').parentNode;if(act){const d=document.createElement('div');d.className='actions';d.innerHTML='<button class="secondary" id="expJ" title="Lưu tiến độ học ra file JSON">⬇️ Xuất tiến độ</button><button class="secondary" id="impJ" title="Nạp tiến độ từ file JSON">⬆️ Nhập tiến độ</button><input type="file" id="impF" accept="application/json,.json" hidden>';act.after(d);
 $('expJ').onclick=exportJSON;$('impJ').onclick=()=>$('impF').click();$('impF').onchange=e=>{if(e.target.files[0])importJSON(e.target.files[0]);e.target.value=''}}
window.V10exportJSON=exportJSON;window.V10importJSON=importJSON;
/* 3) Lab tích hợp API → MCP → multi-agent */
const LB=window.V10LAB||{},GH='https://github.com/tuyenvu9903-glitch/khoa_hoc_15_day/tree/main/labs/integrated';
const STEPS=[['orders_core.py','0 · Lõi nghiệp vụ (business core)','Một Session giữ trạng thái: phải find_customer trước refund (prerequisite — điều kiện tiên quyết), lỗi trả về có cấu trúc {errorCategory, isRetryable}, hạn mức 500.000đ chặn bằng code chứ không bằng prompt.','D2 · D5'],
 ['step1_api_loop.py','1 · Agentic loop qua Messages API','Lặp gọi model; stop_reason == "tool_use" thì chạy tool và gửi tool_result (kèm is_error), dừng khi model trả lời xong ("end_turn") hoặc chạm max_turns.','D1 · D2'],
 ['step2_mcp_server.py','2 · Đóng gói thành MCP server','Cùng nghiệp vụ, đưa ra qua FastMCP: 3 tool (công cụ) + 1 resource (tài nguyên đọc) policy://refund; khai báo trong .mcp.json để Claude Code dùng.','D2 · D3'],
 ['step3_multi_agent.py','3 · Coordinator + subagent song song','Coordinator (agent điều phối) phát 2 subagent cùng lúc, mỗi cái nhận context tường minh và ít tool; lỗi của subagent thành "gaps" (chỗ thiếu) có cấu trúc, quá hạn mức thì escalate (chuyển người).','D1 · D5']];
function drawLab(card){card.innerHTML='<h2 style="margin-top:0">🔗 Lab tích hợp: API → MCP → Multi-agent</h2><p>Một nghiệp vụ hoàn tiền đi qua 3 tầng kiến trúc. Code thật nằm trong repo: <a href="'+GH+'" target="_blank" rel="noopener">labs/integrated/</a>; test chạy offline bằng <code>python -m unittest discover -s tests</code> (SDK giả, không cần API key).</p>'+
 STEPS.map(([f,t,d,dom])=>'<details class="scen"'+(f==='step1_api_loop.py'?' open':'')+'><summary><b>'+esc(t)+'</b> <small class="muted">'+dom+' · '+f+'</small></summary><p>'+esc(d)+'</p><pre class="code"><code>'+esc(LB[f]||'(chưa nạp p2data.js)')+'</code></pre></details>').join('')+
 '<h4>✅ Tự kiểm tra</h4><ul><li>Bỏ is_error trong tool_result ở bước 1 → model có còn biết lần gọi thất bại không?</li><li>Ở bước 3, subagent billing có thấy hội thoại của coordinator không? Vì sao phải truyền customer_key/order_id tường minh?</li><li>Vì sao hạn mức 500.000đ nằm trong code (tất định) thay vì trong system prompt (xác suất)?</li></ul>'}
if(window.V10tab)V10tab('tabInt','🔗 Lab tích hợp','intlab',drawLab);
const css=document.createElement('style');css.textContent='pre.code{background:#0f172a;color:#e2e8f0;padding:12px;border-radius:10px;overflow:auto;font-size:12.5px;max-height:420px}';document.head.appendChild(css);
render();
})();
