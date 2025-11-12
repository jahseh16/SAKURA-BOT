module.exports = {
  command: ["autorespuesta-bot"],
  description: "Responde automáticamente cuando alguien menciona 'bot'",
  category: "general",
  always: true, // para que se ejecute sin prefijo ni comando
  run: async (client, m) => {
    try {
      // Obtener el texto del mensaje
      const text = (m.body || "").toLowerCase();

      // Detectar si dice "bot" o "bot de mierda", "oye bot", etc.
      if (text.includes("bot")) {
        // Aquí puedes personalizar tus respuestas
        const respuestas = [
          "¿Quién me llama? 👀",
          "Aquí estoy bro 😎",
          "¿Qué pasó? Soy el bot más facha 💎",
          "¿Bot de mierda? 😡 — ¡yo tengo sentimientos también!",
          "¿Necesitas ayuda? Estoy al 100 🔥",
          "Habla causa, dime qué quieres 💬"
        ];

        // Escoger una respuesta al azar
        const random = respuestas[Math.floor(Math.random() * respuestas.length)];

        // Enviar la respuesta
        await client.sendMessage(m.chat, { text: random }, { quoted: m });
      }
    } catch (err) {
      console.error("❌ Error en autoreply-bot.js:", err);
    }
  },
};
