import { createChallenge } from '../src/utils/db/actions'

async function seedChallenges() {
  console.log('🌱 Seeding challenges...')

  const challenges = [
    {
      title: 'First Steps',
      description: 'Report your first 5 waste locations to get started!',
      challengeType: 'individual',
      goalType: 'reports_count',
      goalAmount: 5,
      rewardPoints: 50,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    },
    {
      title: 'Waste Warrior',
      description: 'Collect 50kg of waste and become a true environmental hero!',
      challengeType: 'individual',
      goalType: 'waste_collected',
      goalAmount: 50,
      rewardPoints: 200,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
    {
      title: 'Weekly Cleanup',
      description: 'Complete 10 waste collections this week!',
      challengeType: 'individual',
      goalType: 'collections_count',
      goalAmount: 10,
      rewardPoints: 100,
      startDate: new Date(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
    {
      title: 'Community Hero',
      description: 'Report 20 waste locations in your neighborhood',
      challengeType: 'individual',
      goalType: 'reports_count',
      goalAmount: 20,
      rewardPoints: 150,
      startDate: new Date(),
      endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
    },
    {
      title: 'Master Collector',
      description: 'Collect 100kg of waste and earn the ultimate badge!',
      challengeType: 'individual',
      goalType: 'waste_collected',
      goalAmount: 100,
      rewardPoints: 500,
      startDate: new Date(),
      endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
    },
    {
      title: 'Rapid Responder',
      description: 'Complete 5 collections within 3 days!',
      challengeType: 'individual',
      goalType: 'collections_count',
      goalAmount: 5,
      rewardPoints: 75,
      startDate: new Date(),
      endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days
    },
  ]

  let successCount = 0
  let failCount = 0

  for (const challenge of challenges) {
    try {
      const result = await createChallenge(challenge)
      if (result) {
        console.log(`✅ Created challenge: ${challenge.title}`)
        successCount++
      } else {
        console.error(`❌ Failed to create challenge: ${challenge.title}`)
        failCount++
      }
    } catch (error) {
      console.error(`❌ Error creating challenge "${challenge.title}":`, error)
      failCount++
    }
  }

  console.log(`\n📊 Seeding Summary:`)
  console.log(`   ✅ Success: ${successCount}`)
  console.log(`   ❌ Failed: ${failCount}`)
  console.log(`   📝 Total: ${challenges.length}`)
  console.log('\n🎉 Challenge seeding complete!\n')
}

// Run the seed function
seedChallenges()
  .then(() => {
    console.log('✨ All done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Seeding failed:', error)
    process.exit(1)
  })
