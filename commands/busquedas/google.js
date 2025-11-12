const axios = require("axios");

module.exports = {
  command: ["buscar", "search"],
  description: "Búsqueda web",
  category: "busquedas",

  run: async (conn, m, args) => {
    const enviar = async (content) => {
      const jid = m.chat || m.key?.remoteJid;
      await conn.sendMessage(jid, content).catch(e => console.log(e));
    };

    try {
      const query = args.join(" ");
      if (!query) {
        return await enviar({ text: "❌ Uso: `.buscar <término>`" });
      }

      await enviar({ text: "🔍 Buscando..." });

      // JSONPlaceholder + DuckDuckGo (100% gratis)
      const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&pretty=1`;
      
      const { data } = await axios.get(url);

      let mensaje = `🔎 *BÚSQUEDA: ${query}*\n\n`;

      if (data.AbstractText) {
        mensaje += `${data.AbstractText}\n\n`;
        if (data.AbstractURL) {
          mensaje += `🔗 ${data.AbstractURL}\n\n`;
        }
      }

      if (data.RelatedTopics?.length > 0) {
        mensaje += `*Resultados:*\n`;
        data.RelatedTopics.slice(0, 5).forEach((t, i) => {
          if (t.Text && t.FirstURL) {
            mensaje += `\n${i + 1}. ${t.Text.substring(0, 80)}...\n🔗 ${t.FirstURL}\n`;
          }
        });
      }

      if (!data.AbstractText && !data.RelatedTopics?.length) {
        return await enviar({ text: `❌ Sin resultados para: "${query}"` });
      }

      mensaje += `\n🌸 *SAKURA-BOT-MD*`;
      await enviar({ text: mensaje });

    } catch (err) {
      console.error(err);
      await enviar({ text: `❌ Error: ${err.message}` });
    }
  },
};
