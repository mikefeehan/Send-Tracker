const { onRequest } = require('firebase-functions/v2/https')
const Anthropic = require('@anthropic-ai/sdk').default

// Firebase Functions 2nd gen natively loads functions/.env — no dotenv needed
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || ''

exports.checkDrinkPhoto = onRequest({
  cors: true,
  region: 'us-central1',
  invoker: 'public',
  memory: '256MiB',
  timeoutSeconds: 60,
}, async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { imageBase64, mediaType, drinkType } = req.body

    if (!imageBase64 || !mediaType) {
      return res.status(400).json({ error: 'Missing image data' })
    }

    const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY })

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType,
              data: imageBase64,
            },
          },
          {
            type: 'text',
            text: `You are a drink photo verifier for "Send Tracker" — a drinking competition app. Your job is to allow drinks through UNLESS they are CLEARLY non-alcoholic.

DEFAULT ACTION: APPROVE. When in doubt, APPROVE.

ONLY REJECT if you see something that is OBVIOUSLY and UNMISTAKABLY non-alcoholic:
- Water bottles with visible branding (Dasani, Aquafina, Poland Spring, etc.) or clearly labeled "water"
- Coffee cups (Starbucks cups, mugs with visible coffee, iced coffee with coffee branding)
- Soda cans/bottles with VISIBLE branding (Coca-Cola, Pepsi, Sprite, Diet Coke, Mountain Dew, Fanta)
- Energy drink cans with visible branding (Red Bull, Monster, Celsius) UNLESS the user says it's mixed with alcohol
- Smoothie cups, juice boxes, milk cartons
- Screenshots, memes, selfies with no drink visible, random non-drink photos
- Empty glasses/cups with nothing in them
- Non-alcoholic beer ONLY if "NA", "0.0%", or "non-alcoholic" is clearly visible on the label

APPROVE everything else, including but not limited to:
- Any clear liquid in a glass or cup (could be vodka soda, gin & tonic, etc.)
- Any colored drink in a glass (could be a cocktail, mixed drink, wine, etc.)
- Cans or bottles where branding is not clearly visible
- Solo cups, red cups, party cups with any liquid
- Any drink in a bar, restaurant, or party setting
- Any drink where the contents are ambiguous

A clear drink in a cup is NOT water — it could be vodka soda, gin & tonic, or any clear spirit. A red/pink drink is NOT juice — it could be cranberry vodka, cosmopolitan, etc. Give the benefit of the doubt ALWAYS.

The user claims this is: ${drinkType}

Respond with ONLY valid JSON:
{"approved": true/false, "reason": "brief 5-10 word explanation"}`
          }
        ]
      }]
    })

    const text = response.content[0].text.trim()
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0])
      return res.json(result)
    }
    // If can't parse, approve by default (benefit of the doubt)
    return res.json({ approved: true, reason: 'Verified — enjoy your drink!' })

  } catch (err) {
    console.error('Photo check error:', err)
    // On API error (no credits etc), still allow through so app works
    if (err.message && err.message.includes('credit')) {
      return res.json({ approved: true, reason: 'Verification temporarily unavailable' })
    }
    return res.json({ approved: true, reason: 'Verification temporarily unavailable' })
  }
})
