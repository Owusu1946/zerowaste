// @ts-nocheck
'use client'
import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Menu, Coins, Leaf, Search, Bell, User, ChevronDown, LogIn, LogOut } from "lucide-react"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { useMediaQuery } from "@/hooks/useMediaQuery"
import { createUser, getUnreadNotifications, markNotificationAsRead, getUserByEmail, getUserBalance } from "@/utils/db/actions"
import { useRouter } from 'next/navigation'

interface HeaderProps {
  onMenuClick: () => void;
  totalEarnings: number;
}

export default function Header({ onMenuClick, totalEarnings }: HeaderProps) {
  const [loggedIn, setLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfo] = useState<any>(null);
  const pathname = usePathname()
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const isMobile = useMediaQuery("(max-width: 768px)")
  const [balance, setBalance] = useState(0)
  const router = useRouter()

  console.log('[Auth] user info state updated:', userInfo);
  
  useEffect(() => {
    const bootstrapUser = async () => {
      try {
        const email = typeof window !== 'undefined' ? localStorage.getItem('userEmail') : null;
        const name = typeof window !== 'undefined' ? localStorage.getItem('userName') : null;

        if (email) {
          console.log('[Auth] Restoring session for', email);
          setLoggedIn(true);
          setUserInfo({ email, name });
          try {
            await createUser(email, name || 'Anonymous User');
          } catch (error) {
            console.error('[Auth] Error ensuring user exists:', error);
          }
        }
      } finally {
        setLoading(false);
      }
    };

    bootstrapUser();
  }, []);

  useEffect(() => {
    const fetchNotifications = async () => {
      if (userInfo && userInfo.email) {
        const user = await getUserByEmail(userInfo.email);
        if (user) {
          const unreadNotifications = await getUnreadNotifications(user.id);
          setNotifications(unreadNotifications);
        }
      }
    };

    fetchNotifications();

    // Set up periodic checking for new notifications
    const notificationInterval = setInterval(fetchNotifications, 30000); // Check every 30 seconds

    return () => clearInterval(notificationInterval);
  }, [userInfo]);

  useEffect(() => {
    const fetchUserBalance = async () => {
      if (userInfo && userInfo.email) {
        const user = await getUserByEmail(userInfo.email);
        if (user) {
          const userBalance = await getUserBalance(user.id);
          setBalance(userBalance);
        }
      }
    };

    fetchUserBalance();

    // Add an event listener for balance updates
    const handleBalanceUpdate = (event: CustomEvent) => {
      setBalance(event.detail);
    };

    window.addEventListener('balanceUpdated', handleBalanceUpdate as EventListener);

    return () => {
      window.removeEventListener('balanceUpdated', handleBalanceUpdate as EventListener);
    };
  }, [userInfo]);

  const handleLoginClick = () => {
    router.push('/auth');
  };

  const logout = async () => {
    try {
      console.log('[Auth] Logging out');
      setLoggedIn(false);
      setUserInfo(null);
      localStorage.removeItem('userEmail');
      localStorage.removeItem('userName');
      
      // Redirect to auth page
      router.push('/auth');
    } catch (error) {
      console.error('[Auth] Error during logout', error);
    }
  };

  const getUserInfo = async () => {
    if (!userInfo?.email) return;

    try {
      const user = await getUserByEmail(userInfo.email);
      if (user) {
        setUserInfo({ email: user.email, name: user.name });
        localStorage.setItem('userName', user.name || 'Anonymous User');
      }
    } catch (error) {
      console.error('[Auth] Error refreshing user info', error);
    }
  };

  const handleNotificationClick = async (notificationId: number) => {
    await markNotificationAsRead(notificationId);
    setNotifications(prevNotifications => 
      prevNotifications.filter(notification => notification.id !== notificationId)
    );
  };

  if (loading) {
    return <div>Loading Web3Auth...</div>;
  }

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="flex items-center justify-between px-2 sm:px-4 py-2 sm:py-3">
        <div className="flex items-center min-w-0">
          <Button variant="ghost" size="icon" className="mr-1 sm:mr-2 md:mr-4 shrink-0" onClick={onMenuClick}>
            <Menu className="h-5 w-5 sm:h-6 sm:w-6" />
          </Button>
          <Link href="/" className="flex items-center min-w-0">
            <Leaf className="h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8 text-green-500 mr-1 md:mr-2 shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-sm sm:text-base md:text-lg text-gray-800 truncate">Zero2Hero</span>
              <span className="text-[8px] md:text-[10px] text-gray-500 -mt-1 hidden sm:block">ETHOnline24</span>
            </div>
          </Link>
        </div>
        {!isMobile && (
          <div className="flex-1 max-w-xl mx-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search..."
                className="w-full px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            </div>
          </div>
        )}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {isMobile && (
            <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10">
              <Search className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative h-8 w-8 sm:h-10 sm:w-10">
                <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
                {notifications.length > 0 && (
                  <Badge className="absolute -top-1 -right-1 px-1 min-w-[1rem] sm:min-w-[1.2rem] h-4 sm:h-5 text-[10px] sm:text-xs">
                    {notifications.length}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 sm:w-64 mr-2">
              {notifications.length > 0 ? (
                notifications.map((notification) => (
                  <DropdownMenuItem 
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification.id)}
                    className="flex-col items-start"
                  >
                    <span className="font-medium text-sm">{notification.type}</span>
                    <span className="text-xs text-gray-500 line-clamp-2">{notification.message}</span>
                  </DropdownMenuItem>
                ))
              ) : (
                <DropdownMenuItem>No new notifications</DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="flex items-center bg-gray-100 rounded-full px-1.5 sm:px-2 md:px-3 py-1 min-w-0">
            <Coins className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5 mr-0.5 sm:mr-1 text-green-500 shrink-0" />
            <span className="font-semibold text-xs sm:text-sm md:text-base text-gray-800 truncate">
              {balance.toFixed(0)}
            </span>
          </div>
          {!loggedIn ? (
            <Button onClick={handleLoginClick} className="bg-green-600 hover:bg-green-700 text-white text-xs sm:text-sm md:text-base px-2 sm:px-3 md:px-4 h-8 sm:h-9 md:h-10">
              <span className="hidden sm:inline">Login</span>
              <LogIn className="h-4 w-4 sm:h-4 sm:w-4 md:h-5 md:w-5 sm:ml-1 md:ml-2" />
            </Button>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10">
                  <User className="h-4 w-4 sm:h-5 sm:w-5" />
                  <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4 hidden sm:block" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="mr-2">
                <DropdownMenuItem onClick={getUserInfo} className="text-sm">
                  {userInfo ? userInfo.name : "Fetch User Info"}
                </DropdownMenuItem>
                <DropdownMenuItem className="text-sm">
                  <Link href="/settings">Profile</Link>
                </DropdownMenuItem>
                <DropdownMenuItem className="text-sm">Settings</DropdownMenuItem>
                <DropdownMenuItem onClick={logout} className="text-sm">Sign Out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  )
}