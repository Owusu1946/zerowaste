import { db } from './dbConfig';
import { Users, Reports, Rewards, CollectedWastes, Notifications, Transactions, Challenges, ChallengeParticipants } from './schema';
import { eq, sql, and, desc, ne, gte, lte } from 'drizzle-orm';

export async function createUser(email: string, name: string) {
  try {
    const [user] = await db.insert(Users).values({ email, name }).returning().execute();
    return user;
  } catch (error) {
    console.error("Error creating user:", error);
    return null;
  }
}

export async function getUserByEmail(email: string) {
  try {
    const [user] = await db.select().from(Users).where(eq(Users.email, email)).execute();
    return user;
  } catch (error) {
    console.error("Error fetching user by email:", error);
    return null;
  }
}

export async function createReport(
  userId: number,
  location: string,
  wasteType: string,
  amount: string,
  imageUrl?: string,
  type?: string,
  verificationResult?: any
) {
  try {
    const [report] = await db
      .insert(Reports)
      .values({
        userId,
        location,
        wasteType,
        amount,
        imageUrl,
        verificationResult,
        status: "pending",
      })
      .returning()
      .execute();

    // Award 10 points for reporting waste
    const pointsEarned = 10;
    await updateRewardPoints(userId, pointsEarned);

    // Create a transaction for the earned points
    await createTransaction(userId, 'earned_report', pointsEarned, 'Points earned for reporting waste');

    // Create a notification for the user
    await createNotification(
      userId,
      `You've earned ${pointsEarned} points for reporting waste!`,
      'reward'
    );

    // Update challenge progress
    await checkAndUpdateChallenges(userId, 'report');

    return report;
  } catch (error) {
    console.error("Error creating report:", error);
    return null;
  }
}

export async function getReportsByUserId(userId: number) {
  try {
    const reports = await db.select().from(Reports).where(eq(Reports.userId, userId)).execute();
    return reports;
  } catch (error) {
    console.error("Error fetching reports:", error);
    return [];
  }
}

export async function getOrCreateReward(userId: number) {
  try {
    let [reward] = await db.select().from(Rewards).where(eq(Rewards.userId, userId)).execute();
    if (!reward) {
      [reward] = await db.insert(Rewards).values({
        userId,
        name: 'Default Reward',
        collectionInfo: 'Default Collection Info',
        points: 0,
        level: 1,
        isAvailable: true,
      }).returning().execute();
    }
    return reward;
  } catch (error) {
    console.error("Error getting or creating reward:", error);
    return null;
  }
}

export async function updateRewardPoints(userId: number, pointsToAdd: number) {
  try {
    const [updatedReward] = await db
      .update(Rewards)
      .set({ 
        points: sql`${Rewards.points} + ${pointsToAdd}`,
        updatedAt: new Date()
      })
      .where(eq(Rewards.userId, userId))
      .returning()
      .execute();
    return updatedReward;
  } catch (error) {
    console.error("Error updating reward points:", error);
    return null;
  }
}

export async function createCollectedWaste(reportId: number, collectorId: number, notes?: string) {
  try {
    const [collectedWaste] = await db
      .insert(CollectedWastes)
      .values({
        reportId,
        collectorId,
        collectionDate: new Date(),
      })
      .returning()
      .execute();
    return collectedWaste;
  } catch (error) {
    console.error("Error creating collected waste:", error);
    return null;
  }
}

export async function getCollectedWastesByCollector(collectorId: number) {
  try {
    return await db.select().from(CollectedWastes).where(eq(CollectedWastes.collectorId, collectorId)).execute();
  } catch (error) {
    console.error("Error fetching collected wastes:", error);
    return [];
  }
}

export async function createNotification(userId: number, message: string, type: string) {
  try {
    const [notification] = await db
      .insert(Notifications)
      .values({ userId, message, type })
      .returning()
      .execute();
    return notification;
  } catch (error) {
    console.error("Error creating notification:", error);
    return null;
  }
}

export async function getUnreadNotifications(userId: number) {
  try {
    return await db.select().from(Notifications).where(
      and(
        eq(Notifications.userId, userId),
        eq(Notifications.isRead, false)
      )
    ).execute();
  } catch (error) {
    console.error("Error fetching unread notifications:", error);
    return [];
  }
}

export async function markNotificationAsRead(notificationId: number) {
  try {
    await db.update(Notifications).set({ isRead: true }).where(eq(Notifications.id, notificationId)).execute();
  } catch (error) {
    console.error("Error marking notification as read:", error);
  }
}

export async function getPendingReports() {
  try {
    return await db.select().from(Reports).where(eq(Reports.status, "pending")).execute();
  } catch (error) {
    console.error("Error fetching pending reports:", error);
    return [];
  }
}

