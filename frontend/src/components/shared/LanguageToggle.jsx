import React from 'react';
import { useTranslation } from 'react-i18next';

export default function LanguageToggle({ currentLang, onChange }) {
  const { i18n } = useTranslation();

  const handleLanguageChange = (lang) => {
    i18n.changeLanguage(lang);
    onChange(lang);
  };

  return (
    <div className="flex bg-gray-100 p-1 rounded-lg w-max">
      <button 
        onClick={() => handleLanguageChange('en')}
        className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${currentLang === 'en' ? 'bg-primary text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
      >
        EN
      </button>
      <button 
        onClick={() => handleLanguageChange('hi')}
        className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${currentLang === 'hi' ? 'bg-primary text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
      >
        हि
      </button>
      <button 
        onClick={() => handleLanguageChange('pa')}
        className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${currentLang === 'pa' ? 'bg-primary text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
      >
        ਪੰ
      </button>
    </div>
  );
}
