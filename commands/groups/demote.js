const { resolveLidToRealJid } = require("../../lib/utils");

module.exports = {
  command: ["demote", "degradar", "quitaradmin"],
  description: "Degrada a un administrador en el grupo",
  category: "groups",
  use: "@0",
  isGroup: true,
  isAdmin: true,
  isBotAdmin: true,
  run: async (client, m, args) => {
    const groupMetadata = await client.groupMetadata(m.chat);
    const participants = await Promise.all(
      groupMetadata.participants.map(async (p) => {
        const realJid = await resolveLidToRealJid(p.id, client, m.chat);
        return { ...p, id: realJid };
      }),
    );
    const groupAdmins = participants
      .filter((p) => p.admin || p.admin === "superadmin")
      .map((p) => p.id);
    const isBotAdmin = groupAdmins.includes(
      client.user.id.split(":")[0] + "@s.whatsapp.net",
    );
    const isSenderAdmin = groupAdmins.includes(m.sender);

    let target;
    if (args[0]) {
      let number = args[0].replace("@", "");
      target = await resolveLidToRealJid(
        number + "@s.whatsapp.net",
        client,
        m.chat,
      );
    } else if (m.quoted) {
      target = await resolveLidToRealJid(m.quoted.sender, client, m.chat);
    } else {
      return m.reply("*Etiquete* al *administrador* que desea *degradar*");
    }

    try {
      await client.groupParticipantsUpdate(m.chat, [target], "demote");
      m.reply(`*@${target.split("@")[0]}* ha sido degradado de administrador`, {
        mentions: [target],
      });
    } catch (e) {
      m.reply(
        "No se pudo degradar al administrador, verifica permisos o que el usuario sea admin",
      );
    }
  },
};
