(function(){
"use strict";

var ETAPAS=[
  {id:"novo",nome:"Novo"},{id:"contatado",nome:"Contatado"},{id:"negociando",nome:"Negociando"},
  {id:"recuperado",nome:"Recuperado"},{id:"perdido",nome:"Perdido"}
];
var MOTIVOS=[
  {id:"taxa",nome:"Taxa alta",guia:"Pergunte quanto ele paga hoje antes de falar qualquer número. Compare débito, crédito à vista e parcelado, e some o aluguel."},
  {id:"concorrente",nome:"Foi para outra maquininha",guia:"Peça a taxa e o prazo da outra. Se a deles for melhor, diga isso e deixe a porta aberta."},
  {id:"defeito",nome:"Problema com a maquininha",guia:"Ouça sem justificar. Resolva ou encaminhe com prazo e diga quando volta a falar com ele."},
  {id:"suporte",nome:"Atendimento / suporte",guia:"Peça desculpa uma vez, passe seu contato direto e acompanhe o caso até o fim."},
  {id:"vendas",nome:"Vendas baixas, parou de usar",guia:"Descubra se o movimento caiu ou se ele vende de outro jeito. Não empurre contrato; ofereça algo leve."},
  {id:"prazo",nome:"Prazo de recebimento",guia:"Explique quando o dinheiro cai e quanto custa receber antes, para ele escolher."},
  {id:"aluguel",nome:"Cobrança de aluguel",guia:"Mostre o custo total por mês, aluguel mais taxas, comparado com o que ele vende no cartão."},
  {id:"outro",nome:"Outro / não sei",guia:"Comece perguntando o que aconteceu. Só depois fale de condições."}
];
var TIPOS=["WhatsApp","Ligação","Visita","Anotação"];
var CONTATOS=["WhatsApp","Ligação","Visita"];
var KINDS=[{id:"primeiro",nome:"Primeiro contato"},{id:"retomada",nome:"Retomada"},{id:"porta",nome:"Porta aberta"}];
var OBJECOES=[
  {t:"“A taxa de vocês é alta”",r:"Entendo. Posso ver com você quanto está pagando hoje? Quero comparar débito, crédito à vista e parcelado, porque cada um tem sua taxa. Se eu não conseguir melhorar, te digo na hora.",d:"Pergunte antes de oferecer. Sem saber a taxa da outra maquininha, qualquer número seu é chute."},
  {t:"“Já fechei com outra empresa”",r:"Tudo bem, obrigado por me contar. Sem compromisso: me manda a taxa e o prazo que você tem hoje e eu comparo. Se a deles for melhor, eu mesmo te falo. Posso te chamar daqui a um mês para ver como está?",d:"Peça permissão para voltar a falar. Com o sim dele, o próximo contato deixa de ser insistência."},
  {t:"“Tive problema e ninguém resolveu”",r:"Você tem razão de estar chateado e eu peço desculpa. Me conta o que aconteceu desde o começo. Vou cuidar disso pessoalmente e te aviso até o fim da semana como ficou.",d:"Não se defenda nem explique a falha antes de ouvir. Combine um prazo e cumpra."},
  {t:"“Parei de vender no cartão”",r:"Imagino que o momento esteja apertado. Como estão as vendas hoje? Se fizer sentido, eu vejo uma condição que não pese enquanto o movimento está baixo, e a gente conversa de novo quando melhorar.",d:"Não empurre contrato. Marque um retorno e registre aqui."},
  {t:"“Vou pensar”",r:"Claro, sem pressa. Só para eu te ajudar melhor: o que falta para você decidir? Se for questão de números, eu te mando por escrito agora. Posso te chamar daqui a dois dias?",d:"Troque o “vou pensar” por uma data e por uma dúvida concreta."},
  {t:"“Demora demais para receber”",r:"Faz sentido, dinheiro parado pesa. Posso te explicar como funciona o prazo e as opções para receber antes, com o custo de cada uma, para você escolher o que compensa?",d:"Mostre o custo de receber antes. Quem entende o número decide mais rápido."},
  {t:"“Não quero mais, obrigado”",r:"Sem problema, agradeço sua atenção. Se mudar de ideia ou precisar de uma maquininha mais para frente, é só me chamar. Posso perguntar o que pesou mais na sua decisão? Ajuda a gente a melhorar.",d:"Duas ou três tentativas bastam. Registre o motivo, marque como Perdido e agende uma revisita longa."}
];

var S={clients:[],loaded:false,mode:"pending",slow:false,err:"",tab:"clientes",filter:"todos",openId:null,newMode:false,importMode:false,imp:null,prog:null,q:"",fmot:"",selMode:false,sel:{},bulkDel:false,cfg:{msgs:{},meta:10},team:null,teamBusy:false,teamErr:"",auth:null,authErr:"",authDel:"",notified:false,isGestor:!!window.RC_GESTOR,
  msgKind:"primeiro",msgText:{},vendedor:(window.RC_NOME||"Consultor"),note:"",noteTipo:"WhatsApp",confirmDel:null,trigger:null};
try{var sv=localStorage.getItem("rc.vendedor."+(window.RC_UID||""));if(sv)S.vendedor=sv;}catch(e){}

var DB=null, chain={}, toastTimer=null, slowTimer=null;
var $=function(s,r){return (r||document).querySelector(s);};
var esc=function(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});};
var pad=function(n){return String(n).padStart(2,"0");};
var dstr=function(d){return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());};
var today=function(){return dstr(new Date());};
var addDays=function(n){var d=new Date();d.setDate(d.getDate()+n);return dstr(d);};
var dayDiff=function(a,b){return Math.round((new Date(a+"T00:00:00")-new Date(b+"T00:00:00"))/864e5);};
var fmtDM=function(s){return s?s.slice(8,10)+"/"+s.slice(5,7):"";};
var dayOf=function(iso){return dstr(new Date(iso));};
var clone=function(o){return JSON.parse(JSON.stringify(o));};
var uid=function(){return "c"+Date.now().toString(36)+Math.random().toString(36).slice(2,6);};
var find=function(id){return S.clients.filter(function(c){return c.id===id;})[0];};
var etapaNome=function(id){var e=ETAPAS.filter(function(x){return x.id===id;})[0];return e?e.nome:id;};
var motivoOf=function(id){return MOTIVOS.filter(function(x){return x.id===id;})[0]||MOTIVOS[MOTIVOS.length-1];};
var isActive=function(c){return c.etapa!=="recuperado"&&c.etapa!=="perdido";};
function rel(iso){var n=dayDiff(today(),dayOf(iso));if(n<=0)return "hoje";if(n===1)return "ontem";return "há "+n+" dias";}
function fmtDT(iso){var d=new Date(iso);return pad(d.getDate())+"/"+pad(d.getMonth()+1)+" "+pad(d.getHours())+":"+pad(d.getMinutes());}
function waNumber(t){var d=String(t||"").replace(/\D/g,"");if(d.length===10||d.length===11)d="55"+d;return (d.length>=12&&d.length<=13)?d:"";}
function waHref(c,text){var n=waNumber(c.telefone);return n?"https://wa.me/"+n+"?text="+encodeURIComponent(text):"";}
function lastContact(c){var h=(c.hist||[]).filter(function(x){return CONTATOS.indexOf(x.tipo)>=0;}).sort(function(a,b){return b.em.localeCompare(a.em);});return h.length?h[0].em:"";}
function counts(){var o={};ETAPAS.forEach(function(e){o[e.id]=0;});S.clients.forEach(function(c){if(o[c.etapa]!=null)o[c.etapa]++;});return o;}
function dueList(){var t=today();return S.clients.filter(function(c){return c.proximo&&c.proximo<=t&&isActive(c);});}

function composeMsg(c,kind){
  var n=(c.nome||"").trim().split(/\s+/)[0];
  var v=S.vendedor||window.RC_NOME||"Consultor";
  var custom=((S.cfg&&S.cfg.msgs&&S.cfg.msgs[kind])||"").trim();
  if(custom)return fillVars(custom,c,n,v);
  var oi="Oi"+(n?", "+n:"")+", tudo bem?";
  var saud=oi+" Aqui é o "+v+", da FaturePag.";
  if(kind==="retomada")return saud+" Passando para saber se você viu minha mensagem. Ainda quero entender o que aconteceu e ver se consigo resolver para o seu negócio. Qual o melhor horário para eu te ligar?";
  if(kind==="porta")return "Oi"+(n?", "+n:"")+"! Entendo que agora não faça sentido voltar, e tudo bem. Agradeço a conversa. Se mais para frente você quiser rever taxas ou precisar de uma maquininha, é só me chamar neste número. Sucesso com o seu negócio!";
  var m={
    taxa:"Soube que você saiu por causa da taxa, e quero entender isso melhor. Se você me contar quanto está pagando hoje, eu refaço a conta com você e vejo se consigo uma condição melhor para o seu negócio. Posso te ligar rapidinho?",
    concorrente:"Vi que você passou para outra maquininha. Sem compromisso: se me mandar as taxas que está pagando hoje, eu comparo com as nossas e te mostro na ponta do lápis. Se não compensar para você, eu mesmo te digo.",
    defeito:"Soube que a maquininha deu problema, e isso não devia ter acontecido. Me conta o que houve que eu cuido do seu caso pessoalmente e vejo o que dá para fazer, inclusive a troca do aparelho.",
    suporte:"Soube que o atendimento não foi como deveria, e peço desculpa por isso. A partir de agora você fala direto comigo neste número e eu acompanho seu caso de perto. Posso te ligar para entender o que aconteceu?",
    vendas:"Percebi que a maquininha ficou parada. Como estão as vendas no cartão aí? Se for questão de taxa, modelo do aparelho ou prazo, quero ver o que ajustar para ela voltar a compensar.",
    prazo:"Soube que o prazo para receber te incomodou. Posso te explicar as opções de recebimento e o custo de cada uma para você decidir com calma?",
    aluguel:"Soube que a cobrança do aluguel da maquininha pesou. Vamos olhar isso juntos? Quero ver qual modelo e condição encaixam melhor no seu negócio.",
    outro:"Meu chefe me passou o seu contato e eu queria entender o que aconteceu com a sua maquininha. Se algo não deu certo, quero ouvir e ver o que consigo fazer por você. Posso te ligar rapidinho?"
  };
  return saud+" "+(m[c.motivo]||m.outro);
}

