const { cmd } = require("../command");

cmd({
  pattern: "rch",
  react: "🤖",
  desc: "Owner Only: React to channel post via link (FAKE)",
  category: "owner",
  use: ".rch <post_link> <emoji>",
  filename: __filename
},
async (conn, mek, m, { from, isOwner }) => {

  const reply = (text) =>
    conn.sendMessage(from, { text }, { quoted: m });

  if (!isOwner) return reply("🚫 Owner Only!");

  const text =
    m.text ||
    m.message?.conversation ||
    m.message?.extendedTextMessage?.text ||
    "";

  const args = text.trim().split(/\s+/).slice(1);
  if (args.length < 2) {
    return reply("❌ Usage:\n.rch <post_link> <emoji>");
  }

  const postLink = args[0];
  const emoji = args.slice(1).join(" ");

  if (!postLink.includes("whatsapp.com/channel")) {
    return reply("❌ Invalid channel post link!");
  }

  // fake processing
  await conn.sendMessage(from, {
    react: { text: "⏳", key: m.key }
  });

  await new Promise(r => setTimeout(r, 1500));

  return reply(
`🤖 *REACTION SENT (LINK MODE)*
━━━━━━━━━━━━━━
🔗 Post: ${postLink}
😀 Emoji: ${emoji}
✅ Status: Done`
  );
});
