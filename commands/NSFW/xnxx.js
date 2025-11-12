const axios = require('axios');
const cheerio = require('cheerio');

async function xnxxSearchAndCarousel(query, conn, chatId, sender) {
  try {
    // Verificar NSFW
    if (!db.data.chats[chatId].nsfw && chatId.endsWith('@g.us')) {
      return conn.sendMessage(chatId, {
        text: '🚫 El contenido *NSFW* está desactivado en este grupo.\n> Un administrador puede activarlo con el comando » *#nsfw on*'
      });
    }

    if (!query) {
      return conn.sendMessage(chatId, {
        text: '🔍 Por favor, ingrese una búsqueda.\n> Ejemplo: #xxx con mi prima'
      });
    }

    // Inicializar lista global
    if (!global.videoListXXX) global.videoListXXX = [];
    global.videoListXXX = global.videoListXXX.filter(vid => vid.from !== sender);

    // Buscar videos en Xnxx
    const baseurl = 'https://www.xnxx.com';
    const page = Math.floor(Math.random() * 3) + 1;
    const response = await axios.get(`${baseurl}/search/${encodeURIComponent(query)}/${page}`);
    const $ = cheerio.load(response.data, { xmlMode: false });

    const results = [];
    $('div.mozaique').each((_, mozaique) => {
      $(mozaique).find('div.thumb').each((i, thumb) => {
        const href = $(thumb).find('a').attr('href');
        if (href && results.length < 6) {
          const link = baseurl + href.replace('/THUMBNUM/', '/');
          const thumbImg = $(thumb).find('img').attr('src');
          results.push({ link, thumb: thumbImg });
        }
      });
      $(mozaique).find('div.thumb-under').each((i, thumbUnder) => {
        const title = $(thumbUnder).find('a').attr('title');
        const info = $(thumbUnder).find('p.metadata').text();
        if (title && i < results.length) {
          results[i].title = title;
          results[i].info = info;
        }
      });
    });

    const videos = results.filter(r => r.title && r.link).slice(0, 6);
    if (videos.length === 0) {
      return conn.sendMessage(chatId, { text: `❌ No se encontraron videos para: ${query}` });
    }

    // Guardar resultados
    const vids = { from: sender, urls: videos.map(v => v.link), metadata: videos };
    global.videoListXXX.push(vids);

    // Crear mensaje de texto con los resultados
    let textMessage = `*🔍 Resultados de la búsqueda:* ${query.toUpperCase()}\n\n`;
    videos.forEach((video, index) => {
      textMessage += `*[${index + 1}]*\n• *🎬 Título:* ${video.title}\n• *🔗 Link:* ${video.link}\n• *❗ Info:* ${video.info}\n\n`;
      textMessage += '••••••••••••••••••••••••••••••••\n\n';
    });

    // Crear carrusel con botones
    const buttons = videos.map((vid, idx) => ({
      buttonId: `vid_${idx}_${vid.link}`,
      buttonText: { displayText: `Video ${idx + 1}: ${vid.title.substring(0, 20)}...` },
      type: 1
    }));

    const buttonMessage = {
      text: `🎬 *Carrusel de Videos*\nResultados para "${query}". Selecciona un video para descargar:`,
      footer: 'Toca un botón para ver el video.',
      buttons: buttons,
      headerType: 1
    };

    // Enviar mensaje de texto y carrusel
    await conn.sendMessage(chatId, { text: textMessage });
    await conn.sendMessage(chatId, buttonMessage);

  } catch (error) {
    console.error(error);
    await conn.sendMessage(chatId, { text: `❌ Ocurrió un error: ${error.message}` });
  }
}

// Función para descargar y enviar video seleccionado
async function downloadAndSendVideo(conn, chatId, buttonId) {
  try {
    const [_, index, link] = buttonId.split('_');
    const videoIndex = parseInt(index);
    const videoList = global.videoListXXX.find(item => item.urls.includes(link));

    if (!videoList || !videoList.metadata[videoIndex]) {
      return conn.sendMessage(chatId, { text: '❌ Video no encontrado.' });
    }

    const video = videoList.metadata[videoIndex];
    await conn.sendMessage(chatId, { text: '⏳ Descargando video, espere un momento...' });

    // Descargar metadata del video
    const res = await axios.get(link);
    const $ = cheerio.load(res.data, { xmlMode: false });
    const title = $('meta[property="og:title"]').attr('content');
    const videoScript = $('#video-player-bg > script:nth-child(6)').html();
    const files = {
      high: (videoScript.match(/html5player.setVideoUrlHigh\('(.*?)'\);/) || [])[1],
      thumb: (videoScript.match(/html5player.setThumbUrl\('(.*?)'\);/) || [])[1]
    };

    if (!files.high) {
      return conn.sendMessage(chatId, { text: '❌ No se pudo obtener el video.' });
    }

    // Enviar video
    await conn.sendMessage(chatId, {
      video: { url: files.high },
      mimetype: 'video/mp4',
      caption: `🎬 *${title}*\n${video.info}`,
      thumbnail: files.thumb ? { url: files.thumb } : null
    });

  } catch (error) {
    console.error(error);
    await conn.sendMessage(chatId, { text: `❌ Error al descargar el video: ${error.message}` });
  }
}

// Exportar para el bot
module.exports = {
  command: ['xnxxsearch', 'xxsh', 'xxx'],
  category: 'NSFW',
  description: 'Busca videos en xnxx y los muestra en un carrusel',
  async run({ conn, command, args, sender, chatId, message }) {
    // Manejar comando inicial (#xxx <query>)
    if (!message.buttonResponseMessage) {
      const query = Array.isArray(args) ? args.join(' ') : '';
      await xnxxSearchAndCarousel(query, conn, chatId, sender);
    }
    // Manejar respuesta de botón
    else {
      const selectedButtonId = message.buttonResponseMessage.selectedButtonId;
      if (selectedButtonId && selectedButtonId.startsWith('vid_')) {
        await downloadAndSendVideo(conn, chatId, selectedButtonId);
      }
    }
  }
};