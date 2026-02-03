const { cmd } = require("../command");
const fs = require("fs");
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");
const yts = require("yt-search");

// node-fetch (Node 18 සඳහා ආරක්ෂිත)
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

// Fake vCard
const fakevCard = {
  key: {
    fromMe: false,
    participant: "0@s.whatsapp.net",
    remoteJid: "status@broadcast",
  },
  message: {
    contactMessage: {
      displayName: "© RANUMITHA-X-MD",
      vcard: `BEGIN:VCARD
VERSION:3.0
FN:RANUMITHA-X-MD
ORG:SONG DOWNLOADER;
TEL;type=CELL;waid=94762095304:+94762095304
END:VCARD`,
    },
  },
};

// Command
cmd(
  {
    pattern: "song5",
    alias: ["play5"],
    react: "🎵",
    desc: "YouTube song downloader (Audio) via Ominisave API",
    category: "download",
    use: ".song <name or link>",
    filename: __filename,
  },

  async (conn, mek, m, { from, reply, q }) => {
    try {
      // Query ලබාගන්න
      let query = q?.trim();

      if (!query && m?.quoted) {
        query =
          m.quoted.message?.conversation ||
          m.quoted.message?.extendedTextMessage?.text ||
          m.quoted.text;
      }

      if (!query) {
        return reply("⚠️ කරුණාකර ගීතයේ නමක් හෝ YouTube යොමුවක් ලබාදෙන්න.");
      }

      // YouTube Shorts → Regular link
      if (query.includes("youtube.com/shorts/")) {
        const videoId = query.split("/shorts/")[1].split(/[?&]/)[0];
        query = `https://www.youtube.com/watch?v=${videoId}`;
      }

      // යවන්නාගේ ජේඩ් (පරිශීලක අගුල සඳහා)
      const ownerJid = mek.key.participant || mek.key.remoteJid;

      let video;
      let ytUrl;

      // නමක් දුන්නොත් → yt-search
      if (!query.includes("youtube.com") && !query.includes("youtu.be")) {
        const search = await yts(query);
        if (!search.videos.length)
          return reply("❌ ගීතය හමු නොවිණි!");

        video = search.videos[0];
        ytUrl = video.url;
      } 
      // YouTube යොමුවක් දුන්නොත්
      else {
        ytUrl = query;
        const id = query.includes("v=")
          ? query.split("v=")[1].split("&")[0]
          : query.split("/").pop();

        const info = await yts({ videoId: id });
        video = info;
      }

      // Ominisave API
      const apiUrl = `https://ominisave.vercel.app/api/ytmp3?url=${encodeURIComponent(
        ytUrl
      )}`;

      const res = await fetch(apiUrl);
      const data = await res.json();

      if (!data.status || !data.result?.url)
        return reply("❌ ගීතය බාගත කිරීමට අසමත් විය!");

      const { url, filename } = data.result;

      // Temp folder
      const tempDir = path.join(__dirname, "../temp");
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

      const title = video?.title || filename.replace(/\.mp3$/i, "");
      const thumbnail = video?.thumbnail;

      // Caption
      const caption = `
🎶 *RANUMITHA-X-MD SONG DOWNLOADER* 🎶

📑 *Title:* ${title}
📡 *Channel:* ${video?.author?.name || "Unknown"}
⏱ *Duration:* ${video?.timestamp || "N/A"}
🔗 *URL:* ${ytUrl}

🔽 *Reply with your number choice:*

1️⃣ Audio Type 🎵  
2️⃣ Document Type 📁  
3️⃣ Voice Note Type 🎤  

> © Powered by RANUMITHA-X-MD 🌛`;

      // Initial message යවන්න
      const sentMsg = await conn.sendMessage(
        from,
        thumbnail
          ? { image: { url: thumbnail }, caption }
          : { text: caption },
        { quoted: fakevCard }
      );

      const messageID = sentMsg.key.id;

      // Reply Handler (එක් අවස්ථාවකට පමණි)
      const handler = async (msgUpdate) => {
        try {
          const mekInfo = msgUpdate.messages[0];
          if (!mekInfo?.message) return;

          // පරිශීලක අගුල - ආරම්භක යවන්නාට පමණක්
          const senderJid = mekInfo.key.participant || mekInfo.key.remoteJid;
          if (senderJid !== ownerJid) return;

          const userText =
            mekInfo.message.conversation ||
            mekInfo.message.extendedTextMessage?.text;

          // Reply එකක්දැයි පරීක්ෂා කරන්න
          const isReply =
            mekInfo.message?.extendedTextMessage?.contextInfo?.stanzaId ===
            messageID;

          if (!isReply) return;

          const choice = userText?.trim();

          // Listener ඉවත් කරන්න
          conn.ev.off("messages.upsert", handler);

          // Download reaction (reply එකටම)
          await conn.sendMessage(from, {
            react: { text: "⬇️", key: mekInfo.key },
          });

          const safeTitle = title
            .replace(/[\\/:*?"<>|]/g, "")
            .slice(0, 80);

          const audioFileName = `${safeTitle}.mp3`;
          const tempPath = path.join(tempDir, `${Date.now()}.mp3`);
          const voicePath = path.join(tempDir, `${Date.now()}.opus`);

          // **මෙතන වෙනස්කම්: reply එකටම file යැවීම**
          
          // Option 1: Audio
          if (choice === "1" || choice === "1️⃣") {
            await conn.sendMessage(
              from,
              {
                audio: { url },
                mimetype: "audio/mpeg",
                fileName: audioFileName,
              },
              { quoted: mekInfo } // මෙතන වෙනස: mekInfo (reply message) ට quote කරයි
            );

          // Option 2: Document
          } else if (choice === "2" || choice === "2️⃣") {
            await conn.sendMessage(
              from,
              {
                document: { url },
                mimetype: "audio/mpeg",
                fileName: audioFileName,
                caption: title,
              },
              { quoted: mekInfo } // මෙතන වෙනස: mekInfo (reply message) ට quote කරයි
            );

          // Option 3: Voice Note
          } else if (choice === "3" || choice === "3️⃣") {
            // Download audio
            const audioRes = await fetch(url);
            const audioBuffer = Buffer.from(await audioRes.arrayBuffer());
            fs.writeFileSync(tempPath, audioBuffer);

            // Convert to voice note
            await new Promise((resolve, reject) => {
              ffmpeg(tempPath)
                .audioCodec("libopus")
                .format("opus")
                .audioBitrate("64k")
                .save(voicePath)
                .on("end", resolve)
                .on("error", reject);
            });

            const voiceBuffer = fs.readFileSync(voicePath);

            await conn.sendMessage(
              from,
              {
                audio: voiceBuffer,
                mimetype: "audio/ogg; codecs=opus",
                ptt: true,
              },
              { quoted: mekInfo } // මෙතන වෙනස: mekInfo (reply message) ට quote කරයි
            );

            // Cleanup
            fs.unlinkSync(tempPath);
            fs.unlinkSync(voicePath);

          } else {
            await reply("❌ *වැරදි තේරීමකි!* 1, 2, හෝ 3 පමණක් යොදන්න.");
            return;
          }

          // Upload reaction (reply එකටම)
          await conn.sendMessage(from, {
            react: { text: "⬆️", key: mekInfo.key },
          });

          // Success reaction (reply එකටම)
          setTimeout(async () => {
            await conn.sendMessage(from, {
              react: { text: "✔️", key: mekInfo.key },
            });
          }, 1000);

        } catch (err) {
          console.error("Reply handler error:", err);
          await reply("⚠️ ප්‍රතිචාර සැකසීමේ දෝෂයක්.");
        }
      };

      // Listener එකතු කරන්න
      conn.ev.on("messages.upsert", handler);

      // Timeout (2 මිනිත්තුවකින් ඉවත් කරන්න)
      setTimeout(() => {
        conn.ev.off("messages.upsert", handler);
      }, 120000);

    } catch (err) {
      console.error("Song command error:", err);
      reply("⚠️ ඉල්ලීම සැකසීමේදී දෝෂයක් ඇතිවිය.");
    }
  }
);
