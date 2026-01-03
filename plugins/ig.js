const axios = require("axios");
const { cmd } = require('../command');

cmd({
  pattern: "ig",
  alias: ["insta","instagram"],
  desc: "Instagram Downloader (Unlimited)",
  category: "download",
  filename: __filename
}, async (conn, m, store, { from, q, reply }) => {
  try {
    if (!q || !q.startsWith("https://")) {
      return reply("❌ Valid Instagram link ekak denna");
    }

    await conn.sendMessage(from, {
      react: { text: "📽️", key: m.key }
    });

    const { data } = await axios.get(
      `https://api-aswin-sparky.koyeb.app/api/downloader/igdl?url=${encodeURIComponent(q)}`
    );

    if (!data?.status || !data.data?.length) {
      return reply("⚠️ Media fetch karanna bari una");
    }

    const media = data.data[0];

    const menuMsg = await conn.sendMessage(from, {
      image: { url: media.thumbnail },
      caption: `
📥 *Instagram Downloader*

1️⃣ HD Video
2️⃣ Audio (MP3)

Reply with number 👇
> Unlimited requests allowed
      `
    }, { quoted: m });

    const menuId = menuMsg.key.id;

    conn.ev.on("messages.upsert", async ({ messages }) => {
      const msg = messages[0];
      if (!msg?.message) return;

      const text =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text;

      const isReply =
        msg.message.extendedTextMessage?.contextInfo?.stanzaId === menuId;

      if (!isReply) return;

      // ⬇️ Downloading
      await conn.sendMessage(from, {
        react: { text: "⬇️", key: msg.key }
      });

      await new Promise(r => setTimeout(r, 600));

      // ⬆️ Uploading
      await conn.sendMessage(from, {
        react: { text: "⬆️", key: msg.key }
      });

      if (text.trim() === "1") {
        if (media.type !== "video") {
          return reply("⚠️ Video nathi post ekak");
        }

        await conn.sendMessage(from, {
          video: { url: media.url },
          caption: "✅ Your video is ready"
        }, { quoted: msg });

      } else if (text.trim() === "2") {

        await conn.sendMessage(from, {
          audio: { url: media.url },
          mimetype: "audio/mp4"
        }, { quoted: msg });

      } else {
        return reply("❌ Wrong option");
      }

      // ✔️ Sent
      await conn.sendMessage(from, {
        react: { text: "✔️", key: msg.key }
      });
    });

  } catch (e) {
    console.error(e);
    reply("❌ Error");
  }
});