/* ---------- armazenamento ---------- */
function loadLocal(){try{var r=localStorage.getItem("rc.clientes.v1");S.clients=r?JSON.parse(r):[];}catch(e){S.clients=[];}S.loaded=true;}
function saveLocal(){try{localStorage.setItem("rc.clientes.v1",JSON.stringify(S.clients));}catch(e){S.err="Não consegui guardar neste navegador.";renderNotice();}}
function dbFail(){S.err="Não consegui salvar a última alteração. Confira a conexão e tente de novo.";renderNotice();}
function persist(c){
  if(DB){var ref=DB.collection("clientes").doc(c.id);chain[c.id]=(chain[c.id]||Promise.resolve()).then(function(){return ref.set(c);}).catch(dbFail);}
  else saveLocal();
}
function put(c,opts){
  c.atualizadoEm=new Date().toISOString();
  var i=S.clients.findIndex(function(x){return x.id===c.id;});
  if(i>=0)S.clients[i]=c;else S.clients.push(c);
  persist(c);render(!(opts&&opts.keep));
}
function edit(id,fn,opts){var o=find(id);if(!o)return;var c=clone(o);if(!Array.isArray(c.hist))c.hist=[];fn(c);put(c,opts);}
function removeClient(id){
  var old=find(id);
  if(old&&API()&&API().unregDup){var nn=waNumber(old.telefone);if(nn)API().unregDup(nn).catch(function(){});}
  S.clients=S.clients.filter(function(x){return x.id!==id;});
  if(DB){chain[id]=(chain[id]||Promise.resolve()).then(function(){return DB.collection("clientes").doc(id).delete();}).catch(dbFail);}
  else saveLocal();
}

/* ---------- recursos extras ---------- */
var FATORES=["Taxa melhor","Troca de maquininha","Atendimento / suporte","Condição especial","Outro"];
var API=function(){return window.RC_API||null;};

function fillVars(t,c,n,v){
  return String(t).replace(/\{nome\}/gi,n||"").replace(/\{consultor\}/gi,v||"").replace(/\{negocio\}/gi,(c.negocio||"")).replace(/\{motivo\}/gi,motivoOf(c.motivo).nome.toLowerCase());
}
function countContacts(cs,from,to){
  var n=0;
  cs.forEach(function(c){(c.hist||[]).forEach(function(h){
    if(CONTATOS.indexOf(h.tipo)>=0){var d=dayOf(h.em);if(d>=from&&d<=to)n++;}
  });});
  return n;
}
function contactsToday(){var t=today();return countContacts(S.clients,t,t);}

/* configurações de cada consultor: mensagens próprias e meta diária */
function mergeCfg(c){
  c=c||{};
  var m=(c.msgs&&typeof c.msgs==="object")?c.msgs:{};
  var meta=Number(c.meta);
  return {msgs:m,meta:(c.meta==null||c.meta===""||!isFinite(meta))?10:meta};
}
function loadCfg(){
  var api=API();
  if(api&&api.getConfig){api.getConfig().then(function(c){S.cfg=mergeCfg(c);render(false);}).catch(function(){});}
  else{try{var r=localStorage.getItem("rc.cfg");if(r)S.cfg=mergeCfg(JSON.parse(r));}catch(e){}}
}
function saveCfg(){
  var api=API(),data={msgs:S.cfg.msgs,meta:S.cfg.meta};
  if(api&&api.saveConfig)return api.saveConfig(data);
  try{localStorage.setItem("rc.cfg",JSON.stringify(data));}catch(e){}
  return Promise.resolve();
}

/* avisos de retorno */
function updateBadge(){
  var n=dueList().length;
  document.title=(n?"("+n+") ":"")+"Recupera Clientes";
  try{if(navigator.setAppBadge){if(n)navigator.setAppBadge(n);else navigator.clearAppBadge();}}catch(e){}
}
function notifyDue(){
  if(S.notified||!S.loaded||!("Notification" in window)||Notification.permission!=="granted")return;
  var n=dueList().length;if(!n)return;
  var k="rc.notif."+(window.RC_UID||""),t=today();
  try{if(localStorage.getItem(k)===t){S.notified=true;return;}localStorage.setItem(k,t);}catch(e){}
  S.notified=true;
  var msg=n+(n===1?" cliente para contatar hoje.":" clientes para contatar hoje.");
  var plain=function(){try{new Notification("Recupera Clientes",{body:msg});}catch(e){}};
  if(navigator.serviceWorker&&navigator.serviceWorker.ready){
    navigator.serviceWorker.ready.then(function(r){return r.showNotification("Recupera Clientes",{body:msg,icon:"assets/icon-192.png",tag:"retornos"});}).catch(plain);
  }else plain();
}

/* busca e filtros */
function matchQ(c){
  var q=norm(S.q);if(!q)return true;
  var hay=norm((c.nome||"")+" "+(c.negocio||"")+" "+(c.origem||""));
  var qd=digits(S.q);
  return hay.indexOf(q)>=0||(qd.length>=3&&digits(c.telefone).indexOf(qd)>=0);
}
function toolbar(){
  var opts='<option value="">Todos os motivos</option>'+MOTIVOS.map(function(m){return '<option value="'+m.id+'"'+(S.fmot===m.id?" selected":"")+'>'+esc(m.nome)+'</option>';}).join("");
  return '<div id="tools" class="tools"><input class="in" id="q" type="search" placeholder="Buscar por nome ou telefone" value="'+esc(S.q)+'" aria-label="Buscar cliente" autocomplete="off">'+
    '<select class="sel" id="fmot" aria-label="Filtrar por motivo da saída">'+opts+'</select>'+
    '<button class="btn ghost" data-action="selmode" aria-pressed="'+S.selMode+'">'+(S.selMode?"Cancelar seleção":"Selecionar")+'</button>'+
    '<button class="btn ghost" data-action="export">Baixar Excel</button></div>';
}
function bulkBar(list){
  var n=selIds().length;
  return '<div class="bulk"><b>'+n+' selecionado'+(n===1?"":"s")+'</b>'+
    '<button class="btn sm ghost" data-action="selall">Selecionar todos ('+list.length+')</button>'+
    '<button class="btn sm ghost" data-action="selnone">Limpar</button>'+
    '<select class="sel" id="bulk-stage" aria-label="Mudar a etapa dos selecionados"><option value="">Mudar etapa…</option>'+ETAPAS.map(function(e){return '<option value="'+e.id+'">'+e.nome+'</option>';}).join("")+'</select>'+
    '<button class="btn sm ghost" data-action="bulkdate" data-d="1">Retorno amanhã</button><button class="btn sm ghost" data-action="bulkdate" data-d="3">3 dias</button><button class="btn sm ghost" data-action="bulkdate" data-d="7">1 semana</button>'+
    (S.bulkDel?'<button class="btn sm danger" data-action="bulkdelok">Confirmar exclusão de '+n+'</button><button class="btn sm ghost" data-action="bulkdelno">Voltar</button>':'<button class="btn sm danger" data-action="bulkdel">Excluir</button>')+
    '</div>';
}
function listHTML(){
  if(!S.loaded&&!S.clients.length)return '<div class="empty">Carregando seus clientes…</div>';
  if(!S.clients.length)return '<div class="empty"><b>Nenhum cliente ainda.</b><br>Toque em “Novo cliente” para cadastrar um por um, ou em “Importar planilha” para subir vários de uma vez, por planilha, foto ou texto colado. Cada um entra no funil como Novo, com lembrete para hoje.</div>';
  var list=filtered();
  var title=S.filter==="todos"?"Todos os clientes":S.filter==="hoje"?"Para contatar hoje":etapaNome(S.filter);
  var head='<div class="listhead"><h2>'+esc(title)+'</h2><span>'+list.length+'</span></div>';
  var bulk=S.selMode?bulkBar(list):"";
  if(!list.length)return bulk+head+'<div class="empty">'+((S.q||S.fmot)?"Nenhum cliente encontrado com esse filtro.":(S.filter==="hoje"?"Nenhum contato pendente para hoje.":"Nenhum cliente nesta etapa."))+'</div>';
  return bulk+head+'<div class="list">'+list.map(card).join("")+'</div>';
}
function renderList(){var el=$("#listbox");if(el)el.innerHTML=listHTML();}
function viewClientes(){return (S.clients.length?toolbar():"")+'<div id="listbox">'+listHTML()+'</div>';}

function goalHTML(){
  var meta=Number(S.cfg.meta)||0;if(!meta||!S.clients.length)return "";
  var feitos=contactsToday();
  return '<div class="goal"><div class="goal-top"><span>Contatos de hoje'+(feitos>=meta?" · meta batida":"")+'</span><b>'+feitos+' de '+meta+'</b></div><div class="bar"><i style="width:'+Math.min(100,feitos/meta*100)+'%"></i></div></div>';
}

/* etapas, seleção em massa */
function applyStage(c,st){
  if(c.etapa===st)return;
  var from=etapaNome(c.etapa);c.etapa=st;
  c.hist.push({em:new Date().toISOString(),tipo:"Etapa",texto:from+" → "+etapaNome(st)});
  if(!isActive(c))c.proximo="";else if(!c.proximo&&st!=="novo")c.proximo=addDays(3);
}
function selIds(){return Object.keys(S.sel).filter(function(id){return S.sel[id]&&find(id);});}
function bulk(fn){
  var ids=selIds();
  if(!ids.length){toast("Selecione ao menos um cliente.");return;}
  ids.forEach(function(id){
    var c=clone(find(id));if(!Array.isArray(c.hist))c.hist=[];
    fn(c);c.atualizadoEm=new Date().toISOString();
    var i=S.clients.findIndex(function(x){return x.id===id;});
    S.clients[i]=c;persist(c);
  });
  render(false);
  toast(ids.length+(ids.length===1?" cliente atualizado.":" clientes atualizados."));
}
function bulkDelete(){
  var ids=selIds();
  ids.forEach(function(id){removeClient(id);});
  S.sel={};S.bulkDel=false;render(false);
  toast(ids.length+(ids.length===1?" cliente excluído.":" clientes excluídos."));
}

