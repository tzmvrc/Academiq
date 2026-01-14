// src/components/sections/CTA.tsx
import React from 'react';
import { motion } from 'framer-motion';
import Button from '../ui/button';

const CTA: React.FC = () => (
  <section className="py-24 px-6 bg-gray-50">
    <div className="max-w-3xl mx-auto text-center">
      <motion.h2
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-3xl font-light tracking-tight mb-6"
      >
        Build academic discussions that matter.
      </motion.h2>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.2 }}
      >
        <Button>Join Academiq</Button>
      </motion.div>
    </div>
  </section>
);

export default CTA;