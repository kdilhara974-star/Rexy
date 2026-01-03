const { cmd } = require("../command");
const fs = require("fs");
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");

cmd({
  pattern: "getvideonote",
  alias: ["gvn"],
  desc: "Reply video → WhatsApp Video Note (PTV)",
  category: "owner",
  react: "🎥",
  filename: __filename,
}, async (conn, mek, m, { from, reply }) => {
  try {
    if (!m.quoted || m.quoted.mtype !== "videoMessage") {
      return reply("❌ Video ekakata reply karanna");
    }

    const input = path.join(__dirname, "../temp/in.mp4");
    const output = path.join(__dirname, "../temp/out.mp4");

    const buffer = await m.quoted.download();
    fs.writeFileSync(input, buffer);

    await new Promise((res, rej) => {
      ffmpeg(input)
        .outputOptions([
          "-vf scale=480:480:force_original_aspect_ratio=increase,crop=480:480",
          "-c:v libx264",
          "-pix_fmt yuv420p",
          "-profile:v baseline",
          "-level 3.0",
          "-r 25",
          "-movflags +faststart",
          "-t 60"
        ])
        .on("end", res)
        .on("error", rej)
        .save(output);
    });

    // 🔥 PTV SEND (EXACT LIKE YOUR SAMPLE)
    await conn.sendMessage(from, {
      video: fs.readFileSync(output),
      mimetype: "video/mp4",
      ptv: true, // ✅ THIS IS THE MAGIC
    }, { quoted: mek });

    fs.unlinkSync(input);
    fs.unlinkSync(output);

  } catch (e) {
    console.error(e);
    reply("❌ PTV convert error");
  }
});
