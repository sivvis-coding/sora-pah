import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Typography,
  CircularProgress,
  Chip,
  Card,
  CardActionArea,
  CardContent,
  Divider,
} from '@mui/material';
import {
  Gavel as DecisionIcon,
  ThumbUpAlt as ThumbUpIcon,
  Inventory2Outlined as BacklogIcon,
  CheckCircleOutline as ImplementedIcon,
  CancelOutlined as DiscardedIcon,
} from '@mui/icons-material';
import { ideasApi, type Idea } from '../../ideas/api/ideas.api';

// ─── Status config ─────────────────────────────────────────────────────────────

type ClosedStatus = 'backlog' | 'implemented' | 'discarded';

const STATUS_COLOR: Record<ClosedStatus, 'warning' | 'info' | 'error'> = {
  backlog: 'warning',
  implemented: 'info',
  discarded: 'error',
};

const STATUS_ICON: Record<ClosedStatus, React.ReactElement> = {
  backlog: <BacklogIcon sx={{ fontSize: 14 }} />,
  implemented: <ImplementedIcon sx={{ fontSize: 14 }} />,
  discarded: <DiscardedIcon sx={{ fontSize: 14 }} />,
};

// ─── IdeaRow ───────────────────────────────────────────────────────────────────

function IdeaRow({ idea }: { idea: Idea }) {
  const navigate = useNavigate();
  const { t } = useTranslation('decisions');
  const status = idea.status as ClosedStatus;

  return (
    <Card
      elevation={0}
      sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, mb: 1.5 }}
    >
      <CardActionArea onClick={() => navigate(`/ideas/${idea.id}`)} sx={{ borderRadius: 2 }}>
        <CardContent sx={{ p: { xs: 2, md: 2.5 }, '&:last-child': { pb: { xs: 2, md: 2.5 } } }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
            {/* Status chip */}
            <Chip
              icon={STATUS_ICON[status]}
              label={t(`statusLabel.${status}`)}
              color={STATUS_COLOR[status]}
              size="small"
              sx={{ fontSize: '0.65rem', height: 22, flexShrink: 0, mt: 0.25 }}
            />

            {/* Content */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                variant="body2"
                fontWeight={700}
                sx={{
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  lineHeight: 1.4,
                  mb: 0.4,
                }}
              >
                {idea.title}
              </Typography>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                {/* Author */}
                {idea.author && (
                  <Typography variant="caption" color="text.disabled">
                    {t('by', { name: idea.author.name })}
                  </Typography>
                )}

                {/* Category */}
                {idea.category && (
                  <Chip
                    label={idea.category.name}
                    size="small"
                    variant="outlined"
                    sx={{
                      height: 18,
                      fontSize: '0.62rem',
                      ...(idea.category.color
                        ? { borderColor: idea.category.color, color: idea.category.color }
                        : {}),
                    }}
                  />
                )}

                {/* Votes */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                  <ThumbUpIcon sx={{ fontSize: 12, color: 'text.disabled' }} />
                  <Typography variant="caption" color="text.disabled">
                    {t('votes', { count: idea.voteCount })}
                  </Typography>
                </Box>
              </Box>

              {/* Discard reason */}
              {idea.status === 'discarded' && idea.discardReason && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mt: 0.5, display: 'block', fontStyle: 'italic' }}
                >
                  {t('discardReason', { reason: idea.discardReason })}
                </Typography>
              )}
            </Box>
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

// ─── Group section ─────────────────────────────────────────────────────────────

function IdeaGroup({ label, ideas }: { label: string; ideas: Idea[] }) {
  return (
    <Box sx={{ mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <Typography variant="subtitle2" fontWeight={700} color="text.secondary">
          {label}
        </Typography>
        <Chip
          label={ideas.length}
          size="small"
          sx={{ height: 18, fontSize: '0.65rem', bgcolor: 'action.selected' }}
        />
        <Divider sx={{ flex: 1 }} />
      </Box>
      {ideas.map((idea) => (
        <IdeaRow key={idea.id} idea={idea} />
      ))}
    </Box>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function DecisionsPage() {
  const { t } = useTranslation('decisions');

  const { data: ideas, isLoading } = useQuery<Idea[]>({
    queryKey: ['ideas', 'closed'],
    queryFn: ideasApi.listClosed,
  });

  // Group by decisionId — ideas without decisionId go to "ungrouped"
  const groups = useMemo(() => {
    if (!ideas) return [];

    const map = new Map<string | null, Idea[]>();
    for (const idea of ideas) {
      const key = idea.decisionId ?? null;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(idea);
    }

    // Named groups first (sorted by label), then ungrouped
    const named: { key: string; ideas: Idea[] }[] = [];
    let ungrouped: Idea[] = [];

    for (const [key, items] of map.entries()) {
      if (key === null) {
        ungrouped = items;
      } else {
        named.push({ key, ideas: items });
      }
    }

    named.sort((a, b) => a.key.localeCompare(b.key));

    return [
      ...named.map((g) => ({ label: g.key, ideas: g.ideas })),
      ...(ungrouped.length > 0 ? [{ label: t('ungrouped'), ideas: ungrouped }] : []),
    ];
  }, [ideas, t]);

  if (isLoading) {
    return <CircularProgress sx={{ display: 'block', mx: 'auto', mt: 8 }} />;
  }

  if (!ideas?.length) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '50vh',
          textAlign: 'center',
          px: 3,
        }}
      >
        <DecisionIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 2 }} />
        <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>
          {t('title')}
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 400, lineHeight: 1.7 }}>
          {t('empty')}
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: { xs: '100%', md: 800 }, mx: 'auto' }}>
      <Typography variant="h5" fontWeight={800} sx={{ mb: 0.5 }}>
        {t('title')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        {t('subtitle')}
      </Typography>

      {groups.map((group) => (
        <IdeaGroup key={group.label} label={group.label} ideas={group.ideas} />
      ))}
    </Box>
  );
}
