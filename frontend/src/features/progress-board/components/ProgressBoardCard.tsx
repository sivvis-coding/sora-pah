import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  Link,
  Divider,
} from '@mui/material';
import {
  LightbulbOutlined as IdeaIcon,
  Gavel as DecisionIcon,
  OpenInNew as ExternalIcon,
  FormatQuote as QuoteIcon,
} from '@mui/icons-material';
import type { ProgressCard as ProgressCardType, ProgressColumn } from '../api/progress-board.api';

// ─── Column color tokens ─────────────────────────────────────────────────────

const COLUMN_COLORS: Record<ProgressColumn, { dot: string; chip: string; bg: string }> = {
  planned: {
    dot: '#9e9e9e',
    chip: 'default',
    bg: 'transparent',
  },
  in_progress: {
    dot: '#1976d2',
    chip: 'primary',
    bg: 'rgba(25, 118, 210, 0.04)',
  },
  done: {
    dot: '#2e7d32',
    chip: 'success',
    bg: 'rgba(46, 125, 50, 0.04)',
  },
};

// ─── Status dot ──────────────────────────────────────────────────────────────

function StatusDot({ column }: { column: ProgressColumn }) {
  const color = COLUMN_COLORS[column].dot;
  const isPulse = column === 'in_progress';

  return (
    <Box
      component="span"
      sx={{
        display: 'inline-block',
        width: 8,
        height: 8,
        borderRadius: '50%',
        bgcolor: color,
        flexShrink: 0,
        mt: '3px',
        ...(isPulse && {
          boxShadow: `0 0 0 0 ${color}`,
          animation: 'pulse 2s infinite',
          '@keyframes pulse': {
            '0%': { boxShadow: `0 0 0 0 ${color}80` },
            '70%': { boxShadow: `0 0 0 6px transparent` },
            '100%': { boxShadow: `0 0 0 0 transparent` },
          },
        }),
      }}
    />
  );
}

// ─── ProgressBoardCard ───────────────────────────────────────────────────────

interface Props {
  card: ProgressCardType;
}

export default function ProgressBoardCard({ card }: Props) {
  const { t } = useTranslation('progressBoard');
  const navigate = useNavigate();
  const colors = COLUMN_COLORS[card.column];

  const hasLinks = card.linkedIdeaId || card.linkedDecisionId;

  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 2.5,
        bgcolor: colors.bg,
        transition: 'box-shadow 0.15s ease',
        '&:hover': { boxShadow: 2 },
      }}
    >
      <CardContent sx={{ p: { xs: 2, md: 2.5 }, '&:last-child': { pb: { xs: 2, md: 2.5 } } }}>
        {/* Title row */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1.5 }}>
          <StatusDot column={card.column} />
          <Typography
            variant="body1"
            fontWeight={600}
            sx={{ lineHeight: 1.4, flex: 1 }}
          >
            {card.title}
          </Typography>
          <Tooltip title={t('card.viewInClickup')}>
            <IconButton
              size="small"
              href={card.clickupUrl}
              target="_blank"
              rel="noopener noreferrer"
              sx={{ mt: -0.5, mr: -0.5, flexShrink: 0, opacity: 0.5, '&:hover': { opacity: 1 } }}
            >
              <ExternalIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Built because */}
        {card.builtBecause && (
          <Box
            sx={{
              display: 'flex',
              gap: 0.75,
              alignItems: 'flex-start',
              bgcolor: 'action.hover',
              borderRadius: 1.5,
              px: 1.5,
              py: 1,
              mb: 1.5,
            }}
          >
            <QuoteIcon sx={{ fontSize: 13, color: 'text.disabled', mt: '2px', flexShrink: 0 }} />
            <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.5 }}>
              <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>
                {t('card.builtBecause')}:{' '}
              </Box>
              {card.builtBecause}
            </Typography>
          </Box>
        )}

        {/* Links to idea / decision */}
        {hasLinks && (
          <>
            {card.builtBecause && <Divider sx={{ mb: 1.5 }} />}
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {card.linkedIdeaId && (
                <Chip
                  size="small"
                  icon={<IdeaIcon sx={{ fontSize: '12px !important' }} />}
                  label={t('card.viewIdea')}
                  onClick={() => navigate(`/ideas/${card.linkedIdeaId}`)}
                  variant="outlined"
                  sx={{
                    fontSize: '0.7rem',
                    height: 24,
                    cursor: 'pointer',
                    borderColor: 'primary.light',
                    color: 'primary.main',
                    '& .MuiChip-icon': { color: 'primary.main' },
                  }}
                />
              )}
              {card.linkedDecisionId && (
                <Chip
                  size="small"
                  icon={<DecisionIcon sx={{ fontSize: '12px !important' }} />}
                  label={t('card.viewDecision')}
                  onClick={() => navigate(`/decisions`)}
                  variant="outlined"
                  sx={{
                    fontSize: '0.7rem',
                    height: 24,
                    cursor: 'pointer',
                    borderColor: 'secondary.light',
                    color: 'secondary.main',
                    '& .MuiChip-icon': { color: 'secondary.main' },
                  }}
                />
              )}
            </Box>
          </>
        )}
      </CardContent>
    </Card>
  );
}
