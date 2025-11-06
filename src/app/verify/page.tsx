'use client'
import { useState } from 'react'
import { Upload, CheckCircle, XCircle, Loader } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function VerifyWastePage() {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'verifying' | 'success' | 'failure'>('idle')
  const [verificationResult, setVerificationResult] = useState<{
    wasteType: string;
    quantity: string;
    confidence: number;
  } | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      setFile(selectedFile)
      const reader = new FileReader()
      reader.onload = (e) => {
        setPreview(e.target?.result as string)
      }
      reader.readAsDataURL(selectedFile)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return

    setVerificationStatus('verifying')
    
    // Simulating AI verification process
    setTimeout(() => {
      // This is where you would integrate with Galadriel or your AI service
      const mockResult = {
        wasteType: 'Plastic',
        quantity: '2.5 kg',
        confidence: 0.92
      }
      setVerificationResult(mockResult)
      setVerificationStatus('success')
    }, 3000)
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8 text-gray-800">Verify Waste Collection</h1>
      
      <form onSubmit={handleSubmit} className="bg-white p-4 sm:p-6 rounded-xl shadow-md mb-6 sm:mb-8">
        <div className="mb-4 sm:mb-6">
          <label htmlFor="waste-image" className="block text-sm font-medium text-gray-700 mb-2">
            Upload Waste Image
          </label>
          <div className="mt-1 flex justify-center px-4 sm:px-6 pt-4 sm:pt-5 pb-4 sm:pb-6 border-2 border-gray-300 border-dashed rounded-md">
            <div className="space-y-1 text-center">
              <Upload className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-400" />
              <div className="flex text-xs sm:text-sm text-gray-600 flex-col sm:flex-row items-center">
                <label
                  htmlFor="waste-image"
                  className="relative cursor-pointer bg-white rounded-md font-medium text-green-600 hover:text-green-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-green-500"
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
          <div className="mt-3 sm:mt-4 mb-4 sm:mb-6">
            <img src={preview} alt="Waste preview" className="max-w-full h-auto rounded-lg" />
          </div>
        )}
        
        <Button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white text-sm sm:text-base py-2.5 sm:py-3" disabled={!file || verificationStatus === 'verifying'}>
          {verificationStatus === 'verifying' ? (
            <>
              <Loader className="animate-spin -ml-1 mr-2 sm:mr-3 h-4 w-4 sm:h-5 sm:w-5 text-white" />
              <span className="text-sm sm:text-base">Verifying...</span>
            </>
          ) : <span className="text-sm sm:text-base">Verify Waste</span>}
        </Button>
      </form>

      {verificationStatus === 'success' && verificationResult && (
        <div className="bg-green-50 border-l-4 border-green-400 p-3 sm:p-4 mb-6 sm:mb-8">
          <div className="flex">
            <div className="flex-shrink-0">
              <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-400" />
            </div>
            <div className="ml-2 sm:ml-3">
              <h3 className="text-sm font-medium text-green-800">Verification Successful</h3>
              <div className="mt-2 text-xs sm:text-sm text-green-700">
                <p>Waste Type: {verificationResult.wasteType}</p>
                <p>Quantity: {verificationResult.quantity}</p>
                <p>Confidence: {(verificationResult.confidence * 100).toFixed(2)}%</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {verificationStatus === 'failure' && (
        <div className="bg-red-50 border-l-4 border-red-400 p-3 sm:p-4 mb-6 sm:mb-8">
          <div className="flex">
            <div className="flex-shrink-0">
              <XCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-400" />
            </div>
            <div className="ml-2 sm:ml-3">
              <h3 className="text-sm font-medium text-red-800">Verification Failed</h3>
              <div className="mt-2 text-xs sm:text-sm text-red-700">
                <p>Unable to verify the waste. Please try again with a clearer image.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}