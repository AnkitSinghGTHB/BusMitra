import { useState, useEffect, useRef, useCallback } from 'react';

export function useBluetooth() {
  const [isScanning, setIsScanning] = useState(false);
  const [scanMode, setScanMode] = useState('idle'); // 'idle' | 'real' | 'unsupported'
  const [bleCount, setBleCount] = useState(null);
  const [error, setError] = useState(null);
  const scanIntervalRef = useRef(null);
  const scanRef = useRef(null);
  const listenerRef = useRef(null);
  const devicesSeen = useRef(new Set());
  const totalDevicesSeen = useRef(new Set()); 

  const handleAdvertisement = useCallback((event) => {
    const id = event.device?.id || event.device?.name || Math.random().toString();
    console.log('[BLE] Advertisement received from:', id, 'RSSI:', event.rssi);
    devicesSeen.current.add(id);
    totalDevicesSeen.current.add(id);
  }, []);

  const startScanning = async () => {
    setError(null);

    if (!navigator.bluetooth || !navigator.bluetooth.requestLEScan) {
      setScanMode('unsupported');
      setIsScanning(false);
      setBleCount(null);
      setError('BLE passive scanning requires Chrome/Edge with experimental web platform features enabled.');
      return;
    }

    try {
      console.log('[BLE] Requesting LE Scan...');
      const scan = await navigator.bluetooth.requestLEScan({ acceptAllAdvertisements: true });
      scanRef.current = scan;
      console.log('[BLE] Scan started:', scan);

      if (listenerRef.current) {
        navigator.bluetooth.removeEventListener('advertisementreceived', listenerRef.current);
      }
      listenerRef.current = handleAdvertisement;
      navigator.bluetooth.addEventListener('advertisementreceived', handleAdvertisement);

      setIsScanning(true);
      setScanMode('real');
      setBleCount(0);
      devicesSeen.current.clear();
      totalDevicesSeen.current.clear();

      scanIntervalRef.current = setInterval(() => {
        const windowCount = devicesSeen.current.size;
        const totalCount = totalDevicesSeen.current.size;
        const currentCount = Math.max(windowCount, totalCount);
        console.log(`[BLE] 5s Tick -> Window: ${windowCount}, Total: ${totalCount}`);
        setBleCount(currentCount);
        devicesSeen.current.clear();
      }, 5000);

      scan.addEventListener('inactive', () => {
        console.warn('[BLE] Scan became inactive (browser timeout)');
      });

    } catch (err) {
      const msg = err.message || 'Unknown BLE error';
      if (msg.includes('denied') || msg.includes('cancel') || msg.includes('NotAllowedError')) {
        setError('Bluetooth scan permission was denied.');
      } else {
        setError(`BLE Error: ${msg}`);
      }
      console.error('[BLE] scan error:', err);
      setIsScanning(false);
      setScanMode('unsupported');
      setBleCount(null);
    }
  };

  const stopScanning = () => {
    console.log('[BLE] Stopping scan');
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (scanRef.current && typeof scanRef.current.stop === 'function') {
      try { scanRef.current.stop(); } catch (e) {}
      scanRef.current = null;
    }
    if (listenerRef.current) {
      try { navigator.bluetooth.removeEventListener('advertisementreceived', listenerRef.current); } catch (e) {}
      listenerRef.current = null;
    }
    setIsScanning(false);
    setScanMode('idle');
    devicesSeen.current.clear();
    totalDevicesSeen.current.clear();
    setBleCount(null);
  };

  useEffect(() => {
    return () => stopScanning();
  }, []);

  return { isScanning, scanMode, bleCount, startScanning, stopScanning, error };
}