/* exportar para Excel (ou CSV, se o leitor de Excel não carregar) */
function exportRows(){
  var head=["Nome","Negócio","Telefone","Motivo da saída","Etapa","O que trouxe de volta","Quem passou o contato","Próximo contato","Último contato","Cadastrado em","Última anotação","Também com"];
  var list=S.clients.slice().sort(function(a,b){return String(a.nome||"").localeCompare(String(b.nome||""),"pt-BR");});
  return [head].concat(list.map(function(c){
    var h=(c.hist||[]).filter(function(x){return x.tipo!=="Etapa"&&x.tipo!=="Cadastro";}).sort(function(a,b){return b.em.localeCompare(a.em);})[0];
    var lc=lastContact(c);
    return [c.nome||"",c.negocio||"",c.telefone||"",motivoOf(c.motivo).nome,etapaNome(c.etapa),c.fator||"",c.origem||"",c.proximo||"",lc?dayOf(lc):"",c.criadoEm?dayOf(c.criadoEm):"",h?h.texto:"",c.dupDe||""];
  }));
}
function doExport(){
  if(!S.clients.length){toast("Não há clientes para baixar.");return;}
  var rows=exportRows(),name="recupera-clientes-"+today();
  if(window.XLSX){
    try{
      var ws=window.XLSX.utils.aoa_to_sheet(rows);
      ws["!cols"]=rows[0].map(function(_,i){return {wch:i===10?40:(i<2?24:16)};});
      var wb=window.XLSX.utils.book_new();
      window.XLSX.utils.book_append_sheet(wb,ws,"Clientes");
      window.XLSX.writeFile(wb,name+".xlsx");
      toast("Planilha baixada.");return;
    }catch(e){}
  }
  var csv="﻿"+rows.map(function(r){return r.map(function(v){return '"'+String(v).replace(/"/g,'""')+'"';}).join(";");}).join("\r\n");
  var a=document.createElement("a");
  a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));a.download=name+".csv";
  document.body.appendChild(a);a.click();
  setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},500);
  toast("Arquivo CSV baixado. Abre no Excel.");
}

/* cliente repetido entre consultores */
async function dupCheckAndRegister(list){
  var api=API();if(!api||!api.checkDup)return;
  var map={};
  list.forEach(function(c){var n=waNumber(c.telefone);if(n&&!map[n])map[n]=c.id;});
  var nums=Object.keys(map);if(!nums.length)return;
  var found;
  try{found=await api.checkDup(nums);}catch(e){return;}
  var flagged=0;
  nums.forEach(function(n){
    if(found[n]){flagged++;edit(map[n],function(c){c.dupDe=found[n].consultor||"outro consultor";},{keep:true});}
    else if(api.regDup)api.regDup(n).catch(function(){});
  });
  if(flagged)toast(flagged+(flagged===1?" cliente já está com outro consultor.":" clientes já estão com outros consultores."));
}

/* quando o telefone de um cliente muda, o índice de repetidos acompanha */
function syncPhone(id,telAntes){
  var api=API();if(!api||!api.checkDup)return;
  var c=find(id);if(!c)return;
  var o=waNumber(telAntes),n=waNumber(c.telefone);
  if(o===n)return;
  if(o&&api.unregDup)api.unregDup(o).catch(function(){});
  if(c.dupDe)edit(id,function(x){delete x.dupDe;},{keep:true});
  if(n)dupCheckAndRegister([find(id)]);
}

/* resultados: o que trouxe o cliente de volta */
function fatorPanel(cs){
  var fat={};
  cs.forEach(function(c){if(c.etapa==="recuperado"&&c.fator)fat[c.fator]=(fat[c.fator]||0)+1;});
  var ks=Object.keys(fat).sort(function(a,b){return fat[b]-fat[a];});
  if(!ks.length)return "";
  var mx=Math.max.apply(null,ks.map(function(k){return fat[k];}));
  return '<div class="panel"><h3>O que trouxe de volta</h3>'+ks.map(function(k){
    return '<div class="rowbar"><span class="lab">'+esc(k)+'</span><span class="bar"><i style="width:'+(fat[k]/mx*100)+'%"></i></span><span class="num">'+fat[k]+'</span></div>';
  }).join("")+'</div>';
}

/* aba Ajustes */
function viewAjustes(){
  var m=S.cfg.msgs||{},sample={nome:"Maria",negocio:"Padaria Sol",motivo:"taxa"};
  var boxes=KINDS.map(function(k){
    return '<div class="fld"><label class="lb" for="cm-'+k.id+'">'+esc(k.nome)+'</label><textarea id="cm-'+k.id+'" data-cm="'+k.id+'" placeholder="Vazio usa o texto padrão do sistema">'+esc(m[k.id]||"")+'</textarea></div>'+
      '<p class="hint">Prévia: '+esc(composeMsg(sample,k.id))+'</p>';
  }).join("");
  var perm=("Notification" in window)?Notification.permission:"unsupported";
  var permTxt=perm==="granted"?"Avisos ativados neste aparelho.":perm==="denied"?"Os avisos estão bloqueados no navegador. Libere nas configurações do site.":perm==="unsupported"?"Este aparelho não aceita avisos.":"Avisos desligados.";
  return '<div class="view-gap">'+
    '<div class="panel"><h3>Mensagens do WhatsApp</h3><p class="hint">Escreva do seu jeito. Use {nome} para o nome do cliente, {consultor} para o seu nome, {negocio} para o negócio e {motivo} para o motivo da saída. Vazio significa texto padrão. Só ofereça o que a FaturePag libera para você.</p>'+boxes+
      '<div class="row"><button class="btn" data-action="savemsgs">Salvar mensagens</button><button class="btn ghost" data-action="resetmsgs">Restaurar padrão</button></div></div>'+
    '<div class="panel"><h3>Meta diária</h3><p class="hint">Quantos contatos você quer fazer por dia. Aparece como barra de progresso na tela de clientes. Use 0 para esconder.</p>'+
      '<div class="row"><input class="in" style="width:120px" id="cfg-meta" type="number" min="0" max="500" value="'+esc(S.cfg.meta)+'" aria-label="Meta de contatos por dia"><button class="btn" data-action="savemeta">Salvar meta</button></div></div>'+
    '<div class="panel"><h3>Avisos de retorno</h3><p class="hint">'+permTxt+' Ao abrir o sistema, você é avisado se houver clientes para contatar.</p>'+
      (perm==="default"?'<div class="row"><button class="btn" data-action="notif">Ativar avisos neste aparelho</button></div>':"")+pushBox()+'</div></div>';
}
/* aviso com o app fechado: só aparece se o administrador configurou a chave e a função agendada */
function pushBox(){
  var api=API();if(!api||!api.enablePush)return "";
  var ok=!!(api.pushDisponivel&&api.pushDisponivel()),on=false;
  try{on=localStorage.getItem("rc.push."+(window.RC_UID||""))==="1"&&("Notification" in window)&&Notification.permission==="granted";}catch(e){}
  var txt=ok?(on?"Ativado neste aparelho: você recebe um aviso toda manhã, às 8h, quando houver cliente para contatar, mesmo com o sistema fechado.":"Quer receber o aviso toda manhã, às 8h, mesmo com o sistema fechado? Ative neste aparelho."):"O aviso com o sistema fechado ainda não foi configurado pelo administrador.";
  return '<p class="hint" style="margin-top:10px">'+txt+'</p>'+(ok?'<div class="row"><button class="btn'+(on?" ghost":"")+'" data-action="'+(on?"pushoff":"pushon")+'"'+(S.pushBusy?' aria-disabled="true"':'')+'>'+(S.pushBusy?"Aguarde…":(on?"Desligar avisos com o app fechado":"Ativar avisos com o app fechado"))+'</button></div>':"");
}
function pushErro(e){
  var c=e&&e.code;
  if(c==="sem-chave")return "Os avisos com o app fechado ainda não foram configurados.";
  if(c==="negado")return "Você não permitiu os avisos neste aparelho. Libere nas configurações do navegador e tente de novo.";
  if(c==="sem-suporte")return "Este aparelho ou navegador não aceita avisos com o app fechado. No iPhone, instale o app na tela de início primeiro.";
  return "Não consegui ativar os avisos. Confira a internet e tente de novo.";
}

/* aba Equipe (só para gestores) */
function emptyBucket(name){return {nome:name,total:0,novo:0,contatado:0,negociando:0,recuperado:0,perdido:0,hoje:0,sete:0,rec30:0};}
function shiftDay(s,n){var d=new Date(s+"T00:00:00");d.setDate(d.getDate()+n);return dstr(d);}
function weekStart(s){var d=new Date(s+"T00:00:00");d.setDate(d.getDate()-((d.getDay()+6)%7));return dstr(d);}
function fmtBR(s){return s?s.slice(8,10)+"/"+s.slice(5,7)+"/"+s.slice(0,4):"";}
/* dia em que o cliente virou Recuperado, lido do histórico de etapas */
function recoveredAt(c){
  if(c.etapa!=="recuperado")return "";
  var h=(c.hist||[]).filter(function(x){return x.tipo==="Etapa"&&/→ Recuperado$/.test(x.texto||"");}).sort(function(a,b){return b.em.localeCompare(a.em);})[0];
  var iso=h?h.em:c.atualizadoEm;
  return iso?dayOf(iso):"";
}
function teamStats(){
  var T=S.team,by={},t=today(),d7=addDays(-6),d30=addDays(-29),wk0=weekStart(t);
  Object.keys(T.users||{}).forEach(function(u){var p=T.users[u]||{};by[u]=emptyBucket(p.nome||p.email||"Consultor");});
  var mot={},fat={},tot=emptyBucket("Total"),weeks=[],wmap={};
  for(var i=7;i>=0;i--){var w0={ini:shiftDay(wk0,-7*i),rec:0,cont:0};weeks.push(w0);wmap[w0.ini]=w0;}
  (T.clients||[]).forEach(function(c){
    if(c.exemplo)return;
    var b=by[c.uid]||(by[c.uid]=emptyBucket("Consultor"));
    var h=countContacts([c],t,t),s=countContacts([c],d7,t);
    var rd=recoveredAt(c),r30=(rd&&rd>=d30)?1:0;
    [b,tot].forEach(function(x){
      x.total++;if(x[c.etapa]!=null)x[c.etapa]++;x.hoje+=h;x.sete+=s;x.rec30+=r30;
    });
    mot[c.motivo]=mot[c.motivo]||{n:0,v:0};mot[c.motivo].n++;
    if(c.etapa==="recuperado"){mot[c.motivo].v++;if(c.fator)fat[c.fator]=(fat[c.fator]||0)+1;}
    if(rd&&wmap[weekStart(rd)])wmap[weekStart(rd)].rec++;
    (c.hist||[]).forEach(function(x){
      if(CONTATOS.indexOf(x.tipo)>=0){var w=wmap[weekStart(dayOf(x.em))];if(w)w.cont++;}
    });
  });
  var rows=Object.keys(by).map(function(u){return by[u];}).sort(function(a,b){return b.recuperado-a.recuperado||b.total-a.total;});
  return {rows:rows,tot:tot,mot:mot,fat:fat,weeks:weeks};
}
function teamRow(b,isTot){
  var rate=b.total?Math.round(b.recuperado/b.total*100)+"%":"–";
  return '<tr'+(isTot?' class="tot"':'')+'><td>'+esc(b.nome)+'</td><td>'+b.total+'</td><td>'+(b.contatado+b.negociando)+'</td><td>'+b.recuperado+'</td><td>'+b.rec30+'</td><td>'+b.perdido+'</td><td>'+rate+'</td><td>'+b.hoje+'</td><td>'+b.sete+'</td></tr>';
}
function rankingPanel(st){
  var rows=st.rows.filter(function(b){return b.total>0;});
  if(!rows.length)return "";
  var mx=Math.max.apply(null,rows.map(function(b){return b.recuperado;}).concat([1]));
  var list=rows.map(function(b,i){
    var rate=b.total?Math.round(b.recuperado/b.total*100)+"%":"–";
    return '<div class="rk'+(i===0&&b.recuperado>0?" p1":"")+'"><span class="pos">'+(i+1)+'</span><div class="rkmid"><div class="nm2">'+esc(b.nome)+'</div><div class="bar" aria-hidden="true"><i style="width:'+(b.recuperado/mx*100)+'%"></i></div><div class="meta">Taxa '+rate+' · '+b.rec30+' nos últimos 30 dias · '+b.sete+' contatos em 7 dias</div></div><span class="big">'+b.recuperado+'</span></div>';
  }).join("");
  return '<div class="panel"><h3>Ranking de recuperados</h3><div class="rank">'+list+'</div><p class="hint">Ordenado pelo total de clientes recuperados. Em caso de empate, vem primeiro quem tem mais clientes.</p></div>';
}
function weekBars(weeks,key){
  var mx=Math.max(1,Math.max.apply(null,weeks.map(function(w){return w[key];})));
  return '<div class="days weeks">'+weeks.map(function(w){
    return '<div class="day"><span class="v">'+w[key]+'</span><i style="height:'+Math.max(2,Math.round(w[key]/mx*80))+'px"></i><small>'+fmtDM(w.ini)+'</small></div>';
  }).join("")+'</div>';
}
/* relatório da equipe: Excel (ou CSV, se o leitor de Excel não carregar) e PDF pela impressão do navegador */
function downloadCsv(rows,name){
  var csv="﻿"+rows.map(function(r){return r.map(function(v){return '"'+String(v).replace(/"/g,'""')+'"';}).join(";");}).join("\r\n");
  var a=document.createElement("a");
  a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));a.download=name+".csv";
  document.body.appendChild(a);a.click();
  setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},500);
}
function exportTeam(){
  if(!S.team){toast("Carregue os números da equipe primeiro.");return;}
  var st=teamStats(),name="equipe-"+today();
  var cons=[["Consultor","Clientes","Em conversa","Recuperados","Recuperados em 30 dias","Perdidos","Taxa de recuperação","Contatos hoje","Contatos em 7 dias"]]
    .concat(st.rows.concat([st.tot]).map(function(b){
      return [b.nome,b.total,b.contatado+b.negociando,b.recuperado,b.rec30,b.perdido,b.total?Math.round(b.recuperado/b.total*100)+"%":"",b.hoje,b.sete];
    }));
  var mk=Object.keys(st.mot).sort(function(a,b){return st.mot[b].n-st.mot[a].n;});
  var mot=[["Motivo da saída","Clientes","Voltaram"]].concat(mk.map(function(k){return [motivoOf(k).nome,st.mot[k].n,st.mot[k].v];}));
  var sem=[["Semana (começa na segunda)","Recuperados","Contatos feitos"]].concat(st.weeks.map(function(w){return [fmtBR(w.ini),w.rec,w.cont];}));
  var fk=Object.keys(st.fat).sort(function(a,b){return st.fat[b]-st.fat[a];});
  var fat=[["O que trouxe de volta","Clientes"]].concat(fk.map(function(k){return [k,st.fat[k]];}));
  if(window.XLSX){
    try{
      var wb=window.XLSX.utils.book_new();
      [["Por consultor",cons,[22,10,12,12,14,10,12,12,14]],["Por motivo",mot,[28,10,10]],["Por semana",sem,[24,12,14]],["O que trouxe de volta",fat,[28,10]]].forEach(function(s){
        var ws=window.XLSX.utils.aoa_to_sheet(s[1]);
        ws["!cols"]=s[2].map(function(w){return {wch:w};});
        window.XLSX.utils.book_append_sheet(wb,ws,s[0]);
      });
      window.XLSX.writeFile(wb,name+".xlsx");
      toast("Relatório baixado.");return;
    }catch(e){}
  }
  downloadCsv(cons,name);
  toast("Arquivo CSV baixado. Abre no Excel.");
}
function printTeam(){
  if(!S.team){toast("Carregue os números da equipe primeiro.");return;}
  toast("Na janela que abrir, escolha Salvar como PDF.");
  setTimeout(function(){window.print();},500);
}
function authPanel(){
  var list=S.auth||[],mine=String(window.RC_EMAIL||"").toLowerCase();
  var rows=list.map(function(a){
    var btn=a.email===mine?'<span class="hint">você</span>':(S.authDel===a.email?'<button class="btn sm danger" data-action="aurm" data-e="'+esc(a.email)+'">Confirmar</button> <button class="btn sm ghost" data-action="aurmno">Voltar</button>':'<button class="btn sm ghost" data-action="aurm" data-e="'+esc(a.email)+'">Remover</button>');
    return '<tr><td>'+esc(a.email)+'</td><td>'+esc(a.nome||"")+'</td><td>'+btn+'</td></tr>';
  }).join("");
  return '<div class="panel"><h3>Consultores liberados</h3><p class="hint">Quem está nesta lista consegue criar conta e usar o sistema. Cada consultor vê só os próprios clientes. Remover tira o acesso, mas não apaga os clientes dele.</p>'+
    (S.authErr?'<p class="err">'+esc(S.authErr)+'</p>':"")+
    '<div class="tbl"><table><thead><tr><th>E-mail</th><th>Nome</th><th></th></tr></thead><tbody>'+(rows||'<tr><td colspan="3">Nenhum e-mail carregado.</td></tr>')+'</tbody></table></div>'+
    '<div class="grid2"><div class="fld"><label class="lb" for="au-email">E-mail do consultor</label><input class="in" id="au-email" type="email" autocomplete="off"></div><div class="fld"><label class="lb" for="au-nome">Nome</label><input class="in" id="au-nome" autocomplete="off"></div></div>'+
    '<div class="row"><button class="btn" data-action="auadd">Liberar e-mail</button></div></div>';
}
function viewEquipe(){
  if(!S.isGestor)return '<div class="empty">Esta área é só para gestores.</div>';
  var acts='<div class="row noprint">'+(S.team?'<button class="btn sm ghost" data-action="teamxlsx">Relatório Excel</button><button class="btn sm ghost" data-action="teampdf">Relatório PDF</button>':"")+
    '<button class="btn sm" data-action="teamload"'+(S.teamBusy?' aria-disabled="true"':'')+'>'+(S.teamBusy?"Carregando…":"Atualizar")+'</button></div>';
  var head='<div class="listhead"><h2>Equipe</h2>'+acts+'</div>';
  var err=S.teamErr?'<p class="err">'+esc(S.teamErr)+'</p>':"";
  if(!S.team)return '<div class="view-gap">'+head+err+'<div class="empty">'+(S.teamBusy?"Carregando os números do time…":"Toque em Atualizar para ver os números do time.")+'</div>'+authPanel()+'</div>';
  var st=teamStats();
  var table='<div class="tbl nums"><table><thead><tr><th>Consultor</th><th>Clientes</th><th>Em conversa</th><th>Recuperados</th><th>Recup. 30 dias</th><th>Perdidos</th><th>Taxa</th><th>Contatos hoje</th><th>7 dias</th></tr></thead><tbody>'+st.rows.map(function(b){return teamRow(b,false);}).join("")+teamRow(st.tot,true)+'</tbody></table></div>';
  var mk=Object.keys(st.mot).sort(function(a,b){return st.mot[b].n-st.mot[a].n;});
  var mx=Math.max.apply(null,mk.map(function(k){return st.mot[k].n;}).concat([1]));
  var mot=mk.map(function(k){return '<div class="rowbar"><span class="lab">'+esc(motivoOf(k).nome)+'</span><span class="bar"><i style="width:'+(st.mot[k].n/mx*100)+'%"></i></span><span class="num">'+st.mot[k].n+' · '+st.mot[k].v+' voltaram</span></div>';}).join("");
  var fk=Object.keys(st.fat).sort(function(a,b){return st.fat[b]-st.fat[a];});
  var fmx=Math.max.apply(null,fk.map(function(k){return st.fat[k];}).concat([1]));
  var fat=fk.map(function(k){return '<div class="rowbar"><span class="lab">'+esc(k)+'</span><span class="bar"><i style="width:'+(st.fat[k]/fmx*100)+'%"></i></span><span class="num">'+st.fat[k]+'</span></div>';}).join("");
  return '<div class="view-gap">'+head+'<p class="printhead">Relatório da equipe · '+fmtBR(today())+'</p>'+err+
    rankingPanel(st)+
    '<div class="panel"><h3>Resultado por consultor</h3>'+table+'<p class="hint">Mostra só números, sem nomes de clientes. Clientes de exemplo não entram na conta.</p></div>'+
    '<div class="panel"><h3>Recuperados por semana</h3>'+weekBars(st.weeks,"rec")+'<p class="hint">Últimas 8 semanas. Cada coluna é uma semana, com a data da segunda-feira. Conta pelo dia em que o cliente foi marcado como Recuperado.</p></div>'+
    '<div class="panel"><h3>Contatos por semana</h3>'+weekBars(st.weeks,"cont")+'<p class="hint">WhatsApp, ligação e visita registrados pelos consultores.</p></div>'+
    (mot?'<div class="panel"><h3>Por que os clientes saíram</h3>'+mot+'</div>':"")+
    (fat?'<div class="panel"><h3>O que trouxe de volta</h3>'+fat+'</div>':"")+
    '<div class="noprint">'+authPanel()+'</div></div>';
}
async function loadTeam(){
  var api=API();
  if(!api||!api.listTeam||S.teamBusy)return;
  S.teamBusy=true;S.teamErr="";render(false);
  try{
    var r=await Promise.all([api.listTeam(),api.listAuthorized?api.listAuthorized():Promise.resolve([])]);
    S.team=r[0];S.auth=r[1];
  }catch(e){
    var code=e&&e.code;
    S.teamErr="Não consegui carregar os números do time. "+(code==="permission-denied"?"Confira se o seu e-mail está na coleção gestores e se as regras novas foram publicadas.":(code==="failed-precondition"?"O Firebase pediu um índice. Abra o console do navegador (F12), toque no link da mensagem e crie o índice.":"Tente de novo."));
  }
  S.teamBusy=false;render(false);
}
async function authAdd(){
  var api=API();if(!api||!api.addAuthorized)return;
  var em=(($("#au-email")||{}).value||"").trim().toLowerCase(),nome=(($("#au-nome")||{}).value||"").trim();
  S.authErr="";
  if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)){S.authErr="Digite um e-mail válido.";render(false);return;}
  try{await api.addAuthorized(em,nome);S.auth=await api.listAuthorized();toast("E-mail liberado.");}
  catch(e){S.authErr="Não consegui liberar. Confira se as regras novas foram publicadas.";}
  render(false);
}
async function authRemove(em){
  var api=API();if(!api||!api.removeAuthorized)return;
  S.authErr="";
  try{await api.removeAuthorized(em);S.auth=await api.listAuthorized();S.authDel="";toast("Acesso removido.");}
  catch(e){S.authErr="Não consegui remover. Tente de novo.";}
  render(false);
}

