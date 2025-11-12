const ws = require('ws');

module.exports = {
  command: ["statusbot", "estadobot", "infobot", "mibot"],
  description: "Ver estado de tu SubBot",
  category: "subbot",
  
  async run(client, m, args) {
    try {
      const sender = m.sender;

      // Buscar SubBot del usuario
      const userSubBot = (global.conns || []).find(c => 
        c.ownerId === sender && c.user
      );

      if (!userSubBot) {
        return m.reply(`❌ *No tienes ningún SubBot activo*

💡 Crea uno con:
• ${m.prefix}serbot - Usando QR
• ${m.prefix}code - Usando código`);
      }

      await client.sendMessage(m.chat, {
        react: { text: '📊', key: m.key }
      });

      const subBotNumber = userSubBot.user.id.split(':')[0];
      const connectionState = userSubBot.ws.socket.readyState;
      
      // Calcular uptime
      const uptimeMs = Date.now() - (userSubBot.startTime || Date.now());
      const uptimeHours = Math.floor(uptimeMs / 3600000);
      const uptimeMinutes = Math.floor((uptimeMs % 3600000) / 60000);

      const info = `🤖 *ESTADO DEL SUBBOT*

✅ *Estado:* ${connectionState === ws.OPEN ? 'Activo ✅' : 'Inactivo ⚠️'}
📱 *Número:* +${subBotNumber}
👤 *Propietario:* ${m.pushName}
⏰ *Tiempo activo:* ${uptimeHours}h ${uptimeMinutes}m

📊 *Estadísticas generales:*
• Total SubBots activos: ${global.conns.length}
• Máximo permitido: 50

🔋 *Conexión:* ${connectionState === ws.OPEN ? 'Estable' : connectionState === ws.CONNECTING ? 'Conectando...' : 'Cerrada'}

💡 *Comandos disponibles:*
${m.prefix}stopbot - Desconectar SubBot

🎯 *Funciones:*
• Tu SubBot puede usar todos los comandos
• Procesa mensajes automáticamente
• Responde como el bot principal`;

      await m.reply(info);

      await client.sendMessage(m.chat, {
        react: { text: '✅', key: m.key }
      });

    } catch (err) {
      console.error('❌ Error en statusbot:', err);
      await client.sendMessage(m.chat, {
        react: { text: '❌', key: m.key }
      });
      m.reply(`❌ Error al obtener estado: ${err.message}`);
    }
  }
};