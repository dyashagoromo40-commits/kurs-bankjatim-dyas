export default async function handler(req, res) {
  // Hanya izinkan metode POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { imageBase64, mimeType } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'Data gambar (Base64) diperlukan.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY belum dikonfigurasi di Vercel.' });
    }

    // Endpoint resmi Gemini 1.5 Flash menggunakan API Key dari Vercel
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: "Kamu adalah AI yang bertugas mengekstrak data tabel kurs valuta asing dari gambar ini. Kembalikan hasilnya dalam bentuk JSON yang rapi dengan struktur objek atau array yang berisi mata_uang, kurs_beli, dan kurs_jual."
              },
              {
                inlineData: {
                  mimeType: mimeType || "image/png",
                  data: imageBase64 // String base64 murni tanpa prefix "data:image/png;base64,"
                }
              }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json" // Memaksa Gemini mengembalikan format JSON
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || 'Gagal memproses ke Gemini API' });
    }

    // Kirimkan hasil ekstraksi dari Gemini kembali ke Frontend
    return res.status(200).json(data);

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
