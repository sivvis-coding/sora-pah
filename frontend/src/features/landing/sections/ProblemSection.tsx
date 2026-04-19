import React from 'react';
import { Box, Container, Grid, Paper, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import {
  RecordVoiceOver as VoicesIcon,
  Shuffle as ShuffleIcon,
  HourglassBottom as SlowIcon,
} from '@mui/icons-material';

const items = [
  { key: 'voices', icon: VoicesIcon, color: '#e53935' },
  { key: 'structure', icon: ShuffleIcon, color: '#fb8c00' },
  { key: 'slow', icon: SlowIcon, color: '#8e24aa' },
] as const;

export default function ProblemSection() {
  const { t } = useTranslation('landing');

  return (
    <Box sx={{ py: { xs: 8, md: 12 }, bgcolor: '#fafafa' }} id="problem">
      <Container maxWidth="lg">
        <Box sx={{ textAlign: 'center', mb: { xs: 5, md: 7 } }}>
          <Typography
            variant="h4"
            component="h2"
            fontWeight={800}
            sx={{ fontSize: { xs: '1.6rem', md: '2.2rem' }, mb: 1.5 }}
          >
            {t('problem.title')}
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ maxWidth: 560, mx: 'auto', fontSize: { xs: '0.95rem', md: '1.05rem' } }}
          >
            {t('problem.subtitle')}
          </Typography>
        </Box>

        <Grid container spacing={4} justifyContent="center">
          {items.map(({ key, icon: Icon, color }) => (
            <Grid item xs={12} sm={6} md={4} key={key}>
              <Paper
                elevation={0}
                sx={{
                  p: { xs: 3, md: 4 },
                  borderRadius: 3,
                  border: '1px solid',
                  borderColor: 'divider',
                  textAlign: 'center',
                  height: '100%',
                  transition: 'box-shadow 0.25s, transform 0.25s',
                  '&:hover': {
                    boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
                    transform: 'translateY(-4px)',
                  },
                }}
              >
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    bgcolor: `${color}14`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                    mb: 2.5,
                  }}
                >
                  <Icon sx={{ fontSize: 28, color }} />
                </Box>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 1, fontSize: '1.1rem' }}>
                  {t(`problem.${key}.title`)}
                </Typography>
                <Typography variant="body2" color="text.secondary" lineHeight={1.7}>
                  {t(`problem.${key}.desc`)}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}
