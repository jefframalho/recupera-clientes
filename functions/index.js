// Aviso diário de retornos, às 8h (horário de Mauriti), para quem ativou os avisos em Ajustes.
// Para cada consultor com aparelho cadastrado, conta os clientes com retorno marcado para hoje ou atrasado
// e envia uma notificação. O texto leva só a quantidade, nunca nomes de clientes.
const { onSchedule } = require("firebase-functions/v2/scheduler");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();
const FUSO = "America/Fortaleza";
const TOKENS_MORTOS = ["messaging/registration-token-not-registered", "messaging/invalid-registration-token"];

exports.avisoRetornos = onSchedule(
  { schedule: "0 8 * * *", timeZone: FUSO, region: "southamerica-east1" },
  async () => {
    // Data de hoje no fuso de Mauriti, no formato AAAA-MM-DD (o mesmo usado no campo "proximo" dos clientes)
    const hoje = new Intl.DateTimeFormat("sv-SE", { timeZone: FUSO }).format(new Date());

    const aparelhos = await db.collectionGroup("dispositivos").get();
    const porUsuario = {};
    aparelhos.forEach((d) => {
      const uid = d.ref.parent.parent.id;
      (porUsuario[uid] = porUsuario[uid] || []).push({ token: d.get("token") || d.id, ref: d.ref });
    });

    let enviados = 0;
    for (const uid of Object.keys(porUsuario)) {
      const snap = await db.collection("usuarios").doc(uid).collection("clientes")
        .where("proximo", ">", "").where("proximo", "<=", hoje).get();
      const n = snap.docs.filter((d) => {
        const c = d.data();
        return !c.exemplo && c.etapa !== "recuperado" && c.etapa !== "perdido";
      }).length;
      if (!n) continue;

      const lista = porUsuario[uid];
      const r = await admin.messaging().sendEachForMulticast({
        tokens: lista.map((a) => a.token),
        data: {
          title: "Recupera Clientes",
          body: n === 1 ? "1 cliente para contatar hoje." : n + " clientes para contatar hoje.",
          url: "./"
        },
        webpush: { headers: { Urgency: "high", TTL: "43200" } }
      });
      enviados += r.successCount;

      // Apaga aparelhos que não existem mais (app desinstalado, permissão retirada)
      await Promise.all(r.responses.map((resp, i) => {
        if (!resp.success && resp.error && TOKENS_MORTOS.includes(resp.error.code)) return lista[i].ref.delete();
        return null;
      }));
    }
    logger.info("avisoRetornos", { hoje, consultores: Object.keys(porUsuario).length, enviados });
  }
);
