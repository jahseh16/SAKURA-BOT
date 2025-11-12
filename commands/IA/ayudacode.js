const axios = require('axios');

module.exports = {
  command: ["xcode", "ayudacode", "debugcode", "corregir"],
  description: "Corrige, explica y mejora código de programación",
  category: "IA",
  
  async run(client, m, args) {
    try {
      const text = args.join(' ');

      if (!text) {
        return m.reply(`💻 *ASISTENTE DE CÓDIGO*

💡 *Uso:* ${m.prefix}fixcode \`código\`

📝 *Ejemplos:*

*Corregir error:*
${m.prefix}fixcode \`\`\`
function suma(a b) {
  return a + b
}
\`\`\`

*Explicar código:*
${m.prefix}fixcode explica este código:
\`\`\`js
const arr = [1,2,3].map(x => x*2)
\`\`\`

*Optimizar:*
${m.prefix}fixcode optimiza:
\`\`\`python
for i in range(len(lista)):
    print(lista[i])
\`\`\`

✨ *Lenguajes soportados:*
• JavaScript/TypeScript
• Python
• Java
• C/C++
• PHP
• Ruby
• Go
• Y más...

🔧 *El bot puede:*
✓ Encontrar errores
✓ Explicar el código
✓ Optimizar y mejorar
✓ Sugerir buenas prácticas
✓ Dar ejemplos alternativos`);
      }

      await client.sendMessage(m.chat, {
        react: { text: '💻', key: m.key }
      });

      await m.reply('🔍 Analizando tu código...');

      // Detectar el lenguaje del código
      let language = 'auto';
      const langMatches = text.match(/```(\w+)/);
      if (langMatches) {
        language = langMatches[1];
      }

      // Limpiar el código (remover marcadores de markdown)
      const cleanCode = text
        .replace(/```[\w]*\n?/g, '')
        .replace(/```/g, '')
        .trim();

      // Crear prompt mejorado para el análisis
      const prompt = `Eres un experto programador senior. Analiza el siguiente código y proporciona:

1. **Errores detectados** (si los hay)
2. **Código corregido** (si tiene errores)
3. **Explicación** de qué hace el código
4. **Sugerencias de mejora** (optimización, buenas prácticas)
5. **Alternativas** (si aplica)

Lenguaje: ${language}

Código a analizar:
\`\`\`${language}
${cleanCode}
\`\`\`

Responde de forma clara y estructurada en español. Si el código tiene errores, muestra primero los errores, luego el código corregido.`;

      // Usar la API de Pollinations AI
      const response = await axios.get(
        `https://text.pollinations.ai/${encodeURIComponent(prompt)}`,
        {
          timeout: 45000,
          headers: {
            'User-Agent': 'Mozilla/5.0',
            'Accept': 'text/plain'
          }
        }
      );

      let analysis = response.data;

      if (!analysis || analysis.trim().length === 0) {
        throw new Error('No se pudo analizar el código');
      }

      // Limpiar respuesta excesiva
      analysis = analysis.trim();

      // Dividir la respuesta si es muy larga (WhatsApp límite ~4096 chars)
      if (analysis.length > 4000) {
        // Primera parte
        const part1 = analysis.substring(0, 4000);
        const lastNewline = part1.lastIndexOf('\n');
        const firstPart = analysis.substring(0, lastNewline > 3000 ? lastNewline : 4000);
        
        await m.reply(`💻 *ANÁLISIS DE CÓDIGO* (Parte 1/2)\n\n${firstPart}`);
        
        // Segunda parte
        const secondPart = analysis.substring(lastNewline > 3000 ? lastNewline : 4000);
        await m.reply(`💻 *ANÁLISIS DE CÓDIGO* (Parte 2/2)\n\n${secondPart}`);
      } else {
        await m.reply(`💻 *ANÁLISIS DE CÓDIGO*\n\n${analysis}`);
      }

      await client.sendMessage(m.chat, {
        react: { text: '✅', key: m.key }
      });

    } catch (err) {
      console.error('❌ Error en Code Helper:', err);
      
      await client.sendMessage(m.chat, {
        react: { text: '❌', key: m.key }
      });

      let errorMsg = '❌ Error al analizar el código.';

      if (err.code === 'ECONNABORTED') {
        errorMsg = '⏱️ Timeout: El análisis tardó demasiado. Intenta con código más corto.';
      } else if (err.response?.status === 429) {
        errorMsg = '⚠️ Demasiadas solicitudes. Espera un momento.';
      } else if (err.response?.status === 503) {
        errorMsg = '⚠️ Servicio temporalmente no disponible. Intenta más tarde.';
      } else if (err.message.includes('analizar')) {
        errorMsg = '❌ No se pudo analizar el código. Verifica que el formato sea correcto.';
      }

      m.reply(errorMsg);
    }
  }
};