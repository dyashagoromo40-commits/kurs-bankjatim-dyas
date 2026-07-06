export default async function handler(req, res) {
  // Hanya menerima request POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { mimeType, base64Data } = req.body;
    
    // Mengambil API Key dari sistem rahasia Vercel (bukan dari kode)
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ error: 'Sistem Error: API Key belum dipasang di Dashboard Vercel.' });
    }

    const aiPrompt = `Kamu adalah sistem AI pemindai tabel kurs yang bertugas mengekstrak angka kurs dari gambar secara akurat.
Mata uang yang dicari: USD, AUD, GBP, SGD, JPY, HKD, EUR, CNY, MYR.
Kategori: BANK NOTES (bn_b untuk beli, bn_j untuk jual) dan TELEGRAPHIC TRANSFER (tt_b untuk beli, tt_j untuk jual).

Keluarkan hasil akhir HANYA dalam format JSON mentah tanpa blok kode markdown (\`\`\`json) dan tanpa kalimat pembuka/penutup apapun. Struktur JSON wajib persis seperti ini:
{
  "USD": {"bn_b": "16100", "bn_j": "16350", "tt_b": "16150", "tt_j": "16250"},
  "AUD": {"bn_b": "10400", "bn_j": "10650", "tt_b": "10450", "tt_j": "10550"}
}
Isikan angka mentah tanpa pemisah ribuan (titik/koma). Jika mata uang tertentu tidak ada di tabel gambar, kosongkan saja nilainya "".`;

    // Menggunakan model gemini-1.5-flash yang super cepat agar tidak terkena timeout limit Vercel (10 detik)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: aiPrompt },
            { inlineData: { mimeType: mimeType, data: base64Data } }
          ]
        }]
      })
    });

    const resData = await response.json();
    
    if (!response.ok) {
      return res.status(response.status).json({ error: resData.error?.message || 'Google Gemini AI Error' });
    }

    let rawText = resData.candidates[0].content.parts[0].text.trim();
    
    // Membersihkan teks jika AI membandel menyertakan markdown
    if (rawText.startsWith("```")) {
      rawText = rawText.replace(/^```json/, "").replace(/^```/, "").replace(/```$/, "").trim();
    }

    // Kembalikan data dalam bentuk JSON bersih ke frontend
    return res.status(200).json(JSON.parse(rawText));

  } catch (error) {
    return res.status(500).json({ error: 'Gagal memproses backend: ' + error.message });
  }
}
