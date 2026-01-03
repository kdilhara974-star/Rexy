const { cmd } = require("../command");
const fetch = require("node-fetch");
const fs = require("fs");
const path = require("path");

cmd({
  pattern: "getvideonote",
  alias: ["gvn"],
  desc: "Convert replied video or URL to WhatsApp Video Note",
  category: "owner",
  react: "🎬",
  use: ".gvn <reply/video/url>",
  filename: __filename,
}, async (conn, mek, m, { from, reply, q }) => {
  try {
    let videoBuffer;

    // -------- IF USER REPLIED TO VIDEO -----------
    if (m.quoted) {
      let type = m.quoted.mtype;

      if (type === "videoMessage") {
        videoBuffer = await m.quoted.download();
      } else {
        return reply("⚠️ *Please reply to a video!*");
      }
    }

    // -------- IF PROVIDED VIDEO URL -----------------------
    else if (q) {
      const videoUrl = q.trim();
      const videoRes = await fetch(videoUrl);
      if (!videoRes.ok) throw new Error("Invalid video URL");
      videoBuffer = Buffer.from(await videoRes.arrayBuffer());
    } 
    
    else {
      return reply("⚠️ *Reply to a video or provide a URL!*");
    }

    // Reaction: Downloading
    await conn.sendMessage(from, { react: { text: "⬇️", key: mek.key } });

    // TEMP PATH
    const tempPath = path.join(__dirname, `../temp/${Date.now()}.mp4`);
    fs.writeFileSync(tempPath, videoBuffer);

    // SEND VIDEO NOTE
    await conn.sendMessage(from, {
      video: fs.readFileSync(tempPath),
      mimetype: "video/mp4",
      ptv: true, // makes it a circular video note
    });

    // Reaction: Done
    await conn.sendMessage(from, { react: { text: "✔️", key: mek.key } });

    // CLEANUP
    fs.unlinkSync(tempPath);

  } catch (err) {
    console.error(err);
    await conn.sendMessage(from, { react: { text: "🎬", key: mek.key } });
    reply("*Error sending video note*");
  }
});
