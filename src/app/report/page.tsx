'use client'
import { useState, useCallback, useEffect } from 'react'
import {  MapPin, Upload, CheckCircle, Loader } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Autocomplete,  useJsApiLoader } from '@react-google-maps/api'
import { Libraries } from '@react-google-maps/api';
import { createUser, getUserByEmail, createReport, getRecentReports } from '@/utils/db/actions';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast'

const geminiApiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

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

const libraries: Libraries = ['places'];

export default function ReportPage() {
  const [user, setUser] = useState<{ id: number; email: string; name: string } | null>(null);
  const router = useRouter();

  const [reports, setReports] = useState<Array<{
    id: number;
    location: string;
    wasteType: string;
    amount: string;
    createdAt: string;
  }>>([]);

  const [newReport, setNewReport] = useState({
    location: '',
    type: '',
    amount: '',
  })

  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'verifying' | 'success' | 'failure'>('idle')
  const [gpsCoordinates, setGpsCoordinates] = useState<{ lat: number; lng: number; accuracy: number } | null>(null)
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'requesting' | 'success' | 'denied' | 'unavailable'>('idle')
  const [verificationResult, setVerificationResult] = useState<{
    wasteType: string;
    quantity: string;
    confidence: number;
    binColor: string;
    gpsCoordinates?: { lat: number; lng: number; accuracy: number };
    visualDescription: {
      binDetails: string;
      wasteColors: string;
      surroundings: string;
      groundCondition: string;
      environmentalMarkers: string;
      uniqueIdentifiers: string;
    };
  } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: googleMapsApiKey!,
    libraries: libraries
  });

  const onLoad = useCallback((ref: google.maps.places.Autocomplete) => {
    setAutocomplete(ref);
  }, []);

  const onPlaceChanged = () => {
    if (autocomplete) {
      const place = autocomplete.getPlace();
      if (place && place.formatted_address) {
        const address = place.formatted_address;
        setNewReport(prev => ({
          ...prev,
          location: address,
        }));
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setNewReport({ ...newReport, [name]: value })
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      setFile(selectedFile)
      const reader = new FileReader()
      reader.onload = (e) => {
        setPreview(e.target?.result as string)
      }
      reader.readAsDataURL(selectedFile)
      
      // Capture GPS coordinates when image is uploaded
      captureGPSCoordinates()
    }
  }

  const captureGPSCoordinates = () => {
    console.log('\n📍 ===== CAPTURING GPS COORDINATES =====');
    
    if (!('geolocation' in navigator)) {
      console.error('❌ Geolocation not supported by browser');
      setGpsStatus('unavailable')
      toast.error('GPS not available on this device');
      return
    }

    setGpsStatus('requesting')
    console.log('🔄 Requesting location permission...');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy
        }
        setGpsCoordinates(coords)
        setGpsStatus('success')
        
        console.log('✅ GPS coordinates captured!');
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
          toast.error('📍 Location permission denied. Please enable location services.');
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          toast.error('📍 Location unavailable. Please try again.');
        } else if (error.code === error.TIMEOUT) {
          toast.error('📍 Location request timed out. Please try again.');
        }
        console.log('==========================================\n');
      },
      {
        enableHighAccuracy: true,  // Use GPS for best accuracy
        timeout: 10000,            // 10 second timeout
        maximumAge: 0              // Don't use cached position
      }
    )
  }

  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleVerify = async () => {
    if (!file) return

    setVerificationStatus('verifying')
    
    try {
      const genAI = new GoogleGenerativeAI(geminiApiKey!);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      const base64Data = await readFileAsBase64(file);

      const imageParts = [
        {
          inlineData: {
            data: base64Data.split(',')[1],
            mimeType: file.type,
          },
        },
      ];

      const prompt = `You are an expert in waste management and recycling. Analyze this image in EXTREME DETAIL and provide:
        1. The type of waste (e.g., plastic, paper, glass, metal, organic)
        2. An estimate of the quantity or amount (in kg or liters)
        3. Your confidence level in this assessment (as a percentage)
        4. THE BIN COLOR - This is CRITICAL! Identify the dominant color of the waste container/bin visible in the image. Options: "blue", "green", "black", "grey", "yellow", "red", "brown", "white", or "mixed" if multiple bins. If no bin visible, use "none".
        5. DETAILED VISUAL DESCRIPTION for verification purposes:
           - Bin Details: Describe the container/bin material, size, brand markings, damage/wear, any labels or text visible (excluding color as it's a separate field)
           - Waste Colors: Specific colors of the waste items visible (be very specific, e.g., "bright red plastic bottle cap, translucent blue bag")
           - Surroundings: Describe background elements (buildings, walls, vegetation, nearby objects, landmarks, street features)
           - Ground Condition: Describe the surface (concrete, asphalt, grass, dirt, tiles), any markings, stains, or patterns
           - Environmental Markers: Lighting conditions, shadows direction, weather indicators, time of day clues
           - Unique Identifiers: Any distinctive features that make this location/waste unique (graffiti, cracks, specific patterns, signage)
        
        IMPORTANT: The bin color you identify will be used by collectors to verify they're at the correct location!
        Be VERY specific and detailed in your descriptions. These details will be used to verify when someone collects this waste.
        
        Respond in JSON format like this:
        {
          "wasteType": "type of waste",
          "quantity": "estimated quantity with unit",
          "confidence": confidence level as a number between 0 and 1,
          "binColor": "blue/green/black/grey/yellow/red/brown/white/mixed/none",
          "visualDescription": {
            "binDetails": "detailed bin description (material, size, markings - no color)",
            "wasteColors": "specific color details of waste",
            "surroundings": "background and surrounding details",
            "groundCondition": "surface and ground details",
            "environmentalMarkers": "lighting, shadows, weather clues",
            "uniqueIdentifiers": "distinctive features for verification"
          }
        }`;

      const result = await model.generateContent([prompt, ...imageParts]);
      const response = await result.response;
      const text = response.text();

      try {
        const parsedResult = extractJsonPayload(text);
        
        console.log('\n🎯 ===== WASTE VERIFICATION RESULT =====');
        console.log('📦 Waste Type:', parsedResult.wasteType || 'NOT DETECTED');
        console.log('⚖️  Quantity:', parsedResult.quantity || 'NOT DETECTED');
        console.log('🎨 BIN COLOR:', parsedResult.binColor || '❌ NOT DETECTED');
        console.log('📊 Confidence:', parsedResult.confidence ? `${(parsedResult.confidence * 100).toFixed(1)}%` : 'NOT DETECTED');
        console.log('📸 Visual Description:', parsedResult.visualDescription ? '✅ Available' : '❌ Missing');
        console.log('======================================\n');
        
        if (parsedResult.binColor) {
          console.log(`✅ BIN COLOR RECORDED: "${parsedResult.binColor.toUpperCase()}"`);
          console.log('📌 This color will be used by collectors to verify location!');
          console.log('💾 Storing in database for verification...\n');
        } else {
          console.warn('⚠️ WARNING: No bin color detected!');
          console.warn('⚠️ Collectors may not be able to verify this report!\n');
        }
        
        // Add GPS coordinates to result if available
        if (gpsCoordinates) {
          parsedResult.gpsCoordinates = gpsCoordinates;
          console.log('✅ GPS COORDINATES ADDED TO VERIFICATION:');
          console.log('📍 Lat/Lng:', gpsCoordinates.lat, ',', gpsCoordinates.lng);
          console.log('🎯 Accuracy:', gpsCoordinates.accuracy, 'meters\n');
        } else {
          console.warn('⚠️ No GPS coordinates available - location verification may be less accurate\n');
        }
        
        if (parsedResult.wasteType && parsedResult.quantity && parsedResult.confidence && parsedResult.binColor && parsedResult.visualDescription) {
          setVerificationResult(parsedResult);
          setVerificationStatus('success');
          setNewReport((prev) => ({
            ...prev,
            type: parsedResult.wasteType,
            amount: parsedResult.quantity,
          }));
          console.log('✅ Verification successful! All fields detected.');
          toast.success(`✅ Verified! Bin color: ${parsedResult.binColor.toUpperCase()}`);
        } else {
          console.error('❌ Invalid verification result - Missing required fields:');
          if (!parsedResult.wasteType) console.error('  - wasteType is missing');
          if (!parsedResult.quantity) console.error('  - quantity is missing');
          if (!parsedResult.confidence) console.error('  - confidence is missing');
          if (!parsedResult.binColor) console.error('  - binColor is missing');
          if (!parsedResult.visualDescription) console.error('  - visualDescription is missing');
          console.error('Full result:', parsedResult);
          setVerificationStatus('failure');
          toast.error('Verification failed. Please try again.');
        }
      } catch (error) {
        console.error('❌ Failed to parse JSON response:', error);
        console.error('Raw text received:', text);
        setVerificationStatus('failure');
        toast.error('Failed to process verification. Please try again.');
      }
    } catch (error) {
      console.error('Error verifying waste:', error);
      setVerificationStatus('failure');
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (verificationStatus !== 'success' || !user) {
      toast.error('Please verify the waste before submitting or log in.');
      return;
    }
    
    console.log('\n💾 ===== SUBMITTING REPORT TO DATABASE =====');
    console.log('📍 Location:', newReport.location);
    console.log('📦 Waste Type:', newReport.type);
    console.log('⚖️  Amount:', newReport.amount);
    console.log('🎨 BIN COLOR:', verificationResult?.binColor || '⚠️ MISSING');
    console.log('📍 GPS Coordinates:', verificationResult?.gpsCoordinates ? 
      `${verificationResult.gpsCoordinates.lat}, ${verificationResult.gpsCoordinates.lng} (±${Math.round(verificationResult.gpsCoordinates.accuracy)}m)` : 
      '⚠️ NOT CAPTURED');
    console.log('📸 Image URL:', preview ? 'Available' : 'None');
    console.log('📄 Full Verification Result:', verificationResult);
    console.log('==========================================\n');
    
    setIsSubmitting(true);
    try {
      const report = await createReport(
        user.id,
        newReport.location,
        newReport.type,
        newReport.amount,
        preview || undefined,
        undefined,  // type parameter (unused)
        verificationResult ? JSON.stringify(verificationResult) : undefined  // verificationResult (7th param)
      ) as any;
      
      console.log('✅ Report created successfully!');
      console.log('📝 Report ID:', report.id);
      console.log('🎨 Bin color stored:', verificationResult?.binColor);
      console.log('📌 Collectors can now verify using this bin color!\n');
      
      const formattedReport = {
        id: report.id,
        location: report.location,
        wasteType: report.wasteType,
        amount: report.amount,
        createdAt: report.createdAt.toISOString().split('T')[0]
      };
      
      setReports([formattedReport, ...reports]);
      setNewReport({ location: '', type: '', amount: '' });
      setFile(null);
      setPreview(null);
      setVerificationStatus('idle');
      setVerificationResult(null);
      
      // Clear the location input field
      const input = document.getElementById('location') as HTMLInputElement;
      if (input) {
        input.value = '';
      }

      toast.success(`Report submitted successfully! You've earned points for reporting waste.`);
    } catch (error) {
      console.error('Error submitting report:', error);
      toast.error('Failed to submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const checkUser = async () => {
      const email = localStorage.getItem('userEmail');
      if (email) {
        let user = await getUserByEmail(email);
        if (!user) {
          user = await createUser(email, 'Anonymous User');
        }
        setUser(user);
        
        const recentReports = await getRecentReports();
        const formattedReports = recentReports.map(report => ({
          ...report,
          createdAt: report.createdAt.toISOString().split('T')[0]
        }));
        setReports(formattedReports);
      } else {
        router.push('/login'); 
      }
    };
    checkUser();
  }, [router]);

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl sm:text-3xl font-semibold mb-4 sm:mb-6 text-gray-800">Report waste</h1>
      
      <form onSubmit={handleSubmit} className="bg-white p-4 sm:p-6 md:p-8 rounded-2xl shadow-lg mb-8 sm:mb-12">
        <div className="mb-6 sm:mb-8">
          <label htmlFor="waste-image" className="block text-base sm:text-lg font-medium text-gray-700 mb-2">
            Upload Waste Image
          </label>
          <div className="mt-1 flex justify-center px-4 sm:px-6 pt-4 sm:pt-5 pb-4 sm:pb-6 border-2 border-gray-300 border-dashed rounded-xl hover:border-green-500 transition-colors duration-300">
            <div className="space-y-1 text-center">
              <Upload className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-400" />
              <div className="flex text-xs sm:text-sm text-gray-600 flex-col sm:flex-row items-center">
                <label
                  htmlFor="waste-image"
                  className="relative cursor-pointer bg-white rounded-md font-medium text-green-600 hover:text-green-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-green-500"
                >
                  <span>Upload a file</span>
                  <input id="waste-image" name="waste-image" type="file" className="sr-only" onChange={handleFileChange} accept="image/*" />
                </label>
                <p className="sm:pl-1">or drag and drop</p>
              </div>
              <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
            </div>
          </div>
        </div>
        
        {preview && (
          <div className="mt-4 mb-6 sm:mb-8">
            <img src={preview} alt="Waste preview" className="max-w-full h-auto rounded-xl shadow-md" />
          </div>
        )}
        
        <Button 
          type="button" 
          onClick={handleVerify} 
          className="w-full mb-6 sm:mb-8 bg-blue-600 hover:bg-blue-700 text-white py-2.5 sm:py-3 text-base sm:text-lg rounded-xl transition-colors duration-300" 
          disabled={!file || verificationStatus === 'verifying'}
        >
          {verificationStatus === 'verifying' ? (
            <>
              <Loader className="animate-spin -ml-1 mr-2 sm:mr-3 h-4 w-4 sm:h-5 sm:w-5 text-white" />
              <span className="text-sm sm:text-base">Verifying...</span>
            </>
          ) : <span className="text-sm sm:text-base">Verify Waste</span>}
        </Button>

        {verificationStatus === 'success' && verificationResult && (
          <div className="space-y-4 mb-6 sm:mb-8">
            {/* Success Message */}
            <div className="bg-green-50 border-l-4 border-green-400 p-3 sm:p-4 rounded-r-xl">
              <div className="flex items-center">
                <CheckCircle className="h-6 w-6 text-green-400 mr-3" />
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-green-800">✅ Verification Successful</h3>
                  <div className="mt-2 text-sm text-green-700 space-y-1">
                    <p><strong>Waste Type:</strong> {verificationResult.wasteType}</p>
                    <p><strong>Quantity:</strong> {verificationResult.quantity}</p>
                    <p><strong>Confidence:</strong> {(verificationResult.confidence * 100).toFixed(1)}%</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bin Color Display - Prominent */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 p-4 sm:p-6 rounded-xl shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-blue-900 mb-1 uppercase tracking-wide">
                    🎨 Bin Color Detected
                  </h4>
                  <p className="text-3xl sm:text-4xl font-bold text-blue-800 uppercase tracking-wider">
                    {verificationResult.binColor}
                  </p>
                  <p className="text-xs sm:text-sm text-blue-600 mt-2">
                    📌 Collectors will verify this color at pickup location
                  </p>
                </div>
                
                {/* Visual Color Indicator */}
                <div className="ml-4">
                  <div 
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl shadow-lg border-4 border-white"
                    style={{
                      backgroundColor: 
                        verificationResult.binColor === 'blue' ? '#3B82F6' :
                        verificationResult.binColor === 'green' ? '#22C55E' :
                        verificationResult.binColor === 'black' ? '#1F2937' :
                        verificationResult.binColor === 'grey' || verificationResult.binColor === 'gray' ? '#6B7280' :
                        verificationResult.binColor === 'yellow' ? '#EAB308' :
                        verificationResult.binColor === 'red' ? '#EF4444' :
                        verificationResult.binColor === 'brown' ? '#92400E' :
                        verificationResult.binColor === 'white' ? '#F3F4F6' :
                        '#9333EA'
                    }}
                  >
                    <div className="w-full h-full flex items-center justify-center text-white font-bold text-xs">
                      {verificationResult.binColor === 'white' ? '⚪' : ''}
                    </div>
                  </div>
                  <p className="text-xs text-center mt-1 text-gray-600 font-medium">
                    {verificationResult.binColor.toUpperCase()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            {isLoaded ? (
              <Autocomplete
                onLoad={onLoad}
                onPlaceChanged={onPlaceChanged}
                options={{
                  types: ['geocode', 'establishment'],
                  fields: ['formatted_address', 'geometry', 'name']
                }}
              >
                <input
                  type="text"
                  id="location"
                  name="location"
                  value={newReport.location}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 transition-all duration-300"
                  placeholder="Search for a location..."
                />
              </Autocomplete>
            ) : (
              <input
                type="text"
                id="location"
                name="location"
                value={newReport.location}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 transition-all duration-300"
                placeholder="Enter waste location"
              />
            )}
            {gpsCoordinates && (
              <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-xs text-green-700 font-medium">
                  ✅ GPS Location Captured
                </p>
                <p className="text-xs text-green-600 mt-1">
                  📍 {gpsCoordinates.lat.toFixed(6)}, {gpsCoordinates.lng.toFixed(6)}
                </p>
                <p className="text-xs text-gray-600">
                  🎯 Accuracy: ±{Math.round(gpsCoordinates.accuracy)}m
                </p>
                <p className="text-xs text-blue-600 mt-1 italic">
                  💡 Collectors will verify within 100m of this location
                </p>
              </div>
            )}
          </div>
          <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">Waste Type</label>
            <input
              type="text"
              id="type"
              name="type"
              value={newReport.type}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 transition-all duration-300 bg-gray-100"
              placeholder="Verified waste type"
              readOnly
            />
          </div>
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">Estimated Amount</label>
            <input
              type="text"
              id="amount"
              name="amount"
              value={newReport.amount}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 transition-all duration-300 bg-gray-100"
              placeholder="Verified amount"
              readOnly
            />
          </div>
        </div>
        <Button 
          type="submit" 
          className="w-full bg-green-600 hover:bg-green-700 text-white py-3 text-lg rounded-xl transition-colors duration-300 flex items-center justify-center"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
              Submitting...
            </>
          ) : 'Submit Report'}
        </Button>
      </form>

      <h2 className="text-3xl font-semibold mb-6 text-gray-800">Recent Reports</h2>
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="max-h-96 overflow-y-auto">
          <table className="w-full">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {reports.map((report) => (
                <tr key={report.id} className="hover:bg-gray-50 transition-colors duration-200">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <MapPin className="inline-block w-4 h-4 mr-2 text-green-500" />
                    {report.location}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{report.wasteType}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{report.amount}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{report.createdAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}