/* ---------- renderização ---------- */
function renderNotice(){
  var out=[];
  if(S.mode==="local")out.push('<div class="notice"><span>Salvando só neste navegador. Os clientes não aparecem em outros aparelhos.</span></div>');
  if(S.prog)out.push('<div class="notice"><span>Salvando os clientes importados: '+S.prog.done+' de '+S.prog.total+'. Pode continuar usando o painel.</span></div>');
  if(S.slow)out.push('<div class="notice"><span>Ainda não consegui conectar ao banco. O que aparece pode estar desatualizado.</span></div>');
  if(S.err)out.push('<div class="notice"><span>'+esc(S.err)+'</span><button class="btn sm ghost" data-action="dismiss">Ok</button></div>');
  if(S.tab==="clientes"&&S.clients.some(function(c){return c.exemplo;}))out.push('<div class="notice"><span>Estes são clientes de exemplo, para você ver como funciona.</span><button class="btn sm ghost" data-action="rmex">Remover exemplos</button></div>');
  $("#notice").innerHTML=out.join("");
}
function renderTabs(){
  var te=$("#tab-equipe");if(te)te.hidden=!S.isGestor;
  document.querySelectorAll(".tab").forEach(function(b){b.setAttribute("aria-selected",String(b.dataset.tab===S.tab));});
}
function renderSummary(){
  var el=$("#summary");
  if(S.tab!=="clientes"){el.innerHTML="";return;}
  var cn=counts(),total=S.clients.length,due=dueList().length;
  var cells=ETAPAS.map(function(e){
    return '<button class="rc-cell st-'+e.id+(S.filter===e.id?" on":"")+'" data-action="filter" data-f="'+e.id+'"><b>'+cn[e.id]+'</b><span>'+e.nome+'</span></button>';
  }).join("")+'<button class="rc-cell due'+(S.filter==="hoje"?" on":"")+'" data-action="filter" data-f="hoje"><b>'+due+'</b><span>Para contatar hoje</span></button>';
  var bar=total?ETAPAS.map(function(e){return cn[e.id]?'<i class="st-'+e.id+'" style="width:'+(cn[e.id]/total*100)+'%"></i>':"";}).join(""):"";
  el.innerHTML=goalHTML()+'<div class="receipt"><div class="rc-head"><span>Funil · '+total+(total===1?" cliente":" clientes")+'</span><button data-action="filter" data-f="todos">Ver todos</button></div><div class="rc-grid">'+cells+'</div><div class="fbar" aria-hidden="true">'+bar+'</div></div>';
}
function filtered(){
  var t=today(),a=S.clients.slice();
  if(S.filter==="hoje")a=dueList();
  else if(S.filter!=="todos")a=a.filter(function(c){return c.etapa===S.filter;});
  a=a.filter(function(c){return matchQ(c)&&(!S.fmot||c.motivo===S.fmot);});
  a.sort(function(x,y){
    var dx=x.proximo&&x.proximo<=t&&isActive(x),dy=y.proximo&&y.proximo<=t&&isActive(y);
    if(dx&&!dy)return -1;if(!dx&&dy)return 1;
    if(dx&&dy)return x.proximo.localeCompare(y.proximo);
    return (y.atualizadoEm||"").localeCompare(x.atualizadoEm||"");
  });
  return a;
}
function nextBadge(c){
  if(!isActive(c))return "";
  if(!c.proximo)return '<span class="nb">Sem lembrete</span>';
  var d=dayDiff(c.proximo,today());
  if(d<0)return '<span class="nb late">Atrasado '+(-d)+' d</span>';
  if(d===0)return '<span class="nb today">Hoje</span>';
  return '<span class="nb">'+fmtDM(c.proximo)+'</span>';
}
function card(c){
  var e=etapaNome(c.etapa),lc=lastContact(c),m=motivoOf(c.motivo).nome,on=!!S.sel[c.id];
  var chk=S.selMode?'<span class="chk'+(on?' on':'')+'" aria-hidden="true">✓</span>':"";
  return '<button class="card'+(S.selMode&&on?' sel':'')+'" data-action="open" data-id="'+esc(c.id)+'"'+(S.selMode?' aria-pressed="'+on+'"':'')+'>'+
    '<span class="card-top"><span class="who">'+chk+'<span class="nm">'+esc(c.nome||"Sem nome")+'</span></span><span class="pill st-'+esc(c.etapa)+'">'+esc(e)+'</span></span>'+
    '<span class="sub">'+esc(c.negocio||"")+(c.negocio?" · ":"")+esc(m)+'</span>'+
    '<span class="card-foot">'+nextBadge(c)+(c.dupDe?'<span class="nb dup">Também com '+esc(c.dupDe)+'</span>':"")+'<span>'+(lc?"Último contato "+rel(lc):"Ainda sem contato")+'</span>'+(c.exemplo?'<span class="tag-ex">exemplo</span>':"")+'</span></button>';
}
function viewRoteiro(){
  var items=OBJECOES.map(function(o,i){
    return '<details class="ob"><summary>'+o.t+'</summary><div class="ob-body"><h3>O que responder</h3><p class="say">'+esc(o.r)+'</p><p class="guide">'+esc(o.d)+'</p><div class="row"><button class="btn sm ghost" data-action="copyob" data-i="'+i+'">Copiar resposta</button></div></div></details>';
  }).join("");
  return '<div class="view-gap"><p class="intro">Ordem que funciona com quem já saiu: ouvir, entender o motivo, oferecer uma coisa concreta e combinar o próximo passo. Adapte as frases ao seu jeito e só prometa o que a FaturePag libera para você.</p>'+items+'</div>';
}
function viewResultados(){
  var cs=S.clients,total=cs.length,cn=counts();
  if(!total)return '<div class="empty">Sem dados ainda. Os números aparecem conforme você cadastra clientes e registra contatos.</div>';
  var rate=Math.round(cn.recuperado/total*100);
  var stats='<div class="stats"><div class="stat"><b>'+total+'</b><span>Clientes no funil</span></div><div class="stat"><b>'+cn.recuperado+'</b><span>Recuperados</span></div><div class="stat"><b>'+(cn.contatado+cn.negociando)+'</b><span>Em conversa</span></div><div class="stat"><b>'+rate+'%</b><span>Recuperação ('+cn.recuperado+' de '+total+')</span></div></div>';
  var fun=ETAPAS.map(function(e){return '<div class="rowbar st-'+e.id+'"><span class="lab">'+e.nome+'</span><span class="bar"><i style="width:'+(cn[e.id]/total*100)+'%"></i></span><span class="num">'+cn[e.id]+'</span></div>';}).join("");
  var mc={},mr={};
  cs.forEach(function(c){mc[c.motivo]=(mc[c.motivo]||0)+1;if(c.etapa==="recuperado")mr[c.motivo]=(mr[c.motivo]||0)+1;});
  var mx=Math.max.apply(null,MOTIVOS.map(function(m){return mc[m.id]||0;}));
  var mot=MOTIVOS.filter(function(m){return mc[m.id];}).sort(function(a,b){return mc[b.id]-mc[a.id];}).map(function(m){
    return '<div class="rowbar"><span class="lab">'+esc(m.nome)+'</span><span class="bar"><i style="width:'+(mc[m.id]/mx*100)+'%"></i></span><span class="num">'+mc[m.id]+' · '+(mr[m.id]||0)+' voltaram</span></div>';
  }).join("");
  var days=[],cnt={};
  for(var i=6;i>=0;i--)days.push(addDays(-i));
  days.forEach(function(d){cnt[d]=0;});
  cs.forEach(function(c){(c.hist||[]).forEach(function(h){if(CONTATOS.indexOf(h.tipo)>=0){var d=dayOf(h.em);if(cnt[d]!=null)cnt[d]++;}});});
  var dm=Math.max(1,Math.max.apply(null,days.map(function(d){return cnt[d];})));
  var cols=days.map(function(d){return '<div class="day"><span class="v">'+cnt[d]+'</span><i style="height:'+Math.max(2,Math.round(cnt[d]/dm*80))+'px"></i><small>'+fmtDM(d)+'</small></div>';}).join("");
  return '<div class="view-gap">'+stats+
    '<div class="panel"><h3>Funil</h3>'+fun+'</div>'+
    '<div class="panel"><h3>Por que saíram</h3>'+mot+'</div>'+fatorPanel(cs)+
    '<div class="panel"><h3>Contatos feitos nos últimos 7 dias</h3><div class="days">'+cols+'</div></div></div>';
}
function renderView(){
  var el=$("#view");
  el.innerHTML=S.tab==="clientes"?viewClientes():S.tab==="roteiro"?viewRoteiro():S.tab==="ajustes"?viewAjustes():S.tab==="equipe"?viewEquipe():viewResultados();
}

