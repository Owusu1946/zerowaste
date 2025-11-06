"use client"

import { useState, useEffect } from "react"
import { Inter } from 'next/font/google'
import "./globals.css"
import Header from "@/components/Header"
import Sidebar from "@/components/Sidebar"
import 'leaflet/dist/leaflet.css'
import { Toaster } from 'react-hot-toast'
import { getAvailableRewards, getUserByEmail } from '@/utils/db/actions'
import { usePathname } from 'next/navigation'

const inter = Inter({ subsets: ['latin'] })

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [totalEarnings, setTotalEarnings] = useState(0)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const pathname = usePathname()

  useEffect(() => {
    const checkAuthAndFetchData = async () => {
      try {
        const userEmail = localStorage.getItem('userEmail')
        
        if (userEmail) {
          setIsLoggedIn(true)
          const user = await getUserByEmail(userEmail)
          console.log('user from layout', user);
          
          if (user) {
            const availableRewards = await getAvailableRewards(user.id) as any
            console.log('availableRewards from layout', availableRewards);
            setTotalEarnings(availableRewards)
          }
        } else {
          setIsLoggedIn(false)
        }
      } catch (error) {
        console.error('Error fetching user data:', error)
        setIsLoggedIn(false)
      } finally {
        setIsLoading(false)
      }
    }

    checkAuthAndFetchData()
    
    // Listen for storage changes (login/logout from other tabs)
    const handleStorageChange = () => {
      const userEmail = localStorage.getItem('userEmail')
      setIsLoggedIn(!!userEmail)
    }
    
    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [pathname])

  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} totalEarnings={totalEarnings} />
          <div className="flex flex-1">
            {/* Show Sidebar only when logged in */}
            {isLoggedIn && <Sidebar open={sidebarOpen} />}
            
            {/* Adjust main content margin based on login status */}
            <main className={`flex-1 transition-all duration-300 ${
              isLoggedIn 
                ? 'p-4 lg:p-8 ml-0 lg:ml-64' 
                : 'p-0'
            }`}>
              {children}
            </main>
          </div>
        </div>
        <Toaster />
      </body>
    </html>
  )
}
