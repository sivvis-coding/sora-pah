import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Typography,
  CircularProgress,
  Chip,
} from '@mui/material';
import {
  AutoStories as NarrativeIcon,
  Lightbulb as IdeaIcon,
} from '@mui/icons-material';
import { narrativesApi, type Narrative } from '../api/narratives.api';

const statusColors: Record<string, 'default' | 'warning' | 'info' | 'success'> = {
  'to do': 'default',
  'in progress': 'info',
  done: 'success',
  unknown: 'default',
};

export default function NarrativeList() {
  const navigate = useNavigate();
  const { t } = useTranslation('narratives');

  const { data: narratives, isLoading } = useQuery<Narrative[]>({
    queryKey: ['narratives'],
    queryFn: narrativesApi.list,
  });

  if (isLoading) {
    return <CircularProgress sx={{ display: 'block', mx: 'auto', mt: 8 }} />;
  }

  if (!narratives?.length) {
    return (
      <Box sx={{ textAlign: 'center', py: 8, px: 3 }}>
        <NarrativeIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 2 }} />
        <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>
          {t('title')}
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 400, mx: 'auto' }}>
          {t('empty')}
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: { xs: '100%', md: 720 }, mx: 'auto' }}>
      <Typography
        variant="h5"
        fontWeight={800}
        sx={{ mb: 0.5 }}
      >
        {t('title')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        {t('subtitle')}
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {narratives.map((narrative, idx) => (
          <Box
            key={narrative.id}
            onClick={() => navigate(`/narratives/${narrative.id}`)}
            sx={{
              py: 2.5,
              borderTop: idx === 0 ? 'none' : '1px solid',
              borderColor: 'divider',
              cursor: 'pointer',
              borderRadius: 1,
              '&:hover': { bgcolor: 'action.hover' },
              transition: 'background-color 0.1s',
            }}
          >
            {/* Title + status */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.75 }}>
              <Typography
                variant="body1"
                sx={{
                  fontWeight: 700,
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {narrative.title}
              </Typography>
              <Chip
                size="small"
                label={t(`status.${narrative.executionStatus === 'in progress' ? 'inProgress' : narrative.executionStatus === 'to do' ? 'todo' : narrative.executionStatus}`)}
                color={statusColors[narrative.executionStatus] ?? 'default'}
                sx={{ fontWeight: 600, fontSize: '0.7rem' }}
              />
            </Box>

            {/* Why */}
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                mb: 0.75,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              }}
            >
              {narrative.why}
            </Typography>

            {/* Meta chips */}
            <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
              {narrative.originIdeaId && (
                <Chip
                  size="small"
                  icon={<IdeaIcon sx={{ fontSize: '12px !important' }} />}
                  label={t('card.originIdea')}
                  sx={{ fontSize: '0.65rem', height: 20 }}
                />
              )}
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
