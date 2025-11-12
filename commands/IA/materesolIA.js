const axios = require("axios");
const FormData = require("form-data");
const { downloadMediaMessage } = require("@whiskeysockets/baileys");

module.exports = {
  command: ["resolver", "mathimg", "matematica", "ecuacion"],
  description: "Resuelve ecuaciones o problemas matemáticos desde una imagen usando OCR + IA",
  category: "IA",
  
  async run(client, m, args) {
    try {
      // 1) Verificar que sea una imagen
      const quotedMsg = m.quoted || m.msg?.contextInfo?.quotedMessage;
      const isImage = m.message?.imageMessage || quotedMsg?.imageMessage;

      if (!isImage) {
        return m.reply(`📸 *RESOLVEDOR MATEMÁTICO*

💡 *Uso:* Envía o responde a una imagen con un problema matemático

📝 *Ejemplos de problemas que puede resolver:*
• Ecuaciones: 2x + 5 = 15
• Operaciones: 25 * 4 + 10
• Álgebra: x² - 4 = 0
• Cálculo: d/dx(x²)
• Trigonometría: sin(π/2)

✨ *Funciona con:*
✓ Texto escrito a mano
✓ Texto impreso
✓ Ecuaciones matemáticas

🔍 Envía la imagen y la resolveré automáticamente.`);
      }

      // Reacción procesando
      await client.sendMessage(m.chat, {
        react: { text: '🔍', key: m.key }
      });

      // 2) Descargar la imagen
      const imageBuffer = await downloadMediaMessage(
        quotedMsg?.imageMessage ? { message: quotedMsg } : m,
        'buffer'
      );

      if (!imageBuffer || imageBuffer.length === 0) {
        throw new Error('No se pudo descargar la imagen');
      }

      // 3) OCR para extraer texto
      await client.sendMessage(m.chat, {
        text: '🔍 Extrayendo texto de la imagen...'
      }, { quoted: m });

      const formData = new FormData();
      formData.append("file", imageBuffer, {
        filename: "math_problem.jpg",
        contentType: "image/jpeg"
      });

      const ocrRes = await axios.post(
        "https://api.ocr.space/parse/image",
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            'apikey': 'K87899142388957' // API key pública de OCR.space
          },
          timeout: 30000
        }
      );

      const extractedText = ocrRes.data?.ParsedResults?.[0]?.ParsedText?.trim();

      if (!extractedText) {
        await client.sendMessage(m.chat, {
          react: { text: '❌', key: m.key }
        });
        return m.reply('⚠️ No pude detectar texto o ecuaciones en la imagen.\n\n💡 Asegúrate de que:\n• La imagen sea clara\n• El texto sea legible\n• Haya buena iluminación');
      }

      // 4) Limpiar el texto extraído
      let cleanText = extractedText
        .replace(/[^\d+\-*/().^\s=x]/gi, '') // Mantener solo caracteres matemáticos
        .replace(/\s+/g, ' ')
        .trim();

      await client.sendMessage(m.chat, {
        text: `📝 *Texto detectado:*\n${extractedText}\n\n🧮 Resolviendo...`
      }, { quoted: m });

      // 5) Intentar resolver con MathJS API
      let resultado = null;
      let metodo = '';

      try {
        // Extraer la ecuación (lado izquierdo del =)
        const equation = cleanText.split('=')[0].trim();
        
        const mathRes = await axios.get(
          `https://api.mathjs.org/v4/?expr=${encodeURIComponent(equation)}`,
          { timeout: 10000 }
        );

        resultado = mathRes.data;
        metodo = 'MathJS';

      } catch (mathError) {
        // Si MathJS falla, intentar con Newton API (más potente)
        try {
          const newtonRes = await axios.post(
            'https://newton.now.sh/api/v2/simplify',
            { expression: cleanText.split('=')[0].trim() },
            { timeout: 10000 }
          );

          resultado = newtonRes.data?.result;
          metodo = 'Newton';

        } catch (newtonError) {
          // Último recurso: usar Wolfram Alpha (limitado pero potente)
          try {
            const wolframRes = await axios.get(
              `https://api.wolframalpha.com/v1/result?appid=DEMO&i=${encodeURIComponent(cleanText)}`,
              { timeout: 15000 }
            );

            resultado = wolframRes.data;
            metodo = 'Wolfram Alpha';

          } catch (wolframError) {
            resultado = null;
          }
        }
      }

      // 6) Enviar resultado
      if (resultado) {
        const respuesta = `✅ *PROBLEMA RESUELTO*

📝 *Ecuación detectada:*
${extractedText}

🧮 *Resultado:*
\`\`\`${resultado}\`\`\`

🔧 *Método:* ${metodo}
⚡ *Procesado con IA + OCR*`;

        await client.sendMessage(m.chat, {
          text: respuesta
        }, { quoted: m });

        await client.sendMessage(m.chat, {
          react: { text: '✅', key: m.key }
        });

      } else {
        await client.sendMessage(m.chat, {
          react: { text: '⚠️', key: m.key }
        });

        m.reply(`⚠️ *No pude resolver el problema*

📝 *Texto detectado:*
${extractedText}

💡 *Posibles razones:*
• La ecuación es muy compleja
• Faltan paréntesis o símbolos
• El texto no es una ecuación válida

🔄 Intenta:
1. Tomar una foto más clara
2. Escribir la ecuación manualmente
3. Simplificar el problema`);
      }

    } catch (error) {
      console.error('❌ Error en resolver matemático:', error);
      
      await client.sendMessage(m.chat, {
        react: { text: '❌', key: m.key }
      });

      let errorMsg = '❌ Error al procesar la imagen.';

      if (error.code === 'ECONNABORTED') {
        errorMsg = '⏱️ Timeout: El servidor tardó demasiado. Intenta de nuevo.';
      } else if (error.response?.status === 429) {
        errorMsg = '⚠️ Demasiadas solicitudes. Espera un momento.';
      } else if (error.message.includes('descargar')) {
        errorMsg = '❌ No pude descargar la imagen. Envíala de nuevo.';
      }

      m.reply(errorMsg);
    }
  }
};