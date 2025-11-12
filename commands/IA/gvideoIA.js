const { downloadMediaMessage, getContentType } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');

module.exports = {
  command: ["videoai", "img2video"],
  description: "Convierte imagen en video con IA",
  category: "IA",
  
  async run(client, m, args) {
    try {
      // Detectar si el mensaje o el mensaje citado tiene imagen
      const msg = m.quoted || m;
      
      // Obtener tipo de contenido
      const messageType = getContentType(msg.message);
      
      console.log('Tipo de mensaje:', messageType); // Para debug
      
      if (messageType !== 'imageMessage') {
        return m.reply(`🎬 *IMAGE TO VIDEO AI*

💡 *Cómo usar:*

1️⃣ Envía una imagen con el comando:
   [Envía imagen]
   Caption: ${m.prefix}videoai zoom in

2️⃣ O responde a una imagen:
   [Alguien envía imagen]
   Tú: ${m.prefix}videoai zoom in

📸 Necesito que envíes o respondas a una imagen primero.

*Tipo detectado:* ${messageType || 'ninguno'}`);
      }

      const prompt = args.join(' ') || 'smooth cinematic movement';
      
      await m.reply('🎬 Imagen detectada ✅\n📥 Descargando...');

      // Descargar imagen
      const buffer = await downloadMediaMessage(
        msg,
        'buffer',
        {},
        {
          logger: console,
          reuploadRequest: client.updateMediaMessage
        }
      );

      if (!buffer || buffer.length === 0) {
        throw new Error('Buffer vacío');
      }

      await m.reply(`✅ Imagen descargada (${(buffer.length / 1024).toFixed(2)} KB)\n\n📝 Prompt: "${prompt}"\n\n🔗 Usa esta imagen en:\n• Vider.ai: https://vider.ai\n• A2E.ai: https://a2e.ai`);

      // Reenviar la imagen descargada
      await client.sendMessage(m.chat, {
        image: buffer,
        caption: `📸 Imagen lista para convertir\n\n🎬 Sube esta imagen a:\n🔗 https://vider.ai\n\n💬 Prompt sugerido: "${prompt}"`
      }, { quoted: m });

    } catch (err) {
      console.error('❌ Error completo:', err);
      m.reply(`❌ Error: ${err.message}\n\n🔍 Tipo de error: ${err.name}`);
    }
  }
};
