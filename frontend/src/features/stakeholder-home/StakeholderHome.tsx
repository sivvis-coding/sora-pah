import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Typography,
  Chip,
  CircularProgress,
  Button,
  Avatar,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Lightbulb as IdeaIcon,
  TrendingUp as TrendingIcon,
  ArrowForward as ArrowIcon,
  Add as AddIcon,
  ThumbUp as ThumbUpIcon,
} from '@mui/icons-material';
import { ideasApi, type Idea, type IdeasListResponse } from '../ideas/api/ideas.api';
import { useAuth } from '../auth/AuthContext';

const TRENDING_DAYS = 14;
const FEED_PAGE_SIZE = 8;

function timeAgo(dateString: string, locale: string): string {
  const now = Date.now();
  const past = new Date(dateString).getTime();
  const diffMs = now - past;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  try {
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
    if (diffDay > 30) return rtf.format(-Math.floor(diffDay / 30), 'month');
    if (diffDay > 0) return rtf.format(-diffDay, 'day');
    if (diffHr > 0) return rtf.format(-diffHr, 'hour');
    if (diffMin > 0) return rtf.format(-diffMin, 'minute');
    return rtf.format(-diffSec, 'second');
  } catch {
    if (diffDay > 0) return `${diffDay}d ago`;
    if (diffHr > 0) return `${diffHr}h ago`;
    return `${diffMin}m ago`;
  }
}

