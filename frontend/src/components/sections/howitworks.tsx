// src/components/sections/HowItWorks.tsx
import React from 'react';
import { motion } from 'framer-motion';

const steps = [
  { step: 1, title: 'Submit Your Question', desc: 'Post your academic query with references.' },
  { step: 2, title: 'AI Validates & Ranks', desc: 'Our models verify sources and surface quality.' },
  { step: 3, title: 'Engage & Learn', desc: 'Discuss with verified scholars and gain insights.' },
];

const HowItWorks: React.FC = () => (
  <section id="how" className="py-24 px-6 bg-gray-50">
    <div className="max-w-5xl mx-auto">
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-3xl font-light tracking-tight text-center mb-16"
      >
        Process
      </motion.h2>
      <div className="relative flex flex-col md:flex-row justify-between items-start gap-12">
        <div className="absolute inset-0 flex items-center justify-center md:block md:top-6 md:left-16 md:right-16">
          <div className="h-px w-full bg-gray-200" />
        </div>
        {steps.map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.2, duration: 0.6 }}
            className="relative flex-1 text-center bg-gray-50 px-4"
          >
            <div className="mx-auto mb-4 w-12 h-12 flex items-center justify-center border border-gray-300 bg-white text-sm">
              {s.step}
            </div>
            <h3 className="text-lg font-light tracking-wide mb-1">{s.title}</h3>
            <p className="text-sm text-gray-500 tracking-wide">{s.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default HowItWorks;