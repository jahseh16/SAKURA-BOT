const { gdrive } = require("lurcloud");

module.exports = {
  command: ["drive", "gdrive"],
  description: "Descarga archivos de Google Drive",
  category: "downloader",
  use: "https://drive.google.com",
  run: async (client, m, args) => {
    if (!args[0]) {
      return m.reply(
        "Ingresa el enlace de *Google Drive*\n\n`Ejemplo`\n!drive https://drive.google.com/file/d/1ZAmuLNYsvkaPu3Q6Rh33g9VxqObOhZNQ/view?usp=drivesdk",
      );
    }

    if (!args[0].match(/drive\.google\.com\/(file\/d\/|open\?id=|uc\?id=)/)) {
      return m.reply("La URL no parece válida de Google Drive");
    }

    await m.reply(mess.wait);

    try {
      let url = args[0];
      let file = await gdrive(url);

      let caption = ` Google Drive\n
*Nombre* › ${file.fileName}\n
*Tamaño* › ${file.fileSize}\n
*Tipo* › ${file.mimetype}\n`;

      m.reply(caption);

      await client.sendMessage(
        m.chat,
        {
          document: { url: file.downloadUrl },
          mimetype: file.mimetype,
          fileName: file.fileName,
        },
        { quoted: m },
      );
    } catch (e) {
      console.error(e);
      m.reply("Error al procesar la descarga");
    }
  },
};
