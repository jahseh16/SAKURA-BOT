const fs = require("fs").promises;
const path = require("path");

// 📂 Archivos de datos
const dataDir = "/home/container/nsfwdata";
const usersFile = path.join(dataDir, "users.json");

// 🧩 Asegurar directorio y archivo
async function ensureDataDir() {
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(usersFile);
  } catch {
    await fs.writeFile(usersFile, "[]");
  }
}

async function readUsers() {
  try {
    const data = await fs.readFile(usersFile, "utf8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function saveUsers(users) {
  await fs.writeFile(usersFile, JSON.stringify(users, null, 2));
}

// ✅ Función segura para enviar mensajes
async function safeSend(conn, m, content) {
  const jid = m?.chat || m?.key?.remoteJid || m?.key?.participant;
  if (!jid) {
    console.error("❌ No se pudo obtener JID válido para enviar mensaje.");
    return;
  }
  try {
    await conn.sendMessage(jid, content, { quoted: m });
  } catch (e) {
    console.error("⚠️ Error en safeSend:", e.message);
  }
}

module.exports = {
  command: ["reg", "registrar"],
  description: "Registrar edad del jugador",
  category: "NSFW",
  run: async (conn, m, args) => {
    try {
      await ensureDataDir();

      const texto = args.join(" ").trim();
      if (!texto || !/^\d{2}\.\d{2}\.\d{2}$/.test(texto)) {
        return await safeSend(conn, m, {
          text: "❌ Usa el formato correcto: `.reg DD.MM.AA` (ej. `.reg 20.05.07`)"
        });
      }

      let [dia, mes, anio] = texto.split(".").map(Number);
      if (isNaN(dia) || dia > 31 || mes > 12) {
        return await safeSend(conn, m, { text: "❌ Fecha inválida." });
      }

      const anioCompleto = anio < 50 ? 2000 + anio : 1900 + anio;
      const nacimiento = new Date(anioCompleto, mes - 1, dia);
      const hoy = new Date();

      let edad = hoy.getFullYear() - nacimiento.getFullYear();
      if (
        hoy.getMonth() < nacimiento.getMonth() ||
        (hoy.getMonth() === nacimiento.getMonth() && hoy.getDate() < nacimiento.getDate())
      ) edad--;

      if (edad < 18) {
        return await safeSend(conn, m, {
          text: "⛔ Solo mayores de 18 años pueden registrarse."
        });
      }

      const users = await readUsers();
      const idx = users.findIndex(u => u.whatsappId === m.sender);
      const data = { whatsappId: m.sender, edad, fechaNacimiento: texto, registrado: true };

      if (idx >= 0) users[idx] = data;
      else users.push(data);

      await saveUsers(users);

      await safeSend(conn, m, {
        text: `✅ Edad registrada correctamente. Tienes *${edad} años*.`
      });
    } catch (e) {
      console.error("Error en comando reg:", e);
      await safeSend(conn, m, { text: `❌ Error: ${e.message}` });
    }
  },
};
