/**
 * ================================
 *        sakura-bot-md
 * ================================
 * Creado por: jahseh-hc
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
const readline = require("readline");

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

// Función para hacer preguntas al usuario
const question = (text) => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(text, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
};

// 📋 MENÚ DE SELECCIÓN
async function showMenu() {
  console.log(chalk.cyan.bold("\n╔════════════════════════════════╗"));
  console.log(chalk.cyan.bold("║   MÉTODO DE VINCULACIÓN        ║"));
  console.log(chalk.cyan.bold("╚════════════════════════════════╝\n"));
  console.log(chalk.white("  1️⃣  ") + chalk.greenBright("QR Code (escanear)"));
  console.log(chalk.white("  2️⃣  ") + chalk.yellowBright("Código de 8 dígitos\n"));
  
  const choice = await question(chalk.magenta("Elige una opción (1 o 2): "));
  return choice.trim();
}

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

  // Variable global para el método elegido
  let usePairingCode = false;
  let menuShown = false;

  async function startBot() {
    // ✅ Corrección: Crear carpeta de sesión si no existe
    if (!fs.existsSync("./lurus_session")) {
      fs.mkdirSync("./lurus_session", { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState("./lurus_session");
    const { version } = await fetchLatestBaileysVersion();

    // 🔍 Verificar si ya hay sesión activa
    const hasSession = fs.existsSync("./lurus_session/creds.json");

    // Si no hay sesión, mostrar menú
    if (!hasSession && !menuShown) {
      const choice = await showMenu();
      usePairingCode = choice === "2";
      menuShown = true;
    }

    const client = makeWASocket({
      version,
      logger: pino({ level: "silent" }),
      browser: ["Chrome (Linux)", "", ""],
      printQRInTerminal: !usePairingCode, // Solo muestra QR si eligió opción 1
      auth: state,
    });

    // 📱 Gestión de vinculación
    client.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;

      // 🔐 Opción 2: Código de emparejamiento
      if (usePairingCode && !client.authState.creds.registered) {
        console.log(chalk.cyan("\n📞 Ingresa tu número de WhatsApp (con código de país, sin +):"));
        console.log(chalk.yellow("Ejemplo: 521234567890 (México) o 51987654321 (Perú)\n"));
        const phoneNumber = (await question("Número: ")).replace(/\D/g, "");

        try {
          await new Promise(resolve => setTimeout(resolve, 3000)); // Esperar 3 segundos
          
          const code = await client.requestPairingCode(phoneNumber);
          const formattedCode = code.match(/.{1,4}/g)?.join("-") || code;
          
          console.log(chalk.bgGreen.white.bold("\n╔═══════════════════════════════╗"));
          console.log(chalk.bgGreen.white.bold("║   🔑 CÓDIGO DE VINCULACIÓN   ║"));
          console.log(chalk.bgGreen.white.bold("╚═══════════════════════════════╝\n"));
          console.log(chalk.greenBright.bold(`        ${formattedCode}\n`));
          console.log(chalk.cyan("👉 WhatsApp → Dispositivos vinculados"));
          console.log(chalk.cyan("👉 Vincular con número de teléfono"));
          console.log(chalk.cyan("👉 Ingresa el código de 8 dígitos\n"));
        } catch (err) {
          log.error(`Error al solicitar código: ${err.message}`);
        }
      }

      // 📱 Opción 1: QR Code
      if (qr && !usePairingCode) {
        console.log(chalk.yellowBright("\n📱 Escanea este QR con tu WhatsApp:\n"));
        qrcode.generate(qr, { small: true });
        console.log(chalk.greenBright("\n👉 WhatsApp → Dispositivos vinculados → Vincular un dispositivo\n"));
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
