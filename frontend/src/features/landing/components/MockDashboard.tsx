import React from 'react';
import { Avatar, Box, Chip, LinearProgress, Typography } from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  CheckCircle as CheckIcon,
  Schedule as PendingIcon,
} from '@mui/icons-material';

/**
 * Fake dashboard visual for the hero section.
 * Pure decoration — no real data.
 */
export default function MockDashboard() {
  const rows = [
    { name: 'Mobile redesign', votes: 87, status: 'approved', color: 'success' as const },
    { name: 'API v3 migration', votes: 64, status: 'voting', color: 'warning' as const },
    { name: 'SSO integration', votes: 42, status: 'pending', color: 'default' as const },
  ];

  return (
    <Box
      sx={{
        bgcolor: '#fff',
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
        boxShadow: '0 20px 60px rgba(0,0,0,0.08)',
        overflow: 'hidden',
        width: '100%',
        maxWidth: 480,
      }}
    >
      {/* Title bar */}
      <Box
        sx={{
          px: 2.5,
          py: 1.5,
          borderBottom: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <TrendingUpIcon sx={{ fontSize: 18, color: 'primary.main' }} />
        <Typography variant="subtitle2" fontWeight={700} color="primary.main">
          Decision Board
        </Typography>
        <Chip label="3 active" size="small" sx={{ ml: 'auto', fontSize: '0.7rem', height: 22 }} />
      </Box>

      {/* Rows */}
      {rows.map((row, i) => (
        <Box
          key={i}
          sx={{
            px: 2.5,
            py: 1.5,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            borderBottom: i < rows.length - 1 ? '1px solid' : 'none',
            borderColor: 'divider',
            transition: 'background-color 0.15s',
            '&:hover': { bgcolor: 'action.hover' },
          }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body2" fontWeight={600} noWrap>
              {row.name}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
              <LinearProgress
                variant="determinate"
                value={row.votes}
                sx={{ flex: 1, height: 4, borderRadius: 2 }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ minWidth: 28 }}>
                {row.votes}%
              </Typography>
            </Box>
          </Box>

          {/* Fake voter avatars */}
          <Box sx={{ display: 'flex', ml: 0.5 }}>
            {[0, 1, 2].map((j) => (
              <Avatar
                key={j}
                sx={{
                  width: 22,
                  height: 22,
                  fontSize: '0.6rem',
                  ml: j > 0 ? -0.8 : 0,
                  border: '1.5px solid #fff',
                  bgcolor: ['primary.main', 'secondary.main', 'warning.main'][j],
                }}
              >
                {['A', 'M', 'J'][j]}
              </Avatar>
            ))}
          </Box>

          {row.status === 'approved' ? (
            <CheckIcon sx={{ fontSize: 18, color: 'success.main' }} />
          ) : row.status === 'voting' ? (
            <PendingIcon sx={{ fontSize: 18, color: 'warning.main' }} />
          ) : (
            <PendingIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
          )}
        </Box>
      ))}
    </Box>
  );
}
