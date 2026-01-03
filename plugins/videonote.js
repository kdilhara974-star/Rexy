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
        .videoCodec("libx264")           // H.264 video
        .audioCodec("aac")               // AAC audio
        .size("360x360")                 // Square 360x360
        .outputOptions([
          "-profile:v baseline",         // baseline H.264 for WhatsApp
          "-pix_fmt yuv420p",            // pixel format
          "-movflags +faststart",        // make MP4 streamable
          "-preset veryfast",            // encoding speed
          "-r 25",                       // frame rate
          "-shortest"                    // match audio duration
        ])
        .format("mp4")
        .on("end", resolve)
        .on("error", reject)
        .save(ptvPath);
    });

    const ptvBuffer = fs.readFileSync(ptvPath);

    // SEND WHATSAPP PTV
    await conn.sendMessage(from, {
      video: ptvBuffer,
      mimetype: "video/mp4",
      ptt: true, // Video note
    });

    // Reaction: Done
    await conn.sendMessage(from, { react: { text: "✔️", key: mek.key } });

    // Cleanup
    fs.unlinkSync(tempPath);
    fs.unlinkSync(ptvPath);

  } catch (err) {
    console.error(err);
    await conn.sendMessage(from, { react: { text: "🎬", key: mek.key } });
    reply("*Error*");
  }
});
