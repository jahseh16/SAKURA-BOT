const axios = require("axios");
const baileys = require("@whiskeysockets/baileys");
const fs = require("fs");

// ✅ Funciones para evitar jid inválido
function fixJid(jid) {
  if (!jid) return null;
  if (jid.includes("@")) return jid;
  if (jid.includes("-")) return `${jid}@g.us`;
  return `${jid}@s.whatsapp.net`;
}

function getChatId(m) {
  return (
    m.chat ||
    m.key?.remoteJid ||
    m.key?.participant ||
    m.message?.key?.remoteJid ||
    m.sender ||
    null
  );
}

async function enviarMensajeSeguro(conn, m, content, options = {}) {
  try {
    let jid = getChatId(m);
    jid = fixJid(jid);
    if (!jid) throw new Error("jid inválido");
    await conn.sendMessage(jid, content, options);
  } catch (err) {
    console.error("❌ Error al enviar mensaje:", err.message);
  }
}

module.exports = {
  command: ["ttimg", "tikimg", "ttphoto"],
  description: "Descarga imágenes de slideshows de TikTok sin marca de agua",
  category: "downloader",

  run: async (conn, m, args) => {
    try {
      // Validar URL
      const url = args[0];
      if (!url || !url.includes("tiktok.com")) {
        return await enviarMensajeSeguro(conn, m, {
          text: "❌ *Uso incorrecto*\n\nEjemplo: `.ttimg <url>`\n\n_Proporciona una URL válida de TikTok._",
        });
      }

      // Mensaje de espera con video/gif
      const loadingPath = "./media/loading.mp4";
      await enviarMensajeSeguro(conn, m, {
        video: fs.existsSync(loadingPath) ? fs.readFileSync(loadingPath) : null,
        caption: "⏳ *Descargando imágenes...*\n\n_Procesando slideshow, espera un momento._",
        gifPlayback: true,
        footer: "☘️ SAKURA SYSTEM 🌸",
      });

      // Llamada a la API
      const apiUrl = `https://tikwm.com/api/?url=${encodeURIComponent(url)}`;
      const response = await axios.get(apiUrl);
      const data = response.data;

      // Verificar respuesta
      if (data.code !== 0 || !data.data) {
        return await enviarMensajeSeguro(conn, m, {
          text: "❌ *Error al procesar*\n\n_No se pudo obtener información. Verifica la URL._",
        });
      }

      const videoData = data.data;

      // Verificar si tiene imágenes
      if (!videoData.images || videoData.images.length === 0) {
        return await enviarMensajeSeguro(conn, m, {
          text: "❌ *Este TikTok no tiene imágenes*\n\n_Este es un video normal, no un slideshow. Usa el comando de video._",
        });
      }

      const images = videoData.images;
      const jid = getChatId(m);

      // Información del slideshow
      const caption = `✅ *TIKTOK SLIDESHOW DOWNLOADER*

\`📝 Descripción\`: ${videoData.title || "Sin descripción"}
\`👤 Autor\`: @${videoData.author.unique_id || "desconocido"}
\`❤️ Likes\`: ${videoData.digg_count?.toLocaleString() || 0}
\`💬 Comentarios\`: ${videoData.comment_count?.toLocaleString() || 0}
\`🔄 Compartidos\`: ${videoData.share_count?.toLocaleString() || 0}
\`▶️ Reproducciones\`: ${videoData.play_count?.toLocaleString() || 0}
\`📊 Total de imágenes\`: ${images.length}
   `;

      // 📥 Descargar todas las imágenes
      const medias = [];
      for (let i = 0; i < images.length; i++) {
        const imgUrl = images[i];

        try {
          const imgResponse = await axios.get(imgUrl, {
            responseType: "arraybuffer",
          });

          medias.push({
            type: "image",
            data: Buffer.from(imgResponse.data),
          });

          console.log(`✅ Imagen ${i + 1}/${images.length} descargada`);
        } catch (err) {
          console.error(`❌ Error descargando imagen ${i + 1}:`, err.message);
        }
      }

      // Si no se descargó nada
      if (medias.length === 0) {
        return await enviarMensajeSeguro(conn, m, {
          text: "❌ *Error al descargar imágenes*\n\n_No se pudo descargar ninguna imagen del slideshow._",
        });
      }

      // 🧠 Crear y enviar álbum
      await enviarAlbum(conn, fixJid(jid), medias, caption);

      // 🎵 Audio opcional
      if (videoData.music) {
        try {
          await new Promise((resolve) => setTimeout(resolve, 2000));

          const audioResponse = await axios.get(videoData.music, {
            responseType: "arraybuffer",
          });

          await enviarMensajeSeguro(conn, m, {
            audio: Buffer.from(audioResponse.data),
            mimetype: "audio/mpeg",
            fileName: "tiktok_audio.mp3",
            ptt: false,
          });
        } catch (err) {
          console.error("⚠️ Audio no disponible");
        }
      }

    } catch (err) {
      console.error("❌ Error en comando TikTok Images:", err);
      await enviarMensajeSeguro(conn, m, {
        text: `❌ *Error al descargar*\n\n_${err.message || "Error desconocido"}_`,
      });
    }
  },
};

// 📸 Función para enviar álbum de imágenes
async function enviarAlbum(conn, jid, medias, caption = "", delay = 500) {
  try {
    // 🧠 Crear álbum seguro
    const album = baileys.generateWAMessageFromContent(
      jid,
      {
        messageContextInfo: {},
        albumMessage: {
          expectedImageCount: medias.filter((m) => m.type === "image").length,
          expectedVideoCount: medias.filter((m) => m.type === "video").length,
        },
      },
      {}
    );

    await conn.relayMessage(jid, album.message, {
      messageId: album.key.id,
    });

    console.log("✅ Álbum creado");

    // 📤 Enviar cada imagen al álbum
    for (let i = 0; i < medias.length; i++) {
      const { type, data } = medias[i];

      const msg = await baileys.generateWAMessage(
        jid,
        {
          [type]: data,
          ...(i === 0 ? { caption } : {}),
        },
        { upload: conn.waUploadToServer }
      );

      // Asociar imagen al álbum
      msg.message.messageContextInfo = {
        messageAssociation: {
          associationType: 1,
          parentMessageKey: album.key,
        },
      };

      await conn.relayMessage(jid, msg.message, {
        messageId: msg.key.id,
      });

      console.log(`📤 Imagen ${i + 1}/${medias.length} enviada`);

      // Delay entre imágenes
      if (i < medias.length - 1) {
        await baileys.delay(delay);
      }
    }

    return album;
  } catch (err) {
    console.error("❌ Error al enviar álbum:", err);
    throw err;
  }
}
