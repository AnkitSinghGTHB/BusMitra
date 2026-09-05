import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Bus, QrCode } from '@phosphor-icons/react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function DriverOnboarding() {
  const navigate = useNavigate();
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const scannerRef = useRef(null);

  useEffect(() => {
    if (scanning) {
      try {
        scannerRef.current = new Html5QrcodeScanner(
          "qr-reader",
          { fps: 10, qrbox: { width: 250, height: 250 } },
          false
        );

        scannerRef.current.render((decodedText) => {
          localStorage.setItem('busmitra_bus_id', decodedText);
          if (scannerRef.current) {
            scannerRef.current.clear().catch(console.error);
          }
          navigate('/driver/dashboard');
        }, (errorMessage) => {
          // ignore stream parse errors
        });
      } catch (err) {
        setError('Failed to start camera. Please check permissions.');
        setScanning(false);
      }
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(e => console.error("Failed to clear scanner", e));
      }
    };
  }, [scanning, navigate]);

  const handleSkip = () => {
    localStorage.setItem('busmitra_bus_id', 'PB-29-M1-101');
    navigate('/driver/dashboard');
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 items-center justify-center p-4">
      <Card className="w-full max-w-sm shadow-md bg-white border-gray-200">
        <CardContent className="p-8 flex flex-col items-center text-center gap-6">
          <div className="bg-primary/10 p-4 rounded-full">
            <Bus size={48} className="text-primary" weight="fill" />
          </div>
          
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Driver Login</h1>
            <p className="text-gray-500 font-medium">Scan the QR code on your dashboard to begin</p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg w-full font-medium text-left border border-red-100">
              {error}
            </div>
          )}

          {!scanning ? (
            <Button onClick={() => setScanning(true)} className="w-full h-12 text-base rounded-xl flex items-center justify-center gap-2">
              <QrCode size={24} weight="bold" />
              Start Scanning
            </Button>
          ) : (
            <div id="qr-reader" className="w-full overflow-hidden rounded-lg border-2 border-primary/20"></div>
          )}

          <div className="w-full pt-4 border-t border-gray-100 mt-2">
            <Button variant="ghost" onClick={handleSkip} className="w-full text-gray-400 hover:text-gray-600">
              Skip scan (dev mode)
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
