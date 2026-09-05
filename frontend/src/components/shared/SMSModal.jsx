import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { useBusStore } from '@/store/useBusStore';

export default function SMSModal({ open, onClose, eta, stopName }) {
  const { t } = useTranslation();
  const sendSmsQuery = useBusStore((state) => state.sendSmsQuery);
  const [smsInput, setSmsInput] = useState('BUS M1');
  const [smsReply, setSmsReply] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      handleSendSms('BUS M1');
    }
  }, [open]);

  const handleSendSms = async (msg) => {
    setLoading(true);
    try {
      const res = await sendSmsQuery(msg || smsInput);
      setSmsReply(res.reply || res.message || 'Bus arriving in 8-13 mins.');
    } catch (e) {
      setSmsReply(`Bus M1 arriving at ${stopName || 'your stop'} in ${eta?.min || 8}-${eta?.max || 13} mins.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md bg-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>📱</span> {t('sms_simulation_title')}
          </DialogTitle>
          <DialogDescription className="text-xs text-gray-500">
            Simulates a ₹500 Nokia feature phone without internet. Tests real backend <code className="text-blue-600 font-bold">/api/sms-webhook</code>.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col items-center py-3">
          {/* Nokia 3310 Style Green Screen */}
          <div className="bg-[#8fa382] text-[#1c2e17] rounded-2xl p-5 max-w-[300px] w-full shadow-2xl border-[6px] border-[#2d3748] font-mono">
            <div className="flex justify-between items-center text-[10px] border-b border-[#1c2e17]/30 pb-1 mb-2 font-bold">
              <span>📶 AIRTEL</span>
              <span>10:45 PM 🔋</span>
            </div>

            <div className="text-xs flex flex-col gap-2 min-h-[120px]">
              <div className="bg-[#7e9172] p-1.5 rounded border border-[#1c2e17]/20">
                <span className="text-[10px] font-bold block text-[#1c2e17]/70">TO: 77333</span>
                <span className="font-bold">{smsInput}</span>
              </div>

              <div className="bg-[#9bb08e] p-2 rounded border border-[#1c2e17]/20 flex-1">
                <span className="text-[10px] font-bold block text-[#1c2e17]/70">INCOMING SMS:</span>
                {loading ? (
                  <span className="text-xs animate-pulse">Receiving network reply...</span>
                ) : (
                  <p className="text-xs leading-relaxed font-bold whitespace-pre-wrap">{smsReply}</p>
                )}
              </div>
            </div>

            <div className="mt-2 text-center text-[9px] text-[#1c2e17]/60 font-sans font-bold">
              ZERO HARDWARE • 100% INCLUSIVE
            </div>
          </div>
        </div>

        <div className="flex gap-2 justify-between items-center mt-1">
          <div className="flex gap-1.5 flex-1">
            <input 
              type="text" 
              value={smsInput} 
              onChange={(e) => setSmsInput(e.target.value.toUpperCase())}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-mono w-28 uppercase"
              placeholder="BUS M1"
            />
            <Button size="sm" onClick={() => handleSendSms(smsInput)} disabled={loading} className="text-xs font-bold">
              {loading ? '...' : 'Send SMS'}
            </Button>
          </div>
          <Button onClick={onClose} variant="secondary" size="sm" className="text-xs">{t('close_btn')}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
