module.exports = {
  command: ["kick", "ban", "expulsar", "sacar"],
  description: "Expulsa a un usuario del grupo",
  category: "groups",
  isGroup: true,
  botAdmin: true,
  isAdmin: true,
  run: async (client, m, args) => {
    try {
      // Obtener info del grupo
      const groupMetadata = await client.groupMetadata(m.chat);
      const participants = groupMetadata.participants;
      
      // Obtener lista de administradores reales
      const groupAdmins = participants
        .filter(p => p.admin !== null)
        .map(p => p.id);
      
      const botNumber = client.user.id; // ID real del bot
      const sender = m.sender; // Quien ejecuta
      const ownerBot = `${global.owner[0]}@s.whatsapp.net`; // Propietario del bot
      
      // Verificar si el bot es admin
      const isBotAdmin = groupAdmins.includes(botNumber);
      if (!isBotAdmin) {
        return m.reply("🚩 Para ejecutar esta función debo ser *administrador del grupo*.");
      }
      
      // Verificar si el usuario que ejecuta es admin o el dueño del bot
      const isUserAdmin = groupAdmins.includes(sender);
      if (!isUserAdmin && sender !== ownerBot) {
        return m.reply("🚩 Solo los *administradores* o el *propietario del bot* pueden usar este comando.");
      }
      
      // Detectar al usuario a eliminar
      let user;
      if (m.mentionedJid && m.mentionedJid.length > 0) {
        user = m.mentionedJid[0];
      } else if (m.quoted) {
        user = m.quoted.sender;
      } else if (args[0]) {
        const number = args[0].replace(/[^0-9]/g, "");
        if (!number) return m.reply("🚩 Debes mencionar o responder al usuario que deseas eliminar.");
        user = number + "@s.whatsapp.net";
      } else {
        return m.reply("🚩 Debes mencionar o responder al usuario que deseas eliminar.");
      }
      
      // No eliminar al bot, ni al owner del bot, ni al owner del grupo
      if (user === botNumber) {
        return m.reply("🚩 No puedo eliminarme a mí mismo.");
      }
      
      if (user === ownerBot) {
        return m.reply("🚩 No puedo eliminar al propietario del bot.");
      }
      
      const groupOwner = groupMetadata.owner || m.chat.split("-")[0] + "@s.whatsapp.net";
      if (user === groupOwner) {
        return m.reply("🚩 No puedo eliminar al propietario del grupo.");
      }
      
      // No eliminar administradores
      if (groupAdmins.includes(user)) {
        return m.reply("🚩 No puedo eliminar a otro *administrador*.");
      }
      
      // Ejecutar eliminación
      await client.groupParticipantsUpdate(m.chat, [user], "remove");
      await m.reply(`✅ Usuario eliminado correctamente: @${user.split("@")[0]}`, {
        mentions: [user],
      });
      
    } catch (err) {
      console.error("❌ Error en kick.js:", err);
      m.reply("❌ Ocurrió un error al intentar eliminar al usuario.");
    }
  },
};