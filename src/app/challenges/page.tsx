'use client'
import { useState, useEffect } from 'react'
import { Trophy, Users, Target, Calendar, Award, Loader, CheckCircle, Clock, Flame } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getActiveChallenges, getUserByEmail, joinChallenge, getUserChallenges } from '@/utils/db/actions'
import { toast } from 'react-hot-toast'
import { useRouter } from 'next/navigation'

type Challenge = {
  id: number
  title: string
  description: string
  challengeType: string
  goalType: string
  goalAmount: number
  rewardPoints: number
  startDate: Date
  endDate: Date
  isActive: boolean
  progress?: number
  completed?: boolean
  joinedAt?: Date
}

export default function ChallengesPage() {
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [userChallenges, setUserChallenges] = useState<Challenge[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        const email = localStorage.getItem('userEmail')
        if (!email) {
          router.push('/login')
          return
        }

        const fetchedUser = await getUserByEmail(email)
        if (!fetchedUser) {
          toast.error('User not found')
          router.push('/login')
          return
        }
        setUser(fetchedUser)

        const [active, userChallengesData] = await Promise.all([
          getActiveChallenges(),
          getUserChallenges(fetchedUser.id)
        ])

        setChallenges(active)
        setUserChallenges(userChallengesData)
      } catch (error) {
        console.error('Error fetching challenges:', error)
        toast.error('Failed to load challenges')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [router])

  const handleJoinChallenge = async (challengeId: number) => {
    if (!user) {
      toast.error('Please log in to join challenges')
      return
    }

    try {
      const result = await joinChallenge(user.id, challengeId)
      
      if (result.success) {
        toast.success('Successfully joined challenge! 🎉')
        // Refresh user challenges
        const updated = await getUserChallenges(user.id)
        setUserChallenges(updated)
      } else {
        toast.error(result.message || 'Failed to join challenge')
      }
    } catch (error) {
      console.error('Error joining challenge:', error)
      toast.error('Failed to join challenge')
    }
  }

  const isJoined = (challengeId: number) => {
    return userChallenges.some(uc => uc.id === challengeId)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader className="w-12 h-12 animate-spin text-green-600" />
      </div>
    )
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center mb-8">
        <div className="bg-gradient-to-br from-yellow-400 to-orange-500 p-4 rounded-2xl mr-4">
          <Trophy className="w-12 h-12 text-white" />
        </div>
        <div>
          <h1 className="text-4xl font-bold text-gray-800">Community Challenges</h1>
          <p className="text-gray-600">Compete, earn rewards, and make an impact!</p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-2xl shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Active Challenges</p>
              <p className="text-3xl font-bold text-green-600">{challenges.length}</p>
            </div>
            <Flame className="w-12 h-12 text-orange-500" />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Your Challenges</p>
              <p className="text-3xl font-bold text-blue-600">{userChallenges.length}</p>
            </div>
            <Target className="w-12 h-12 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Completed</p>
              <p className="text-3xl font-bold text-purple-600">
                {userChallenges.filter(uc => uc.completed).length}
              </p>
            </div>
            <CheckCircle className="w-12 h-12 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-4 mb-6 border-b border-gray-200">
        <button className="px-4 py-2 font-semibold text-green-600 border-b-2 border-green-600">
          All Challenges
        </button>
        <button className="px-4 py-2 font-semibold text-gray-600 hover:text-green-600">
          My Challenges ({userChallenges.length})
        </button>
      </div>

      {/* Challenges Grid */}
      {challenges.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-md p-12 text-center">
          <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-800 mb-2">No Active Challenges</h3>
          <p className="text-gray-600">Check back soon for new challenges!</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {challenges.map((challenge) => (
            <ChallengeCard
              key={challenge.id}
              challenge={challenge}
              userChallenge={userChallenges.find(uc => uc.id === challenge.id)}
              onJoin={() => handleJoinChallenge(challenge.id)}
              isJoined={isJoined(challenge.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function ChallengeCard({ challenge, userChallenge, onJoin, isJoined }: any) {
  const daysLeft = Math.ceil(
    (new Date(challenge.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  )

  const progress = userChallenge?.progress || 0
  const progressPercentage = Math.min((progress / challenge.goalAmount) * 100, 100)

  const getGoalTypeLabel = (goalType: string) => {
    switch (goalType) {
      case 'reports_count': return 'Reports'
      case 'collections_count': return 'Collections'
      case 'waste_collected': return 'Waste (kg)'
      default: return 'Goal'
    }
  }

  return (
    <div className={`
      bg-white rounded-2xl shadow-lg p-6 border-l-4 
      ${isJoined ? 'border-green-500' : 'border-gray-300'}
      hover:shadow-xl transition-all duration-300
      ${userChallenge?.completed ? 'bg-gradient-to-br from-green-50 to-white' : ''}
    `}>
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="flex items-center mb-2">
            <h3 className="text-2xl font-bold text-gray-800">{challenge.title}</h3>
            {userChallenge?.completed && (
              <CheckCircle className="w-6 h-6 text-green-500 ml-2" />
            )}
          </div>
          <p className="text-gray-600 text-sm">{challenge.description}</p>
        </div>
        <div className="ml-4">
          <span className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-4 py-2 rounded-full text-sm font-bold shadow-md">
            {challenge.rewardPoints} pts
          </span>
        </div>
      </div>

      {/* Challenge Info */}
      <div className="grid grid-cols-2 gap-4 mb-4 bg-gray-50 p-4 rounded-xl">
        <div className="flex items-center text-gray-700">
          <Target className="w-5 h-5 mr-2 text-blue-500" />
          <div>
            <p className="text-xs text-gray-500">Goal</p>
            <p className="font-semibold">{challenge.goalAmount} {getGoalTypeLabel(challenge.goalType)}</p>
          </div>
        </div>
        <div className="flex items-center text-gray-700">
          <Clock className="w-5 h-5 mr-2 text-orange-500" />
          <div>
            <p className="text-xs text-gray-500">Time Left</p>
            <p className="font-semibold">{daysLeft} days</p>
          </div>
        </div>
      </div>

      {/* Progress Bar (if joined) */}
      {isJoined && !userChallenge?.completed && (
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-600">Progress</span>
            <span className="font-semibold text-green-600">
              {progress} / {challenge.goalAmount}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-green-400 to-green-600 h-3 rounded-full transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      )}

      {/* Completed Badge */}
      {userChallenge?.completed && (
        <div className="bg-green-100 border-2 border-green-500 rounded-xl p-4 mb-4">
          <div className="flex items-center text-green-700">
            <Award className="w-6 h-6 mr-3" />
            <div>
              <p className="font-bold">Challenge Completed! 🎉</p>
              <p className="text-sm">You earned {challenge.rewardPoints} points!</p>
            </div>
          </div>
        </div>
      )}

      {/* Action Button */}
      {!userChallenge?.completed && (
        <Button
          className={`w-full font-semibold transition-all duration-300 ${
            isJoined
              ? 'bg-gray-300 text-gray-600 cursor-default'
              : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white'
          }`}
          onClick={onJoin}
          disabled={isJoined}
        >
          {isJoined ? (
            <>
              <CheckCircle className="w-4 h-4 mr-2" />
              Joined
            </>
          ) : (
            <>
              <Trophy className="w-4 h-4 mr-2" />
              Join Challenge
            </>
          )}
        </Button>
      )}
    </div>
  )
}
