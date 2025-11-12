const fs = require("fs");
const { createCanvas, GlobalFonts } = require("@napi-rs/canvas");
const { Sticker, StickerTypes } = require("wa-sticker-formatter");
const twemoji = require("twemoji");

// 🖋 Registrar la fuente Arial
GlobalFonts.registerFromPath("./Arial.ttf", "Arial");

module.exports = {
  command: ["sticker", "s", "stxt", "stikertexto"],
  description: "Convierte imagen, video o texto (con emojis) en sticker bonito",
  category: "stickers",

  run: async (client, m, args) => {
    try {
      const quoted = m.quoted || m;
      const mime = (quoted.msg || quoted).mimetype || "";
      const text = args.join(" ").trim();
      const pack = "SAKURA-BOT 🌸";
      const author = "By Jahseh";

      // 🖼 Imagen → Sticker
      if (/image/.test(mime)) {
        const media = await quoted.download();
        const sticker = new Sticker(media, {
          pack,
          author,
          type: StickerTypes.FULL,
          quality: 100,
        });
        await client.sendMessage(m.chat, { sticker: await sticker.build() }, { quoted: m });
        return;
      }

      // 🎥 Video → Sticker (máx 20s)
      if (/video/.test(mime)) {
        if ((quoted.msg || quoted).seconds > 20)
          return m.reply("🎥 El video no puede durar más de *20 segundos*.");

        const media = await quoted.download();
        const sticker = new Sticker(media, {
          pack,
          author,
          type: StickerTypes.FULL,
          quality: 100,
        });
        await client.sendMessage(m.chat, { sticker: await sticker.build() }, { quoted: m });
        return;
      }

      // ✍️ Texto → Sticker (emojis incluidos)
      if (text) {
        const canvas = createCanvas(512, 512);
        const ctx = canvas.getContext("2d");

        // Fondo blanco
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, 512, 512);

        // Configurar fuente
        ctx.font = "bold 48px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#000000";

        // Dividir texto si es largo
        const words = text.split(" ");
        const lines = [];
        let line = "";
        const maxWidth = 460;

        for (let word of words) {
          const test = line + word + " ";
          const { width } = ctx.measureText(test);
          if (width > maxWidth && line.length > 0) {
            lines.push(line.trim());
            line = word + " ";
          } else {
            line = test;
          }
        }
        lines.push(line.trim());

        const lineHeight = 60;
        const totalHeight = lines.length * lineHeight;
        let y = (512 - totalHeight) / 2 + lineHeight / 2;

        // Dibuja texto línea por línea con emojis renderizados
        for (let l of lines) {
          const parsed = twemoji.parse(l, {
            folder: "svg",
            ext: ".svg",
            base: "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/",
          });

          // Renderizamos los emojis usando Twemoji en HTML → imagen
          const fragments = l.split(/([\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}])/gu);
          let x = 256 - ctx.measureText(l).width / 2;

          for (const frag of fragments) {
            if (!frag.trim()) continue;
            if (/[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u.test(frag)) {
              try {
                const emojiUrl = `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/${frag.codePointAt(0).toString(16)}.png`;
                const img = await loadImage(emojiUrl);
                ctx.drawImage(img, x, y - 40, 48, 48);
                x += 48;
              } catch {
                ctx.fillText(frag, x, y);
                x += ctx.measureText(frag).width;
              }
            } else {
              ctx.fillText(frag, x, y);
              x += ctx.measureText(frag).width;
            }
          }
          y += lineHeight;
        }

        // Crear sticker final
        const sticker = new Sticker(canvas.toBuffer("image/png"), {
          pack,
          author,
          type: StickerTypes.FULL,
          quality: 100,
        });

        await client.sendMessage(m.chat, { sticker: await sticker.build() }, { quoted: m });
        return;
      }

      // ⚠️ Sin contenido
      m.reply("⚠️ Envía o responde a una *imagen*, *video* o escribe texto con el comando *.s*");
    } catch (err) {
      console.error("❌ Error generando sticker:", err);
      m.reply("❌ Error al generar el sticker. Intenta nuevamente.");
    }
  },
};
