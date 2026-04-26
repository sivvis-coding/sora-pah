import React from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Typography, Chip } from '@mui/material';
import type { ProgressCard as ProgressCardType, ProgressColumn } from '../api/progress-board.api';
import ProgressBoardCard from './ProgressBoardCard';

// ─── Column header config ─────────────────────────────────────────────────────

const COLUMN_CONFIG: Record<
  ProgressColumn,
  { headerBg: string; countColor: string }
> = {
  planned: {
    headerBg: 'transparent',
    countColor: 'default',
  },
  in_progress: {
    headerBg: 'rgba(25, 118, 210, 0.06)',
    countColor: 'primary',
  },
  done: {
    headerBg: 'rgba(46, 125, 50, 0.06)',
    countColor: 'success',
  },
};

// ─── ProgressBoardColumn ─────────────────────────────────────────────────────

interface Props {
  column: ProgressColumn;
  cards: ProgressCardType[];
}

export default function ProgressBoardColumn({ column, cards }: Props) {
  const { t } = useTranslation('progressBoard');
  const config = COLUMN_CONFIG[column];
  const emptyKey = `empty_${column}` as const;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        flex: '1 1 280px',
      }}
    >
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
          color={config.countColor as 'default' | 'primary' | 'success'}
          variant={cards.length === 0 ? 'outlined' : 'filled'}
          sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700, minWidth: 28 }}
        />
      </Box>

      {/* Subtitle */}
      <Typography
        variant="caption"
        color="text.disabled"
        sx={{ px: 1.5, mb: 2, display: 'block', lineHeight: 1.4 }}
      >
        {t(`columnSubtitle.${column}`)}
      </Typography>

      {/* Cards */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
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
          cards.map((card) => <ProgressBoardCard key={card.id} card={card} />)
        )}
      </Box>
    </Box>
  );
}
