const config = require('../config');
const { cmd, commands } = require('../command');
const { runtime } = require('../lib/functions');
const axios = require('axios');
const os = require("os");

// Fake ChatGPT vCard
const fakevCard = {
    key: {
        fromMe: false,
        participant: "0@s.whatsapp.net",
        remoteJid: "status@broadcast"
    },
    message: {
        contactMessage: {
            displayName: "© Mr Hiruka",
            vcard: `BEGIN:VCARD
VERSION:3.0
FN:Meta
ORG:META AI;
TEL;type=CELL;type=VOICE;waid=94762095304:+94762095304
END:VCARD`
        }
    }
};

cmd({
    pattern: "alive",
    alias: ["hyranu", "ranu", "status", "a"],
    react: "🌝",
    desc: "Check bot online or no.",
    category: "main",
    filename: __filename
},
async (robin, mek, m, {
    from, pushname, quoted, reply, sender
}) => {
    try {
        await robin.sendPresenceUpdate('recording', from);

        // Voice Note
        await robin.sendMessage(from, {
            audio: {
                url: "https://github.com/Ranumithaofc/RANU-FILE-S-/raw/refs/heads/main/Audio/Ranumitha-x-md-Alive-org.opus"
            },
            mimetype: 'audio/mp4',
            ptt: true
        }, { quoted: fakevCard });

        // Get Sri Lankan Date & Time
        const options = { timeZone: 'Asia/Colombo', hour12: true };
        const now = new Date().toLocaleString('en-US', options);
        const date = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo' }); // YYYY-MM-DD
        const time = new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Colombo' });

        // Stylish Alive Caption
        const status = `👋 𝐇𝐞𝐥𝐥𝐨 ${pushname}, 𝐈 𝐚𝐦 𝐚𝐥𝐢𝐯𝐞 𝐧𝐨𝐰 !!

*╭─〔 DATE & TIME INFO 〕─◉*
*│*📅 *\`Date:\`* ${date}
*│*⏰ *\`Time:\`* ${time}
*╰────────────⊷*

*╭─〔 ALIVE STATUS INFO 〕─◉*
*│*
*│*🐼 *\`Bot\`*: 𝐑𝐀𝐍𝐔𝐌𝐈𝐓𝐇𝐀-𝐗-𝐌𝐃
*│*🤵‍♂ *\`Owner\`*: ᴴᴵᴿᵁᴷᴬ ᴿᴬᴺᵁᴹᴵᵀᴴᴬ
*│*👤 *\`User\`*: ${pushname}
*│*📟 *\`Uptime\`*: ${runtime(process.uptime())}
*│*⏳ *\`Ram\`*: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)}MB / ${(os.totalmem() / 1024 / 1024).toFixed(2)}MB
*│*🖊 *\`Prefix\`*: [ ${config.PREFIX} ]
*│*🛠 *\`Mode\`*: [ ${config.MODE} ]
*│*🖥 *\`Host\`*: ${os.hostname()}
*│*🌀 *\`Version\`*: ${config.BOT_VERSION}
*╰────────────────⊷*
     
      ☘ ʙᴏᴛ ᴍᴇɴᴜ  - .menu
      🔥 ʙᴏᴛ ꜱᴘᴇᴇᴅ - .ping

> © Powerd by 𝗥𝗔𝗡𝗨𝗠𝗜𝗧𝗛𝗔-𝗫-𝗠𝗗 🌛`;

        // Send Image + Caption
        await robin.sendMessage(from, {
            image: {
                url: "https://raw.githubusercontent.com/Ranumithaofc/RANU-FILE-S-/refs/heads/main/images/GridArt_20250726_193256660.jpg"
            },
            caption: status,
            contextInfo: {
                mentionedJid: [sender],
                forwardingScore: 999,
                isForwarded: false
            }
        }, { quoted: mek });

    } catch (e) {
        console.log("Alive Error:", e);
        reply(`⚠️ Error: ${e.message}`);
    }
});
