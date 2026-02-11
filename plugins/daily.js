let handler = async (sock, m, { db }) => {
    const from = m.key.remoteJid;
    const sender = m.key.participant || from;
    const user = db[sender];

    // 24 horas en milisegundos
    const cooldown = 86400000; 
    const timePassed = Date.now() - (user.lastDaily || 0);

    if (timePassed < cooldown) {
        const remaining = cooldown - timePassed;
        const hours = Math.floor(remaining / 3600000);
        const minutes = Math.floor((remaining % 3600000) / 60000);
        
        return sock.sendMessage(from, { 
            text: `⏳ Ya reclamaste tu recompensa diaria.\n\nRegresa en: *${hours}h ${minutes}m*` 
        }, { quoted: m.messages[0] });
    }

    // Recompensa (puedes cambiar el monto)
    const premio = 1500;
    user.cartera += premio;
    user.lastDaily = Date.now();

    const texto = `
🎁 *RECOMPENSA DIARIA* 🎁
━━━━━━━━━━━━━━━━━━
¡Has reclamado tu bono de hoy!

💰 *Recibiste:* $${premio}
👛 *Total en cartera:* $${user.cartera}

_¡Vuelve mañana para más!_`.trim();

    await sock.sendMessage(from, { text: texto }, { quoted: m.messages[0] });
};

// --- CONFIGURACIÓN DEL PLUGIN ---
handler.command = ['daily', 'diario']; // Comandos que lo activan
handler.tag = 'eco';                   // Aparecerá en la sección ECONOMÍA del menú
handler.help = 'Reclama tu bono diario';

module.exports = handler;
