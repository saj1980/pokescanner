export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  console.log(`SCAN_EVENT ${new Date().toISOString()} ip=${req.headers['x-forwarded-for'] || 'unknown'} ua=${req.headers['user-agent']?.slice(0,80) || 'unknown'}`);

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { return res.status(400).json({ error: "Ugyldig JSON i body" }); }
  }

  const imageBase64 = body?.imageBase64;
  if (!imageBase64) {
    return res.status(400).json({ error: "Mangler imageBase64" });
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: { type: "base64", media_type: "image/jpeg", data: imageBase64 },
              },
              {
                type: "text",
                text: `Analyze this Pokemon card. Return ONLY raw JSON:\n{"name":"","set":"","cardNumber":"","year":"","rarity":"Rare","type":"Fire","condition":"Near Mint","isFirstEdition":false,"isShadowless":false,"isHolo":false,"prices":{"poor":1,"played":2,"nearMint":4,"mint":6,"psa10":20},"estimatedValue":4,"confidence":"high","notes":"","isRealCard":true}`,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(response.status).json({ error: `API fejl: ${err}` });
    }

    const data = await response.json();
    const aiText = data?.content?.find((b) => b.type === "text")?.text || "";

    let parsed;
    try {
      parsed = JSON.parse(aiText.trim());
    } catch {
      const m = aiText.match(/\{[\s\S]*\}/);
      if (!m) return res.status(500).json({ error: "Ingen JSON i svar fra Claude" });
      parsed = JSON.parse(m[0]);
    }

    return res.status(200).json(parsed);
  } catch (err) {
    return res.status(500).json({ error: err.message || "Serverfejl" });
  }
}
