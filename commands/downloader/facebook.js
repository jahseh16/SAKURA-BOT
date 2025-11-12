const { fetchDownloadLinks, getDownloadLink } = require("lurcloud");

module.exports = {
  command: ["fb", "facebook"],
  description: "Descarga videos de Facebook.",
  category: "downloader",
  use: "https://www.facebook.com/share/r/15kXJEJXPA/",
  run: async (client, m, args) => {
    if (!args[0]) {
      return m.reply(
        "Ingrese un enlace de *Facebook*\n\n`Ejemplo`\n!fb https://www.facebook.com/share/r/15kXJEJXPA/",
      );
    }

    if (!args[0].match(/facebook\.com|fb\.watch|video\.fb\.com/)) {
      return m.reply(
        "El enlace no parece *válido*. Asegúrate de que sea de *Facebook*",
      );
    }

    await m.reply(mess.wait);

    try {
      const links = await fetchDownloadLinks(args[0], "facebook");
      if (!links || links.length === 0) {
        return m.reply("No se pudo obtener el *video*");
      }

      const videoUrl = getDownloadLink("facebook", links);

      const caption = `FB DOWNLOADER

→ *Enlace* ›
${args[0]}
`.trim();

      await client.sendMessage(
        m.chat,
        {
          video: { url: videoUrl },
          caption,
          mimetype: "video/mp4",
          fileName: "fb.mp4",
        },
        { quoted: m },
      );
    } catch (e) {
      console.error(e);
      await m.reply("Ocurrió un error al procesar el video de Facebook");
    }
  },
};
