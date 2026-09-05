import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiSlash, UsersThree } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';

export default function FallbackBanner({ visible, mode }) {
  const { t } = useTranslation();
  const isScheduled = mode === 'scheduled';
  
  const icon = isScheduled 
    ? <WifiSlash size={20} className="text-amber-600 flex-shrink-0" />
    : <UsersThree size={20} className="text-blue-600 flex-shrink-0" />;
    
  const text = isScheduled 
    ? t('signal_lost_banner')
    : t('position_restored_banner');
    
  const containerClass = isScheduled
    ? "bg-amber-50 border-b border-amber-200 text-amber-800"
    : "bg-blue-50 border-b border-blue-200 text-blue-800";

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="overflow-hidden w-full z-40 relative origin-top"
        >
          <div className={`px-4 py-3 flex items-start gap-3 ${containerClass} text-sm font-medium`}>
            <div className="mt-0.5">{icon}</div>
            <p className="leading-snug">{text}</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
