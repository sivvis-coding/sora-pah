import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Typography,
  Button,
  Chip,
  useTheme,
  useMediaQuery,
  Divider,
} from '@mui/material';
import {
  LightbulbOutlined as IdeaIcon,
  HowToVoteOutlined as VoteIcon,
  GavelOutlined as DecideIcon,
  BuildOutlined as BuildIcon,
  NotificationsNoneOutlined as InformedIcon,
  BlockOutlined as NotIcon,
  PersonOutlined as StakeholderIcon,
  WorkOutlineOutlined as ProductIcon,
  CheckCircleOutline as CheckIcon,
  Add as AddIcon,
  Home as HomeIcon,
  InfoOutlined as InfoIcon,
} from '@mui/icons-material';

// ─── Section label ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Typography
      component="span"
      sx={{
        display: 'inline-block',
        fontSize: '0.7rem',
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: '0.15em',
        color: 'primary.main',
        mb: 1.5,
      }}
    >
      {children}
    </Typography>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

interface SectionProps {
  children: React.ReactNode;
  divider?: boolean;
}

function Section({ children, divider = true }: SectionProps) {
  return (
    <>
      <Box component="section" sx={{ py: { xs: 4, md: 5 } }}>
        {children}
      </Box>
      {divider && <Divider />}
    </>
  );
}

// ─── 1. Hero ──────────────────────────────────────────────────────────────────

function HeroSection() {
  const { t } = useTranslation('about');

  return (
    <Box
      component="section"
      sx={{
        pt: { xs: 3, md: 4 },
        pb: { xs: 4, md: 5 },
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Chip
        icon={<InfoIcon sx={{ fontSize: '14px !important' }} />}
        label={t('hero.tag')}
        size="small"
        color="primary"
        variant="outlined"
        sx={{ mb: 2.5, fontWeight: 600, fontSize: '0.7rem' }}
      />

      <Typography
        variant="h3"
        fontWeight={900}
        sx={{
          fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
          letterSpacing: '-0.03em',
          lineHeight: 1.05,
          mb: 2,
        }}
      >
        {t('hero.headline')}
      </Typography>

      <Typography
        variant="h6"
        fontWeight={400}
        color="text.secondary"
        sx={{
          fontSize: { xs: '1.05rem', md: '1.2rem' },
          lineHeight: 1.5,
          maxWidth: 520,
        }}
      >
        {t('hero.body')}
      </Typography>
    </Box>
  );
}

// ─── 2. How it works — step flow ─────────────────────────────────────────────

const STEP_ICONS = [
  <IdeaIcon />,
  <VoteIcon />,
  <DecideIcon />,
  <BuildIcon />,
  <InformedIcon />,
];

const STEP_COLORS = [
  '#1565c0',
  '#0288d1',
  '#7c4dff',
  '#2e7d32',
  '#f57c00',
];

function FlowSection() {
  const { t } = useTranslation('about');
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  type FlowStep = { title: string; body: string };
  const steps: FlowStep[] = t('flow.steps', { returnObjects: true }) as FlowStep[];

  return (
    <Section>
      <SectionLabel>{t('flow.label')}</SectionLabel>
      <Typography
        variant="h5"
        fontWeight={800}
        sx={{ mb: { xs: 3, md: 4 }, letterSpacing: '-0.02em' }}
      >
        {t('flow.headline')}
      </Typography>

      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 0,
        }}
      >
        {steps.map((step, i) => (
          <Box
            key={i}
            sx={{
              display: 'flex',
              gap: { xs: 2, md: 3 },
              position: 'relative',
            }}
          >
            {/* Left: number + connector line */}
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                flexShrink: 0,
              }}
            >
              {/* Step circle */}
              <Box
                sx={{
                  width: { xs: 40, md: 48 },
                  height: { xs: 40, md: 48 },
                  borderRadius: '50%',
                  bgcolor: STEP_COLORS[i] + '18',
                  border: `2px solid ${STEP_COLORS[i]}30`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  color: STEP_COLORS[i],
                  zIndex: 1,
                  position: 'relative',
                }}
              >
                {React.cloneElement(STEP_ICONS[i], {
                  sx: { fontSize: { xs: 18, md: 22 } },
                })}
              </Box>

              {/* Connector line */}
              {i < steps.length - 1 && (
                <Box
                  sx={{
                    width: 2,
                    flex: 1,
                    minHeight: 24,
                    bgcolor: 'divider',
                    my: 0.5,
                  }}
                />
              )}
            </Box>

            {/* Right: content */}
            <Box
              sx={{
                pb: i < steps.length - 1 ? { xs: 2.5, md: 3 } : 0,
                pt: { xs: 0.5, md: 0.75 },
                flex: 1,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Typography
                  sx={{
                    fontSize: '0.65rem',
                    fontWeight: 800,
                    color: STEP_COLORS[i],
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                  }}
                >
                  {String(i + 1).padStart(2, '0')}
                </Typography>
                <Typography
                  variant="subtitle1"
                  fontWeight={800}
                  sx={{ lineHeight: 1.2 }}
                >
                  {step.title}
                </Typography>
              </Box>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ lineHeight: 1.65, maxWidth: 440 }}
              >
                {step.body}
              </Typography>
            </Box>
          </Box>
        ))}
      </Box>
    </Section>
  );
}

