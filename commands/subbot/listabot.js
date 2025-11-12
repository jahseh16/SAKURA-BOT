module.exports = {
  command: ["subbots", "listbots", "bots", "listabot"],
  description: "Lista todos los SubBots activos (solo owner)",
  category: "subbot",
  
  async run(client, m, args) {
    try {
      // IMPORTANTE: Ajusta esto según tu sistema de verificación de owner
      const ownerNumbers = ['51935040872']; // Cambia por tu número
      const isOwner = ownerNumbers.includes(m.sender.split('@')[0]);
      
      if (!isOwner) {
        return m.reply('❌ Este comando solo puede ser usado por el propietario del bot.');
      }

      if (!global.conns || global.conns.length === 0) {
        return m.reply(`📊 *NO HAY SUBBOTS ACTIVOS*

💡 Los usuarios pueden crear SubBots con:
• ${m.prefix}serbot
• ${m.prefix}code`);
      }

      await client.sendMessage(m.chat, {
        react: { text: '📊', key: m.key }
      });

      const maxSubBots = 50;
      let list = `🤖 *SUBBOTS ACTIVOS* (${global.conns.length}/${maxSubBots})
━━━━━━━━━━━━━━━━━\n\n`;

      global.conns.forEach((bot, i) => {
        if (bot.user) {
          const subBotNumber = bot.user.id.split(':')[0];
          const ownerNumber = bot.ownerId?.split('@')[0] || 'Desconocido';
          
          // Calcular uptime
          const uptimeMs = Date.now() - (bot.startTime || Date.now());
          const uptimeMin = Math.floor(uptimeMs / 60000);

          list += `${i + 1}. 📱 *+${subBotNumber}*\n`;
          list += `   👤 Owner: ${ownerNumber}\n`;
          list += `   ⏰ Activo: ${uptimeMin} min\n`;
          list += `   🔋 Estado: ${bot.ws.socket.readyState === 1 ? '✅' : '⚠️'}\n\n`;
        }
      });

      list += `\n━━━━━━━━━━━━━━━━━\n`;
      list += `📊 Espacios disponibles: ${maxSubBots - global.conns.length}\n`;
      list += `💾 Memoria: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`;

      await m.reply(list);

      await client.sendMessage(m.chat, {
        react: { text: '✅', key: m.key }
      });

    } catch (err) {
      console.error('❌ Error en listbots:', err);
      await client.sendMessage(m.chat, {
        react: { text: '❌', key: m.key }
      });
      m.reply(`❌ Error: ${err.message}`);
    }
  }
};