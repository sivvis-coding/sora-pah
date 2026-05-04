import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Collapse,
  Divider,
} from '@mui/material';
import {
  LightbulbOutlined as IdeaIcon,
  Gavel as DecisionIcon,
  FormatQuote as QuoteIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import type { ProgressCard as ProgressCardType, ProgressColumn, ProgressPriority } from '../api/progress-board.api';

// ─── Column color tokens ─────────────────────────────────────────────────────

const COLUMN_COLORS: Record<ProgressColumn, { dot: string; bg: string }> = {
  planned:     { dot: '#9e9e9e', bg: 'transparent' },
  in_progress: { dot: '#1976d2', bg: 'rgba(25, 118, 210, 0.04)' },
  done:        { dot: '#2e7d32', bg: 'rgba(46, 125, 50, 0.04)' },
};

// ─── Priority config ─────────────────────────────────────────────────────────

export const PRIORITY_CONFIG: Record<ProgressPriority, { color: string; bg: string; border: string }> = {
  high:   { color: '#dc2626', bg: '#fef2f2', border: '#fca5a5' },
  medium: { color: '#d97706', bg: '#fffbeb', border: '#fcd34d' },
  low:    { color: '#2563eb', bg: '#eff6ff', border: '#93c5fd' },
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
        width: 7,
        height: 7,
        borderRadius: '50%',
        bgcolor: color,
        flexShrink: 0,
        mt: '5px',
        ...(isPulse && {
          animation: 'pulse 2s infinite',
          '@keyframes pulse': {
            '0%':   { boxShadow: `0 0 0 0 ${color}80` },
            '70%':  { boxShadow: `0 0 0 5px transparent` },
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
  const [expanded, setExpanded] = useState(false);

  const p = card.priority ? PRIORITY_CONFIG[card.priority] : null;

  const collapseText  = card.customFieldValue?.trim() || card.description?.trim() || null;
  const collapseLabel = t('card.description');
  const hasLinks = card.linkedIdeaId || card.linkedDecisionId;

  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 2,
        borderLeft: p ? `3px solid ${p.color}` : '3px solid transparent',
        bgcolor: p ? p.bg : 'background.paper',
        transition: 'box-shadow 0.15s ease, transform 0.1s ease',
        '&:hover': { boxShadow: 3, transform: 'translateY(-1px)' },
      }}
    >
      <CardContent sx={{ p: { xs: 1.5, md: 2 }, '&:last-child': { pb: { xs: 1.5, md: 2 } } }}>

        {/* Title row */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: card.builtBecause || collapseText || hasLinks ? 1 : 0 }}>
          <StatusDot column={card.column} />
          <Typography variant="body2" fontWeight={600} sx={{ lineHeight: 1.45, flex: 1 }}>
            {card.title}
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
                mt: '2px',
              }}
              >
                {t(`priority.${card.priority}`)}
              </Box>
          )}
        </Box>

        {/* Built because */}
        {card.builtBecause && (
          <Box
            sx={{
              display: 'flex',
              gap: 0.75,
              alignItems: 'flex-start',
              bgcolor: 'rgba(0,0,0,0.03)',
              borderRadius: 1.5,
              px: 1.25,
              py: 0.75,
              mb: 1,
              ml: '15px',
            }}
          >
            <QuoteIcon sx={{ fontSize: 12, color: 'text.disabled', mt: '2px', flexShrink: 0 }} />
            <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.5 }}>
              <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>
                {t('card.builtBecause')}:{' '}
              </Box>
              {card.builtBecause}
            </Typography>
          </Box>
        )}

        {/* Collapsible description */}
        {collapseText && (
          <Box sx={{ mb: hasLinks ? 1 : 0, ml: '15px' }}>
            <Box
              onClick={() => setExpanded((prev) => !prev)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.25,
                cursor: 'pointer',
                userSelect: 'none',
                width: 'fit-content',
                '&:hover .desc-label': { color: 'text.secondary' },
              }}
            >
              <Typography
                className="desc-label"
                variant="caption"
                color="text.disabled"
                sx={{ fontWeight: 600, fontSize: '0.68rem', transition: 'color 0.15s' }}
              >
                {collapseLabel}
              </Typography>
              <ExpandMoreIcon
                sx={{
                  fontSize: 14,
                  color: 'text.disabled',
                  transition: 'transform 0.2s ease',
                  transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                }}
              />
            </Box>
            <Collapse in={expanded} timeout={200}>
              <Box
                sx={{
                  mt: 0.5,
                  px: 1.25,
                  py: 0.75,
                  bgcolor: 'rgba(0,0,0,0.03)',
                  borderRadius: 1.5,
                  maxHeight: 180,
                  overflow: 'auto',
                }}
              >
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ lineHeight: 1.6, whiteSpace: 'pre-line', wordBreak: 'break-word' }}
                >
                  {collapseText}
                </Typography>
              </Box>
            </Collapse>
          </Box>
        )}

        {/* Links */}
        {hasLinks && (
          <>
            {(card.builtBecause || collapseText) && <Divider sx={{ mb: 1, ml: '15px' }} />}
            <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', ml: '15px' }}>
              {card.linkedIdeaId && (
                <Chip
                  size="small"
                  icon={<IdeaIcon sx={{ fontSize: '11px !important' }} />}
                  label={t('card.viewIdea')}
                  onClick={() => navigate(`/ideas/${card.linkedIdeaId}`)}
                  variant="outlined"
                  sx={{
                    fontSize: '0.65rem',
                    height: 22,
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
                  icon={<DecisionIcon sx={{ fontSize: '11px !important' }} />}
                  label={t('card.viewDecision')}
                  onClick={() => navigate(`/decisions`)}
                  variant="outlined"
                  sx={{
                    fontSize: '0.65rem',
                    height: 22,
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
