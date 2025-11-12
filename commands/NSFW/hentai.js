const fs = require("fs").promises;
const path = require("path");
const axios = require("axios");

// 📁 Archivos de datos
const dataDir = "/home/container/nsfwdata";
const usersFile = path.join(dataDir, "users.json");
const cooldownFile = path.join(dataDir, "cooldowns.json");

// 🖤 Escenas aleatorias
const escenas = [
  "Una noche sensual en un onsen oculto, donde el vapor oculta deseos prohibidos...",
  "El personaje te mira con ojos ardientes, invitándote a un encuentro secreto...",
  "En un bosque encantado, una figura misteriosa susurra tentaciones al oído...",
  "Bajo la luna llena, la pasión se desata en un ritual prohibido...",
  "En un templo olvidado, las sombras danzan con promesas de placer...",
  "Entre las olas del mar, una silueta misteriosa te atrae con dulzura peligrosa...",
  "Una mirada basta para encender el fuego que ambos intentaban ocultar..."
];

// ⚙️ Funciones auxiliares
async function ensureDataFiles() {
  await fs.mkdir(dataDir, { recursive: true });
  try { await fs.access(usersFile); } catch { await fs.writeFile(usersFile, "[]"); }
  try { await fs.access(cooldownFile); } catch { await fs.writeFile(cooldownFile, "{}"); }
}

async function readJSON(file) {
  try {
    const data = await fs.readFile(file, "utf8");
    return JSON.parse(data);
  } catch {
    return file === usersFile ? [] : {};
  }
}

async function writeJSON(file, data) {
  await fs.writeFile(file, JSON.stringify(data, null, 2));
}

// 💬 Contacto falso (versión segura)
const fakeContact = {
  key: { fromMe: false, participant: "0@s.whatsapp.net" },
  message: {
    contactMessage: {
      displayName: "🌸 SAKURA - BOT 🌸",
      vcard: `BEGIN:VCARD
VERSION:3.0
N:;Sakura;;;
FN:Sakura
ORG:Sakura Bot
TITLE:
item1.TEL;waid=51999999999:+51 999 999 999
item1.X-ABLabel:Celular
END:VCARD`
    }
  }
};

// 🖼️ Enviar imagen + texto + botón + contacto falso (con protección de JID)
async function enviarImagenConContacto(conn, jid, pushName, escenasList, sakuraContact, senderId) {
  const chatId = jid || senderId;
  if (!chatId) return console.error("❌ No se pudo obtener chatId al enviar imagen.");

  // obtener imagen del API
  let imagenUrl = "https://i.ibb.co/t9dpyqX/7cjdh1wz.png";
  try {
    const res = await axios.get("https://api.waifu.pics/nsfw/waifu", { timeout: 8000 });
    if (res?.data?.url) imagenUrl = res.data.url;
  } catch {
    console.log("⚠️ No se pudo obtener imagen del API, usando backup.");
  }

  const escena = escenasList[Math.floor(Math.random() * escenasList.length)];
  const texto = `
╭─❮ *🌸  Hentai  🌸* ❯─╮
│ 👤 *Jugador:* ${pushName}
│ 📜 *Registro:* ✅ Verificado
│
│ 🌹 *Escena:* *${escena}*
│
> *“Siguiente” para continuar...*
╰────────────────────╯
`;

  await conn.sendMessage(
    chatId,
    {
      image: { url: imagenUrl },
      caption: texto,
      footer: "🔥 Sakura Hentai System",
      buttons: [
        { buttonId: "hentai_next", buttonText: { displayText: "👉 Siguiente" }, type: 1 }
      ],
      headerType: 4
    },
    { quoted: sakuraContact }
  );
}

