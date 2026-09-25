import{createClient}from"https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL="https://nnucegewfuuwnmsrrlkt.supabase.co";
const SUPABASE_KEY="sb_publishable_4D9owHFx7keciutfYmZZNQ_-UP_WIUw";
const TURNSTILE_SITE_KEY="0x4AAAAAAFDaybWZWf1yU8fl";
const supabase=createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});

const $=s=>document.querySelector(s);
const form=$("[data-review-form]");
if(!form)throw Error("Review form not found.");

let rating=5;
let turnstileToken="";
let turnstileId=null;

function safeToolPath(){
  const value=new URLSearchParams(location.search).get("tool");
  if(!value)return"/";
  try{
    const decoded=decodeURIComponent(value);
    if(!decoded.startsWith("/")||decoded.startsWith("//")||decoded.length>250)return"/";
    return decoded.split("?")[0].split("#")[0]||"/";
  }catch{return"/"}
}
const toolPath=safeToolPath();

function labelForPath(path){
  if(path==="/")return"Quicklio";
  const slug=path.split("/").filter(Boolean).at(-1)||"Quicklio tool";
  return slug.split("-").map(w=>w? w[0].toUpperCase()+w.slice(1):w).join(" ");
}

function setStatus(message,error=false){
  const el=$("#reviewStatus");
  el.textContent=message;
  el.className="notice"+(error?" error":"");
}

function setSubmitting(active){
  const button=$("#reviewSubmit");
  button.disabled=active;
  button.querySelector("span").textContent=active?"Submitting…":"Submit review";
}

for(const star of form.querySelectorAll("[data-rating]")){
  star.addEventListener("click",()=>{
    rating=Number(star.dataset.rating)||5;
    for(const item of form.querySelectorAll("[data-rating]"))item.classList.toggle("is-active",Number(item.dataset.rating)<=rating);
  });
}

const textarea=$("#reviewText");
textarea.addEventListener("input",()=>$("#reviewCount").textContent=String(textarea.value.length));

if(toolPath!=="/"){
  $("#reviewContext").hidden=false;
  $("#reviewToolName").textContent=labelForPath(toolPath);
  $("#reviewToolLink").href=toolPath;
  $("#reviewsHeading").textContent="Reviews for "+labelForPath(toolPath);
}

function loadTurnstile(){
  return new Promise((resolve,reject)=>{
    if(window.turnstile)return resolve(window.turnstile);
    const existing=document.querySelector('script[data-quicklio-turnstile]');
    if(existing){
      existing.addEventListener("load",()=>resolve(window.turnstile),{once:true});
      existing.addEventListener("error",reject,{once:true});
      return;
    }
    const script=document.createElement("script");
    script.src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async=true;script.defer=true;script.dataset.quicklioTurnstile="";
    script.onload=()=>resolve(window.turnstile);
    script.onerror=()=>reject(Error("Could not load bot protection."));
    document.head.append(script);
  });
}

async function renderTurnstile(){
  try{
    const api=await loadTurnstile();
    turnstileId=api.render("#turnstileWidget",{
      sitekey:TURNSTILE_SITE_KEY,
      theme:"auto",
      callback:token=>{turnstileToken=token;setStatus("Ready to submit.");},
      "expired-callback":()=>{turnstileToken="";setStatus("Bot check expired. Please verify again.",true);},
      "error-callback":()=>{turnstileToken="";setStatus("Bot check could not complete. Please try again.",true);}
    });
  }catch(e){setStatus(e.message||"Could not load bot protection.",true)}
}

async function ensureAnonymousUser(){
  const {data:{session}}=await supabase.auth.getSession();
  if(session?.user)return session.user;
  if(!turnstileToken)throw Error("Please complete the bot check.");
  const {data,error}=await supabase.auth.signInAnonymously({options:{captchaToken:turnstileToken}});
  if(error)throw error;
  if(!data.user)throw Error("Could not create an anonymous review session.");
  return data.user;
}

async function loadApprovedReviews(){
  const root=$("#approvedReviews");
  let query=supabase.from("reviews").select("id,tool_path,rating,review_text,display_name,created_at").order("created_at",{ascending:false}).limit(12);
  if(toolPath!=="/")query=query.eq("tool_path",toolPath);
  const {data,error}=await query;
  if(error){root.innerHTML='<p class="muted">Approved reviews are not available right now.</p>';return}
  if(!data?.length){root.innerHTML='<p class="muted">No approved reviews yet. You can be one of the first.</p>';return}
  root.innerHTML="";
  for(const review of data){
    const item=document.createElement("article");
    item.className="review-item";
    const head=document.createElement("div");head.className="review-item-head";
    const name=document.createElement("strong");name.textContent=(review.display_name||"Anonymous").trim();
    const stars=document.createElement("span");stars.className="review-stars";stars.setAttribute("aria-label",review.rating+" out of 5 stars");stars.textContent="★".repeat(review.rating)+"☆".repeat(5-review.rating);
    const text=document.createElement("p");text.textContent=review.review_text;
    const meta=document.createElement("small");meta.textContent=new Date(review.created_at).toLocaleDateString(undefined,{year:"numeric",month:"short",day:"numeric"})+(toolPath==="/"&&review.tool_path!=="/"?" · "+labelForPath(review.tool_path):"");
    head.append(name,stars);item.append(head,text,meta);root.append(item);
  }
}

form.addEventListener("submit",async event=>{
  event.preventDefault();
  const reviewText=textarea.value.trim();
  const displayName=$("#reviewName").value.trim();
  if(reviewText.length<3)return setStatus("Please write at least 3 characters.",true);
  if(reviewText.length>2000)return setStatus("Please keep your review under 2,000 characters.",true);
  if(displayName.length>50)return setStatus("Please keep the name under 50 characters.",true);
  if(!turnstileToken){
    const {data:{session}}=await supabase.auth.getSession();
    if(!session?.user)return setStatus("Please complete the bot check.",true);
  }

  setSubmitting(true);
  try{
    const user=await ensureAnonymousUser();
    const {error}=await supabase.from("reviews").insert({
      tool_path:toolPath,
      rating,
      review_text:reviewText,
      display_name:displayName||null
    });
    if(error){
      if(error.code==="23505")throw Error("You already submitted a review for this tool from this browser.");
      throw error;
    }
    window.quicklioTrack?.("review_submitted",{tool_path:toolPath,rating});
    form.hidden=true;
    $("#reviewSuccess").hidden=false;
    await loadApprovedReviews();
  }catch(e){
    setStatus(e.message||"Could not submit your review. Please try again.",true);
    if(window.turnstile&&turnstileId!==null){window.turnstile.reset(turnstileId);turnstileToken=""}
  }finally{setSubmitting(false)}
});

renderTurnstile();
loadApprovedReviews();
