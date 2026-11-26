/* Hysteria's Cure — Question Bank manager (replacement) */
import { auth, database } from "./firebase-client.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";
import { ref, push, set, update, remove, onValue } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-database.js";
import { createCollapseVariant, formatVariantForCopy } from "./algorithm-collapse.js";

const ADMIN_UID = "RtaLjBtKSUgRnWB7ag06CLRCStM2";
const HAI_PENDING_URL = "https://hai-api-l7js.onrender.com/questions/pending";
const MATERIALS_API_URL = "https://iltnklpuyifvnojiqrkh.supabase.co/functions/v1/manage-learning-materials";
const EXTRACT_MATERIAL_URL = "https://iltnklpuyifvnojiqrkh.supabase.co/functions/v1/extract-materials-text";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_wMSMx1WpGWn7Tk0zBUDAhg_Jlj8RWDO";
const $ = id => document.getElementById(id);
const nodes = ["app-content","admin-email","logout-button","question-form","form-heading","subject","topic","question","difficulty","sourceType","sourceDetails","syllabusObjective","option0","option1","option2","option3","answerIndex","verified","explanation","save-button","cancel-edit","status","search","question-count","question-list"];
const missing = nodes.filter(id => !$(id));
if (missing.length) throw new Error("Question Bank missing elements: " + missing.join(", "));
let admin = null, bank = {}, editId = null, busy = false, stop = null;
const materialUploadForm = document.getElementById("material-upload-form");
const materialFileInput = document.getElementById("material-file");
const uploadButton = document.getElementById("upload-button");
const uploadStatus = document.getElementById("upload-status");
const materialsList = document.getElementById("materials-list");
const refreshMaterialsButton = document.getElementById("refresh-materials");
const pendingButton = document.createElement("button");
pendingButton.type = "button";
pendingButton.textContent = "Send to pending review";
pendingButton.className = $("save-button").className;
pendingButton.style.marginLeft = "8px";
$("save-button").insertAdjacentElement("afterend", pendingButton);
const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function message(text, error=false) { $("status").textContent=text; $("status").style.color=error?"var(--qb-danger)":"var(--qb-success)"; }
function resetForm(){ $("question-form").reset(); $("difficulty").value="3"; $("answerIndex").value="0"; editId=null; $("form-heading").textContent="Add a question"; $("save-button").textContent="Save question"; $("cancel-edit").style.display="none"; }
function validate(data){return data.subject&&data.topic&&data.question&&data.options.length===4&&data.options.every(o=>o.trim())&&data.explanation&&Number.isInteger(data.difficulty)&&data.difficulty>=1&&data.difficulty<=7&&Number.isInteger(data.answerIndex)&&data.answerIndex>=0&&data.answerIndex<=3;}
function collect(){return {subject:$('subject').value.trim(),topic:$('topic').value.trim(),question:$('question').value.trim(),difficulty:Number($('difficulty').value),sourceType:$('sourceType').value,sourceDetails:$('sourceDetails').value.trim(),syllabusObjective:$('syllabusObjective').value.trim(),verified:$('verified').checked,options:[0,1,2,3].map(i=>$(`option${i}`).value.trim()),answerIndex:Number($('answerIndex').value),explanation:$('explanation').value.trim()};}
const variantCounters = new Map();
function render(){
  const search=$('search').value.trim().toLowerCase();
  const entries=Object.entries(bank)
    .filter(([id,q])=>q&&typeof q==='object'&&([id,q.subject,q.topic,q.question,...(q.options||[])].join(' ').toLowerCase().includes(search)))
    .sort((a,b)=>String(b[1].createdAt||'').localeCompare(String(a[1].createdAt||'')));
  $('question-count').textContent=`${entries.length} shown · ${Object.keys(bank).length} total`;
  if(!entries.length){$('question-list').innerHTML='<div class="empty-list">No questions match your search.</div>';return;}
  $('question-list').innerHTML=entries.map(([id,q])=>{
    const validOptions=Array.isArray(q.options)?q.options:[];
    const status=q.verified===true?'Published':'Unverified · excluded from practice';
    return `<article class="qb-question" data-id="${esc(id)}">
      <div class="question-card-head">
        <div class="question-tags"><span class="section-tag">${esc(q.subject||'No subject')}</span><span class="section-tag">${esc(q.topic||'No topic')}</span><span class="section-tag">Level ${esc(q.difficulty||'?')}</span><span class="section-tag">${status}</span></div>
        <button class="btn collapse-toggle" type="button" aria-expanded="false">Show details</button>
      </div>
      <p class="question-preview">${esc(q.question||'Question text unavailable')}</p>
      <div class="question-details" hidden>
        <ol type="A" class="question-options">${validOptions.map((o,i)=>`<li>${i===Number(q.answerIndex)?'<strong class="correct-answer">':''}${esc(o)}${i===Number(q.answerIndex)?'</strong>':''}</li>`).join('')}</ol>
        <p class="question-explanation"><strong>Explanation:</strong> ${esc(q.explanation||'Not provided')}</p>
        <div class="form-actions">
          <button class="btn edit-q" type="button">Edit</button>
          <button class="btn collapse-create" type="button">Create variant</button>
          <button class="btn btn-danger delete-q" type="button">Delete</button>
        </div>
        <div class="collapse-preview" hidden aria-live="polite"></div>
      </div>
    </article>`;
  }).join('');

  $('question-list').querySelectorAll('.collapse-toggle').forEach(btn=>btn.addEventListener('click',()=>{
    const details=btn.closest('.qb-question').querySelector('.question-details');
    const opening=details.hidden;
    details.hidden=!opening;
    btn.textContent=opening?'Hide details':'Show details';
    btn.setAttribute('aria-expanded',String(opening));
  }));
  $('question-list').querySelectorAll('.collapse-create').forEach(btn=>btn.addEventListener('click',()=>{
    const card=btn.closest('[data-id]'),id=card.dataset.id,q=bank[id],preview=card.querySelector('.collapse-preview');
    const next=(variantCounters.get(id)||0)+1;
    try{
      const variant=createCollapseVariant(id,q,next);
      variantCounters.set(id,next);
      preview.hidden=false;
      preview.innerHTML=`<div class="variant-heading"><strong>Algorithm Collapse · Preview ${next}</strong><span class="section-tag">Not saved to the bank</span></div>
        <p class="variant-question">${esc(variant.question)}</p>
        <ol type="A" class="question-options">${variant.options.map((o,i)=>`<li>${i===variant.answerIndex?'<strong class="correct-answer">':''}${esc(o)}${i===variant.answerIndex?'</strong>':''}</li>`).join('')}</ol>
        <p class="variant-note">Answer content preserved · Options rotated · Original question untouched. Structural reframing is a presentation change, not independent academic verification.</p>
        <div class="form-actions"><button class="btn btn-primary copy-variant" type="button">Copy variant</button><button class="btn close-variant" type="button">Close preview</button></div>
        <small class="variant-id">Variant: ${esc(variant.id)} · Original: ${esc(id)}</small>`;
      preview.querySelector('.copy-variant').addEventListener('click',async()=>{
        try{await navigator.clipboard.writeText(formatVariantForCopy(variant));message('Variant copied. The original question remains unchanged.');}
        catch{message('Clipboard access was blocked. Select and copy the preview manually.',true);}
      });
      preview.querySelector('.close-variant').addEventListener('click',()=>{preview.hidden=true;preview.innerHTML='';});
    }catch(error){message('Could not create variant: '+error.message,true);}
  }));
  $('question-list').querySelectorAll('.edit-q').forEach(btn=>btn.addEventListener('click',()=>{
    const id=btn.closest('[data-id]').dataset.id,q=bank[id];editId=id;
    $('subject').value=q.subject||'';$('topic').value=q.topic||'';$('question').value=q.question||'';$('difficulty').value=String(q.difficulty||3);$('sourceType').value=q.sourceType||'original';$('sourceDetails').value=q.sourceDetails||'';$('syllabusObjective').value=q.syllabusObjective||'';
    for(let i=0;i<4;i++)$(`option${i}`).value=q.options?.[i]||'';
    $('answerIndex').value=String(q.answerIndex??0);$('verified').checked=q.verified===true;$('explanation').value=q.explanation||'';
    $('form-heading').textContent='Edit question';$('save-button').textContent='Save changes';$('cancel-edit').style.display='inline-flex';message('Editing question. Review its publication status before saving.');$('question-form').scrollIntoView({behavior:'smooth',block:'start'});
  }));
  $('question-list').querySelectorAll('.delete-q').forEach(btn=>btn.addEventListener('click',async()=>{
    const id=btn.closest('[data-id]').dataset.id;if(!confirm('Delete this question from the published bank?'))return;
    try{await remove(ref(database,`questionBank/${id}`));message('Question deleted.');}catch(e){message('Delete failed: '+e.message,true);}
  }));
}

