const fs = require('fs')
const path = require('path')

module.exports = async (sock, m, commands) => {
    const msg = m.messages[0]
    if (!msg.message || msg.key.fromMe) return
    
    const from = msg.key.remoteJid
    const text = msg.message.conversation || msg.message.extendedTextMessage?.text || ''
    const prefix = '.'
    
    if (!text.startsWith(prefix)) return
    
    const args = text.slice(prefix.length).trim().split(/ +/)
    const command = args.shift().toLowerCase()
    
    // --- LÓGICA DEL MENÚ CON TAGS ---
    if (command === 'menu' || command === 'help') {
        // Definimos el orden de las categorías
        const tags = {
            'main': '🏠 PRINCIPAL',
            'eco': '💰 ECONOMÍA',
            'game': '🎮 JUEGOS',
            'owner': '👑 OWNER'
        }

        let menu = `┏━━〖 *MAIN MENU* 〗━━┓\n┃\n`
        
        for (const [tag, name] of Object.entries(tags)) {
            // Filtramos comandos que pertenecen a esta categoría
            let categoryCmds = Object.values(commands).filter(cmd => cmd.tag === tag)
            
            if (categoryCmds.length > 0) {
                menu += `┣━━〖 *${name}* 〗\n`
                categoryCmds.forEach(cmd => {
                    menu += `┃ ➢ ${prefix}${cmd.command[0]}\n`
                })
                menu += `┃\n`
            }
        }
        menu += `┗━━━━━━━━━━━━━━┛`
        return sock.sendMessage(from, { text: menu }, { quoted: msg })
    }

    // --- EJECUCIÓN DE COMANDOS ---
    const cmd = Object.values(commands).find(c => c.command.includes(command))
    if (cmd) {
        try {
            await cmd.run(sock, m, { args, text, prefix })
        } catch (e) {
            console.error(e)
        }
    }
          }
