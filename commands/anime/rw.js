const axios = require("axios");

module.exports = {
  command: ["rw"],
  description: "Muestra una waifu aleatoria con imagen, ficha, contacto y botón siguiente",
  category: "anime",

  run: async (client, m, args) => {
    try {
      const chatId = m.chat || m.key?.remoteJid;
      if (!chatId) {
        console.error("⚠️ Error: m.chat no definido");
        return;
      }

     // 💬 Contacto falso (mantiene el estilo Sakura)
      const fakeContact = {
        key: {
          participant: "0@s.whatsapp.net",
          ...(m.chat ? { remoteJid: "status@broadcast" } : {})
        },
        message: {
          contactMessage: {
            displayName: "🌸 SAKURA - BOT 🌸",
            vcard: `BEGIN:VCARD\nVERSION:3.0\nN:;Sakura;;;\nFN:Sakura\nORG:Sakura Bot\nTITLE:\nitem1.TEL;waid=51999999999:+51 999 999 999\nitem1.X-ABLabel:Celular\nEND:VCARD`
          }
        }
      };
        
      // 📸 Imagen aleatoria (usa axios para compatibilidad)
      let imagenUrl = "https://i.ibb.co/t9dpyqX/7cjdh1wz.png";
      try {
        const res = await axios.get("https://api.waifu.pics/sfw/waifu", { timeout: 8000 });
        if (res.data && res.data.url) imagenUrl = res.data.url;
      } catch (err) {
        console.log("⚠️ Waifu API falló, usando imagen de respaldo:", err.message);
      }

      // 🎲 Datos aleatorios
      const nombres = [
        "Hana Mitsui", "Yuki Tanaka", "Rina Aizawa", "Sakura Amane",
        "Mio Takahashi", "Emiko Hoshino", "Aoi Nishimura", "Kaori Fujita",
      ];
      const fuentes = [
        "Baka Na Imouto o Rikou ni Suru no Wa Ore no xx Dake Na Ken Ni Tsuite",
        "Toradora!", "Komi-san wa Komyushou Desu", "Oshi no Ko",
        "Kaguya-sama: Love is War", "Your Name", "Spy x Family", "Clannad",
      ];

      const nombre = nombres[Math.floor(Math.random() * nombres.length)];
      const genero = "Mujer";
      const valor = Math.floor(Math.random() * 10000) + 5000;
      const estado = Math.random() > 0.5 ? "Libre" : "Ocupada";
      const fuente = fuentes[Math.floor(Math.random() * fuentes.length)];

      // 📝 Texto con formato
      const texto = `
❀ *Nombre:* ${nombre}
⚥ *Género:* ${genero}
⚝ *Valor:* ${valor}
♡ *Estado:* ${estado}
ꕤ *Fuente:* ${fuente}
`.trim();

      // ✅ Enviar mensaje (sin errores de JID indefinido)
      await client.sendMessage(
        chatId,
        {
          image: { url: imagenUrl },
          caption: texto,
          footer: "🌸 Waifu System",
          buttons: [{ buttonId: "rw", buttonText: { displayText: "👉 Siguiente" }, type: 1 }],
          headerType: 4,
        },
        { quoted: fakeContact }
      );

      console.log("✅ Comando waifu ejecutado correctamente");

    } catch (e) {
      console.error("❌ Error en comando waifu:", e);
      const errorMsg = e?.message?.includes("jidDecode")
        ? "Parece que el chat no tiene ID válido o fue eliminado."
        : e.message || e;

      await client.sendMessage(
        m.chat,
        { text: `❌ Ocurrió un error, Jahseh\n\n${errorMsg}` },
        { quoted: m }
      );
    }
  },
};
