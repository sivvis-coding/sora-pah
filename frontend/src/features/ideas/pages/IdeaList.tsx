import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Typography,
  Box,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  CircularProgress,
  Alert,
  Avatar,
  Button,
  Fab,
  InputAdornment,
  Tab,
  Tabs,
  TextField,
  useMediaQuery,
  useTheme,
  Paper,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  ThumbUpAlt as ThumbUpIcon,
  ThumbUpOffAlt as ThumbUpOutlinedIcon,
  Search as SearchIcon,
  TrendingUp as TrendingIcon,
  Star as StarIcon,
  ChatBubbleOutline as CommentIcon,
  ViewList as AllIcon,
} from '@mui/icons-material';
import { ideasApi, type Idea, type IdeasListResponse } from '../api/ideas.api';
import { useAuth } from '../../auth/AuthContext';

// ─── Relative time utility ─────────────────────────────────────────────────────

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

// ─── Status colors ─────────────────────────────────────────────────────────────

const statusColor: Record<Idea['status'], 'success' | 'warning' | 'info'> = {
  open: 'success',
  in_review: 'warning',
  converted: 'info',
};

// ─── Trending logic ────────────────────────────────────────────────────────────

const TRENDING_DAYS = 14;

function getTrendingIds(ideas: Idea[]): Set<string> {
  const cutoff = Date.now() - TRENDING_DAYS * 24 * 60 * 60 * 1000;
  const trending = ideas
    .filter((i) => new Date(i.createdAt).getTime() >= cutoff && i.voteCount > 0)
    .sort((a, b) => b.voteCount - a.voteCount)
    .slice(0, 5);
  return new Set(trending.map((i) => i.id));
}

// ─── IdeaCard ──────────────────────────────────────────────────────────────────

interface IdeaCardProps {
  idea: Idea;
  isVoted: boolean;
  isTrending: boolean;
  onVote: () => void;
  onRemoveVote: () => void;
  isVoting: boolean;
  locale: string;
}