export default function StakeholderHome() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, i18n } = useTranslation('stakeholderHome');
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [feedLimit, setFeedLimit] = useState(FEED_PAGE_SIZE);

  const { data, isLoading } = useQuery<IdeasListResponse>({
    queryKey: ['ideas'],
    queryFn: ideasApi.list,
  });

  const ideas = data?.ideas ?? [];

  // ─── Derived data ─────────────────────────────────────────────────────
  const { trending, recentFeed, stats } = useMemo(() => {
    const now = Date.now();
    const cutoff = now - TRENDING_DAYS * 24 * 60 * 60 * 1000;
    const weekCutoff = now - 7 * 24 * 60 * 60 * 1000;

    // Trending: top 3 by voteCount among recent ideas
    const trendingItems = [...ideas]
      .filter((i) => new Date(i.createdAt).getTime() > cutoff && i.voteCount > 0)
      .sort((a, b) => b.voteCount - a.voteCount)
      .slice(0, 3);

    // Recent feed: all ideas sorted by newest first
    const recentItems = [...ideas]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Pulse stats
    const ideasThisWeek = ideas.filter(
      (i) => new Date(i.createdAt).getTime() > weekCutoff,
    ).length;
    const totalSupporters = ideas.reduce((sum, i) => sum + i.voteCount, 0);

    return {
      trending: trendingItems,
      recentFeed: recentItems,
      stats: { ideasThisWeek, totalSupporters, totalIdeas: ideas.length },
    };
  }, [ideas]);

  const visibleFeed = recentFeed.slice(0, feedLimit);
  const hasMore = feedLimit < recentFeed.length;
  const firstName = user?.name?.split(' ')[0] ?? '';

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
          mb: 1,
        }}
      >
        {t('greeting', { name: firstName })}
      </Typography>

      {/* ── Pulse stats ── */}
      <Box
        sx={{
          display: 'flex',
          gap: 1,
          flexWrap: 'wrap',
          mb: 4,
        }}
      >
        <Chip
          size="small"
          icon={<IdeaIcon sx={{ fontSize: '14px !important' }} />}
          label={t('pulse.ideasThisWeek', { count: stats.ideasThisWeek })}
          sx={{
            fontWeight: 600,
            fontSize: '0.75rem',
            bgcolor: 'primary.50',
            color: 'primary.main',
            border: '1px solid',
            borderColor: 'primary.100',
            '& .MuiChip-icon': { color: 'primary.main' },
          }}
        />
        <Chip
          size="small"
          icon={<ThumbUpIcon sx={{ fontSize: '13px !important' }} />}
          label={t('pulse.totalSupporters', { count: stats.totalSupporters })}
          sx={{
            fontWeight: 600,
            fontSize: '0.75rem',
            bgcolor: 'action.hover',
            border: '1px solid',
            borderColor: 'divider',
          }}
        />
        <Chip
          size="small"
          label={t('pulse.totalIdeas', { count: stats.totalIdeas })}
          sx={{
            fontWeight: 600,
            fontSize: '0.75rem',
            bgcolor: 'action.hover',
            border: '1px solid',
            borderColor: 'divider',
          }}
        />
      </Box>

      {/* ── Trending this week ── */}
      {trending.length > 0 && (
        <Box sx={{ mb: 5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 2 }}>
            <TrendingIcon sx={{ fontSize: 18, color: 'warning.main' }} />
            <Typography
              sx={{
                fontSize: '0.65rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                color: 'text.disabled',
              }}
            >
              {t('trending.title')}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {trending.map((idea, idx) => (
              <Box
                key={idea.id}
                onClick={() => navigate(`/ideas/${idea.id}`)}
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 1.75,
                  py: 1.75,
                  borderTop: idx === 0 ? 'none' : '1px solid',
                  borderColor: 'divider',
                  cursor: 'pointer',
                  borderRadius: 1,
                  '&:hover': { bgcolor: 'action.hover' },
                  transition: 'background-color 0.1s',
                }}
              >
                {/* Rank number */}
                <Typography
                  sx={{
                    fontWeight: 800,
                    fontSize: '1.1rem',
                    color: 'warning.main',
                    minWidth: 24,
                    textAlign: 'center',
                    lineHeight: 1.4,
                    mt: 0.25,
                  }}
                >
                  {idx + 1}
                </Typography>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    variant="body1"
                    sx={{
                      fontWeight: 600,
                      lineHeight: 1.4,
                      mb: 0.5,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                    }}
                  >
                    {idea.title}
                  </Typography>
                  <Typography variant="caption" color="text.disabled">
                    {idea.author?.name && (
                      <Box component="span" sx={{ color: 'text.secondary' }}>
                        {idea.author.name}
                      </Box>
                    )}
                    {' · '}
                    {t('trending.supporters', { count: idea.voteCount })}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {/* ── Recent activity feed ── */}
      <Box sx={{ mb: 4 }}>
        <Typography
          sx={{
            fontSize: '0.65rem',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            color: 'text.disabled',
            mb: 2,
          }}
        >
          {t('recent.title')}
        </Typography>

        {visibleFeed.length === 0 ? (
          <Typography variant="body2" color="text.disabled" sx={{ fontStyle: 'italic', py: 4 }}>
            {t('recent.empty')}
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            {visibleFeed.map((idea, idx) => (
              <FeedItem
                key={idea.id}
                idea={idea}
                locale={i18n.language}
                t={t}
                isFirst={idx === 0}
                onClick={() => navigate(`/ideas/${idea.id}`)}
              />
            ))}
          </Box>
        )}

        {hasMore && (
          <Button
            onClick={() => setFeedLimit((prev) => prev + FEED_PAGE_SIZE)}
            size="small"
            sx={{
              mt: 2,
              textTransform: 'none',
              color: 'text.secondary',
              fontWeight: 600,
              display: 'block',
              mx: 'auto',
            }}
          >
            {t('recent.showMore')}
          </Button>
        )}
      </Box>

      {/* ── CTA strip ── */}
      <Box
        sx={{
          display: 'flex',
          gap: 1.5,
          flexDirection: { xs: 'column', sm: 'row' },
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
          onClick={() => navigate('/ideas')}
          fullWidth={isMobile}
          sx={{
            borderRadius: 2.5,
            textTransform: 'none',
            fontWeight: 600,
            minHeight: 44,
            px: 3,
          }}
        >
          {t('cta.exploreIdeas')}
        </Button>
      </Box>
    </Box>
  );
}

// ─── Feed item component ──────────────────────────────────────────────────────

interface FeedItemProps {
  idea: Idea;
  locale: string;
  t: (key: string, opts?: Record<string, unknown>) => string;
  isFirst: boolean;
  onClick: () => void;
}

function FeedItem({ idea, locale, t, isFirst, onClick }: FeedItemProps) {
  const isPopular = idea.voteCount >= 3;
  const authorInitial = idea.author?.name?.charAt(0)?.toUpperCase() ?? '?';

  return (
    <Box
      onClick={onClick}
      sx={{
        display: 'flex',
        gap: 1.75,
        py: 2.25,
        borderTop: isFirst ? 'none' : '1px solid',
        borderColor: 'divider',
        cursor: 'pointer',
        borderRadius: 1,
        '&:hover': { bgcolor: 'action.hover' },
        transition: 'background-color 0.1s',
      }}
    >
      {/* Avatar or icon */}
      <Avatar
        src={
          idea.author?.photoBase64
            ? `data:image/jpeg;base64,${idea.author.photoBase64}`
            : undefined
        }
        sx={{
          width: 36,
          height: 36,
          fontSize: '0.85rem',
          mt: 0.25,
          flexShrink: 0,
          bgcolor: isPopular ? 'primary.main' : undefined,
        }}
      >
        {isPopular ? <ThumbUpIcon sx={{ fontSize: 16 }} /> : authorInitial}
      </Avatar>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        {/* Activity line */}
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.4, mb: 0.5 }}>
          {isPopular ? (
            <>
              <Box component="span" sx={{ fontWeight: 600, color: 'text.primary' }}>
                {idea.title}
              </Box>
              {' '}
              {t('recent.popularIdea')}
              {' · '}
              {t('trending.supporters', { count: idea.voteCount })}
            </>
          ) : (
            <>
              <Box component="span" sx={{ fontWeight: 600, color: 'text.primary' }}>
                {idea.author?.name ?? '?'}
              </Box>
              {' '}
              {t('recent.newIdea')}
            </>
          )}
        </Typography>

        {/* Idea title (for non-popular) or description snippet */}
        {!isPopular && (
          <Typography
            variant="body2"
            sx={{
              fontWeight: 600,
              lineHeight: 1.4,
              mb: 0.5,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {idea.title}
          </Typography>
        )}

        {/* Meta */}
        <Typography variant="caption" color="text.disabled">
          {!isPopular && idea.author?.jobTitle && (
            <>{idea.author.jobTitle}{' · '}</>
          )}
          {timeAgo(idea.createdAt, locale)}
          {idea.category && (
            <>{' · '}{idea.category.name}</>
          )}
        </Typography>
      </Box>
    </Box>
  );
}
