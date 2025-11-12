const axios = require("axios");

module.exports = {
  command: ["ip", "ipinfo", "buscarip"],
  description: "Obtiene información de una dirección IP",
  category: "juegos",

  run: async (conn, m, { text }) => {
    try {
      if (!text)
        return conn.sendMessage(
          m.chat,
          { text: "❌ Ingresa una dirección IP válida." },
          { quoted: m }
        );

      await conn.sendMessage(m.chat, { text: "🔍 Buscando información..." }, { quoted: m });

      const res = await axios.get(
        `http://ip-api.com/json/${text}?fields=status,message,country,countryCode,region,regionName,city,district,zip,lat,lon,timezone,isp,org,as,mobile,hosting,query`
      );

      const data = res.data;

      if (data.status !== "success") {
        return conn.sendMessage(
          m.chat,
          { text: `❌ Error: ${data.message || "No se pudo obtener información"}` },
          { quoted: m }
        );
      }

      const info = `
🌍 *Información de IP*

> 🌐 *IP:* ${data.query}
> 🗺️ *País:* ${data.country} (${data.countryCode})
> 🏙️ *Provincia:* ${data.regionName} (${data.region})
> 🌆 *Ciudad:* ${data.city}
> 📍 *Distrito:* ${data.district || "-"}
> 🏷️ *Código Postal:* ${data.zip || "-"}
> 📡 *Coordenadas:* ${data.lat}, ${data.lon}
> 🕓 *Zona Horaria:* ${data.timezone}
> 📶 *ISP:* ${data.isp}
> 🏢 *Organización:* ${data.org}
> 🔢 *AS:* ${data.as}
> 📱 *Mobile:* ${data.mobile ? "Sí" : "No"}
> 🖥️ *Hosting:* ${data.hosting ? "Sí" : "No"}
`.trim();

      await conn.sendMessage(m.chat, { text: info }, { quoted: m });
    } catch (error) {
      console.error(error);
      await conn.sendMessage(
        m.chat,
        { text: "❌ Ocurrió un error al obtener la información de la IP." },
        { quoted: m }
      );
    }
  },
};
