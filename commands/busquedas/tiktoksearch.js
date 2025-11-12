const axios = require("axios");
const {
  proto,
  generateWAMessageFromContent,
  prepareWAMessageMedia,
  generateWAMessageContent
} = require("@whiskeysockets/baileys");

module.exports = {
  command: ["tiktoksearch", "ttss", "tiktoks"],
  category: "busquedas",
  description: "Busca videos en TikTok y los muestra en un carrusel",

  run: async (client, m, args) => {
    const text = args.join(" ");
    const from = m.key.remoteJid;
    const avatar = "https://files.catbox.moe/x0sjdp.jpeg";
    const dev = "SAKURA-BOT-MD🌸";
    const redes = "https://github.com/jahseh16/SAKURA-BOT-MD";

    if (!text) {
      return client.sendMessage(
        from,
        { text: "❌ Escribe algo para buscar en TikTok.\nEjemplo: *.tiktoksearch Messi*" },
        { quoted: m }
      );
    }

    async function createVideoMessage(url) {
      const { videoMessage } = await generateWAMessageContent(
        { video: { url } },
        { upload: client.waUploadToServer }
      );
      return videoMessage;
    }

    function shuffleArray(array) {
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
      }
    }

    try {
      // Mensaje de espera con vista previa visual
      await client.sendMessage(from, {
        text: "⏳ *Descargando resultados de TikTok...*",
        contextInfo: {
          externalAdReply: {
            mediaUrl: null,
            mediaType: 1,
            showAdAttribution: true,
            title: "💫 Buscando en TikTok...",
            body: dev,
            previewType: 0,
            thumbnailUrl: avatar,
            sourceUrl: redes
          }
        }
      });

      // 🔍 Consulta a la API
      const { data } = await axios.get(`https://apis-starlights-team.koyeb.app/starlight/tiktoksearch?text=${encodeURIComponent(text)}`);
      let searchResults = data.data;

      if (!searchResults || !searchResults.length)
        throw new Error("No se encontraron resultados.");

      shuffleArray(searchResults);
      const topResults = searchResults.slice(0, 4);
      const cards = [];

      for (let result of topResults) {
        const videoMsg = await createVideoMessage(result.nowm);

        cards.push({
          body: proto.Message.InteractiveMessage.Body.fromObject({
            text: ""
          }),
          footer: proto.Message.InteractiveMessage.Footer.fromObject({
            text: dev
          }),
          header: proto.Message.InteractiveMessage.Header.fromObject({
            title: result.title || "Video sin título",
            hasMediaAttachment: true,
            videoMessage: videoMsg
          }),
          nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
            buttons: []
          })
        });
      }

      const messageContent = generateWAMessageFromContent(from, {
        viewOnceMessage: {
          message: {
            messageContextInfo: {
              deviceListMetadata: {},
              deviceListMetadataVersion: 2
            },
            interactiveMessage: proto.Message.InteractiveMessage.fromObject({
              body: proto.Message.InteractiveMessage.Body.create({
                text: `🎬 *Resultados de búsqueda TikTok:*\n「 ${text} 」`
              }),
              footer: proto.Message.InteractiveMessage.Footer.create({
                text: dev
              }),
              header: proto.Message.InteractiveMessage.Header.create({
                hasMediaAttachment: false
              }),
              carouselMessage: proto.Message.InteractiveMessage.CarouselMessage.fromObject({
                cards
              })
            })
          }
        }
      }, { quoted: m });

      await client.relayMessage(from, messageContent.message, {
        messageId: messageContent.key.id
      });
    } catch (error) {
      console.error("❌ Error TikTok:", error.message);
      await client.sendMessage(from, {
        text: `⚠️ *Ocurrió un error:* ${error.message}`
      }, { quoted: m });
    }
  }
};
