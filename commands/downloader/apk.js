const axios = require('axios');

module.exports = {
  command: ["apk", "app", "playstore"],
  description: "Descargar APKs de Google Play Store",
  category: "downloader",
  run: async (client, m, args) => {
    try {
      const text = args.join(' ');

      if (!text) {
        return m.reply(`⚠️ *Uso incorrecto.*

💡 *Uso:* ${m.prefix}apk <nombre de la app>
📝 *Ejemplo:* ${m.prefix}apk whatsapp`);
      }

      // ✅ Reacción de carga
      await client.sendMessage(m.chat, { react: { text: "⏳", key: m.key } });

      const apiUrl = `https://api.neoxr.eu/api/apk?q=${encodeURIComponent(text)}&no=1&apikey=russellxz`;
      const response = await axios.get(apiUrl, {
        timeout: 30000,
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });

      if (!response.data.status || !response.data.data || !response.data.file?.url) {
        await client.sendMessage(m.chat, { react: { text: "❌", key: m.key } });
        return m.reply('❌ No se encontró la aplicación. Intenta con otro nombre.');
      }

      const apkInfo = response.data.data;
      const apkFile = response.data.file;

      const caption = `📱 *INFORMACIÓN DEL APK*

• *Nombre:* ${apkInfo.name}
• *Tamaño:* ${apkInfo.size}
• *Rating:* ${apkInfo.rating}
• *Instalaciones:* ${apkInfo.installs}
• *Desarrollador:* ${apkInfo.developer}
• *Categoría:* ${apkInfo.category}
• *Versión:* ${apkInfo.version}
• *Actualizado:* ${apkInfo.updated}
• *Requisitos:* ${apkInfo.requirements}
• *ID:* ${apkInfo.id}

⏬ *Descargando archivo...*`;

      // Enviar información con imagen
      await client.sendMessage(
        m.chat,
        {
          image: { url: apkInfo.thumbnail },
          caption
        },
        { quoted: m }
      );

      // Descargar el APK
      const fileResponse = await axios.get(apkFile.url, {
        responseType: 'arraybuffer',
        timeout: 60000,
        maxContentLength: 100 * 1024 * 1024, // 100MB máximo
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });

      const fileBuffer = Buffer.from(fileResponse.data);

      // Enviar el APK como documento
      await client.sendMessage(
        m.chat,
        {
          document: fileBuffer,
          mimetype: 'application/vnd.android.package-archive',
          fileName: apkFile.filename || `${apkInfo.name.replace(/[^a-zA-Z0-9]/g, '_')}.apk`
        },
        { quoted: m }
      );

      // ✅ Reacción final exitosa
      await client.sendMessage(m.chat, { react: { text: "✅", key: m.key } });

    } catch (err) {
      console.error('❌ Error en APK downloader:', err);
      await client.sendMessage(m.chat, { react: { text: "❌", key: m.key } });

      let errorMsg = '❌ Error al descargar el APK.';

      if (err.code === 'ECONNABORTED') {
        errorMsg = '⏱️ Timeout: El archivo es muy pesado o la conexión es lenta.';
      } else if (err.response?.status === 404) {
        errorMsg = '❌ Aplicación no encontrada. Verifica el nombre.';
      } else if (err.response?.status === 429) {
        errorMsg = '⚠️ Demasiadas solicitudes. Espera un momento e intenta de nuevo.';
      } else if (err.message.includes('maxContentLength')) {
        errorMsg = '❌ El archivo es demasiado grande (máx 100MB).';
      }

      m.reply(errorMsg);
    }
  }
};
