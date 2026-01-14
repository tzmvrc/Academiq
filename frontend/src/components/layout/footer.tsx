// src/components/layout/Footer.tsx
import React from 'react';

const Footer: React.FC = () => (
  <footer className="bg-white border-t border-gray-200 py-10">
    <div className="max-w-7xl mx-auto px-6 text-center text-gray-400 text-xs tracking-wide">
      © {new Date().getFullYear()} Academiq
    </div>
  </footer>
);

export default Footer;