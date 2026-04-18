import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Typography, Button, Paper, Box } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation('products');

  return (
    <>
      <Button startIcon={<ArrowBack />} onClick={() => navigate('/products')} sx={{ mb: 2 }}>
        {t('detail.back')}
      </Button>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          {t('detail.title')}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {t('detail.id')}: {id}
        </Typography>
        <Box sx={{ mt: 3 }}>
          <Typography variant="body2" color="text.secondary">
            {t('detail.placeholder')}
          </Typography>
        </Box>
      </Paper>
    </>
  );
}
