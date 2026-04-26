import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Fade,
} from '@mui/material';
import { ViewKanban as BoardIcon } from '@mui/icons-material';
import { progressBoardApi, type ProgressBoard } from '../api/progress-board.api';
import ProgressBoardColumn from '../components/ProgressBoardColumn';

// ─── Skeleton loading ────────────────────────────────────────────────────────

function BoardSkeleton() {
  return (
    <Box
      sx={{
        display: 'flex',
        gap: 3,
        flexWrap: { xs: 'wrap', md: 'nowrap' },
        mt: 3,
      }}
    >
      {[0, 1, 2].map((i) => (
        <Box
          key={i}
          sx={{
            flex: '1 1 280px',
            height: { xs: 180, md: 240 },
            borderRadius: 2.5,
            bgcolor: 'action.hover',
            animation: 'shimmer 1.5s infinite linear',
            '@keyframes shimmer': {
              '0%': { opacity: 0.6 },
              '50%': { opacity: 1 },
              '100%': { opacity: 0.6 },
            },
          }}
        />
      ))}
    </Box>
  );
}

// ─── No-ClickUp empty state ──────────────────────────────────────────────────

function EmptyBoard({ t }: { t: (key: string) => string }) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '40vh',
        textAlign: 'center',
        px: 3,
      }}
    >
      <BoardIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 2 }} />
      <Typography variant="h6" fontWeight={700} color="text.secondary" sx={{ mb: 1 }}>
        {t('empty')}
      </Typography>
      <Typography variant="body2" color="text.disabled" sx={{ maxWidth: 400, lineHeight: 1.7 }}>
        {t('noClickup')}
      </Typography>
    </Box>
  );
}

// ─── ProgressBoardPage ────────────────────────────────────────────────────────

const COLUMNS = ['planned', 'in_progress', 'done'] as const;

export default function ProgressBoardPage() {
  const { t } = useTranslation('progressBoard');

  const { data, isLoading, isError } = useQuery<ProgressBoard>({
    queryKey: ['progress-board'],
    queryFn: progressBoardApi.getBoard,
    // Refresh every 5 minutes — ClickUp data doesn't change second by second
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });

  const totalItems =
    (data?.planned.length ?? 0) +
    (data?.in_progress.length ?? 0) +
    (data?.done.length ?? 0);

  const isEmptyBoard = !isLoading && !isError && totalItems === 0;

  return (
    <Box sx={{ pb: { xs: 8, md: 6 } }}>
      {/* Page header */}
      <Box sx={{ mb: { xs: 3, md: 4 } }}>
        <Typography
          variant="h5"
          fontWeight={800}
          sx={{ mb: 0.5, letterSpacing: '-0.02em' }}
        >
          {t('title')}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 560 }}>
          {t('subtitle')}
        </Typography>
        {data?.fetchedAt && (
          <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: 'block' }}>
            {t('lastUpdated', {
              time: new Date(data.fetchedAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              }),
            })}
          </Typography>
        )}
      </Box>

      {/* Loading */}
      {isLoading && <BoardSkeleton />}

      {/* Error */}
      {isError && (
        <Alert severity="warning" sx={{ borderRadius: 2, maxWidth: 560 }}>
          {t('noClickup')}
        </Alert>
      )}

      {/* Empty board (ClickUp configured but no matching tasks) */}
      {isEmptyBoard && <EmptyBoard t={t} />}

      {/* Board */}
      {data && totalItems > 0 && (
        <Fade in timeout={300}>
          <Box
            sx={{
              display: 'flex',
              gap: { xs: 3, md: 3 },
              flexWrap: { xs: 'wrap', md: 'nowrap' },
              alignItems: 'flex-start',
            }}
          >
            {COLUMNS.map((col) => (
              <ProgressBoardColumn
                key={col}
                column={col}
                cards={data[col]}
              />
            ))}
          </Box>
        </Fade>
      )}
    </Box>
  );
}
