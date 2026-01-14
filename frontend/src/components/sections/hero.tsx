// src/components/sections/Hero.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { Canvas } from '@react-three/fiber';
import FloatingObject from '../ui/floatingObject';
import Button from '../ui/button';

const Hero: React.FC = () => (
  <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-white">
    <div className="absolute inset-0 z-0 opacity-30">
      <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
        <ambientLight intensity={1} />
        <FloatingObject />
      </Canvas>
    </div>
    <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
      <motion.h1
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        className="text-5xl md:text-7xl font-light tracking-tighter text-gray-900"
      >
        Academiq
      </motion.h1>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.7 }}
        className="mt-6 h-px w-16 mx-auto bg-gray-300"
      />
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.7 }}
        className="mt-6 text-sm md:text-base tracking-wide text-gray-600"
      >
        AI-powered academic discussions. Verified. Summarized. Elevated.
      </motion.p>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.7 }}
        className="mt-8 flex flex-col sm:flex-row gap-4 justify-center"
      >
        <Button>Get Started</Button>
        <Button variant="secondary">Features</Button>
      </motion.div>
    </div>
  </section>
);

export default Hero;