function optionsMotivo(sel){return MOTIVOS.map(function(m){return '<option value="'+m.id+'"'+(m.id===sel?" selected":"")+'>'+esc(m.nome)+'</option>';}).join("");}
function newForm(){
  return '<div class="dr-head"><div><h2>Novo cliente</h2><p class="sub">Quem saiu e precisa ser recuperado</p></div><button class="icon" data-action="close" aria-label="Fechar">×</button></div>'+
  '<div class="blk"><div class="fld"><label class="lb" for="n-nome">Nome</label><input class="in" id="n-nome" autocomplete="off"></div>'+
  '<div class="fld"><label class="lb" for="n-negocio">Negócio</label><input class="in" id="n-negocio" placeholder="Ex.: padaria, salão, oficina" autocomplete="off"></div>'+
  '<div class="fld"><label class="lb" for="n-tel">WhatsApp com DDD</label><input class="in" id="n-tel" type="tel" inputmode="tel" placeholder="(83) 9 0000-0000"></div>'+
  '<div class="fld"><label class="lb" for="n-motivo">Motivo da saída</label><select class="sel" id="n-motivo">'+optionsMotivo("outro")+'</select></div>'+
  '<div class="fld"><label class="lb" for="n-origem">Quem passou o contato</label><input class="in" id="n-origem" placeholder="Ex.: meu patrão" autocomplete="off"></div></div>'+
  '<div class="row"><button class="btn" data-action="saveNew">Salvar cliente</button><button class="btn ghost" data-action="close">Cancelar</button></div>';
}
function detail(c){
  var m=motivoOf(c.motivo);
  var key=c.id+":"+S.msgKind;
  var text=S.msgText[key]!=null?S.msgText[key]:composeMsg(c,S.msgKind);
  var href=waHref(c,text);
  var hist=(c.hist||[]).slice().sort(function(a,b){return b.em.localeCompare(a.em);});
  var stages=ETAPAS.map(function(e){return '<button class="segb st-'+e.id+(e.id===c.etapa?" on":"")+'" data-action="stage" data-stage="'+e.id+'" aria-pressed="'+(e.id===c.etapa)+'">'+e.nome+'</button>';}).join("");
  var kinds=KINDS.map(function(k){return '<button class="segb'+(k.id===S.msgKind?" on":"")+'" style="--st:var(--primary);--on-st:var(--on-primary)" data-action="msgkind" data-k="'+k.id+'" aria-pressed="'+(k.id===S.msgKind)+'">'+k.nome+'</button>';}).join("");
  var tipos=TIPOS.map(function(t){return '<button class="segb'+(t===S.noteTipo?" on":"")+'" style="--st:var(--primary);--on-st:var(--on-primary)" data-action="tipo" data-t="'+t+'" aria-pressed="'+(t===S.noteTipo)+'">'+t+'</button>';}).join("");
  var tl=hist.length?'<ul class="tl">'+hist.map(function(h){return '<li><time>'+fmtDT(h.em)+'</time><div><b>'+esc(h.tipo)+'</b><p>'+esc(h.texto)+'</p></div></li>';}).join("")+'</ul>':'<p class="hint">Nenhum registro ainda.</p>';
  return '<div class="dr-head"><div><h2 id="dr-name">'+esc(c.nome||"Sem nome")+'</h2><p class="sub">'+esc(c.negocio||"Negócio não informado")+'</p></div><button class="icon" data-action="close" aria-label="Fechar">×</button></div>'+
  (c.dupDe?'<p class="warn">Este telefone também está cadastrado com '+esc(c.dupDe)+'. Combinem quem fala com o cliente para não ligar duas vezes.</p>':"")+
  (c.exemplo?'<p class="ex-note">Cliente de exemplo. Pode mexer à vontade e remover depois.</p>':"")+
  '<div class="blk"><h3>Etapa</h3><div class="seg">'+stages+'</div>'+
    (c.etapa==="recuperado"?'<div class="fld"><label class="lb" for="f-fator">O que trouxe o cliente de volta</label><select class="sel" id="f-fator" data-field="fator"><option value="">Escolha…</option>'+FATORES.map(function(x){return '<option'+(x===c.fator?" selected":"")+'>'+esc(x)+'</option>';}).join("")+'</select></div>':"")+'</div>'+
  '<div class="blk"><h3>Próximo contato</h3><div class="row"><input class="in" style="width:auto" type="date" id="f-prox" data-field="proximo" value="'+esc(c.proximo||"")+'" aria-label="Data do próximo contato">'+
    '<button class="btn sm ghost" data-action="quick" data-d="1">Amanhã</button><button class="btn sm ghost" data-action="quick" data-d="3">3 dias</button><button class="btn sm ghost" data-action="quick" data-d="7">1 semana</button><button class="btn sm ghost" data-action="quick" data-d="clear">Limpar</button></div></div>'+
  '<div class="blk"><h3>Mensagem pronta</h3><div class="seg">'+kinds+'</div>'+
    '<p class="guide"><b>'+esc(m.nome)+':</b> '+esc(m.guia)+'</p>'+
    '<textarea id="msg" aria-label="Mensagem para o cliente">'+esc(text)+'</textarea>'+
    '<div class="row"><a class="btn wa" id="wa" target="_blank" rel="noopener"'+(href?' href="'+esc(href)+'"':' aria-disabled="true"')+'>Abrir no WhatsApp</a><button class="btn ghost" data-action="copymsg">Copiar mensagem</button></div>'+
    '<p class="hint" id="wa-hint"'+(href?" hidden":"")+'>Cadastre um telefone com DDD para abrir o WhatsApp.</p>'+
    '<p class="hint">Revise o texto e só ofereça o que você pode cumprir. Depois de enviar, registre o contato abaixo.</p>'+
    '<div class="fld"><label class="lb" for="vend">Assinar como</label><input class="in" id="vend" value="'+esc(S.vendedor)+'" autocomplete="off"></div></div>'+
  '<div class="blk"><h3>Registrar contato</h3><div class="seg">'+tipos+'</div>'+
    '<textarea id="note" placeholder="O que ele disse? O que ficou combinado?" aria-label="Anotação do contato">'+esc(S.note)+'</textarea>'+
    '<div class="row"><button class="btn" data-action="log">Registrar</button></div></div>'+
  '<div class="blk"><h3>Histórico</h3>'+tl+'</div>'+
  '<div class="blk"><h3>Dados do cliente</h3><div class="grid2">'+
    '<div class="fld"><label class="lb" for="f-nome">Nome</label><input class="in" id="f-nome" data-field="nome" value="'+esc(c.nome)+'" autocomplete="off"></div>'+
    '<div class="fld"><label class="lb" for="f-negocio">Negócio</label><input class="in" id="f-negocio" data-field="negocio" value="'+esc(c.negocio)+'" autocomplete="off"></div>'+
    '<div class="fld"><label class="lb" for="f-tel">WhatsApp</label><input class="in" id="f-tel" type="tel" inputmode="tel" data-field="telefone" value="'+esc(c.telefone)+'"></div>'+
    '<div class="fld"><label class="lb" for="f-motivo">Motivo da saída</label><select class="sel" id="f-motivo" data-field="motivo">'+optionsMotivo(c.motivo)+'</select></div>'+
    '<div class="fld"><label class="lb" for="f-origem">Quem passou o contato</label><input class="in" id="f-origem" data-field="origem" value="'+esc(c.origem)+'" autocomplete="off"></div></div>'+
    '<div class="row"><span class="phone">'+esc(c.telefone||"")+'</span>'+(c.telefone?'<button class="btn sm ghost" data-action="copyphone">Copiar número</button>':"")+'</div></div>'+
  '<div class="blk">'+(S.confirmDel===c.id?'<p class="hint">Isso apaga o cliente e o histórico, e não dá para desfazer.</p><div class="row"><button class="btn danger" data-action="del">Confirmar exclusão</button><button class="btn ghost" data-action="canceldel">Cancelar</button></div>':'<div class="row"><button class="btn danger sm" data-action="del">Excluir cliente</button></div>')+'</div>';
}
function renderDrawer(){
  var dr=$("#drawer"),sc=$("#scrim"),c=S.openId?find(S.openId):null;
  if(S.openId&&!c){S.openId=null;}
  if(!S.newMode&&!S.importMode&&!c){dr.hidden=true;sc.hidden=true;dr.innerHTML="";document.body.classList.remove("lock");return;}
  var wasOpen=!dr.hidden;
  dr.hidden=false;sc.hidden=false;document.body.classList.add("lock");
  dr.innerHTML=S.importMode?importForm():S.newMode?newForm():detail(c);
  if(!wasOpen){dr.scrollTop=0;dr.focus();}
}
function render(force){
  renderNotice();renderTabs();renderSummary();
  var ae=document.activeElement,typing=!!(ae&&$("#view").contains(ae)&&/^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName));
  if(!typing)renderView();else if(S.tab==="clientes")renderList();
  var dr=$("#drawer");
  if(force||!dr.contains(document.activeElement))renderDrawer();
  updateBadge();notifyDue();
}

