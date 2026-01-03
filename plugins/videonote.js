const { cmd } = require("../command");

cmd({
  pattern: "ptv",
  alias: ["videonote"],
  desc: "Send replied video as WhatsApp Video Note (PTV)",
  category: "owner",
  react: "🎥",
  use: ".ptv (reply to video)",
  filename: __filename,
}, async (conn, mek, m, { from, reply }) => {
  try {

    // must reply to a video
    if (!m.quoted || m.quoted.mtype !== "videoMessage") {
      return reply("⚠️ *Video ekakata reply karanna*");
    }

    // react
    await conn.sendMessage(from, {
      react: { text: "⬆️", key: mek.key }
    });

    // download original video
    const videoBuffer = await m.quoted.download();

    // send as PTV (video note)
    await conn.sendMessage(from, {
      video: videoBuffer,
      mimetype: "video/mp4",
      ptv: true, // ⭐ THIS IS THE MAGIC
    });

    await conn.sendMessage(from, {
      react: { text: "✔️", key: mek.key }
    });

  } catch (e) {
    console.error(e);
    reply("❌ PTV send fail una");
  }
});