// ─── 3. What SORA is NOT ──────────────────────────────────────────────────────

function NotASection() {
  const { t } = useTranslation('about');

  type NotItem = { label: string; body: string };
  const items: NotItem[] = t('notA.items', { returnObjects: true }) as NotItem[];

  return (
    <Section>
      <SectionLabel>{t('notA.label')}</SectionLabel>
      <Typography
        variant="h5"
        fontWeight={800}
        sx={{ mb: { xs: 3, md: 4 }, letterSpacing: '-0.02em' }}
      >
        {t('notA.headline')}
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {items.map((item) => (
          <Box
            key={item.label}
            sx={{
              display: 'flex',
              gap: 2,
              alignItems: 'flex-start',
              p: { xs: 2, md: 2.5 },
              borderRadius: 2.5,
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
            }}
          >
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                bgcolor: 'error.50',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                mt: 0.1,
              }}
            >
              <NotIcon sx={{ fontSize: 16, color: 'error.main' }} />
            </Box>
            <Box>
              <Typography variant="body2" fontWeight={800} sx={{ mb: 0.25 }}>
                {item.label}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                {item.body}
              </Typography>
            </Box>
          </Box>
        ))}
      </Box>
    </Section>
  );
}

// ─── 4. Who it's for ─────────────────────────────────────────────────────────

interface RoleCardProps {
  icon: React.ReactNode;
  role: string;
  color: string;
  items: string[];
}

