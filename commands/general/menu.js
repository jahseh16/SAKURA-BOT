const fs = require("fs");
const moment = require("moment-timezone");

// ⚡ Cargar versión con fallback
let version = "1.0.0";
try {
  version = require("../../package.json").version;
} catch (err) {
  console.warn("⚠️ package.json no encontrado, usando versión por defecto");
}

// ✅ Funciones para evitar jid inválido
function fixJid(jid) {
  if (!jid) return null;
  if (jid.includes("@")) return jid;
  if (jid.includes("-")) return `${jid}@g.us`;
  return `${jid}@s.whatsapp.net`;
}

function getChatId(m) {
  return (
    m.chat ||
    m.key?.remoteJid ||
    m.key?.participant ||
    m.message?.key?.remoteJid ||
    m.sender ||
    null
  );
}

async function enviarMensajeSeguro(conn, m, content, options = {}) {
  try {
    let jid = getChatId(m);
    jid = fixJid(jid);
    if (!jid) throw new Error("jid inválido");
    await conn.sendMessage(jid, content, options);
  } catch (err) {
    console.error("❌ Error al enviar mensaje:", err.message);
  }
}

module.exports = {
  command: ["help", "ayuda", "menu"],
  description: "Muestra los comandos del bot",
  category: "general",

  run: async (conn, m, args) => {
    try {
      const cmds = [...global.comandos.values()];

      const hora = moment.tz("America/Lima").format("HH:mm:ss");
      const ucapan =
        hora < "05:00:00"
          ? "Buenas noches"
          : hora < "11:00:00"
          ? "Buen día"
          : hora < "15:00:00"
          ? "Buenas tardes"
          : hora < "19:00:00"
          ? "Buenas tardes"
          : "Buenas noches";

      const fkontak = {
        key: { fromMe: false, participant: "0@s.whatsapp.net" },
        message: {
          contactMessage: {
            displayName: m.pushName || "Usuario",
            vcard: `BEGIN:VCARD
VERSION:3.0
N:;${m.pushName || "Usuario"};;;
FN:${m.pushName || "Usuario"}
item1.TEL;waid=${m.sender.split("@")[0]}:${m.sender.split("@")[0]}
item1.X-ABLabel:Teléfono
END:VCARD`,
          },
        },
      };

      const categories = {};
      cmds.forEach((cmd) => {
        if (!cmd.command) return;
        const cat = (cmd.category || "Sin categoría").toLowerCase();
        if (!categories[cat]) categories[cat] = [];
        if (!categories[cat].some((c) => c.command[0] === cmd.command[0])) {
          categories[cat].push(cmd);
        }
      });

      let menu = `╭───❮ *📜 Menú de comandos* ❯───╮
│
│  ${ucapan}, *${m.pushName || "Usuario"}*
│
│  🌸 𝐒𝐀𝐊𝐔𝐑𝐀-𝐁𝐎𝐓-𝐌𝐃
│  👑 𝘾𝙧𝙚𝙖𝙙𝙤𝙧: *+51 935 040 872*
│  ⚙️ *Versión*: ${version}
│  🧠 *Motor*: Baileys-MD
│
`;

      for (const [cat, commands] of Object.entries(categories)) {
        const catName = cat.charAt(0).toUpperCase() + cat.slice(1);
        menu += `│─── *${catName}*\n`;
        commands.forEach((cmd) => {
          menu += `│  • !${cmd.command[0]}\n`;
        });
        menu += `│\n`;
      }

      menu += `╰─────────────────────╯`;

      const videoPath = "./media/menu.mp4";
      const thumbPath = "./media/thumb.jpg";

      await enviarMensajeSeguro(conn, m, {
        video: fs.existsSync(videoPath) ? fs.readFileSync(videoPath) : null,
        caption: menu,
        gifPlayback: true,
        footer: "☘️ SAKURA SYSTEM 🌸",
        buttons: [
          { buttonId: ".ping", buttonText: { displayText: "🏛️ PING" }, type: 1 },
          { buttonId: ".code", buttonText: { displayText: "🕹 SERBOT" }, type: 1 },
        ],
        headerType: 4,
        contextInfo: {
          externalAdReply: {
            title: "🌸 𝕾𝕬𝕶𝖀𝕽𝕬-𝕭𝕺𝕿 | 𝕳𝖆𝖐 v1.0 🌸",
            body: "—͟͟͞͞𖣘 𝐓𝐡𝐞 נαнѕєη-н¢ ㊗",
            mediaType: 1,
            renderLargerThumbnail: true,
            thumbnail: fs.existsSync(thumbPath)
              ? fs.readFileSync(thumbPath)
              : null,
            sourceUrl: "https://github.com/jahseh16",
          },
        },
      }, { quoted: fkontak });

    } catch (err) {
      console.error("❌ Error en comando menú:", err);
      await enviarMensajeSeguro(conn, m, {
        text: `❌ Error ejecutando el comando menú.\n\n${err.message || err}`,
      });
    }
  },
};
