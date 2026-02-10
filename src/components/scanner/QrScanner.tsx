import { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Camera, X, SwitchCamera } from "lucide-react";

interface QrScannerProps {
  onScan: (result: string) => void;
  onError?: (error: string) => void;
}

export function QrScanner({ onScan, onError }: QrScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scannerIdRef = useRef(`qr-reader-${Date.now()}`);

  const stopScanning = useCallback(async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        if (state === 2) { // SCANNING
          await scannerRef.current.stop();
        }
      } catch (e) {
        console.log("Stop error:", e);
      }
      try {
        scannerRef.current.clear();
      } catch (e) {
        // ignore
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
  }, []);

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        try {
          const state = scannerRef.current.getState();
          if (state === 2) {
            scannerRef.current.stop().catch(console.error);
          }
          scannerRef.current.clear();
        } catch (e) {
          // cleanup
        }
      }
    };
  }, []);

  const startScanning = useCallback(async () => {
    if (!containerRef.current) return;

    setIsScanning(true);

    // Small delay to ensure DOM element exists
    await new Promise((r) => setTimeout(r, 100));

    try {
      const scanner = new Html5Qrcode(scannerIdRef.current);
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          onScan(decodedText);
          stopScanning();
        },
        (errorMessage) => {
          // Suppress continuous "no QR found" messages
          if (errorMessage.includes("No MultiFormat Readers")) return;
          if (errorMessage.includes("NotFoundException")) return;
        }
      );
    } catch (err: any) {
      console.error("Camera start error:", err);
      onError?.(err?.message || "Failed to start camera");
      setIsScanning(false);
    }
  }, [facingMode, onScan, onError, stopScanning]);

  const switchCamera = async () => {
    await stopScanning();
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
    // Will restart with new facing mode
    setTimeout(() => startScanning(), 200);
  };

  if (!isScanning) {
    return (
      <Button
        variant="outline"
        className="w-full h-32 flex-col gap-3 border-dashed"
        onClick={startScanning}
      >
        <Camera className="h-8 w-8 text-primary" />
        <span className="text-sm text-muted-foreground">
          Tap to open camera scanner
        </span>
      </Button>
    );
  }

  return (
    <div className="relative rounded-lg overflow-hidden border border-border">
      <div id={scannerIdRef.current} ref={containerRef} className="w-full" />
      <div className="absolute top-2 right-2 z-10 flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={switchCamera}
        >
          <SwitchCamera className="h-4 w-4" />
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={stopScanning}
        >
          <X className="h-4 w-4 mr-1" />
          Close
        </Button>
      </div>
    </div>
  );
}
