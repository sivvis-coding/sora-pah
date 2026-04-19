import React from 'react';
import { Box, Container, Grid, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import {
  Inbox as CaptureIcon,
  Groups as GatherIcon,
  Gavel as DecideIcon,
  RocketLaunch as ExecuteIcon,
} from '@mui/icons-material';

const steps = [
  { key: 'step1', icon: CaptureIcon, color: '#1565c0' },
  { key: 'step2', icon: GatherIcon, color: '#7c4dff' },
  { key: 'step3', icon: DecideIcon, color: '#00897b' },
  { key: 'step4', icon: ExecuteIcon, color: '#e65100' },
] as const;

export default function HowItWorksSection() {
  const { t } = useTranslation('landing');

  return (
    <Box sx={{ py: { xs: 8, md: 12 }, bgcolor: '#fafafa' }}>
      <Container maxWidth="lg">
        <Box sx={{ textAlign: 'center', mb: { xs: 5, md: 7 } }}>
          <Typography
            variant="h4"
            component="h2"
            fontWeight={800}
            sx={{ fontSize: { xs: '1.6rem', md: '2.2rem' }, mb: 1.5 }}
          >
            {t('howItWorks.title')}
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ maxWidth: 480, mx: 'auto', fontSize: { xs: '0.95rem', md: '1.05rem' } }}
          >
            {t('howItWorks.subtitle')}
          </Typography>
        </Box>

        <Grid container spacing={4}>
          {steps.map(({ key, icon: Icon, color }, index) => (
            <Grid item xs={12} sm={6} md={3} key={key}>
              <Box sx={{ textAlign: 'center', position: 'relative' }}>
                {/* Step number */}
                <Typography
                  variant="h3"
                  fontWeight={900}
                  sx={{
                    color: `${color}18`,
                    fontSize: '4rem',
                    lineHeight: 1,
                    mb: -1,
                    userSelect: 'none',
                  }}
                >
                  {index + 1}
                </Typography>

                {/* Icon */}
                <Box
                  sx={{
                    width: 64,
                    height: 64,
                    borderRadius: '50%',
                    bgcolor: `${color}14`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                    mb: 2,
                    position: 'relative',
                  }}
                >
                  <Icon sx={{ fontSize: 30, color }} />
                </Box>

                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
                  {t(`howItWorks.${key}.title`)}
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  lineHeight={1.7}
                  sx={{ maxWidth: 240, mx: 'auto' }}
                >
                  {t(`howItWorks.${key}.desc`)}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}
