const { cmd } = require("../command");
const fetch = require("node-fetch");
const fs = require("fs");
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");

cmd({
  pattern: "ptv",
  alias: ["videoNote"],
  desc: "Convert replied video or URL to WhatsApp PTV Video Note",
  category: "owner",
  react: "🎬",
  use: ".ptv <reply/video/url>",
  filename: __filename,
}, async (conn, mek, m, { from, reply, q }) => {
  try {
    let mediaBuffer;

    // -------- IF USER REPLIED TO VIDEO -----------
    if (m.quoted) {
      let type = m.quoted.mtype;

      if (type === "videoMessage") {
        mediaBuffer = await m.quoted.download();
      } else {
        return reply("⚠️ *Please reply to a video!*");
      }
    }

    // -------- IF PROVIDED VIDEO URL -----------------------
    else if (q) {
      const videoUrl = q.trim();
      const videoRes = await fetch(videoUrl);
      if (!videoRes.ok) throw new Error("Invalid video URL");
      mediaBuffer = Buffer.from(await videoRes.arrayBuffer());
    } 
    
    else {
      return reply("⚠️ *Reply to a video or give me a URL!*");
    }

    // Reaction: Downloading
    await conn.sendMessage(from, { react: { text: "⬇️", key: mek.key } });

    const tempPath = path.join(__dirname, `../temp/${Date.now()}.mp4`);
    const ptvPath = path.join(__dirname, `../temp/${Date.now()}_ptv.mp4`);
    fs.writeFileSync(tempPath, mediaBuffer);

    // Reaction: Converting
    await conn.sendMessage(from, { react: { text: "⬆️", key: mek.key } });

    // -------- CONVERT TO WHATSAPP-COMPATIBLE VIDEO NOTE ----------------
    await new Promise((resolve, reject) => {
      ffmpeg(tempPath)
        .inputOptions('-y') // overwrite
        .videoCodec('libx264')
        .audioCodec('aac')
        .size('360x360') // resize to square
        .aspect('1:1') // ensure 1:1 ratio
        .outputOptions([
          '-profile:v baseline', 
          '-level 3.0',
          '-pix_fmt yuv420p', 
          '-movflags +faststart', 
          '-preset veryfast', 
          '-r 25', // fps
          '-shortest'
        ])
        .format('mp4')
        .on('end', resolve)
        .on('error', reject)
        .save(ptvPath);
    });

    // Ensure file is fully written
    if (!fs.existsSync(ptvPath)) throw new Error('PTV conversion failed');

    const ptvBuffer = fs.readFileSync(ptvPath);

    // Check file size (<16MB)
    if (ptvBuffer.length > 16 * 1024 * 1024) {
      return reply('⚠️ File too large for WhatsApp Video Note (~16MB max)');
    }

    // SEND WHATSAPP PTV
    await conn.sendMessage(from, {
      video: ptvBuffer,
      mimetype: 'video/mp4',
      ptt: true,
    });

    // Reaction: Done
    await conn.sendMessage(from, { react: { text: "✔️", key: mek.key } });

    // Cleanup
    fs.unlinkSync(tempPath);
    fs.unlinkSync(ptvPath);

  } catch (err) {
    console.error(err);
    await conn.sendMessage(from, { react: { text: "🎬", key: mek.key } });
    reply(`*Error:* ${err.message}`);
  }
});