/* ---------- importação de planilha ---------- */
function newImp(){return {rows:[],dup:0,empty:0,name:"",err:"",text:"",motivoPadrao:"outro",total:0,ready:false};}
var norm=function(s){return String(s==null?"":s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").trim();};
var HEAD=[["telefone",/telef|celular|whats|zap|fone|^tel\b/],["motivo",/motivo|saida|cancel/],["origem",/origem|indica|vendedor|passado/],["negocio",/negocio|empresa|estabelec|loja|fantasia|comercio|ramo/],["nome",/nome|cliente|razao|respons|propriet/]];
var PHONE_RE=/^[\d\s().+\-]+$/;
function digits(s){return String(s||"").replace(/\D/g,"");}
function fmtPhone(raw){
  raw=String(raw||"").trim();
  if(!raw||!PHONE_RE.test(raw))return raw;
  var d=digits(raw);
  if((d.length===12||d.length===13)&&d.slice(0,2)==="55")d=d.slice(2);
  if(d.length===11)return "("+d.slice(0,2)+") "+d.slice(2,3)+" "+d.slice(3,7)+"-"+d.slice(7);
  if(d.length===10)return "("+d.slice(0,2)+") "+d.slice(2,6)+"-"+d.slice(6);
  return raw;
}
function guessMotivo(t){
  t=norm(t);if(!t)return "";
  if(/taxa|juros|caro/.test(t))return "taxa";
  if(/concorr|outra|trocou|migr/.test(t))return "concorrente";
  if(/defeito|problema|quebr|bateria|travand/.test(t))return "defeito";
  if(/suporte|atendimento|reclam/.test(t))return "suporte";
  if(/venda|movimento|parou|sem uso/.test(t))return "vendas";
  if(/prazo|receb|antecip/.test(t))return "prazo";
  if(/aluguel|mensalidade/.test(t))return "aluguel";
  return "outro";
}
function decode(buf){
  var u=new Uint8Array(buf),s=new TextDecoder("utf-8").decode(u);
  if(s.indexOf("\uFFFD")>=0){try{s=new TextDecoder("windows-1252").decode(u);}catch(e){}}
  return s.replace(/^﻿/,"");
}
function parseDelimited(text){
  var head=text.split(/\r?\n/).slice(0,5).join("\n"),best=",",bc=-1;
  ["\t",";",","].forEach(function(d){var n=head.split(d).length;if(n>bc){bc=n;best=d;}});
  var rows=[],row=[],cell="",q=false;
  for(var i=0;i<text.length;i++){
    var ch=text[i];
    if(q){if(ch==='"'){if(text[i+1]==='"'){cell+='"';i++;}else q=false;}else cell+=ch;}
    else if(ch==='"')q=true;
    else if(ch===best){row.push(cell);cell="";}
    else if(ch==="\n"||ch==="\r"){if(ch==="\r"&&text[i+1]==="\n")i++;row.push(cell);cell="";rows.push(row);row=[];}
    else cell+=ch;
  }
  if(cell!==""||row.length){row.push(cell);rows.push(row);}
  return rows;
}
function headerMap(r){
  var m={};
  r.forEach(function(cell,i){
    var n=norm(cell);if(!n)return;
    for(var k=0;k<HEAD.length;k++){if(HEAD[k][1].test(n)){if(m[HEAD[k][0]]==null)m[HEAD[k][0]]=i;break;}}
  });
  return (m.nome!=null||m.telefone!=null||m.negocio!=null)?m:null;
}
function guessMap(rows){
  var nc=0;rows.forEach(function(r){if(r.length>nc)nc=r.length;});
  var m={},best=-1,bs=0,texts=[];
  for(var c=0;c<nc;c++){
    var filled=0,ph=0,tx=0;
    rows.forEach(function(r){var v=r[c];if(!v)return;filled++;var d=digits(v);if(PHONE_RE.test(v)&&d.length>=10&&d.length<=13)ph++;else if(/[A-Za-zÀ-ÿ]/.test(v))tx++;});
    if(filled&&ph/filled>bs&&ph/filled>=0.5){bs=ph/filled;best=c;}
    else if(filled&&tx/filled>=0.5)texts.push(c);
  }
  if(best>=0)m.telefone=best;
  if(texts.length)m.nome=texts[0];
  if(texts.length>1)m.negocio=texts[1];
  return m;
}
function buildPreview(rows){
  var im=S.imp;
  rows=rows.map(function(r){return r.map(function(c){return String(c==null?"":c).trim();});}).filter(function(r){return r.some(function(c){return c;});});
  im.rows=[];im.dup=0;im.empty=0;im.total=0;im.err="";im.ready=true;
  if(!rows.length){im.err="Não encontrei linhas com dados.";return;}
  var m=headerMap(rows[0]),start=0;
  if(m)start=1;else m=guessMap(rows);
  if(m.nome==null&&m.telefone==null&&m.negocio==null){im.err="Não consegui identificar as colunas. Coloque os títulos Nome e Telefone na primeira linha.";return;}
  var seen={};
  S.clients.forEach(function(c){var p=waNumber(c.telefone);seen[p||("n:"+norm(c.nome))]=true;});
  var g=function(r,k){return m[k]!=null?(r[m[k]]||""):"";};
  for(var i=start;i<rows.length;i++){
    var r=rows[i];im.total++;
    var nome=g(r,"nome")||g(r,"negocio"),tel=fmtPhone(g(r,"telefone"));
    if(!nome&&!tel){im.empty++;continue;}
    var key=waNumber(tel)||("n:"+norm(nome));
    if(seen[key]){im.dup++;continue;}
    seen[key]=true;
    im.rows.push({nome:nome||"Sem nome",negocio:g(r,"nome")?g(r,"negocio"):"",telefone:tel,motivoTxt:g(r,"motivo"),origem:g(r,"origem")});
  }
  if(!im.rows.length&&!im.err)im.err=im.dup?"Todos os clientes dessa planilha já estão cadastrados.":"Nenhum cliente válido encontrado.";
}
function handleFile(file){
  var mp=S.imp.motivoPadrao;S.imp=newImp();S.imp.motivoPadrao=mp;S.imp.name=file.name;
  var ext=(file.name.split(".").pop()||"").toLowerCase();
  if(["xlsx","xls","csv","tsv","txt"].indexOf(ext)<0){S.imp.err="Formato não aceito. Use Excel (.xlsx, .xls) ou CSV, ou cole o texto abaixo.";renderDrawer();return;}
  var rd=new FileReader();
  rd.onerror=function(){S.imp.err="Não consegui ler o arquivo.";renderDrawer();};
  rd.onload=function(){
    try{
      var rows;
      if(ext==="xlsx"||ext==="xls"){
        if(!window.XLSX){S.imp.err="Não consegui carregar o leitor de Excel. Salve a planilha como CSV e tente de novo.";renderDrawer();return;}
        var wb=window.XLSX.read(rd.result,{type:"array"});
        rows=window.XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1,raw:false,defval:""});
      }else rows=parseDelimited(decode(rd.result));
      buildPreview(rows);
    }catch(e){S.imp.err="Não consegui entender esse arquivo. Confira se é uma planilha.";}
    renderDrawer();
  };
  rd.readAsArrayBuffer(file);
}
function importForm(){
  var im=S.imp||(S.imp=newImp());
  var h='<div class="dr-head"><div><h2>Importar planilha</h2><p class="sub">O app lê o arquivo e cadastra todos de uma vez</p></div><button class="icon" data-action="close" aria-label="Fechar">×</button></div>';
  h+='<div class="blk"><h3>Arquivo</h3><p class="hint">Aceita Excel (.xlsx, .xls) e CSV. Coloque títulos na primeira linha, como Nome, Negócio, Telefone, Motivo e Origem. Só o nome ou o telefone já bastam, e a ordem das colunas não importa.</p><input class="in" type="file" id="imp-file" accept=".xlsx,.xls,.csv,.tsv,.txt" aria-label="Escolher planilha">'+(im.name?'<p class="hint">Arquivo lido: '+esc(im.name)+'</p>':"")+'</div>';
  h+='<div class="blk"><h3>Foto da lista</h3><p class="hint">Tire uma foto ou escolha da galeria uma lista com nomes e telefones. O app lê o texto, mostra o que entendeu logo abaixo e você corrige antes de importar. Funciona melhor com foto reta, bem iluminada e letra legível. A primeira leitura baixa o leitor e pode demorar um pouco.</p><input class="in" type="file" id="imp-photo" accept="image/*" multiple aria-label="Escolher foto da lista"><p class="hint" id="ocr-status" role="status" hidden></p></div>';
  h+='<div class="blk"><h3>Ou cole as linhas</h3><textarea id="imp-text" placeholder="Copie as linhas da planilha, com a linha de títulos, e cole aqui" aria-label="Linhas coladas">'+esc(im.text)+'</textarea><div class="row"><button class="btn ghost sm" data-action="imptext">Ler texto colado</button></div></div>';
  if(im.err)h+='<p class="err">'+esc(im.err)+'</p>';
  if(im.ready&&im.rows.length){
    var rows=im.rows.slice(0,8).map(function(r){
      var mo=motivoOf(r.motivoTxt?guessMotivo(r.motivoTxt):im.motivoPadrao).nome;
      return '<tr><td>'+esc(r.nome)+'</td><td>'+esc(r.negocio)+'</td><td>'+esc(r.telefone)+'</td><td>'+esc(mo)+'</td></tr>';
    }).join("");
    var n=im.rows.length;
    h+='<div class="blk"><h3>Prévia</h3><p class="guide"><b>'+n+'</b> '+(n===1?"cliente novo":"clientes novos")+' para importar.'+(im.dup?' '+im.dup+' já estavam cadastrados e serão ignorados.':'')+(im.empty?' '+im.empty+' linhas sem nome e sem telefone serão ignoradas.':'')+'</p>'+
      '<div class="tbl"><table><thead><tr><th>Nome</th><th>Negócio</th><th>Telefone</th><th>Motivo</th></tr></thead><tbody>'+rows+'</tbody></table></div>'+(n>8?'<p class="hint">Mostrando 8 de '+n+'.</p>':"")+
      '<div class="fld"><label class="lb" for="imp-motivo">Motivo da saída quando a planilha não informa</label><select class="sel" id="imp-motivo">'+optionsMotivo(im.motivoPadrao)+'</select></div>'+
      '<div class="row"><button class="btn" data-action="doimport">Importar '+n+(n===1?" cliente":" clientes")+'</button><button class="btn ghost" data-action="close">Cancelar</button></div></div>';
  }else{
    h+='<div class="row"><button class="btn ghost" data-action="close">Cancelar</button></div>';
  }
  return h;
}
async function writeAll(list){
  S.prog={done:0,total:list.length};renderNotice();
  for(var i=0;i<list.length;i++){
    try{
      var cid=list[i].id,p=(chain[cid]||Promise.resolve()).then(function(){return DB.collection("clientes").doc(cid).set(clone(find(cid)||list[i]));});
      chain[cid]=p.catch(function(){});
      await p;
    }
    catch(e){S.prog=null;S.err="A importação parou em "+i+" de "+list.length+". Os primeiros já foram salvos. Tente importar de novo para completar.";renderNotice();return;}
    S.prog.done=i+1;
    if((i+1)%5===0)renderNotice();
  }
  S.prog=null;renderNotice();toast("Importação concluída.");
}
function doImport(){
  var im=S.imp;if(!im||!im.rows.length)return;
  var now=new Date().toISOString(),t=today();
  var list=im.rows.map(function(r,i){
    return {id:uid()+i.toString(36),nome:r.nome,negocio:r.negocio,telefone:r.telefone,
      motivo:r.motivoTxt?guessMotivo(r.motivoTxt):im.motivoPadrao,origem:r.origem,
      etapa:"novo",proximo:t,criadoEm:now,atualizadoEm:now,
      hist:[{em:now,tipo:"Cadastro",texto:(r.origem?"Contato passado por "+r.origem+". ":"")+"Importado de "+(im.name||"texto colado")}]};
  });
  S.clients=S.clients.concat(list);
  S.importMode=false;S.imp=null;S.filter="todos";S.tab="clientes";
  renderDrawer();render(false);
  toast(list.length+(list.length===1?" cliente importado.":" clientes importados."));
  if(DB)writeAll(list).then(function(){return dupCheckAndRegister(list);});else saveLocal();
}