module.exports = {
  command: ["hentai", "hti"],
  description: "Envía imágenes NSFW + contacto falso + botón siguiente (solo mayores de 18)",
  category: "NSFW",

  run: async (conn, m) => {
    try {
      await ensureDataFiles();
      const users = await readJSON(usersFile);
      const cooldowns = await readJSON(cooldownFile);
      const sender = m.sender;
      const chatId = m.chat || m.key?.remoteJid || sender;
      if (!chatId) return console.error("❌ No se pudo obtener chatId en comando hentai.");

      // 🔒 Verificar registro y edad
      const usuario = users.find(u => u.whatsappId === sender);
      if (!usuario) {
        return conn.sendMessage(
          chatId,
          { text: "🚫 *Por favor regístrate primero con* `.reg DD.MM.AA` *y confirma que eres mayor de 18 años.*" },
          { quoted: m }
        );
      }
      if (usuario.edad < 18) {
        return conn.sendMessage(
          chatId,
          { text: "⛔ *Este comando es solo para mayores de 18 años.*" },
          { quoted: m }
        );
      }

      if (!cooldowns[sender]) cooldowns[sender] = { usos: 0, tiempo: 0 };

      const ahora = Date.now();
      if (cooldowns[sender].tiempo && cooldowns[sender].tiempo > ahora) {
        const minutosRest = Math.ceil((cooldowns[sender].tiempo - ahora) / (60 * 1000));
        return conn.sendMessage(
          chatId,
          { text: `🕒 Espera *${minutosRest} minutos* para volver a usar este comando.` },
          { quoted: m }
        );
      }

      cooldowns[sender].usos = (cooldowns[sender].usos || 0) + 1;

      if (cooldowns[sender].usos > 10) {
        cooldowns[sender] = { usos: 0, tiempo: ahora + 3 * 60 * 60 * 1000 };
        await writeJSON(cooldownFile, cooldowns);
        return conn.sendMessage(
          chatId,
          { text: "🚫 Has alcanzado el límite de 10 usos. Espera *3 horas* antes de volver a usar este comando." },
          { quoted: m }
        );
      }

      await writeJSON(cooldownFile, cooldowns);

      await enviarImagenConContacto(conn, chatId, m.pushName || usuario?.nombre || "Desconocido", escenas, fakeContact, sender);

      // 📩 Listener de botón "Siguiente"
      conn.ev.on("messages.upsert", async ({ messages }) => {
        try {
          const msg = messages[0];
          if (!msg?.message?.buttonsResponseMessage) return;

          const selected = msg.message.buttonsResponseMessage.selectedButtonId;
          if (selected !== "hentai_next") return;

          const whoPressed = msg.key.participant || msg.key.remoteJid;
          const chatPress = msg.key.remoteJid || whoPressed;
          if (!chatPress) return;

          if (whoPressed !== sender && chatPress !== sender) return;

          const cd = await readJSON(cooldownFile);
          if (!cd[sender]) cd[sender] = { usos: 0, tiempo: 0 };

          const now = Date.now();
          if (cd[sender].tiempo && cd[sender].tiempo > now) {
            const minsLeft = Math.ceil((cd[sender].tiempo - now) / (60 * 1000));
            return conn.sendMessage(
              chatPress,
              { text: `🕒 Espera *${minsLeft} minutos* antes de volver a usar este comando.` },
              { quoted: msg }
            );
          }

          cd[sender].usos = (cd[sender].usos || 0) + 1;
          if (cd[sender].usos > 10) {
            cd[sender] = { usos: 0, tiempo: now + 3 * 60 * 60 * 1000 };
            await writeJSON(cooldownFile, cd);
            return conn.sendMessage(
              chatPress,
              { text: "🚫 Has alcanzado el límite de 10 usos. Espera *3 horas* antes de volver a usar este comando.*" },
              { quoted: msg }
            );
          }

          await writeJSON(cooldownFile, cd);

          await enviarImagenConContacto(conn, chatPress, msg.pushName || usuario?.nombre || m.pushName || "Desconocido", escenas, fakeContact, sender);
        } catch (err) {
          console.error("Error manejando botón hentai_next:", err);
        }
      });

    } catch (e) {
      console.error("Error en comando hentai:", e);
      const chatId = m.chat || m.key?.remoteJid || m.sender;
      if (chatId) {
        await conn.sendMessage(chatId, { text: `❌ Error: ${e.message}` }, { quoted: m });
      }
    }
  },
};
