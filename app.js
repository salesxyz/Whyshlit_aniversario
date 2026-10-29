(function(){
"use strict";
var FONTS="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&family=Figtree:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap";
var LIB="https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js";
var LIB2="https://cdnjs.cloudflare.com/ajax/libs/jsQR/1.4.0/jsQR.min.js";
var RESET=":root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;font:14px system-ui,sans-serif}img{max-width:100%}[hidden]{display:none!important}";
var MARKUP='<div class="wrap"><div id="app"></div></div>\n<div id="sheet" hidden></div>\n<div id="toast" role="status" aria-live="polite"></div>';
var BRL=new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"});
var TYPES=[["cpf","CPF"],["cnpj","CNPJ"],["phone","Celular"],["email","E-mail"],["random","Chave aleatória"]];
var NS="http://www.w3.org/2000/svg";
function $(s,r){return (r||document).querySelector(s)}

/*PIX-START*/
function tlv(id,v){return id+("0"+v.length).slice(-2)+v}
function crc16(s){var c=0xFFFF;for(var i=0;i<s.length;i++){c^=s.charCodeAt(i)<<8;for(var j=0;j<8;j++){c=(c&0x8000)?((c<<1)^0x1021):(c<<1);c&=0xFFFF}}return ("000"+c.toString(16).toUpperCase()).slice(-4)}
function ascii(s,max){return String(s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^A-Za-z0-9 ]/g," ").replace(/\s+/g," ").trim().toUpperCase().slice(0,max).trim()}
function normKey(type,raw){
  var v=String(raw||"").trim();
  if(!v) return {ok:false,msg:"Informe a chave Pix."};
  if(type==="cpf"||type==="cnpj"){
    var d=v.replace(/\D/g,""),n=type==="cpf"?11:14;
    if(d.length!==n) return {ok:false,msg:(type==="cpf"?"O CPF":"O CNPJ")+" precisa ter "+n+" números."};
    return {ok:true,value:d};
  }
  if(type==="phone"){
    var p=v.replace(/[^\d+]/g,""),digits=p.replace(/\D/g,""),out;
    if(p.charAt(0)==="+") out="+"+digits;
    else if(digits.length>=12&&digits.slice(0,2)==="55") out="+"+digits;
    else out="+55"+digits;
    if(!/^\+55\d{10,11}$/.test(out)) return {ok:false,msg:"Use o celular com DDD, por exemplo (61) 99999-0000."};
    return {ok:true,value:out};
  }
  if(type==="email"){
    var e=v.toLowerCase();
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)||e.length>77) return {ok:false,msg:"E-mail inválido."};
    return {ok:true,value:e};
  }
  var r=v.toLowerCase();
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(r)) return {ok:false,msg:"A chave aleatória tem o formato 8-4-4-4-12 caracteres."};
  return {ok:true,value:r};
}
function pixConfig(p,honoree){
  p=p||{};
  var k=normKey(p.type||"cpf",p.key);
  if(!k.ok) return {ok:false,msg:k.msg};
  var name=ascii(p.name||honoree,25);
  if(!name) return {ok:false,msg:"Informe o nome do recebedor."};
  return {ok:true,key:k.value,name:name,city:ascii(p.city,15)||"BRASIL"};
}
function buildPix(c,amount){
  var mai=tlv("00","BR.GOV.BCB.PIX")+tlv("01",c.key);
  var s=tlv("00","01")+tlv("01","11")+tlv("26",mai)+tlv("52","0000")+tlv("53","986");
  if(amount>0) s+=tlv("54",amount.toFixed(2));
  s+=tlv("58","BR")+tlv("59",c.name)+tlv("60",c.city)+tlv("62",tlv("05","***"))+"6304";
  return s+crc16(s);
}
function parseBRL(t){
  var s=String(t||"").replace(/[^\d.,]/g,"");
  if(!s) return null;
  if(s.indexOf(",")>-1) s=s.replace(/\./g,"").replace(",",".");
  else if(/^\d{1,3}(\.\d{3})+$/.test(s)) s=s.replace(/\./g,"");
  var n=Number(s);
  return isFinite(n)?Math.round(n*100)/100:NaN;
}
function parseTlv(s){
  var o={},i=0;
  while(i<s.length){
    if(i+4>s.length) return null;
    var l=parseInt(s.substr(i+2,2),10);
    if(isNaN(l)||i+4+l>s.length) return null;
    o[s.substr(i,2)]=s.substr(i+4,l);i+=4+l;
  }
  return o;
}
function keyType(k){
  if(k.indexOf("@")>-1) return "email";
  if(/^\+\d{10,15}$/.test(k)) return "phone";
  if(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(k)) return "random";
  if(/^\d{14}$/.test(k)) return "cnpj";
  if(/^\d{11}$/.test(k)) return "cpf";
  return null;
}
function readPix(text){
  var t=String(text||"").replace(/[\r\n]+/g,"").trim();
  if(t.indexOf("000201")!==0) return {ok:false,msg:"Isso não parece um código Pix. Ele começa com 000201."};
  if(t.length<12||crc16(t.slice(0,-4))!==t.slice(-4).toUpperCase()) return {ok:false,msg:"O código Pix está incompleto ou foi alterado. Copie o código inteiro de novo."};
  var top=parseTlv(t.slice(0,-8));
  if(!top) return {ok:false,msg:"Não consegui ler esse código Pix."};
  var acc=null;
  for(var id=26;id<=51&&!acc;id++){
    var k=("0"+id).slice(-2);
    if(top[k]){var sub=parseTlv(top[k]);if(sub&&/^br\.gov\.bcb\.pix$/i.test(sub["00"]||"")) acc=sub}
  }
  if(!acc) return {ok:false,msg:"Não encontrei uma chave Pix neste código."};
  if(!acc["01"]) return {ok:false,msg:acc["25"]?"Este QR code é de uma cobrança, sem chave dentro. Use o QR code da sua chave Pix no app do banco.":"Não encontrei uma chave Pix neste código."};
  var key=acc["01"],type=keyType(key);
  if(!type) return {ok:false,msg:"Não reconheci o tipo dessa chave Pix."};
  return {ok:true,type:type,key:type==="email"||type==="random"?key.toLowerCase():key,name:top["59"]||"",city:top["60"]||""};
}
/*PIX-END*/