/* ---------- leitura de foto (OCR no próprio navegador) ---------- */
var PH_RE=/\(?\d{2}\)?[\s.\-]*9?[\s.\-]*\d{4}[\s.\-]*\d{4}/;
function ocrToLines(raw){
  var lines=String(raw||"").split(/\r?\n/).map(function(l){return l.trim();}).filter(Boolean);
  var out=[],pending="";
  lines.forEach(function(line){
    var m=line.match(PH_RE),d=m?digits(m[0]):"";
    var hasPhone=m&&d.length>=10&&d.length<=13;
    var rest=(hasPhone?line.replace(m[0],""):line).replace(/[|;,_\u2013\u2014\u2022*\[\]{}<>]+/g," ").replace(/^\s*\d{1,3}\s*[.)\-]\s+/,"").replace(/^[\s\-.:]+|[\s\-.:]+$/g,"").replace(/\s{2,}/g," ").trim();
    if(hasPhone){
      var nome=rest||pending;
      if(nome||d)out.push(nome+";"+fmtPhone(m[0].trim()));
      pending="";
    }else{
      pending=/[A-Za-z\u00C0-\u00FF]{2,}/.test(rest)?rest:"";
    }
  });
  return out;
}
function loadOcr(){
  return new Promise(function(res,rej){
    if(window.Tesseract)return res(window.Tesseract);
    var s=document.createElement("script");
    s.src="https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js";
    s.onload=function(){window.Tesseract?res(window.Tesseract):rej(new Error("sem leitor"));};
    s.onerror=function(){rej(new Error("sem leitor"));};
    document.head.appendChild(s);
  });
}
function shrink(file){
  return new Promise(function(res){
    var url=URL.createObjectURL(file),img=new Image();
    img.onload=function(){
      var max=2200,k=Math.min(1,max/Math.max(img.width,img.height));
      var c=document.createElement("canvas");c.width=Math.round(img.width*k);c.height=Math.round(img.height*k);
      var ctx=c.getContext("2d");
      try{ctx.filter="grayscale(1) contrast(1.35)";}catch(e){}
      ctx.drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(url);
      c.toBlob(function(b){res(b||file);},"image/jpeg",0.92);
    };
    img.onerror=function(){URL.revokeObjectURL(url);res(file);};
    img.src=url;
  });
}
async function handlePhotos(files){
  var st=function(msg){var el=$("#ocr-status");if(el){el.textContent=msg;el.hidden=!msg;}};
  var list=Array.prototype.slice.call(files||[]);
  if(!list.length||!S.imp)return;
  var rows=[],names=[];
  try{
    st("Carregando o leitor de texto…");
    var T=await loadOcr();
    for(var i=0;i<list.length;i++){
      var prefix="Foto "+(i+1)+" de "+list.length+": ";
      st(prefix+"preparando…");
      var img=await shrink(list[i]);
      var r=await T.recognize(img,"por",{logger:function(m){
        if(m&&m.status==="recognizing text")st(prefix+"lendo "+Math.round((m.progress||0)*100)+"%");
        else if(m&&m.status)st(prefix+"preparando…");
      }});
      rows=rows.concat(ocrToLines(r&&r.data&&r.data.text));
      names.push(list[i].name||"foto");
    }
  }catch(e){
    st("");
    if(S.importMode&&S.imp){S.imp.err="Não consegui ler a foto. Confira a internet e tente de novo, ou digite as linhas na caixa abaixo.";renderDrawer();}
    return;
  }
  if(!S.importMode||!S.imp)return;
  var mp=S.imp.motivoPadrao;S.imp=newImp();S.imp.motivoPadrao=mp;
  if(!rows.length){S.imp.err="Não achei nomes com telefone na foto. Tente uma foto mais reta e bem iluminada, ou digite as linhas na caixa abaixo.";renderDrawer();return;}
  S.imp.text="Nome;Telefone\n"+rows.join("\n");
  try{buildPreview(parseDelimited(S.imp.text));}catch(x){S.imp.err="Não consegui montar a lista.";}
  S.imp.name=names.join(", ");
  renderDrawer();
  toast("Foto lida. Confira os dados antes de importar.");
}

