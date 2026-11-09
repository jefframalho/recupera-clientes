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

var S={clients:[],loaded:false,mode:"pending",slow:false,err:"",tab:"clientes",filter:"todos",openId:null,newMode:false,importMode:false,imp:null,prog:null,
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
  S.clients=S.clients.filter(function(x){return x.id!==id;});
  if(DB){chain[id]=(chain[id]||Promise.resolve()).then(function(){return DB.collection("clientes").doc(id).delete();}).catch(dbFail);}
  else saveLocal();
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
  el.innerHTML='<div class="receipt"><div class="rc-head"><span>Funil · '+total+(total===1?" cliente":" clientes")+'</span><button data-action="filter" data-f="todos">Ver todos</button></div><div class="rc-grid">'+cells+'</div><div class="fbar" aria-hidden="true">'+bar+'</div></div>';
}
function filtered(){
  var t=today(),a=S.clients.slice();
  if(S.filter==="hoje")a=dueList();
  else if(S.filter!=="todos")a=a.filter(function(c){return c.etapa===S.filter;});
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
  var e=etapaNome(c.etapa),lc=lastContact(c),m=motivoOf(c.motivo).nome;
  return '<button class="card" data-action="open" data-id="'+esc(c.id)+'">'+
    '<span class="card-top"><span class="nm">'+esc(c.nome||"Sem nome")+'</span><span class="pill st-'+esc(c.etapa)+'">'+esc(e)+'</span></span>'+
    '<span class="sub">'+esc(c.negocio||"")+(c.negocio?" · ":"")+esc(m)+'</span>'+
    '<span class="card-foot">'+nextBadge(c)+'<span>'+(lc?"Último contato "+rel(lc):"Ainda sem contato")+'</span>'+(c.exemplo?'<span class="tag-ex">exemplo</span>':"")+'</span></button>';
}
function viewClientes(){
  if(!S.loaded&&!S.clients.length)return '<div class="empty">Carregando seus clientes…</div>';
  if(!S.clients.length)return '<div class="empty"><b>Nenhum cliente ainda.</b><br>Toque em “Novo cliente” para cadastrar um por um, ou em “Importar planilha” para subir vários de uma vez. Cada um entra no funil como Novo, com lembrete para hoje.</div>';
  var list=filtered();
  var title=S.filter==="todos"?"Todos os clientes":S.filter==="hoje"?"Para contatar hoje":etapaNome(S.filter);
  var head='<div class="listhead"><h2>'+esc(title)+'</h2><span>'+list.length+'</span></div>';
  if(!list.length)return head+'<div class="empty">'+(S.filter==="hoje"?"Nenhum contato pendente para hoje.":"Nenhum cliente nesta etapa.")+'</div>';
  return head+'<div class="list">'+list.map(card).join("")+'</div>';
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
    '<div class="panel"><h3>Por que saíram</h3>'+mot+'</div>'+
    '<div class="panel"><h3>Contatos feitos nos últimos 7 dias</h3><div class="days">'+cols+'</div></div></div>';
}
function renderView(){
  var el=$("#view");
  el.innerHTML=S.tab==="clientes"?viewClientes():S.tab==="roteiro"?viewRoteiro():viewResultados();
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
  (c.exemplo?'<p class="ex-note">Cliente de exemplo. Pode mexer à vontade e remover depois.</p>':"")+
  '<div class="blk"><h3>Etapa</h3><div class="seg">'+stages+'</div></div>'+
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
  renderNotice();renderTabs();renderSummary();renderView();
  var dr=$("#drawer");
  if(force||!dr.contains(document.activeElement))renderDrawer();
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
    try{await DB.collection("clientes").doc(list[i].id).set(list[i]);}
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
  if(DB)writeAll(list);else saveLocal();
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
function setStage(id,st){
  edit(id,function(c){
    if(c.etapa===st)return;
    var from=etapaNome(c.etapa);c.etapa=st;
    c.hist.push({em:new Date().toISOString(),tipo:"Etapa",texto:from+" → "+etapaNome(st)});
    if(!isActive(c))c.proximo="";else if(!c.proximo&&st!=="novo")c.proximo=addDays(3);
  });
}
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
  put(c);toast("Cliente salvo.");
}

document.addEventListener("click",function(e){
  var t=e.target.closest("[data-action]");if(!t)return;
  var a=t.dataset.action,id=S.openId;
  switch(a){
    case "tab":S.tab=t.dataset.tab;render(false);break;
    case "filter":S.tab="clientes";S.filter=t.dataset.f;render(false);break;
    case "import":S.trigger=t;S.importMode=true;S.newMode=false;S.openId=null;S.imp=newImp();renderDrawer();break;
    case "imptext":
      var txt=S.imp.text||"",mp0=S.imp.motivoPadrao,tx0=S.imp.text;
      S.imp=newImp();S.imp.motivoPadrao=mp0;S.imp.text=tx0;
      if(!txt.trim()){S.imp.err="Cole as linhas da planilha primeiro.";}
      else{try{buildPreview(parseDelimited(txt));}catch(x){S.imp.err="Não consegui ler o texto colado.";}}
      renderDrawer();break;
    case "doimport":doImport();break;
    case "open":S.trigger=t;S.openId=t.dataset.id;S.newMode=false;S.importMode=false;S.msgKind="primeiro";S.confirmDel=null;S.note="";S.noteTipo="WhatsApp";renderDrawer();break;
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
  }
});
document.addEventListener("input",function(e){
  var t=e.target;
  if(t.id==="msg"){var c=find(S.openId);if(!c)return;S.msgText[c.id+":"+S.msgKind]=t.value;updateWa(c);}
  else if(t.id==="note"){S.note=t.value;}
  else if(t.id==="imp-text"&&S.imp){S.imp.text=t.value;}
});
document.addEventListener("change",function(e){
  var t=e.target;
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
  edit(id,function(c){c[f]=val;},{keep:keep});
  if(f==="motivo"){S.msgText={};renderDrawer();}
  else if(keep){
    var c=find(id);if(!c)return;
    updateWa(c);var h=$("#dr-name");if(h)h.textContent=c.nome||"Sem nome";
  }
});
document.addEventListener("keydown",function(e){if(e.key==="Escape"&&(S.openId||S.newMode||S.importMode))closeDrawer();});

/* ---------- início ---------- */
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
