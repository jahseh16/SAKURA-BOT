const axios = require('axios');

module.exports = {
  command: ["edad", "predecir", "prediccion", "nombre"],
  description: "Predice edad, género y nacionalidad basado en un nombre",
  category: "juegos",
  
  async run(client, m, args) {
    try {
      const name = args[0];

      if (!name) {
        return m.reply(`👤 *PREDICTOR DE DATOS*

💡 *Uso:* ${m.prefix}edad <nombre>

📝 *Ejemplos:*
${m.prefix}edad Carlos
${m.prefix}edad Maria
${m.prefix}edad Michael
${m.prefix}edad Sofia

✨ *Predice:*
• Edad estimada
• Género probable
• Nacionalidad más común

🔮 Escribe un nombre para predecir`);
      }

      await m.reply('🔮 Analizando el nombre...');

      // Llamadas paralelas a las 3 APIs
      const [ageData, genderData, nationalityData] = await Promise.all([
        axios.get(`https://api.agify.io?name=${encodeURIComponent(name)}`).then(r => r.data),
        axios.get(`https://api.genderize.io?name=${encodeURIComponent(name)}`).then(r => r.data),
        axios.get(`https://api.nationalize.io?name=${encodeURIComponent(name)}`).then(r => r.data)
      ]);

      // Verificar si hay datos
      if (!ageData.age && !genderData.gender) {
        return m.reply(`❌ No se encontraron predicciones para el nombre: *${name}*\n\nIntenta con otro nombre más común.`);
      }

      // Mapear códigos de país a nombres (top países)
      const countryNames = {
        'US': 'Estados Unidos 🇺🇸',
        'MX': 'México 🇲🇽',
        'ES': 'España 🇪🇸',
        'AR': 'Argentina 🇦🇷',
        'CO': 'Colombia 🇨🇴',
        'CL': 'Chile 🇨🇱',
        'PE': 'Perú 🇵🇪',
        'VE': 'Venezuela 🇻🇪',
        'EC': 'Ecuador 🇪🇨',
        'BR': 'Brasil 🇧🇷',
        'GB': 'Reino Unido 🇬🇧',
        'FR': 'Francia 🇫🇷',
        'DE': 'Alemania 🇩🇪',
        'IT': 'Italia 🇮🇹',
        'PT': 'Portugal 🇵🇹',
        'RU': 'Rusia 🇷🇺',
        'CN': 'China 🇨🇳',
        'JP': 'Japón 🇯🇵',
        'KR': 'Corea del Sur 🇰🇷',
        'IN': 'India 🇮🇳',
        'PH': 'Filipinas 🇵🇭',
        'CA': 'Canadá 🇨🇦'
      };

      // Obtener género en español
      const genderSpanish = {
        'male': 'Masculino ♂️',
        'female': 'Femenino ♀️'
      };

      // Construir mensaje de respuesta
      let message = `👤 *PREDICCIÓN PARA: ${name.toUpperCase()}*\n\n`;

      // Edad
      if (ageData.age) {
        message += `🎂 *Edad estimada:* ${ageData.age} años\n`;
        message += `📊 Basado en ${ageData.count.toLocaleString()} personas\n\n`;
      } else {
        message += `🎂 *Edad:* No disponible\n\n`;
      }

      // Género
      if (genderData.gender) {
        const probability = (genderData.probability * 100).toFixed(1);
        message += `⚧️ *Género:* ${genderSpanish[genderData.gender]}\n`;
        message += `🎯 Probabilidad: ${probability}%\n\n`;
      } else {
        message += `⚧️ *Género:* No disponible\n\n`;
      }

      // Nacionalidad
      if (nationalityData.country && nationalityData.country.length > 0) {
        message += `🌍 *Nacionalidades más probables:*\n`;
        
        // Mostrar top 3 países
        const topCountries = nationalityData.country.slice(0, 3);
        topCountries.forEach((country, index) => {
          const countryName = countryNames[country.country_id] || `${country.country_id}`;
          const probability = (country.probability * 100).toFixed(1);
          message += `${index + 1}. ${countryName} - ${probability}%\n`;
        });
      } else {
        message += `🌍 *Nacionalidad:* No disponible`;
      }

      message += `\n✨ *Datos proporcionados por APIs públicas gratuitas*`;

      await m.reply(message);

      // Reacción de éxito
      await client.sendMessage(m.chat, {
        react: { text: '✅', key: m.key }
      });

    } catch (err) {
      console.error('❌ Error en predicción:', err);
      
      await client.sendMessage(m.chat, {
        react: { text: '❌', key: m.key }
      });

      let errorMsg = '❌ Error al obtener la predicción.';

      if (err.response?.status === 429) {
        errorMsg = '⚠️ *Límite de solicitudes alcanzado*\n\nEstas APIs gratuitas permiten:\n• 1,000 peticiones por día\n\nEspera un momento e intenta de nuevo.';
      } else if (err.code === 'ECONNABORTED') {
        errorMsg = '⏱️ Timeout: La solicitud tardó demasiado. Intenta de nuevo.';
      } else if (err.response?.status === 503) {
        errorMsg = '⚠️ Servicio temporalmente no disponible.';
      } else if (!err.response) {
        errorMsg = '❌ No hay conexión a internet o las APIs están caídas.';
      }

      m.reply(errorMsg);
    }
  }
};
