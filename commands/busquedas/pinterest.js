const axios = require("axios");

// Comando para buscar en Pinterest
module.exports = {
  command: ["pinterest", "pint", "pin"],
  description: "Busca imágenes en Pinterest",
  category: "busquedads",

  run: async (conn, m, args) => {
    const enviar = async (content) => {
      const jid = m.chat || m.key?.remoteJid;
      try {
        await conn.sendMessage(jid, content);
      } catch (err) {
        console.error("Error:", err.message);
      }
    };

    try {
      const query = args.join(" ");
      if (!query) {
        return await enviar({
          text: "❌ *Uso incorrecto*\n\nEjemplo: `.pinterest gatos`",
        });
      }

      await enviar({
        text: "🔍 *Buscando en Pinterest...*\n\n_Espera un momento._",
      });

      // API no oficial de Pinterest
      const apiUrl = `https://www.pinterest.com/resource/BaseSearchResource/get/?source_url=/search/pins/?q=${encodeURIComponent(query)}&data={"options":{"isPrefetch":false,"query":"${encodeURIComponent(query)}","scope":"pins","no_fetch_context_on_resource":false},"context":{}}`;

      const response = await axios.get(apiUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      });

      const pins = response.data?.resource_response?.data?.results || [];

      if (pins.length === 0) {
        return await enviar({
          text: `❌ *No se encontraron resultados*\n\n_No hay imágenes para: "${query}"_`,
        });
      }

      // Tomar las primeras 5 imágenes
      const imagesToSend = pins.slice(0, 5);

      for (let i = 0; i < imagesToSend.length; i++) {
        const pin = imagesToSend[i];
        const imageUrl = pin.images?.orig?.url || pin.images?.["736x"]?.url;

        if (imageUrl) {
          try {
            const imgResponse = await axios.get(imageUrl, {
              responseType: "arraybuffer",
            });

            await enviar({
              image: Buffer.from(imgResponse.data),
              caption: `🌸 *Pinterest*\n\n📝 *Título:* ${pin.title || "Sin título"}\n🔗 *Link:* https://pinterest.com/pin/${pin.id}\n\n_Imagen ${i + 1}/${imagesToSend.length}_\n\n🌸 *SAKURA-BOT-MD*`,
            });

            // Delay entre imágenes
            await new Promise((resolve) => setTimeout(resolve, 1500));
          } catch (err) {
            console.error(`Error descargando imagen ${i + 1}:`, err.message);
          }
        }
      }

    } catch (err) {
      console.error("❌ Error en comando Pinterest:", err);
      await enviar({
        text: `❌ *Error al buscar*\n\n_${err.message || "Error desconocido"}_`,
      });
    }
  },
};
