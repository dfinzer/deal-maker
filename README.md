# Deal Maker

Private deal negotiation using commit-reveal cryptography and MetaMask wallet auth.

## How it works

1. **Seller** creates a deal and sets their minimum price
2. **Buyer** joins via link and sets their maximum price
3. Both values are cryptographically committed (hashed with a random nonce)
4. After both commit, both reveal their values
5. If buyer's max >= seller's min: **DEAL** at the midpoint
6. If buyer's max < seller's min: **NO DEAL**, values stay private

## Setup

1. Create an [Upstash Redis](https://upstash.com) database
2. Copy `.env.example` to `.env.local` and fill in credentials
3. `npm install && npm run dev`

## Deploy to Vercel

1. Push to GitHub, import in Vercel, add Upstash env vars, deploy
