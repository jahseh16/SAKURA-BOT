const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execPromise = promisify(exec);

module.exports = {
  command: ["mia", "voz", "habla", "iavoice"],
  description: "IA conversacional con respuesta de voz (Mia)",
  category: "IA",
  
  async run(client, m, args) {
    let mp3Path = null;
    let opusPath = null;

    try {
      const text = args.join(' ');

      if (!text) {
        return m.reply(`🎤 *MIA - IA CON VOZ*

💡 *Uso:* ${m.prefix}mia <tu pregunta>

📝 *Ejemplos:*
${m.prefix}mia ¿Qué es la inteligencia artificial?
${m.prefix}mia Cuéntame un chiste
${m.prefix}mia ¿Cómo está el clima hoy?
${m.prefix}mia Escribe un poema corto

✨ *Características:*
• Responde con texto Y audio
• Voz femenina natural (Mia)
• Hasta 700 caracteres
• IA conversacional

🎙️ Mia te responderá con su voz`);
      }

      // Simular que Mia está "grabando audio"
      await m.reply('💭 Mia está pensando...');
      await client.sendPresenceUpdate('recording', m.chat);

      // 1. Obtener respuesta de la IA de texto
      const aiResponse = await axios.get(
        `https://text.pollinations.ai/${encodeURIComponent(text)}`,
        {
          timeout: 30000,
          headers: {
            'User-Agent': 'Mozilla/5.0'
          }
        }
      );

      let aiText = aiResponse.data;

      // Limpiar respuesta (remover markdown excesivo, etc)
      aiText = aiText
        .replace(/\*\*/g, '')
        .replace(/\*/g, '')
        .replace(/```/g, '')
        .replace(/#{1,6}\s/g, '')
        .trim();

      if (!aiText) {
        throw new Error('La IA no generó una respuesta');
      }

      // 2. Limitar a 700 caracteres para el TTS
      let voiceText = aiText;
      if (aiText.length > 700) {
        // Cortar en 700 caracteres pero en la última oración completa
        voiceText = aiText.substring(0, 700);
        const lastPeriod = Math.max(
          voiceText.lastIndexOf('.'),
          voiceText.lastIndexOf('!'),
          voiceText.lastIndexOf('?')
        );
        if (lastPeriod > 500) {
          voiceText = voiceText.substring(0, lastPeriod + 1);
        }
      }

      // 3. Generar audio con StreamElements TTS
      // Mantener simulación de grabación de audio
      const voice = 'Mia'; // Voz en español México (femenina)
      const ttsUrl = `https://api.streamelements.com/kappa/v2/speech?voice=${voice}&text=${encodeURIComponent(voiceText)}`;

      const audioResponse = await axios.get(ttsUrl, {
        responseType: 'arraybuffer',
        headers: { 
          'User-Agent': 'Mozilla/5.0',
          'Accept': '*/*'
        },
        timeout: 30000
      });

      const timestamp = Date.now();
      const tempDir = path.join(__dirname, 'temp');
      
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      mp3Path = path.join(tempDir, `mia_${timestamp}.mp3`);
      opusPath = path.join(tempDir, `mia_${timestamp}.ogg`);

      // Guardar MP3
      fs.writeFileSync(mp3Path, Buffer.from(audioResponse.data));

      // 4. Convertir MP3 a Opus (formato WhatsApp)
      const ffmpegCmd = `ffmpeg -i "${mp3Path}" -vn -c:a libopus -b:a 64k -ar 48000 -ac 1 -f ogg "${opusPath}" -y`;
      
      await execPromise(ffmpegCmd);

      if (!fs.existsSync(opusPath)) {
        throw new Error('No se pudo convertir el audio');
      }

      const audioBuffer = fs.readFileSync(opusPath);

      // 5. Detener simulación de grabación y enviar nota de voz
      await client.sendPresenceUpdate('paused', m.chat);
      
      await client.sendMessage(
        m.chat,
        {
          audio: audioBuffer,
          mimetype: 'audio/ogg; codecs=opus',
          ptt: true,
          fileName: 'mia_voice.ogg'
        },
        { quoted: m }
      );

      await client.sendMessage(m.chat, {
        react: { text: '✅', key: m.key }
      });

    } catch (err) {
      console.error('❌ Error en Mia Voice AI:', err);
      
      await client.sendMessage(m.chat, {
        react: { text: '❌', key: m.key }
      });

      let errorMsg = '❌ Error al generar la respuesta con voz.';

      if (err.message.includes('ffmpeg')) {
        errorMsg = '🚫 FFmpeg no está instalado.\n\n*Instálalo con:*\n• Ubuntu/Debian: `sudo apt install ffmpeg`\n• macOS: `brew install ffmpeg`\n• Windows: Descarga desde ffmpeg.org';
      } else if (err.code === 'ECONNABORTED') {
        errorMsg = '⏱️ Timeout: La solicitud tardó demasiado. Intenta con una pregunta más corta.';
      } else if (err.response?.status === 429) {
        errorMsg = '⚠️ Demasiadas solicitudes. Espera un momento.';
      } else if (err.message.includes('IA no generó')) {
        errorMsg = '❌ La IA no pudo generar una respuesta. Intenta reformular tu pregunta.';
      } else if (err.response?.status === 503) {
        errorMsg = '⚠️ Servicio temporalmente no disponible. Intenta más tarde.';
      }

      m.reply(errorMsg);
      
    } finally {
      // Limpieza garantizada
      try {
        if (mp3Path && fs.existsSync(mp3Path)) fs.unlinkSync(mp3Path);
        if (opusPath && fs.existsSync(opusPath)) fs.unlinkSync(opusPath);
      } catch (cleanupErr) {
        console.error('Error limpiando archivos:', cleanupErr);
      }
    }
  }
};