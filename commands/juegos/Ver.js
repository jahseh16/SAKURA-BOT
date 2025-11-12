const { downloadContentFromMessage } = require("@whiskeysockets/baileys");

module.exports = {
  command: ["ver"],
  description: "Reenvía imágenes, videos o audios enviados por los usuarios.",
  category: "juegos",

  run: async (conn, m) => {
    try {
      const quoted = m.quoted ? m.quoted : m;
      const type = Object.keys(quoted.message)[0];

      if (type === "imageMessage") {
        const stream = await downloadContentFromMessage(quoted.message.imageMessage, "image");
        let buffer = Buffer.from([]);
        for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

        await conn.sendMessage(
          m.chat,
          { image: buffer, caption: "🖼️ Imagen reenviada correctamente." },
          { quoted: m }
        );

      } else if (type === "videoMessage") {
        const stream = await downloadContentFromMessage(quoted.message.videoMessage, "video");
        let buffer = Buffer.from([]);
        for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

        await conn.sendMessage(
          m.chat,
          { video: buffer, caption: "🎬 Video reenviado correctamente." },
          { quoted: m }
        );

      } else if (type === "audioMessage") {
        const stream = await downloadContentFromMessage(quoted.message.audioMessage, "audio");
        let buffer = Buffer.from([]);
        for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

        await conn.sendMessage(
          m.chat,
          { audio: buffer, mimetype: "audio/mp4", ptt: true },
          { quoted: m }
        );

      } else {
        return m.reply("⚠️ Responde a una *imagen, video o audio* para reenviarlo.");
      }

      await m.reply("✅ Archivo reenviado correctamente.");
    } catch (e) {
      console.error(e);
      await m.reply("❌ Error al reenviar el archivo.");
    }
  },
};