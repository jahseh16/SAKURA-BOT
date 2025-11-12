const axios = require('axios');

module.exports = {
  command: ["spotify", "spotifydl", "music", "musica"],
  description: "Busca y descarga música de Spotify",
  category: "downloader",
  
  async run(client, m, args) {
    try {
      if (!args[0]) {
        const ejemplos = [
          'Adele Hello', 
          'Sia Unstoppable', 
          'Maroon 5 Memories', 
          'Karol G Provenza', 
          'Natalia Jiménez Creo en mí',
          'Bad Bunny Tití Me Preguntó',
          'Taylor Swift Shake It Off'
        ];
        const random = ejemplos[Math.floor(Math.random() * ejemplos.length)];
        
        return m.reply(`🎵 *SPOTIFY DOWNLOADER*

💡 *Uso:* ${m.prefix}spotify <artista> <canción>

📝 *Ejemplos:*
${m.prefix}spotify ${random}
${m.prefix}music Coldplay Viva la Vida
${m.prefix}musica Shakira Waka Waka

✨ Busca y descarga música de Spotify en alta calidad`);
      }

      await client.sendMessage(m.chat, {
        react: { text: '🔍', key: m.key }
      });

      const query = encodeURIComponent(args.join(' '));
      const searchUrl = `https://api.delirius.store/search/spotify?q=${query}`;

      // Buscar la canción
      const searchResponse = await axios.get(searchUrl, {
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0'
        }
      });

      const json = searchResponse.data;

      if (!json.status || !json.data || json.data.length === 0) {
        await client.sendMessage(m.chat, {
          react: { text: '❌', key: m.key }
        });
        return m.reply('❌ No encontré la canción que estás buscando.\n\n💡 Intenta con:\n• Nombre del artista + canción\n• Verifica la ortografía\n• Usa el nombre en inglés si es conocida así');
      }

      const track = json.data[0];

      if (!track || !track.url) {
        await client.sendMessage(m.chat, {
          react: { text: '❌', key: m.key }
        });
        return m.reply('⚠️ Resultado inválido de la API. Intenta de nuevo.');
      }

      await client.sendMessage(m.chat, {
        react: { text: '⏬', key: m.key }
      });

      await m.reply(`🎵 *Canción encontrada*\n\n🎤 ${track.title}\n👤 ${track.artist}\n\n⏳ Descargando...`);

      // Descargar la canción
      const downloadUrl = `https://api.delirius.store/download/spotifydl?url=${encodeURIComponent(track.url)}`;
      
      const downloadResponse = await axios.get(downloadUrl, {
        timeout: 60000,
        headers: {
          'User-Agent': 'Mozilla/5.0'
        }
      });

      const dlData = downloadResponse.data;
      const audioUrl = dlData?.data?.url;

      if (!audioUrl || audioUrl.includes('undefined')) {
        await client.sendMessage(m.chat, {
          react: { text: '❌', key: m.key }
        });
        return m.reply('⚠️ Error al obtener el enlace de descarga.\n\n💡 La canción puede no estar disponible o el servicio está temporalmente caído.');
      }

      // Crear caption con información
      const caption = `╔═══════════════╗
║  🎵 *SPOTIFY MUSIC*
╠═══════════════╣
║ 🎤 *Título:* ${track.title}
║ 👤 *Artista:* ${track.artist}
║ 💿 *Álbum:* ${track.album || 'N/A'}
║ ⏱️ *Duración:* ${track.duration || 'N/A'}
║ 📊 *Popularidad:* ${track.popularity || 'N/A'}
║ 📅 *Publicado:* ${track.publish || 'N/A'}
║ 🔗 *Link:* ${track.url}
╚═══════════════╝

⏬ Descargando audio...`;

      // Enviar imagen con información
      await client.sendMessage(
        m.chat,
        {
          image: { url: track.image },
          caption
        },
        { quoted: m }
      );

      // Enviar audio
      await client.sendMessage(
        m.chat,
        {
          audio: { url: audioUrl },
          mimetype: 'audio/mpeg',
          fileName: `${track.title} - ${track.artist}.mp3`
        },
        { quoted: m }
      );

      await client.sendMessage(m.chat, {
        react: { text: '✅', key: m.key }
      });

    } catch (err) {
      console.error('❌ Error en Spotify downloader:', err);
      
      await client.sendMessage(m.chat, {
        react: { text: '❌', key: m.key }
      });

      let errorMsg = '❌ Error al buscar o descargar la canción.';

      if (err.code === 'ECONNABORTED') {
        errorMsg = '⏱️ Timeout: La descarga tardó demasiado.\n\n💡 Intenta de nuevo o con otra canción.';
      } else if (err.response?.status === 404) {
        errorMsg = '❌ Canción no encontrada en Spotify.\n\n💡 Verifica el nombre del artista y canción.';
      } else if (err.response?.status === 429) {
        errorMsg = '⚠️ Demasiadas solicitudes. Espera un momento e intenta de nuevo.';
      } else if (err.response?.status === 503) {
        errorMsg = '⚠️ El servicio de Spotify está temporalmente no disponible.\n\n🔄 Intenta más tarde.';
      } else if (err.message.includes('audio')) {
        errorMsg = '❌ No se pudo descargar el audio.\n\n💡 La canción puede estar protegida o no disponible.';
      }

      m.reply(errorMsg);
    }
  }
};