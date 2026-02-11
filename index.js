const { default: makeWASocket, useMultiFileAuthState, delay, fetchLatestBaileysVersion, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');

// --- BASE DE DATOS ---
const DB_PATH = './database.json';
let db = fs.existsSync(DB_PATH) ? JSON.parse(fs.readFileSync(DB_PATH)) : {};
const saveData = () => fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));

// Prefijo de comandos
const PREFIX = '.';

// Inicializar usuario si no existe (Separación individual)
const checkUser = (id) => {
    if (!id) return;
    if (!db[id]) {
        db[id] = {
            cartera: 500,
            banco: 0,
            lastDaily: 0,
            lastWork: 0,
            lastCrime: 0,
            name: 'Usuario Nuevo',
            registro: Date.now()
        };
        saveData();
    }
};

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        auth: state,
        browser: ["Ubuntu", "Chrome", "20.0.04"]
    });

    // --- VINCULACIÓN POR CÓDIGO ---
    if (!sock.authState.creds.registered) {
        const phoneNumber = "573112852172"; // ⚠️ PON TU NÚMERO AQUÍ (Ej: 5215512345678)
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

    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message) return;

        const from = msg.key.remoteJid;
        const sender = msg.key.participant || from;
        const messageContent = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
        
        if (!messageContent.startsWith(PREFIX)) return;

        const args = messageContent.slice(1).trim().split(/ +/);
        const command = args.shift().toLowerCase();

        checkUser(sender);
        const userData = db[sender];
        const reply = async (text, mentions = []) => {
            await sock.sendMessage(from, { text, mentions }, { quoted: msg });
        };

        // --- COMANDOS ---

        switch (command) {
            case 'help':
case 'menu':
    reply(`🎰 *BOT ECONOMÍA v3.0* 🎰

💰 *GANAR DINERO*
.daily - Bono diario
.work - Trabajar
.slots [cant] - Casino
.bj [cant] - Blackjack
.ruleta [color] [cant]
.coin [cara/cruz] [cant]

🥷 *CRIMEN*
.rob [@user] - Robar a alguien

💳 *BANCO & SOCIAL*
.bal - Ver saldo
.dep [cant|all] - Guardar
.with [cant|all] - Sacar
.pay [@user] [cant] - Regalar
.apostar [@user] [cant] - Duelo

👮 *ADMIN*
.multar [@user] [cant] - (Solo Admin)`);
    break;



            case 'daily':
                if (Date.now() - userData.lastDaily < 86400000) return reply("⏳ Ya reclamaste tu daily hoy.");
                db[sender].cartera += 1500;
                db[sender].lastDaily = Date.now();
                saveData();
                reply("🎁 Recibiste $1500 diarios.");
                break;

            case 'work':
                if (Date.now() - userData.lastWork < 600000) return reply("⏳ Vuelve en 10 min.");
                let gana = Math.floor(Math.random() * 400) + 200;
                db[sender].cartera += gana;
                db[sender].lastWork = Date.now();
                saveData();
                reply(`🔨 Ganaste $${gana} trabajando.`);
                break;

            case 'bal':
            case 'balance':
                reply(`👤 *PERFIL*\n👛 Cartera: $${userData.cartera}\n🏦 Banco: $${userData.banco}\n💰 Total: $${userData.cartera + userData.banco}`);
                break;

            case 'dep':
                let cantD = args[0] === 'all' ? userData.cartera : parseInt(args[0]);
                if (!cantD || cantD <= 0 || cantD > userData.cartera) return reply("❌ Cantidad inválida.");
                db[sender].cartera -= cantD;
                db[sender].banco += cantD;
                saveData();
                reply(`🏦 Depositaste $${cantD}.`);
                break;

            case 'with':
                let cantW = args[0] === 'all' ? userData.banco : parseInt(args[0]);
                if (!cantW || cantW <= 0 || cantW > userData.banco) return reply("❌ Cantidad inválida.");
                db[sender].banco -= cantW;
                db[sender].cartera += cantW;
                saveData();
                reply(`💰 Retiraste $${cantW}.`);
                break;

            case 'pay':
                let targetP = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
                let montoP = parseInt(args[1]);
                if (!targetP || isNaN(montoP) || montoP <= 0 || userData.cartera < montoP) return reply("❌ Uso: .pay @user 500");
                checkUser(targetP);
                db[sender].cartera -= montoP;
                db[targetP].cartera += montoP;
                saveData();
                reply(`💸 Enviaste $${montoP} a @${targetP.split('@')[0]}`, [targetP]);
                break;

            case 'apostar':
                let targetA = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
                let montoA = parseInt(args[1]);
                if (!targetA || isNaN(montoA) || montoA <= 0 || targetA === sender) return reply("❌ Uso: .apostar @user 100");
                checkUser(targetA);
                if (userData.cartera < montoA || db[targetA].cartera < montoA) return reply("❌ Uno de los dos no tiene suficiente dinero.");
                let win = Math.random() > 0.5 ? sender : targetA;
                let los = win === sender ? targetA : sender;
                db[win].cartera += montoA;
                db[los].cartera -= montoA;
                saveData();
                reply(`⚔️ *RESULTADO*\n🏆 Ganador: @${win.split('@')[0]}\n💀 Perdedor: @${los.split('@')[0]}`, [win, los]);
                break;

            case 'slots':
                let apuesta = parseInt(args[0]);
                if (!apuesta || apuesta <= 0 || apuesta > userData.cartera) return reply("❌ Apuesta inválida.");
                const items = ['🍒', '💎', '🎰', '🔔'];
                const res = [items[Math.floor(Math.random()*4)], items[Math.floor(Math.random()*4)], items[Math.floor(Math.random()*4)]];
                let msgS = `🎰 | ${res.join(' | ')} |\n\n`;
                if (res[0] === res[1] && res[1] === res[2]) {
                    db[sender].cartera += apuesta * 5;
                    msgS += `🔥 Ganaste $${apuesta * 5}`;
                } else {
                    db[sender].cartera -= apuesta;
                    msgS += `💸 Perdiste $${apuesta}`;
                }
                saveData();
                reply(msgS);
                break;

            case 'blackjack':
            case 'bj':
                let apuestaBJ = parseInt(args[0]);
                if (!apuestaBJ || apuestaBJ <= 0 || apuestaBJ > userData.cartera) return reply("❌ Apuesta una cantidad válida.");
                let player = Math.floor(Math.random() * 12) + 12;
                let dealer = Math.floor(Math.random() * 12) + 12;
                let resBJ = `🃏 *BLACKJACK* 🃏\n\n👤 Tu mano: ${player}\n🏛️ Casa: ${dealer}\n\n`;
                if (player > 21) { db[sender].cartera -= apuestaBJ; resBJ += "💀 Te pasaste. Perdiste."; }
                else if (dealer > 21 || player > dealer) { db[sender].cartera += apuestaBJ; resBJ += "🔥 ¡Ganaste!"; }
                else if (player === dealer) { resBJ += "🤝 Empate."; }
                else { db[sender].cartera -= apuestaBJ; resBJ += "💸 Perdiste."; }
                saveData();
                reply(resBJ);
                break;

            case 'ruleta':
                let eleccionR = args[0]?.toLowerCase();
                let apuestaR = parseInt(args[1]);
                if (!['rojo', 'negro'].includes(eleccionR) || isNaN(apuestaR) || apuestaR > userData.cartera) return reply("❌ Uso: .ruleta rojo 100");
                let resR = ['rojo', 'negro'][Math.floor(Math.random() * 2)];
                db[sender].cartera += (eleccionR === resR) ? apuestaR : -apuestaR;
                saveData();
                reply(`🎡 Cayó en: *${resR.toUpperCase()}* 🎡\n${eleccionR === resR ? '✅ ¡Ganaste!' : '❌ Perdiste.'}`);
                break;

            case 'coin':
                let ladoC = args[0]?.toLowerCase();
                let apuestaC = parseInt(args[1]);
                if (!['cara', 'cruz'].includes(ladoC) || isNaN(apuestaC) || apuestaC > userData.cartera) return reply("❌ Uso: .coin cara 100");
                let suerteC = ['cara', 'cruz'][Math.floor(Math.random() * 2)];
                db[sender].cartera += (ladoC === suerteC) ? apuestaC : -apuestaC;
                saveData();
                reply(`🪙 Cayó en: *${suerteC.toUpperCase()}* 🪙\n${ladoC === suerteC ? '✨ ¡Ganaste!' : '☁️ Perdiste.'}`);
                break;

            case 'rob':
            case 'robar':
                let victima = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
                if (!victima || victima === sender) return reply("❌ Menciona a alguien para robarle.");
                checkUser(victima);
                if (Date.now() - (userData.lastRob || 0) < 300000) return reply("⏳ Espera 5 min para volver a robar.");
                if (db[victima].cartera < 200) return reply("❌ La víctima es muy pobre.");
                userData.lastRob = Date.now();
                if (Math.random() > 0.6) {
                    let botin = Math.floor(db[victima].cartera * 0.3);
                    db[victima].cartera -= botin; db[sender].cartera += botin;
                    reply(`🥷 ¡ÉXITO! Robaste $${botin} a @${victima.split('@')[0]}`, [victima]);
                } else {
                    db[sender].cartera -= 500;
                    reply(`👮 ¡MULTA! Te atraparon y pagaste $500.`);
                }
                saveData();
                break;

        }
    });
}
startBot();

