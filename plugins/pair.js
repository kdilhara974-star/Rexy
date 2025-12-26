const { cmd } = require('../command');
const axios = require('axios');


cmd({
    pattern: "pair",
    alias: ["getpair", "clonebot"],
    react: "✅",
    desc: "Get pairing code for RANUMITHA-X-MD bot",
    category: "download",
    use: ".pair +947XXXXXXXX",
    filename: __filename
}, async (conn, mek, m, { q, senderNumber, reply }) => {
    try {
        const phoneNumber = q ? q.trim() : senderNumber;

        if (!phoneNumber || !phoneNumber.match(/^\+?\d{10,15}$/)) {
            return await reply("❌ Please provide a valid phone number with country code\nExample: .pair +94XXXXXXXXX");
        }

        // Remove + sign for API
        const cleanNumber = phoneNumber.replace(/\D/g, "");

        // Call API endpoint
        const res = await axios.get(`https://ranupairex-e501b53b8028.herokuapp.com/code?number=${cleanNumber}`);
        const code = res.data?.code;

        if (!code) {
            return await reply("❌ Could not retrieve RANUMITHA-X-MD pairing code.");
        }

        const doneMessage = "> *RANUMITHA-X-MD PAIRING COMPLETED ☑️*";
        await reply(`${doneMessage}\n\n*👾 Your pairing code is:* ${code}`);

        await new Promise(resolve => setTimeout(resolve, 2000));
        await reply(`${code}`);

    } catch (err) {
        console.error("*error:*", err);
        await reply("❌ Error while getting WHITESHADOW-MD pairing code.");
    }
});
