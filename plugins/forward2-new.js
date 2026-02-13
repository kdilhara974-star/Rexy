const { cmd } = require("../command");
const NodeCache = require("node-cache");

// ===== Safety Configuration =====
const SAFETY = {
  MAX_JIDS: 20,
  BASE_DELAY: 2000,
  EXTRA_DELAY: 4000,
};

// ===== Cache (5 Minutes Duplicate Block) =====
const forwardCache = new NodeCache({ stdTTL: 300 });

cmd({
  pattern: "forward",
  alias: ["fwd"],
  desc: "Forward media/messages to single or multiple JIDs with caption support (Spam Protected)",
  category: "owner",
  filename: __filename
},
async (client, message, match, { isOwner }) => {
  try {

    // ===== Owner Only =====
    if (!isOwner)
      return await message.reply("📛 *Owner Only Command*");

    // ===== Must reply to message =====
    if (!message.quoted)
      return await message.reply("🍁 *Reply to a document or media*");

    // ===== JID PROCESSING =====
    let jidInput = "";

    if (typeof match === "string") jidInput = match.trim();
    else if (Array.isArray(match)) jidInput = match.join(" ").trim();
    else if (match && typeof match === "object") jidInput = match.text || "";

    const rawJids = jidInput.split(/[\s,]+/).filter(x => x.trim().length > 0);

    const validJids = rawJids
      .map(jid => {
        let clean = jid.replace(/(@g\.us|@s\.whatsapp\.net|@newsletter|@lid)$/i, "");

        if (/^\d+$/.test(clean)) {

          if (jid.includes("@g.us")) return `${clean}@g.us`;
          if (jid.includes("@s.whatsapp.net")) return `${clean}@s.whatsapp.net`;
          if (jid.includes("@newsletter")) return `${clean}@newsletter`;
          if (jid.includes("@lid")) return `${clean}@lid`;

          if (clean.length > 15) return `${clean}@g.us`;
          return `${clean}@s.whatsapp.net`;
        }
        return null;
      })
      .filter(x => x !== null)
      .slice(0, SAFETY.MAX_JIDS);

    if (validJids.length === 0)
      return await message.reply(
        "❌ *No valid JIDs found!*\n\nExamples:\n" +
        ".fwd 120363411055156472@g.us\n" +
        ".fwd 94713119712@s.whatsapp.net\n" +
        ".fwd 120363405042997613@newsletter\n" +
        ".fwd 210883045232740@lid"
      );

    // ===== MESSAGE TYPE =====
    let messageContent = {};
    const q = message.quoted;
    const mtype = q.mtype;

    if (["imageMessage", "videoMessage", "audioMessage", "stickerMessage", "documentMessage"].includes(mtype)) {

      const stream = await client.downloadMediaMessage(q);

      switch (mtype) {
        case "imageMessage":
          messageContent = {
            image: stream,
            caption: q.text || ""
          };
          break;

        case "videoMessage":
          messageContent = {
            video: stream,
            caption: q.text || ""
          };
          break;

        case "audioMessage":
          messageContent = {
            audio: stream,
            ptt: q.ptt || false
          };
          break;

        case "stickerMessage":
          messageContent = {
            sticker: stream
          };
          break;

        case "documentMessage":
          messageContent = {
            document: stream,
            fileName: q.fileName || "file",
            mimetype: q.mimetype || "application/octet-stream",
            caption: q.text || ""
          };
          break;
      }

    } else if (mtype === "extendedTextMessage" || mtype === "conversation") {
      messageContent = { text: q.text };
    } else {
      messageContent = q;
    }

    // ===== SENDING PROCESS =====
    let successCount = 0;
    const failed = [];

    for (let i = 0; i < validJids.length; i++) {
      const jid = validJids[i];

      try {
        // Duplicate Block Key
        const cacheKey = `${q.id}_${jid}`;

        if (forwardCache.has(cacheKey)) {
          console.log("Skipped duplicate:", jid);
          continue;
        }

        await client.sendMessage(jid, messageContent);

        // Save to cache
        forwardCache.set(cacheKey, true);

        successCount++;

        if ((i + 1) % 10 === 0) {
          await message.reply(`🔄 Sent to ${i + 1}/${validJids.length}...`);
        }

        const delay =
          (i + 1) % 10 === 0
            ? SAFETY.EXTRA_DELAY
            : SAFETY.BASE_DELAY;

        await new Promise(res => setTimeout(res, delay));

      } catch {
        failed.push(jid);
        await new Promise(res => setTimeout(res, SAFETY.BASE_DELAY));
      }
    }

    // ===== REPORT =====
    let report =
      `✅ *Forward Completed*\n\n` +
      `📤 Success: ${successCount}/${validJids.length}\n` +
      `📄 Type: ${mtype}\n`;

    if (failed.length > 0)
      report += `\n❌ Failed: ${failed.join(", ")}`;

    await message.reply(report);

  } catch (e) {
    await message.reply("💢 Error: " + e.message);
  }
});
