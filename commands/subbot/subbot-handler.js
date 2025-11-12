const { makeWASocket, useMultiFileAuthState, DisconnectReason, makeCacheableSignalKeyStore, fetchLatestBaileysVersion, Browsers } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode');
const NodeCache = require('node-cache');
const fs = require('fs');
const path = require('path');
const pino = require('pino');
const chalk = require('chalk');
const ws = require('ws');

// Inicializar array de conexiones
if (!global.conns) global.conns = [];

// Límite máximo de subbots
const MAX_SUBBOTS = 50;

/**
* Crea un nuevo SubBot
* @param {Object} options - Opciones de configuración
* @param {Object} options.client - Cliente principal de WhatsApp
* @param {Object} options.m - Mensaje del comando
* @param {string} options.userName - Nombre del usuario
* @param {boolean} options.useCode - Usar código en lugar de QR
*/
async function createSubBot(options) {
    const { client, m, userName, useCode } = options;
    const sender = m.sender;
    const userId = sender.split('@')[0];

    // Validar límite de subbots
    if (global.conns.length >= MAX_SUBBOTS) {
        return client.sendMessage(m.chat, {
            text: `⚠️ *LÍMITE ALCANZADO*\n\nYa hay ${MAX_SUBBOTS} subbots activos. Desconecta uno con .stopbot antes de crear otro.`
        });
    }

    // Verificar si ya existe una conexión activa para este usuario
    const existingConn = global.conns.find(conn => conn.ownerId === userId);
    if (existingConn) {
        return client.sendMessage(m.chat, {
            text: '⚠️ *YA TIENES UN SUBBOT ACTIVO*\n\nUsa .stopbot para desconectarlo primero.'
        });
    }

    // Crear directorio para la sesión
    const sessionPath = path.join(__dirname, 'sessions', `subbot_${userId}`);
    if (!fs.existsSync(sessionPath)) {
        fs.mkdirSync(sessionPath, { recursive: true });
    }

    try {
        // Configurar autenticación
        const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
        const { version } = await fetchLatestBaileysVersion();

        // Cache para reintentos de mensajes (con límites)
        const msgRetryCache = new NodeCache({
            stdTTL: 3600, // 1 hora
            checkperiod: 600, // verificar cada 10 min
            maxKeys: 1000 // máximo 1000 entradas
        });

        // Crear socket de conexión
        const sock = makeWASocket({
            version,
            logger: pino({ level: 'silent' }),
            printQRInTerminal: false,
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }))
            },
            browser: Browsers.ubuntu('Chrome'),
            msgRetryCounterCache: msgRetryCache,
            generateHighQualityLinkPreview: true,
            markOnlineOnConnect: true,
            defaultQueryTimeoutMs: undefined
        });

        // Guardar credenciales al actualizarse
        sock.ev.on('creds.update', saveCreds);

        // Variables de control
        let qrSent = false;
        let codeSent = false;
        let qrRetries = 0;
        const MAX_QR_RETRIES = 3;
        const QR_TIMEOUT = 90000; // 90 segundos (recomendación oficial)

        // Manejar actualizaciones de conexión
        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            // Generar QR si está disponible y no se usa código
            if (qr && !useCode && !qrSent) {
                qrRetries++;

                if (qrRetries > MAX_QR_RETRIES) {
                    await client.sendMessage(m.chat, {
                        text: '❌ *DEMASIADOS INTENTOS FALLIDOS*\n\nUsa .serbot para reintentar la conexión.'
                    });
                    await removeSubBot(userId);
                    return;
                }

                try {
                    qrSent = true;
                    const qrImage = await qrcode.toDataURL(qr);
                    const base64Data = qrImage.split(',')[1];
                    const buffer = Buffer.from(base64Data, 'base64');

                    await client.sendMessage(m.chat, {
                        image: buffer,
                        caption: `📱 *ESCANEA ESTE QR CON WHATSAPP*\n\n` +
                                `👤 Usuario: ${userName}\n` +
                                `⏱️ Expira en: 90 segundos\n` +
                                `🔄 Intento: ${qrRetries}/${MAX_QR_RETRIES}\n\n` +
                                `SubBots activos: ${global.conns.length}/${MAX_SUBBOTS}`,
                        mentions: [sender]
                    });

                    console.log(chalk.cyan(\`\n[SubBot] QR generado para \${userId} (intento \${qrRetries})\`));

                    // Reset después del timeout
                    setTimeout(() => {
                        qrSent = false;
                    }, QR_TIMEOUT);

                } catch (qrErr) {
                    console.error(chalk.red('❌ Error generando QR:', qrErr));
                    qrSent = false;
                }
            }

            // Generar código de emparejamiento si se usa código
            if (qr && useCode && !codeSent) {
                try {
                    codeSent = true;
                    const phoneNumber = userId.replace(/[^0-9]/g, '');
                    const code = await sock.requestPairingCode(phoneNumber);
                    const formattedCode = code?.match(/.{1,4}/g)?.join('-') || code;

                    await client.sendMessage(m.chat, {
                        text: `🔐 *CÓDIGO DE EMPAREJAMIENTO*\n\n` +
                              \`📱 Código: \\`\${formattedCode}\\`\n\` +
                              \`👤 Usuario: \${userName}\n\` +
                              \`⏱️ Expira en: 90 segundos\n\n\` +
                              \`SubBots activos: \${global.conns.length}/\${MAX_SUBBOTS}\`,
                        mentions: [sender]
                    });

                    console.log(chalk.cyan(\`\n[SubBot] Código generado para \${userId}\`));

                    setTimeout(() => {
                        codeSent = false;
                    }, QR_TIMEOUT);

                } catch (codeErr) {
                    console.error(chalk.red('❌ Error generando código:', codeErr));
                    codeSent = false;
                }
            }

            // Conexión abierta exitosamente
            if (connection === 'open') {
                console.log(chalk.green(\`✅ [SubBot] Conectado exitosamente: \${userId}\`));

                // Guardar información del subbot
                sock.ownerId = userId;
                sock.ownerJid = sender;
                sock.startTime = Date.now();
                sock.sessionPath = sessionPath;
                sock.isSubBot = true;

                // Agregar a la lista global
                global.conns.push(sock);

                // Guardar persistencia de sesiones activas
                saveActiveSessions();

                await client.sendMessage(m.chat, {
                    text: \`✅ *SUBBOT CONECTADO EXITOSAMENTE*\n\n\` +
                          \`👤 Usuario: \${userName}\n\` +
                          \`📊 SubBots activos: \${global.conns.length}/\${MAX_SUBBOTS}\n\` +
                          \`🆔 ID: \${userId}\n\n\` +
                          \`Para desconectarlo usa: .stopbot\`,
                    mentions: [sender]
                });

                // Configurar handler de mensajes
                setupMessageHandler(sock, client);
            }

            // Manejar desconexión
            if (connection === 'close') {
                const shouldReconnect = handleDisconnect(lastDisconnect);

                if (shouldReconnect) {
                    console.log(chalk.yellow('🔄 [SubBot] Reconectando...'));
                    setTimeout(() => createSubBot(options), 3000);
                } else {
                    console.log(chalk.red(\`❌ [SubBot] Desconectado permanentemente: \${userId}\`));
                    await removeSubBot(userId);
                }
            }
        });

        return sock;

    } catch (error) {
        console.error(chalk.red('❌ Error creando SubBot:', error));
        await client.sendMessage(m.chat, {
            text: \`❌ *ERROR AL CREAR SUBBOT*\n\n\${error.message}\`
        });
        throw error;
    }
}

/**
* Maneja la lógica de desconexión y determina si debe reconectar
* @param {Object} lastDisconnect - Objeto con información de la última desconexión
* @returns {boolean} - true si debe reconectar, false si no
*/
function handleDisconnect(lastDisconnect) {
    const statusCode = lastDisconnect?.error?.output?.statusCode;
    const reason = lastDisconnect?.error?.output?.payload?.error;

    console.log(chalk.yellow(\`⚠️ [SubBot] Desconexión detectada - Código: \${statusCode}\`));

    switch (statusCode) {
        case DisconnectReason.badSession:
            console.log(chalk.red('❌ Sesión dañada - No reconectar'));
            return false;

        case DisconnectReason.connectionClosed:
            console.log(chalk.yellow('🔌 Conexión cerrada - Reconectando...'));
            return true;

        case DisconnectReason.connectionLost:
            console.log(chalk.yellow('📡 Conexión perdida - Reconectando...'));
            return true;

        case DisconnectReason.connectionReplaced:
            console.log(chalk.red('🔁 Conexión reemplazada en otro lugar - No reconectar'));
            return false;

        case DisconnectReason.loggedOut:
            console.log(chalk.red('🚪 Sesión cerrada - No reconectar'));
            return false;

        case DisconnectReason.restartRequired:
            console.log(chalk.yellow('♻️ Reinicio requerido - Reconectando...'));
            return true;

        case DisconnectReason.timedOut:
            console.log(chalk.yellow('⏱️ Tiempo de espera agotado - Reconectando...'));
            return true;

        case DisconnectReason.multideviceMismatch:
            console.log(chalk.red('📱 Error de multi-dispositivo - No reconectar'));
            return false;

        default:
            console.log(chalk.yellow(\`⚠️ Desconexión desconocida (\${statusCode}) - Reconectando...\`));
            return true;
    }
}

/**
* Configura el handler de mensajes para el SubBot
* @param {Object} sock - Socket del SubBot
* @param {Object} mainClient - Cliente principal
*/
function setupMessageHandler(sock, mainClient) {
    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;

        try {
            // Importar utilidades
            const { smsg } = require('./lib/message');
            const mainHandler = require('./main.js');

            // Procesar mensaje para el subbot
            const m = smsg(sock, msg);

            console.log(chalk.cyan(\`📨 [SubBot \${sock.ownerId}] Mensaje de: \${m.sender}\`));

            // Ejecutar handler principal con el socket del subbot
            await mainHandler(sock, m);

        } catch (err) {
            console.error(chalk.red(\`❌ [SubBot \${sock.ownerId}] Error en handler:\`, err));
        }
    });

    console.log(chalk.green(\`✅ [SubBot \${sock.ownerId}] Handler de mensajes configurado\`));
}

/**
* Remueve un SubBot de la lista global y limpia recursos
* @param {string} userId - ID del usuario propietario
*/
async function removeSubBot(userId) {
    const index = global.conns.findIndex(conn => conn.ownerId === userId);

    if (index !== -1) {
        const sock = global.conns[index];

        try {
            // Cerrar conexión si está abierta
            if (sock.ws?.readyState === ws.OPEN) {
                await sock.logout();
            }
        } catch (err) {
            console.error(chalk.red('Error cerrando conexión:', err));
        }

        // Remover de la lista
        global.conns.splice(index, 1);

        // Actualizar persistencia
        saveActiveSessions();

        console.log(chalk.yellow(\`🗑️ [SubBot] Removido: \${userId}\`));
    }
}

/**
* Detiene un SubBot específico
* @param {string} userId - ID del usuario propietario
* @param {Object} client - Cliente que solicita la desconexión
* @param {string} chatId - ID del chat para enviar respuesta
*/
async function stopSubBot(userId, client, chatId) {
    const conn = global.conns.find(c => c.ownerId === userId);

    if (!conn) {
        return client.sendMessage(chatId, {
            text: '⚠️ No tienes ningún SubBot activo.'
        });
    }

    try {
        await removeSubBot(userId);

        // Intentar eliminar carpeta de sesión
        const sessionPath = path.join(__dirname, 'sessions', \`subbot_\${userId}\`);
        if (fs.existsSync(sessionPath)) {
            fs.rmSync(sessionPath, { recursive: true, force: true });
        }

        await client.sendMessage(chatId, {
            text: \`✅ *SUBBOT DESCONECTADO*\n\nTu SubBot ha sido eliminado correctamente.\n\nSubBots activos: \${global.conns.length}/\${MAX_SUBBOTS}\`
        });

        console.log(chalk.green(\`✅ [SubBot] Detenido exitosamente: \${userId}\`));

    } catch (error) {
        console.error(chalk.red('Error deteniendo SubBot:', error));
        await client.sendMessage(chatId, {
            text: \`❌ Error al desconectar el SubBot:\n\${error.message}\`
        });
    }
}

/**
* Limpia conexiones inactivas cada cierto tiempo
*/
function startCleanupInterval() {
    setInterval(() => {
        const before = global.conns.length;

        global.conns = global.conns.filter(conn => {
            // Verificar si la conexión está realmente activa
            if (!conn.ws || conn.ws.readyState === ws.CLOSED) {
                console.log(chalk.yellow(\`🧹 [Cleanup] Removiendo conexión inactiva: \${conn.ownerId}\`));
                return false;
            }
            return true;
        });

        const removed = before - global.conns.length;
        if (removed > 0) {
            console.log(chalk.cyan(\`🧹 [Cleanup] Limpiadas \${removed} conexiones inactivas\`));
            saveActiveSessions();
        }
    }, 60000); // Cada 60 segundos
}

/**
* Guarda las sesiones activas en un archivo JSON
*/
function saveActiveSessions() {
    try {
        const sessionsDir = path.join(__dirname, 'sessions');
        if (!fs.existsSync(sessionsDir)) {
            fs.mkdirSync(sessionsDir, { recursive: true });
        }

        const activeSessions = global.conns.map(conn => ({
            ownerId: conn.ownerId,
            ownerJid: conn.ownerJid,
            sessionPath: conn.sessionPath,
            startTime: conn.startTime,
            isActive: conn.ws?.readyState === ws.OPEN
        }));

        fs.writeFileSync(
            path.join(sessionsDir, 'active_sessions.json'),
            JSON.stringify(activeSessions, null, 2)
        );

    } catch (err) {
        console.error(chalk.red('Error guardando sesiones activas:', err));
    }
}

/**
* Restaura las sesiones guardadas al iniciar
* @param {Object} mainClient - Cliente principal para notificaciones
*/
async function restoreSessions(mainClient) {
    try {
        const sessionsFile = path.join(__dirname, 'sessions', 'active_sessions.json');

        if (!fs.existsSync(sessionsFile)) {
            console.log(chalk.yellow('ℹ️ No hay sesiones guardadas para restaurar'));
            return;
        }

        const sessions = JSON.parse(fs.readFileSync(sessionsFile, 'utf-8'));
        console.log(chalk.cyan(\`🔄 Restaurando \${sessions.length} sesiones...\`));

        for (const session of sessions) {
            // Solo restaurar si la carpeta de sesión existe
            if (fs.existsSync(session.sessionPath)) {
                try {
                    await createSubBot({
                        client: mainClient,
                        m: { sender: session.ownerJid, chat: session.ownerJid },
                        userName: session.ownerId,
                        useCode: false
                    });
                } catch (err) {
                    console.error(chalk.red(\`Error restaurando sesión \${session.ownerId}:\`, err));
                }
            }
        }

        console.log(chalk.green('✅ Sesiones restauradas'));

    } catch (err) {
        console.error(chalk.red('Error restaurando sesiones:', err));
    }
}

// Iniciar limpieza automática
startCleanupInterval();

module.exports = {
    createSubBot,
    stopSubBot,
    removeSubBot,
    restoreSessions
};
