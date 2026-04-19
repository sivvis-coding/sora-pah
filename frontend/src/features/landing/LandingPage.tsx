import React, { useRef } from 'react';
import { Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import apiClient from '../../shared/api/client';
import HeroSection from './sections/HeroSection';
import ProblemSection from './sections/ProblemSection';
import SolutionSection from './sections/SolutionSection';
import HowItWorksSection from './sections/HowItWorksSection';
import ValuePropSection from './sections/ValuePropSection';
import RolesSection from './sections/RolesSection';
import CtaSection from './sections/CtaSection';
import FooterSection from './sections/FooterSection';

export default function LandingPage() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const problemRef = useRef<HTMLDivElement>(null);

  const handleGetStarted = async () => {
    if (user?.id) {
      try {
        await apiClient.patch(`/users/${user.id}`, { hasSeenLanding: true });
        await refreshUser();
      } catch {
        // Best-effort — navigate anyway
      }
    }
    navigate('/', { replace: true });
  };

  const handleLearnMore = () => {
    problemRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <Box sx={{ bgcolor: '#fff', minHeight: '100vh' }}>
      <HeroSection onGetStarted={handleGetStarted} onLearnMore={handleLearnMore} />
      <Box ref={problemRef}>
        <ProblemSection />
      </Box>
      <SolutionSection />
      <HowItWorksSection />
      <ValuePropSection />
      <RolesSection />
      <CtaSection onGetStarted={handleGetStarted} />
      <FooterSection />
    </Box>
  );
}
