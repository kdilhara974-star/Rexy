const fetch = require("node-fetch");
const { cmd } = require("../command");

const BOT_API_KEY = "ADD_YOUR_API_KEY_HERE";

cmd({
  pattern: "rch",
  react: "🤖",
  desc: "Owner Only: Multi react to channel",
  category: "owner",
  use: ".rch <channel_link> <emoji1>|<emoji2>",
  filename: __filename
},
async (conn, mek, m, { from, isOwner }) => {

  const reply = async (text) =>
    await conn.sendMessage(from, { text }, { quoted: m });

  // 🔐 OWNER ONLY
  if (!isOwner) return reply("🚫 *Owner Only Command!*");

  try {
    // 📝 TEXT READ (YOUR STYLE)
    const text =
      m.text ||
      m.message?.conversation ||
      m.message?.extendedTextMessage?.text ||
      "";

    const args = text.trim().split(/\s+/).slice(1);

    if (args.length < 2) {
      return reply(
`❌ *Usage*
.rch <CHANNEL_LINK> <EMOJI1>|<EMOJI2>|<EMOJI3>

📌 Example:
.rch https://whatsapp.com/channel/xxxx 🔥|😍|😂`
      );
    }

    const channelLink = args[0];
    const emojis = args
      .slice(1)
      .join(" ")
      .split("|")
      .map(e => e.trim())
      .filter(Boolean);

    let success = 0;
    let failed = 0;

    // ⏳ PROCESS REACT
    await conn.sendMessage(from, {
      react: { text: "⏳", key: m.key }
    });

    for (const emoji of emojis) {
      const url =
`https://react.whyux-xec.my.id/api/rch?link=${encodeURIComponent(channelLink)}&emoji=${encodeURIComponent(emoji)}`;

      try {
        const res = await fetch(url, {
          headers: {
            "x-api-key": BOT_API_KEY
          }
        });

        const data = await res.json().catch(() => null);

        if (data && data.success === true) success++;
        else failed++;

        await new Promise(r => setTimeout(r, 700));

      } catch (e) {
        failed++;
      }
    }

    return reply(
`🤖 *MULTI REACT DONE*
━━━━━━━━━━━━━━
🔗 Channel: ${channelLink}
😀 Emojis: ${emojis.join(" ")}
✅ Success: ${success}
❌ Failed: ${failed}`
    );

  } catch (err) {
    console.error(err);
    return reply("❌ React command failed!");
  }
});
