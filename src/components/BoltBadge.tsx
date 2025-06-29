import React from 'react';

export default function BoltBadge() {
  return (
    <a 
      href="https://bolt.new" 
      target="_blank" 
      rel="noopener noreferrer"
      className="fixed bottom-4 left-4 z-[1000] w-12 h-12 rounded-full shadow-lg hover:shadow-xl transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      title="Made with Bolt"
      aria-label="Made with Bolt - Visit bolt.new"
    >
      <img 
        src="/bolt-badge.svg" 
        alt="Bolt Badge" 
        className="w-full h-full"
      />
    </a>
  );
}