function IdeaCard({ idea, isVoted, isTrending, onVote, onRemoveVote, isVoting, locale }: IdeaCardProps) {
  const navigate = useNavigate();
  const { t } = useTranslation('ideas');
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const accentColor = isVoted
    ? theme.palette.primary.main
    : isTrending
      ? theme.palette.warning.main
      : 'transparent';

  return (
    <Card
      elevation={0}
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderLeft: `4px solid ${accentColor}`,
        borderRadius: 3,
        transition: 'box-shadow 0.2s ease, transform 0.2s ease',
        ...(isTrending && !isVoted && {
          bgcolor: theme.palette.mode === 'dark'
            ? 'rgba(255,167,38,0.04)'
            : 'rgba(255,167,38,0.025)',
        }),
        '&:hover': {
          boxShadow: theme.shadows[3],
          transform: 'translateY(-1px)',
        },
      }}
    >
      <CardActionArea
        onClick={() => navigate(`/ideas/${idea.id}`)}
        sx={{ p: 0, borderRadius: 3 }}
      >
        <CardContent sx={{ p: { xs: 2.5, md: 3 }, '&:last-child': { pb: { xs: 2.5, md: 3 } } }}>
          <Box sx={{ display: 'flex', gap: 2 }}>

            {/* ── Vote column (desktop) ──────────────────────────────────── */}
            {!isMobile && (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  minWidth: 48,
                  pt: 0.5,
                  gap: 0.25,
                }}
              >
                <Typography
                  variant="h5"
                  fontWeight={800}
                  lineHeight={1}
                  color={isVoted ? 'primary.main' : 'text.secondary'}
                >
                  {idea.voteCount}
                </Typography>
                <ThumbUpIcon
                  sx={{
                    fontSize: 15,
                    color: isVoted ? 'primary.main' : 'action.disabled',
                  }}
                />
              </Box>
            )}

            {/* ── Content ───────────────────────────────────────────────── */}
            <Box sx={{ flex: 1, minWidth: 0 }}>

              {/* Title row */}
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 0.75 }}>
                <Typography
                  variant="subtitle1"
                  fontWeight={700}
                  sx={{
                    flexGrow: 1,
                    lineHeight: 1.4,
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                  }}
                >
                  {idea.title}
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {isTrending && (
                    <Chip
                      icon={<TrendingIcon sx={{ fontSize: '0.75rem !important' }} />}
                      label={t('list.trending')}
                      size="small"
                      color="warning"
                      variant="outlined"
                      sx={{ fontSize: '0.65rem', height: 20, px: 0.25 }}
                    />
                  )}
                  <Chip
                    label={t(`status.${idea.status}`)}
                    color={statusColor[idea.status]}
                    size="small"
                    sx={{ height: 20, fontSize: '0.65rem' }}
                  />
                </Box>
              </Box>

              {/* Description */}
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  mb: 1.5,
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  lineHeight: 1.55,
                }}
              >
                {idea.description}
              </Typography>

              {/* Author */}
              {idea.author && (
                <Box sx={{ mb: 1.5 }}>
                  <Typography variant="caption" noWrap sx={{ lineHeight: 1 }}>
                    <Box component="span" sx={{ color: 'text.disabled' }}>
                      {t('list.sharedBy')}{' '}
                    </Box>
                    <Box component="span" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                      {idea.author.name}
                    </Box>
                    {idea.author.jobTitle && (
                      <Box component="span" sx={{ color: 'text.disabled' }}>
                        {' · '}{idea.author.jobTitle}
                      </Box>
                    )}
                  </Typography>
                </Box>
              )}

              {/* Bottom row */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                {/* Category */}
                {idea.category ? (
                  <Chip
                    label={idea.category.name}
                    size="small"
                    variant="outlined"
                    sx={{
                      height: 22,
                      fontSize: '0.7rem',
                      ...(idea.category.color
                        ? { borderColor: idea.category.color, color: idea.category.color }
                        : {}),
                    }}
                  />
                ) : (
                  <Chip
                    label={t('list.noCategory')}
                    size="small"
                    variant="outlined"
                    sx={{ height: 22, fontSize: '0.7rem', opacity: 0.45 }}
                  />
                )}

                {/* Comment count */}
                {idea.commentCount > 0 && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                    <CommentIcon sx={{ fontSize: 13, color: 'text.disabled' }} />
                    <Typography variant="caption" color="text.disabled" lineHeight={1}>
                      {idea.commentCount}
                    </Typography>
                  </Box>
                )}

                {/* Mobile: vote count inline */}
                {isMobile && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                    <ThumbUpIcon sx={{ fontSize: 13, color: isVoted ? 'primary.main' : 'action.disabled' }} />
                    <Typography variant="caption" fontWeight={700} color={isVoted ? 'primary' : 'text.secondary'} lineHeight={1}>
                      {idea.voteCount}
                    </Typography>
                  </Box>
                )}

                {/* Time — grows to push button right */}
                <Typography variant="caption" color="text.disabled" sx={{ flexGrow: 1 }}>
                  {timeAgo(idea.createdAt, locale)}
                </Typography>

                {/* Support button */}
                <Button
                  size="small"
                  variant={isVoted ? 'contained' : 'outlined'}
                  color="primary"
                  startIcon={isVoted
                    ? <ThumbUpIcon sx={{ fontSize: '0.9rem !important' }} />
                    : <ThumbUpOutlinedIcon sx={{ fontSize: '0.9rem !important' }} />
                  }
                  disabled={isVoting}
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    isVoted ? onRemoveVote() : onVote();
                  }}
                  sx={{
                    minHeight: { xs: 36, md: 30 },
                    minWidth: { xs: 36, md: 'auto' },
                    fontSize: '0.75rem',
                    textTransform: 'none',
                    borderRadius: 6,
                    px: { xs: 1.5, md: 1.75 },
                    flexShrink: 0,
                  }}
                >
                  {isVoted ? t('list.supported') : t('list.support')}
                </Button>
              </Box>
            </Box>
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

