const { proto, getContentType } = require('@whiskeysockets/baileys');

module.exports = async (sock, m) => {
    try {
        if (!m.messages) return;
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        // --- CONFIGURACIÓN DE VARIABLES ---
        const from = msg.key.remoteJid;
        const type = getContentType(msg.message);
        const text = (type === 'conversation') ? msg.message.conversation : 
                     (type === 'extendedTextMessage') ? msg.message.extendedTextMessage.text : 
                     (type === 'imageMessage') ? msg.message.imageMessage.caption : 
                     (type === 'videoMessage') ? msg.message.videoMessage.caption : '';
        
        const prefix = '.'; // Puedes cambiar tu prefijo aquí
        const isCmd = text.startsWith(prefix);
        const command = isCmd ? text.slice(prefix.length).trim().split(/ +/).shift().toLowerCase() : null;
        const args = text.trim().split(/ +/).slice(1);
        const sender = msg.key.participant || from;

        // Función para responder más fácil
        const reply = (txt) => sock.sendMessage(from, { text: txt }, { quoted: msg });

        if (!isCmd) return;

        // --- SISTEMA DE COMANDOS (AQUÍ EMPIEZAS TÚ) ---
        switch (command) {
            case 'ping':
                reply('¡Pong! 🏓 El bot está activo.');
                break;

            case 'test':
                reply('Probando... el handler funciona correctamente. ✅');
                break;

            // Aquí irás agregando tus plugins o llamando a tus archivos externos
            default:
                if (isCmd) console.log(`[COMANDO DESCONOCIDO]: ${command} de ${sender}`);
        }

    } catch (err) {
        console.error('Error en el handler:', err);
    }
};
