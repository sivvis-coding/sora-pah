import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { School as LearnIcon } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { learnApi } from '../api/learn.api';
import QuestionsSection from '../components/QuestionsSection';
import TrainingSection from '../components/TrainingSection';
import DocRequestsSection from '../components/DocRequestsSection';

export default function LearnPage() {
  const { t } = useTranslation('learn');
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [tab, setTab] = useState(0);

  // ── Data queries ────────────────────────────────────────────────────────────

  const { data: questions = [], isLoading: questionsLoading } = useQuery({
    queryKey: ['learn-questions'],
    queryFn: () => learnApi.getQuestions(),
  });

  const { data: sessions = [], isLoading: sessionsLoading } = useQuery({
    queryKey: ['learn-training'],
    queryFn: () => learnApi.getTrainingSessions(),
  });

  const { data: docRequests = [], isLoading: docRequestsLoading } = useQuery({
    queryKey: ['learn-doc-requests'],
    queryFn: () => learnApi.getDocRequests(),
  });

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <Box sx={{ maxWidth: 840, mx: 'auto', width: '100%' }}>
      {/* Header */}
      <Box sx={{ mb: { xs: 3, sm: 4 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
          <LearnIcon color="primary" />
          <Typography variant="h5" fontWeight={700} sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
            {t('title')}
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary">
          {t('subtitle')}
        </Typography>
      </Box>

      {/* Tabs */}
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        variant={isMobile ? 'fullWidth' : 'standard'}
        sx={{
          mb: 3,
          '& .MuiTab-root': {
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '0.875rem',
            minHeight: 42,
          },
        }}
      >
        <Tab label={`${t('tabs.questions')} (${questions.length})`} />
        <Tab label={`${t('tabs.training')} (${sessions.length})`} />
        <Tab label={`${t('tabs.docRequests')} (${docRequests.length})`} />
      </Tabs>

      {/* Tab content */}
      <Box>
        {tab === 0 && (
          <QuestionsSection questions={questions} isLoading={questionsLoading} />
        )}
        {tab === 1 && (
          <TrainingSection sessions={sessions} isLoading={sessionsLoading} />
        )}
        {tab === 2 && (
          <DocRequestsSection requests={docRequests} isLoading={docRequestsLoading} />
        )}
      </Box>
    </Box>
  );
}
