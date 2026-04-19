import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  Typography,
  useTheme,
} from '@mui/material';
import {
  HowToVote as VoteIcon,
  Inventory2 as ProductIcon,
  Groups as AlignIcon,
  TrendingUp as ImpactIcon,
  ArrowForward as ArrowIcon,
} from '@mui/icons-material';
import { useAuth } from '../../features/auth/AuthContext';

const BRAND_TAGLINE = 'Shared Opinions for Rapid Adoption';

interface ValueCard {
  icon: React.ReactElement;
  titleKey: string;
  descKey: string;
  accent: string;
}

export default function StakeholderHome() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation('stakeholderHome');
  const theme = useTheme();

  const cards: ValueCard[] = [
    {
      icon: <AlignIcon sx={{ fontSize: 36 }} />,
      titleKey: 'card.align.title',
      descKey: 'card.align.desc',
      accent: theme.palette.primary.main,
    },
    {
      icon: <VoteIcon sx={{ fontSize: 36 }} />,
      titleKey: 'card.vote.title',
      descKey: 'card.vote.desc',
      accent: theme.palette.secondary.main,
    },
    {
      icon: <ProductIcon sx={{ fontSize: 36 }} />,
      titleKey: 'card.products.title',
      descKey: 'card.products.desc',
      accent: '#00897b',
    },
    {
      icon: <ImpactIcon sx={{ fontSize: 36 }} />,
      titleKey: 'card.impact.title',
      descKey: 'card.impact.desc',
      accent: '#f57c00',
    },
  ];

  return (
    <Box>
      {/* ── Hero ── */}
      <Box
        sx={{
          borderRadius: { xs: 2, md: 3 },
          background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
          color: '#fff',
          px: { xs: 2.5, sm: 4, md: 6 },
          py: { xs: 4, sm: 5, md: 7 },
          mb: { xs: 3, md: 5 },
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative blobs */}
        <Box sx={{
          position: 'absolute', top: -60, right: -60,
          width: { xs: 160, md: 280 }, height: { xs: 160, md: 280 }, borderRadius: '50%',
          background: 'rgba(255,255,255,0.07)',
        }} />
        <Box sx={{
          position: 'absolute', bottom: -40, left: '40%',
          width: { xs: 100, md: 180 }, height: { xs: 100, md: 180 }, borderRadius: '50%',
          background: 'rgba(255,255,255,0.05)',
        }} />

        <Chip
          label="SORA"
          size="small"
          sx={{
            mb: 2,
            bgcolor: 'rgba(255,255,255,0.18)',
            color: '#fff',
            fontWeight: 700,
            letterSpacing: 2,
            fontSize: '0.7rem',
          }}
        />

        <Typography
          variant="h3"
          sx={{ fontWeight: 700, mb: 1, lineHeight: 1.2, maxWidth: 560, fontSize: { xs: '1.5rem', sm: '2rem', md: '3rem' } }}
        >
          {t('hero.greeting', { name: user?.name?.split(' ')[0] ?? '' })}
        </Typography>

        <Typography
          variant="h6"
          sx={{ opacity: 0.85, mb: 1, fontWeight: 400, maxWidth: 480, fontSize: { xs: '0.95rem', md: '1.25rem' } }}
        >
          {BRAND_TAGLINE}
        </Typography>

        <Typography
          variant="body1"
          sx={{ opacity: 0.75, mb: { xs: 3, md: 4 }, maxWidth: 520 }}
        >
          {t('hero.subtitle')}
        </Typography>

        <Button
          variant="contained"
          size="large"
          endIcon={<ArrowIcon />}
          onClick={() => navigate('/products')}
          sx={{
            bgcolor: '#fff',
            color: theme.palette.primary.main,
            fontWeight: 700,
            px: { xs: 3, md: 4 },
            py: 1.5,
            borderRadius: 2,
            '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' },
          }}
        >
          {t('hero.cta')}
        </Button>
      </Box>

      {/* ── Section title ── */}
      <Typography variant="overline" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
        {t('section.whyHere')}
      </Typography>
      <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>
        {t('section.yourRole')}
      </Typography>

      {/* ── Value cards ── */}
      <Grid container spacing={{ xs: 2, md: 3 }} sx={{ mb: { xs: 3, md: 5 } }}>
        {cards.map((card) => (
          <Grid item xs={12} sm={6} md={3} key={card.titleKey}>
            <Card
              elevation={0}
              sx={{
                height: '100%',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
                transition: 'box-shadow 0.2s, transform 0.2s',
                '&:hover': {
                  boxShadow: 4,
                  transform: 'translateY(-2px)',
                },
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box
                  sx={{
                    width: 56, height: 56, borderRadius: 2, mb: 2,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    bgcolor: `${card.accent}18`,
                    color: card.accent,
                  }}
                >
                  {card.icon}
                </Box>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  {t(card.titleKey)}
                </Typography>
                <Typography variant="body2" color="text.secondary" lineHeight={1.6}>
                  {t(card.descKey)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* ── Bottom CTA strip ── */}
      <Box
        sx={{
          borderRadius: 2,
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          px: { xs: 2.5, md: 4 },
          py: { xs: 2.5, md: 3 },
          display: 'flex',
          alignItems: { xs: 'stretch', sm: 'center' },
          justifyContent: 'space-between',
          gap: 2,
          flexDirection: { xs: 'column', sm: 'row' },
        }}
      >
        <Box>
          <Typography variant="subtitle1" fontWeight={600}>
            {t('cta.strip.title')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('cta.strip.desc')}
          </Typography>
        </Box>
        <Button
          variant="contained"
          endIcon={<ArrowIcon />}
          onClick={() => navigate('/products')}
          sx={{ whiteSpace: 'nowrap' }}
        >
          {t('cta.strip.button')}
        </Button>
      </Box>
    </Box>
  );
}
