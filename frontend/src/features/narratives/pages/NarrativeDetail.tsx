import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Typography,
  CircularProgress,
  Chip,
  Button,
  Divider,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Circle as DotIcon,
} from '@mui/icons-material';
import { narrativesApi, type Narrative } from '../api/narratives.api';

const statusColors: Record<string, string> = {
  'to do': '#9e9e9e',
  'in progress': '#2196f3',
  done: '#4caf50',
  unknown: '#bdbdbd',
};

export default function NarrativeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation('narratives');

  const { data: narrative, isLoading } = useQuery<Narrative>({
    queryKey: ['narratives', id],
    queryFn: () => narrativesApi.get(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return <CircularProgress sx={{ display: 'block', mx: 'auto', mt: 8 }} />;
  }

  if (!narrative) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography color="text.secondary">Not found</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: { xs: '100%', md: 640 }, mx: 'auto' }}>
      <Button
        startIcon={<BackIcon />}
        onClick={() => navigate('/narratives')}
        sx={{ mb: 3, textTransform: 'none', fontWeight: 600 }}
      >
        {t('detail.back')}
      </Button>

      {/* Title */}
      <Typography variant="h5" fontWeight={800} sx={{ mb: 1 }}>
        {narrative.title}
      </Typography>

      {/* Execution status chip */}
      <Chip
        size="small"
        label={t(`status.${narrative.executionStatus === 'in progress' ? 'inProgress' : narrative.executionStatus === 'to do' ? 'todo' : narrative.executionStatus}`)}
        sx={{
          fontWeight: 600,
          fontSize: '0.75rem',
          mb: 3,
          bgcolor: statusColors[narrative.executionStatus] + '20',
          color: statusColors[narrative.executionStatus],
          border: '1px solid',
          borderColor: statusColors[narrative.executionStatus] + '40',
        }}
      />

      {/* What */}
      {narrative.description && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="overline" color="text.disabled" sx={{ fontWeight: 700 }}>
            {t('detail.what')}
          </Typography>
          <Typography variant="body1" sx={{ lineHeight: 1.7 }}>
            {narrative.description}
          </Typography>
        </Box>
      )}

      <Divider sx={{ my: 2 }} />

      {/* Why */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="overline" color="text.disabled" sx={{ fontWeight: 700 }}>
          {t('detail.why')}
        </Typography>
        <Typography variant="body1" sx={{ lineHeight: 1.7 }}>
          {narrative.why}
        </Typography>
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* Execution — linked ClickUp tasks */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="overline" color="text.disabled" sx={{ fontWeight: 700 }}>
          {t('detail.execution')}
        </Typography>
        {narrative.clickupTasks.length === 0 ? (
          <Typography variant="body2" color="text.disabled" sx={{ fontStyle: 'italic' }}>
            {t('detail.noTasks')}
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
            {narrative.clickupTasks.map((task) => (
              <Box
                key={task.id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                <DotIcon
                  sx={{
                    fontSize: 10,
                    color: statusColors[task.status.toLowerCase()] ?? '#9e9e9e',
                  }}
                />
                <Typography variant="body2">{task.name}</Typography>
                <Chip
                  size="small"
                  label={task.status}
                  sx={{ fontSize: '0.6rem', height: 18, ml: 'auto' }}
                />
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
}
