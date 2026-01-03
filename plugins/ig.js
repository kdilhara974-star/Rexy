const axios = require("axios");
const { cmd } = require("../command");

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

// Reply cache (prevents lag)
const igReplyCache = new Map();

cmd({
    pattern: "ig",
    alias: ["insta", "instagram"],
    react: "📽️",
    desc: "Download Instagram videos & audio",
    category: "download",
    filename: __filename
}, async (conn, m, store, { from, q, reply }) => {
    try {
        if (!q || !q.startsWith("http")) {
            return reply("*❌ Please provide a valid Instagram link*");
        }

        await conn.sendMessage(from, { react: { text: "📽️", key: m.key } });

        const apiUrl = `https://api-aswin-sparky.koyeb.app/api/downloader/igdl?url=${encodeURIComponent(q)}`;
        const { data } = await axios.get(apiUrl);

        if (!data?.status || !data.data?.length) {
            return reply("*❌ Failed to fetch Instagram media*");
        }

        const media = data.data[0];

        const caption = `
📽️ *RANUMITHA-X-MD INSTAGRAM DOWNLOADER* 📽️

📑 *File type:* ${media.type.toUpperCase()}
🔗 *Link:* ${q}

💬 *Reply with your choice:*

 1️⃣ Video Type 🎥
 2️⃣ Audio only 🎶

> © Powered by 𝗥𝗔𝗡𝗨𝗠𝗜𝗧𝗛𝗔-𝗫-𝗠𝗗 🌛`;

        const sentMsg = await conn.sendMessage(
            from,
            {
                image: { url: media.thumbnail },
                caption
            },
            { quoted: fakevCard }
        );

        // Store reply data (NO LAG)
        igReplyCache.set(sentMsg.key.id, {
            from,
            media
        });

        // Auto clear cache after 2 minutes
        setTimeout(() => igReplyCache.delete(sentMsg.key.id), 120000);

    } catch (e) {
        console.log("Instagram Plugin Error:", e);
        reply("*❌ Error occurred*");
    }
});

// ONE GLOBAL LISTENER (FAST)
cmd({
    on: "text"
}, async (conn, m) => {
    try {
        const replyId = m.message?.extendedTextMessage?.contextInfo?.stanzaId;
        if (!replyId) return;

        const data = igReplyCache.get(replyId);
        if (!data) return;

        const text = m.message.conversation || m.message.extendedTextMessage.text;
        const { from, media } = data;

        await conn.sendMessage(from, { react: { text: "⬇️", key: m.key } });

        if (text.trim() === "1") {
            if (media.type !== "video") {
                return conn.sendMessage(from, { text: "*❌ No video found*" }, { quoted: m });
            }

            await conn.sendMessage(from, { react: { text: "⬆️", key: m.key } });

            await conn.sendMessage(
                from,
                {
                    video: { url: media.url },
                    mimetype: "video/mp4"
                },
                { quoted: m }
            );

        } else if (text.trim() === "2") {
            await conn.sendMessage(from, { react: { text: "⬆️", key: m.key } });

            await conn.sendMessage(
                from,
                {
                    audio: { url: media.url },
                    mimetype: "audio/mp4",
                    ptt: false
                },
                { quoted: m }
            );

        } else {
            return conn.sendMessage(from, { text: "*❌ Invalid option*" }, { quoted: m });
        }

        await conn.sendMessage(from, { react: { text: "✔️", key: m.key } });
        igReplyCache.delete(replyId);

    } catch (e) {
        console.log("IG Reply Error:", e);
    }
});
