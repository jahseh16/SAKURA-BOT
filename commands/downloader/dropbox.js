const { dropbox } = require("lurcloud");

module.exports = {
  command: ["dropbox", "dbx"],
  description: "Descarga archivos de Dropbox",
  category: "downloader",
  use: "https://www.dropbox.com",
  run: async (client, m, args) => {
    if (!args[0]) {
      return m.reply(
        "Ingresa el *enlace* de un archivo de *Dropbox*\n\n`Ejemplo`\n!dropbox https://www.dropbox.com/scl/fi/g3bvk3pc3yo1agk7kmlxn/Tabla_Periodica_Elementos2017-1.pdf?rlkey=vp8mpq59d3vharwweghz85h6q&st=chcyi9aw&dl=0",
      );
    }

    await m.reply(mess.wait);

    try {
      let url = args[0];
      let file = await dropbox(url);

      let caption = `DropBox\n
*Nombre* › ${file.fileName}\n
*Tamaño* › ${file.fileSize}\n
*Tipo* › ${file.mimetype}`;

      await client.sendMessage(
        m.chat,
        {
          document: { url: file.downloadUrl },
          mimetype: file.mimetype,
          fileName: file.fileName,
          caption,
        },
        { quoted: m },
      );
    } catch (e) {
      console.error(e);
      m.reply("Error al procesar el archivo de Dropbox");
    }
  },
};
