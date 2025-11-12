const axios = require('axios');
const fs = require('fs');
const path = require('path');

module.exports = {
  command: ["pexels", "imagen", "foto", "buscarimg"],
  description: "Busca y envía imágenes de alta calidad desde Pexels",
  category: "IA",
  
  async run(client, m, args) {
    try {
      const query = args.join(' ');

      if (!query) {
        return m.reply(`📸 *PEXELS IMAGE SEARCH*

💡 *Uso:* ${m.prefix}pexels <búsqueda>

📝 *Ejemplos:*
${m.prefix}pexels paisaje
${m.prefix}pexels gato
${m.prefix}pexels ciudad de noche
${m.prefix}pexels naturaleza

✨ *Características:*
• Imágenes de alta calidad
• Gratis y sin marca de agua
• Fotos profesionales
• Resultados en español

🔍 Busca cualquier imagen`);
      }

      await m.reply('🔍 Buscando imágenes en Pexels...');

      // IMPORTANTE: Agrega tu API Key de Pexels aquí
      // Obtén una gratis en: https://www.pexels.com/api/
      const PEXELS_API_KEY = '3V2w1l8TZLOmVj9QubgJOgfJBPK8F2Y0TRLRG2EuNA3qAzmATfXIymib'; // <-- CAMBIA ESTO

      // Búsqueda en Pexels
      const response = await axios.get(
        `https://api.pexels.com/v1/search`,
        {
          params: {
            query: query,
            per_page: 5, // Traer 5 resultados
            page: 1,
            locale: 'es-ES' // Búsqueda en español
          },
          headers: {
            'Authorization': PEXELS_API_KEY
          },
          timeout: 15000
        }
      );

      const photos = response.data.photos;

      if (!photos || photos.length === 0) {
        return m.reply(`❌ No se encontraron imágenes para: *${query}*\n\nIntenta con otra búsqueda.`);
      }

      // Seleccionar imagen aleatoria de los resultados
      const randomPhoto = photos[Math.floor(Math.random() * photos.length)];

      // Descargar la imagen (resolución grande)
      const imageUrl = randomPhoto.src.large; // Opciones: original, large2x, large, medium, small
      
      const imageResponse = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 30000
      });

      const tempDir = path.join(__dirname, 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const timestamp = Date.now();
      const imagePath = path.join(tempDir, `pexels_${timestamp}.jpg`);

      // Guardar imagen temporalmente
      fs.writeFileSync(imagePath, Buffer.from(imageResponse.data));

      // Preparar caption
      const caption = `📸 *Imagen de Pexels*

🔍 Búsqueda: ${query}
📷 Fotógrafo: ${randomPhoto.photographer}
🔗 Perfil: ${randomPhoto.photographer_url}
📐 Resolución: ${randomPhoto.width}x${randomPhoto.height}px

✨ Powered by Pexels`;

      // Enviar imagen
      await client.sendMessage(
        m.chat,
        {
          image: fs.readFileSync(imagePath),
          caption: caption
        },
        { quoted: m }
      );

      // Reacción de éxito
      await client.sendMessage(m.chat, {
        react: { text: '✅', key: m.key }
      });

      // Limpiar archivo temporal
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }

    } catch (err) {
      console.error('❌ Error en Pexels Search:', err);
      
      await client.sendMessage(m.chat, {
        react: { text: '❌', key: m.key }
      });

      let errorMsg = '❌ Error al buscar imágenes en Pexels.';

      if (err.response?.status === 401) {
        errorMsg = '🔑 *API Key inválida*\n\nObtén tu API Key gratis en:\nhttps://www.pexels.com/api/';
      } else if (err.response?.status === 429) {
        errorMsg = '⚠️ *Límite de solicitudes alcanzado*\n\nPexels permite:\n• 200 peticiones por hora en plan gratuito\n\nEspera un momento e intenta de nuevo.';
      } else if (err.code === 'ECONNABORTED') {
        errorMsg = '⏱️ Timeout: La solicitud tardó demasiado. Intenta de nuevo.';
      } else if (err.response?.status === 503) {
        errorMsg = '⚠️ Servicio de Pexels temporalmente no disponible.';
      }

      m.reply(errorMsg);
    }
  }
};
