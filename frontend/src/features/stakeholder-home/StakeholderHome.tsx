import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Typography,
  CircularProgress,
  Button,
  useTheme,
  useMediaQuery,
  Paper,
  Collapse,
  IconButton,
} from '@mui/material';
import {
  Lightbulb as IdeaIcon,
  Gavel as DecisionIcon,
  Construction as WorkIcon,
  ArrowForward as ArrowIcon,
  Add as AddIcon,
  EmojiObjects as FirstIdeaIcon,
  Close as CloseIcon,
  InfoOutlined as AboutIcon,
} from '@mui/icons-material';
import { ideasApi, type Idea, type IdeasListResponse } from '../ideas/api/ideas.api';
import { decisionsApi, type Decision } from '../decisions/api/decisions.api';
import { progressBoardApi, type ProgressBoard } from '../progress-board/api/progress-board.api';
import { PRIORITY_CONFIG } from '../progress-board/components/ProgressBoardCard';
import { useAuth } from '../auth/AuthContext';

const ABOUT_BANNER_KEY = 'sora_about_banner_dismissed';

// ─── Empty home state ─────────────────────────────────────────────────────────

function EmptyHomeState({ onShareIdea }: { onShareIdea: () => void }) {
  const { t } = useTranslation('stakeholderHome');

  return (
    <Paper
      variant="outlined"
      sx={{
        borderRadius: 3,
        p: { xs: 3, sm: 4 },
        textAlign: 'center',
        borderStyle: 'dashed',
        my: 2,
      }}
    >
      <Box
        sx={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          bgcolor: 'primary.50',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mx: 'auto',
          mb: 2.5,
        }}
      >
        <FirstIdeaIcon sx={{ fontSize: 32, color: 'primary.main' }} />
      </Box>

      <Typography variant="h6" fontWeight={800} sx={{ mb: 1 }}>
        {t('emptyState.headline')}
      </Typography>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ mb: 3, maxWidth: 360, mx: 'auto', lineHeight: 1.65 }}
      >
        {t('emptyState.subheadline')}
      </Typography>
      <Button
        variant="contained"
        size="large"
        startIcon={<AddIcon />}
        onClick={onShareIdea}
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
        {t('emptyState.cta')}
      </Button>
    </Paper>
  );
}