export async function updateReportStatus(reportId: number, status: string) {
  try {
    const [updatedReport] = await db
      .update(Reports)
      .set({ status })
      .where(eq(Reports.id, reportId))
      .returning()
      .execute();
    return updatedReport;
  } catch (error) {
    console.error("Error updating report status:", error);
    return null;
  }
}

export async function getRecentReports(limit: number = 10) {
  try {
    const reports = await db
      .select()
      .from(Reports)
      .orderBy(desc(Reports.createdAt))
      .limit(limit)
      .execute();
    return reports;
  } catch (error) {
    console.error("Error fetching recent reports:", error);
    return [];
  }
}

export async function getWasteCollectionTasks(limit: number = 20) {
  try {
    const tasks = await db
      .select({
        id: Reports.id,
        location: Reports.location,
        wasteType: Reports.wasteType,
        amount: Reports.amount,
        status: Reports.status,
        date: Reports.createdAt,
        collectorId: Reports.collectorId,
        imageUrl: Reports.imageUrl,
        verificationResult: Reports.verificationResult,
      })
      .from(Reports)
      .limit(limit)
      .execute();

    return tasks.map(task => ({
      ...task,
      date: task.date.toISOString().split('T')[0], // Format date as YYYY-MM-DD
    }));
  } catch (error) {
    console.error("Error fetching waste collection tasks:", error);
    return [];
  }
}

export async function saveReward(userId: number, amount: number, wasteAmount?: number) {
  try {
    const [reward] = await db
      .insert(Rewards)
      .values({
        userId,
        name: 'Waste Collection Reward',
        collectionInfo: 'Points earned from waste collection',
        points: amount,
        level: 1,
        isAvailable: true,
      })
      .returning()
      .execute();
    
    // Create a transaction for this reward
    await createTransaction(userId, 'earned_collect', amount, 'Points earned for collecting waste');

    // Update challenge progress
    await checkAndUpdateChallenges(userId, 'collect', wasteAmount);

    return reward;
  } catch (error) {
    console.error("Error saving reward:", error);
    throw error;
  }
}

export async function saveCollectedWaste(reportId: number, collectorId: number, verificationResult: any) {
  try {
    const [collectedWaste] = await db
      .insert(CollectedWastes)
      .values({
        reportId,
        collectorId,
        collectionDate: new Date(),
        status: 'verified',
      })
      .returning()
      .execute();
    return collectedWaste;
  } catch (error) {
    console.error("Error saving collected waste:", error);
    throw error;
  }
}

export async function updateTaskStatus(reportId: number, newStatus: string, collectorId?: number) {
  try {
    const updateData: any = { status: newStatus };
    if (collectorId !== undefined) {
      updateData.collectorId = collectorId;
    }
    const [updatedReport] = await db
      .update(Reports)
      .set(updateData)
      .where(eq(Reports.id, reportId))
      .returning()
      .execute();
    return updatedReport;
  } catch (error) {
    console.error("Error updating task status:", error);
    throw error;
  }
}

export async function getAllRewards() {
  try {
    const rewards = await db
      .select({
        id: Rewards.id,
        userId: Rewards.userId,
        points: Rewards.points,
        level: Rewards.level,
        createdAt: Rewards.createdAt,
        userName: Users.name,
      })
      .from(Rewards)
      .leftJoin(Users, eq(Rewards.userId, Users.id))
      .orderBy(desc(Rewards.points))
      .execute();

    return rewards;
  } catch (error) {
    console.error("Error fetching all rewards:", error);
    return [];
  }
}

export async function getRewardTransactions(userId: number) {
  try {
    console.log('Fetching transactions for user ID:', userId)
    const transactions = await db
      .select({
        id: Transactions.id,
        type: Transactions.type,
        amount: Transactions.amount,
        description: Transactions.description,
        date: Transactions.date,
      })
      .from(Transactions)
      .where(eq(Transactions.userId, userId))
      .orderBy(desc(Transactions.date))
      .limit(10)
      .execute();

    console.log('Raw transactions from database:', transactions)

    const formattedTransactions = transactions.map(t => ({
      ...t,
      date: t.date.toISOString().split('T')[0], // Format date as YYYY-MM-DD
    }));

    console.log('Formatted transactions:', formattedTransactions)
    return formattedTransactions;
  } catch (error) {
    console.error("Error fetching reward transactions:", error);
    return [];
  }
}

