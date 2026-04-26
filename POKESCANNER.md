# PokéScanner — Projektdokumentation

## Koncept
AI-drevet Pokémon TCG kortscanner og porteføljemanager. Brugere scanner kort med kamera eller fil-upload, AI identificerer kortet og estimerer markedsværdi i DKK.

---

## Forretningsmodel
- **Gratis:** 3 scans uden login
- **Pro:** 19 kr./md — ubegrænset scanning + portefølje
- **Betalingsflow:** Paywall popper automatisk op ved 3. scan

---

## Tech Stack (nuværende prototype)
- **Frontend:** React (JSX, hooks)
- **AI:** Claude Vision API (`claude-sonnet-4-20250514`)
- **Storage:** `window.storage` (artifact persistent storage — skal erstattes med Supabase i prod)
- **Baggrundsfjerning:** Canvas flood-fill (client-side, ingen ekstern API)
- **Valuta:** USD → DKK konvertering (kurs 6,88 hardcodet — bør hentes live)

---

## App Views / Flow

```
home → camera → preview → result → portfolio
         ↓                   ↓
      (fil upload)      (gem i portefølje)
         
home → login (hvis ikke logget ind ved gem)
home → paywall (hvis 3 gratis scans brugt)
```

### Views
| View | Beskrivelse |
|------|-------------|
| `home` | Landingsside med scan-tæller, mode-toggle og portefølje-preview |
| `camera` | Live kamera med kortramme overlay + scanline animation |
| `preview` | Kort med fjernet baggrund på ternet baggrund |
| `result` | Kortbillede + AI-vurdering + prisoversigt (DKK) + gem-knap |
| `portfolio` | Alle gemte kort med thumbnail, værdi og samlet porteføljeværdi |
| `login` | Mock login (demo: vælg navn) |

---

## Komponenter

| Komponent | Funktion |
|-----------|----------|
| `CameraViewfinder` | Live `getUserMedia` stream med kortramme, hjørnemarkører, scanline og 📸 capture-knap |
| `Portfolio` | Porteføljeoversigt med samlet værdi, snit, og kortliste med thumbnails |
| `PaywallModal` | Fullscreen modal ved scan-grænse — viser Pro features og pris |
| `ScanCounter` | Prik-indikator for resterende gratis scans |
| `PriceBar` | Animeret prisbjælke per condition (Poor → PSA 10) |
| `StarRating` | 6-stjerne raritetsvurdering |
| `TypeBadge` | Type-farvet badge (Fire = orange, Water = blå osv.) |

---

## AI Integration

### Prompt
Sender kortbillede som `image/jpeg` base64 + tekstprompt der beder om råt JSON uden markdown.

### Response format
```json
{
  "name": "N's Reshiram",
  "set": "Journey Together",
  "cardNumber": "167/159",
  "year": "2025",
  "rarity": "Secret Rare",
  "type": "Fire",
  "condition": "Near Mint",
  "isFirstEdition": false,
  "isShadowless": false,
  "isHolo": true,
  "prices": {
    "poor": 12.00,
    "played": 20.00,
    "nearMint": 38.00,
    "mint": 55.00,
    "psa10": 180.00
  },
  "estimatedValue": 38.00,
  "confidence": "high",
  "notes": "Ekspert note om kortet...",
  "isRealCard": true
}
```

### Priser
AI returnerer USD — konverteres til DKK med `usd * 6.88` (afrundet til hele kr.)

---

## Baggrundsfjerning
Client-side flood-fill fra billedkanter. Samplet baggrundsfarve fra 8 hjørnepunkter, tolerance på 165 (RGB sumafstand). Fungerer godt på ensartede baggrunde (bord, gulv). Til produktion: overveJ `remove.bg` API eller ML-model.

---

## Storage Keys (window.storage / Supabase i prod)
| Key | Indhold |
|-----|---------|
| `portfolio` | JSON array af gemte kort inkl. base64 billede |
| `scansUsed` | Integer — antal gratis scans brugt |
| `user` | JSON `{ name, pro }` |

---

## Mock Data (Demo-tilstand)
Demo kører uden API-nøgle og bruger `MOCK_RESULT` (N's Reshiram 167/159) som simuleret AI-svar med realistiske priser.

---

## TODO / Næste skridt til produktion

### Backend
- [ ] Supabase auth (email/magic link eller Google OAuth)
- [ ] Supabase database: `users`, `cards`, `scans` tabeller
- [ ] Stripe integration for Pro abonnement (19 kr./md)
- [ ] Serverside API-kald til Claude (skjul API-nøgle)
- [ ] Live USD→DKK valutakurs (fx via ECB API)

### Frontend
- [ ] Next.js app (pages: `/`, `/scan`, `/portfolio`, `/login`, `/upgrade`)
- [ ] PWA manifest + service worker (installérbar på mobil)
- [ ] Bedre baggrundsfjerning (remove.bg API eller Transformers.js)
- [ ] Korthistorik med prisudvikling over tid
- [ ] Del-kort funktion (billede + pris til socialt medie)
- [ ] Søg og filtrer portefølje

### AI / Priser
- [ ] Kobl op mod TCGPlayer API for live priser i stedet for AI-estimater
- [ ] PSA population report integration
- [ ] Confidence score baseret på billedkvalitet

### Business
- [ ] Landingsside med pricing
- [ ] Email onboarding flow (MailerLite)
- [ ] Referral program (giv 1 gratis scan, få 1)

---

## Farvepalet (type-farver)
```js
Fire: "#FF6B35"    Water: "#4A90D9"   Grass: "#5BAD6F"
Electric: "#F5C518" Psychic: "#C77DFF" Fighting: "#C0392B"
Dark: "#8B9BB4"    Steel: "#95A5A6"   Dragon: "#6C3483"
Fairy: "#FF85A1"   Normal: "#A0A0A0"  Ice: "#85C1E9"
Ghost: "#7D3C98"   Rock: "#8D6E63"    Ground: "#D4A857"
Bug: "#82AE46"     Poison: "#8E44AD"  Flying: "#87CEEB"
```

---

## Design
- Dark theme: `#0a0a1a` baggrund
- Font: Space Mono (monospace — TCG/retro følelse)
- Accent: `#F5C518` (Pokémon gul) → `#FF6B35` gradient
- Pro accent: `#C77DFF` → `#4A90D9`
- Ternet transparency-baggrund til kortvisning: `repeating-conic-gradient`
