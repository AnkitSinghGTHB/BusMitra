import React from 'react';
import { Button } from '@/components/ui/button';
import { MapPinLine } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';

export default function CheckinButton({ busId, onCheckin, pendingCount = 0 }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center">
      <Button
        onClick={onCheckin}
        className="w-14 h-14 rounded-full shadow-lg bg-primary hover:bg-primary/90 flex items-center justify-center p-0 transition-transform active:scale-95"
        aria-label={t('im_on_this_bus')}
      >
        <MapPinLine size={28} weight="fill" className="text-white" />
      </Button>
      {pendingCount > 0 && (
        <span className="text-[10px] font-medium text-gray-500 mt-1 whitespace-nowrap bg-white px-2 py-0.5 rounded-full shadow-sm border border-gray-100">
          {t('pending_confirmations', { count: pendingCount })}
        </span>
      )}
    </div>
  );
}
