const { cmd } = require("../command");
const fetch = require("node-fetch");
const fs = require("fs");
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");

// Fake vCard
const fakevCard = {
  key: {
    fromMe: false,
    participant: "0@s.whatsapp.net",
    remoteJid: "status@broadcast",
  },
  message: {
    contactMessage: {
      displayName: "© Mr Hiruka",
      vcard: `BEGIN:VCARD
VERSION:3.0
FN:Meta
ORG:META AI;
TEL;type=CELL;type=VOICE;waid=94762095304:+94762095304
END:VCARD`,
    },
  },
};

cmd(
  {
    pattern: "song2",
    alias: ["play2"],
    react: "🎵",
    desc: "Download YouTube song (Audio)",
    category: "download",
    use: ".song <song name | yt link>",
    filename: __filename,
  },

  async (conn, mek, m, { from, reply, q }) => {
    try {
      let query = q?.trim();

      // reply කරලා use කරද්දී
      if (!query && m?.quoted) {
        query =
          m.quoted.message?.conversation ||
          m.quoted.message?.extendedTextMessage?.text ||
          m.quoted.text;
      }

      if (!query) {
        return reply("⚠️ Song name ekak hari YouTube link ekak hari denna.");
      }

      // Shorts → normal YT link
      if (query.includes("youtube.com/shorts/")) {
        const id = query.split("/shorts/")[1].split(/[?&]/)[0];
        query = `https://www.youtube.com/watch?v=${id}`;
      }

      // ✅ UPDATED API URL (ඔයා ඉල්ලපු එක)
      const apiUrl = `https://api.nekolabs.my.id/downloader/youtube/play/v1?q=${encodeURIComponent(q)}`;
      const res = await fetch(apiUrl);
      const data = await res.json();

      if (!data?.success || !data?.result?.downloadUrl) {
        return reply("❌ Song not found / API error.");
      }

      const meta = data.result.metadata;
      const dlUrl = data.result.downloadUrl;

      // thumbnail
      let thumb;
      try {
        const t = await fetch(meta.cover);
        thumb = Buffer.from(await t.arrayBuffer());
      } catch {
        thumb = null;
      }

      const caption = `
🎶 *RANUMITHA-X-MD SONG DOWNLOADER* 🎶

📑 *Title:* ${meta.title}
📡 *Channel:* ${meta.channel}
⏱ *Duration:* ${meta.duration}
🌐 *Url:* ${meta.url}

🔽 *Reply with number:*

1️⃣ Audio 🎵  
2️⃣ Document 📁  
3️⃣ Voice Note 🎤  

> © Powered by RANUMITHA-X-MD 🌛`;

      const sent = await conn.sendMessage(
        from,
        { image: thumb, caption },
        { quoted: fakevCard }
      );

      const msgId = sent.key.id;

      // reply listener
      conn.ev.on("messages.upsert", async (u) => {
        try {
          const msg = u.messages[0];
          if (!msg?.message) return;

          const text =
            msg.message.conversation ||
            msg.message.extendedTextMessage?.text;

          const isReply =
            msg.message?.extendedTextMessage?.contextInfo?.stanzaId === msgId;

          if (!isReply) return;

          const choice = text.trim();

          const safeTitle = meta.title
            .replace(/[\\/:*?"<>|]/g, "")
            .slice(0, 80);

          const tempMp3 = path.join(__dirname, `../temp/${Date.now()}.mp3`);
          const tempOpus = path.join(__dirname, `../temp/${Date.now()}.opus`);

          let sendData;

          // 1️⃣ Audio
          if (choice === "1") {
            sendData = {
              audio: { url: dlUrl },
              mimetype: "audio/mpeg",
              fileName: `${safeTitle}.mp3`,
            };

          // 2️⃣ Document
          } else if (choice === "2") {
            sendData = {
              document: { url: dlUrl },
              mimetype: "audio/mpeg",
              fileName: `${safeTitle}.mp3`,
              caption: meta.title,
            };

          // 3️⃣ Voice Note
          } else if (choice === "3") {
            const r = await fetch(dlUrl);
            fs.writeFileSync(tempMp3, Buffer.from(await r.arrayBuffer()));

            await new Promise((res, rej) => {
              ffmpeg(tempMp3)
                .audioCodec("libopus")
                .format("opus")
                .audioBitrate("64k")
                .save(tempOpus)
                .on("end", res)
                .on("error", rej);
            });

            sendData = {
              audio: fs.readFileSync(tempOpus),
              mimetype: "audio/ogg; codecs=opus",
              ptt: true,
            };

            fs.unlinkSync(tempMp3);
            fs.unlinkSync(tempOpus);
          } else {
            return reply("❌ Invalid choice!");
          }

          await conn.sendMessage(from, sendData, { quoted: mek });
        } catch (e) {
          console.error("reply error:", e);
        }
      });
    } catch (e) {
      console.error("song cmd error:", e);
      reply("⚠️ Error occurred!");
    }
  }
);
