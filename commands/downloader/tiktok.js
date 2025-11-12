const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const { promisify } = require("util");
const execPromise = promisify(exec);

module.exports = {
  command: ["tiktok", "tt", "ttdl"],
  description: "Descarga videos y slideshows de TikTok con audio",
  category: "downloader",
  
  run: async (client, m, args) => {
    let tempFiles = [];
    
    try {
      const url = args[0];
      const chatId = m.chat || m.key?.remoteJid || m.sender;

      if (!chatId) {
        return console.error("❌ No se pudo obtener el chatId.");
      }

      if (!url || (!url.includes("tiktok.com") && !url.includes("vt.tiktok.com"))) {
        return await client.sendMessage(
          chatId,
          {
            text: `❌ *Envía un enlace válido de TikTok*

💡 *Uso:* ${m.prefix}tiktok <url>

📝 *Ejemplo:*
${m.prefix}tiktok https://vm.tiktok.com/XXXXXX/
${m.prefix}tt https://vt.tiktok.com/XXXXX/
${m.prefix}tt https://www.tiktok.com/@user/video/123456

✨ *Soporta:*
• Videos normales
• Slideshows (fotos + audio)
• Sin marca de agua`
          },
          { quoted: m }
        );
      }

      // Limpiar y expandir la URL si es corta
      let finalUrl = url.trim();
      
      // Si es una URL corta de TikTok, expandirla primero
      if (finalUrl.includes('vm.tiktok.com') || finalUrl.includes('vt.tiktok.com')) {
        try {
          const expandResponse = await axios.get(finalUrl, {
            maxRedirects: 5,
            timeout: 10000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          });
          finalUrl = expandResponse.request.res.responseUrl || finalUrl;
        } catch (expandErr) {
          console.log('No se pudo expandir URL, usando original');
        }
      }

      await client.sendMessage(m.chat, {
        react: { text: '⏳', key: m.key }
      });

      await client.sendMessage(
        chatId,
        { text: "⏳ *Descargando contenido de TikTok...*" },
        { quoted: m }
      );

      // Intentar con múltiples APIs para mayor confiabilidad
      let tikData = null;
      let apiUsed = '';

      // API 1: TikWM
      try {
        const api1 = `https://tikwm.com/api/?url=${encodeURIComponent(finalUrl)}`;
        const response1 = await axios.get(api1, {
          timeout: 20000,
          headers: {
            'User-Agent': 'Mozilla/5.0'
          }
        });

        if (response1.data.code === 0 && response1.data.data) {
          tikData = response1.data.data;
          apiUsed = 'TikWM';
        }
      } catch (err1) {
        console.log('API TikWM falló, intentando alternativa...');
      }

      // API 2: Alternativa si TikWM falla
      if (!tikData) {
        try {
          const api2 = `https://api.tiklydown.eu.org/api/download?url=${encodeURIComponent(finalUrl)}`;
          const response2 = await axios.get(api2, {
            timeout: 20000,
            headers: {
              'User-Agent': 'Mozilla/5.0'
            }
          });

          if (response2.data && response2.data.video) {
            // Adaptar formato de respuesta
            tikData = {
              title: response2.data.title || 'TikTok Video',
              author: { nickname: response2.data.author?.nickname || 'Usuario' },
              play: response2.data.video?.noWatermark || response2.data.video?.watermark,
              music: response2.data.music?.play_url,
              images: response2.data.images || null,
              digg_count: 0,
              comment_count: 0,
              share_count: 0,
              play_count: 0
            };
            apiUsed = 'TiklyDown';
          }
        } catch (err2) {
          console.log('API TiklyDown también falló');
        }
      }

      if (!tikData) {
        throw new Error("No se pudo obtener el contenido de ninguna API. La URL puede ser inválida o el video está privado.");
      }
      const title = tikData.title || "Contenido de TikTok";
      const author = tikData.author?.nickname || tikData.author?.unique_id || "Desconocido";
      const likes = tikData.digg_count || 0;
      const comments = tikData.comment_count || 0;
      const shares = tikData.share_count || 0;
      const plays = tikData.play_count || 0;

      // Caption con información
      const caption = `✅ *TIKTOK DOWNLOADER*

👤 *Autor:* ${author}
📝 *Descripción:* ${title}

       📊 *Estadísticas:*
\`❤️ 𝐋𝐢𝐤𝐞𝐬\`: ${likes.toLocaleString()}
\`💬 𝐂𝐨𝐦𝐞𝐧𝐭𝐚𝐫𝐢𝐨𝐬\`: ${comments.toLocaleString()}
\`🔄 𝐂𝐨𝐦𝐩𝐚𝐫𝐭𝐢𝐝𝐨𝐬\`: ${shares.toLocaleString()}
\`▶️ 𝐑𝐞𝐩𝐫𝐨𝐝𝐮𝐜𝐜𝐢𝐨𝐧𝐞𝐬\`: ${plays.toLocaleString()}`;

      // Verificar si es un slideshow (múltiples imágenes)
      if (tikData.images && tikData.images.length > 0) {
        await client.sendMessage(
          chatId,
          { text: `📸 *Slideshow detectado con ${tikData.images.length} imágenes*\n\n🎬 Creando video con audio...` },
          { quoted: m }
        );

        // Crear directorio temporal
        const tempDir = path.join(__dirname, 'temp');
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }

        const timestamp = Date.now();

        // Descargar todas las imágenes
        for (let i = 0; i < tikData.images.length; i++) {
          const imageUrl = tikData.images[i];
          const imagePath = path.join(tempDir, `img_${timestamp}_${i}.jpg`);
          
          const imageResponse = await axios.get(imageUrl, {
            responseType: 'arraybuffer',
            timeout: 15000
          });
          
          fs.writeFileSync(imagePath, imageResponse.data);
          tempFiles.push(imagePath);
        }

        // Descargar audio
        const audioUrl = tikData.music || tikData.music_info?.play;
        const audioPath = path.join(tempDir, `audio_${timestamp}.mp3`);
        
        if (audioUrl) {
          const audioResponse = await axios.get(audioUrl, {
            responseType: 'arraybuffer',
            timeout: 15000
          });
          fs.writeFileSync(audioPath, audioResponse.data);
          tempFiles.push(audioPath);
        }

        // Crear lista de imágenes para FFmpeg (reducir duración)
        const listPath = path.join(tempDir, `list_${timestamp}.txt`);
        const listContent = tempFiles
          .filter(f => f.includes('img_'))
          .map(f => `file '${f}'\nduration 1.5`)
          .join('\n') + '\n' + `file '${tempFiles[tempFiles.length - 2]}'`; // Repetir última imagen

        fs.writeFileSync(listPath, listContent);
        tempFiles.push(listPath);

        // Crear video con FFmpeg
        const outputVideo = path.join(tempDir, `tiktok_${timestamp}.mp4`);
        tempFiles.push(outputVideo);

        let ffmpegCmd;
        if (audioUrl) {
          // Con audio - Optimizado para WhatsApp
          ffmpegCmd = `ffmpeg -f concat -safe 0 -i "${listPath}" -i "${audioPath}" -c:v libx264 -preset ultrafast -crf 28 -c:a aac -b:a 128k -shortest -pix_fmt yuv420p -vf "scale=720:1280:force_original_aspect_ratio=decrease,pad=720:1280:(ow-iw)/2:(oh-ih)/2" -movflags +faststart "${outputVideo}" -y`;
        } else {
          // Sin audio - Optimizado
          ffmpegCmd = `ffmpeg -f concat -safe 0 -i "${listPath}" -c:v libx264 -preset ultrafast -crf 28 -pix_fmt yuv420p -vf "scale=720:1280:force_original_aspect_ratio=decrease,pad=720:1280:(ow-iw)/2:(oh-ih)/2" -movflags +faststart "${outputVideo}" -y`;
        }

        await execPromise(ffmpegCmd);

        if (!fs.existsSync(outputVideo)) {
          throw new Error("No se pudo crear el video del slideshow");
        }

        // Enviar video con límite de tamaño
        const videoStats = fs.statSync(outputVideo);
        const videoSizeMB = videoStats.size / (1024 * 1024);

        if (videoSizeMB > 16) {
          throw new Error(`El video es muy pesado (${videoSizeMB.toFixed(1)}MB). WhatsApp solo acepta hasta 16MB.`);
        }

        await client.sendMessage(
          chatId,
          {
            video: fs.readFileSync(outputVideo),
            caption: caption + `\n\n📦 Tamaño: ${videoSizeMB.toFixed(1)}MB`,
            mimetype: 'video/mp4'
          },
          { quoted: m }
        );

      } else if (tikData.play) {
        // Es un video normal
        const videoUrl = tikData.hdplay || tikData.play;

        // Enviar video directamente
        await client.sendMessage(
          chatId,
          {
            video: { url: videoUrl },
            caption: caption,
            mimetype: 'video/mp4'
          },
          { quoted: m }
        );

      } else {
        throw new Error("No se encontró contenido para descargar.");
      }

      await client.sendMessage(m.chat, {
        react: { text: '✅', key: m.key }
      });

    } catch (err) {
      console.error("❌ Error TikTok:", err);
      
      await client.sendMessage(m.chat, {
        react: { text: '❌', key: m.key }
      });

      const chatId = m?.chat || m?.key?.remoteJid || m?.sender;
      
      let errorMsg = '❌ Error al descargar el contenido.';

      if (err.message.includes('ffmpeg')) {
        errorMsg = '🚫 FFmpeg no está instalado.\n\n*Instálalo con:*\n• Ubuntu/Debian: `sudo apt install ffmpeg`\n• macOS: `brew install ffmpeg`';
      } else if (err.code === 'ECONNABORTED') {
        errorMsg = '⏱️ Timeout: La descarga tardó demasiado.\n\n💡 Intenta de nuevo.';
      } else if (err.response?.status === 404) {
        errorMsg = '❌ Video no encontrado o eliminado.\n\n💡 Verifica que el enlace sea correcto.';
      } else if (err.response?.status === 429) {
        errorMsg = '⚠️ Demasiadas solicitudes. Espera un momento.';
      } else if (err.message.includes('contenido')) {
        errorMsg = '❌ El video puede estar privado o restringido.';
      }

      if (chatId) {
        await client.sendMessage(
          chatId,
          {
            text: `${errorMsg}\n\n🔍 *Detalles:* ${err.message || 'Error desconocido'}`
          },
          { quoted: m }
        );
      }
      
    } finally {
      // Limpieza de archivos temporales
      tempFiles.forEach(file => {
        try {
          if (fs.existsSync(file)) {
            fs.unlinkSync(file);
          }
        } catch (cleanupErr) {
          console.error('Error limpiando:', cleanupErr);
        }
      });
    }
  },
};