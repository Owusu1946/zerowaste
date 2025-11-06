// Simple script to add sample challenges via API endpoint
// Run this after starting your dev server

const challenges = [
  {
    title: 'First Steps 🌱',
    description: 'Report your first 5 waste locations to get started!',
    challengeType: 'individual',
    goalType: 'reports_count',
    goalAmount: 5,
    rewardPoints: 50,
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    title: 'Waste Warrior ⚔️',
    description: 'Collect 50kg of waste and become a true environmental hero!',
    challengeType: 'individual',
    goalType: 'waste_collected',
    goalAmount: 50,
    rewardPoints: 200,
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    title: 'Weekly Cleanup 📅',
    description: 'Complete 10 waste collections this week!',
    challengeType: 'individual',
    goalType: 'collections_count',
    goalAmount: 10,
    rewardPoints: 100,
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    title: 'Community Hero 🏆',
    description: 'Report 20 waste locations in your neighborhood',
    challengeType: 'individual',
    goalType: 'reports_count',
    goalAmount: 20,
    rewardPoints: 150,
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    title: 'Master Collector 👑',
    description: 'Collect 100kg of waste and earn the ultimate badge!',
    challengeType: 'individual',
    goalType: 'waste_collected',
    goalAmount: 100,
    rewardPoints: 500,
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    title: 'Rapid Responder ⚡',
    description: 'Complete 5 collections within 3 days!',
    challengeType: 'individual',
    goalType: 'collections_count',
    goalAmount: 5,
    rewardPoints: 75,
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
]

console.log('🌱 Sample Challenges Ready to Add:\n')
console.log('Copy these challenges and add them manually via your app or database:\n')
challenges.forEach((challenge, index) => {
  console.log(`${index + 1}. ${challenge.title}`)
  console.log(`   Goal: ${challenge.goalAmount} ${challenge.goalType}`)
  console.log(`   Reward: ${challenge.rewardPoints} points`)
  console.log(`   Duration: ${Math.ceil((new Date(challenge.endDate) - new Date(challenge.startDate)) / (1000 * 60 * 60 * 24))} days\n`)
})

console.log('\n📋 SQL Insert Statements:')
console.log('Copy and paste these into your database:\n')

challenges.forEach(challenge => {
  console.log(`INSERT INTO challenges (title, description, challenge_type, goal_type, goal_amount, reward_points, start_date, end_date, is_active)
VALUES ('${challenge.title}', '${challenge.description}', '${challenge.challengeType}', '${challenge.goalType}', ${challenge.goalAmount}, ${challenge.rewardPoints}, '${challenge.startDate}', '${challenge.endDate}', true);
`)
})