export async function getAvailableRewards(userId: number) {
  try {
    console.log('Fetching available rewards for user:', userId);
    
    // Get user's total points
    const userTransactions = await getRewardTransactions(userId);
    const userPoints = userTransactions.reduce((total, transaction) => {
      return transaction.type.startsWith('earned') ? total + transaction.amount : total - transaction.amount;
    }, 0);

    console.log('User total points:', userPoints);

    // Get available rewards from the database
    const dbRewards = await db
      .select({
        id: Rewards.id,
        name: Rewards.name,
        cost: Rewards.points,
        description: Rewards.description,
        collectionInfo: Rewards.collectionInfo,
      })
      .from(Rewards)
      .where(eq(Rewards.isAvailable, true))
      .execute();

    console.log('Rewards from database:', dbRewards);

    // Combine user points and database rewards
    const allRewards = [
      {
        id: 0, // Use a special ID for user's points
        name: "Your Points",
        cost: userPoints,
        description: "Redeem your earned points",
        collectionInfo: "Points earned from reporting and collecting waste"
      },
      ...dbRewards
    ];

    console.log('All available rewards:', allRewards);
    return allRewards;
  } catch (error) {
    console.error("Error fetching available rewards:", error);
    return [];
  }
}

export async function createTransaction(userId: number, type: 'earned_report' | 'earned_collect' | 'redeemed', amount: number, description: string) {
  try {
    const [transaction] = await db
      .insert(Transactions)
      .values({ userId, type, amount, description })
      .returning()
      .execute();
    return transaction;
  } catch (error) {
    console.error("Error creating transaction:", error);
    throw error;
  }
}

export async function redeemReward(userId: number, rewardId: number) {
  try {
    const userReward = await getOrCreateReward(userId) as any;
    
    if (rewardId === 0) {
      // Redeem all points
      const [updatedReward] = await db.update(Rewards)
        .set({ 
          points: 0,
          updatedAt: new Date(),
        })
        .where(eq(Rewards.userId, userId))
        .returning()
        .execute();

      // Create a transaction for this redemption
      await createTransaction(userId, 'redeemed', userReward.points, `Redeemed all points: ${userReward.points}`);

      return updatedReward;
    } else {
      // Existing logic for redeeming specific rewards
      const availableReward = await db.select().from(Rewards).where(eq(Rewards.id, rewardId)).execute();

      if (!userReward || !availableReward[0] || userReward.points < availableReward[0].points) {
        throw new Error("Insufficient points or invalid reward");
      }

      const [updatedReward] = await db.update(Rewards)
        .set({ 
          points: sql`${Rewards.points} - ${availableReward[0].points}`,
          updatedAt: new Date(),
        })
        .where(eq(Rewards.userId, userId))
        .returning()
        .execute();

      // Create a transaction for this redemption
      await createTransaction(userId, 'redeemed', availableReward[0].points, `Redeemed: ${availableReward[0].name}`);

      return updatedReward;
    }
  } catch (error) {
    console.error("Error redeeming reward:", error);
    throw error;
  }
}

export async function getUserBalance(userId: number): Promise<number> {
  const transactions = await getRewardTransactions(userId);
  const balance = transactions.reduce((acc, transaction) => {
    return transaction.type.startsWith('earned') ? acc + transaction.amount : acc - transaction.amount
  }, 0);
  return Math.max(balance, 0); // Ensure balance is never negative
}

// ========== CHALLENGE ACTIONS ==========

export async function createChallenge(data: {
  title: string;
  description: string;
  challengeType: string;
  goalType: string;
  goalAmount: number;
  rewardPoints: number;
  startDate: Date;
  endDate: Date;
}) {
  try {
    const [challenge] = await db.insert(Challenges).values(data).returning().execute();
    return challenge;
  } catch (error) {
    console.error("Error creating challenge:", error);
    return null;
  }
}

export async function getActiveChallenges() {
  try {
    const now = new Date();
    const challenges = await db
      .select()
      .from(Challenges)
      .where(
        and(
          eq(Challenges.isActive, true),
          lte(Challenges.startDate, now),
          gte(Challenges.endDate, now)
        )
      )
      .execute();
    return challenges;
  } catch (error) {
    console.error("Error fetching active challenges:", error);
    return [];
  }
}

export async function getAllChallenges() {
  try {
    const challenges = await db
      .select()
      .from(Challenges)
      .orderBy(desc(Challenges.createdAt))
      .execute();
    return challenges;
  } catch (error) {
    console.error("Error fetching all challenges:", error);
    return [];
  }
}

export async function getChallengeById(challengeId: number) {
  try {
    const [challenge] = await db
      .select()
      .from(Challenges)
      .where(eq(Challenges.id, challengeId))
      .execute();
    return challenge;
  } catch (error) {
    console.error("Error fetching challenge:", error);
    return null;
  }
}

