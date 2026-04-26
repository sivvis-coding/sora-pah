import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Fade,
  LinearProgress,
  useTheme,
  useMediaQuery,
  Paper,
  Chip,
} from '@mui/material';
import {
  LightbulbOutlined as IdeaIcon,
  GroupsOutlined as TeamIcon,
  RocketLaunchOutlined as RocketIcon,
  ArrowForward as ArrowIcon,
  CheckCircleOutline as CheckIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/AuthContext';
import apiClient from '../../shared/api/client';

// ─── Step definitions ─────────────────────────────────────────────────────────

const TOTAL_STEPS = 3;

// ─── Step indicator ───────────────────────────────────────────────────────────

function OnboardingProgress({ step }: { step: number }) {
  const progress = ((step + 1) / TOTAL_STEPS) * 100;
  return (
    <Box sx={{ mb: 5 }}>
      <LinearProgress
        variant="determinate"
        value={progress}
        sx={{
          height: 3,
          borderRadius: 2,
          bgcolor: 'rgba(255,255,255,0.15)',
          '& .MuiLinearProgress-bar': {
            borderRadius: 2,
            bgcolor: 'white',
          },
        }}
      />
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.75 }}>
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>
          {step + 1} / {TOTAL_STEPS}
        </Typography>
      </Box>
    </Box>
  );
}

// ─── Step 0: Welcome ──────────────────────────────────────────────────────────

function StepWelcome({ name, onNext }: { name: string; onNext: () => void }) {
  const { t } = useTranslation('landing');

  const pillars = [
    { icon: <IdeaIcon sx={{ fontSize: 18 }} />, label: t('onboarding.welcome.pillar1') },
    { icon: <TeamIcon sx={{ fontSize: 18 }} />, label: t('onboarding.welcome.pillar2') },
    { icon: <RocketIcon sx={{ fontSize: 18 }} />, label: t('onboarding.welcome.pillar3') },
  ];

  return (
    <Fade in timeout={400}>
      <Box>
        <Typography
          sx={{
            fontSize: { xs: '0.8rem', sm: '0.875rem' },
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
            color: 'rgba(255,255,255,0.55)',
            mb: 1.5,
          }}
        >
          {t('onboarding.welcome.eyebrow', { name })}
        </Typography>

        <Typography
          sx={{
            fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
            fontWeight: 900,
            lineHeight: 1.1,
            color: 'white',
            mb: 2,
            letterSpacing: '-0.02em',
          }}
        >
          {t('onboarding.welcome.headline')}
        </Typography>

        <Typography
          sx={{
            fontSize: { xs: '1rem', sm: '1.125rem' },
            color: 'rgba(255,255,255,0.75)',
            mb: 4,
            lineHeight: 1.6,
            maxWidth: 480,
          }}
        >
          {t('onboarding.welcome.subheadline')}
        </Typography>

        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mb: 5 }}>
          {pillars.map((p) => (
            <Chip
              key={p.label}
              icon={p.icon}
              label={p.label}
              sx={{
                bgcolor: 'rgba(255,255,255,0.12)',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.2)',
                fontWeight: 600,
                '& .MuiChip-icon': { color: 'rgba(255,255,255,0.8)' },
              }}
            />
          ))}
        </Box>

        <Button
          variant="contained"
          size="large"
          endIcon={<ArrowIcon />}
          onClick={onNext}
          sx={{
            bgcolor: 'white',
            color: '#1565c0',
            fontWeight: 800,
            fontSize: { xs: '1rem', sm: '1.05rem' },
            px: 4,
            py: 1.5,
            borderRadius: 3,
            textTransform: 'none',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            '&:hover': {
              bgcolor: 'rgba(255,255,255,0.92)',
              transform: 'translateY(-1px)',
              boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
            },
            transition: 'all 0.2s ease',
          }}
        >
          {t('onboarding.welcome.cta')}
        </Button>
      </Box>
    </Fade>
  );
}

// ─── Step 1: First idea prompt ────────────────────────────────────────────────

