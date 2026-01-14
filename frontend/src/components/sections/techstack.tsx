// src/components/sections/TechStack.tsx
import React from 'react';
import { motion } from 'framer-motion';

const techs = ['React', 'Node.js', 'Supabase', 'FastAPI', 'PyTorch', 'Socket.IO'];

const TechStack: React.FC = () => (
  <section id="tech" className="py-24 px-6 bg-white">
    <div className="max-w-5xl mx-auto">
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-3xl font-light tracking-tight text-center mb-16"
      >
        Tech Stack
      </motion.h2>
      <div className="flex flex-wrap justify-center gap-6">
        {techs.map((t, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1, duration: 0.4 }}
            className="px-5 py-2 border border-gray-200 text-sm tracking-wide"
          >
            {t}
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default TechStack;