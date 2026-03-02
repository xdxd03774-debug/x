const express = require('express');
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
    res.send("Bot aktif ve Render üzerinde çalışıyor!");
});

app.listen(PORT, () => {
    console.log(`Sunucu ${PORT} portunda dinleniyor.`);
});

const token = process.env.TOKEN;
const channelId = process.env.CHANNEL_ID;
const message = process.env.MESSAGE;

if (!token || !channelId || !message) {
    console.error("HATA: Environment bölümünde TOKEN, CHANNEL_ID veya MESSAGE eksik!");
} else {
    console.log("Bot baslatildi. Mesaj gonderme dongusu aktif.");
    startLoop();
}

async function startLoop() {
    while (true) {
        await sendMessage();
        // Normal bekleme: 5 saniye
        await sleep(5000);
    }
}

async function sendMessage() {
    try {
        const response = await axios.post(
            `https://discord.com/api/v9/channels/${channelId}/messages`,
            { content: message },
            {
                headers: {
                    "Authorization": token,
                    "Content-Type": "application/json"
                },
                // Axios 429'u hata olarak atmasin, biz kendimiz handle edelim
                validateStatus: (status) => status < 500
            }
        );

        if (response.status === 200 || response.status === 201) {
            console.log(`✅ Mesaj gonderildi: "${message}"`);

            // Discord rate limit header'larini kontrol et
            const remaining = response.headers['x-ratelimit-remaining'];
            if (remaining !== undefined && parseInt(remaining) <= 1) {
                const resetAfter = parseFloat(response.headers['x-ratelimit-reset-after'] || "5");
                console.log(`⏳ Rate limit yaklasıyor. ${resetAfter} saniye bekleniyor...`);
                await sleep(resetAfter * 1000);
            }

        } else if (response.status === 429) {
            // Rate limit yedik, Discord'un soyledigi kadar bekle
            const retryAfter = response.data?.retry_after || 30;
            console.log(`⚠️ Rate limit! ${retryAfter} saniye bekleniyor...`);
            await sleep(retryAfter * 1000);

        } else {
            console.error(`❌ Hata: ${response.status}`, response.data);
            // Bilinmeyen hata, 10 saniye bekle
            await sleep(10000);
        }

    } catch (err) {
        if (err.response?.status === 429) {
            const retryAfter = err.response?.data?.retry_after || 30;
            console.log(`⚠️ Rate limit (catch)! ${retryAfter} saniye bekleniyor...`);
            await sleep(retryAfter * 1000);
        } else {
            console.error("❌ Baglanti hatasi:", err.message);
            // Baglanti hatasi, 15 saniye bekle ve tekrar dene
            await sleep(15000);
        }
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