function StepFirstIdea({ onNext }: { onNext: () => void }) {
  const { t } = useTranslation('landing');

  const examples = [
    t('onboarding.idea.example1'),
    t('onboarding.idea.example2'),
    t('onboarding.idea.example3'),
  ];

  return (
    <Fade in timeout={400}>
      <Box>
        <Typography
          sx={{
            fontSize: { xs: '0.8rem', sm: '0.875rem' },
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
            color: 'rgba(255,255,255,0.55)',
            mb: 1.5,
          }}
        >
          {t('onboarding.idea.eyebrow')}
        </Typography>

        <Typography
          sx={{
            fontSize: { xs: '1.75rem', sm: '2.25rem', md: '2.75rem' },
            fontWeight: 900,
            lineHeight: 1.15,
            color: 'white',
            mb: 2,
            letterSpacing: '-0.02em',
          }}
        >
          {t('onboarding.idea.headline')}
        </Typography>

        <Typography
          sx={{
            fontSize: { xs: '1rem', sm: '1.1rem' },
            color: 'rgba(255,255,255,0.75)',
            mb: 4,
            lineHeight: 1.6,
            maxWidth: 460,
          }}
        >
          {t('onboarding.idea.subheadline')}
        </Typography>

        {/* Example ideas */}
        <Box sx={{ mb: 5 }}>
          <Typography
            variant="caption"
            sx={{
              color: 'rgba(255,255,255,0.45)',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              display: 'block',
              mb: 1.5,
            }}
          >
            {t('onboarding.idea.examplesLabel')}
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {examples.map((ex) => (
              <Box
                key={ex}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  bgcolor: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 2,
                  px: 2,
                  py: 1.25,
                }}
              >
                <IdeaIcon sx={{ fontSize: 16, color: 'rgba(255,255,255,0.5)', flexShrink: 0 }} />
                <Typography
                  variant="body2"
                  sx={{ color: 'rgba(255,255,255,0.8)', fontStyle: 'italic' }}
                >
                  "{ex}"
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>

        <Button
          variant="contained"
          size="large"
          endIcon={<ArrowIcon />}
          onClick={onNext}
          sx={{
            bgcolor: 'white',
            color: '#1565c0',
            fontWeight: 800,
            fontSize: { xs: '1rem', sm: '1.05rem' },
            px: 4,
            py: 1.5,
            borderRadius: 3,
            textTransform: 'none',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            '&:hover': {
              bgcolor: 'rgba(255,255,255,0.92)',
              transform: 'translateY(-1px)',
              boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
            },
            transition: 'all 0.2s ease',
          }}
        >
          {t('onboarding.idea.cta')}
        </Button>
      </Box>
    </Fade>
  );
}

// ─── Step 2: Ready to go ──────────────────────────────────────────────────────

function StepReady({ onFinish, isLoading }: { onFinish: () => void; isLoading: boolean }) {
  const { t } = useTranslation('landing');

  const steps = [
    t('onboarding.ready.step1'),
    t('onboarding.ready.step2'),
    t('onboarding.ready.step3'),
  ];

  return (
    <Fade in timeout={400}>
      <Box>
        <Box
          sx={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            bgcolor: 'rgba(255,255,255,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mb: 3,
          }}
        >
          <CheckIcon sx={{ fontSize: 36, color: 'white' }} />
        </Box>

        <Typography
          sx={{
            fontSize: { xs: '1.75rem', sm: '2.25rem', md: '2.75rem' },
            fontWeight: 900,
            lineHeight: 1.15,
            color: 'white',
            mb: 2,
            letterSpacing: '-0.02em',
          }}
        >
          {t('onboarding.ready.headline')}
        </Typography>

        <Typography
          sx={{
            fontSize: { xs: '1rem', sm: '1.1rem' },
            color: 'rgba(255,255,255,0.75)',
            mb: 4,
            lineHeight: 1.6,
            maxWidth: 440,
          }}
        >
          {t('onboarding.ready.subheadline')}
        </Typography>

        {/* What you can do */}
        <Box sx={{ mb: 5 }}>
          {steps.map((s, i) => (
            <Box
              key={s}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                py: 1,
              }}
            >
              <Box
                sx={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  bgcolor: 'rgba(255,255,255,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Typography
                  sx={{ fontSize: '0.7rem', fontWeight: 800, color: 'white', lineHeight: 1 }}
                >
                  {i + 1}
                </Typography>
              </Box>
              <Typography sx={{ color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>
                {s}
              </Typography>
            </Box>
          ))}
        </Box>

        <Button
          variant="contained"
          size="large"
          endIcon={isLoading ? undefined : <RocketIcon />}
          onClick={onFinish}
          disabled={isLoading}
          sx={{
            bgcolor: 'white',
            color: '#1565c0',
            fontWeight: 800,
            fontSize: { xs: '1rem', sm: '1.05rem' },
            px: 4,
            py: 1.5,
            borderRadius: 3,
            textTransform: 'none',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            '&:hover': {
              bgcolor: 'rgba(255,255,255,0.92)',
              transform: 'translateY(-1px)',
              boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
            },
            '&:disabled': {
              bgcolor: 'rgba(255,255,255,0.5)',
              color: '#1565c0',
            },
            transition: 'all 0.2s ease',
          }}
        >
          {t('onboarding.ready.cta')}
        </Button>
      </Box>
    </Fade>
  );
}

// ─── Main LandingPage ─────────────────────────────────────────────────────────

export default function LandingPage() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [step, setStep] = useState(0);
  const [isFinishing, setIsFinishing] = useState(false);

  const firstName = user?.name?.split(' ')[0] ?? '';

  const handleFinish = async () => {
    setIsFinishing(true);
    if (user?.id) {
      try {
        await apiClient.patch(`/users/${user.id}`, { hasSeenLanding: true });
        await refreshUser();
      } catch {
        // best-effort
      }
    }
    // Navigate to idea creation — this is the "first action"
    navigate('/ideas/new', { replace: true });
  };

  const handleSkip = async () => {
    if (user?.id) {
      try {
        await apiClient.patch(`/users/${user.id}`, { hasSeenLanding: true });
        await refreshUser();
      } catch {
        // best-effort
      }
    }
    navigate('/', { replace: true });
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg, #0d47a1 0%, #1565c0 45%, #7c4dff 100%)',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background decoration */}
      <Box
        sx={{
          position: 'absolute',
          top: -120,
          right: -120,
          width: 400,
          height: 400,
          borderRadius: '50%',
          bgcolor: 'rgba(255,255,255,0.04)',
          pointerEvents: 'none',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: -80,
          left: -80,
          width: 300,
          height: 300,
          borderRadius: '50%',
          bgcolor: 'rgba(255,255,255,0.03)',
          pointerEvents: 'none',
        }}
      />

      {/* Skip link */}
      <Box
        sx={{
          position: 'absolute',
          top: { xs: 16, sm: 24 },
          right: { xs: 16, sm: 32 },
          zIndex: 10,
        }}
      >
        <Button
          size="small"
          onClick={handleSkip}
          sx={{
            color: 'rgba(255,255,255,0.5)',
            textTransform: 'none',
            fontWeight: 500,
            fontSize: '0.8rem',
            '&:hover': { color: 'rgba(255,255,255,0.85)', bgcolor: 'transparent' },
          }}
        >
          Skip tour
        </Button>
      </Box>

      {/* Content */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          px: { xs: 3, sm: 6, md: 10, lg: 14 },
          py: { xs: 8, sm: 6 },
          maxWidth: 800,
          mx: 'auto',
          width: '100%',
        }}
      >
        <Box sx={{ width: '100%' }}>
          <OnboardingProgress step={step} />

          {step === 0 && (
            <StepWelcome
              name={firstName}
              onNext={() => setStep(1)}
            />
          )}

          {step === 1 && (
            <StepFirstIdea
              onNext={() => setStep(2)}
            />
          )}

          {step === 2 && (
            <StepReady
              onFinish={handleFinish}
              isLoading={isFinishing}
            />
          )}

          {/* Back navigation */}
          {step > 0 && (
            <Box sx={{ mt: 3 }}>
              <Button
                size="small"
                onClick={() => setStep(step - 1)}
                sx={{
                  color: 'rgba(255,255,255,0.4)',
                  textTransform: 'none',
                  fontSize: '0.8rem',
                  '&:hover': { color: 'rgba(255,255,255,0.7)', bgcolor: 'transparent' },
                }}
              >
                ← Back
              </Button>
            </Box>
          )}
        </Box>
      </Box>

      {/* SORA wordmark bottom */}
      <Box
        sx={{
          textAlign: 'center',
          pb: { xs: 3, sm: 4 },
          opacity: 0.3,
        }}
      >
        <Typography
          sx={{
            fontSize: '0.75rem',
            fontWeight: 800,
            letterSpacing: '0.3em',
            color: 'white',
            textTransform: 'uppercase',
          }}
        >
          SORA
        </Typography>
      </Box>
    </Box>
  );
}
