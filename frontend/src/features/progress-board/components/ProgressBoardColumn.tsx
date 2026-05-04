import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Typography, Chip, Button, Divider } from '@mui/material';
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import type { ProgressCard as ProgressCardType, ProgressColumn, ProgressPriority } from '../api/progress-board.api';
import ProgressBoardCard, { PRIORITY_CONFIG } from './ProgressBoardCard';

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 5;

const COLUMN_CONFIG: Record<ProgressColumn, { headerBg: string; countColor: 'default' | 'primary' | 'success' }> = {
  planned:     { headerBg: 'rgba(99, 102, 241, 0.06)',  countColor: 'default' },
  in_progress: { headerBg: 'rgba(25, 118, 210, 0.06)',  countColor: 'primary' },
  done:        { headerBg: 'rgba(46, 125, 50, 0.06)',   countColor: 'success' },
};

const PRIORITY_ORDER: Array<ProgressPriority | null> = ['high', 'medium', 'low', null];

// ─── Priority group header ────────────────────────────────────────────────────

function PriorityGroupHeader({ priority, count }: { priority: ProgressPriority | null; count: number }) {
  const { t } = useTranslation('progressBoard');
  if (priority === null) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <Box sx={{ flex: 1, height: '1px', bgcolor: 'divider' }} />
        <Typography variant="caption" color="text.disabled" sx={{ fontWeight: 600, fontSize: '0.65rem', whiteSpace: 'nowrap' }}>
          {t('priority.none')} · {count}
        </Typography>
        <Box sx={{ flex: 1, height: '1px', bgcolor: 'divider' }} />
      </Box>
    );
  }
  const p = PRIORITY_CONFIG[priority];
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
      <Box sx={{ width: 3, height: 14, borderRadius: 1, bgcolor: p.color, flexShrink: 0 }} />
      <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.68rem', color: p.color }}>
          {t(`priority.${priority}`)}
        </Typography>
      <Box
        sx={{
          fontSize: '0.6rem',
          fontWeight: 700,
          px: 0.6,
          py: 0.1,
          borderRadius: 0.75,
          bgcolor: p.color + '18',
          color: p.color,
          lineHeight: 1.5,
        }}
      >
        {count}
      </Box>
      <Box sx={{ flex: 1, height: '1px', bgcolor: p.color + '30' }} />
    </Box>
  );
}

// ─── ProgressBoardColumn ─────────────────────────────────────────────────────

interface Props {
  column: ProgressColumn;
  cards: ProgressCardType[];
}

export default function ProgressBoardColumn({ column, cards }: Props) {
  const { t } = useTranslation('progressBoard');
  const config = COLUMN_CONFIG[column];
  const [visible, setVisible] = useState(PAGE_SIZE);

  const emptyKey = `empty_${column}` as const;

  // Group cards by priority in fixed order
  const groups = PRIORITY_ORDER
    .map((priority) => ({
      priority,
      cards: cards.filter((c) => c.priority === priority),
    }))
    .filter((g) => g.cards.length > 0);

  // Flat list respecting group order, for pagination
  const orderedCards = groups.flatMap((g) => g.cards);
  const visibleCards = orderedCards.slice(0, visible);
  const remaining = orderedCards.length - visible;
  const nextBatch = Math.min(PAGE_SIZE, remaining);

  // Build visible groups (only cards within visible slice)
  const visibleSet = new Set(visibleCards.map((c) => c.id));
  const visibleGroups = groups
    .map((g) => ({ ...g, cards: g.cards.filter((c) => visibleSet.has(c.id)) }))
    .filter((g) => g.cards.length > 0);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: '1 1 280px' }}>
      {/* Column header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          mb: 2,
          px: 1.5,
          py: 1,
          borderRadius: 2,
          bgcolor: config.headerBg,
        }}
      >
        <Typography variant="subtitle2" fontWeight={800} sx={{ flex: 1, letterSpacing: '-0.01em' }}>
          {t(`columns.${column}`)}
        </Typography>
        <Chip
          label={cards.length}
          size="small"
          color={config.countColor}
          variant={cards.length === 0 ? 'outlined' : 'filled'}
          sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700, minWidth: 28 }}
        />
      </Box>

      {/* Subtitle */}
      <Typography
        variant="caption"
        color="text.disabled"
        sx={{ px: 0.5, mb: 2, display: 'block', lineHeight: 1.4 }}
      >
        {t(`columnSubtitle.${column}`)}
      </Typography>

      {/* Empty state */}
      {cards.length === 0 ? (
        <Box
          sx={{
            px: 1.5,
            py: 3,
            textAlign: 'center',
            border: '1px dashed',
            borderColor: 'divider',
            borderRadius: 2,
          }}
        >
          <Typography variant="body2" color="text.disabled">
            {t(emptyKey)}
          </Typography>
        </Box>
      ) : (
        <>
          {/* Groups */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {visibleGroups.map(({ priority, cards: groupCards }) => (
              <Box key={priority ?? 'none'}>
                {/* Only show group header if there are multiple priority groups */}
                {groups.length > 1 && (
                  <PriorityGroupHeader priority={priority} count={groupCards.length} />
                )}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {groupCards.map((card) => (
                    <ProgressBoardCard key={card.id} card={card} />
                  ))}
                </Box>
              </Box>
            ))}
          </Box>

          {/* Show more */}
          {remaining > 0 && (
            <Button
              size="small"
              fullWidth
              endIcon={<ExpandMoreIcon />}
              onClick={() => setVisible((v) => v + PAGE_SIZE)}
              sx={{
                mt: 1.5,
                textTransform: 'none',
                color: 'text.secondary',
                fontSize: '0.75rem',
                borderRadius: 2,
                border: '1px dashed',
                borderColor: 'divider',
                py: 0.75,
                '&:hover': { borderColor: 'text.disabled', bgcolor: 'action.hover' },
              }}
            >
              {t('showMore', { count: nextBatch, total: remaining })}
            </Button>
          )}

          {/* Shown X of Y when paginated */}
          {visible < orderedCards.length + PAGE_SIZE && visible > PAGE_SIZE && (
            <Typography
              variant="caption"
              color="text.disabled"
              sx={{ textAlign: 'center', mt: 0.75, display: 'block' }}
            >
              {t('showing', { visible: Math.min(visible, orderedCards.length), total: orderedCards.length })}
            </Typography>
          )}
        </>
      )}
    </Box>
  );
}
