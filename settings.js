const fs = require("fs");
const chalk = require("chalk");

// 👑 PROPIETARIOS DEL BOT
global.owner = [
  ["51935040872", "Jahseh", true],
  ["5512983117943", "Jahseh", true], // [número sin @, nombre, es_creador?]
  // Puedes agregar más si quieres:
  // ["51912345678", "Colaborador", false],
];

// ⚙️ CONFIGURACIÓN GENERAL
global.sessionName = "lurus_session";
global.version = "v1.0.0 | Mini";
global.namebot = "Ai Lurus - Mini";
global.author = "Zam | Ai Lurus";

// 🗣️ MENSAJES PERSONALIZADOS
global.mess = {
  admin: "→ Esta función está reservada para los administradores del grupo.",
  botAdmin: "→ Para ejecutar esta función debo ser administrador.",
  owner: "→ Solo mi creador puede usar este comando.",
  group: "→ Esta función solo funciona en grupos.",
  private: "→ Esta función solo funciona en mensajes privados.",
  wait: "→ Espera un momento...",
};

// 🖼️ IMAGEN PRINCIPAL
global.thumbnailUrl = "https://i.ibb.co/ymZXzb7s/ac26pkip.png"; // Cambia esta imagen

// 🔗 CANAL OFICIAL (opcional)
global.my = {
  ch: "120363401477412280@newsletter", // Cambia por tu canal
};

// 🔄 AUTO RELOAD DE CONFIGURACIÓN
let file = require.resolve(__filename);
fs.watchFile(file, () => {
  fs.unwatchFile(file);
  console.log(chalk.yellowBright(`Actualización detectada en '${__filename}'`));
  delete require.cache[file];
  require(file);
});