async function materialRequest(url,method="GET",body=null){
  if(!admin||auth.currentUser?.uid!==ADMIN_UID)throw new Error("Administrator authentication required.");
  const token=await auth.currentUser.getIdToken();
  const headers={Authorization:`Bearer ${token}`,apikey:SUPABASE_PUBLISHABLE_KEY};
  const options={method,headers};
  if(body instanceof FormData)options.body=body;else if(body!==null){headers["Content-Type"]="application/json";options.body=JSON.stringify(body);}
  const response=await fetch(url,options),text=await response.text();let result={};try{result=text?JSON.parse(text):{};}catch{result={message:text};}
  if(!response.ok||result.success===false)throw new Error(result.message||result.error||`Request failed (${response.status}).`);
  return result;
}
function uploadMessage(text,error=false){if(!uploadStatus)return;uploadStatus.textContent=text;uploadStatus.className=error?"error":"success";}
function renderMaterials(items){if(!Array.isArray(items)||!items.length){materialsList.innerHTML='<div class="empty-list">No textbooks uploaded yet.</div>';return;}
 materialsList.innerHTML=items.map(m=>{const e=m.extraction||{},status=m.status||"unknown",ex=e.extraction_status||"not extracted",size=(Number(m.file_size||0)/(1024*1024)).toFixed(2),date=m.created_at?new Date(m.created_at).toLocaleDateString():"Unknown";let action=status!=="published"?`<button class="btn btn-primary approve-material" data-id="${esc(m.id)}">Approve and extract</button>`:ex!=="completed"?`<button class="btn extract-material" data-id="${esc(m.id)}">Retry extraction</button>`:"";return `<article class="material-item" style="border:1px solid var(--qb-line);border-radius:13px;padding:13px;margin:10px 0"><h4>${esc(m.title||"Untitled material")}</h4><p class="draft-meta">Subject: ${esc(m.subject||"—")} · Topic: ${esc(m.topic||"—")}<br>File: ${esc(m.original_filename||"—")} · ${size} MB · ${esc(date)}<br>${e?`${Number(e.page_count||0)} pages · ${Number(e.character_count||0).toLocaleString()} characters`:"Text not extracted"}</p><span class="section-tag">Review: ${esc(status)}</span><span class="section-tag">Extraction: ${esc(ex)}</span>${e?.extraction_status==="needs_ocr"?'<p class="error">OCR may be required for this scanned document.</p>':''}<div class="form-actions">${action}</div></article>`;}).join("");
 materialsList.querySelectorAll(".approve-material").forEach(b=>b.addEventListener("click",()=>approveAndExtract(b.dataset.id,b)));
 materialsList.querySelectorAll(".extract-material").forEach(b=>b.addEventListener("click",()=>extractMaterial(b.dataset.id,b)));
}
async function loadMaterials(){if(!materialsList)return;materialsList.innerHTML='<div class="empty-list">Loading textbook library...</div>';try{const result=await materialRequest(MATERIALS_API_URL);renderMaterials(result.materials||[]);}catch(e){materialsList.innerHTML=`<div class="empty-list">Could not load textbooks: ${esc(e.message)}</div>`;}}
async function approveAndExtract(id,button){if(!confirm("Approve this textbook and begin extraction?"))return;button.disabled=true;button.textContent="Approving...";try{await materialRequest(MATERIALS_API_URL,"PATCH",{materialId:id});button.textContent="Extracting...";const result=await materialRequest(EXTRACT_MATERIAL_URL,"POST",{materialId:id}),e=result.extraction||{};uploadMessage(e.extractionStatus==="needs_ocr"?"Approved, but the text is sparse; OCR may be required.":`Text extraction completed (${Number(e.pageCount||0)} pages).`,e.extractionStatus==="needs_ocr");await loadMaterials();}catch(e){uploadMessage("Approval/extraction failed: "+e.message,true);await loadMaterials();}finally{button.disabled=false;}}
async function extractMaterial(id,button){button.disabled=true;button.textContent="Extracting...";try{const result=await materialRequest(EXTRACT_MATERIAL_URL,"POST",{materialId:id}),e=result.extraction||{};uploadMessage(e.extractionStatus==="needs_ocr"?"Extraction finished; OCR may be required.":"Text extraction completed.",e.extractionStatus==="needs_ocr");await loadMaterials();}catch(e){uploadMessage("Extraction failed: "+e.message,true);await loadMaterials();}finally{button.disabled=false;}}
materialUploadForm?.addEventListener("submit",async e=>{e.preventDefault();if(!admin){uploadMessage("Administrator access required.",true);return;}const file=materialFileInput.files?.[0];if(!file){uploadMessage("Choose a PDF first.",true);return;}if(file.type!=="application/pdf"||!file.name.toLowerCase().endsWith(".pdf")){uploadMessage("Only PDF files are accepted.",true);return;}if(file.size<1||file.size>20*1024*1024){uploadMessage("File must be between 1 byte and 20 MB.",true);return;}const fd=new FormData();fd.append("title",document.getElementById("material-title").value.trim());fd.append("subject",document.getElementById("material-subject").value.trim());fd.append("topic",document.getElementById("material-topic").value.trim());fd.append("submission_notes",document.getElementById("material-notes").value.trim());fd.append("file",file);uploadButton.disabled=true;uploadMessage("Uploading securely...");try{const result=await materialRequest(MATERIALS_API_URL,"POST",fd);uploadMessage(result.message||"Textbook uploaded; awaiting review.");materialUploadForm.reset();await loadMaterials();}catch(err){uploadMessage("Upload failed: "+err.message,true);}finally{uploadButton.disabled=false;}});
refreshMaterialsButton?.addEventListener("click",loadMaterials);

