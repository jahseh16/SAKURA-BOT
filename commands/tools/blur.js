const Jimp = require('jimp');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');

module.exports = {
  command: ["blur", "desenfocar", "difuminar"],
  description: "Aplica efecto blur/desenfoque a una imagen (procesamiento local)",
  category: "tools",
  
  async run(client, m, args) {
    try {
      const quotedMsg = m.quoted || m.msg?.contextInfo?.quotedMessage;
      const isImage = m.message?.imageMessage || quotedMsg?.imageMessage;

      if (!isImage) {
        return m.reply(`🎨 *EFECTO BLUR*

💡 *Uso:* Responde a una imagen con *${m.prefix}blur*

📝 *Intensidad:* (opcional)
${m.prefix}blur 5 - Blur ligero
${m.prefix}blur 15 - Blur medio
${m.prefix}blur 30 - Blur fuerte

✨ Procesamiento local con Jimp`);
      }

      await client.sendMessage(m.chat, {
        react: { text: '🎨', key: m.key }
      });

      // Descargar imagen
      const imageBuffer = await downloadMediaMessage(
        quotedMsg?.imageMessage ? { message: quotedMsg } : m,
        'buffer'
      );

      const blurIntensity = args[0] ? Math.min(parseInt(args[0]), 50) : 10;

      // Procesar con Jimp (librería local, no requiere internet)
      const image = await Jimp.read(imageBuffer);
      
      // Aplicar blur
      image.blur(blurIntensity);

      // Convertir de vuelta a buffer
      const processedBuffer = await image.getBufferAsync(Jimp.MIME_JPEG);

      await client.sendMessage(
        m.chat,
        {
          image: processedBuffer,
          caption: `✨ *Efecto blur aplicado*\n🔧 Intensidad: ${blurIntensity}\n⚡ Procesado localmente`
        },
        { quoted: m }
      );

      await client.sendMessage(m.chat, {
        react: { text: '✅', key: m.key }
      });

    } catch (err) {
      console.error('❌ Error en blur:', err.message);
      await client.sendMessage(m.chat, {
        react: { text: '❌', key: m.key }
      });

      m.reply('❌ Error al procesar la imagen. Asegúrate de que sea una imagen válida.');
    }
  }
};