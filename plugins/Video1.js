const { cmd } = require('../command');
const yts = require('yt-search');
const axios = require('axios');

cmd({
    pattern: "video1",
    react: "🎬",
    desc: "Download YouTube MP4",
    category: "download",
    use: ".video <query>",
    filename: __filename
}, async (conn, mek, m, { from, reply, q }) => {
    try {
        if (!q) return reply("❓ *Please provide a video name or link!*");

        const search = await yts(q);
        if (!search.videos.length) return reply("❌ No results found.");

        const data = search.videos[0];
        const ytUrl = data.url;

        const formats = {
            "240p": `https://api.nekolabs.my.id/downloader/youtube/v1?url=${encodeURIComponent(ytUrl)}&format=240`,
            "360p": `https://api.nekolabs.my.id/downloader/youtube/v1?url=${encodeURIComponent(ytUrl)}&format=360`,
            "480p": `https://api.nekolabs.my.id/downloader/youtube/v1?url=${encodeURIComponent(ytUrl)}&format=480`,
            "720p": `https://api.nekolabs.my.id/downloader/youtube/v1?url=${encodeURIComponent(ytUrl)}&format=720`
        };

        const caption = `
🎥 *Video Downloader*

📑 *Title:* ${data.title}
⏱️ *Duration:* ${data.timestamp}
📆 *Uploaded:* ${data.ago}
📊 *Views:* ${data.views}

🔢 *Reply Number*

🎥 Video
1.1 240p | 1.2 360p | 1.3 480p | 1.4 720p

📁 Document
2.1 240p | 2.2 360p | 2.3 480p | 2.4 720p
`;

        const sentMsg = await conn.sendMessage(from, {
            image: { url: data.thumbnail },
            caption
        }, { quoted: m });

        const messageID = sentMsg.key.id;

        conn.ev.on("messages.upsert", async ({ messages }) => {
            const msg = messages[0];
            if (!msg?.message) return;

            const text =
                msg.message.conversation ||
                msg.message.extendedTextMessage?.text;

            const isReply =
                msg.message.extendedTextMessage?.contextInfo?.stanzaId === messageID;

            if (!isReply) return;

            let quality, isDoc = false;

            switch (text.trim()) {
                case "1.1": quality = "240p"; break;
                case "1.2": quality = "360p"; break;
                case "1.3": quality = "480p"; break;
                case "1.4": quality = "720p"; break;

                case "2.1": quality = "240p"; isDoc = true; break;
                case "2.2": quality = "360p"; isDoc = true; break;
                case "2.3": quality = "480p"; isDoc = true; break;
                case "2.4": quality = "720p"; isDoc = true; break;

                default:
                    return reply("❌ Invalid option");
            }

            // ⬇️ Download start
            await conn.sendMessage(from, { react: { text: "⬇️", key: msg.key } });

            const { data: api } = await axios.get(formats[quality]);
            if (!api?.success) return reply("❌ Download failed");

            // ⬆️ Upload start
            await conn.sendMessage(from, { react: { text: "⬆️", key: msg.key } });

            if (isDoc) {
                await conn.sendMessage(from, {
                    document: { url: api.result.downloadUrl },
                    mimetype: "video/mp4",
                    fileName: `${api.result.title}.mp4`
                }, { quoted: msg });
            } else {
                await conn.sendMessage(from, {
                    video: { url: api.result.downloadUrl },
                    mimetype: "video/mp4"
                }, { quoted: msg });
            }

            // ✔️ Sent complete
            await conn.sendMessage(from, { react: { text: "✔️", key: msg.key } });
        });

    } catch (e) {
        console.log(e);
        reply("❌ Error occurred");
    }
});