export default function StakeholderHome() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation('stakeholderHome');
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [bannerVisible, setBannerVisible] = useState(
    () => localStorage.getItem(ABOUT_BANNER_KEY) !== 'true',
  );

  const handleDismissBanner = () => {
    localStorage.setItem(ABOUT_BANNER_KEY, 'true');
    setBannerVisible(false);
  };

  const { data: ideasData, isLoading: ideasLoading } = useQuery<IdeasListResponse>({
    queryKey: ['ideas'],
    queryFn: ideasApi.list,
  });

  const { data: decisions, isLoading: decisionsLoading } = useQuery<Decision[]>({
    queryKey: ['decisions'],
    queryFn: decisionsApi.list,
  });

  const { data: board, isLoading: wipLoading } = useQuery<ProgressBoard>({
    queryKey: ['progress-board'],
    queryFn: progressBoardApi.getBoard,
    staleTime: 5 * 60 * 1000,
  });

  const ideas = ideasData?.ideas ?? [];
  const recentIdeas = [...ideas]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 3);
  const recentDecisions = (decisions ?? []).slice(0, 3);
  const activeTasks = (board?.in_progress ?? []).slice(0, 5);

  const firstName = user?.name?.split(' ')[0] ?? '';
  const isLoading = ideasLoading && decisionsLoading && wipLoading;
  const isAllEmpty = recentIdeas.length === 0 && recentDecisions.length === 0 && activeTasks.length === 0;

  if (isLoading) {
    return <CircularProgress sx={{ display: 'block', mx: 'auto', mt: 8 }} />;
  }

  return (
    <Box sx={{ maxWidth: { xs: '100%', md: 720 }, mx: 'auto' }}>
      {/* ── Greeting ── */}
      <Typography
        sx={{
          fontSize: { xs: '1.5rem', sm: '1.75rem' },
          fontWeight: 800,
          letterSpacing: '-0.01em',
          lineHeight: 1.2,
          mb: 0.5,
        }}
      >
        {t('greeting', { name: firstName })}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        {t('subtitle')}
      </Typography>

      {/* ── About SORA banner (dismissable) ── */}
      <Collapse in={bannerVisible} unmountOnExit>
        <Paper
          variant="outlined"
          sx={{
            borderRadius: 2.5,
            p: { xs: 2, sm: 2.5 },
            mb: 3,
            display: 'flex',
            gap: 2,
            alignItems: 'flex-start',
            borderColor: 'primary.light',
            bgcolor: 'rgba(25, 118, 210, 0.03)',
          }}
        >
          <AboutIcon sx={{ color: 'primary.main', mt: 0.2, flexShrink: 0 }} />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body2" fontWeight={700} sx={{ mb: 0.5 }}>
              {t('aboutBanner.headline')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6, mb: 1.5 }}>
              {t('aboutBanner.body')}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button
                size="small"
                variant="contained"
                onClick={() => navigate('/about')}
                sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2, boxShadow: 'none' }}
              >
                {t('aboutBanner.cta')}
              </Button>
              <Button
                size="small"
                color="inherit"
                onClick={handleDismissBanner}
                sx={{ textTransform: 'none', opacity: 0.6 }}
              >
                {t('aboutBanner.dismiss')}
              </Button>
            </Box>
          </Box>
          <IconButton
            size="small"
            onClick={handleDismissBanner}
            sx={{ flexShrink: 0, mt: -0.5, mr: -0.5, opacity: 0.4, '&:hover': { opacity: 1 } }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Paper>
      </Collapse>

      {/* ── Empty home state ── */}
      {isAllEmpty && (
        <EmptyHomeState onShareIdea={() => navigate('/ideas/new')} />
      )}

      {/* ── Section: Work in Progress (ClickUp) ── */}
      {activeTasks.length > 0 && (
        <FeedSection
          icon={<WorkIcon sx={{ fontSize: 16, color: 'info.main' }} />}
          title={t('sections.workInProgress')}
          onSeeAll={() => navigate('/progress')}
          seeAllLabel={t('sections.seeAll')}
        >
          {activeTasks.map((task) => {
            const p = task.priority ? PRIORITY_CONFIG[task.priority] : null;
            return (
              <Box
                key={task.id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.25,
                  py: 1,
                  borderRadius: 1.5,
                  px: 1,
                  mx: -1,
                  transition: 'background-color 0.1s',
                  '&:hover': { bgcolor: 'action.hover' },
                }}
              >
                {/* Pulsing dot for in_progress */}
                <Box
                  sx={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    bgcolor: '#1976d2',
                    flexShrink: 0,
                    animation: 'pulse 2s infinite',
                    '@keyframes pulse': {
                      '0%':   { boxShadow: '0 0 0 0 #1976d280' },
                      '70%':  { boxShadow: '0 0 0 5px transparent' },
                      '100%': { boxShadow: '0 0 0 0 transparent' },
                    },
                  }}
                />
                <Typography
                  variant="body2"
                  sx={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                >
                  {task.title}
                </Typography>
                {p && (
                  <Box
                    component="span"
                    sx={{
                      flexShrink: 0,
                      fontSize: '0.6rem',
                      fontWeight: 800,
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                      px: 0.75,
                      py: 0.2,
                      borderRadius: 0.75,
                      bgcolor: p.color + '18',
                      color: p.color,
                      border: `1px solid ${p.border}`,
                      lineHeight: 1.5,
                    }}
                  >
                    {t(`priority.${task.priority}`, { ns: 'progressBoard' })}
                  </Box>
                )}
              </Box>
            );
          })}
        </FeedSection>
      )}

      {/* ── Section: Recent Decisions ── */}
      {recentDecisions.length > 0 && (
        <FeedSection
          icon={<DecisionIcon sx={{ fontSize: 16, color: 'warning.main' }} />}
          title={t('sections.decisions')}
          onSeeAll={() => navigate('/decisions')}
          seeAllLabel={t('sections.seeAll')}
        >
          {recentDecisions.map((decision) => (
            <Box key={decision.id} sx={{ py: 1.25 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.4 }}>
                {decision.title}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 1,
                  WebkitBoxOrient: 'vertical',
                }}
              >
                {decision.rationale}
              </Typography>
            </Box>
          ))}
        </FeedSection>
      )}

      {/* ── Section: New Ideas ── */}
      {recentIdeas.length > 0 && (
        <FeedSection
          icon={<IdeaIcon sx={{ fontSize: 16, color: 'primary.main' }} />}
          title={t('sections.newIdeas')}
          onSeeAll={() => navigate('/ideas')}
          seeAllLabel={t('sections.seeAll')}
        >
          {recentIdeas.map((idea) => (
            <Box
              key={idea.id}
              onClick={() => navigate(`/ideas/${idea.id}`)}
              sx={{
                py: 1.25,
                cursor: 'pointer',
                '&:hover': { bgcolor: 'action.hover' },
                borderRadius: 1,
                transition: 'background-color 0.1s',
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.4 }}>
                {idea.title}
              </Typography>
              <Typography variant="caption" color="text.disabled">
                {idea.author?.name}
              </Typography>
            </Box>
          ))}
        </FeedSection>
      )}

      {/* ── CTA ── */}
      <Box
        sx={{
          display: 'flex',
          gap: 1.5,
          flexDirection: { xs: 'column', sm: 'row' },
          mt: 4,
        }}
      >
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/ideas/new')}
          fullWidth={isMobile}
          sx={{
            borderRadius: 2.5,
            textTransform: 'none',
            fontWeight: 700,
            minHeight: 44,
            px: 3,
            boxShadow: 'none',
            '&:hover': { boxShadow: 'none' },
          }}
        >
          {t('cta.shareIdea')}
        </Button>
        <Button
          variant="outlined"
          endIcon={<ArrowIcon />}
          onClick={() => navigate('/progress')}
          fullWidth={isMobile}
          sx={{
            borderRadius: 2.5,
            textTransform: 'none',
            fontWeight: 600,
            minHeight: 44,
            px: 3,
          }}
        >
          {t('cta.seeWhatsBeingBuilt')}
        </Button>
      </Box>
    </Box>
  );
}

// ─── Feed Section component ─────────────────────────────────────────────────

interface FeedSectionProps {
  icon: React.ReactNode;
  title: string;
  onSeeAll: () => void;
  seeAllLabel: string;
  children: React.ReactNode;
}

function FeedSection({ icon, title, onSeeAll, seeAllLabel, children }: FeedSectionProps) {
  return (
    <Box sx={{ mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1.5 }}>
        {icon}
        <Typography
          sx={{
            fontSize: '0.65rem',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            color: 'text.disabled',
            flex: 1,
          }}
        >
          {title}
        </Typography>
        <Button
          size="small"
          onClick={onSeeAll}
          endIcon={<ArrowIcon sx={{ fontSize: '12px !important' }} />}
          sx={{
            textTransform: 'none',
            fontSize: '0.7rem',
            fontWeight: 600,
            color: 'text.secondary',
            minWidth: 'auto',
          }}
        >
          {seeAllLabel}
        </Button>
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
        {children}
      </Box>
    </Box>
  );
}
