// src/pages/Landing.tsx
import React from 'react';
import Navbar from '../../components/layout/navbar';
import Hero from '../../components/sections/hero';
import Features from '../../components/sections/features';
import HowItWorks from '../../components/sections/howitworks';
import TechStack from '../../components/sections/techstack';
import CTA from '../../components/sections/cta';
import Footer from '../../components/layout/footer';

const Landing: React.FC = () => (
  <>
    <Navbar />
    <Hero />
    <Features />
    <HowItWorks />
    <TechStack />
    <CTA />
    <Footer />
  </>
);

export default Landing;