function safeUrl(v){
  v=String(v||"").trim();
  if(!v) return "";
  if(!/^[a-z][a-z0-9+.-]*:/i.test(v)) v="https://"+v;
  try{var u=new URL(v);return (u.protocol==="https:"||u.protocol==="http:")?u.href:null}catch(e){return null}
}
function parseDate(s){var m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(s||"");return m?{y:+m[1],m:+m[2],d:+m[3]}:null}
function daysLeft(s){
  var p=parseDate(s);if(!p) return null;
  var now=new Date(),t=new Date(now.getFullYear(),now.getMonth(),now.getDate()),n=new Date(t.getFullYear(),p.m-1,p.d);
  if(n<t) n=new Date(t.getFullYear()+1,p.m-1,p.d);
  return Math.round((n-t)/864e5);
}
function fmtDate(s){var p=parseDate(s);return new Date(p.y,p.m-1,p.d).toLocaleDateString("pt-BR",{day:"numeric",month:"long"})}

function h(tag,props){
  var el=document.createElement(tag),kids=Array.prototype.slice.call(arguments,2);
  if(props) for(var k in props){
    var v=props[k];
    if(v==null||v===false) continue;
    if(k==="class") el.className=v;
    else if(k==="text") el.textContent=v;
    else if(k==="style") Object.assign(el.style,v);
    else if(k.slice(0,2)==="on") el.addEventListener(k.slice(2),v);
    else el.setAttribute(k,v===true?"":v);
  }
  kids.forEach(function(kid){
    [].concat(kid).forEach(function(c){
      if(c==null||c===false) return;
      el.append(c.nodeType?c:document.createTextNode(c));
    });
  });
  return el;
}
var ICONS={
  x:'<path d="M6 6l12 12M18 6L6 18"/>',
  copy:'<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h8"/>',
  trash:'<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  check:'<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  ext:'<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  edit:'<path d="M4 20h4L19 9l-4-4L4 16v4z"/>',
  plus:'<path d="M12 5v14M5 12h14"/>'
};
function icon(n){
  var s=document.createElementNS(NS,"svg");
  s.setAttribute("viewBox","0 0 24 24");s.setAttribute("width","18");s.setAttribute("height","18");s.setAttribute("fill","none");
  s.setAttribute("stroke","currentColor");s.setAttribute("stroke-width","2");s.setAttribute("stroke-linecap","round");s.setAttribute("stroke-linejoin","round");s.setAttribute("aria-hidden","true");
  s.innerHTML=ICONS[n];
  return s;
}

