const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execPromise = promisify(exec);

module.exports = {
  command: ["tts", "voz", "hablar"],
  description: "Texto a voz con múltiples voces (StreamElements TTS)",
  category: "tools",
  run: async (client, m, args) => {
    let mp3Path = null;
    let opusPath = null;

    try {
      const voices = {
        // Voces en Español
        "miguel": { voice: "Miguel", desc: "Español (Hombre)" },
        "lucia": { voice: "Lucia", desc: "Español (Mujer)" },
        "mia": { voice: "Mia", desc: "Español México (Mujer)" },
        // Voces en Inglés
        "brian": { voice: "Brian", desc: "Inglés Reino Unido (Hombre)" },
        "emma": { voice: "Emma", desc: "Inglés EE.UU. (Mujer)" },
        "joey": { voice: "Joey", desc: "Inglés EE.UU. (Hombre joven)" },
        "justin": { voice: "Justin", desc: "Inglés EE.UU. (Hombre)" },
        "matthew": { voice: "Matthew", desc: "Inglés EE.UU. (Hombre maduro)" },
        // Otros idiomas
        "celine": { voice: "Celine", desc: "Francés (Mujer)" },
        "hans": { voice: "Hans", desc: "Alemán (Hombre)" },
        "giorgio": { voice: "Giorgio", desc: "Italiano (Hombre)" },
        "mizuki": { voice: "Mizuki", desc: "Japonés (Mujer)" }
      };

      // Si no hay argumentos, mostrar lista de voces
      if (!args[0]) {
        const list = Object.entries(voices)
          .map(([k, v]) => `🎙️ *${k}* → ${v.desc}`)
          .join('\n');
        return m.reply(`🎧 *TEXTO A VOZ (StreamElements)*

Usa el comando:
> ${m.prefix}tts <voz> <texto>

🗣️ *Voces disponibles:*
${list}

📌 Ejemplo:
${m.prefix}tts lucia Hola, soy Lucía.`);
      }

      const voiceKey = args[0].toLowerCase();
      const text = args.slice(1).join(' ');

      if (!voices[voiceKey]) {
        return m.reply(`❌ Voz no válida. Usa *${m.prefix}tts* para ver las disponibles.`);
      }
      if (!text) return m.reply('❌ Escribe un texto después de la voz.');
      if (text.length > 300) return m.reply('⚠️ El texto no puede superar los 300 caracteres.');

      await m.reply(`🎤 *Generando audio con la voz:* ${voiceKey.toUpperCase()}...`);

      const voice = voices[voiceKey].voice;
      const apiUrl = `https://api.streamelements.com/kappa/v2/speech?voice=${voice}&text=${encodeURIComponent(text)}`;

      // Descargar el audio como MP3
      const res = await axios.get(apiUrl, {
        responseType: 'arraybuffer',
        headers: { 
          'User-Agent': 'Mozilla/5.0',
          'Accept': '*/*'
        },
        timeout: 15000
      });

      const timestamp = Date.now();
      const tempDir = path.join(__dirname, 'temp');
      
      // Crear directorio temporal si no existe
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      mp3Path = path.join(tempDir, `tts_${timestamp}.mp3`);
      opusPath = path.join(tempDir, `tts_${timestamp}.ogg`);

      // Guardar MP3
      fs.writeFileSync(mp3Path, Buffer.from(res.data));

      // Convertir a Opus con parámetros optimizados para WhatsApp
      const ffmpegCmd = `ffmpeg -i "${mp3Path}" -vn -c:a libopus -b:a 64k -ar 48000 -ac 1 -f ogg "${opusPath}" -y`;
      
      await execPromise(ffmpegCmd);

      // Verificar que el archivo Opus se creó correctamente
      if (!fs.existsSync(opusPath)) {
        throw new Error('No se pudo generar el archivo de audio');
      }

      const audioBuffer = fs.readFileSync(opusPath);

      // Enviar como nota de voz con formato correcto para WhatsApp
      await client.sendMessage(
        m.chat,
        {
          audio: audioBuffer,
          mimetype: 'audio/ogg; codecs=opus',
          ptt: true,
          fileName: `tts_${voiceKey}.ogg`
        },
        { quoted: m }
      );

    } catch (err) {
      console.error('❌ Error TTS completo:', err);
      
      let errorMsg = '🚫 Error al generar el audio.';
      
      if (err.message.includes('ffmpeg')) {
        errorMsg = '🚫 FFmpeg no está instalado. Instálalo con:\n\n• Ubuntu/Debian: `sudo apt install ffmpeg`\n• macOS: `brew install ffmpeg`\n• Windows: Descarga desde ffmpeg.org';
      } else if (err.code === 'ECONNABORTED') {
        errorMsg = '⏱️ Timeout: El servidor tardó demasiado en responder.';
      } else if (err.response?.status === 429) {
        errorMsg = '⚠️ Demasiadas solicitudes. Espera un momento.';
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