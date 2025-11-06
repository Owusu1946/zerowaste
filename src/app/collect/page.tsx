'use client'
import { useState, useEffect } from 'react'
import { Trash2, MapPin, CheckCircle, Clock, ArrowRight, Camera, Upload, Loader, Calendar, Weight, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'react-hot-toast'
import { getWasteCollectionTasks, updateTaskStatus, saveReward, saveCollectedWaste, getUserByEmail } from '@/utils/db/actions'
import { GoogleGenerativeAI } from "@google/generative-ai"

const extractJsonPayload = (rawText: string) => {
  const withoutFences = rawText
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();

  const jsonStart = withoutFences.indexOf('{');
  const jsonEnd = withoutFences.lastIndexOf('}');

  if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
    throw new Error('No JSON object found in model response');
  }

  const candidate = withoutFences.slice(jsonStart, jsonEnd + 1);
  return JSON.parse(candidate);
};

// Make sure to set your Gemini API key in your environment variables
const geminiApiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY

type CollectionTask = {
  id: number
  location: string
  wasteType: string
  amount: string
  status: 'pending' | 'in_progress' | 'completed' | 'verified'
  date: string
  collectorId: number | null
  imageUrl?: string
  verificationResult?: any
}

const ITEMS_PER_PAGE = 5

