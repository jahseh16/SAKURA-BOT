module.exports = {
  command: ["getaudio"],
  category: "downloader",
  description: "Envia el link de descarga de audio MP3 desde YouTube.",
  async run(m, { conn, args }) {
    const id = args[0];
    if (!id) return conn.sendMessage(m.chat, { text: "❌ Falta el ID del video." }, { quoted: m });
    const link = `https://tomp3.cc/en/youtube-video/${id}`;
    await conn.sendMessage(m.chat, { text: `🎵 *Descargar Audio (MP3):*\n${link}` }, { quoted: m });
  }
};
