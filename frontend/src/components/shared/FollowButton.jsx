import React from 'react';
import { Crosshair } from '@phosphor-icons/react';

export default function FollowButton({ active, onToggle, className = "" }) {
  return (
    <button
      onClick={onToggle}
      className={`flex items-center justify-center w-12 h-12 rounded-full shadow-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
        active ? 'bg-primary text-white' : 'bg-white text-danger'
      } ${className}`}
      aria-label={active ? "Unfollow bus" : "Follow bus"}
    >
      <Crosshair weight={active ? "bold" : "regular"} className="w-6 h-6" />
    </button>
  );
}
