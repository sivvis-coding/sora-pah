import React from 'react';
import { Box, Button, Container, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';

interface CtaSectionProps {
  onGetStarted: () => void;
}

export default function CtaSection({ onGetStarted }: CtaSectionProps) {
  const { t } = useTranslation('landing');

  return (
    <Box
      sx={{
        py: { xs: 8, md: 10 },
        background: 'linear-gradient(160deg, #0d47a1 0%, #1565c0 40%, #7c4dff 100%)',
        color: '#fff',
        textAlign: 'center',
      }}
    >
      <Container maxWidth="sm">
        <Typography
          variant="h4"
          component="h2"
          fontWeight={800}
          sx={{ fontSize: { xs: '1.6rem', md: '2.2rem' }, mb: 2 }}
        >
          {t('cta.title')}
        </Typography>
        <Typography
          variant="body1"
          sx={{ opacity: 0.85, mb: 4, fontSize: { xs: '0.95rem', md: '1.05rem' } }}
        >
          {t('cta.subtitle')}
        </Typography>
        <Button
          variant="contained"
          size="large"
          onClick={onGetStarted}
          sx={{
            bgcolor: '#fff',
            color: 'primary.main',
            fontWeight: 700,
            px: 5,
            py: 1.5,
            borderRadius: 2,
            textTransform: 'none',
            fontSize: '1.05rem',
            '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' },
          }}
        >
          {t('cta.button')}
        </Button>
      </Container>
    </Box>
  );
}
