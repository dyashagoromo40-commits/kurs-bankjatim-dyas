// api/scan.js

export default async function handler(req, res) {
  // Hanya menerima metode POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metode tidak diizinkan. Gunakan POST.' });
  }

  const { mimeType, data } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  // Validasi Environment Variable di Vercel
  if (!apiKey) {
    return res.status(500).json({ error: 'Konfigurasi gagal: GEMINI_API_KEY belum dipasang di Vercel.' });
  }

  try {
    // Endpoint resmi Google Gemini menggunakan versi terbaru yang stabil (gemini-2.5-flash)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    
    const promptInstruction = `Analisislah gambar tabel kurs mata uang asing ini. Ekstrak data kurs Beli dan Jual untuk kategori Bank Notes (BN) dan Telegraphic Transfer (TT) untuk mata uang berikut jika ada: USD, AUD, GBP, SGD, JPY, HKD, EUR, CNY, MYR.
    
    Kembalikan respons berupa objek JSON murni tanpa format markdown apa pun (jangan gunakan pembungkus \`\`\`json), tanpa teks tambahan di luar JSON, dan ikuti struktur persis seperti ini:
    {
      "USD": { "bn_b": "nilai", "bn_j": "nilai", "tt_b": "nilai", "tt_j": "nilai" },
      "AUD": { "bn_b": "nilai", "bn_j": "nilai", "tt_b": "nilai", "tt_j": "nilai" }
    }
    Catatan: Ambil angka mentahnya saja (contoh: 16250 atau 103.50). Jika data mata uang atau nilai tertentu tidak ditemukan di gambar, isi nilainya dengan "".`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: promptInstruction },
            { inlineData: { mimeType: mimeType, data: data } }
          ]
        }],
        generationConfig: {
          responseMimeType: "application/json"
        }
      })
    });

    if (!response.ok) {
      const errData = await response.json();
      return res.status(response.status).json({ error: errData.error?.message || "Gagal merespons dari Gemini API" });
    }

    const resData = await response.json();
    let textResult = resData.candidates[0].content.parts[0].text;
    
    // Bersihkan pembungkus markdown jika ada secara tidak sengaja
    textResult = textResult.replace(/```json/g, "").replace(/```/g, "").trim();
    
    const ratesData = JSON.parse(textResult);
    
    // Kembalikan data kurs yang bersih ke frontend
    return res.status(200).json(ratesData);

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal Server Error: ' + error.message });
  }
}
