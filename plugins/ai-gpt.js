const { cmd } = require('../command');
const axios = require('axios');


cmd({
    pattern: "gpt",
    alias: [ "ai2", "chatgpt", "openai" ],
    desc: "Chat with Microsoft Copilot - GPT-5",
    category: "ai",
    react: "🤖",
    filename: __filename
},
async (conn, mek, m, { from, args, q, reply, react }) => {
    try {
        if (!q) {
            return reply("🧠 Please provide a message for the AI.\nExample: `.gpt Hello`");
        }

        // ✅ Malvin API - GPT-5 Endpoint
        const apiUrl = `https://malvin-api.vercel.app/ai/gpt-5?text=${encodeURIComponent(q)}`;

        const { data } = await axios.get(apiUrl);

        // 🧾 Validate Response
        if (!data?.status || !data?.result) {
            await react("❌");
            return reply("AI failed to respond. Please try again later.");
        }

        // 🧩 Nicely formatted response
        const responseMsg = `
🤖 *Microsoft Copilot GPT-latest AI Response*  
━━━━━━━━━━━━━━━  
${data.result}`.trim();

        await reply(responseMsg);
        await react("✅");
    } catch (e) {
        console.error("Error in AI command:", e);
        await react("❌");
        reply("An error occurred while communicating with the AI.");
    }
});
