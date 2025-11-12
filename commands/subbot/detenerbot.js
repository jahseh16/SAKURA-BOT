const fs = require('fs');
const chalk = require('chalk');

module.exports = {
  command: ["stopbot", "detenerbot", "delbot"],
  description: "Detiene tu SubBot activo",
  category: "subbot",
  
  async run(client, m, args) {
    try {
      const sender = m.sender;
      const userId = sender.split('@')[0];

      // Buscar SubBot del usuario
      const userSubBot = (global.conns || []).find(c => 
        c.ownerId === sender && c.user
      );

      if (!userSubBot) {
        return m.reply(`❌ *No tienes ningún SubBot activo*

💡 Usa los siguientes comandos para crear uno:
• ${m.prefix}serbot - Con código QR
• ${m.prefix}code - Con código de 8 dígitos`);
      }

      await client.sendMessage(m.chat, {
        react: { text: '🔴', key: m.key }
      });

      const subBotNumber = userSubBot.user.id.split(':')[0];

      // Cerrar conexión
      try {
        await userSubBot.logout();
      } catch (logoutErr) {
        console.log('Error al hacer logout:', logoutErr.message);
      }

      // Remover de array
      const index = global.conns.indexOf(userSubBot);
      if (index !== -1) {
        global.conns.splice(index, 1);
      }

      // Limpiar sesión
      if (userSubBot.sessionPath && fs.existsSync(userSubBot.sessionPath)) {
        try {
          fs.rmSync(userSubBot.sessionPath, { recursive: true, force: true });
        } catch (cleanErr) {
          console.error('Error limpiando sesión:', cleanErr);
        }
      }

      console.log(chalk.red(`\n🔴 SubBot desconectado: ${userId} (+${subBotNumber})\n`));

      await m.reply(`✅ *SUBBOT DETENIDO*

🔴 *Estado:* Desconectado
📱 *Número:* +${subBotNumber}
🗑️ *Sesión eliminada*
📊 *SubBots activos:* ${global.conns.length}

💡 Usa ${m.prefix}serbot para crear un nuevo SubBot`);

      await client.sendMessage(m.chat, {
        react: { text: '✅', key: m.key }
      });

    } catch (err) {
      console.error('❌ Error deteniendo SubBot:', err);
      await client.sendMessage(m.chat, {
        react: { text: '❌', key: m.key }
      });
      m.reply(`❌ Error al detener SubBot: ${err.message}`);
    }
  }
};