export async function joinChallenge(userId: number, challengeId: number) {
  try {
    // Check if already joined
    const existing = await db
      .select()
      .from(ChallengeParticipants)
      .where(
        and(
          eq(ChallengeParticipants.userId, userId),
          eq(ChallengeParticipants.challengeId, challengeId)
        )
      )
      .execute();

    if (existing.length > 0) {
      return { success: false, message: 'Already joined this challenge' };
    }

    const [participant] = await db
      .insert(ChallengeParticipants)
      .values({ userId, challengeId })
      .returning()
      .execute();

    return { success: true, participant };
  } catch (error) {
    console.error("Error joining challenge:", error);
    return { success: false, message: 'Failed to join challenge' };
  }
}

export async function getUserChallenges(userId: number) {
  try {
    const participants = await db
      .select()
      .from(ChallengeParticipants)
      .where(eq(ChallengeParticipants.userId, userId))
      .execute();
    
    if (participants.length === 0) return [];

    const challengeIds = participants.map(p => p.challengeId);
    const challenges = await db
      .select()
      .from(Challenges)
      .where(sql`${Challenges.id} IN (${sql.join(challengeIds.map(id => sql`${id}`), sql`, `)})`)
      .execute();

    // Combine challenge data with participant data
    return challenges.map(challenge => {
      const participant = participants.find(p => p.challengeId === challenge.id);
      return {
        ...challenge,
        progress: participant?.progress || 0,
        completed: participant?.completed || false,
        joinedAt: participant?.joinedAt,
        completedAt: participant?.completedAt,
      };
    });
  } catch (error) {
    console.error("Error fetching user challenges:", error);
    return [];
  }
}

export async function updateChallengeProgress(
  userId: number,
  challengeId: number,
  progressIncrement: number
) {
  try {
    // Get current progress
    const [participant] = await db
      .select()
      .from(ChallengeParticipants)
      .where(
        and(
          eq(ChallengeParticipants.userId, userId),
          eq(ChallengeParticipants.challengeId, challengeId)
        )
      )
      .execute();

    if (!participant) {
      // User hasn't joined this challenge, auto-join them
      await joinChallenge(userId, challengeId);
      return await updateChallengeProgress(userId, challengeId, progressIncrement);
    }

    if (participant.completed) {
      return { success: true, message: 'Challenge already completed' };
    }

    const newProgress = participant.progress + progressIncrement;

    // Get challenge details
    const challenge = await getChallengeById(challengeId);
    if (!challenge) {
      return { success: false, message: 'Challenge not found' };
    }

    const isCompleted = newProgress >= challenge.goalAmount;

    // Update progress
    await db
      .update(ChallengeParticipants)
      .set({
        progress: newProgress,
        completed: isCompleted,
        completedAt: isCompleted ? new Date() : null,
      })
      .where(
        and(
          eq(ChallengeParticipants.userId, userId),
          eq(ChallengeParticipants.challengeId, challengeId)
        )
      )
      .execute();

    // Award points if completed
    if (isCompleted) {
      await createTransaction(
        userId,
        'earned_collect',
        challenge.rewardPoints,
        `Completed challenge: ${challenge.title}`
      );

      await createNotification(
        userId,
        `Congratulations! You completed "${challenge.title}" and earned ${challenge.rewardPoints} points! 🎉`,
        'challenge_complete'
      );
    }

    return {
      success: true,
      newProgress,
      completed: isCompleted,
      rewardPoints: isCompleted ? challenge.rewardPoints : 0,
    };
  } catch (error) {
    console.error("Error updating challenge progress:", error);
    return { success: false, message: 'Failed to update progress' };
  }
}

export async function checkAndUpdateChallenges(userId: number, action: 'report' | 'collect', amount?: number) {
  try {
    const activeChallenges = await getActiveChallenges();
    const userChallenges = await getUserChallenges(userId);

    for (const challenge of activeChallenges) {
      // Check if user is participating
      const userChallenge = userChallenges.find(uc => uc.id === challenge.id);
      
      let shouldUpdate = false;
      let increment = 0;

      // Determine if this action affects this challenge
      if (action === 'report' && challenge.goalType === 'reports_count') {
        shouldUpdate = true;
        increment = 1;
      } else if (action === 'collect' && challenge.goalType === 'collections_count') {
        shouldUpdate = true;
        increment = 1;
      } else if (action === 'collect' && challenge.goalType === 'waste_collected' && amount) {
        shouldUpdate = true;
        increment = amount;
      }

      if (shouldUpdate) {
        await updateChallengeProgress(userId, challenge.id, increment);
      }
    }
  } catch (error) {
    console.error("Error checking and updating challenges:", error);
  }
}
