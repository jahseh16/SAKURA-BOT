const fs = require("fs");
const path = require("path");

function reloadCommands(dir = path.join(__dirname, "..")) {
  const commandsMap = new Map();

  function readCommands(folder) {
    const files = fs.readdirSync(folder);
    files.forEach((file) => {
      const fullPath = path.join(folder, file);
      if (fs.lstatSync(fullPath).isDirectory()) {
        readCommands(fullPath);
      } else if (file.endsWith(".js")) {
        delete require.cache[require.resolve(fullPath)];
        const cmd = require(fullPath);
        if (cmd.command) {
          cmd.command.forEach((c) => {
            commandsMap.set(c, cmd);
          });
        }
      }
    });
  }

  readCommands(dir);
  global.comandos = commandsMap;
}

module.exports = {
  command: ["update", "actualizar"],
  description: "Actualiza desde GitHub",
  isOwner: true,
  category: "owner",
  run: async (client, m, args, from, isCreator) => {
    const { exec } = require("child_process");
    const baseDir = path.join(__dirname, "..");

    exec("git pull", (error, stdout, stderr) => {
      reloadCommands(baseDir);
      let msg = "";
      if (stdout.includes("Already up to date.")) {
        msg = "*Estado:* Todo está actualizado";
      } else {
        msg = `*Actualización completada*\n\n${stdout}`;
      }
      client.sendMessage(m.key.remoteJid, { text: msg }, { quoted: m });
    });
  },
};
