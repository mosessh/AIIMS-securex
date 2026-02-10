import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Check, Download, Printer } from "lucide-react";

interface ViewQrCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  checkpointName: string;
  qrCode: string;
}

export function ViewQrCodeDialog({ 
  open, 
  onOpenChange, 
  checkpointName, 
  qrCode 
}: ViewQrCodeDialogProps) {
  const [copied, setCopied] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const copyQrCode = async () => {
    await navigator.clipboard.writeText(qrCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Generate a simple QR code URL using a public API
  const qrCodeImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCode)}`;

  const downloadQrCode = () => {
    const link = document.createElement("a");
    link.href = qrCodeImageUrl;
    link.download = `checkpoint-${checkpointName.toLowerCase().replace(/\s+/g, "-")}-qr.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const printQrCode = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Code - ${checkpointName}</title>
          <style>
            body {
              font-family: system-ui, -apple-system, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              padding: 20px;
              box-sizing: border-box;
            }
            .container {
              text-align: center;
              border: 2px solid #333;
              padding: 30px;
              border-radius: 12px;
            }
            h1 {
              margin: 0 0 10px 0;
              font-size: 24px;
            }
            .subtitle {
              color: #666;
              margin: 0 0 20px 0;
              font-size: 14px;
            }
            img {
              width: 250px;
              height: 250px;
              margin-bottom: 15px;
            }
            .code {
              font-family: monospace;
              background: #f5f5f5;
              padding: 8px 16px;
              border-radius: 6px;
              font-size: 12px;
              word-break: break-all;
            }
            @media print {
              body { padding: 0; }
              .container { border: 2px solid #000; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>${checkpointName}</h1>
            <p class="subtitle">Checkpoint QR Code</p>
            <img src="${qrCodeImageUrl}" alt="QR Code" />
            <p class="code">${qrCode}</p>
          </div>
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              };
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>QR Code</DialogTitle>
          <DialogDescription>
            {checkpointName}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col items-center gap-4 py-4">
          {/* QR Code Image */}
          <div ref={printRef} className="rounded-lg border border-border bg-white p-4">
            <img 
              src={qrCodeImageUrl} 
              alt={`QR Code for ${checkpointName}`}
              className="h-[200px] w-[200px]"
            />
          </div>

          {/* QR Code String */}
          <div className="w-full space-y-2">
            <p className="text-sm font-medium text-muted-foreground">QR Code Value:</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded bg-muted px-3 py-2 text-xs font-mono text-foreground border border-border overflow-x-auto">
                {qrCode}
              </code>
              <Button
                variant="ghost"
                size="icon"
                onClick={copyQrCode}
              >
                {copied ? (
                  <Check className="h-4 w-4 text-success" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 w-full">
            <Button
              variant="outline"
              className="flex-1"
              onClick={printQrCode}
            >
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={downloadQrCode}
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
          <Button
            className="w-full"
            onClick={copyQrCode}
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Copy Code
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}