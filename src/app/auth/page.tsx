'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Mail, User, Lock, Leaf, CheckCircle, TrendingUp, Award, Users, ArrowRight, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createUser } from '@/utils/db/actions'
import { toast } from 'react-hot-toast'

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState({ email: '', name: '' })
  const router = useRouter()

  // Redirect if already logged in
  useEffect(() => {
    const userEmail = localStorage.getItem('userEmail')
    if (userEmail) {
      router.push('/')
    }
  }, [router])

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Reset errors
    setErrors({ email: '', name: '' })

    // Validation
    let hasError = false
    const newErrors = { email: '', name: '' }

    if (!email.trim()) {
      newErrors.email = 'Email is required'
      hasError = true
    } else if (!validateEmail(email)) {
      newErrors.email = 'Please enter a valid email'
      hasError = true
    }

    if (!isLogin && !name.trim()) {
      newErrors.name = 'Name is required'
      hasError = true
    }

    if (hasError) {
      setErrors(newErrors)
      return
    }

    setIsLoading(true)
    try {
      const userName = isLogin ? 'User' : name

      await createUser(email, userName)

      localStorage.setItem('userEmail', email)
      localStorage.setItem('userName', userName)

      toast.success(isLogin ? 'Welcome back! 🎉' : 'Account created successfully! 🚀')
      
      // Redirect to home
      router.push('/')
    } catch (error) {
      console.error('Auth error:', error)
      toast.error('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const toggleMode = () => {
    setIsLogin(!isLogin)
    setErrors({ email: '', name: '' })
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-green-500 via-green-600 to-emerald-700 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl"></div>
        </div>

        <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">
          {/* Logo & Title */}
          <div>
            <div className="flex items-center mb-8">
              <div className="bg-white/20 backdrop-blur-md p-3 rounded-2xl mr-3">
                <Leaf className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Zero2Hero</h1>
                <p className="text-green-100 text-sm">Waste Management Revolution</p>
              </div>
            </div>

            <div className="space-y-6 mb-12">
              <h2 className="text-4xl font-bold leading-tight">
                Transform Waste into
                <br />
                <span className="text-green-200">Impact & Rewards</span>
              </h2>
              <p className="text-green-100 text-lg max-w-md">
                Join thousands of eco-warriors making a difference. Report waste, collect rewards, and help build a cleaner planet.
              </p>
            </div>

            {/* Features */}
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="bg-white/20 backdrop-blur-md p-2 rounded-lg">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold">Earn Real Rewards</h3>
                  <p className="text-green-100 text-sm">Get blockchain tokens for every action</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="bg-white/20 backdrop-blur-md p-2 rounded-lg">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold">Track Your Impact</h3>
                  <p className="text-green-100 text-sm">See your environmental contribution grow</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="bg-white/20 backdrop-blur-md p-2 rounded-lg">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold">Join Challenges</h3>
                  <p className="text-green-100 text-sm">Compete and earn bonus rewards</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="bg-white/20 backdrop-blur-md p-2 rounded-lg">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold">Collect NFT Badges</h3>
                  <p className="text-green-100 text-sm">Unlock achievements and rare NFTs</p>
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-6 bg-white/10 backdrop-blur-md rounded-2xl p-6">
            <div>
              <p className="text-3xl font-bold">10K+</p>
              <p className="text-green-100 text-sm">Active Users</p>
            </div>
            <div>
              <p className="text-3xl font-bold">50K+</p>
              <p className="text-green-100 text-sm">Waste Collected</p>
            </div>
            <div>
              <p className="text-3xl font-bold">$25K+</p>
              <p className="text-green-100 text-sm">Rewards Earned</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center mb-8">
            <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-3 rounded-2xl mr-3">
              <Leaf className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Zero2Hero</h1>
              <p className="text-gray-600 text-sm">ETHOnline24</p>
            </div>
          </div>

          {/* Welcome Text */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-800 mb-2">
              {isLogin ? 'Welcome Back!' : 'Create Account'}
            </h2>
            <p className="text-gray-600">
              {isLogin 
                ? 'Sign in to continue your eco journey'
                : 'Join the waste management revolution'
              }
            </p>
          </div>

          {/* Tab Toggle */}
          <div className="flex bg-gray-200 rounded-xl p-1 mb-8">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2.5 rounded-lg font-semibold transition-all ${
                isLogin
                  ? 'bg-white text-green-600 shadow-md'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Login
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2.5 rounded-lg font-semibold transition-all ${
                !isLogin
                  ? 'bg-white text-green-600 shadow-md'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name Field (Sign Up Only) */}
            {!isLogin && (
              <div className="space-y-2">
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={`w-full pl-12 pr-4 py-3 border ${
                      errors.name ? 'border-red-500' : 'border-gray-300'
                    } rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all`}
                    placeholder="John Doe"
                  />
                </div>
                {errors.name && (
                  <p className="text-red-500 text-sm">{errors.name}</p>
                )}
              </div>
            )}

            {/* Email Field */}
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full pl-12 pr-4 py-3 border ${
                    errors.email ? 'border-red-500' : 'border-gray-300'
                  } rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all`}
                  placeholder="you@example.com"
                />
              </div>
              {errors.email && (
                <p className="text-red-500 text-sm">{errors.email}</p>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  {isLogin ? 'Signing in...' : 'Creating account...'}
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  {isLogin ? 'Sign In' : 'Create Account'}
                  <ArrowRight className="w-5 h-5 ml-2" />
                </div>
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-gray-50 text-gray-500">
                {isLogin ? 'New to Zero2Hero?' : 'Already have an account?'}
              </span>
            </div>
          </div>

          {/* Toggle Link */}
          <div className="text-center">
            <button
              onClick={toggleMode}
              className="text-green-600 hover:text-green-700 font-semibold"
            >
              {isLogin ? 'Create an account' : 'Sign in instead'}
            </button>
          </div>

          {/* Info Banner */}
          <div className="mt-8 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100">
            <div className="flex items-start">
              <Sparkles className="w-5 h-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-green-800">
                <strong>No password needed!</strong> We use simple email-based authentication for a seamless experience.
              </p>
            </div>
          </div>

          {/* Terms */}
          <p className="text-xs text-gray-500 text-center mt-8">
            By continuing, you agree to our{' '}
            <a href="#" className="text-green-600 hover:underline">Terms of Service</a>
            {' '}and{' '}
            <a href="#" className="text-green-600 hover:underline">Privacy Policy</a>
          </p>
        </div>
      </div>
    </div>
  )
}
