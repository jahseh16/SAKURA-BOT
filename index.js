/**
 * ================================
 *        Mini Lurus - WaBot
 * ================================
 * Creado por: Carlos Alexis (Zam)
 * Año: 2025
 * Librería: Baileys
 * ================================
 **/

require("./settings");
require("./lib/database");
const pino = require("pino");
const chalk = require("chalk");
const fs = require("fs");
const os = require("os");
const qrcode = require("qrcode-terminal");
const { Boom } = require("@hapi/boom");
const { exec } = require("child_process");
const { smsg } = require("./lib/message");
const { app, server } = require("./lib/server");

process.setMaxListeners(0); // 🚀 Evita retardos por listeners acumulados

// Sistema de logs
const log = {
  info: (msg) => console.log(chalk.bgBlue.white.bold("INFO"), chalk.white(msg)),
  success: (msg) => console.log(chalk.bgGreen.white.bold("SUCCESS"), chalk.greenBright(msg)),
  warn: (msg) => console.log(chalk.bgYellowBright.blueBright.bold("WARNING"), chalk.yellow(msg)),
  error: (msg) => console.log(chalk.bgRed.white.bold("ERROR"), chalk.redBright(msg)),
};

// Información inicial
const print = (label, value) => {
  console.log(`${chalk.green.bold("║")} ${chalk.cyan.bold(label.padEnd(16))}${chalk.magenta.bold(":")} ${value}`);
};
const userInfoSyt = () => {
  try {
    return os.userInfo().username;
  } catch {
    return process.env.USER || process.env.USERNAME || "desconocido";
  }
};

// Banner
console.log(chalk.yellow.bold(`╔═════[${userInfoSyt()}@${os.hostname()}]═════`));
print("OS", `${os.platform()} ${os.release()} ${os.arch()}`);
print("Node.js", process.version);
print("Baileys", "WhiskeySockets/baileys");
print("Memoria", `${(os.freemem() / 1024 / 1024).toFixed(0)} MiB / ${(os.totalmem() / 1024 / 1024).toFixed(0)} MiB`);
print("Fecha", new Date().toLocaleString("es-ES", { timeZone: "America/Mexico_City" }));
console.log(chalk.yellow.bold("╚" + "═".repeat(45)));

;(async () => {
  const baileys = await import("@whiskeysockets/baileys");
  const {
    makeWASocket,
    makeCacheableSignalKeyStore,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    jidDecode,
    DisconnectReason,
  } = baileys;

  async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState("./lurus_session");
    const { version } = await fetchLatestBaileysVersion();

    const client = makeWASocket({
      version,
      logger: pino({ level: "silent" }),
      browser: ["Mini Lurus", "Chrome", "1.0.0"],
      printQRInTerminal: false,
      auth: state,
    });

    // 📱 QR
    client.ev.on("connection.update", (update) => {
      const { connection, lastDisconnect, qr } = update;
      if (qr) {
        console.log(chalk.yellowBright("\n📱 Escanea este QR con tu WhatsApp:\n"));
        qrcode.generate(qr, { small: true });
        console.log(chalk.greenBright("\n👉 WhatsApp → Dispositivos vinculados → Vincular un dispositivo.\n"));
      }

      if (connection === "close") {
        const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
        switch (reason) {
          case DisconnectReason.connectionLost:
          case DisconnectReason.connectionClosed:
          case DisconnectReason.restartRequired:
          case DisconnectReason.timedOut:
            log.warn("Conexión perdida, intentando reconectarse...");
            startBot();
            break;
          case DisconnectReason.badSession:
          case DisconnectReason.loggedOut:
          case DisconnectReason.forbidden:
          case DisconnectReason.multideviceMismatch:
            log.error("Error de sesión. Elimina /lurus_session y vuelve a escanear el QR.");
            exec("rm -rf ./lurus_session/*");
            process.exit(1);
          default:
            log.error(`Desconexión desconocida: ${reason}`);
            process.exit(1);
        }
      } else if (connection === "open") {
        log.success("✅ Conexión a WhatsApp establecida correctamente.");
      }
    });

    await global.loadDatabase().catch(() => log.error("❌ Error al cargar base de datos"));
    console.log(chalk.greenBright("✅ Base de datos cargada correctamente."));

    // Función de envío
    client.sendText = (jid, text, quoted = "", options = {}) =>
      client.sendMessage(jid, { text, ...options }, { quoted });

    // 🧠 Caché de nombres (para respuestas más rápidas)
    if (!global.nameCache) global.nameCache = new Map();

    // 💬 Manejo de mensajes ultra rápido
    client.ev.on("messages.upsert", async ({ messages }) => {
      try {
        let m = messages[0];
        if (!m.message) return;
        if (m.key.remoteJid === "status@broadcast") return;

        // Extraer texto
        const body =
          m.message.conversation ||
          m.message.extendedTextMessage?.text ||
          m.message.imageMessage?.caption ||
          m.message.videoMessage?.caption ||
          "";

        const isGroup = m.key.remoteJid.endsWith("@g.us");

        // ⚡ Ignora mensajes normales en grupos (solo comandos)
        if (isGroup && !body.startsWith(".")) return;

        // Evitar mensajes efímeros innecesarios
        m.message =
          Object.keys(m.message)[0] === "ephemeralMessage"
            ? m.message.ephemeralMessage.message
            : m.message;

        // Cachear nombres
        m.pushName = m.pushName || "Sin nombre";
        if (!global.nameCache.has(m.sender)) global.nameCache.set(m.sender, m.pushName);
        else m.pushName = global.nameCache.get(m.sender);

        m = smsg(client, m);
        require("./main")(client, m, messages);
      } catch (err) {
        console.error("❌ Error en messages.upsert:", err);
      }
    });

    client.decodeJid = (jid) => {
      if (!jid) return jid;
      if (/:\d+@/gi.test(jid)) {
        const decode = jidDecode(jid) || {};
        return decode.user && decode.server ? `${decode.user}@${decode.server}` : jid;
      }
      return jid;
    };

    client.ev.on("creds.update", saveCreds);
  }

  startBot();
})();

// 🛠️ AUTO-RELOAD
let file = require.resolve(__filename);
fs.watchFile(file, () => {
  fs.unwatchFile(file);
  console.log(chalk.yellowBright(`♻️ Se actualizó el archivo ${__filename}`));
  delete require.cache[file];
  require(file);
});
