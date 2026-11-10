import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, sendEmailVerification, sendPasswordResetEmail, updateProfile,
  GoogleAuthProvider, signInWithPopup, reload
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore, collection, collectionGroup, doc, getDoc, getDocs, setDoc, deleteDoc, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getMessaging, getToken, deleteToken, isSupported as messagingSupported
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging.js";
import { firebaseConfig, vapidKey } from "./firebase-config.js";

const $ = (id) => document.getElementById(id);
const VIEWS = ["v-loading", "v-setup", "v-login", "v-signup", "v-verify", "v-denied"];

function show(id) {
  VIEWS.forEach((v) => { $(v).hidden = v !== id; });
  $("auth").hidden = false;
  $("appwrap").hidden = true;
}
function say(id, msg, ok) {
  const el = $(id);
  el.textContent = msg || "";
  el.className = ok ? "ok" : "err";
  el.hidden = !msg;
}

const ERROS = {
  "auth/invalid-credential": "E-mail ou senha incorretos.",
  "auth/wrong-password": "E-mail ou senha incorretos.",
  "auth/user-not-found": "E-mail ou senha incorretos.",
  "auth/invalid-email": "E-mail inválido.",
  "auth/email-already-in-use": "Esse e-mail já tem conta. Use Entrar.",
  "auth/weak-password": "A senha precisa ter pelo menos 6 caracteres.",
  "auth/too-many-requests": "Muitas tentativas. Espere alguns minutos e tente de novo.",
  "auth/network-request-failed": "Sem conexão. Tente de novo.",
  "auth/operation-not-allowed": "Esse tipo de login ainda não foi ativado no Firebase.",
  "auth/unauthorized-domain": "Este endereço ainda não foi autorizado no Firebase (Authentication, Configurações, Domínios autorizados).",
  "auth/popup-closed-by-user": "",
  "auth/cancelled-popup-request": ""
};
const erro = (e) => (e && e.code in ERROS ? ERROS[e.code] : "Não deu certo. Tente de novo.");

const configurado = firebaseConfig && firebaseConfig.apiKey && !String(firebaseConfig.apiKey).startsWith("COLE");
if (!configurado) {
  show("v-setup");
} else {
  iniciar();
}

function iniciar() {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);
  let started = false;

  onAuthStateChanged(auth, async (user) => {
    if (!user) { started = false; show("v-login"); return; }
    if (!user.emailVerified) {
      $("verify-email").textContent = user.email || "";
      show("v-verify");
      return;
    }
    show("v-loading");
    let liberado = false;
    let semResposta = false;
    try {
      const snap = await getDoc(doc(db, "autorizados", String(user.email).toLowerCase()));
      liberado = snap.exists();
    } catch (e) {
      liberado = false;
      // Falta de permissão significa "não liberado". Qualquer outro erro é conexão ou Firebase fora do ar.
      semResposta = !(e && e.code === "permission-denied");
    }
    if (!liberado) {
      $("denied-email").textContent = user.email || "";
      $("denied-msg").hidden = semResposta;
      $("denied-net").hidden = !semResposta;
      show("v-denied");
      return;
    }
    if (started) return;
    started = true;
    let gestor = false;
    try {
      gestor = (await getDoc(doc(db, "gestores", String(user.email).toLowerCase()))).exists();
    } catch (e) {
      gestor = false;
    }
    abrirApp(user, db, gestor, app);
  });

  $("b-to-signup").addEventListener("click", () => { say("m-login", ""); show("v-signup"); });
  $("b-to-login").addEventListener("click", () => { say("m-signup", ""); show("v-login"); });

  $("f-login").addEventListener("submit", async (e) => {
    e.preventDefault();
    say("m-login", "");
    try {
      await signInWithEmailAndPassword(auth, $("l-email").value.trim(), $("l-senha").value);
    } catch (err) { say("m-login", erro(err)); }
  });

  $("b-google").addEventListener("click", async () => {
    say("m-login", "");
    try { await signInWithPopup(auth, new GoogleAuthProvider()); }
    catch (err) { say("m-login", erro(err)); }
  });

  $("b-reset").addEventListener("click", async () => {
    const email = $("l-email").value.trim();
    if (!email) { say("m-login", "Digite seu e-mail acima e toque de novo em Esqueci a senha."); return; }
    try {
      await sendPasswordResetEmail(auth, email);
      say("m-login", "Se esse e-mail tiver conta, enviamos o link para criar uma senha nova.", true);
    } catch (err) { say("m-login", erro(err)); }
  });

  $("f-signup").addEventListener("submit", async (e) => {
    e.preventDefault();
    say("m-signup", "");
    try {
      const cred = await createUserWithEmailAndPassword(auth, $("s-email").value.trim(), $("s-senha").value);
      await updateProfile(cred.user, { displayName: $("s-nome").value.trim() });
      await sendEmailVerification(cred.user);
    } catch (err) { say("m-signup", erro(err)); }
  });

  $("b-verified").addEventListener("click", async () => {
    say("m-verify", "");
    try {
      await reload(auth.currentUser);
      if (auth.currentUser.emailVerified) {
        await auth.currentUser.getIdToken(true);
        location.reload();
      } else {
        say("m-verify", "Ainda não apareceu como confirmado. Toque no link do e-mail e tente de novo.");
      }
    } catch (err) { say("m-verify", erro(err)); }
  });

  $("b-resend").addEventListener("click", async () => {
    try {
      await sendEmailVerification(auth.currentUser);
      say("m-verify", "E-mail reenviado.", true);
    } catch (err) { say("m-verify", erro(err)); }
  });

  $("b-retry").addEventListener("click", () => location.reload());
  const sair = async () => { await signOut(auth); location.reload(); };
  $("b-out1").addEventListener("click", sair);
  $("b-out2").addEventListener("click", sair);
  $("logout").addEventListener("click", sair);
}

