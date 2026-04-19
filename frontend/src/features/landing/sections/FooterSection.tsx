import React from 'react';
import { Box, Container, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { APP_NAME } from '../../../shared/constants';

export default function FooterSection() {
  const { t } = useTranslation('landing');

  return (
    <Box
      component="footer"
      sx={{
        py: 4,
        borderTop: '1px solid',
        borderColor: 'divider',
        bgcolor: '#fff',
      }}
    >
      <Container maxWidth="lg">
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
            <Typography variant="subtitle2" fontWeight={800} color="primary.main">
              {APP_NAME}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t('footer.tagline')}
            </Typography>
          </Box>
          <Typography variant="caption" color="text.secondary">
            {t('footer.copy', { year: new Date().getFullYear() })}
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
