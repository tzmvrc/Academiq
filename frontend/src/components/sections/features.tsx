// src/components/sections/Features.tsx
import React from 'react';
import { motion } from 'framer-motion';

const features = [
  { title: 'AI Content Validation', desc: 'Automated checks ensure scholarly integrity.' },
  { title: 'Discussion Summarization', desc: 'AI condenses threads into key insights.' },
  { title: 'Vote & Reputation Validation', desc: 'Sybil-resistant reputation via AI.' },
  { title: 'Comment Verification', desc: 'Detects low-quality or spam responses.' },
  { title: 'Real-time Discussions', desc: 'Live threads with citation tracking.' },
];

const Features: React.FC = () => (
  <section id="features" className="py-24 px-6 bg-white">
    <div className="max-w-7xl mx-auto">
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-3xl font-light tracking-tight text-center mb-16"
      >
        Features
      </motion.h2>
      <div className="grid md:grid-cols-3 gap-12">
        {features.map((f, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1, duration: 0.5 }}
            className="relative pl-6"
          >
            <div className="absolute left-0 top-0 h-full w-px bg-gray-200" />
            <h3 className="text-lg font-light tracking-wide mb-2">{f.title}</h3>
            <p className="text-sm text-gray-500 tracking-wide">{f.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default Features;