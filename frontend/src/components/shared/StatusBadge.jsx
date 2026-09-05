import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Circle } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';

export default function StatusBadge({ status }) {
  const { t } = useTranslation();

  const getStatusConfig = () => {
    switch (status) {
      case 'live':
        return {
          color: 'text-success',
          bg: 'bg-success/10 text-success border-success/20',
          label: t('status_live'),
        };
      case 'scheduled':
        return {
          color: 'text-danger',
          bg: 'bg-gray-100 text-gray-700 border-gray-200',
          label: t('status_scheduled'),
        };
      case 'crowd_restored':
        return {
          color: 'text-warning',
          bg: 'bg-warning/10 text-warning border-warning/30',
          label: t('status_crowd_restored'),
        };
      default:
        return {
          color: 'text-gray-400',
          bg: 'bg-gray-100 text-gray-500 border-gray-200',
          label: t('status_offline'),
        };
    }
  };

  const config = getStatusConfig();

  return (
    <Badge variant="outline" className={`font-semibold tracking-wide flex items-center gap-1.5 px-2 py-0.5 ${config.bg}`}>
      <Circle size={10} weight="fill" className={config.color} />
      <span>{config.label}</span>
    </Badge>
  );
}
