const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

function reloadCommands(dir = path.join(__dirname, "..")) {
  const commandsMap = new Map();

  function readCommands(folder) {
    const files = fs.readdirSync(folder);
    for (const file of files) {
      const fullPath = path.join(folder, file);
      const stat = fs.lstatSync(fullPath);

      if (stat.isDirectory()) {
        readCommands(fullPath);
      } else if (file.endsWith(".js")) {
        try {
          delete require.cache[require.resolve(fullPath)];
          const cmd = require(fullPath);
          if (cmd.command) {
            cmd.command.forEach((c) => {
              commandsMap.set(c, cmd);
            });
          }
        } catch (err) {
          console.error(`❌ Error recargando ${file}:`, err);
        }
      }
    }
  }

  readCommands(dir);
  global.comandos = commandsMap;
  console.log("✅ Comandos recargados correctamente.");
}

module.exports = {
  command: ["update", "actualizar"],
  description: "Actualiza el bot desde GitHub y recarga comandos automáticamente.",
  isOwner: true,
  category: "owner",
  run: async (client, m) => {
    const baseDir = path.join(__dirname, "..");

    client.sendMessage(m.key.remoteJid, { text: "⏳ Actualizando desde GitHub..." }, { quoted: m });

    exec("git pull", (error, stdout, stderr) => {
      if (error) {
        console.error("❌ Error ejecutando git pull:", stderr);
        client.sendMessage(m.key.remoteJid, { text: `❌ Error al actualizar:\n${stderr}` }, { quoted: m });
        return;
      }

      // 🔄 Recargar todos los comandos después del pull
      reloadCommands(baseDir);

      let msg = "";
      if (stdout.includes("Already up to date.")) {
        msg = "✅ *Estado:* Todo está actualizado.";
      } else {
        msg = `✅ *Actualización completada correctamente*\n\n${stdout}`;
      }

      client.sendMessage(m.key.remoteJid, { text: msg }, { quoted: m });
    });
  },
};
