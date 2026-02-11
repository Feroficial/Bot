const { default: makeWASocket, useMultiFileAuthState, delay, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const pino = require('pino');
const handler = require('./handler.js'); // Importamos el handler

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('sesion_auth');
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        auth: state,
        browser: ["Ubuntu", "Chrome", "20.0.04"]
    });

    // Vinculación por código
    if (!sock.authState.creds.registered) {
        const phoneNumber = "50497305037"; // Tu número
        await delay(5000);
        try {
            const code = await sock.requestPairingCode(phoneNumber);
            console.log(`\n🔗 TU CÓDIGO DE VINCULACIÓN: ${code}\n`);
        } catch (e) {
            console.log('❌ Error al pedir código:', e.message);
        }
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (u) => {
        if (u.connection === 'open') console.log('✅ BOT ECONOMÍA ONLINE');
        if (u.connection === 'close') startBot();
    });

    // El puente: Recibe mensaje y lo manda al handler
    sock.ev.on('messages.upsert', async (m) => {
        await handler(sock, m);
    });
}

startBot();
