# 🌍 Zero2Hero - Blockchain-Powered Waste Management

Transform waste into impact and rewards with blockchain technology.

[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

## 🎯 Overview

**Zero2Hero** is a revolutionary waste management platform that incentivizes environmental action through tokenized rewards and NFT badges. Built for ETHOnline 2024 Hackathon.

### Key Features

- 📸 **Report Waste** - Earn 10 points for each verified report
- ♻️ **Collect Waste** - Get rewarded based on collection amount
- 🏆 **Community Challenges** - Compete and earn bonus rewards
- 🎖️ **NFT Badges** - Collect unique achievement badges
- 🎁 **Rewards Marketplace** - Exchange points for real rewards
- 🤖 **AI Verification** - Automated waste verification with Google Gemini

## 🚀 Quick Start

### Prerequisites

- Node.js >= 20.0.0
- PostgreSQL database (or Neon)
- Yarn or npm

### Installation

```bash
# Clone repository
git clone https://github.com/Owusu1946/zerowaste.git
cd zero-to-hero

# Install dependencies
yarn install

# Setup environment
cp .env.example .env.local
# Edit .env.local with your configuration

# Push database schema
yarn db:push

# Seed initial data (optional)
node seed-challenges.js

# Start development server
yarn dev
```

Open [http://localhost:3000](http://localhost:3000)

## 📋 Environment Variables

Create `.env.local` with:

```env
# Database
DATABASE_URL="postgresql://user:password@host/database"

# AI Verification
GEMINI_API_KEY="your_gemini_api_key"

# Blockchain
PRIVATE_KEY="your_private_key"
BASE_SEPOLIA_RPC="https://sepolia.base.org"

# Google Maps
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="your_maps_api_key"
```

## 🏗️ Tech Stack

**Frontend:**
- Next.js 14 (App Router)
- React 18
- TypeScript
- Tailwind CSS
- Radix UI
- Leaflet Maps

**Backend:**
- Next.js Server Actions
- Drizzle ORM
- PostgreSQL
- Google Gemini AI

**Blockchain:**
- Solidity
- Hardhat
- Ethers.js
- LayerZero V2
- Chainlink
- OpenZeppelin

## 📱 Application Pages

- `/` - Dashboard with stats and activity
- `/auth` - Beautiful split-screen authentication
- `/report` - Report waste locations
- `/collect` - Collect reported waste
- `/challenges` - Community challenges
- `/rewards` - Rewards marketplace
- `/leaderboard` - Global rankings
- `/settings` - User preferences

## 🗄️ Database Schema

Key tables:
- `users` - User accounts
- `reports` - Waste reports
- `rewards` - User rewards
- `transactions` - Point transactions
- `challenges` - Active challenges
- `challenge_participants` - Challenge progress
- `notifications` - User notifications

## 🔗 Blockchain Integration

### Smart Contracts

1. **Token Contract** (ERC-20)
   - Reward distribution
   - Cross-chain via LayerZero

2. **NFT Badge Contract** (ERC-721)
   - Achievement badges
   - Evolving metadata

### Supported Networks

- Ethereum Sepolia
- Base Sepolia

## 🎮 How It Works - Solomon's Complete Journey

### Meet Solomon 👨‍💼

Solomon is a 28-year-old environmental enthusiast in Accra, Ghana, who discovered Zero2Hero and decided to make a difference. Let's follow his complete journey from signup to becoming a top contributor.

---

## 📖 30-Day User Journey

### 🚀 Day 1: Discovery & Authentication

#### **Step 1: Landing Page**
Solomon visits `https://zero2hero.app`. Without login, he sees a clean landing page but most features are inaccessible. He clicks **"Get Started"**.

#### **Step 2: Beautiful Split-Screen Auth** (`/auth`)

**What Solomon Sees:**
- **Left:** Gradient background with platform benefits, stats (10K+ users), and features
- **Right:** Clean signup form with Login/Sign Up tabs

**Solomon's Action:**
1. Clicks **"Sign Up"** tab
2. Enters name: `Solomon Mensah`
3. Enters email: `solomon.mensah@email.com`
4. Clicks **"Create Account"**

**System Response:**
```typescript
await createUser(email, name)
localStorage.setItem('userEmail', email)
toast.success('Account created! 🚀')
router.push('/') // Redirect to dashboard
```

**Result:** Solomon is logged in! Header & Sidebar now appear ✅

---

### 🏠 First Dashboard Experience

**New UI Elements:**
- ✅ Header with search, notifications (0), balance (0 points), profile dropdown
- ✅ Sidebar with navigation (Home, Report, Collect, Challenges, Rewards, etc.)

**Dashboard Stats:**
- Total Rewards: **0 points**
- Waste Reported: **0 locations**
- Waste Collected: **0 kg**
- Active Challenges: **3 available**

---

### 📸 Day 1: First Waste Report (`/report`)

**Step-by-Step Process:**

1. **Upload Image:** Solomon snaps photo of plastic bottles near his street, uploads it

2. **AI Verification:** Clicks **"Verify Waste"** →
   ```
   ✅ Verification Successful
   Waste Type: Plastic
   Quantity: Medium (5-10 items)
   Confidence: 95%
   ```

3. **Location:** Types "Kaneshie Market, Accra" or pins on map

4. **Submit Report** →

**System Actions:**
```typescript
// Award points
await updateRewardPoints(solomon.id, 10)

// Create transaction
await createTransaction(solomon.id, 'earned_report', 10)

// Notification
toast.success('Earned 10 points! 🎉')
```

**Result:**
- Balance: 0 → **10 points** 🎉
- Waste Reported: 1 location
- Impact Score: 5/100

---

### 🏆 Day 2: Joining Challenges (`/challenges`)

**Available Challenges:**

**1. Plastic Patrol:** Report 50 locations in 7 days → **100 points + Badge**

**2. Weekend Cleanup:** Collect 100kg in 14 days → **200 points + NFT**

**3. Community Hero:** Report 20 locations in 30 days → **150 points + Hero Badge**

**Solomon's Action:** Joins "Plastic Patrol" and "Community Hero"

**System:**
```typescript
await joinChallenge(solomon.id, challengeId)
await updateChallengeProgress(solomon.id, challengeId, 1) // Auto-credit first report
```

**Result:** Active challenges: 2, Progress auto-updated to 1/50 and 1/20

---

### 📸 Days 3-7: Momentum Building

**Solomon's Activity:**
- **Day 3:** 3 reports → +30 points (Balance: 40)
- **Day 5:** 5 reports → +50 points (Balance: 90)  
- **Day 7:** 6 reports → +60 points (Balance: 150)

**Progress:** 15/50 Plastic Patrol, 15/20 Community Hero

**Rank:** #847 → #342 globally 📈

---

### ♻️ Day 8: First Collection (`/collect`)

**Process:**
1. **View Map:** Solomon sees nearby reported waste locations
2. **Select Location:** Accra Mall (0.8km away) - 15kg mixed waste
3. **Collect & Document:** Takes photo, weighs waste: 15kg
4. **Submit Collection:**

**System Actions:**
```typescript
// 1 point per kg
await saveReward(solomon.id, 15, wasteAmount: 15)
await checkAndUpdateChallenges(solomon.id, 'collect', 15)
```

**Result:**
- Balance: 150 → **165 points**
- Waste Collected: 15kg
- Weekend Cleanup: 15/100kg (15%)
- Impact: CO2 saved, trees equivalent updated

---

### 🎁 Day 10: First Rewards (`/rewards`)

**Balance:** 165 points

**Solomon Redeems:**
1. **$5 Amazon Gift Card** (100 points) → Sent to email ✅
2. **Tree Planting Certificate** (50 points) → NFT minted ✅

**System:**
```typescript
await redeemReward(solomon.id, rewardId)
await createTransaction(solomon.id, 'redeemed', 100)
// NFT minting to wallet
```

**Final Balance:** 165 - 150 = **15 points**

**Recent Transactions:**
- ↑ +10 points (x15 reports)
- ↑ +15 points (collection)
- ↓ -100 points (Amazon card)
- ↓ -50 points (Tree certificate)

---

### 🏆 Day 15: Challenge Completed!

**Community Hero: COMPLETED** 🎊
- Progress: 20/20 locations (100%)
- Status: Completed ✅

**System Response:**
```typescript
await updateChallengeProgress(solomon.id, challengeId, 20, completed: true)
await updateRewardPoints(solomon.id, 150) // Bonus
await mintNFTBadge(solomon.wallet, 'Community Hero')
```

**Celebration:**
```
🎊 CHALLENGE COMPLETED!
Community Hero

✅ Reported 20 different locations
✅ Earned 150 bonus points
✅ Hero Badge NFT minted

Current Balance: 235 points
```

**Updated Stats:**
- Completed Challenges: 1
- NFT Badges: 1 (Hero Badge)
- Global Rank: #342 → **#89** (Top 1%!) 🔥

---

### 📊 Day 20: Leaderboard (`/leaderboard`)

**Global Rankings:**
```
#1  EcoMaster_GH      2,450 pts  (180 reports, 520kg)
#2  GreenWarrior      2,100 pts  (165 reports, 480kg)
...
#89 Solomon Mensah ⭐  235 pts   (20 reports, 45kg)
```

**Local (Accra):**
```
#1  CleanAccra       1,890 pts
#2  AccraHero        1,250 pts
#3  GhanaGreen         890 pts
#4  Solomon Mensah ⭐  235 pts  👈
```

Solomon is **#4 in Accra**, **#89 globally** (Top 1%!)

---

### 💬 Day 25: Community (`/messages`)

**Messages Received:**
- From **CleanAccra**: "Great work! Want to team up?"
- From **Zero2Hero**: "Congrats on completing Community Hero!"
- From **GhanaGreen**: "Thanks for the accurate reports!"

Solomon replies and forms a team for future challenges.

---

### 📈 Day 30: Impact Summary

**30-Day Results:**

**Points & Ranking:**
- Total Earned: **385 points**
- Total Redeemed: **150 points**
- Current Balance: **235 points**
- Global Rank: **#89 / 10,847 users** (Top 1%)
- Local Rank: **#4 in Accra**

**Activity:**
- Waste Reports: **20 locations**
- Waste Collected: **45 kg**
- Challenges Completed: **1**
- NFT Badges Earned: **1** (Hero Badge)

**Real Environmental Impact:**
- 🌱 CO2 Prevented: **67.5 kg**
- 🌳 Trees Equivalent: **3.2 trees**
- ♻️ Waste Diverted: **45 kg** from landfills
- 👥 Community Influence: Inspired **5+ others** to join

**Rewards Claimed:**
- 💳 $5 Amazon Gift Card
- 🌳 Tree Planting Certificate + NFT
- 🏆 Hero Badge NFT
- ⭐ Top 100 Global Status

---

## 🎯 Key Success Factors

### Why Solomon Succeeded:

1. **Consistent Action** - Small daily efforts compound (20 reports = significant impact)
2. **Challenge Strategy** - Joined early, tracked progress, earned 150 bonus points
3. **Diversification** - Both reporting AND collecting waste
4. **Community Engagement** - Connected with others, formed teams
5. **Real Rewards** - Converted points to actual value ($5 card, tree certificate)

### Platform Benefits Demonstrated:

✅ **Easy Onboarding** - Email-only auth, no friction
✅ **Immediate Rewards** - 10 points per report, instant gratification
✅ **Gamification Works** - Challenges, leaderboards drove engagement
✅ **Real Impact** - Actual environmental benefit measured
✅ **Crypto Integration** - NFT badges, blockchain redemption
✅ **Community Power** - Social features enhanced experience
✅ **Transparency** - All actions tracked and verified

---

## 🚀 Your Journey Starts Here

Just like Solomon, you can:
- 📸 Report waste in your community
- ♻️ Collect and earn rewards
- 🏆 Complete challenges for bonuses
- 🎁 Redeem real rewards
- 🌍 Make measurable environmental impact
- 🤝 Connect with eco-warriors globally

**Start your Zero2Hero journey today!**

## 📚 Documentation

Detailed documentation available in `/src/app/docs/`:

- [Blockchain Setup](./src/app/docs/BLOCKCHAIN_SETUP.md)
- [Challenges Guide](./src/app/docs/CHALLENGES_IMPLEMENTATION_COMPLETE.md)
- [Auth System](./src/app/docs/AUTH_PROTECTION_UPDATE.md)
- [Quick Start](./src/app/docs/QUICK_START_CHALLENGES.md)

## 🛠️ Available Scripts

```bash
# Development
yarn dev              # Start dev server
yarn build            # Build for production
yarn start            # Start production server

# Database
yarn db:push          # Push schema to database
yarn db:studio        # Open Drizzle Studio

# Linting
yarn lint             # Run ESLint
```

## 🔐 Authentication

**Current:** Email-based authentication
- No password required
- Simple email + name input
- localStorage session management

**Coming Soon:**
- Web3Auth social login
- Wallet-based authentication

## 🌟 Features Overview

### For Users
- ✅ Easy waste reporting
- ✅ Earn rewards for actions
- ✅ Compete in challenges
- ✅ Collect NFT badges
- ✅ Track environmental impact

### For Environment
- ✅ Verified waste collection
- ✅ Community engagement
- ✅ Transparent tracking
- ✅ Gamified participation

## 🚧 Roadmap

- [ ] More blockchain networks
- [ ] Enhanced AI verification
- [ ] Reward partnerships
- [ ] Team challenges
- [ ] Social features

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Open pull request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

Built for **ETHOnline 2024 Hackathon**

**Technologies:**
- Next.js & React
- Ethereum & Base
- LayerZero
- Chainlink
- Google Gemini AI
- Drizzle ORM

## 📞 Support

For issues or questions:
- GitHub Issues
- Documentation in `/src/app/docs/`

---

**Made with 💚 for a cleaner planet**
