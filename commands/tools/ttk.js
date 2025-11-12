const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execPromise = promisify(exec);

module.exports = {
  command: ["ttk", "tiktok", "voztiktok"],
  description: "Voces de TikTok",
  category: "tools",
  run: async (client, m, args) => {
    let mp3Path = null;
    let opusPath = null;

    try {
      const voices = {
        "chica": "es_mx_female-1",
        "chico": "es_mx_male-1", 
        "robot": "en_us_ghostface",
        "stitch": "en_us_stitch",
        "stormtrooper": "en_us_stormtrooper",
        "chewbacca": "en_us_chewbacca",
        "c3po": "en_us_c3po",
        "rocket": "en_us_rocket"
      };

      if (!args[0]) {
        const list = Object.keys(voices)
          .map((v, i) => `${i + 1}. *${v}*`)
          .join('\n');
        
        return m.reply(`🎵 *VOCES DE TIKTOK*

${list}

💡 *Uso:* ${m.prefix}ttk <voz> <texto>
📝 *Ejemplo:* ${m.prefix}ttk chica Hola TikTok`);
      }

      const voiceKey = args[0].toLowerCase();
      const text = args.slice(1).join(' ');

      if (!text) return m.reply('❌ Escribe el texto.');
      if (!voices[voiceKey]) return m.reply('❌ Voz no válida.');
      if (text.length > 200) return m.reply('❌ Máximo 200 caracteres.');

      await m.reply('⏳ Generando audio TikTok...');

      // Llamar a la API de TikTok TTS
      const response = await axios.post(
        'https://tiktok-tts.weilnet.workers.dev/api/generation',
        {
          text: text,
          voice: voices[voiceKey]
        },
        {
          timeout: 15000,
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0'
          }
        }
      );

      if (!response.data.success || !response.data.data) {
        return m.reply('❌ La API de TikTok no devolvió audio.');
      }

      // Decodificar el audio base64
      const audioBuffer = Buffer.from(response.data.data, 'base64');

      const timestamp = Date.now();
      const tempDir = path.join(__dirname, 'temp');
      
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      mp3Path = path.join(tempDir, `tiktok_${timestamp}.mp3`);
      opusPath = path.join(tempDir, `tiktok_${timestamp}.ogg`);

      // Guardar MP3 temporal
      fs.writeFileSync(mp3Path, audioBuffer);

      // Convertir MP3 a Opus (formato WhatsApp)
      const ffmpegCmd = `ffmpeg -i "${mp3Path}" -vn -c:a libopus -b:a 64k -ar 48000 -ac 1 -f ogg "${opusPath}" -y`;
      
      await execPromise(ffmpegCmd);

      if (!fs.existsSync(opusPath)) {
        throw new Error('No se pudo convertir el audio a Opus');
      }

      // Leer el archivo Opus convertido
      const opusBuffer = fs.readFileSync(opusPath);

      // Enviar como nota de voz
      await client.sendMessage(
        m.chat,
        {
          audio: opusBuffer,
          mimetype: 'audio/ogg; codecs=opus',
          ptt: true,
          fileName: `tiktok_${voiceKey}.ogg`
        },
        { quoted: m }
      );

    } catch (err) {
      console.error('❌ Error TikTok TTS:', err);
      
      let errorMsg = '❌ Error al generar el audio.';
      
      if (err.message.includes('ffmpeg')) {
        errorMsg = '🚫 FFmpeg no instalado. Instálalo:\n\n• Ubuntu/Debian: `sudo apt install ffmpeg`\n• macOS: `brew install ffmpeg`';
      } else if (err.code === 'ECONNABORTED') {
        errorMsg = '⏱️ Timeout: La API de TikTok tardó demasiado.';
      } else if (err.response?.status === 429) {
        errorMsg = '⚠️ Demasiadas solicitudes. Espera un momento.';
      } else if (err.response?.status) {
        errorMsg = `❌ Error ${err.response.status}: ${err.response.statusText}`;
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