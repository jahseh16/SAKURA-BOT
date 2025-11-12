module.exports = {
  command: ["admis"],
  description: "Verifica si el bot y el usuario son admin",
  category: "groups",
  isGroup: true,
  run: async (client, m) => {
    try {
      const metadata = await client.groupMetadata(m.chat);
      const admins = metadata.participants
        .filter(p => p.admin !== null)
        .map(p => p.id);

      const botId = client.decodeJid(client.user.id);
      const isBotAdmin = admins.includes(botId);
      const isUserAdmin = admins.includes(m.sender);

      let txt = `🧩 *DEBUG ADMIN INFO*\n\n`;
      txt += `👤 Usuario: ${m.sender}\n`;
      txt += `🤖 Bot ID: ${botId}\n\n`;
      txt += `🟢 ¿Bot admin?: ${isBotAdmin}\n`;
      txt += `🟢 ¿Usuario admin?: ${isUserAdmin}\n\n`;
      txt += `📜 Lista de admins:\n${admins.join("\n")}`;

      await m.reply(txt);
    } catch (e) {
      console.error(e);
      m.reply("❌ Error al obtener la información del grupo.");
    }
  },
};
