const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const axios = require('axios');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

module.exports = {
  command: ["hd", "enhance", "remini", "mejorar"],
  description: "Mejora la calidad de imágenes usando IA",
  category: "tools",
  run: async (client, m, args) => {
    let tmpFile = null;

    try {
      // 1) Verificar que responda a una imagen
      const quotedMsg = m.quoted || m.msg?.contextInfo?.quotedMessage;
      
      if (!quotedMsg?.imageMessage && !m.message?.imageMessage) {
        return m.reply(`✳️ *Uso incorrecto.*

💡 *Uso:* Responde a una imagen con *${m.prefix}hd*
📌 *Ejemplo:* 
   1. Envía o reenvía una imagen
   2. Responde con: ${m.prefix}hd

✨ La imagen será mejorada con IA`);
      }

      // Reacción procesando
      await client.sendMessage(m.chat, {
        react: { text: '🧪', key: m.key }
      });

      // 2) Determinar el mensaje de imagen
      const imageMessage = quotedMsg?.imageMessage || m.message?.imageMessage;

      // 3) Crear directorio temporal
      const tmpDir = path.join(__dirname, 'tmp');
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }

      // 4) Descargar la imagen
      const stream = await downloadContentFromMessage(imageMessage, 'image');
      tmpFile = path.join(tmpDir, `${Date.now()}_hd.jpg`);
      const writeStream = fs.createWriteStream(tmpFile);

      for await (const chunk of stream) {
        writeStream.write(chunk);
      }
      writeStream.end();

      await new Promise((resolve, reject) => {
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
      });

      // 5) Subir al CDN
      const uploadForm = new FormData();
      uploadForm.append('file', fs.createReadStream(tmpFile));

      const uploadResponse = await axios.post(
        'https://cdn.russellxz.click/upload.php',
        uploadForm,
        {
          headers: uploadForm.getHeaders(),
          timeout: 30000
        }
      );

      if (!uploadResponse.data?.url) {
        throw new Error('No se pudo subir la imagen al CDN.');
      }

      const imageUrl = uploadResponse.data.url;

      // 6) Llamar a la API Remini
      const API_KEY = 'russellxz';
      const REMINI_URL = 'https://api.neoxr.eu/api/remini';

      const reminiResponse = await axios.get(
        `${REMINI_URL}?image=${encodeURIComponent(imageUrl)}&apikey=${API_KEY}`,
        { timeout: 60000 }
      );

      if (!reminiResponse.data?.status || !reminiResponse.data.data?.url) {
        throw new Error('La API no pudo mejorar la imagen.');
      }

      const enhancedImageUrl = reminiResponse.data.data.url;

      // 7) Enviar imagen mejorada
      await client.sendMessage(
        m.chat,
        {
          image: { url: enhancedImageUrl },
          caption: '✨ *Imagen mejorada con éxito*\n\n🤖 Procesado con IA Remini'
        },
        { quoted: m }
      );

      await client.sendMessage(m.chat, {
        react: { text: '✅', key: m.key }
      });

    } catch (err) {
      console.error('❌ Error en HD enhancer:', err);
      await client.sendMessage(m.chat, {
        react: { text: '❌', key: m.key }
      });

      let errorMsg = '❌ Error al mejorar la imagen.';

      if (err.code === 'ECONNABORTED') {
        errorMsg = '⏱️ Timeout: El proceso tardó demasiado. Intenta con una imagen más pequeña.';
      } else if (err.response?.status === 429) {
        errorMsg = '⚠️ Demasiadas solicitudes. Espera un momento e intenta de nuevo.';
      } else if (err.response?.status === 400) {
        errorMsg = '❌ Imagen no válida. Intenta con otra imagen.';
      } else if (err.message.includes('CDN')) {
        errorMsg = '❌ Error al subir la imagen. Intenta de nuevo.';
      } else if (err.message.includes('API')) {
        errorMsg = '❌ Error en el servicio de mejora. Intenta más tarde.';
      }

      m.reply(errorMsg);

    } finally {
      // Limpieza garantizada
      try {
        if (tmpFile && fs.existsSync(tmpFile)) {
          fs.unlinkSync(tmpFile);
        }
      } catch (cleanupErr) {
        console.error('Error limpiando archivo temporal:', cleanupErr);
      }
    }
  }
};