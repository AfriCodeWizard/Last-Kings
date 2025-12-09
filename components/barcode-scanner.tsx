"use client"

import { useEffect, useRef, useState } from "react"
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode"
import { Button } from "@/components/ui/button"
import { X, ScanLine, CameraOff } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface BarcodeScannerProps {
  isOpen: boolean
  onClose: () => void
  onScan: (barcode: string) => void | Promise<void>
  title?: string
  description?: string
}

export function BarcodeScanner({
  isOpen,
  onClose,
  onScan,
  title = "Scan Barcode",
  description = "Position the barcode within the frame",
}: BarcodeScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scannerId = "barcode-scanner-viewfinder"

  useEffect(() => {
    if (isOpen) {
      // Reduced delay for faster startup
      const timer = setTimeout(() => {
        if (!scannerRef.current) {
          startScanning()
        }
      }, 50) // Reduced from 100ms to 50ms for faster startup
      return () => {
        clearTimeout(timer)
        if (scannerRef.current) {
          stopScanning()
        }
      }
    } else {
      stopScanning()
      return undefined
    }
  }, [isOpen])

  const startScanning = async () => {
    try {
      setError(null)
      const html5QrCode = new Html5Qrcode(scannerId)
      scannerRef.current = html5QrCode

      // Get available cameras
      const devices = await Html5Qrcode.getCameras()
      
      if (devices.length === 0) {
        setError("No camera found. Please ensure camera permissions are granted.")
        return
      }

      // Prefer back camera on mobile, fallback to first available
      let cameraId = devices[0].id
      const backCamera = devices.find(
        (device) =>
          device.label.toLowerCase().includes("back") ||
          device.label.toLowerCase().includes("rear") ||
          device.label.toLowerCase().includes("environment")
      )
      
      if (backCamera) {
        cameraId = backCamera.id
      }

      // Start scanning with optimized settings for BARCODES ONLY (not QR codes)
      // Optimized for speed and sensitivity
      const config = {
        fps: 30, // Higher FPS for faster, more responsive scanning
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          // Use 90% of viewfinder for larger scanning area (better sensitivity)
          const minEdgePercentage = 0.9
          const minEdgeSize = Math.min(viewfinderWidth, viewfinderHeight)
          const qrboxSize = Math.floor(minEdgeSize * minEdgePercentage)
          return {
            width: qrboxSize,
            height: qrboxSize
          }
        },
        aspectRatio: 1.0,
        disableFlip: false, // Allow rotation for better angle detection
        // Configure for barcode scanning only - exclude QR codes
        formatsToSupport: [
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.CODE_93,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.UPC_EAN_EXTENSION,
        ] as any,
        // Verbose mode disabled for better performance
        verbose: false,
      }

      // Track last scanned barcode to prevent duplicate scans
      let lastScannedBarcode = ""
      let lastScanTime = 0
      const SCAN_DEBOUNCE_MS = 500 // Prevent duplicate scans within 500ms

      await html5QrCode.start(
        cameraId,
        config,
        async (decodedText) => {
          // Successfully scanned a barcode
          const now = Date.now()
          const trimmedBarcode = decodedText?.trim() || ""
          
          // Validate barcode
          if (!trimmedBarcode || trimmedBarcode.length === 0) {
            return // Ignore empty scans
          }
          
          // Debounce: ignore duplicate scans within debounce period
          if (trimmedBarcode === lastScannedBarcode && (now - lastScanTime) < SCAN_DEBOUNCE_MS) {
            return
          }
          
          // Update last scan info
          lastScannedBarcode = trimmedBarcode
          lastScanTime = now
          
          console.log("Barcode scanned:", trimmedBarcode)
          
          try {
            // Play sound and vibration immediately when barcode is successfully scanned
            const { playScanBeepWithVibration } = await import('@/lib/sound')
            playScanBeepWithVibration()
            
            // Stop scanning immediately to prevent duplicate scans
            await stopScanning()
            
            // Close scanner immediately after sound
            onClose()
            
            // Process the scan and await it to ensure errors are caught
            try {
              await onScan(trimmedBarcode)
            } catch (error) {
              console.error("Error processing scan:", error)
              // Don't re-throw - let the user retry if needed
            }
          } catch (error) {
            console.error("Error in scan handler:", error)
            // Still close the scanner even if there's an error
            await stopScanning()
            onClose()
          }
        },
        (errorMessage) => {
          // Ignore scanning errors (they're frequent during scanning)
          // These are expected while waiting for a barcode
          // Only log if it's a significant error
          if (errorMessage && !errorMessage.includes("NotFoundException")) {
            // Log non-critical errors for debugging
            console.debug("Scan error (expected):", errorMessage)
          }
        }
      )

      setIsScanning(true)
    } catch (err: any) {
      console.error("Error starting scanner:", err)
      setError(err.message || "Failed to start camera. Please check permissions.")
      setIsScanning(false)
    }
  }

  const stopScanning = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop()
        await scannerRef.current.clear()
      } catch (err) {
        console.error("Error stopping scanner:", err)
      } finally {
        scannerRef.current = null
        setIsScanning(false)
      }
    }
  }

  const handleClose = () => {
    stopScanning()
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="font-sans">{title}</DialogTitle>
          <DialogDescription className="font-sans">{description}</DialogDescription>
        </DialogHeader>
        
        <div className="relative bg-black p-4">
          <div
            id={scannerId}
            className="w-full rounded-lg overflow-hidden"
            style={{ minHeight: "300px" }}
          />
          
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 rounded-lg">
              <div className="text-center p-4">
                <p className="text-red-500 font-sans mb-4">{error}</p>
                <Button onClick={startScanning} variant="outline" className="font-sans">
                  <ScanLine className="mr-2 h-4 w-4" />
                  Try Again
                </Button>
              </div>
            </div>
          )}

          {!isScanning && !error && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 rounded-lg">
              <div className="text-center">
                <CameraOff className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground font-sans">Starting camera...</p>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 pb-6 pt-4 flex justify-between items-center">
          <Button
            variant="outline"
            onClick={handleClose}
            className="font-sans"
          >
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
          {isScanning && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground font-sans">
              <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
              Scanning...
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