export default function CollectPage() {
  const [tasks, setTasks] = useState<CollectionTask[]>([])
  const [loading, setLoading] = useState(true)
  const [hoveredWasteType, setHoveredWasteType] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [user, setUser] = useState<{ id: number; email: string; name: string } | null>(null)

  useEffect(() => {
    const fetchUserAndTasks = async () => {
      setLoading(true)
      try {
        // Fetch user
        const userEmail = localStorage.getItem('userEmail')
        if (userEmail) {
          const fetchedUser = await getUserByEmail(userEmail)
          if (fetchedUser) {
            setUser(fetchedUser)
          } else {
            toast.error('User not found. Please log in again.')
            // Redirect to login page or handle this case appropriately
          }
        } else {
          toast.error('User not logged in. Please log in.')
          // Redirect to login page or handle this case appropriately
        }

        // Fetch tasks
        const fetchedTasks = await getWasteCollectionTasks()
        setTasks(fetchedTasks as CollectionTask[])
      } catch (error) {
        console.error('Error fetching user and tasks:', error)
        toast.error('Failed to load user data and tasks. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    fetchUserAndTasks()
  }, [])

  const [selectedTask, setSelectedTask] = useState<CollectionTask | null>(null)
  const [binImage, setBinImage] = useState<string | null>(null)
  const [collectorGPS, setCollectorGPS] = useState<{ lat: number; lng: number; accuracy: number } | null>(null)
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'requesting' | 'success' | 'denied' | 'unavailable'>('idle')
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'verifying' | 'success' | 'failure'>('idle')
  const [verificationResult, setVerificationResult] = useState<{
    binColorDetected: string;
    binColorMatch: boolean;
    locationContextValid: boolean;
    confidence: number;
    gpsDistance?: number;
    gpsMatch?: boolean;
  } | null>(null)
  const [reward, setReward] = useState<number | null>(null)

  const handleStatusChange = async (taskId: number, newStatus: CollectionTask['status']) => {
    if (!user) {
      toast.error('Please log in to collect waste.')
      return
    }

    try {
      const updatedTask = await updateTaskStatus(taskId, newStatus, user.id)
      if (updatedTask) {
        setTasks(tasks.map(task => 
          task.id === taskId ? { ...task, status: newStatus, collectorId: user.id } : task
        ))
        toast.success('Task status updated successfully')
      } else {
        toast.error('Failed to update task status. Please try again.')
      }
    } catch (error) {
      console.error('Error updating task status:', error)
      toast.error('Failed to update task status. Please try again.')
    }
  }

  const handleBinImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setBinImage(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const captureCollectorGPS = () => {
    console.log('\n📍 ===== CAPTURING COLLECTOR GPS =====');
    
    if (!('geolocation' in navigator)) {
      console.error('❌ Geolocation not supported');
      setGpsStatus('unavailable')
      toast.error('GPS not available on this device');
      return
    }

    setGpsStatus('requesting')
    console.log('🔄 Requesting location...');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy
        }
        setCollectorGPS(coords)
        setGpsStatus('success')
        
        console.log('✅ Collector GPS captured!');
        console.log('📍 Latitude:', coords.lat);
        console.log('📍 Longitude:', coords.lng);
        console.log('🎯 Accuracy:', coords.accuracy, 'meters');
        console.log('==========================================\n');
        
        toast.success(`📍 Location captured! Accuracy: ${Math.round(coords.accuracy)}m`);
      },
      (error) => {
        console.error('❌ GPS error:', error.message);
        setGpsStatus('denied')
        
        if (error.code === error.PERMISSION_DENIED) {
          toast.error('📍 Location permission denied. Please enable location.');
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          toast.error('📍 Location unavailable. Please try again.');
        } else if (error.code === error.TIMEOUT) {
          toast.error('📍 Location request timed out.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    )
  }

  // Calculate distance between two GPS coordinates (Haversine formula)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }

  const readFileAsBase64 = (dataUrl: string): string => {
    return dataUrl.split(',')[1]
  }

  const handleVerify = async () => {
    if (!selectedTask || !binImage || !collectorGPS || !user) {
      toast.error('Please upload bin photo and ensure GPS location is captured.')
      return
    }

    // Extract bin color and GPS from reporter's verification result
    let reportedBinColor = 'unknown'
    let reporterGPS = null
    
    try {
      const verificationResult = typeof selectedTask.verificationResult === 'string' 
        ? JSON.parse(selectedTask.verificationResult)
        : selectedTask.verificationResult
      
      reportedBinColor = verificationResult?.binColor || 'unknown'
      reporterGPS = verificationResult?.gpsCoordinates
      
      console.log('\n🔍 ===== VERIFYING COLLECTION =====');
      console.log('📦 Task:', selectedTask.id);
      console.log('🎨 Expected bin color:', reportedBinColor);
      console.log('📍 Reporter GPS:', reporterGPS ? 
        `${reporterGPS.lat.toFixed(6)}, ${reporterGPS.lng.toFixed(6)} (±${Math.round(reporterGPS.accuracy)}m)` : 
        'NOT AVAILABLE');
      console.log('📍 Collector GPS:', collectorGPS.lat.toFixed(6), collectorGPS.lng.toFixed(6), `(±${Math.round(collectorGPS.accuracy)}m)`);
      
    } catch (e) {
      console.error('Failed to parse verification result:', e)
      toast.error('Cannot verify - report data incomplete.')
      return
    }

    if (reportedBinColor === 'unknown' || reportedBinColor === 'none') {
      toast.error('Cannot verify - no bin color recorded in original report.')
      return
    }

    // Calculate GPS distance if reporter GPS is available
    let gpsDistance = null
    let gpsMatch = false
    
    if (reporterGPS) {
      gpsDistance = calculateDistance(
        reporterGPS.lat,
        reporterGPS.lng,
        collectorGPS.lat,
        collectorGPS.lng
      )
      
      const acceptableRadius = 100 // 100 meters tolerance
      gpsMatch = gpsDistance <= acceptableRadius
      
      console.log('📏 GPS Distance:', Math.round(gpsDistance), 'meters');
      console.log('✅ Acceptable radius:', acceptableRadius, 'meters');
      console.log('🎯 GPS Match:', gpsMatch ? 'YES' : 'NO');
      console.log('==========================================\n');
    } else {
      console.warn('⚠️ No reporter GPS available - skipping GPS verification');
    }

    console.log('\n🤖 ===== SENDING TO AI FOR VERIFICATION =====');
    console.log('📤 GPS Context:');
    console.log('   Reporter:', reporterGPS ? `${reporterGPS.lat.toFixed(6)}, ${reporterGPS.lng.toFixed(6)}` : 'N/A');
    console.log('   Collector:', `${collectorGPS.lat.toFixed(6)}, ${collectorGPS.lng.toFixed(6)}`);
    console.log('   Distance:', gpsDistance !== null ? `${Math.round(gpsDistance)}m` : 'N/A');
    console.log('   Status:', gpsMatch ? '✓ PASS (< 100m)' : '✗ FAIL (> 100m)');
    console.log('==========================================\n');

    setVerificationStatus('verifying')
    
    try {
      const genAI = new GoogleGenerativeAI(geminiApiKey!)
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })

      const binBase64 = readFileAsBase64(binImage)

      const imageParts = [
        {
          inlineData: {
            data: binBase64,
            mimeType: 'image/jpeg',
          },
        },
      ]

      const prompt = `You are a waste collection verification expert. Analyze this image:

Expected bin color: ${reportedBinColor}
Waste type: ${selectedTask.wasteType}
Location: ${selectedTask.location}
${reporterGPS ? `Reporter GPS: ${reporterGPS.lat.toFixed(6)}, ${reporterGPS.lng.toFixed(6)} (±${Math.round(reporterGPS.accuracy)}m)` : ''}
${collectorGPS ? `Collector GPS: ${collectorGPS.lat.toFixed(6)}, ${collectorGPS.lng.toFixed(6)} (±${Math.round(collectorGPS.accuracy)}m)` : ''}
${gpsDistance !== null ? `Distance: ${Math.round(gpsDistance)}m apart` : ''}

Verify:
1. Detect the bin color in the image (blue/green/black/grey/yellow/red/brown/white)
2. Does the bin color match the expected color "${reportedBinColor}"?
3. Your confidence level (0-1)

IMPORTANT: The collector has already collected the waste from the bin.
We verify the bin color matches what the reporter photographed.
GPS verification: Collector must be within 100m of reported location (${gpsMatch ? '✓ PASS' : '✗ FAIL'}).

Respond in JSON format:
{
  "binColorDetected": "detected color",
  "binColorMatch": true/false,
  "confidence": number between 0 and 1
}`

      const result = await model.generateContent([prompt, ...imageParts])
      const response = await result.response
      const text = response.text()

      try {
        const parsedResult = extractJsonPayload(text)

        setVerificationResult({
          binColorDetected: String(parsedResult.binColorDetected || 'unknown'),
          binColorMatch: Boolean(parsedResult.binColorMatch),
          locationContextValid: gpsMatch,  // Use GPS match result
          confidence: Number(parsedResult.confidence ?? 0),
          gpsDistance: gpsDistance || 0,
          gpsMatch: gpsMatch
        } as any)
        setVerificationStatus('success')

        if (parsedResult.binColorMatch && gpsMatch && Number(parsedResult.confidence ?? 0) > 0.7) {
          await handleStatusChange(selectedTask.id, 'verified')
          
          // Calculate reward based on amount (1 point per kg)
          const amountMatch = selectedTask.amount.match(/(\d+(\.\d+)?)/)
          const amount = amountMatch ? parseFloat(amountMatch[0]) : 10
          const earnedReward = Math.max(10, Math.floor(amount)) // Minimum 10 points
          
          // Save the reward
          await saveReward(user.id, earnedReward, amount)

          // Save the collected waste
          await saveCollectedWaste(selectedTask.id, user.id, parsedResult)

          setReward(earnedReward)
          toast.success(`✅ Collection verified! You earned ${earnedReward} points!`, {
            duration: 5000,
            position: 'top-center',
          })
        } else {
          const reason = !parsedResult.binColorMatch 
            ? 'Bin color does not match the waste type' 
            : 'Location surroundings could not be verified'
          toast.error(`❌ Verification failed: ${reason}`, {
            duration: 5000,
            position: 'top-center',
          })
        }
      } catch (error) {
        console.error('Failed to parse JSON response:', text, error)
        setVerificationStatus('failure')
        toast.error('Failed to process verification. Please try again.')
      }
    } catch (error) {
      console.error('Error verifying waste:', error)
      setVerificationStatus('failure')
      toast.error('Verification error. Please check your connection and try again.')
    }
  }

  const filteredTasks = tasks.filter(task =>
    task.location.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const pageCount = Math.ceil(filteredTasks.length / ITEMS_PER_PAGE)
  const paginatedTasks = filteredTasks.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl sm:text-3xl font-semibold mb-4 sm:mb-6 text-gray-800">Waste Collection Tasks</h1>
      
      <div className="mb-4 flex items-center gap-2">
        <Input
          type="text"
          placeholder="Search by area..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 text-sm sm:text-base"
        />
        <Button variant="outline" size="icon" className="shrink-0">
          <Search className="h-4 w-4" />
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader className="animate-spin h-8 w-8 text-gray-500" />
        </div>
      ) : (
        <>
          <div className="space-y-3 sm:space-y-4">
            {paginatedTasks.map(task => (
              <div key={task.id} className="bg-white p-3 sm:p-4 rounded-lg shadow-sm border border-gray-200">
                <div className="flex justify-between items-start sm:items-center mb-2 gap-2">
                  <h2 className="text-base sm:text-lg font-medium text-gray-800 flex items-center min-w-0 flex-1">
                    <MapPin className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2 text-gray-500 shrink-0" />
                    <span className="truncate">{task.location}</span>
                  </h2>
                  <StatusBadge status={task.status} />
                </div>
                <div className="grid grid-cols-2 gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-600 mb-3">
                  {task.verificationResult?.visualDescription && (
                    <div className="flex items-center">
                      <MapPin className="w-4 h-4 mr-2 text-blue-500" />
                      <span className="text-blue-600 font-medium">Visual clues available</span>
                    </div>
                  )}
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-2 text-gray-500" />
                    {task.date}
                  </div>
                </div>
                <div className="flex justify-end">
                  {task.status === 'pending' && (
                    <Button onClick={() => handleStatusChange(task.id, 'in_progress')} variant="outline" size="sm" className="text-xs sm:text-sm">
                      Start Collection
                    </Button>
                  )}
                  {task.status === 'in_progress' && task.collectorId === user?.id && (
                    <Button onClick={() => setSelectedTask(task)} variant="outline" size="sm" className="text-xs sm:text-sm">
                      Complete & Verify
                    </Button>
                  )}
                  {task.status === 'in_progress' && task.collectorId !== user?.id && (
                    <span className="text-yellow-600 text-xs sm:text-sm font-medium">In progress by another collector</span>
                  )}
                  {task.status === 'verified' && (
                    <span className="text-green-600 text-xs sm:text-sm font-medium">Reward Earned</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex justify-center items-center gap-2 sm:gap-4">
            <Button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              size="sm"
              className="text-xs sm:text-sm"
            >
              Previous
            </Button>
            <span className="text-xs sm:text-sm self-center">
              Page {currentPage} of {pageCount}
            </span>
            <Button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, pageCount))}
              disabled={currentPage === pageCount}
              size="sm"
              className="text-xs sm:text-sm"
            >
              Next
            </Button>
          </div>
        </>
      )}

      {selectedTask && (() => {
        // Extract bin color from reporter's verification
        console.log('\n🔍 ===== EXTRACTING BIN COLOR FOR COLLECTION =====');
        console.log('📦 Task ID:', selectedTask.id);
        console.log('📍 Location:', selectedTask.location);
        console.log('🗑️ Waste Type:', selectedTask.wasteType);
        console.log('📄 Verification Result (raw):', selectedTask.verificationResult);
        console.log('📄 Type of verification result:', typeof selectedTask.verificationResult);
        
        let reportedBinColor = 'unknown'
        try {
          const verificationResult = typeof selectedTask.verificationResult === 'string' 
            ? JSON.parse(selectedTask.verificationResult)
            : selectedTask.verificationResult
          
          console.log('📄 Parsed verification result:', verificationResult);
          console.log('🎨 Bin color from result:', verificationResult?.binColor);
          
          reportedBinColor = verificationResult?.binColor || 'unknown'
          
          if (reportedBinColor !== 'unknown') {
            console.log(`✅ BIN COLOR FOUND: "${reportedBinColor.toUpperCase()}"`);
          } else {
            console.warn('⚠️ NO BIN COLOR FOUND in verification result!');
            console.warn('Full verification result object:', verificationResult);
          }
        } catch (e) {
          console.error('❌ Failed to parse verification result:', e);
          console.error('Raw data:', selectedTask.verificationResult);
        }
        console.log('==========================================\n');

        return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-4 sm:p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg sm:text-xl font-semibold mb-2">Verify Collection</h3>
            <p className="text-sm text-gray-600 mb-1">📍 {selectedTask.location}</p>
            <p className="text-sm text-gray-600 mb-4">🗑️ {selectedTask.wasteType} • {selectedTask.amount}</p>
            
            {/* Expected Bin Color Info */}
            {reportedBinColor !== 'unknown' && reportedBinColor !== 'none' ? (
              <div className="mb-4 p-3 bg-blue-50 border-l-4 border-blue-500 rounded">
                <p className="text-sm font-medium text-blue-900">
                  Expected bin color: <span className="px-2 py-0.5 bg-blue-100 rounded font-bold">{reportedBinColor.toUpperCase()}</span>
                </p>
                <p className="text-xs text-blue-700 mt-1">📸 Detected from reporter's photo</p>
              </div>
            ) : (
              <div className="mb-4 p-3 bg-yellow-50 border-l-4 border-yellow-500 rounded">
                <p className="text-sm font-medium text-yellow-900">
                  ⚠️ No bin color recorded in original report
                </p>
                <p className="text-xs text-yellow-700 mt-1">Verification may not be possible</p>
              </div>
            )}

            {/* Reported GPS Location Info */}
            {(() => {
              try {
                const verificationResult = typeof selectedTask.verificationResult === 'string' 
                  ? JSON.parse(selectedTask.verificationResult)
                  : selectedTask.verificationResult
                const reporterGPS = verificationResult?.gpsCoordinates
                
                return reporterGPS ? (
                  <div className="mb-4 p-3 bg-green-50 border-l-4 border-green-500 rounded">
                    <p className="text-sm font-medium text-green-900">
                      📍 Reported GPS Location
                    </p>
                    <p className="text-xs text-green-700 mt-1">
                      Coordinates: {reporterGPS.lat.toFixed(6)}, {reporterGPS.lng.toFixed(6)}
                    </p>
                    <p className="text-xs text-green-600">
                      Accuracy: ±{Math.round(reporterGPS.accuracy)}m
                    </p>
                    <p className="text-xs text-blue-600 mt-1 italic">
                      💡 You must be within 100m of this location to verify
                    </p>
                  </div>
                ) : (
                  <div className="mb-4 p-3 bg-yellow-50 border-l-4 border-yellow-500 rounded">
                    <p className="text-sm font-medium text-yellow-900">
                      ⚠️ No GPS location in report
                    </p>
                    <p className="text-xs text-yellow-700 mt-1">GPS verification will be skipped</p>
                  </div>
                )
              } catch (e) {
                return null
              }
            })()}

            {/* Instructions */}
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
              <h4 className="font-semibold text-green-800 mb-2 text-sm flex items-center gap-2">
                <Camera className="h-4 w-4" />
                Verification Requirements
              </h4>
              <ol className="space-y-1 text-xs text-green-700 list-decimal list-inside">
                <li><strong>Photo:</strong> Clear photo of the waste bin showing its color</li>
                <li><strong>GPS:</strong> Your location will be automatically verified (within 100m of report)</li>
              </ol>
              <p className="text-xs text-green-600 mt-2 italic">
                ℹ️ You've already collected the waste - we only verify bin color and GPS location!
              </p>
            </div>

            {/* Bin Image Upload */}
            <div className="mb-4">
              <label htmlFor="bin-image" className="block text-sm font-semibold text-gray-700 mb-2">
                1️⃣ Bin Photo (showing color)
              </label>
              <div className="mt-1 flex justify-center px-4 pt-4 pb-4 border-2 border-dashed rounded-md border-blue-300 bg-blue-50">
                <div className="space-y-1 text-center">
                  <Upload className="mx-auto h-10 w-10 text-blue-500" />
                  <div className="text-sm text-gray-600">
                    <label
                      htmlFor="bin-image"
                      className="relative cursor-pointer rounded-md font-medium text-blue-600 hover:text-blue-500"
                    >
                      <span>Upload bin photo</span>
                      <input id="bin-image" type="file" className="sr-only" onChange={handleBinImageUpload} accept="image/*" />
                    </label>
                  </div>
                  <p className="text-xs text-gray-500">JPG, PNG up to 10MB</p>
                </div>
              </div>
              {binImage && (
                <div className="mt-2">
                  <img src={binImage} alt="Bin" className="rounded-md w-full border-2 border-blue-300" />
                  <p className="text-xs text-green-600 mt-1">✓ Bin photo uploaded</p>
                </div>
              )}
            </div>

            {/* GPS Location Status */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                2️⃣ GPS Location Verification
              </label>
              <div className="p-4 border-2 rounded-md border-green-300 bg-green-50">
                {gpsStatus === 'idle' && (
                  <div className="text-center">
                    <MapPin className="mx-auto h-10 w-10 text-green-500 mb-2" />
                    <Button 
                      onClick={captureCollectorGPS}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      📍 Capture My Location
                    </Button>
                    <p className="text-xs text-gray-600 mt-2">Click to verify you're at the collection site</p>
                  </div>
                )}
                
                {gpsStatus === 'requesting' && (
                  <div className="text-center">
                    <Loader className="mx-auto h-10 w-10 text-green-500 animate-spin mb-2" />
                    <p className="text-sm text-green-700">Capturing GPS location...</p>
                    <p className="text-xs text-gray-600 mt-1">Please allow location access</p>
                  </div>
                )}
                
                {gpsStatus === 'success' && collectorGPS && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-center gap-2 text-green-700">
                      <CheckCircle className="h-6 w-6" />
                      <p className="font-semibold">✅ GPS Location Captured</p>
                    </div>
                    <div className="text-xs text-green-600 space-y-1 bg-white p-2 rounded">
                      <p>📍 Coordinates: {collectorGPS.lat.toFixed(6)}, {collectorGPS.lng.toFixed(6)}</p>
                      <p>🎯 Accuracy: ±{Math.round(collectorGPS.accuracy)} meters</p>
                    </div>
                  </div>
                )}
                
                {gpsStatus === 'denied' && (
                  <div className="text-center">
                    <p className="text-red-600 text-sm mb-2">❌ Location access denied</p>
                    <Button 
                      onClick={captureCollectorGPS}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Try Again
                    </Button>
                    <p className="text-xs text-gray-600 mt-2">Please enable location in your browser settings</p>
                  </div>
                )}
                
                {gpsStatus === 'unavailable' && (
                  <div className="text-center">
                    <p className="text-red-600 text-sm">❌ GPS not available on this device</p>
                  </div>
                )}
              </div>
            </div>

            {/* Verify Button */}
            <Button
              onClick={handleVerify}
              className="w-full bg-green-600 hover:bg-green-700"
              disabled={!binImage || !collectorGPS || verificationStatus === 'verifying'}
            >
              {verificationStatus === 'verifying' ? (
                <>
                  <Loader className="animate-spin -ml-1 mr-3 h-5 w-5" />
                  Verifying with AI...
                </>
              ) : !binImage ? 'Upload Bin Photo First' :
                 !collectorGPS ? 'Capture GPS Location First' :
                 'Verify Collection'}
            </Button>
            {/* Verification Results */}
            {verificationStatus === 'success' && verificationResult && (
              <div className={`mt-4 p-4 border rounded-md ${(verificationResult.binColorMatch && verificationResult.locationContextValid) ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <h4 className={`font-semibold mb-3 flex items-center gap-2 ${(verificationResult.binColorMatch && verificationResult.locationContextValid) ? 'text-green-800' : 'text-red-800'}`}>
                  {(verificationResult.binColorMatch && verificationResult.locationContextValid) ? '✅ Verification Passed!' : '❌ Verification Failed'}
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <span className="text-lg">{verificationResult.binColorMatch ? '✅' : '❌'}</span>
                    <div>
                      <p className={`font-medium ${verificationResult.binColorMatch ? 'text-green-700' : 'text-red-700'}`}>
                        Bin Color: {verificationResult.binColorDetected}
                      </p>
                      <p className="text-xs text-gray-600">
                        {verificationResult.binColorMatch ? 'Matches expected color' : 'Does not match expected color'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-2">
                    <span className="text-lg">{verificationResult.locationContextValid ? '✅' : '❌'}</span>
                    <div>
                      <p className={`font-medium ${verificationResult.locationContextValid ? 'text-green-700' : 'text-red-700'}`}>
                        GPS Location
                      </p>
                      <p className="text-xs text-gray-600">
                        {verificationResult.locationContextValid ? 
                          `Within ${Math.round(verificationResult.gpsDistance || 0)}m of reported location (✓ < 100m)` : 
                          `Too far from reported location (${Math.round(verificationResult.gpsDistance || 0)}m > 100m)`}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-300">
                    <p className="text-xs text-gray-600">
                      AI Confidence: <span className="font-bold">{(verificationResult.confidence * 100).toFixed(0)}%</span>
                    </p>
                  </div>
                </div>
              </div>
            )}
            {verificationStatus === 'failure' && (
              <p className="mt-2 text-red-600 text-center text-sm">Verification failed. Please try again.</p>
            )}
            <Button onClick={() => {
              setSelectedTask(null)
              setBinImage(null)
              setCollectorGPS(null)
              setGpsStatus('idle')
              setVerificationStatus('idle')
              setVerificationResult(null)
              setReward(null)
            }} variant="outline" className="w-full mt-2">
              Close
            </Button>
          </div>
        </div>
        )
      })()}

      {/* Add a conditional render to show user info or login prompt */}
      {/* {user ? (
        <p className="text-sm text-gray-600 mb-4">Logged in as: {user.name}</p>
      ) : (
        <p className="text-sm text-red-600 mb-4">Please log in to collect waste and earn rewards.</p>
      )} */}
    </div>
  )
}

function StatusBadge({ status }: { status: CollectionTask['status'] }) {
  const statusConfig = {
    pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
    in_progress: { color: 'bg-blue-100 text-blue-800', icon: Trash2 },
    completed: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
    verified: { color: 'bg-purple-100 text-purple-800', icon: CheckCircle },
  }

  const { color, icon: Icon } = statusConfig[status]

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${color} flex items-center`}>
      <Icon className="mr-1 h-3 w-3" />
      {status.replace('_', ' ')}
    </span>
  )
}