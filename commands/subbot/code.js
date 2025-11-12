const { createSubBot } = require('./subbot-handler');

function msToTime(duration) {
  const seconds = Math.floor((duration / 1000) % 60);
  const minutes = Math.floor((duration / (1000 * 60)) % 60);
  const paddedMinutes = minutes < 10 ? '0' + minutes : minutes;
  const paddedSeconds = seconds < 10 ? '0' + seconds : seconds;
  return paddedMinutes + ' m y ' + paddedSeconds + ' s';
}

module.exports = {
  command: ["code", "codigo", "codigobot"],
  description: "Conviértete en SubBot usando código de 8 dígitos",
  category: "subbot",
  
  async run(client, m, args) {
    try {
      const sender = m.sender;
      const userName = m.pushName || 'Usuario';

      // Verificar cooldown
      const cooldownTime = 120000;
      if (!global.db) global.db = { data: { users: {} } };
      if (!global.db.data.users[sender]) global.db.data.users[sender] = {};
      if (!global.db.data.users[sender].lastSubBot) global.db.data.users[sender].lastSubBot = 0;

      const timeLeft = global.db.data.users[sender].lastSubBot + cooldownTime - Date.now();
      
      if (timeLeft > 0) {
        return m.reply(`⏳ Debes esperar *${msToTime(timeLeft)}* para crear otro SubBot.`);
      }

      // Verificar límite
      const maxSubBots = 50;
      const activeSubBots = (global.conns || []).filter(c => 
        c.user && c.ws.socket && c.ws.socket.readyState !== require('ws').CLOSED
      ).length;

      if (activeSubBots >= maxSubBots) {
        return m.reply(`❌ Límite alcanzado (${activeSubBots}/${maxSubBots} SubBots activos)`);
      }

      await client.sendMessage(m.chat, {
        react: { text: '🔑', key: m.key }
      });

      await m.reply(`🔑 *CÓDIGO DE EMPAREJAMIENTO*

👤 *Usuario:* ${userName}

⏳ Generando código de 8 dígitos...`);

      // Crear SubBot con código
      await createSubBot({
        client,
        m,
        userName,
        useCode: true
      });

      global.db.data.users[sender].lastSubBot = Date.now();

    } catch (err) {
      console.error('❌ Error en code:', err);
      await client.sendMessage(m.chat, {
        react: { text: '❌', key: m.key }
      });
      m.reply(`❌ Error: ${err.message}`);
    }
  }
};