import React, { useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PhoneCall } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';

export default function IVRModal({ open, onClose, eta, language }) {
  const { t } = useTranslation();
  const transcript = t('sms_msg_body', { min: eta?.min, max: eta?.max, stopName: 'Bhagwan Chowk' }); // Using SMS message body as IVR transcript for consistency

  useEffect(() => {
    if (open) {
      try {
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(transcript);
          if (language === 'hi') utterance.lang = 'hi-IN';
          if (language === 'pa') utterance.lang = 'pa-IN';
          window.speechSynthesis.speak(utterance);
        }
      } catch (e) {
        console.error('Speech synthesis failed:', e);
      }
    } else {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    }
    
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [open, transcript, language]);

  const handleClose = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-md bg-white text-center">
        <DialogHeader>
          <DialogTitle>{t('ivr_simulation_title')}</DialogTitle>
          <DialogDescription className="sr-only">A simulated IVR incoming call playing a voice message.</DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col items-center py-6 gap-4">
          <div className="bg-primary/10 p-4 rounded-full animate-pulse">
            <PhoneCall size={48} className="text-primary" weight="fill" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">{t('playing_voice')}</h3>
          <p className="text-gray-600 bg-gray-50 p-4 rounded-lg border border-gray-100 italic w-full">
            "{transcript}"
          </p>
        </div>

        <div className="flex justify-end mt-2">
          <Button onClick={handleClose} variant="secondary">{t('close_btn')}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