function RoleCard({ icon, role, color, items }: RoleCardProps) {
  return (
    <Box
      sx={{
        flex: 1,
        p: { xs: 2.5, md: 3 },
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        minWidth: { xs: '100%', sm: 220 },
      }}
    >
      <Box
        sx={{
          width: 44,
          height: 44,
          borderRadius: 2,
          bgcolor: color + '18',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 2,
          color,
        }}
      >
        {icon}
      </Box>
      <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 2 }}>
        {role}
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {items.map((item) => (
          <Box key={item} sx={{ display: 'flex', gap: 1.25, alignItems: 'flex-start' }}>
            <CheckIcon sx={{ fontSize: 16, color: color, mt: 0.15, flexShrink: 0 }} />
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5 }}>
              {item}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

function WhoForSection() {
  const { t } = useTranslation('about');

  const stakeholders: { role: string; items: string[] } = t('whoFor.stakeholders', {
    returnObjects: true,
  }) as { role: string; items: string[] };

  const product: { role: string; items: string[] } = t('whoFor.product', {
    returnObjects: true,
  }) as { role: string; items: string[] };

  return (
    <Section>
      <SectionLabel>{t('whoFor.label')}</SectionLabel>
      <Typography
        variant="h5"
        fontWeight={800}
        sx={{ mb: { xs: 3, md: 4 }, letterSpacing: '-0.02em' }}
      >
        {t('whoFor.headline')}
      </Typography>

      <Box
        sx={{
          display: 'flex',
          gap: 2,
          flexWrap: { xs: 'wrap', sm: 'nowrap' },
        }}
      >
        <RoleCard
          icon={<StakeholderIcon />}
          role={stakeholders.role}
          color="#1565c0"
          items={stakeholders.items}
        />
        <RoleCard
          icon={<ProductIcon />}
          role={product.role}
          color="#7c4dff"
          items={product.items}
        />
      </Box>
    </Section>
  );
}

// ─── 5. Trust section ─────────────────────────────────────────────────────────

function TrustSection() {
  const { t } = useTranslation('about');

  return (
    <Section>
      <Box
        sx={{
          background: 'linear-gradient(135deg, #0d47a1 0%, #1565c0 50%, #7c4dff 100%)',
          borderRadius: 4,
          p: { xs: 3, md: 4 },
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative circle */}
        <Box
          sx={{
            position: 'absolute',
            top: -40,
            right: -40,
            width: 160,
            height: 160,
            borderRadius: '50%',
            bgcolor: 'rgba(255,255,255,0.06)',
            pointerEvents: 'none',
          }}
        />

        <SectionLabel>
          <Box component="span" sx={{ color: 'rgba(255,255,255,0.55)' }}>
            {t('trust.label')}
          </Box>
        </SectionLabel>

        <Typography
          variant="h5"
          fontWeight={900}
          sx={{
            color: 'white',
            mb: 1.5,
            letterSpacing: '-0.02em',
            lineHeight: 1.2,
            fontSize: { xs: '1.4rem', md: '1.75rem' },
          }}
        >
          {t('trust.headline')}
        </Typography>

        <Typography
          variant="body1"
          sx={{
            color: 'rgba(255,255,255,0.75)',
            lineHeight: 1.65,
            maxWidth: 460,
            fontSize: { xs: '0.95rem', md: '1rem' },
          }}
        >
          {t('trust.body')}
        </Typography>
      </Box>
    </Section>
  );
}

// ─── 6. CTA ───────────────────────────────────────────────────────────────────

function CtaSection() {
  const { t } = useTranslation('about');
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Box
      component="section"
      sx={{
        py: { xs: 4, md: 5 },
        display: 'flex',
        gap: 1.5,
        flexDirection: { xs: 'column', sm: 'row' },
      }}
    >
      <Button
        variant="contained"
        size="large"
        startIcon={<AddIcon />}
        onClick={() => navigate('/ideas/new')}
        fullWidth={isMobile}
        sx={{
          borderRadius: 2.5,
          textTransform: 'none',
          fontWeight: 700,
          minHeight: 48,
          px: 3,
          boxShadow: 'none',
          '&:hover': { boxShadow: 'none' },
        }}
      >
        {t('cta.primary')}
      </Button>
      <Button
        variant="outlined"
        size="large"
        startIcon={<HomeIcon />}
        onClick={() => navigate('/')}
        fullWidth={isMobile}
        sx={{
          borderRadius: 2.5,
          textTransform: 'none',
          fontWeight: 600,
          minHeight: 48,
          px: 3,
        }}
      >
        {t('cta.secondary')}
      </Button>
    </Box>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AboutPage() {
  return (
    <Box
      sx={{
        maxWidth: 680,
        mx: 'auto',
        px: { xs: 0, sm: 1 },
      }}
    >
      <HeroSection />
      <FlowSection />
      <NotASection />
      <WhoForSection />
      <TrustSection />
      <CtaSection />
    </Box>
  );
}
