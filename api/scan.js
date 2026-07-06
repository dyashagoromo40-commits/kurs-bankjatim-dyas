// api/scan.js
export default async function handler(req, res) {
  // 1. Atur Header CORS agar backend bisa diakses dengan aman
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metode tidak diizinkan' });
  }

  try {
    // 2. Ambil API Key dari Vercel Environment Variable
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ 
        error: 'Sistem mendeteksi bahwa GEMINI_API_KEY belum terpasang di Vercel.' 
      });
    }

    const { mimeType, data } = req.body;
    if (!mimeType || !data) {
      return res.status(400).json({ error: 'Data gambar atau tipe file tidak lengkap.' });
    }

    // 3. Menggunakan model gemini-2.5-flash yang terbukti lancar di file lokalmu
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const promptInstruction = `Analisislah gambar tabel kurs mata uang asing ini. Ekstrak data kurs Beli dan Jual untuk kategori Bank Notes (BN) dan Telegraphic Transfer (TT) untuk mata uang berikut jika ada: USD, AUD, GBP, SGD, JPY, HKD, EUR, CNY, MYR.
    
    Kembalikan respons berupa objek JSON murni tanpa format markdown apa pun (jangan gunakan pembungkus \`\`\`json), tanpa teks tambahan di luar JSON, dan ikuti struktur persis seperti ini:
    {
      "USD": { "bn_b": "nilai", "bn_j": "nilai", "tt_b": "nilai", "tt_j": "nilai" },
      "AUD": { "bn_b": "nilai", "bn_j": "nilai", "tt_b": "nilai", "tt_j": "nilai" }
    }
    Catatan: Ambil angka mentahnya saja (contoh: 16250 atau 103.50). Jika data mata uang atau nilai tertentu tidak ditemukan di gambar, isi nilainya dengan "".`;

    const googleResponse = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: promptInstruction },
            { inlineData: { mimeType: mimeType, data: data } }
          ]
        }],
        generationConfig: {
          responseMimeType: 'application/json'
        }
      })
    });

    const resData = await googleResponse.json();

    if (!googleResponse.ok) {
      return res.status(googleResponse.status).json({ 
        error: `Google API Error: ${resData.error?.message || 'Gagal terhubung ke Gemini'}` 
      });
    }

    let textResult = resData.candidates[0].content.parts[0].text;
    
    // Pembersihan jika AI tidak sengaja menyertakan balutan backticks ```json
    textResult = textResult.replace(/```json/g, "").replace(/```/g, "").trim();
    
    const ratesData = JSON.parse(textResult);
    return res.status(200).json(ratesData);

  } catch (error) {
    return res.status(500).json({ error: `Internal Server Error: ${error.message}` });
  }
}
