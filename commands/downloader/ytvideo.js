const axios = require('axios');

module.exports = {
  command: ["yt", "ytdl", "youtube"],
  description: "Descarga videos de YouTube",
  category: "downloader",
  
  run: async (client, m, args) => {
    try {
      console.log('✅ Comando YT ejecutado');
      
      if (!args[0]) {
        return m.reply(`📺 *YOUTUBE DOWNLOADER*

💡 *Uso:* ${m.prefix}yt <url>

📝 *Ejemplo:*
${m.prefix}yt https://youtu.be/dQw4w9WgXcQ
${m.prefix}yt https://youtube.com/shorts/abc123`);
      }

      // Limpiar URL (evitar duplicaciones)
      let url = args[0].trim();
      
      // Si la URL está duplicada, tomar solo la primera parte
      if (url.includes('http') && url.lastIndexOf('http') > 0) {
        url = url.substring(0, url.lastIndexOf('http'));
      }
      
      console.log('URL limpia:', url);

      if (!url.includes("youtube.com") && !url.includes("youtu.be")) {
        return m.reply('❌ Envía un enlace válido de YouTube');
      }

      await m.reply('⏳ Descargando video de YouTube...');

      let videoData = null;
      let apiUsed = '';

      // ============================================
      // API 1: YTDLnis (Nueva, más confiable)
      // ============================================
      try {
        console.log('Intentando con API YTDLnis...');
        
        const ytdlnisUrl = `https://ytdlnis.com/api/download?url=${encodeURIComponent(url)}`;
        
        const response1 = await axios.get(ytdlnisUrl, {
          timeout: 30000,
          headers: {
            'User-Agent': 'Mozilla/5.0'
          }
        });

        console.log('Respuesta YTDLnis:', response1.data);

        if (response1.data && response1.data.url) {
          videoData = {
            title: response1.data.title || 'Video de YouTube',
            url: response1.data.url,
            thumbnail: response1.data.thumbnail
          };
          apiUsed = 'YTDLnis';
        }
      } catch (err1) {
        console.log('YTDLnis falló:', err1.message);
      }

      // ============================================
      // API 2: Y2Mate (Fallback 1)
      // ============================================
      if (!videoData) {
        try {
          console.log('Intentando con API Y2Mate...');
          
          const y2mateUrl = `https://api-cdn.y2mate.com/api/json/convert?url=${encodeURIComponent(url)}`;
          
          const response2 = await axios.get(y2mateUrl, {
            timeout: 30000,
            headers: {
              'User-Agent': 'Mozilla/5.0'
            }
          });

          console.log('Respuesta Y2Mate:', response2.data);

          if (response2.data && response2.data.url) {
            videoData = {
              title: response2.data.title || 'Video de YouTube',
              url: response2.data.url,
              thumbnail: response2.data.thumbnail
            };
            apiUsed = 'Y2Mate';
          }
        } catch (err2) {
          console.log('Y2Mate falló:', err2.message);
        }
      }

      // ============================================
      // API 3: Cobalt Tools (Fallback 2 - Más potente)
      // ============================================
      if (!videoData) {
        try {
          console.log('Intentando con API Cobalt...');
          
          const cobaltResponse = await axios.post(
            'https://api.cobalt.tools/api/json',
            {
              url: url,
              vQuality: "720",
              filenamePattern: "basic",
              isAudioOnly: false
            },
            {
              timeout: 45000,
              headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0'
              }
            }
          );

          console.log('Respuesta Cobalt:', cobaltResponse.data);

          if (cobaltResponse.data && cobaltResponse.data.status === 'redirect') {
            videoData = {
              title: 'Video de YouTube',
              url: cobaltResponse.data.url,
              thumbnail: null
            };
            apiUsed = 'Cobalt';
          } else if (cobaltResponse.data && cobaltResponse.data.status === 'picker') {
            videoData = {
              title: 'Video de YouTube',
              url: cobaltResponse.data.picker?.[0]?.url,
              thumbnail: cobaltResponse.data.picker?.[0]?.thumb
            };
            apiUsed = 'Cobalt';
          }
        } catch (err3) {
          console.log('Cobalt falló:', err3.message);
        }
      }

      // ============================================
      // Verificar que se obtuvo el video
      // ============================================
      if (!videoData || !videoData.url) {
        return m.reply(`❌ No se pudo descargar el video.

💡 *Posibles causas:*
• El video es muy largo
• Video privado o restringido
• APIs temporalmente caídas

🔄 *Intenta:*
• Más tarde
• Con otro video
• Usar el enlace completo (no acortado)`);
      }

      // ============================================
      // Enviar video
      // ============================================
      await client.sendMessage(
        m.chat,
        {
          video: { url: videoData.url },
          caption: `✅ *${videoData.title}*\n\n🔧 API: ${apiUsed}`,
          mimetype: 'video/mp4'
        },
        { quoted: m }
      );

      console.log('✅ Video enviado correctamente');

    } catch (err) {
      console.error('❌ Error completo:', err);
      m.reply(`❌ Error al descargar: ${err.message}\n\n💡 Intenta de nuevo o con otro video`);
    }
  }
};