// ─── Trending sidebar item ─────────────────────────────────────────────────────

function TrendingItem({ idea, rank, onClick }: { idea: Idea; rank: number; onClick: () => void }) {
  const { t } = useTranslation('ideas');
  const theme = useTheme();
  return (
    <Box
      onClick={onClick}
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 1.5,
        py: 1.25,
        px: 1,
        borderRadius: 2,
        cursor: 'pointer',
        transition: 'background 0.15s',
        '&:hover': { bgcolor: 'action.hover' },
      }}
    >
      <Typography
        variant="body2"
        fontWeight={800}
        sx={{
          minWidth: 20,
          color: rank <= 2 ? 'warning.main' : 'text.disabled',
          lineHeight: 1.6,
        }}
      >
        {rank}
      </Typography>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant="body2"
          fontWeight={600}
          sx={{
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            lineHeight: 1.4,
            mb: 0.25,
          }}
        >
          {idea.title}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <ThumbUpIcon sx={{ fontSize: 11, color: 'text.disabled' }} />
          <Typography variant="caption" color="text.disabled">
            {idea.voteCount}
          </Typography>
          {idea.category && (
            <>
              <Typography variant="caption" color="text.disabled" sx={{ mx: 0.25 }}>·</Typography>
              <Typography
                variant="caption"
                noWrap
                sx={{
                  color: idea.category.color ?? 'text.disabled',
                  fontWeight: 500,
                }}
              >
                {idea.category.name}
              </Typography>
            </>
          )}
        </Box>
      </Box>
    </Box>
  );
}

// ─── Tab config ────────────────────────────────────────────────────────────────

type TabValue = 'all' | 'mostSupported' | 'trending';

