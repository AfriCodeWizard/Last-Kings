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
import { playScanBeep } from "@/lib/sound"

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
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        if (!scannerRef.current) {
          startScanning()
        }
      }, 100)
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
      const config = {
        fps: 10, // Lower FPS for better performance
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          // Use 80% of viewfinder for scanning area
          const minEdgePercentage = 0.8
          const minEdgeSize = Math.min(viewfinderWidth, viewfinderHeight)
          const qrboxSize = Math.floor(minEdgeSize * minEdgePercentage)
          return {
            width: qrboxSize,
            height: qrboxSize
          }
        },
        aspectRatio: 1.0,
        disableFlip: false, // Allow rotation
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
      }

      await html5QrCode.start(
        cameraId,
        config,
        async (decodedText) => {
          // Successfully scanned a barcode
          console.log("Barcode scanned:", decodedText, "Type:", typeof decodedText, "Length:", decodedText?.length)
          if (!decodedText || decodedText.trim().length === 0) {
            console.error("Empty barcode scanned")
            return
          }
          try {
            // Play sound immediately when barcode is successfully scanned
            playScanBeep()
            
            // Stop scanning immediately
            await stopScanning()
            
            // Close scanner immediately after sound
            onClose()
            
            // Process the scan asynchronously (don't wait for it)
            // This allows the scanner to close immediately while processing happens in background
            const trimmedBarcode = decodedText.trim()
            Promise.resolve(onScan(trimmedBarcode)).catch((error) => {
              console.error("Error processing scan:", error)
            })
          } catch (error) {
            console.error("Error in scan handler:", error)
            // Still close the scanner even if there's an error
            await stopScanning()
            onClose()
          }
        },
        () => {
          // Ignore scanning errors (they're frequent during scanning)
          // These are expected while waiting for a barcode
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

