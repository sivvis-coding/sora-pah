import React from 'react';
import { Box, Button, Container, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import MockDashboard from '../components/MockDashboard';

interface HeroSectionProps {
  onGetStarted: () => void;
  onLearnMore: () => void;
}

export default function HeroSection({ onGetStarted, onLearnMore }: HeroSectionProps) {
  const { t } = useTranslation('landing');

  return (
    <Box
      sx={{
        background: 'linear-gradient(160deg, #0d47a1 0%, #1565c0 40%, #7c4dff 100%)',
        color: '#fff',
        py: { xs: 8, md: 12 },
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Subtle background circles */}
      <Box
        sx={{
          position: 'absolute',
          top: -120,
          right: -120,
          width: 400,
          height: 400,
          borderRadius: '50%',
          bgcolor: 'rgba(255,255,255,0.04)',
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
        }}
      />

      <Container maxWidth="lg">
        <Box
          sx={{
            display: 'flex',
            alignItems: { xs: 'center', md: 'center' },
            flexDirection: { xs: 'column', md: 'row' },
            gap: { xs: 5, md: 8 },
          }}
        >
          {/* Left: copy */}
          <Box sx={{ flex: 1, textAlign: { xs: 'center', md: 'left' } }}>
            <Typography
              variant="h3"
              component="h1"
              fontWeight={800}
              sx={{
                fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
                lineHeight: 1.15,
                mb: 2.5,
              }}
            >
              {t('hero.headline')}
            </Typography>
            <Typography
              variant="h6"
              component="p"
              sx={{
                opacity: 0.85,
                fontWeight: 400,
                fontSize: { xs: '1rem', md: '1.15rem' },
                lineHeight: 1.6,
                mb: 4,
                maxWidth: 520,
                mx: { xs: 'auto', md: 0 },
              }}
            >
              {t('hero.subheadline')}
            </Typography>
            <Box
              sx={{
                display: 'flex',
                gap: 2,
                justifyContent: { xs: 'center', md: 'flex-start' },
                flexWrap: 'wrap',
              }}
            >
              <Button
                variant="contained"
                size="large"
                onClick={onGetStarted}
                sx={{
                  bgcolor: '#fff',
                  color: 'primary.main',
                  fontWeight: 700,
                  px: 4,
                  py: 1.5,
                  borderRadius: 2,
                  textTransform: 'none',
                  fontSize: '1rem',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' },
                }}
              >
                {t('hero.cta')}
              </Button>
              <Button
                variant="outlined"
                size="large"
                onClick={onLearnMore}
                sx={{
                  color: '#fff',
                  borderColor: 'rgba(255,255,255,0.5)',
                  fontWeight: 600,
                  px: 4,
                  py: 1.5,
                  borderRadius: 2,
                  textTransform: 'none',
                  fontSize: '1rem',
                  '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.08)' },
                }}
              >
                {t('hero.ctaSecondary')}
              </Button>
            </Box>
          </Box>

          {/* Right: mock dashboard */}
          <Box
            sx={{
              flex: { md: '0 0 auto' },
              display: 'flex',
              justifyContent: 'center',
              '@keyframes float': {
                '0%, 100%': { transform: 'translateY(0)' },
                '50%': { transform: 'translateY(-8px)' },
              },
              animation: 'float 4s ease-in-out infinite',
            }}
          >
            <MockDashboard />
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
