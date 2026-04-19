import React from 'react';
import { Box, Container, Grid, Paper, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import {
  Forum as InputIcon,
  HowToVote as VotingIcon,
  Visibility as TransparencyIcon,
  RocketLaunch as ExecutionIcon,
} from '@mui/icons-material';

const items = [
  { key: 'input', icon: InputIcon, color: '#1565c0' },
  { key: 'voting', icon: VotingIcon, color: '#7c4dff' },
  { key: 'transparency', icon: TransparencyIcon, color: '#00897b' },
  { key: 'execution', icon: ExecutionIcon, color: '#e65100' },
] as const;

export default function SolutionSection() {
  const { t } = useTranslation('landing');

  return (
    <Box sx={{ py: { xs: 8, md: 12 } }}>
      <Container maxWidth="lg">
        <Box sx={{ textAlign: 'center', mb: { xs: 5, md: 7 } }}>
          <Typography
            variant="h4"
            component="h2"
            fontWeight={800}
            sx={{ fontSize: { xs: '1.6rem', md: '2.2rem' }, mb: 1.5 }}
          >
            {t('solution.title')}
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ maxWidth: 560, mx: 'auto', fontSize: { xs: '0.95rem', md: '1.05rem' } }}
          >
            {t('solution.subtitle')}
          </Typography>
        </Box>

        <Grid container spacing={3}>
          {items.map(({ key, icon: Icon, color }) => (
            <Grid item xs={12} sm={6} md={3} key={key}>
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  borderRadius: 3,
                  border: '1px solid',
                  borderColor: 'divider',
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
                    width: 48,
                    height: 48,
                    borderRadius: 2,
                    bgcolor: `${color}14`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 2,
                  }}
                >
                  <Icon sx={{ fontSize: 24, color }} />
                </Box>
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
                  {t(`solution.${key}.title`)}
                </Typography>
                <Typography variant="body2" color="text.secondary" lineHeight={1.7}>
                  {t(`solution.${key}.desc`)}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}
