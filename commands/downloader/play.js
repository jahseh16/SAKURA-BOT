// commands/downloader/play.js
const yts = require('yt-search');

module.exports = {
  command: ['play'],
  category: 'downloader',
  description: 'Busca videos en YouTube y muestra botones para descargar audio o video (compatible con varias firmas de run).',

  // Esta run acepta varias firmas que usan distintos loaders:
  // - run(m, { conn, text, usedPrefix, command })
  // - run(m, conn, args, prefix)
  // - run(m, { conn, args, usedPrefix })
  async run(...params) {
    try {
      // Extraer m
      const m = params[0];
      if (!m) return console.error('play: nulo m');

      // Variables por defecto
      let conn = null;
      let text = '';
      let usedPrefix = '.';
      let commandName = 'play';
      let args = [];

      // Caso A: run(m, { conn, text, usedPrefix, command, args })
      if (params[1] && typeof params[1] === 'object' && params[1].conn) {
        conn = params[1].conn;
        text = (params[1].text || (Array.isArray(params[1].args) ? params[1].args.join(' ') : '') || '').toString();
        usedPrefix = params[1].usedPrefix || params[1].prefix || usedPrefix;
        commandName = params[1].command || commandName;
        args = params[1].args || [];
      }
      // Caso B: run(m, conn, args, prefix)
      else if (params[1] && typeof params[1] === 'object' && typeof params[1].sendMessage === 'function') {
        conn = params[1];
        args = Array.isArray(params[2]) ? params[2] : (typeof params[2] === 'string' ? [params[2]] : []);
        usedPrefix = params[3] || usedPrefix;
        text = (args && args.length) ? args.join(' ') : (params[4] || '');
        commandName = params[5] || commandName;
      }
      // Caso C: run(m, connObjectLike) (some loaders)
      else if (params[1] && typeof params[1] === 'object') {
        // intentar sacar conn o conn dentro
        conn = params[1].conn || params[1].client || params[1].socket || null;
        args = params[1].args || [];
        text = params[1].text || (args.length ? args.join(' ') : '') || '';
        usedPrefix = params[1].usedPrefix || usedPrefix;
        commandName = params[1].command || commandName;
      }
      // Fallback: buscar global.conn / global.client
      if (!conn) {
        conn = global.conn || global.client || global.sock || null;
      }

      // Si aún no hay conn, evitamos crash y respondemos con console y si es posible con m
      if (!conn || typeof conn.sendMessage !== 'function') {
        console.error('play: conn indefinido (no se pudo obtener conexión). Params:', params.length);
        // Intentar notificar al chat si m tiene chat y existe alguna forma de responder (m.reply o conn fallback)
        try {
          if (m && m.chat && conn && typeof conn.sendMessage === 'function') {
            await conn.sendMessage(m.chat, { text: '❌ Error interno: no hay conexión (conn undefined).' }, { quoted: m }).catch(()=>{});
          } else if (m && typeof m.reply === 'function') {
            await m.reply('❌ Error interno: no hay conexión (conn undefined).');
          } else {
            // no podemos enviar; solo log
            return;
          }
        } catch (e) {
          return;
        }
      }

      // Si text está vacío, intentar construir a partir de args
      if (!text || !String(text).trim()) {
        if (args && args.length) text = args.join(' ');
      }
      text = String(text || '').trim();

      if (!text) {
        return await conn.sendMessage(m.chat, { text: `💮 Uso: ${usedPrefix}${commandName} <texto a buscar>` }, { quoted: m }).catch(()=>{});
      }

      // Reacción visual (si el cliente lo soporta)
      try { await conn.sendMessage(m.chat, { react: { text: '🔎', key: m.key } }); } catch (e) { /* no crítico */ }

      // Buscar con yt-search
      let search;
      try {
        search = await yts(text);
      } catch (errSearch) {
        console.error('play: error yt-search', errSearch);
        return await conn.sendMessage(m.chat, { text: '❌ Error buscando en YouTube.' }, { quoted: m }).catch(()=>{});
      }

      const video = search && search.videos && search.videos[0];
      if (!video) {
        return await conn.sendMessage(m.chat, { text: '❌ No se encontró ningún resultado.' }, { quoted: m }).catch(()=>{});
      }

      // Datos del video (defensivos)
      const title = video.title || 'Desconocido';
      const duration = video.timestamp || video.duration || '—';
      const views = (typeof video.views === 'number') ? video.views.toLocaleString() : (video.views || '—');
      const author = (video.author && video.author.name) ? video.author.name : (video.author || 'Desconocido');
      const url = video.url || (`https://youtu.be/${video.videoId || ''}`);
      const thumb = video.thumbnail || null;

      // Contacto falso como pediste
      const fkontak = {
        key: {
          participant: '0@s.whatsapp.net',
          ...(m.chat ? { remoteJid: 'status@broadcast' } : {})
        },
        message: {
          contactMessage: {
            displayName: '💮 Sakura Bot',
            vcard:
`BEGIN:VCARD
VERSION:3.0
N:;Sakura;;;
FN:Sakura
ORG:Sakura Bot;
TITLE:
item1.TEL;waid=51999999999:+51 999 999 999
END:VCARD`
          }
        }
      };

      // Caption y botones
      const caption = `💮 *Sakura Bot - Descargador*\n\n📀 *Título:* ${title}\n⏱️ *Duración:* ${duration}\n👁️ *Vis*
