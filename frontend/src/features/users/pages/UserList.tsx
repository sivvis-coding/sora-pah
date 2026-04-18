import React from 'react';
import { Typography, Paper } from '@mui/material';
import { useTranslation } from 'react-i18next';

export default function UserList() {
  const { t } = useTranslation('users');
  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>{t('title')}</Typography>
      <Typography color="text.secondary">{t('comingSoon')}</Typography>
    </Paper>
  );
}
