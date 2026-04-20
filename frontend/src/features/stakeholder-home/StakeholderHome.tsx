import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Typography,
  Chip,
  CircularProgress,
  Button,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Lightbulb as IdeaIcon,
  Gavel as DecisionIcon,
  Construction as WorkIcon,
  ArrowForward as ArrowIcon,
  Add as AddIcon,
  Circle as DotIcon,
} from '@mui/icons-material';
import { ideasApi, type Idea, type IdeasListResponse } from '../ideas/api/ideas.api';
import { decisionsApi, type Decision } from '../decisions/api/decisions.api';
import { narrativesApi, type ClickupTask } from '../narratives/api/narratives.api';
import { useAuth } from '../auth/AuthContext';

const STATUS_COLORS: Record<string, string> = {
  pending: '#ff9800',
  'ready to be done': '#ff9800',
  'in development': '#2196f3',
  'in progress': '#2196f3',
  done: '#4caf50',
  complete: '#4caf50',
};

export default function StakeholderHome() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation('stakeholderHome');
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const { data: ideasData, isLoading: ideasLoading } = useQuery<IdeasListResponse>({
    queryKey: ['ideas'],
    queryFn: ideasApi.list,
  });

  const { data: decisions, isLoading: decisionsLoading } = useQuery<Decision[]>({
    queryKey: ['decisions'],
    queryFn: decisionsApi.list,
  });

  const { data: workInProgress, isLoading: wipLoading } = useQuery<ClickupTask[]>({
    queryKey: ['work-in-progress'],
    queryFn: narrativesApi.getWorkInProgress,
  });

  const ideas = ideasData?.ideas ?? [];
  const recentIdeas = [...ideas]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 3);
  const recentDecisions = (decisions ?? []).slice(0, 3);
  const activeTasks = (workInProgress ?? []).slice(0, 6);

  const firstName = user?.name?.split(' ')[0] ?? '';
  const isLoading = ideasLoading && decisionsLoading && wipLoading;

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

      {/* ── Section: Work in Progress (ClickUp) ── */}
      {activeTasks.length > 0 && (
        <FeedSection
          icon={<WorkIcon sx={{ fontSize: 16, color: 'info.main' }} />}
          title={t('sections.workInProgress')}
          onSeeAll={() => navigate('/narratives')}
          seeAllLabel={t('sections.seeAll')}
        >
          {activeTasks.map((task) => (
            <Box
              key={task.id}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.25,
                py: 1.25,
              }}
            >
              <DotIcon
                sx={{
                  fontSize: 8,
                  color: STATUS_COLORS[task.status.toLowerCase()] ?? '#9e9e9e',
                  flexShrink: 0,
                }}
              />
              <Typography
                variant="body2"
                sx={{
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {task.name}
              </Typography>
              <Chip
                size="small"
                label={task.status}
                sx={{
                  fontSize: '0.6rem',
                  height: 18,
                  fontWeight: 600,
                  bgcolor: (STATUS_COLORS[task.status.toLowerCase()] ?? '#9e9e9e') + '18',
                  color: STATUS_COLORS[task.status.toLowerCase()] ?? '#9e9e9e',
                }}
              />
            </Box>
          ))}
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
          onClick={() => navigate('/narratives')}
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