function filterAndSort(ideas: Idea[], tab: TabValue, trendingIds: Set<string>): Idea[] {
  switch (tab) {
    case 'all':
      return [...ideas].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    case 'mostSupported':
      return [...ideas].sort((a, b) => b.voteCount - a.voteCount);
    case 'trending':
      return [...ideas]
        .filter((i) => trendingIds.has(i.id))
        .sort((a, b) => b.voteCount - a.voteCount);
  }
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function IdeaList() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation('ideas');
  const { t: tShared } = useTranslation('shared');
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));

  const [tab, setTab] = useState<TabValue>('all');
  const [search, setSearch] = useState('');
  const [showMine, setShowMine] = useState(false);

  const { data, isLoading, error } = useQuery<IdeasListResponse>({
    queryKey: ['ideas'],
    queryFn: ideasApi.list,
  });

  // ─── Vote mutations (optimistic) ─────────────────────────────────────────

  const voteMutation = useMutation({
    mutationFn: (ideaId: string) => ideasApi.vote(ideaId),
    onMutate: async (ideaId) => {
      await queryClient.cancelQueries({ queryKey: ['ideas'] });
      const prev = queryClient.getQueryData<IdeasListResponse>(['ideas']);
      if (prev) {
        queryClient.setQueryData<IdeasListResponse>(['ideas'], {
          ideas: prev.ideas.map((i) =>
            i.id === ideaId ? { ...i, voteCount: i.voteCount + 1 } : i,
          ),
          votedIdeaIds: [...prev.votedIdeaIds, ideaId],
        });
      }
      return { prev };
    },
    onError: (_err, _id, ctx) => { if (ctx?.prev) queryClient.setQueryData(['ideas'], ctx.prev); },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['ideas'] }),
  });

  const removeVoteMutation = useMutation({
    mutationFn: (ideaId: string) => ideasApi.removeVote(ideaId),
    onMutate: async (ideaId) => {
      await queryClient.cancelQueries({ queryKey: ['ideas'] });
      const prev = queryClient.getQueryData<IdeasListResponse>(['ideas']);
      if (prev) {
        queryClient.setQueryData<IdeasListResponse>(['ideas'], {
          ideas: prev.ideas.map((i) =>
            i.id === ideaId ? { ...i, voteCount: Math.max(0, i.voteCount - 1) } : i,
          ),
          votedIdeaIds: prev.votedIdeaIds.filter((id) => id !== ideaId),
        });
      }
      return { prev };
    },
    onError: (_err, _id, ctx) => { if (ctx?.prev) queryClient.setQueryData(['ideas'], ctx.prev); },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['ideas'] }),
  });

  // ─── Derived data ────────────────────────────────────────────────────────

  const votedSet = useMemo(() => new Set(data?.votedIdeaIds ?? []), [data?.votedIdeaIds]);

  const trendingIds = useMemo(
    () => (data ? getTrendingIds(data.ideas) : new Set<string>()),
    [data],
  );

  const trendingIdeas = useMemo(
    () => data
      ? data.ideas
          .filter((i) => trendingIds.has(i.id))
          .sort((a, b) => b.voteCount - a.voteCount)
      : [],
    [data, trendingIds],
  );

  const filteredIdeas = useMemo(() => {
    if (!data) return [];
    let ideas = data.ideas;
    if (showMine) ideas = ideas.filter((i) => i.createdBy === user?.id);
    if (search.trim()) {
      const q = search.toLowerCase();
      ideas = ideas.filter((i) =>
        i.title.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q),
      );
    }
    return filterAndSort(ideas, tab, trendingIds);
  }, [data, tab, search, showMine, user?.id, trendingIds]);

  // ─── Loading / error ──────────────────────────────────────────────────────

  if (isLoading) return <CircularProgress sx={{ mt: 6, display: 'block', mx: 'auto' }} />;
  if (error) return <Alert severity="error" sx={{ m: 2 }}>{tShared('common.error')}</Alert>;

  const isEmpty = data?.ideas.length === 0;

  // ─── Trending sidebar ─────────────────────────────────────────────────────

  const sidebar = isDesktop && trendingIdeas.length > 0 && (
    <Paper
      variant="outlined"
      sx={{
        width: 272,
        flexShrink: 0,
        p: 2,
        borderRadius: 3,
        position: 'sticky',
        top: 80,
        alignSelf: 'flex-start',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
        <TrendingIcon sx={{ fontSize: 17, color: 'warning.main' }} />
        <Typography variant="subtitle2" fontWeight={700}>
          {t('list.trending')}
        </Typography>
        <Typography variant="caption" color="text.disabled" sx={{ ml: 'auto' }}>
          {t('list.trendingDays', { days: TRENDING_DAYS })}
        </Typography>
      </Box>
      <Divider sx={{ mb: 1 }} />
      {trendingIdeas.map((idea, idx) => (
        <TrendingItem
          key={idea.id}
          idea={idea}
          rank={idx + 1}
          onClick={() => navigate(`/ideas/${idea.id}`)}
        />
      ))}
    </Paper>
  );

  return (
    <Box
      sx={{
        display: 'flex',
        gap: { lg: 4 },
        maxWidth: 1120,
        mx: 'auto',
        px: { xs: 0, sm: 1 },
      }}
    >
      {/* ── Main feed ──────────────────────────────────────────────────────── */}
      <Box sx={{ flex: 1, minWidth: 0 }}>

        {/* Header */}
        <Typography
          variant={isMobile ? 'h5' : 'h4'}
          fontWeight={800}
          sx={{ mb: { xs: 2, md: 3 } }}
        >
          {t('title')}
        </Typography>

        {isEmpty ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              {t('empty')}
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate('/ideas/new')}
              sx={{ mt: 2 }}
            >
              {t('create.fab')}
            </Button>
          </Box>
        ) : (
          <>
            {/* Filter bar */}
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center', mb: 2 }}>
              <TextField
                size="small"
                placeholder={t('list.search')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  flex: 1,
                  minWidth: 180,
                  '& .MuiOutlinedInput-root': { borderRadius: 2 },
                }}
              />
              <Chip
                label={t('list.all')}
                variant={!showMine ? 'filled' : 'outlined'}
                color={!showMine ? 'primary' : 'default'}
                onClick={() => setShowMine(false)}
                sx={{ minHeight: 32 }}
              />
              <Chip
                label={t('list.mine')}
                variant={showMine ? 'filled' : 'outlined'}
                color={showMine ? 'primary' : 'default'}
                onClick={() => setShowMine(true)}
                sx={{ minHeight: 32 }}
              />
            </Box>

            {/* Tabs */}
            <Tabs
              value={tab}
              onChange={(_e, v: TabValue) => setTab(v)}
              sx={{
                mb: 2.5,
                minHeight: 40,
                '& .MuiTab-root': { minHeight: 40, textTransform: 'none', fontWeight: 600 },
              }}
              variant={isMobile ? 'fullWidth' : 'standard'}
            >
              <Tab
                value="all"
                label={t('list.allTab')}
                icon={!isMobile ? <AllIcon sx={{ fontSize: 15 }} /> : undefined}
                iconPosition="start"
              />
              <Tab
                value="mostSupported"
                label={t('list.mostSupported')}
                icon={!isMobile ? <StarIcon sx={{ fontSize: 15 }} /> : undefined}
                iconPosition="start"
              />
              <Tab
                value="trending"
                label={t('list.trending')}
                icon={!isMobile ? <TrendingIcon sx={{ fontSize: 15 }} /> : undefined}
                iconPosition="start"
              />
            </Tabs>

            {/* Mobile trending pills — only when not on the Trending tab already */}
            {!isDesktop && tab !== 'trending' && trendingIdeas.length > 0 && (
              <Box sx={{ mb: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1 }}>
                  <TrendingIcon sx={{ fontSize: 14, color: 'warning.main' }} />
                  <Typography variant="caption" fontWeight={700} color="warning.main">
                    {t('list.trending')}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', pb: 0.5, mx: -0.5, px: 0.5 }}>
                  {trendingIdeas.slice(0, 4).map((idea) => (
                    <Chip
                      key={idea.id}
                      label={idea.title}
                      size="small"
                      variant="outlined"
                      color="warning"
                      onClick={() => navigate(`/ideas/${idea.id}`)}
                      sx={{ flexShrink: 0, maxWidth: 180, borderRadius: 2 }}
                    />
                  ))}
                </Box>
              </Box>
            )}

            {/* Feed */}
            {filteredIdeas.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <Typography color="text.secondary">
                  {tab === 'trending'
                    ? t('list.noTrending')
                    : showMine
                      ? t('list.emptyMine')
                      : t('list.noResults')}
                </Typography>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 1.5, md: 2 } }}>
                {filteredIdeas.map((idea) => (
                  <IdeaCard
                    key={idea.id}
                    idea={idea}
                    isVoted={votedSet.has(idea.id)}
                    isTrending={trendingIds.has(idea.id)}
                    onVote={() => voteMutation.mutate(idea.id)}
                    onRemoveVote={() => removeVoteMutation.mutate(idea.id)}
                    isVoting={voteMutation.isPending || removeVoteMutation.isPending}
                    locale={i18n.language}
                  />
                ))}
              </Box>
            )}
          </>
        )}

        {/* FAB */}
        <Fab
          color="primary"
          aria-label={t('create.fab')}
          sx={{ position: 'fixed', bottom: { xs: 20, md: 32 }, right: { xs: 20, md: 32 } }}
          onClick={() => navigate('/ideas/new')}
        >
          <AddIcon />
        </Fab>
      </Box>

      {/* Trending sidebar */}
      {sidebar}
    </Box>
  );
}
