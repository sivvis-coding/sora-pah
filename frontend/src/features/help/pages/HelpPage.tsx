import React from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Typography } from '@mui/material';
import { HelpOutline as HelpIcon } from '@mui/icons-material';

export default function HelpPage() {
  const { t } = useTranslation('help');

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '50vh',
        textAlign: 'center',
        px: 3,
      }}
    >
      <HelpIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 2 }} />
      <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>
        {t('title')}
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 400, lineHeight: 1.7 }}>
        {t('comingSoon')}
      </Typography>
    </Box>
  );
}