function abrirApp(user, db, gestor, app) {
  const nome = (user.displayName || String(user.email).split("@")[0]).trim();
  const email = String(user.email).toLowerCase();
  window.RC_NOME = nome.split(/\s+/)[0];
  window.RC_UID = user.uid;
  window.RC_EMAIL = email;
  window.RC_GESTOR = !!gestor;
  $("who").textContent = nome + (gestor ? " (gestor)" : "");

  // Perfil: o gestor usa para mostrar o nome de cada consultor nos números do time.
  setDoc(doc(db, "usuarios", user.uid), { nome, email }, { merge: true }).catch(() => {});

  const norm = (s) => String(s || "").toLowerCase().trim();
  window.RC_API = {
    // Configurações de cada consultor (mensagens próprias e meta diária)
    async getConfig() {
      const s = await getDoc(doc(db, "usuarios", user.uid, "config", "geral"));
      return s.exists() ? s.data() : {};
    },
    async saveConfig(data) {
      await setDoc(doc(db, "usuarios", user.uid, "config", "geral"), data, { merge: true });
    },
    // Telefones já cadastrados por outro consultor
    async checkDup(nums) {
      const out = {};
      await Promise.all(nums.map(async (n) => {
        const s = await getDoc(doc(db, "telefones", n));
        if (s.exists() && s.data().uid !== user.uid) out[n] = s.data();
      }));
      return out;
    },
    async regDup(n) {
      await setDoc(doc(db, "telefones", n), { uid: user.uid, consultor: nome });
    },
    async unregDup(n) {
      await deleteDoc(doc(db, "telefones", n));
    },
    // Avisos de retorno com o app fechado (Firebase Cloud Messaging).
    // Cada aparelho guarda o próprio token em usuarios/{uid}/dispositivos; uma função agendada envia o aviso todo dia.
    pushDisponivel() {
      return !!vapidKey && !String(vapidKey).startsWith("COLE");
    },
    async enablePush() {
      const falha = (code) => Object.assign(new Error(code), { code });
      if (!window.RC_API.pushDisponivel()) throw falha("sem-chave");
      if (!("serviceWorker" in navigator) || !("Notification" in window) || !(await messagingSupported())) throw falha("sem-suporte");
      if ((await Notification.requestPermission()) !== "granted") throw falha("negado");
      const reg = await navigator.serviceWorker.ready;
      const token = await getToken(getMessaging(app), { vapidKey, serviceWorkerRegistration: reg });
      if (!token) throw falha("sem-token");
      await setDoc(doc(db, "usuarios", user.uid, "dispositivos", token), {
        token, criadoEm: new Date().toISOString(), aparelho: String(navigator.userAgent || "").slice(0, 120)
      });
    },
    async disablePush() {
      try {
        if (await messagingSupported()) {
          const messaging = getMessaging(app);
          const reg = await navigator.serviceWorker.ready;
          const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: reg });
          if (token) await deleteDoc(doc(db, "usuarios", user.uid, "dispositivos", token));
          await deleteToken(messaging);
        }
      } catch (e) { /* se não deu para apagar, o aviso para de chegar quando o token expirar */ }
    },
    // Só para gestores
    async listTeam() {
      const users = {};
      (await getDocs(collection(db, "usuarios"))).docs.forEach((d) => { users[d.id] = d.data(); });
      const cs = await getDocs(collectionGroup(db, "clientes"));
      const clients = cs.docs.map((d) => ({ ...d.data(), uid: d.ref.parent.parent.id }));
      return { users, clients };
    },
    async listAuthorized() {
      const s = await getDocs(collection(db, "autorizados"));
      return s.docs.map((d) => ({ email: d.id, nome: (d.data() || {}).nome || "" }))
        .sort((x, y) => x.email.localeCompare(y.email));
    },
    async addAuthorized(em, nome) {
      await setDoc(doc(db, "autorizados", norm(em)), { nome: nome || "" }, { merge: true });
    },
    async removeAuthorized(em) {
      await deleteDoc(doc(db, "autorizados", norm(em)));
    }
  };

  // Cada consultor só enxerga os próprios clientes: usuarios/{uid}/clientes
  const col = collection(db, "usuarios", user.uid, "clientes");
  const adapter = {
    collection: () => ({
      doc: (id) => {
        const ref = doc(col, id);
        return { set: (d) => setDoc(ref, d), delete: () => deleteDoc(ref) };
      },
      onSnapshot: (next, err) => onSnapshot(
        col,
        (s) => next({
          docs: s.docs.map((d) => ({ id: d.id, data: () => d.data() })),
          size: s.size,
          metadata: { fromCache: s.metadata.fromCache }
        }),
        (e) => { if (err) err(e); }
      )
    })
  };
  window.claude = { use: async (n) => (n === "db" ? adapter : null) };

  $("auth").hidden = true;
  $("appwrap").hidden = false;
  const s = document.createElement("script");
  s.src = "app.js";
  document.body.appendChild(s);
}