/* Imagens dos presentes: foto enviada pelo admin ou ícone pronto */
var assetsApi=null;
var PICS={
  gift:["Presente",'<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M5 12v8h14v-8M12 8v12M12 8C10 4.500 6.500 5 7.500 7.500c.5 1.200 2.500 1 4.500.5zM12 8c2-3.500 5.500-3 4.500-.5-.5 1.200-2.500 1-4.500.5z"/>'],
  tech:["Eletrônicos",'<path d="M4 16v-4a8 8 0 0 1 16 0v4"/><rect x="3" y="14" width="4" height="7" rx="1.500"/><rect x="17" y="14" width="4" height="7" rx="1.500"/>'],
  kitchen:["Cozinha",'<path d="M4 10h16v7a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3zM2 12h2M20 12h2M9 6c0-1.500 1-1.500 1-3M14 6c0-1.500 1-1.500 1-3"/>'],
  home:["Casa",'<path d="M3 19V7M3 15h18v4M21 15v-3a3 3 0 0 0-3-3h-8v6"/><circle cx="6.500" cy="11.500" r="1.500"/>'],
  book:["Livros",'<path d="M4 5a2 2 0 0 1 2-2h13v15H6a2 2 0 0 0-2 2zM4 20a2 2 0 0 1 2-2h13"/>'],
  style:["Roupas",'<path d="M8 3L3 6l2 4 3-1v12h8V9l3 1 2-4-5-3a4 4 0 0 1-8 0z"/>'],
  trip:["Viagem",'<path d="M21 3L3 10l7 3 3 7zM10 13L21 3"/>'],
  food:["Comida",'<path d="M7 3v7M4.500 3v4.500a2.500 2.500 0 0 0 5 0V3M7 10v11M17 21V3c-2.500 1-3 4-3 7 0 1.500 1 2 3 2"/>'],
  cash:["Dinheiro",'<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.500"/><path d="M6 12h.01M18 12h.01"/>']
};
function pickSvg(k,size){
  var s=document.createElementNS(NS,"svg");
  s.setAttribute("viewBox","0 0 24 24");s.setAttribute("width",size);s.setAttribute("height",size);s.setAttribute("fill","none");
  s.setAttribute("stroke","currentColor");s.setAttribute("stroke-width","1.6");s.setAttribute("stroke-linecap","round");s.setAttribute("stroke-linejoin","round");s.setAttribute("aria-hidden","true");
  s.innerHTML=PICS[k][1];
  return s;
}
function imgOf(g){
  var i=g&&g.img;
  if(!i) return null;
  if(i.t==="asset"&&/^[0-9a-f]{32}$/.test(String(i.id))) return {t:"asset",id:i.id};
  if(i.t==="icon"&&PICS[i.k]) return {t:"icon",k:i.k};
  return null;
}
function mediaEl(g){
  var i=imgOf(g);
  if(!i) return null;
  if(i.t==="asset") return h("img",{class:"media",src:"/api/images/"+i.id,alt:g.name,loading:"lazy"});
  var d=h("div",{class:"media-icon","aria-hidden":"true"});
  d.append(pickSvg(i.k,48));
  return d;
}
function shrink(file){
  return new Promise(function(res,rej){
    var url=URL.createObjectURL(file),im=new Image();
    im.onload=function(){
      var sc=Math.min(1,900/Math.max(im.naturalWidth,im.naturalHeight)),w=Math.max(1,Math.round(im.naturalWidth*sc)),hh=Math.max(1,Math.round(im.naturalHeight*sc));
      var cv=document.createElement("canvas");cv.width=w;cv.height=hh;
      var cx=cv.getContext("2d");cx.fillStyle="#fff";cx.fillRect(0,0,w,hh);cx.drawImage(im,0,0,w,hh);
      URL.revokeObjectURL(url);
      cv.toBlob(function(b){b?res(b):rej(new Error("img"))},"image/jpeg",0.82);
    };
    im.onerror=function(){URL.revokeObjectURL(url);rej(new Error("img"))};
    im.src=url;
  });
}
function decodeQr(file){
  return new Promise(function(res,rej){
    if(typeof jsQR!=="function") return rej(new Error("lib"));
    var url=URL.createObjectURL(file),im=new Image();
    im.onload=function(){
      var sc=Math.min(1,1400/Math.max(im.naturalWidth,im.naturalHeight)),w=Math.max(1,Math.round(im.naturalWidth*sc)),hh=Math.max(1,Math.round(im.naturalHeight*sc));
      var cv=document.createElement("canvas");cv.width=w;cv.height=hh;
      var cx=cv.getContext("2d",{willReadFrequently:true});cx.fillStyle="#fff";cx.fillRect(0,0,w,hh);cx.drawImage(im,0,0,w,hh);
      URL.revokeObjectURL(url);
      var d=cx.getImageData(0,0,w,hh),r=jsQR(d.data,w,hh,{inversionAttempts:"attemptBoth"});
      r&&r.data?res(r.data):rej(new Error("noqr"));
    };
    im.onerror=function(){URL.revokeObjectURL(url);rej(new Error("img"))};
    im.src=url;
  });
}
function importPix(text){
  var r=readPix(text),m=$("#imp-msg");
  if(!r.ok){if(m){m.textContent=r.msg;m.className="hint err"}return}
  var p=draft.pix;
  p.type=r.type;p.key=r.key;
  if(r.name) p.name=r.name;
  if(r.city) p.city=r.city;
  setDirty();render();
  toast("Chave importada. Confira os dados e teste o QR code.");
  var k=$("#f-key");if(k) k.scrollIntoView({block:"center"});
}
function importBlock(){
  var msg=h("p",{class:"hint",id:"imp-msg",role:"status"}),inp=h("input",{type:"file",accept:"image/*",id:"imp-file"});
  var ta=h("textarea",{id:"imp-text",class:"in",rows:2,placeholder:"00020126…",autocomplete:"off",spellcheck:"false"});
  inp.addEventListener("change",function(){
    var f=inp.files&&inp.files[0];
    if(!f) return;
    msg.textContent="Lendo o QR code…";msg.className="hint";
    decodeQr(f).then(importPix).catch(function(e){
      var c=e&&e.message;
      msg.textContent=c==="lib"?"O leitor de QR code não carregou. Cole o Pix copia e cola abaixo.":
        c==="noqr"?"Não encontrei um QR code nessa imagem. Use um print só do QR code, inteiro e sem reflexo.":
        "Não foi possível ler essa imagem. Use JPG ou PNG.";
      msg.className="hint err";
    });
  });
  return h("div",{class:"import"},
    h("h3",{text:"Importar a chave de um QR code"}),
    h("p",{class:"hint",text:"No app do seu banco, abra o QR code da sua chave Pix e tire um print. Envie a imagem aqui ou cole o Pix copia e cola. A página lê a chave, o nome e a cidade e preenche os campos."}),
    h("div",{class:"pick-row"},h("label",{class:"btn ghost small"},icon("plus"),"Enviar print do QR code",inp)),
    h("div",{class:"field"},h("label",{for:"imp-text",text:"Ou cole o Pix copia e cola"}),ta),
    h("div",{class:"btn-row"},h("button",{class:"btn ghost small",type:"button",onclick:function(){
      if(!ta.value.trim()){msg.textContent="Cole o código primeiro.";msg.className="hint err";ta.focus();return}
      importPix(ta.value);
    }},"Ler código")),
    msg);
}
function imagePicker(idp,getImg,setImg){
  var cur0=getImg(),tab=(cur0&&cur0.t==="icon")||!assetsApi?"icon":"photo",root=h("div",{class:"picker"});
  function draw(){
    var cur=getImg(),tabs=h("div",{class:"tabs",role:"tablist","aria-label":"Opções de imagem"});
    if(tab==="photo"&&!assetsApi) tab="icon";
    [["photo","Foto"],["icon","Ícones"]].forEach(function(t){
      if(t[0]==="photo"&&!assetsApi) return;
      tabs.append(h("button",{class:"tab",type:"button",role:"tab",id:idp+"-tab-"+t[0],"aria-selected":tab===t[0]?"true":"false","aria-controls":idp+"-panel",onclick:function(){tab=t[0];draw()}},t[1]));
    });
    var panel=h("div",{id:idp+"-panel",role:"tabpanel","aria-labelledby":idp+"-tab-"+tab});
    if(tab==="photo"){
      var msg=h("p",{class:"hint",role:"status"}),inp=h("input",{type:"file",accept:"image/*",id:idp+"-file"});
      inp.addEventListener("change",function(){
        var f=inp.files&&inp.files[0];
        if(!f) return;
        if(!/^image\//.test(f.type)){msg.textContent="Escolha um arquivo de imagem.";msg.className="hint err";return}
        msg.textContent="Enviando…";msg.className="hint";
        shrink(f).then(function(b){return assetsApi.upload(b)}).then(function(r){setImg({t:"asset",id:r.id});draw()}).catch(function(e){
          msg.textContent=(e&&e.message==="img")?"Não foi possível ler essa imagem. Use JPG ou PNG.":"Não foi possível enviar a imagem. Tente de novo.";
          msg.className="hint err";
        });
      });
      panel.append(h("div",{class:"pick-row"},
        cur&&cur.t==="asset"?h("img",{class:"thumb",src:"/api/images/"+cur.id,alt:"Imagem atual"}):null,
        h("label",{class:"btn ghost small"},icon("plus"),cur&&cur.t==="asset"?"Trocar foto":"Enviar foto",inp)),
        msg,h("p",{class:"hint",text:"A foto é reduzida antes do envio. Aceita JPG, PNG e WebP."}));
    }else{
      panel.append(h("div",{class:"icon-grid"},Object.keys(PICS).map(function(k){
        return h("button",{class:"icon-opt",type:"button","aria-pressed":cur&&cur.t==="icon"&&cur.k===k?"true":"false",onclick:function(){setImg({t:"icon",k:k});draw()}},pickSvg(k,24),PICS[k][0]);
      })));
    }
    root.replaceChildren.apply(root,[tabs,panel,cur?h("div",{class:"btn-row"},h("button",{class:"btn ghost small danger",type:"button",onclick:function(){setImg(null);draw()}},icon("trash"),"Sem imagem")):null].filter(Boolean));
  }
  draw();
  return root;
}

/* Estado */
var localMode=!(window.claude&&typeof window.claude.use==="function");
var backendMode=false;
var saved=JSON.parse($("#state").textContent),draft=null,editing=false,dirty=false,isAdmin=localMode,art=null,saving=false,armed=false,paymentsEnabled=false;
function cur(){return editing?draft:saved}
function uid(){return "g"+Date.now().toString(36)+Math.random().toString(36).slice(2,6)}
function toast(m){var t=$("#toast");t.textContent=m;t.classList.add("show");clearTimeout(toast.t);toast.t=setTimeout(function(){t.classList.remove("show")},2800)}
function setDirty(){dirty=true;var st=$("#bar-status");if(st) st.textContent="Alterações não salvas"}
var storageNotice="";
if(localMode){
  try{
    var stored=window.localStorage.getItem("whylist-state-v1");
    if(stored){
      var localState=JSON.parse(stored);
      if(!localState||typeof localState!=="object"||!localState.pix||!Array.isArray(localState.gifts)) throw new Error("formato inválido");
      saved=localState;
    }
  }catch(e){storageNotice="Não foi possível carregar as alterações salvas neste navegador."}
}
function applySiteSettings(s){
  var theme=["light","dark","system"].indexOf(s.theme)>-1?s.theme:"system";
  if(theme==="system") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.setAttribute("data-theme",theme);
  document.title=String(s.siteTitle||"Whylist");
}
function exportConfig(){
  var blob=new Blob([JSON.stringify(saved,null,2)],{type:"application/json"});
  var url=URL.createObjectURL(blob),link=h("a",{href:url,download:"whylist-config.json"});
  document.body.append(link);link.click();link.remove();
  setTimeout(function(){URL.revokeObjectURL(url)},0);
}
function loginAdmin(){
  var password=h("input",{id:"admin-password",type:"password",autocomplete:"current-password",required:true});
  var message=h("p",{class:"hint err",role:"status"});
  var submit=h("button",{class:"btn primary",type:"submit"},"Entrar");
  var form=h("form",{class:"admin-login",onsubmit:function(event){
    event.preventDefault();
    submit.disabled=true;submit.textContent="Entrando…";message.textContent="";
    fetch("/api/admin/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({password:password.value})})
      .then(function(response){return response.json().then(function(body){if(!response.ok) throw new Error(body.error||"Não foi possível entrar.");return body})})
      .then(function(){isAdmin=true;closeSheet();render();toast("Sessão administrativa iniciada.")})
      .catch(function(error){message.textContent=error.message||"Não foi possível conectar ao servidor.";submit.disabled=false;submit.textContent="Entrar"})
  }},
    field("Senha de administrador","admin-password",password),
    message,
    h("div",{class:"btn-row"},submit));
  lastFocus=document.activeElement;
  sheetEl.replaceChildren(
    h("div",{class:"sheet-back",onclick:closeSheet}),
    h("div",{class:"sheet-panel",role:"dialog","aria-modal":"true","aria-labelledby":"admin-login-title"},
      h("div",{class:"sheet-head"},h("h2",{id:"admin-login-title",text:"Acesso administrativo"}),
        h("button",{class:"btn ghost icon-btn",type:"button","aria-label":"Fechar",onclick:closeSheet},icon("x"))),
      h("p",{class:"hint",text:"Entre com a senha configurada no servidor para editar a lista."}),
      form));
  sheetEl.hidden=false;document.body.classList.add("noscroll");password.focus();
}
function logoutAdmin(){
  fetch("/api/admin/logout",{method:"POST"}).then(function(response){
    return response.json().then(function(body){if(!response.ok) throw new Error(body.error||"Não foi possível sair.");return body});
  }).then(function(){
    isAdmin=false;editing=false;draft=null;dirty=false;render();toast("Sessão administrativa encerrada.");
  }).catch(function(error){toast(error.message||"Não foi possível conectar ao servidor.")});
}

/* QR code */
function qrSvg(text){
  if(typeof qrcode!=="function") return null;
  try{
    var q=qrcode(0,"M");q.addData(text);q.make();
    var n=q.getModuleCount(),m=4,size=n+m*2,d="";
    for(var r=0;r<n;r++)for(var c=0;c<n;c++) if(q.isDark(r,c)) d+="M"+(c+m)+" "+(r+m)+"h1v1h-1z";
    var svg=document.createElementNS(NS,"svg");
    svg.setAttribute("viewBox","0 0 "+size+" "+size);svg.setAttribute("role","img");svg.setAttribute("aria-label","QR code Pix");svg.setAttribute("shape-rendering","crispEdges");
    var bg=document.createElementNS(NS,"rect");bg.setAttribute("width",size);bg.setAttribute("height",size);bg.setAttribute("fill","#ffffff");
    var p=document.createElementNS(NS,"path");p.setAttribute("d",d);p.setAttribute("fill","#000000");
    svg.append(bg,p);
    return svg;
  }catch(e){return null}
}
function copyText(t){
  function fallback(){
    try{var ta=h("textarea",{readonly:true,"aria-hidden":"true"});ta.style.cssText="position:fixed;opacity:0;top:0;left:0";ta.value=t;document.body.append(ta);ta.select();var ok=document.execCommand("copy");ta.remove();return ok}catch(e){return false}
  }
  if(navigator.clipboard&&navigator.clipboard.writeText) return navigator.clipboard.writeText(t).then(function(){return true},function(){return fallback()});
  return Promise.resolve(fallback());
}
function copyBtn(label,getText,sel){
  return h("button",{class:"btn ghost small",type:"button",onclick:function(){
    copyText(getText()).then(function(ok){
      if(ok) toast("Copiado");
      else{toast("Não foi possível copiar. Selecione o texto e copie.");if(sel) sel.select()}
    });
  }},icon("copy"),label);
}

/* Painel Pix: valor, QR code e copia e cola */
function pixPanel(cfg,opts){
  var amt=h("input",{id:opts.idp+"-amount",type:"text",inputmode:"decimal",placeholder:"Qualquer valor",autocomplete:"off",value:opts.amount?String(opts.amount).replace(".",","):""});
  var err=h("p",{class:"hint err",role:"status"}),qrBox=h("div",{class:"qr"}),sum=h("p",{class:"meta"});
  var code=h("textarea",{id:opts.idp+"-code",class:"code",readonly:true,rows:4,"aria-label":"Pix copia e cola"});
  function update(){
    var a=parseBRL(amt.value),bad=(a!==null)&&(isNaN(a)||a<=0||a>999999.99);
    err.textContent=bad?"Digite um valor entre R$ 0,01 e R$ 999.999,99.":"";
    var v=(a!==null&&!bad)?a:0,payload=buildPix(cfg,v),svg=qrSvg(payload);
    code.value=payload;
    qrBox.replaceChildren(svg||h("p",{class:"hint",text:"QR code indisponível. Use o Pix copia e cola."}));
    sum.textContent=v?"Valor: "+BRL.format(v):"Valor livre: quem paga escolhe no app do banco.";
  }
  amt.addEventListener("input",update);
  var chips=h("div",{class:"chips"},(opts.chips||[]).map(function(v){
    return h("button",{class:"chip",type:"button",onclick:function(){amt.value=String(v);update()}},BRL.format(v).replace(",00",""));
  }));
  code.addEventListener("focus",function(){code.select()});
  update();
  return h("div",{class:"pix-panel"},qrBox,
    h("div",{class:"pix-info"},
      h("div",{class:"field"},h("label",{for:opts.idp+"-amount",text:"Valor (R$)"}),amt),
      opts.chips&&opts.chips.length?chips:null,err,sum,
      h("p",{class:"meta"},"Recebedor: ",h("b",{text:cfg.name})),
      h("label",{class:"label",for:opts.idp+"-code",text:"Pix copia e cola"}),code,
      h("div",{class:"btn-row"},copyBtn("Copiar código",function(){return code.value},code),copyBtn("Copiar chave",function(){return cfg.key}))));
}

function checkoutPanel(gift,contribution){
  var amount=h("input",{
    id:"checkout-amount",
    type:"text",
    inputmode:"decimal",
    autocomplete:"off",
    placeholder:"Ex.: 50,00",
    value:gift&&gift.price>0?String(gift.price).replace(".",","):""
  });
  var message=h("p",{class:"hint",role:"status",text:"A lista é apenas uma sugestão: contribuir é opcional e não reserva nem altera o presente."});
  var button=h("button",{class:"btn pix",type:"button",onclick:function(){
    var value=parseBRL(amount.value);
    if(value===null||isNaN(value)||value<0.5||value>999999.99){
      message.textContent="Informe um valor entre R$ 0,50 e R$ 999.999,99.";
      message.className="hint err";
      amount.focus();
      return;
    }
    button.disabled=true;button.textContent="Preparando pagamento…";
    message.textContent="";
    fetch("/api/payments/checkout",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({giftId:contribution?"__whylist_contribution__":gift.id,amount:value})
    }).then(function(response){
      return response.json().then(function(body){
        if(!response.ok) throw new Error(body.error||"Não foi possível iniciar o pagamento.");
        return body;
      });
    }).then(function(body){
      var checkoutUrl;
      try{checkoutUrl=new URL(body.url)}catch(e){throw new Error("A Stripe retornou um endereço de pagamento inválido.")}
      if(checkoutUrl.protocol!=="https:"||!/(^|\.)stripe\.com$/.test(checkoutUrl.hostname)){
        throw new Error("O endereço de pagamento não pertence à Stripe.");
      }
      window.location.assign(checkoutUrl.href);
    }).catch(function(error){
      message.textContent=error.message||"Não foi possível conectar ao servidor.";
      message.className="hint err";
      button.disabled=false;button.textContent="Pagar com Pix";
    });
  }},"Pagar com Pix");
  return h("div",{class:"pix-info"},
    field(contribution?"Valor da contribuição (R$)":"Contribuição sugerida (R$)","checkout-amount",amount,
      gift&&gift.price>0?"Sugestão, se quiser você pode alterar.":"Valor mínimo R$ 0,50."),
    message,
    h("div",{class:"btn-row"},button));
}

/* Folha de pagamento de um presente */
var sheetEl=$("#sheet"),lastFocus=null;
function openSheet(g,cfg){
  lastFocus=document.activeElement;
  var close=h("button",{class:"btn ghost icon-btn",type:"button","aria-label":"Fechar",onclick:closeSheet},icon("x"));
  sheetEl.replaceChildren(
    h("div",{class:"sheet-back",onclick:closeSheet}),
    h("div",{class:"sheet-panel",role:"dialog","aria-modal":"true","aria-labelledby":"sheet-title"},
      h("div",{class:"sheet-head"},h("h2",{id:"sheet-title",text:g.name}),close),
      g.note?h("p",{class:"note",text:g.note}):null,
      paymentsEnabled?checkoutPanel(g,false):pixPanel(cfg,{amount:g.price||0,idp:"sheet"}),
      !paymentsEnabled?h("p",{class:"hint",text:"A lista é apenas uma sugestão. Se fizer um Pix, a contribuição é opcional e não altera nem reserva este presente."}):null));
  sheetEl.hidden=false;document.body.classList.add("noscroll");close.focus();
}
function closeSheet(){
  sheetEl.hidden=true;sheetEl.replaceChildren();document.body.classList.remove("noscroll");
  if(lastFocus&&lastFocus.focus) lastFocus.focus();
}
document.addEventListener("keydown",function(e){
  if(sheetEl.hidden) return;
  if(e.key==="Escape"){closeSheet();return}
  if(e.key==="Tab"){
    var f=[].slice.call(sheetEl.querySelectorAll("button,input,textarea,a[href]")).filter(function(x){return !x.disabled});
    if(!f.length) return;
    var first=f[0],last=f[f.length-1];
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
  }
});

/* Seções da página */
function hero(s){
  var d=daysLeft(s.date);
  return h("header",{class:"hero"},
    h("div",{class:"hero-main"},
      h("p",{class:"eyebrow",text:"Whylist · lista de presentes"}),
      h("h1",null,"Aniversário de ",h("span",{class:"who",text:s.honoree||"Aniversariante"})),
      s.date&&parseDate(s.date)?h("p",{class:"when",text:fmtDate(s.date)}):null,
      s.message?h("p",{class:"msg",text:s.message}):null),
    d!==null?h("div",{class:"count"},
      h("strong",{class:"big",text:d===0?"Hoje":String(d)}),
      h("span",{text:d===0?"é dia de festa":(d===1?"dia para o aniversário":"dias para o aniversário")})):null);
}
function pixSection(s,cfg){
  var sec=h("section",{class:"pix-card","aria-labelledby":"pix-h"});
  var hasKey=!!(s.pix&&String(s.pix.key||"").trim());
  if(cfg.ok){
    sec.append(h("h2",{id:"pix-h",text:"Prefere enviar um valor livre?"}),
      paymentsEnabled?
        h("p",{class:"sub",text:"Contribua com qualquer valor a partir de R$ 0,50 pelo checkout Pix seguro da Stripe."}):
        h("p",{class:"sub",text:"Pix direto para "+cfg.name+". Escolha o valor, escaneie o QR code ou copie o código."}),
      paymentsEnabled?checkoutPanel(null,true):pixPanel(cfg,{amount:0,idp:"free",chips:[20,50,100]}));
  }else if(!hasKey&&isAdmin){
    sec.append(h("h2",{id:"pix-h",text:"Configure o Pix para receber"}),
      h("p",{class:"sub",text:"Informe sua chave Pix e o nome que aparece no seu banco. A página gera o QR code e o Pix copia e cola de cada presente."}),
      h("div",{class:"btn-row"},h("button",{class:"btn pix",type:"button",onclick:function(){startEdit(true)}},"Configurar Pix")));
  }else{
    sec.append(h("h2",{id:"pix-h",text:"Pix"}),
      h("p",{class:"sub",text:hasKey?cfg.msg:"O Pix desta lista ainda não foi configurado. Volte em breve."}));
  }
  return sec;
}
function giftCard(g,s,cfg){
  var href=safeUrl(g.link),acts=h("div",{class:"gift-actions"});
  if(cfg.ok) acts.append(h("button",{class:"btn pix",type:"button",onclick:function(){openSheet(g,cfg)}},"Contribuir com Pix"));
  else acts.append(h("span",{class:"pill muted",text:"Pix ainda não configurado"}));
  if(href) acts.append(h("a",{class:"link",href:href,target:"_blank",rel:"noopener noreferrer"},"Ver produto",icon("ext")));
  return h("article",{class:"gift"},
    mediaEl(g),
    h("div",{class:"gift-top"},h("h3",{text:g.name}),h("span",{class:"price",text:g.price>0?BRL.format(g.price):"Valor livre"})),
    g.note?h("p",{class:"note",text:g.note}):null,
    isAdmin&&g.ex?h("span",{class:"pill warn",text:"Exemplo"}):null,
    acts);
}
function field(label,id,control,hint,cls){
  return h("div",{class:"field"+(cls?" "+cls:"")},h("label",{for:id,text:label}),control,hint?h("p",{class:"hint",text:hint}):null);
}
function txt(id,val,onin,attrs){
  var a={id:id,type:"text",value:val||"",autocomplete:"off"};
  for(var k in (attrs||{})) a[k]=attrs[k];
  var el=h("input",a);
  el.addEventListener("input",function(){onin(el.value);setDirty()});
  return el;
}
function giftEditCard(g){
  var id=g.id;
  return h("article",{class:"gift"},
    field("Nome do presente","n-"+id,txt("n-"+id,g.name,function(v){g.name=v},{maxlength:80})),
    h("div",{class:"row2"},
      field("Valor (R$)","p-"+id,txt("p-"+id,g.price>0?String(g.price).replace(".",","):"",function(v){g._pt=v},{inputmode:"decimal",placeholder:"Valor livre"})),
      field("Link (opcional)","l-"+id,txt("l-"+id,g.link||"",function(v){g.link=v},{inputmode:"url",placeholder:"https://"}))),
    field("Observação (opcional)","o-"+id,txt("o-"+id,g.note||"",function(v){g.note=v},{maxlength:140})),
    h("div",{class:"field"},h("span",{class:"label",text:"Imagem (opcional)"}),
      imagePicker("img-"+id,function(){return g.img||null},function(v){if(v) g.img=v;else delete g.img;setDirty()})),
    g.ex?h("span",{class:"pill warn",text:"Exemplo"}):null,
    h("div",{class:"gift-actions"},
      h("button",{class:"btn ghost danger small",type:"button",onclick:function(){
        draft.gifts=draft.gifts.filter(function(x){return x.id!==id});
        setDirty();render();toast("Presente removido. Salve para publicar.");
      }},icon("trash"),"Remover")));
}
function addForm(){
  var n=h("input",{id:"add-name",type:"text",maxlength:80,placeholder:"Ex.: Jogo de toalhas",autocomplete:"off"});
  var p=h("input",{id:"add-price",type:"text",inputmode:"decimal",placeholder:"Valor livre",autocomplete:"off"});
  var o=h("input",{id:"add-note",type:"text",maxlength:140,placeholder:"Cor, tamanho, loja…",autocomplete:"off"});
  var l=h("input",{id:"add-link",type:"text",inputmode:"url",placeholder:"https://",autocomplete:"off"});
  var e=h("p",{class:"hint err",role:"status"});
  var pending=null;
  function add(){
    var name=n.value.trim();
    if(!name){e.textContent="Dê um nome ao presente.";n.focus();return}
    var price=parseBRL(p.value);
    if(price!==null&&(isNaN(price)||price<0||price>999999.99)){e.textContent="Valor inválido. Use algo como 120,50.";p.focus();return}
    var link=safeUrl(l.value);
    if(link===null){e.textContent="Link inválido. Use um endereço http ou https.";l.focus();return}
    var ng={id:uid(),name:name,price:price||0,note:o.value.trim(),link:link};
    if(pending) ng.img=pending;
    draft.gifts.unshift(ng);
    setDirty();render();
    var nn=$("#add-name");if(nn) nn.focus();
    toast("Adicionado: "+name);
  }
  return h("form",{class:"add",novalidate:true,onsubmit:function(ev){ev.preventDefault();add()}},
    h("h3",{text:"Adicionar presente"}),
    h("div",{class:"form-grid"},
      field("Nome do presente","add-name",n,null,"wide"),
      field("Valor (R$)","add-price",p,"Deixe em branco para valor livre."),
      field("Link (opcional)","add-link",l),
      field("Observação (opcional)","add-note",o,null,"wide"),
      h("div",{class:"field wide"},h("span",{class:"label",text:"Imagem (opcional)"}),
        imagePicker("add-img",function(){return pending},function(v){pending=v}))),
    e,
    h("div",{class:"btn-row"},h("button",{class:"btn primary",type:"submit"},icon("plus"),"Adicionar à lista")));
}
function giftsSection(s,cfg){
  var total=s.gifts.length;
  var sec=h("section",{"aria-labelledby":"gifts-h",id:"gifts-wrap"});
  sec.append(h("div",{class:"sec-head"},
    h("div",null,h("h2",{id:"gifts-h",text:"Sugestões de presentes"}),
      h("p",{class:"hint",text:"Ideias para quem quiser presentear — sem reserva ou obrigação."}))));
  if(editing){
    sec.append(addForm());
    var ex=s.gifts.filter(function(g){return g.ex}).length;
    if(ex) sec.append(h("div",{class:"banner"},h("span",{text:ex+(ex===1?" presente de exemplo na lista.":" presentes de exemplo na lista.")}),
      h("button",{class:"btn ghost small",type:"button",onclick:function(){
        draft.gifts=draft.gifts.filter(function(g){return !g.ex});setDirty();render();toast("Exemplos removidos. Salve para publicar.");
      }},icon("trash"),"Remover exemplos")));
  }
  if(!total) sec.append(h("div",{class:"empty",text:editing?"Nenhum presente ainda. Use o formulário acima para adicionar o primeiro.":"A lista ainda está vazia. Volte em breve."}));
  else sec.append(h("div",{class:"grid"},s.gifts.map(function(g){return editing?giftEditCard(g):giftCard(g,s,cfg)})));
  return sec;
}
function settingsPanel(s){
  var pix=s.pix;
  var typeSel=h("select",{id:"f-type"},TYPES.map(function(t){return h("option",{value:t[0],selected:pix.type===t[0]},t[1])}));
  typeSel.addEventListener("change",function(){pix.type=typeSel.value;setDirty();refreshPixStatus()});
  var themeSel=h("select",{id:"f-theme"},[
    h("option",{value:"system",selected:!s.theme||s.theme==="system"},"Automático (sistema)"),
    h("option",{value:"light",selected:s.theme==="light"},"Claro"),
    h("option",{value:"dark",selected:s.theme==="dark"},"Escuro")
  ]);
  themeSel.addEventListener("change",function(){s.theme=themeSel.value;applySiteSettings(s);setDirty()});
  var msg=h("textarea",{id:"f-message",class:"in",rows:3,maxlength:280},s.message||"");
  msg.addEventListener("input",function(){s.message=msg.value;setDirty()});
  var date=txt("f-date",s.date,function(v){s.date=v},{type:"date"});
  return h("div",{class:"settings-stack"},
    h("details",{class:"panel",open:true},
      h("summary",{text:"Configurações do site"}),
      h("div",{class:"form-grid"},
        field("Nome na aba do navegador","f-site-title",txt("f-site-title",s.siteTitle||"Whylist",function(v){s.siteTitle=v;applySiteSettings(s)},{maxlength:60}),"Exibido no título da aba."),
        field("Aparência","f-theme",themeSel,"Escolha o tema do site."))),
    h("details",{class:"panel",open:true},
      h("summary",{text:"Aniversariante e Pix"}),
    h("div",{class:"form-grid"},
      field("Nome de quem faz aniversário","f-honoree",txt("f-honoree",s.honoree,function(v){s.honoree=v;refreshPixStatus()},{maxlength:40})),
      field("Data do aniversário","f-date",date,"Usada para a contagem regressiva."),
      field("Mensagem para os convidados (opcional)","f-message",msg,null,"wide"),
      field("Tipo de chave Pix","f-type",typeSel),
      field("Chave Pix","f-key",txt("f-key",pix.key,function(v){pix.key=v;refreshPixStatus()}),null),
      field("Nome do recebedor","f-pname",txt("f-pname",pix.name,function(v){pix.name=v;refreshPixStatus()},{maxlength:25}),"Como aparece no seu banco, até 25 letras. Se ficar vazio, usa o nome acima."),
      field("Cidade (opcional)","f-city",txt("f-city",pix.city,function(v){pix.city=v;refreshPixStatus()},{maxlength:15}),"Até 15 letras.")),
    importBlock(),
    h("div",{class:"pix-test"},
      h("div",{class:"qr small",id:"test-qr",hidden:true}),
      h("div",{class:"txt"},
        h("p",{class:"hint",id:"pix-status"}),
        h("p",{class:"hint",text:"Teste: escaneie com o app do seu banco. O nome do recebedor deve aparecer antes de você confirmar. Não precisa pagar."})))));
}
function refreshPixStatus(){
  var s=draft,st=$("#pix-status"),box=$("#test-qr");
  if(!st||!s) return;
  var ph={cpf:"000.000.000-00",cnpj:"00.000.000/0000-00",phone:"(61) 99999-0000",email:"voce@exemplo.com.br",random:"123e4567-e89b-12d3-a456-426614174000"};
  $("#f-key").placeholder=ph[s.pix.type]||"";
  box.replaceChildren();box.hidden=true;
  if(!String(s.pix.key||"").trim()){st.textContent="Informe a chave Pix para gerar os QR codes.";st.className="hint";return}
  var c=pixConfig(s.pix,s.honoree);
  if(!c.ok){st.textContent=c.msg;st.className="hint err";return}
  st.textContent="Chave válida: "+c.key+". Recebedor: "+c.name+", "+c.city+".";st.className="hint ok";
  var svg=qrSvg(buildPix(c,0));
  if(svg){box.append(svg);box.hidden=false}
}
function adminBar(s){
  if(!editing){
    if(backendMode&&!isAdmin){
      return h("div",{class:"bar"},h("div",{class:"bar-in"},
        h("p",{class:"bar-msg",text:"Lista pública de presentes."}),
        h("button",{class:"btn ghost",type:"button",onclick:loginAdmin},"Entrar como administrador")));
    }
    var hasEx=s.gifts.some(function(g){return g.ex});
    return h("div",{class:"bar"},h("div",{class:"bar-in"},
      h("p",{class:"bar-msg",text:localMode?"Painel local: suas alterações ficam salvas somente neste navegador.":(backendMode?"Painel administrativo protegido.":(hasEx?"Você gerencia esta lista. Os presentes marcados como exemplo são só ilustração.":"Você gerencia esta lista."))}),
      localMode?h("button",{class:"btn ghost",type:"button",onclick:exportConfig},"Baixar configuração"):null,
      h("button",{class:"btn primary",type:"button",onclick:function(){startEdit(false)}},icon("edit"),"Editar lista"),
      backendMode?h("button",{class:"btn ghost",type:"button",onclick:logoutAdmin},"Sair"):null));
  }
  return h("div",{class:"bar editing"},h("div",{class:"bar-in"},
    h("p",{class:"bar-msg",id:"bar-status",text:dirty?"Alterações não salvas":"Modo edição"}),
    h("div",{class:"bar-btns"},
      h("button",{class:"btn ghost",id:"discard-btn",type:"button",onclick:discard},"Descartar"),
      h("button",{class:"btn primary",id:"save-btn",type:"button",onclick:save,disabled:saving},
        saving?"Salvando…":(localMode?"Salvar alterações":"Salvar e publicar")))));
}
function render(){
  var s=cur(),cfg=pixConfig(s.pix,s.honoree),app=$("#app");
  applySiteSettings(s);
  var parts=[
    (isAdmin||backendMode)?adminBar(s):null,
    hero(s),
    editing?settingsPanel(s):pixSection(s,cfg),
    giftsSection(s,cfg),
    h("footer",{class:"foot",text:paymentsEnabled?
      "Pagamentos Pix feitos pelo checkout Stripe são confirmados automaticamente. Pagamentos enviados diretamente à chave Pix não são detectados.":
      "O pagamento é feito direto no app do seu banco, para a chave Pix de quem faz aniversário. Esta página não confirma pagamentos."})
  ].filter(Boolean);
  app.replaceChildren.apply(app,parts);
  if(editing) refreshPixStatus();
}

/* Edição e publicação */
function startEdit(focusPix){
  draft=JSON.parse(JSON.stringify(saved));editing=true;dirty=false;armed=false;
  render();
  window.scrollTo(0,0);
  if(focusPix){var k=$("#f-key");if(k) k.focus()}
}
function discard(){
  if(dirty&&!armed){
    armed=true;
    var b=$("#discard-btn");if(b) b.textContent="Descartar mesmo?";
    setTimeout(function(){armed=false;var b2=$("#discard-btn");if(b2) b2.textContent="Descartar"},4000);
    return;
  }
  armed=false;editing=false;draft=null;dirty=false;render();
}
function finalize(){
  var d=JSON.parse(JSON.stringify(draft));
  d.honoree=d.honoree.trim();d.message=d.message.trim();
  d.siteTitle=String(d.siteTitle||"Whylist").trim()||"Whylist";
  if(["light","dark","system"].indexOf(d.theme)<0) d.theme="system";
  d.pix.key=d.pix.key.trim();d.pix.name=d.pix.name.trim();d.pix.city=d.pix.city.trim();
  if(d.pix.key){var c=pixConfig(d.pix,d.honoree);if(!c.ok) return {error:c.msg,focus:"#f-key"}}
  for(var i=0;i<d.gifts.length;i++){
    var g=d.gifts[i];
    g.name=String(g.name||"").trim();
    if(!g.name) return {error:"Todo presente precisa de um nome.",focus:"#n-"+g.id};
    if(g._pt!==undefined){
      var n=parseBRL(g._pt);
      if(n!==null&&(isNaN(n)||n<0||n>999999.99)) return {error:"Valor inválido em "+g.name+".",focus:"#p-"+g.id};
      g.price=n||0;delete g._pt;
    }
    var u=safeUrl(g.link);
    if(u===null) return {error:"Link inválido em "+g.name+".",focus:"#l-"+g.id};
    g.link=u;g.note=String(g.note||"").trim();delete g.given;
    if(g.img&&!imgOf(g)) delete g.img;
  }
  return {data:d};
}
function buildDoc(d){
  var json=JSON.stringify(d).replace(/</g,"\\u003c");
  return "<!doctype html><html><head><meta charset=utf8><meta name=viewport content=\"width=device-width,initial-scale=1,viewport-fit=cover\"><style>"+RESET+"</style></head><body>"+
    "<title>Whylist</title>\n<meta name=\"claude:viewport-fit-sides\" content=\"cover\">\n"+
    "<link rel=\"stylesheet\" href=\""+FONTS+"\">\n"+
    "<style id=\"appstyle\">"+$("#appstyle").textContent+"</style>\n"+
    MARKUP+"\n"+
    "<script type=\"application/json\" id=\"state\">"+json+"<\/script>\n"+
    "<script src=\""+LIB+"\"><\/script>\n"+
    "<script src=\""+LIB2+"\"><\/script>\n"+
    "<script id=\"appscript\">"+$("#appscript").textContent+"<\/script>"+
    "</body></html>";
}
function save(){
  if(saving) return;
  if(!localMode&&!backendMode&&!art){toast("Salvar não está disponível nesta visualização.");return}
  var r=finalize();
  if(r.error){toast(r.error);var f=$(r.focus);if(f) f.focus();return}
  if(localMode){
    try{window.localStorage.setItem("whylist-state-v1",JSON.stringify(r.data))}
    catch(e){toast("Não foi possível salvar neste navegador. Verifique o espaço disponível e as permissões.");return}
    saved=r.data;draft=null;editing=false;dirty=false;render();toast("Alterações salvas neste navegador.");return;
  }
  if(backendMode){
    saving=true;
    var backendButton=$("#save-btn");if(backendButton){backendButton.disabled=true;backendButton.textContent="Salvando…"}
    fetch("/api/admin/state",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(r.data)})
      .then(function(response){return response.json().then(function(body){if(!response.ok) throw new Error(body.error||"Não foi possível salvar.");return body})})
      .then(function(state){saved=state;draft=null;editing=false;dirty=false;saving=false;render();toast("Lista salva e atualizada para todos.")})
      .catch(function(error){
        saving=false;
        var button=$("#save-btn");if(button){button.disabled=false;button.textContent="Salvar alterações"}
        toast(error.message||"Não foi possível conectar ao servidor.");
      });
    return;
  }
  saving=true;
  var b=$("#save-btn");if(b){b.disabled=true;b.textContent="Salvando…"}
  art.publish(buildDoc(r.data)).then(function(){toast("Publicado")}).catch(function(e){
    saving=false;
    var b2=$("#save-btn");if(b2){b2.disabled=false;b2.textContent="Salvar e publicar"}
    var c=e&&e.code;
    if(c==="conflict") toast("Outra versão foi publicada antes. A página vai recarregar.");
    else if(c==="not_writer"||c==="not_granted"||c==="consent_required"||c==="capability_disabled"||c==="capability_removed"||c==="not_declared"){art=null;toast("Você não tem permissão para salvar esta lista.")}
    else if(c==="rate_limited") toast("Muitas publicações seguidas. Espere um instante e tente de novo.");
    else if(c==="too_large") toast("A lista ficou grande demais para salvar.");
    else toast("Não foi possível salvar. Tente de novo.");
  });
}

