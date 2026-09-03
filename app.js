const DB="CoffeeStandPOSv2",STORE="state";
const DEFAULT_MENU=[
{name:"Coffee",price:4,category:"Drinks",desc:"Latte, cap, long black, hot chocolate",active:true},
{name:"Krispy Kreme",price:3,category:"Food",desc:"",active:true},
{name:"Coffee & Donut",price:6,category:"Specials",desc:"",active:true},
{name:"4 Krispy Kreme’s",price:10,category:"Specials",desc:"",active:true},
{name:"Caramel Slice",price:3,category:"Food",desc:"",active:true},
{name:"Banana Bread",price:3,category:"Food",desc:"",active:true},
{name:"Killer Python",price:1,category:"Lollies",desc:"",active:true},
{name:"Zappos",price:2,category:"Lollies",desc:"",active:true}
];
let state={menu:DEFAULT_MENU,customers:[],day:"Friday",lastBackup:null};
let current=[],currentName="",activeCategory="All",editingIndex=null;

const $=id=>document.getElementById(id);
const money=n=>"$"+Number(n||0).toFixed(2).replace(".00","");
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const uid=()=>crypto.randomUUID?crypto.randomUUID():String(Date.now()+Math.random());
function openDB(){return new Promise((res,rej)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>r.result.createObjectStore(STORE);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
async function load(){try{const db=await openDB();return await new Promise((res,rej)=>{const q=db.transaction(STORE,"readonly").objectStore(STORE).get("state");q.onsuccess=()=>res(q.result||state);q.onerror=()=>rej(q.error)})}catch(e){return state}}
async function save(){const db=await openDB();return new Promise((res,rej)=>{const t=db.transaction(STORE,"readwrite");t.objectStore(STORE).put(state,"state");t.oncomplete=res;t.onerror=()=>rej(t.error)})}
function menuItem(i){return state.menu[i]}
function total(items){return items.reduce((s,x)=>s+(menuItem(x.i)?.price||0)*x.q,0)}
function getCustomer(n){return state.customers.find(c=>c.name.toLowerCase()===n.trim().toLowerCase())}
function customerTotal(c){return c.purchases.reduce((s,p)=>s+p.total,0)}
function customerDue(c){return c.purchases.filter(p=>!p.paid).reduce((s,p)=>s+p.total,0)}
function allPurchases(){return state.customers.flatMap(c=>c.purchases)}

function renderMenu(){
  const cats=["All",...new Set(state.menu.filter(m=>m.active).map(m=>m.category||"Other"))];
  const ce=$("categories");ce.innerHTML="";
  cats.forEach(c=>{const b=document.createElement("button");b.textContent=c;b.classList.toggle("active",c===activeCategory);b.onclick=()=>{activeCategory=c;renderMenu()};ce.appendChild(b)});
  const me=$("menu");me.innerHTML="";
  state.menu.forEach((m,i)=>{if(!m.active||(activeCategory!=="All"&&m.category!==activeCategory))return;const b=document.createElement("button");b.innerHTML=`<strong>${esc(m.name)}</strong><span class="desc">${esc(m.desc)}</span><span class="price">${money(m.price)}</span>`;b.onclick=()=>add(i);me.appendChild(b)})
}
function add(i){const x=current.find(x=>x.i===i);x?x.q++:current.push({i,q:1});renderOrder()}
function change(i,d){const x=current.find(x=>x.i===i);if(!x)return;x.q+=d;if(x.q<=0)current=current.filter(y=>y!==x);renderOrder()}
function renderOrder(){
 $("purchaseTitle").textContent=currentName?`${currentName}'s Purchase`:"Current Purchase";
 const el=$("orderList");el.innerHTML="";
 if(!current.length)el.innerHTML='<div class="empty">Tap an item to add it.</div>';
 current.forEach(x=>{const m=menuItem(x.i);const r=document.createElement("div");r.className="row";r.innerHTML=`<div><strong>${esc(m?.name||"Removed item")}</strong><div class="muted">${money(m?.price||0)} each</div></div><div class="qty"><button type="button">−</button><b>${x.q}</b><button type="button">+</button><strong>${money((m?.price||0)*x.q)}</strong></div>`;r.querySelectorAll("button")[0].onclick=()=>change(x.i,-1);r.querySelectorAll("button")[1].onclick=()=>change(x.i,1);el.appendChild(r)});
 $("orderTotal").textContent=money(total(current))
}
function renderCustomers(){
 const list=$("customersList"),search=($("customerSearch").value||"").toLowerCase();list.innerHTML="";
 const names=$("names"),quick=$("quickCustomers");names.innerHTML="";quick.innerHTML="";
 [...state.customers].sort((a,b)=>a.name.localeCompare(b.name)).forEach(c=>{const o=document.createElement("option");o.value=c.name;names.appendChild(o);if(!search||c.name.toLowerCase().includes(search)){
 const card=document.createElement("div");card.className="customer-card";card.innerHTML=`<div class="row"><div><strong>${esc(c.name)}</strong><div class="muted">${c.purchases.length} purchase${c.purchases.length===1?"":"s"} · Weekend ${money(customerTotal(c))}</div></div><div class="right"><span class="badge ${customerDue(c)?"due":""}">${customerDue(c)?`Due ${money(customerDue(c))}`:"Paid"}</span></div></div><div class="toolbar"><button class="primary">+ New Purchase</button><button>History</button><button class="paid-all" ${customerDue(c)?"":"disabled"}>Mark All Paid</button></div><div class="history hidden"></div>`;card.querySelector("button").onclick=()=>startFor(c.name);card.querySelectorAll("button")[1].onclick=()=>history(card,c);const paidAll=card.querySelector(".paid-all");if(paidAll)paidAll.onclick=async()=>{if(!confirm(`Mark all purchases for ${c.name} as paid?`))return;c.purchases.forEach(p=>p.paid=true);await save();renderAll()};list.appendChild(card)}});
 if(!state.customers.length)list.innerHTML='<div class="empty">No customers yet.</div>';
 state.customers.slice(0,20).forEach(c=>{const b=document.createElement("button");b.textContent=c.name;b.onclick=()=>startFor(c.name);quick.appendChild(b)})
}
function history(card,c){const h=card.querySelector(".history");h.classList.toggle("hidden");if(h.classList.contains("hidden"))return;h.innerHTML="";[...c.purchases].reverse().forEach(p=>{const names=p.items.map(x=>`${menuItem(x.i)?.name||"Item"} ×${x.q}`).join(", ");const d=document.createElement("div");d.className="row";d.innerHTML=`<div><strong>${esc(names)}</strong><div class="muted">${esc(p.day)} · ${new Date(p.time).toLocaleString()}</div></div><div class="right"><strong>${money(p.total)}</strong><br><span class="badge ${p.paid?"":"due"}">${p.paid?"Paid":"Unpaid"}</span>${p.paid?"":'<br><button type="button" style="margin-top:5px">Mark Paid</button>'}</div>`;if(!p.paid)d.querySelector("button").onclick=async()=>{p.paid=true;await save();renderAll()};h.appendChild(d)})}
function startFor(name){currentName=name;$("customerName").value=name;current=[];renderOrder();show("order")}
async function savePurchase(){const n=$("customerName").value.trim();if(!n)return alert("Enter a customer name.");if(!current.length)return alert("Add at least one item.");let c=getCustomer(n);if(!c){c={id:uid(),name:n,purchases:[]};state.customers.push(c)}c.purchases.push({id:uid(),day:state.day,time:new Date().toISOString(),items:JSON.parse(JSON.stringify(current)),total:total(current),paid:false});await save();current=[];currentName=n;renderAll();show("customers")}
function renderSales(){
 const ps=allPurchases(),counts=state.menu.map(()=>0);let items=0,sales=0,due=0;ps.forEach(p=>{sales+=p.total;if(!p.paid)due+=p.total;p.items.forEach(x=>{if(counts[x.i]!==undefined)counts[x.i]+=x.q;items+=x.q})});
 $("statPurchases").textContent=ps.length;$("statItems").textContent=items;$("statSales").textContent=money(sales);$("statDue").textContent=money(due);$("dayNotice").textContent=`Current day: ${state.day}`;$("headerDay").textContent=`Current day: ${state.day}`;
 const il=$("itemSales");il.innerHTML="";state.menu.forEach((m,i)=>{if(counts[i]){const r=document.createElement("div");r.className="row";r.innerHTML=`<span>${esc(m.name)}</span><strong>${counts[i]} sold · ${money(counts[i]*m.price)}</strong>`;il.appendChild(r)}});
 const dl=$("dailySales");dl.innerHTML="";[...new Set(ps.map(p=>p.day))].forEach(d=>{const r=document.createElement("div");r.className="row";r.innerHTML=`<strong>${esc(d)}</strong><strong>${money(ps.filter(p=>p.day===d).reduce((s,p)=>s+p.total,0))}</strong>`;dl.appendChild(r)})
}
function renderAdmin(){
 const el=$("menuAdmin");el.innerHTML="";
 state.menu.forEach((m,i)=>{const r=document.createElement("div");r.className="menu-admin";r.innerHTML=`<div><strong>${esc(m.name)}</strong><div class="muted">${esc(m.category)} · ${money(m.price)} ${m.active?"":"· HIDDEN"}</div></div><button type="button">Edit</button><button type="button">${m.active?"Hide":"Show"}</button>`;r.querySelector("button").onclick=()=>openEditor(i);r.querySelectorAll("button")[1].onclick=async()=>{m.active=!m.active;await save();renderAll()};el.appendChild(r)})
}
function openEditor(i=null){editingIndex=i;const m=i===null?{name:"",price:"",category:"Drinks",desc:""}:state.menu[i];$("modalTitle").textContent=i===null?"Add Menu Item":"Edit Menu Item";$("editName").value=m.name;$("editPrice").value=m.price;$("editCategory").value=m.category||"Other";$("editDesc").value=m.desc||"";$("modal").classList.remove("hidden")}
$("cancelItem").onclick=()=>$("modal").classList.add("hidden");
$("saveItem").onclick=async()=>{const name=$("editName").value.trim(),price=Number($("editPrice").value),category=$("editCategory").value.trim()||"Other",desc=$("editDesc").value.trim();if(!name||!Number.isFinite(price)||price<0)return alert("Enter a valid item name and price.");if(editingIndex===null)state.menu.push({name,price,category,desc,active:true});else Object.assign(state.menu[editingIndex],{name,price,category,desc});await save();$("modal").classList.add("hidden");renderAll()};
$("customerSearch").addEventListener("input",renderCustomers);
$("customerName").addEventListener("input",e=>{currentName=e.target.value.trim();renderOrder()});
$("savePurchase").onclick=savePurchase;$("clearPurchase").onclick=()=>{current=[];renderOrder()};
$("newDay").onclick=async()=>{const n=prompt("Day name","Saturday");if(n&&n.trim()){state.day=n.trim();await save();renderAll()}};
$("addItem").onclick=()=>openEditor();
$("exportBtn").onclick=()=>{state.lastBackup=new Date().toISOString();save();const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`coffee-pos-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);$("backupStatus").textContent="Backup exported just now.";$("backupStatus").classList.add("ok")};
$("importBtn").onclick=()=>$("fileInput").click();
$("fileInput").onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const d=JSON.parse(await f.text());if(!Array.isArray(d.menu)||!Array.isArray(d.customers))throw Error();state=d;await save();renderAll();alert("Backup restored.")}catch(err){alert("Invalid Coffee POS backup.")}e.target.value=""};
$("resetAll").onclick=async()=>{if(confirm("Clear all customers, purchases and sales on this device? This cannot be undone unless you have a backup.")){state={menu:DEFAULT_MENU,customers:[],day:"Friday",lastBackup:null};await save();current=[];currentName="";renderAll();show("order")}};
function show(v){document.querySelectorAll("[id^=view-]").forEach(x=>x.classList.toggle("hidden",x.id!==`view-${v}`));document.querySelectorAll(".nav button").forEach(b=>b.classList.toggle("active",b.dataset.view===v))}
document.querySelectorAll(".nav button").forEach(b=>b.onclick=()=>show(b.dataset.view));
function renderAll(){renderMenu();renderOrder();renderCustomers();renderSales();renderAdmin();$("backupStatus").textContent=state.lastBackup?`Last backup: ${new Date(state.lastBackup).toLocaleString()}`:"No backup recorded yet."}
(async()=>{state=await load();if(!Array.isArray(state.menu))state.menu=DEFAULT_MENU;if(!Array.isArray(state.customers))state.customers=[];renderAll()})();
