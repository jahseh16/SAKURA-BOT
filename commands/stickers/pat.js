/**
 * 🎨 Comando: .pat
 * Convierte texto + emojis en un sticker con fondo aleatorio estilo meme.
 * Compatible con CommonJS y Baileys.
 * Adaptado por ChatGPT para Jahseh 🔥
 */

const Jimp = require("jimp");
const fs = require("fs");
const path = require("path");
const { Sticker, StickerTypes } = require("wa-sticker-formatter");

module.exports = {
  command: ["pat"],
  description: "Crea un sticker con texto y emojis sobre una imagen aleatoria",
  category: "stickers",

  run: async (client, m, args) => {
    try {
      const text = args.join(" ").trim();
      if (!text) return m.reply("⚠️ Escribe algo después de .pat\nEjemplo: *.pat Hola 🤣*");

      // 🖼️ Seleccionar imagen aleatoria
      const imgDir = path.join(__dirname, "../../src/sticker");
      const images = fs.readdirSync(imgDir).filter(f => f.match(/\.(jpg|jpeg|png)$/i));
      if (images.length === 0) return m.reply("❌ No hay imágenes base en /src/sticker/");
      const randomImage = path.join(imgDir, images[Math.floor(Math.random() * images.length)]);
      const image = await Jimp.read(randomImage);

      // 📏 Texto procesado
      const words = text.split(/\s+/).slice(0, 25);
      const userText = words.join(" ");
      let fontSize = 128;
      let font = await Jimp.loadFont(Jimp.FONT_SANS_128_WHITE);
      const maxWidth = image.bitmap.width - 60;
      const maxHeight = image.bitmap.height / 2.5;

      while (Jimp.measureTextHeight(font, userText, maxWidth) > maxHeight && fontSize > 32) {
        fontSize -= 16;
        font = await Jimp.loadFont(
          fontSize > 128 ? Jimp.FONT_SANS_128_WHITE :
          fontSize > 64 ? Jimp.FONT_SANS_64_WHITE :
          Jimp.FONT_SANS_32_WHITE
        );
      }

      const textHeight = Jimp.measureTextHeight(font, userText, maxWidth);
      const y = image.bitmap.height - textHeight - 50;

      // 🖤 Sombra del texto
      const shadow = await Jimp.loadFont(
        fontSize > 128 ? Jimp.FONT_SANS_128_BLACK :
        fontSize > 64 ? Jimp.FONT_SANS_64_BLACK :
        Jimp.FONT_SANS_32_BLACK
      );

      const offsets = [
        { x: -3, y: 0 }, { x: 3, y: 0 },
        { x: 0, y: -3 }, { x: 0, y: 3 }
      ];

      offsets.forEach(o => {
        image.print(
          shadow,
          30 + o.x,
          y + o.y,
          { text: userText, alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER },
          maxWidth,
          textHeight
        );
      });

      // 🤍 Texto principal
      image.print(
        font,
        30,
        y,
        { text: userText, alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER },
        maxWidth,
        textHeight
      );

      // 🧱 Crear sticker
      const buffer = await image.getBufferAsync(Jimp.MIME_PNG);
      const sticker = new Sticker(buffer, {
        pack: "Black Clover",
        author: "Jahseh 👑",
        type: StickerTypes.FULL,
        quality: 100,
      });
      const stickerBuild = await sticker.build();

      // 🎴 Contexto visual
      const imgFolder = path.join(__dirname, "../../src/img");
      const imgFiles = fs.existsSync(imgFolder)
        ? fs.readdirSync(imgFolder).filter(f => /\.(jpg|png|webp)$/i.test(f))
        : [];

      let contextInfo = {};
      if (imgFiles.length > 0) {
        contextInfo = {
          externalAdReply: {
            title: "𝕭𝖑𝖆𝖈𝖐 𝕮𝖑𝖔𝖛𝖊𝖗 | Stickers ✨",
            body: "Dev • Jahseh 👑",
            mediaType: 2,
            thumbnail: fs.readFileSync(path.join(imgFolder, imgFiles[0]))
          }
        };
      }

      await client.sendMessage(m.chat, { sticker: stickerBuild, contextInfo }, { quoted: m });
    } catch (err) {
      console.error("❌ Error comando .pat:", err);
      await m.reply("❌ Error al generar el sticker. Asegúrate de tener imágenes en /src/sticker/");
    }
  },
};
