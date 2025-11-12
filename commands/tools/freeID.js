const axios = require("axios");
const fs = require("fs");

module.exports = {
  command: ["ffperfil", "ffprofile", "perfilff"],
  description: "Muestra el perfil personal de un jugador de Free Fire",
  category: "tools",

  run: async (conn, m, args) => {
    // ✅ Definir función helper local
    const enviar = async (content) => {
      const jid = m.chat || m.key?.remoteJid;
      try {
        await conn.sendMessage(jid, content);
      } catch (err) {
        console.error("Error:", err.message);
      }
    };

    try {
      // Validar UID
      const uid = args[0];
      const server = args[1]?.toUpperCase() || "IND";

      if (!uid || isNaN(uid)) {
        return await enviar({
          text: "❌ *Uso incorrecto*\n\nEjemplo: `.ffperfil <UID> [servidor]`\n\n*Ejemplos:*\n`.ffperfil 1633864660`\n`.ffperfil 1633864660 IND`",
        });
      }

      // Mensaje de espera
      const loadingPath = "./media/loading.mp4";
      await enviar({
        video: fs.existsSync(loadingPath) ? fs.readFileSync(loadingPath) : null,
        caption: "👤 *Obteniendo perfil...*\n\n_Cargando información del jugador._",
        gifPlayback: true,
      });

      // Llamada a la API
      const apiUrl = `https://freefire-api-six.vercel.app/get_player_personal_show?server=${server}&uid=${uid}`;
      const response = await axios.get(apiUrl);
      const data = response.data;

      if (!data || !data.personalShow || data.error) {
        return await enviar({
          text: `❌ *Perfil no encontrado*\n\n_No se encontró el perfil del UID: ${uid} en el servidor ${server}_`,
        });
      }

      const p = data.personalShow;
      let mensaje = `👤 *FREE FIRE - PERFIL*\n\n`;
      mensaje += `*🎮 Nickname:* ${p.nickName || "Sin nombre"}\n`;
      mensaje += `*🆔 UID:* \`${uid}\`\n`;
      mensaje += `*📊 Nivel:* ${p.level || "N/A"}\n`;
      mensaje += `*🌍 Región:* ${server}\n`;
      mensaje += `*💬 Firma:* ${p.signature || "Sin firma"}\n`;
      mensaje += `*👥 Clan:* ${p.clanName || "Sin clan"}\n`;
      mensaje += `*🏷️ Clan ID:* ${p.clanId || "N/A"}\n\n`;

      if (p.badgeList && p.badgeList.length > 0) {
        mensaje += `*🏅 INSIGNIAS*\n`;
        p.badgeList.slice(0, 5).forEach((badge) => {
          mensaje += `   • ${badge.name || "Insignia"}\n`;
        });
        mensaje += `\n`;
      }

      if (p.achievementsList && p.achievementsList.length > 0) {
        mensaje += `*🏆 LOGROS DESTACADOS*\n`;
        mensaje += `   Total: ${p.achievementsList.length}\n\n`;
      }

      if (p.likeCount) {
        mensaje += `*❤️ Likes recibidos:* ${p.likeCount.toLocaleString()}\n`;
      }

      if (p.region) {
        mensaje += `*🗺️ Zona:* ${p.region}\n`;
      }

      mensaje += `\n_Para ver estadísticas detalladas usa:_\n*!ffstats ${uid}*\n\n🌸 *SAKURA-BOT-MD*`;

      await enviar({ text: mensaje });

    } catch (err) {
      console.error("❌ Error en comando FF Perfil:", err);
      await enviar({
        text: `❌ *Error al obtener perfil*\n\n_${err.response?.data?.message || err.message || "Error desconocido"}_`,
      });
    }
  },
};