/* ---------- ações ---------- */
function toast(msg){
  var t=$("#toast");t.textContent=msg;t.hidden=false;clearTimeout(toastTimer);
  toastTimer=setTimeout(function(){t.hidden=true;},2600);
}
function copy(text,fallbackSel){
  var done=function(){toast("Copiado");};
  var fail=function(){var el=fallbackSel?$(fallbackSel):null;if(el&&el.select)el.select();toast("Não consegui copiar. Selecione e copie.");};
  try{navigator.clipboard.writeText(text).then(done,fail);}catch(e){fail();}
}
function updateWa(c){
  var a=$("#wa");if(!a)return;
  var m=$("#msg"),href=waHref(c,m?m.value:"");
  if(href){a.href=href;a.removeAttribute("aria-disabled");}else{a.removeAttribute("href");a.setAttribute("aria-disabled","true");}
  var h=$("#wa-hint");if(h)h.hidden=!!href;
}
function setStage(id,st){edit(id,function(c){applyStage(c,st);});}
function closeDrawer(){
  S.openId=null;S.newMode=false;S.importMode=false;S.imp=null;S.confirmDel=null;renderDrawer();
  if(S.trigger&&document.body.contains(S.trigger))S.trigger.focus();
  S.trigger=null;
}
function logContact(){
  var id=S.openId,txt=S.note.trim(),tp=S.noteTipo;
  if(!txt&&tp==="Anotação"){toast("Escreva a anotação primeiro.");return;}
  var msg="Contato registrado.";
  edit(id,function(c){
    c.hist.push({em:new Date().toISOString(),tipo:tp,texto:txt||"(sem anotação)"});
    if(tp!=="Anotação"){
      if(c.etapa==="novo")c.etapa="contatado";
      if(isActive(c)&&!c.proximo){c.proximo=addDays(3);msg="Contato registrado. Próximo em 3 dias.";}
    }
  });
  S.note="";renderDrawer();toast(msg);
}
function saveNew(){
  var nome=$("#n-nome").value.trim();
  if(!nome){toast("Informe o nome do cliente.");$("#n-nome").focus();return;}
  var now=new Date().toISOString(),origem=$("#n-origem").value.trim();
  var c={id:uid(),nome:nome,negocio:$("#n-negocio").value.trim(),telefone:$("#n-tel").value.trim(),motivo:$("#n-motivo").value,origem:origem,
    etapa:"novo",proximo:today(),criadoEm:now,hist:[{em:now,tipo:"Cadastro",texto:origem?"Contato passado por "+origem:"Cliente cadastrado"}]};
  S.newMode=false;S.openId=c.id;S.msgKind="primeiro";S.note="";S.noteTipo="WhatsApp";S.confirmDel=null;
  put(c);toast("Cliente salvo.");dupCheckAndRegister([c]);
}

document.addEventListener("click",function(e){
  var t=e.target.closest("[data-action]");if(!t)return;
  var a=t.dataset.action,id=S.openId;
  switch(a){
    case "tab":S.tab=t.dataset.tab;render(false);if(S.tab==="equipe"&&S.isGestor&&!S.team)loadTeam();break;
    case "filter":S.tab="clientes";S.filter=t.dataset.f;render(false);break;
    case "import":S.trigger=t;S.importMode=true;S.newMode=false;S.openId=null;S.imp=newImp();renderDrawer();break;
    case "imptext":
      var txt=S.imp.text||"",mp0=S.imp.motivoPadrao,tx0=S.imp.text;
      S.imp=newImp();S.imp.motivoPadrao=mp0;S.imp.text=tx0;
      if(!txt.trim()){S.imp.err="Cole as linhas da planilha primeiro.";}
      else{try{buildPreview(parseDelimited(txt));}catch(x){S.imp.err="Não consegui ler o texto colado.";}}
      renderDrawer();break;
    case "doimport":doImport();break;
    case "open":
      if(S.selMode){var sid=t.dataset.id;if(S.sel[sid])delete S.sel[sid];else S.sel[sid]=true;S.bulkDel=false;renderList();break;}
      S.trigger=t;S.openId=t.dataset.id;S.newMode=false;S.importMode=false;S.msgKind="primeiro";S.confirmDel=null;S.note="";S.noteTipo="WhatsApp";renderDrawer();break;
    case "new":S.trigger=t;S.newMode=true;S.importMode=false;S.openId=null;renderDrawer();break;
    case "close":closeDrawer();break;
    case "saveNew":saveNew();break;
    case "stage":setStage(id,t.dataset.stage);break;
    case "quick":edit(id,function(c){c.proximo=t.dataset.d==="clear"?"":addDays(Number(t.dataset.d));});break;
    case "msgkind":S.msgKind=t.dataset.k;renderDrawer();break;
    case "tipo":S.noteTipo=t.dataset.t;renderDrawer();break;
    case "copymsg":copy($("#msg").value,"#msg");break;
    case "copyphone":var c1=find(id);if(c1)copy(c1.telefone,null);break;
    case "log":logContact();break;
    case "del":
      if(S.confirmDel===id){removeClient(id);S.confirmDel=null;closeDrawer();render(false);toast("Cliente excluído.");}
      else{S.confirmDel=id;renderDrawer();}
      break;
    case "canceldel":S.confirmDel=null;renderDrawer();break;
    case "rmex":S.clients.filter(function(c){return c.exemplo;}).forEach(function(c){removeClient(c.id);});render(true);toast("Exemplos removidos.");break;
    case "copyob":copy(OBJECOES[Number(t.dataset.i)].r,null);break;
    case "dismiss":S.err="";renderNotice();break;
    case "selmode":S.selMode=!S.selMode;S.sel={};S.bulkDel=false;render(false);break;
    case "selall":filtered().forEach(function(c){S.sel[c.id]=true;});renderList();break;
    case "selnone":S.sel={};S.bulkDel=false;renderList();break;
    case "bulkdate":var dd=Number(t.dataset.d);bulk(function(c){if(isActive(c))c.proximo=addDays(dd);});break;
    case "bulkdel":if(!selIds().length){toast("Selecione ao menos um cliente.");break;}S.bulkDel=true;renderList();break;
    case "bulkdelno":S.bulkDel=false;renderList();break;
    case "bulkdelok":bulkDelete();break;
    case "export":doExport();break;
    case "savemsgs":
      document.querySelectorAll("[data-cm]").forEach(function(el){var v=el.value.trim();if(v)S.cfg.msgs[el.dataset.cm]=v;else delete S.cfg.msgs[el.dataset.cm];});
      saveCfg().then(function(){toast("Mensagens salvas.");}).catch(function(){S.err="Não consegui salvar as mensagens. Tente de novo.";renderNotice();});
      S.msgText={};render(false);break;
    case "resetmsgs":
      S.cfg.msgs={};S.msgText={};
      saveCfg().then(function(){toast("Texto padrão restaurado.");}).catch(function(){S.err="Não consegui salvar. Tente de novo.";renderNotice();});
      render(false);break;
    case "savemeta":
      var mv=parseInt(($("#cfg-meta")||{}).value,10);if(!isFinite(mv)||mv<0)mv=0;if(mv>500)mv=500;
      S.cfg.meta=mv;
      saveCfg().then(function(){toast("Meta salva.");}).catch(function(){S.err="Não consegui salvar a meta. Tente de novo.";renderNotice();});
      render(false);break;
    case "notif":
      if("Notification" in window){Notification.requestPermission().then(function(p){S.notified=false;render(false);toast(p==="granted"?"Avisos ativados.":"Os avisos não foram ativados.");});}
      break;
    case "pushon":
      if(S.pushBusy)break;
      S.pushBusy=true;render(false);
      API().enablePush().then(function(){
        try{localStorage.setItem("rc.push."+(window.RC_UID||""),"1");}catch(x){}
        toast("Avisos com o app fechado ativados.");
      }).catch(function(e){S.err=pushErro(e);renderNotice();}).then(function(){S.pushBusy=false;render(false);});
      break;
    case "pushoff":
      if(S.pushBusy)break;
      S.pushBusy=true;render(false);
      API().disablePush().then(function(){
        try{localStorage.removeItem("rc.push."+(window.RC_UID||""));}catch(x){}
        toast("Avisos com o app fechado desligados.");
      }).then(function(){S.pushBusy=false;render(false);});
      break;
    case "teamload":loadTeam();break;
    case "teamxlsx":exportTeam();break;
    case "teampdf":printTeam();break;
    case "auadd":authAdd();break;
    case "aurm":
      if(S.authDel===t.dataset.e)authRemove(t.dataset.e);else{S.authDel=t.dataset.e;render(false);}
      break;
    case "aurmno":S.authDel="";render(false);break;
  }
});
document.addEventListener("input",function(e){
  var t=e.target;
  if(t.id==="msg"){var c=find(S.openId);if(!c)return;S.msgText[c.id+":"+S.msgKind]=t.value;updateWa(c);}
  else if(t.id==="note"){S.note=t.value;}
  else if(t.id==="imp-text"&&S.imp){S.imp.text=t.value;}
  else if(t.id==="q"){S.q=t.value;renderList();}
});
document.addEventListener("change",function(e){
  var t=e.target;
  if(t.id==="fmot"){S.fmot=t.value;renderList();return;}
  if(t.id==="bulk-stage"){var st0=t.value;if(!st0)return;bulk(function(c){applyStage(c,st0);});return;}
  if(t.id==="imp-photo"){if(t.files&&t.files.length&&S.imp)handlePhotos(t.files);return;}
  if(t.id==="imp-file"){var fl=t.files&&t.files[0];if(fl&&S.imp)handleFile(fl);return;}
  if(t.id==="imp-motivo"&&S.imp){S.imp.motivoPadrao=t.value;renderDrawer();return;}
  if(t.id==="vend"){
    S.vendedor=t.value.trim()||window.RC_NOME||"Consultor";
    try{localStorage.setItem("rc.vendedor."+(window.RC_UID||""),S.vendedor);}catch(x){}
    S.msgText={};renderDrawer();return;
  }
  var f=t.dataset&&t.dataset.field;if(!f||!S.openId)return;
  var id=S.openId,val=t.value.trim();
  var keep=(f!=="motivo"&&f!=="proximo");
  var antes=find(id),telAntes=antes?antes.telefone:"";
  edit(id,function(c){c[f]=val;},{keep:keep});
  if(f==="telefone")syncPhone(id,telAntes);
  if(f==="motivo"){S.msgText={};renderDrawer();}
  else if(keep){
    var c=find(id);if(!c)return;
    updateWa(c);var h=$("#dr-name");if(h)h.textContent=c.nome||"Sem nome";
  }
});
document.addEventListener("keydown",function(e){if(e.key==="Escape"&&(S.openId||S.newMode||S.importMode))closeDrawer();});

/* ---------- início ---------- */
loadCfg();
render(false);
(async function(){
  try{DB=await (window.claude&&window.claude.use?window.claude.use("db"):null);}catch(e){DB=null;}
  if(!DB){S.mode="local";loadLocal();render(false);return;}
  S.mode="db";
  slowTimer=setTimeout(function(){S.slow=true;renderNotice();},10000);
  DB.collection("clientes").onSnapshot(function(snap){
    S.clients=snap.docs.map(function(d){var o=clone(d.data()||{});o.id=d.id;return o;});
    if(!snap.metadata.fromCache){clearTimeout(slowTimer);S.slow=false;S.loaded=true;}
    else if(snap.size>0){S.loaded=true;}
    render(false);
  },function(){
    clearTimeout(slowTimer);S.slow=false;S.loaded=true;
    S.err="Perdi a conexão com os dados. Recarregue a página para tentar de novo.";render(false);
  });
})();
})();
