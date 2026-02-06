const axios = require('axios');
const yts = require('yt-search');
const { cmd } = require('../command');

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
    pattern: "video",
    alias: "ytvideo",
    react: "🎬",
    desc: "Download YouTube MP4",
    category: "download",
    use: ".video <query>",
    filename: __filename
}, async (conn, mek, m, { from, reply, q }) => {
    try {
        // 1️⃣ Determine the query (text or replied message)
        let query = q?.trim();

        if (!query && m?.quoted) {
            query =
                m.quoted.message?.conversation ||
                m.quoted.message?.extendedTextMessage?.text ||
                m.quoted.text;
        }

        if (!query) {
            return reply("⚠️ Please provide a video name or YouTube link (or reply to a message).");
        }

        // 2️⃣ Convert Shorts link to normal link
        if (query.includes("youtube.com/shorts/")) {
            const videoId = query.split("/shorts/")[1].split(/[?&]/)[0];
            query = `https://www.youtube.com/watch?v=${videoId}`;
        }

        // 3️⃣ YouTube search (if query is not a URL)
        let ytUrl = query;
        let data = null;
        
        if (!query.includes("youtube.com") && !query.includes("youtu.be")) {
            const search = await yts(query);
            if (!search.videos.length) return reply("*❌ No results found.*");
            data = search.videos[0];
            ytUrl = data.url;
        } else {
            // If it's a direct URL, get video info
            const search = await yts({ videoId: ytUrl.split('v=')[1]?.split('&')[0] || ytUrl.split('/').pop() });
            data = search;
        }

        // 4️⃣ Movanest API endpoint - Updated with different quality options
        const movanestAPI = (url, quality) => {
            return `https://www.movanest.xyz/v2/ytdl2?input=${encodeURIComponent(url)}&format=video&quality=${quality}`;
        };

        // 5️⃣ Quality options for Movanest API
        const qualityOptions = {
            "144p": "144p",
            "240p": "240p", 
            "360p": "360p",
            "480p": "480p",
            "720p": "720p",
            "1080p": "1080p"
        };

        // 6️⃣ Send selection menu
        const caption = `
*📽️ RANUMITHA-X-MD VIDEO DOWNLOADER 🎥*

*🎵 Title:* ${data?.title || "YouTube Video"}
${data?.timestamp ? `*⏱️ Duration:* ${data.timestamp}` : ''}
${data?.ago ? `*📆 Uploaded:* ${data.ago}` : ''}
${data?.views ? `*📊 Views:* ${data.views}` : ''}
*🔗 Link:* ${ytUrl}

🔢 *Select Quality (Reply with number):*

1️⃣ *Video Format (MP4)*
   1.1 - 144p Quality
   1.2 - 240p Quality  
   1.3 - 360p Quality
   1.4 - 480p Quality
   1.5 - 720p Quality
   1.6 - 1080p Quality

2️⃣ *Document Format (MP4)*
   2.1 - 144p Quality
   2.2 - 240p Quality
   2.3 - 360p Quality
   2.4 - 480p Quality
   2.5 - 720p Quality
   2.6 - 1080p Quality

> © Powered by 𝗥𝗔𝗡𝗨𝗠𝗜𝗧𝗛𝗔-𝗫-𝗠𝗗 🌛`;

        const sentMsg = await conn.sendMessage(from, {
            image: { url: data?.thumbnail || "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg" },
            caption
        }, { quoted: fakevCard });

        const messageID = sentMsg.key.id;

        // 7️⃣ Listen for user replies
        const replyHandler = async (msgData) => {
            const receivedMsg = msgData.messages[0];
            if (!receivedMsg?.message) return;

            const receivedText =
                receivedMsg.message.conversation ||
                receivedMsg.message.extendedTextMessage?.text;

            const senderID = receivedMsg.key.remoteJid;
            const isReplyToBot =
                receivedMsg.message.extendedTextMessage?.contextInfo?.stanzaId === messageID;

            if (isReplyToBot && senderID === from) {
                // Remove event listener to prevent multiple triggers
                conn.ev.off("messages.upsert", replyHandler);

                let selectedQuality, isDocument = false;
                let qualityKey = "";

                switch (receivedText.trim()) {
                    case "1.1": selectedQuality = "144p"; qualityKey = "144p"; break;
                    case "1.2": selectedQuality = "240p"; qualityKey = "240p"; break;
                    case "1.3": selectedQuality = "360p"; qualityKey = "360p"; break;
                    case "1.4": selectedQuality = "480p"; qualityKey = "480p"; break;
                    case "1.5": selectedQuality = "720p"; qualityKey = "720p"; break;
                    case "1.6": selectedQuality = "1080p"; qualityKey = "1080p"; break;
                    case "2.1": selectedQuality = "144p"; qualityKey = "144p"; isDocument = true; break;
                    case "2.2": selectedQuality = "240p"; qualityKey = "240p"; isDocument = true; break;
                    case "2.3": selectedQuality = "360p"; qualityKey = "360p"; isDocument = true; break;
                    case "2.4": selectedQuality = "480p"; qualityKey = "480p"; isDocument = true; break;
                    case "2.5": selectedQuality = "720p"; qualityKey = "720p"; isDocument = true; break;
                    case "2.6": selectedQuality = "1080p"; qualityKey = "1080p"; isDocument = true; break;
                    default:
                        await conn.sendMessage(senderID, { 
                            text: "*❌ Invalid option! Please reply with a valid number (e.g., 1.1, 2.3, etc.)*" 
                        }, { quoted: receivedMsg });
                        return;
                }

                try {
                    // React ⬇️ when download starts
                    await conn.sendMessage(senderID, { 
                        react: { text: '⬇️', key: receivedMsg.key } 
                    });

                    // Send processing message
                    await conn.sendMessage(senderID, { 
                        text: `*📥 Downloading ${selectedQuality} quality... Please wait!*` 
                    }, { quoted: receivedMsg });

                    // Call Movanest API
                    const apiUrl = movanestAPI(ytUrl, qualityOptions[qualityKey]);
                    const { data: apiRes } = await axios.get(apiUrl);

                    if (!apiRes?.status || !apiRes?.results?.success) {
                        await conn.sendMessage(senderID, { react: { text: '❌', key: receivedMsg.key } });
                        await conn.sendMessage(senderID, { 
                            text: `❌ Unable to download ${selectedQuality} version. Try another quality!` 
                        }, { quoted: receivedMsg });
                        return;
                    }

                    const downloadUrl = apiRes.results.recommended.dlurl;
                    const videoTitle = apiRes.results.title || data?.title || "YouTube_Video";
                    
                    // React ⬆️ before uploading
                    await conn.sendMessage(senderID, { 
                        react: { text: '⬆️', key: receivedMsg.key } 
                    });

                    // Send uploading message
                    await conn.sendMessage(senderID, { 
                        text: `*📤 Uploading ${selectedQuality} quality...*` 
                    }, { quoted: receivedMsg });

                    if (isDocument) {
                        await conn.sendMessage(senderID, {
                            document: { url: downloadUrl },
                            mimetype: "video/mp4",
                            fileName: `${videoTitle.replace(/[^\w\s]/gi, '')}_${qualityKey}.mp4`
                        }, { quoted: receivedMsg });
                    } else {
                        await conn.sendMessage(senderID, {
                            video: { url: downloadUrl },
                            mimetype: "video/mp4",
                            caption: `*${videoTitle}*\n*Quality:* ${selectedQuality}\n*Format:* MP4`,
                            ptt: false,
                        }, { quoted: receivedMsg });
                    }

                    // React ✅ after upload complete
                    await conn.sendMessage(senderID, { 
                        react: { text: '✅', key: receivedMsg.key } 
                    });

                } catch (error) {
                    console.error("Download Error:", error);
                    await conn.sendMessage(senderID, { react: { text: '❌', key: receivedMsg.key } });
                    await conn.sendMessage(senderID, { 
                        text: "❌ Download failed! The video might be restricted or the API is currently unavailable." 
                    }, { quoted: receivedMsg });
                }
            }
        };

        // Add event listener for replies
        conn.ev.on("messages.upsert", replyHandler);

        // Set timeout to remove listener after 2 minutes
        setTimeout(() => {
            conn.ev.off("messages.upsert", replyHandler);
        }, 120000);

    } catch (error) {
        console.error("Video Command Error:", error);
        reply("❌ An error occurred while processing your request. Please try again later.");
    }
});