onAuthStateChanged(auth,user=>{admin=user&&user.uid===ADMIN_UID?user:null;if(!admin){$('app-content').style.display='none';if(stop){stop();stop=null;}if(!user)location.replace('login.html');return;}$('app-content').style.display='block';$('admin-email').textContent=user.email||'Administrator';loadMaterials();if(stop)stop();stop=onValue(ref(database,'questionBank'),snap=>{bank=snap.val()||{};render();},err=>message('Question bank load failed: '+err.message,true));});
$('question-form').addEventListener('submit',async e=>{e.preventDefault();if(!admin||busy)return;const data=collect();if(!validate(data)){message('Complete all fields and ensure four non-empty options, a valid answer, and difficulty 1–7.',true);return;}busy=true;$('save-button').disabled=true;try{const now=Date.now();if(editId){const old=bank[editId]||{};if(data.verified){await update(ref(database,`questionBank/${editId}`),{...data,verified:true,reviewStatus:'published',updatedAt:now,updatedBy:admin.uid});}else{const pendingId=push(ref(database,'pendingQuestions')).key;await update(ref(database),{[`pendingQuestions/${pendingId}`]:{...data,sourceType:data.sourceType||'original',verified:false,reviewStatus:'pending_review',createdAt:old.createdAt||now,submittedAt:now,updatedAt:now,createdBy:admin.uid,source:'manual-edit'},[`questionBank/${editId}`]:null});}message('Question updated.');}else if(data.verified){const id=push(ref(database,'questionBank')).key;await set(ref(database,`questionBank/${id}`),{...data,id,sourceType:data.sourceType||'original',verified:true,reviewStatus:'published',createdAt:now,updatedAt:now,createdBy:admin.uid});message('Published question saved.');}else{const id=push(ref(database,'pendingQuestions')).key;await set(ref(database,`pendingQuestions/${id}`),{...data,id,verified:false,reviewStatus:'pending_review',createdAt:now,submittedAt:now,updatedAt:now,createdBy:admin.uid,source:'manual'});message('Saved to the private review queue; students cannot see it.');}resetForm();}catch(err){message('Save failed: '+err.message,true);}finally{busy=false;$('save-button').disabled=false;}});
pendingButton.addEventListener("click",async()=>{if(!admin)return;const data=collect();if(!data)return;pendingButton.disabled=true;$("save-button").disabled=true;try{const token=await auth.currentUser.getIdToken(true);const response=await fetch(HAI_PENDING_URL,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify(data)});let result={};try{result=await response.json();}catch{}if(!response.ok)throw new Error(result.detail||result.message||`HTTP ${response.status}`);if(result.status==="duplicate_detected"){message("A similar question already exists; it was not submitted.",true);return;}message("Question sent to private final-review queue. It is not published.");resetForm();}catch(e){message("Pending submission failed: "+e.message,true);}finally{pendingButton.disabled=false;$("save-button").disabled=false;}});
$('cancel-edit').addEventListener('click',resetForm);$('search').addEventListener('input',render);
$('show-all-questions')?.addEventListener('click',()=>{document.querySelectorAll('.question-details').forEach(el=>{el.hidden=false;});document.querySelectorAll('.collapse-toggle').forEach(btn=>{btn.textContent='Hide details';btn.setAttribute('aria-expanded','true');});});
$('collapse-all-questions')?.addEventListener('click',()=>{document.querySelectorAll('.question-details').forEach(el=>{el.hidden=true;});document.querySelectorAll('.collapse-toggle').forEach(btn=>{btn.textContent='Show details';btn.setAttribute('aria-expanded','false');});});$('logout-button').addEventListener('click',async()=>{try{await signOut(auth);location.replace('login.html');}catch(e){message('Logout failed: '+e.message,true);}});
