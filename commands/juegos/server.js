const moment = require("moment-timezone");

module.exports = {
  command: ["server", "minecraft", "sv"],
  description: "Muestra la información del servidor con botones interactivos",
  category: "juegos",
  run: async (conn, m, args) => {
    try {
      // 🕒 Hora y saludo
      const hora = moment.tz("America/Lima").format("HH:mm:ss");
      const saludo =
        hora < "05:00:00"
          ? "Buenas noches"
          : hora < "11:00:00"
          ? "Buen día"
          : hora < "19:00:00"
          ? "Buenas tardes"
          : "Buenas noches";

      // 📞 Contacto falso
      const fkontak = {
        key: {
          participant: "0@s.whatsapp.net",
          ...(m.chat ? { remoteJid: "status@broadcast" } : {}),
        },
        message: {
          contactMessage: {
            displayName: `${m.pushName || "Usuario"}`,
            vcard: `BEGIN:VCARD\nVERSION:3.0\nN:XL;${m.pushName || "Usuario"};;;\nFN:${m.pushName || "Usuario"}\nitem1.TEL;waid=${m.sender.split("@")[0]}:${m.sender.split("@")[0]}\nitem1.X-ABLabel:Ponsel\nEND:VCARD`,
          },
        },
      };

      // 📋 Datos del servidor
      const nombreServidor = "jahseh183.aterno";
      const direccion = "jahseh183-g0tD.aternos.me";
      const puerto = "63362";

      // 📜 Texto del mensaje
      const texto = `
╭───❮ *🌸 SAKURA SERVER 🌸* ❯───╮
│ ${saludo}, ${m.pushName || "jugador"} 💫
│
> *Nombre del servidor:*
│ ${nombreServidor}
│
> *Dirección:*
│ ${direccion}
│
> *Puerto:*
│ ${puerto}
│
⚡𝐓𝐨𝐜𝐚 𝐮𝐧 𝐛𝐨𝐭ó𝐧 𝐩𝐚𝐫𝐚 𝐜𝐨𝐩𝐢𝐚𝐫 𝐞𝐥 𝐝𝐚𝐭𝐨.
╰─────────────────────────────╯
`;

      // 🔘 Enviar mensaje principal con botones
      await conn.sendMessage(
        m.chat,
        {
          text: texto,
          footer: "☘️ SAKURA SYSTEM 🌸",
          buttons: [
            {
              buttonId: "nombre_servidor",
              buttonText: { displayText: "📋 Nombre del servidor" },
              type: 1,
            },
            {
              buttonId: "direccion_servidor",
              buttonText: { displayText: "🌐 Dirección" },
              type: 1,
            },
            {
              buttonId: "puerto_servidor",
              buttonText: { displayText: "🔌 Puerto" },
              type: 1,
            },
          ],
          headerType: 1,
          contextInfo: {
            externalAdReply: {
              title: "🎮 Servidor Oficial | Sakura Network",
              body: "¡Toca los botones para obtener los datos!",
              thumbnailUrl: "https://files.catbox.moe/x0sjdp.jpeg",
              sourceUrl: "https://aternos.org/",
              mediaType: 1,
              renderLargerThumbnail: true,
            },
          },
        },
        { quoted: fkontak }
      );

      // 🧠 Escuchar respuestas de botones
      conn.ev.on("messages.upsert", async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message?.buttonsResponseMessage) return;
        const id = msg.message.buttonsResponseMessage.selectedButtonId;

        if (id === "nombre_servidor") {
          await conn.sendMessage(msg.key.remoteJid, { text: `${nombreServidor}` }, { quoted: msg });
        } else if (id === "direccion_servidor") {
          await conn.sendMessage(msg.key.remoteJid, { text: `${direccion}` }, { quoted: msg });
        } else if (id === "puerto_servidor") {
          await conn.sendMessage(msg.key.remoteJid, { text: `${puerto}` }, { quoted: msg });
        }
      });
    } catch (e) {
      console.error("Error en comando server:", e);
      await conn.sendMessage(
        m.chat,
        { text: "❌ Ocurrió un error al mostrar el servidor." },
        { quoted: m }
      );
    }
  },
};
