const yts = require('yt-search');

module.exports = {
  command: ["play", "playvid", "play2"],
  description: "Busca videos en YouTube y muestra opciones de descarga",
  category: "downloader",
  
  async run(m, { conn, text, usedPrefix, command }) {  // ← CAMBIO AQUÍ
    if (!text) {
      throw `❗ Por favor ingresa un texto para buscar.\nEjemplo: ${usedPrefix + command} Nombre del video`;
    }
    
    const search = await yts(text);
    const videoInfo = search.all?.[0];
    if (!videoInfo) {
      throw '❗ No se encontraron resultados para tu búsqueda. Intenta con otro título.';
    }
    
    const body = `\`\`\`El mejor bot de WhatsApp ⚔️\n\nElige una de las opciones para descargar:\n\n🎧 *Audio* o 📽️ *Video*\n\n`;
    
    await conn.sendMessage(
      m.chat,
      {
        image: { url: videoInfo.thumbnail },
        caption: body,
        footer: `𝕭𝖑𝖆𝖈𝖐 𝕮𝖑𝖔𝖛𝖊𝖗 ☘︎| ⚔️🥷`,
        buttons: [
          { buttonId: `.ytmp3 ${videoInfo.url}`, buttonText: { displayText: '🎧 Audio' } },
          { buttonId: `.ytmp4 ${videoInfo.url}`, buttonText: { displayText: '📽️ Video' } },
          { buttonId: `.ytmp3doc ${videoInfo.url}`, buttonText: { displayText: '💿 audio doc' } },
          { buttonId: `.ytmp4doc ${videoInfo.url}`, buttonText: { displayText: '🎥 vídeo doc' } },
        ],
        viewOnce: true,
        headerType: 4,
        contextInfo: {
          externalAdReply: {
            showAdAttribution: false,
            title: '📡 Descargas clover',
            body: '✡︎ Dev • TheCarlos',
            mediaType: 2,
            sourceUrl: global.redes || '',
            thumbnail: global.icons || null
          }
        }
      },
      { quoted: m }
    );
    m.react('✅');
  }
};
