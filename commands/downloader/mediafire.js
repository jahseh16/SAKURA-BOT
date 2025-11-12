const { mediafire } = require("lurcloud");

module.exports = {
  command: ["mediafire", "mf"],
  description: "Descarga archivos de mediafire",
  category: "downloader",
  use: "https://www.mediafire.com/file",
  run: async (client, m, args) => {
    if (!args[0]) {
      return m.reply(
        "Ingresa el *enlace* de *Mediafire*\n\n`Ejemplo`\n!mediafire https://www.mediafire.com/file/idwn6mwqp5xbpsf/com.whatsapp%282%29.apk",
      );
    }

    if (
      !/^https?:\/\/(www\.)?mediafire\.com\/file\/[a-zA-Z0-9]+/.test(args[0])
    ) {
      return m.reply(
        "Solo se aceptan enlaces válidos de Mediafire. Asegúrate de que el enlace comience con:\nhttps://www.mediafire.com/file/",
      );
    }

    await m.reply(mess.wait);

    try {
      let res = await mediafire(args[0]);

      let info = `MF DOWNLOADER\n
*Nombre* › ${res.name}
*Peso* › ${res.size}
*Fecha* › ${res.date}
*Tipo* › ${res.mime}

> Su archivo se está descargando, esto puede demorar un poco`;

      m.reply(info);

      if (!/GB|gb/.test(res.size)) {
        await client.sendMessage(
          m.chat,
          {
            document: { url: res.link },
            mimetype: res.mime,
            fileName: res.name,
          },
          { quoted: m },
        );
      }
    } catch {
      m.reply("No se puede realizar la descarga");
    }
  },
};
