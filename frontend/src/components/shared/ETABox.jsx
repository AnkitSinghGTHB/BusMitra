import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Clock } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';

export default function ETABox({ min, max, confidence, source, lastUpdateSeconds }) {
  const { t } = useTranslation();
  const isLowConfidence = confidence < 50;

  return (
    <Card className={`overflow-hidden shadow-sm border-l-4 ${isLowConfidence ? 'border-l-warning bg-warning/5' : 'border-l-primary bg-white'}`}>
      <CardContent className="p-4 flex flex-col gap-1.5">
        <div className="flex items-end gap-2">
          <span className="text-[32px] font-[800] leading-none text-gray-900 tracking-tight">
            {min}-{max} <span className="text-xl font-bold text-gray-600">{t('min_unit')}</span>
          </span>
        </div>
        
        <div className="flex items-center gap-2 mt-1">
          <span className={`text-sm font-semibold px-2 py-0.5 rounded-md ${isLowConfidence ? 'bg-warning/20 text-warning' : 'bg-success/10 text-success'}`}>
            {t('confidence_label', { confidence })}
          </span>
          <span className="text-xs font-medium text-gray-500">
            • {t('source_label', { source })}
          </span>
        </div>

        <div className="flex items-center gap-1.5 mt-2 text-xs font-medium text-gray-400">
          <Clock size={14} weight="bold" />
          <span>{lastUpdateSeconds > 0 ? t('updated_ago', { seconds: lastUpdateSeconds }) : t('just_now')}</span>
        </div>
      </CardContent>
    </Card>
  );
}
