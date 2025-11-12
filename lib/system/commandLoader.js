const fs = require("fs");
const path = require("path");
const chalk = require("chalk");

global.comandos = new Map();

function seeCommands(dir = path.join(__dirname, "../../commands")) {
  fs.readdirSync(dir).forEach((fileOrFolder) => {
    const fullPath = path.join(dir, fileOrFolder);
    if (fs.lstatSync(fullPath).isDirectory()) {
      seeCommands(fullPath);
    } else if (fileOrFolder.endsWith(".js")) {
      try {
        delete require.cache[require.resolve(fullPath)];
        const comando = require(fullPath);
        if (comando && comando.command) {
          comando.command.forEach((cmd) => {
            global.comandos.set(cmd, comando);
          });
        }
      } catch (error) {
        console.error(
          chalk.red(`Error cargando comando ${fileOrFolder}:`),
          error,
        );
      }
    }
  });
}

module.exports = seeCommands;