function handleCheckoutReturn(){
  var params=new URLSearchParams(location.search),result=params.get("pagamento");
  if(!result) return;
  history.replaceState(null,"",location.pathname+location.hash);
  if(result==="cancelado"){toast("Checkout fechado. As sugestões continuam disponíveis.");return}
  if(result==="confirmado"){toast("Obrigado pela contribuição!");return}
  toast("Retorno do checkout não reconhecido.");
}

(async function(){
  var bootError="";
  try{
    if(window.claude&&typeof window.claude.use==="function"){
      localMode=false;isAdmin=false;
      var u=await window.claude.use("user");
      isAdmin=u?await u.canEdit():false;
      art=await window.claude.use("artifact");
      try{assetsApi=isAdmin?await window.claude.use("assets"):null}catch(e2){assetsApi=null}
    }else if(location.protocol!=="file:"){
      try{
        var statusResponse=await fetch("/api/status");
        if(statusResponse.ok){
          var status=await statusResponse.json();
          if(status.backend===true){
            backendMode=true;localMode=false;isAdmin=!!status.admin;
            if(!status.configured) throw new Error("Backend sem configuração necessária.");
            paymentsEnabled=!!status.payments;
            if(isAdmin&&status.storage==="supabase"){
              assetsApi={upload:function(blob){
                return fetch("/api/images",{method:"POST",headers:{"Content-Type":"image/jpeg"},body:blob})
                  .then(function(response){return response.json().then(function(body){
                    if(!response.ok) throw new Error(body.error||"Não foi possível enviar a imagem.");
                    return body;
                  })});
              }};
            }
            var stateResponse=await fetch("/api/state");
            if(!stateResponse.ok) throw new Error("Não foi possível carregar a lista do servidor.");
            saved=await stateResponse.json();
          }
        }else if(statusResponse.status!==404){
          backendMode=true;localMode=false;
          throw new Error("O servidor não conseguiu verificar a sessão administrativa.");
        }
      }catch(e3){
        if(backendMode){isAdmin=false;bootError="Não foi possível carregar os dados do servidor."}
      }
    }
  }catch(e){bootError="Não foi possível inicializar o painel administrativo."}
  render();
  handleCheckoutReturn();
  if(storageNotice&&!backendMode) toast(storageNotice);
  if(bootError) toast(bootError);
})();
})();
