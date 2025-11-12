const axios = require('axios');

module.exports = {
  command: ["osint", "buscar", "investigar", "whois"],
  description: "Busca información pública de un número de teléfono en redes sociales",
  category: "tools",
  
  async run(client, m, args) {
    try {
      if (!args[0]) {
        return m.reply(`🔍 *BÚSQUEDA OSINT*

💡 *Uso:* ${m.prefix}osint <número>

📝 *Ejemplos:*
${m.prefix}osint +51987654321
${m.prefix}osint 987654321
${m.prefix}osint 51987654321

⚠️ *Importante:*
• Solo muestra información pública
• Respeta la privacidad
• Para investigación legítima
• Incluye código de país (+51 para Perú)

🔎 *Busca en:*
✓ Facebook
✓ Instagram  
✓ WhatsApp
✓ Twitter
✓ LinkedIn
✓ TikTok
✓ Telegram
✓ Base de datos públicas`);
      }

      await client.sendMessage(m.chat, {
        react: { text: '🔍', key: m.key }
      });

      // Limpiar el número
      let phoneNumber = args[0].replace(/[^0-9+]/g, '');
      
      // Agregar + si no lo tiene
      if (!phoneNumber.startsWith('+')) {
        // Si comienza con 51 (Perú) agregar +
        if (phoneNumber.startsWith('51')) {
          phoneNumber = '+' + phoneNumber;
        } else if (phoneNumber.length === 9) {
          // Si es número local peruano
          phoneNumber = '+51' + phoneNumber;
        } else {
          phoneNumber = '+' + phoneNumber;
        }
      }

      await m.reply(`🔎 *Buscando información de:*\n${phoneNumber}\n\n⏳ Esto puede tardar unos segundos...`);

      // Resultado consolidado
      let resultado = `📱 *REPORTE OSINT*\n━━━━━━━━━━━━━━━━\n\n📞 *Número:* ${phoneNumber}\n\n`;

      // 1. API de Numverify (Validación básica)
      try {
        const numverifyRes = await axios.get(
          `http://apilayer.net/api/validate?access_key=YOUR_FREE_KEY&number=${phoneNumber}&format=1`,
          { timeout: 10000 }
        );

        if (numverifyRes.data?.valid) {
          resultado += `✅ *Número válido*\n`;
          resultado += `🌍 *País:* ${numverifyRes.data.country_name || 'N/A'}\n`;
          resultado += `📡 *Operador:* ${numverifyRes.data.carrier || 'N/A'}\n`;
          resultado += `📍 *Ubicación:* ${numverifyRes.data.location || 'N/A'}\n`;
          resultado += `📱 *Tipo:* ${numverifyRes.data.line_type || 'N/A'}\n\n`;
        }
      } catch (err) {
        console.log('Numverify API failed:', err.message);
      }

      // 2. Búsqueda en redes sociales con API pública
      try {
        // API alternativa que busca en múltiples redes
        const socialRes = await axios.get(
          `https://api.truecaller.com/v1/search?q=${encodeURIComponent(phoneNumber)}&type=4`,
          { 
            timeout: 15000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          }
        );

        if (socialRes.data?.data?.[0]) {
          const data = socialRes.data.data[0];
          resultado += `👤 *Información encontrada:*\n`;
          resultado += `📝 *Nombre:* ${data.name || 'No disponible'}\n`;
          if (data.internetAddresses) {
            resultado += `\n🌐 *Redes sociales:*\n`;
            data.internetAddresses.forEach(addr => {
              resultado += `• ${addr.service}: ${addr.id}\n`;
            });
          }
        }
      } catch (err) {
        console.log('Social search failed:', err.message);
      }

      // 3. Generar enlaces de búsqueda manual
      resultado += `\n🔗 *Búsqueda manual en:*\n\n`;
      
      // Facebook
      const fbSearch = `https://www.facebook.com/search/top/?q=${encodeURIComponent(phoneNumber)}`;
      resultado += `• Facebook:\n${fbSearch}\n\n`;
      
      // WhatsApp (verificar si tiene WhatsApp)
      resultado += `• WhatsApp:\nwa.me/${phoneNumber.replace('+', '')}\n\n`;
      
      // Instagram
      const igSearch = `https://www.instagram.com/accounts/login/?next=/search/topsearch/?query=${encodeURIComponent(phoneNumber)}`;
      resultado += `• Instagram:\n${igSearch}\n\n`;
      
      // Twitter/X
      const twitterSearch = `https://twitter.com/search?q=${encodeURIComponent(phoneNumber)}`;
      resultado += `• Twitter/X:\n${twitterSearch}\n\n`;
      
      // LinkedIn
      const linkedinSearch = `https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(phoneNumber)}`;
      resultado += `• LinkedIn:\n${linkedinSearch}\n\n`;
      
      // TikTok
      const tiktokSearch = `https://www.tiktok.com/search?q=${encodeURIComponent(phoneNumber)}`;
      resultado += `• TikTok:\n${tiktokSearch}\n\n`;

      // 4. Bases de datos públicas
      resultado += `📚 *Bases de datos públicas:*\n\n`;
      resultado += `• Truecaller:\nhttps://www.truecaller.com/search/${phoneNumber.replace(/[^0-9]/g, '')}\n\n`;
      resultado += `• Sync.me:\nhttps://sync.me/#/search/number/${phoneNumber.replace(/[^0-9]/g, '')}\n\n`;

      // 5. Información adicional
      resultado += `\n━━━━━━━━━━━━━━━━\n`;
      resultado += `⚠️ *Nota importante:*\n`;
      resultado += `• Solo se muestra info pública\n`;
      resultado += `• Usa los enlaces para búsqueda manual\n`;
      resultado += `• Respeta la privacidad de las personas\n`;
      resultado += `• Para uso legítimo solamente\n\n`;
      resultado += `🔒 *Privacidad:* Esta búsqueda no almacena datos`;

      await m.reply(resultado);

      await client.sendMessage(m.chat, {
        react: { text: '✅', key: m.key }
      });

    } catch (err) {
      console.error('❌ Error en OSINT:', err.message);
      await client.sendMessage(m.chat, {
        react: { text: '❌', key: m.key }
      });

      let errorMsg = '❌ Error al buscar información.';

      if (err.code === 'ECONNABORTED') {
        errorMsg = '⏱️ Timeout: La búsqueda tardó demasiado. Intenta de nuevo.';
      } else if (err.response?.status === 429) {
        errorMsg = '⚠️ Demasiadas solicitudes. Espera un momento.';
      } else if (err.message.includes('invalid')) {
        errorMsg = '❌ Número inválido. Verifica el formato.\n\nEjemplo: +51987654321';
      }

      m.reply(errorMsg);
    }
  }
};