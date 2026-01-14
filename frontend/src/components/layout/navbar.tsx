// src/components/layout/Navbar.tsx
import React from 'react';
import { motion } from 'framer-motion';

const Navbar: React.FC = () => (
  <motion.header
    initial={{ y: -100 }}
    animate={{ y: 0 }}
    className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-200"
  >
    <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
      <h1 className="text-2xl font-light tracking-wider text-gray-900">Academiq</h1>
      <nav className="hidden md:flex gap-8 text-sm tracking-wide">
        <a href="#features" className="hover:text-gray-500 transition">Features</a>
        <a href="#how" className="hover:text-gray-500 transition">Process</a>
        <a href="#tech" className="hover:text-gray-500 transition">Stack</a>
      </nav>
      <button className="px-4 py-2 rounded-none border border-gray-300 hover:border-gray-900 transition">
        Start
      </button>
    </div>
  </motion.header>
);

export default Navbar;