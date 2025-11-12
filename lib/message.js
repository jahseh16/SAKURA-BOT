/**
 * =====================================
 * 📩 message.js — Manejo optimizado de mensajes
 * Compatible con CommonJS y Baileys (ESM)
 * Velocidad mejorada en grupos 🔥
 * =====================================
 */

let proto = null;

// 🔥 Cargar Baileys dinámicamente (compatible con CommonJS)
(async () => {
  try {
    const baileys = await import("@whiskeysockets/baileys");
    proto = baileys.proto;
    console.log("✅ Baileys importado correctamente — message.js cargado");
  } catch (err) {
    console.error("❌ Error al importar Baileys:", err);
  }
})();

/**
 * 🧠 smsg: simplifica y normaliza los mensajes
 * @param {object} conn - conexión de Baileys
 * @param {object} m - mensaje entrante
 */
function smsg(conn, m) {
  if (!m) return m;

  // 🔍 Asegurar estructura del mensaje
  m.message = m.message || (m.msg && m.msg.message) || {};
  m.type = Object.keys(m.message)[0] || null;

  // 🗣️ Texto o contenido
  m.body =
    m.message.conversation ||
    m.message.extendedTextMessage?.text ||
    m.message.imageMessage?.caption ||
    m.message.videoMessage?.caption ||
    m.message.listResponseMessage?.singleSelectReply?.selectedRowId ||
    m.message.buttonsResponseMessage?.selectedButtonId ||
    "";

  // 💬 Info de chat
  m.chat = m.key.remoteJid;
  m.isGroup = m.chat.endsWith("@g.us");
  m.sender = m.key.fromMe
    ? conn.user.id
    : m.isGroup
    ? (m.key.participant || "")
    : m.chat;

  m.pushName = m.pushName || "Usuario";

  // ⚡ Respuesta optimizada
  m.reply = async (text, options = {}) => {
    try {
      await conn.sendMessage(m.chat, { text, ...options }, { quoted: m });
    } catch (err) {
      console.error("❌ Error al responder:", err);
      try {
        await conn.sendMessage(m.chat, { text: "⚠️ Error al enviar respuesta." });
      } catch {}
    }
  };

  // 🧩 Detección rápida de tipo de mensaje (para comandos)
  m.isCmd = false;
  if (m.body.startsWith("!") || m.body.startsWith(".") || m.body.startsWith("/")) {
    m.isCmd = true;
    m.prefix = m.body[0];
    m.command = m.body.slice(1).split(" ")[0].toLowerCase();
    m.args = m.body.trim().split(/ +/).slice(1);
    m.text = m.args.join(" ");
  }

  // 💡 Eliminar caché innecesario de mensajes (acelera grupos)
  if (conn.ev && conn.ev.buffered) conn.ev.buffered = false;

  return m;
}

module.exports = { smsg };
