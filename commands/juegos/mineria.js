const fs = require('fs');

const file = './rpg_mineria.json';
if (!fs.existsSync(file)) fs.writeFileSync(file, '{}');

const premios = [10, 5, 6, 1, 30, 55, 0.5, 999, 777, 666, 444, 404];
const cooldown = 30 * 1000; // 30 segundos

module.exports = {
  command: ['minar', 'perfil', 'top'],
  description: 'Juego de minería RPG (mina oro, diamantes, etc.)',
  category: 'juegos',

  async run(client, m, args) {
    try {
      const user = m.sender;
      const name = m.pushName || 'Jugador';
      const db = JSON.parse(fs.readFileSync(file));
      if (!db[user]) {
        db[user] = {
          nombre: name,
          puntos: 0,
          oro: 0,
          plata: 0,
          diamante: 0,
          cobre: 0,
          lastMine: 0
        };
      }
      const data = db[user];
      const cmd = m.command.toLowerCase();

      // =============== COMANDO MINAR ===============
      if (cmd === 'minar') {
        const now = Date.now();
        if (now - data.lastMine < cooldown) {
          const falta = Math.ceil((cooldown - (now - data.lastMine)) / 1000);
          return m.reply(`⏳ Espera ${falta}s para volver a minar.`);
        }

        const premio = premios[Math.floor(Math.random() * premios.length)];
        const valor = Number(premio);
        const metales = ['oro', 'plata', 'diamante', 'cobre'];
        const metal = metales[Math.floor(Math.random() * metales.length)];

        data[metal] += valor;
        data.puntos += valor;
        data.lastMine = now;

        fs.writeFileSync(file, JSON.stringify(db, null, 2));

        if (data.puntos >= 50000) {
          data.puntos = 0;
          fs.writeFileSync(file, JSON.stringify(db, null, 2));
          return m.reply(
            `🎉 *${name}*, ¡has alcanzado 50,000 puntos! 💎\n\n🎁 Ganaste *1 dólar real* 💵\nContacta al admin para reclamar.\n\nTu progreso se ha reiniciado.`
          );
        }

        return m.reply(
          `⛏️ *${name}* estás minando...\n\n✨ Has encontrado *${valor}* de ${metal}.\n💰 Total acumulado: *${data.puntos.toFixed(
            1
          )} / 50000*`
        );
      }

      // =============== COMANDO PERFIL ===============
      if (cmd === 'perfil') {
        let pfp;
        try {
          pfp = await client.profilePictureUrl(user, 'image');
        } catch {
          pfp = 'https://i.ibb.co/3y2kLrL/default-profile.png';
        }

        const txt = `👤 *Perfil de ${data.nombre}*\n\n💎 𝘿𝙞𝙖𝙢𝙖𝙣𝙩𝙚𝙨: ${data.diamante.toFixed(
          1
        )}\n🥇 𝙊𝙧𝙤: ${data.oro.toFixed(1)}\n🥈 𝙋𝙡𝙖𝙩𝙖: ${data.plata.toFixed(
          1
        )}\n🥉 𝙊𝙧𝙤: ${data.cobre.toFixed(
          1
        )}\n\n💰 𝐏𝐮𝐧𝐭𝐨𝐬 𝐭𝐨𝐭𝐚𝐥𝐞𝐬: ${data.puntos.toFixed(1)} / 50000`;

        await client.sendMessage(m.chat, { image: { url: pfp }, caption: txt }, { quoted: m });
        return;
      }

      // =============== COMANDO TOP ===============
      if (cmd === 'top') {
        const lista = Object.entries(db)
          .map(([id, u]) => ({ id, nombre: u.nombre, puntos: u.puntos }))
          .sort((a, b) => b.puntos - a.puntos)
          .slice(0, 10);

        let msg = '🏆 *TOP 10 MINEROS GLOBALES* 🏆\n\n';
        lista.forEach((u, i) => {
          msg += `${i + 1}. ${u.nombre} — ${u.puntos.toFixed(1)} pts 💰\n`;
        });

        await m.reply(msg);
        return;
      }
    } catch (err) {
      console.error('❌ Error en minería:', err);
      await m.reply('❌ Error al ejecutar el comando de minería.');
    }
  }
};
