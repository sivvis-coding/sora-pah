import React from 'react';
import { Box, Container, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { Close as CloseIcon } from '@mui/icons-material';

export default function ValuePropSection() {
  const { t } = useTranslation('landing');

  return (
    <Box sx={{ py: { xs: 8, md: 12 } }}>
      <Container maxWidth="sm">
        <Box sx={{ textAlign: 'center' }}>
          <Typography
            variant="h4"
            component="h2"
            fontWeight={800}
            sx={{ fontSize: { xs: '1.6rem', md: '2.2rem' }, mb: 4 }}
          >
            {t('valueProp.title')}
          </Typography>

          {/* "Not" items */}
          {['not1', 'not2'].map((key) => (
            <Box
              key={key}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1.5,
                mb: 2,
              }}
            >
              <CloseIcon sx={{ color: 'error.main', fontSize: 22 }} />
              <Typography
                variant="body1"
                color="text.secondary"
                sx={{ textDecoration: 'line-through', fontSize: '1.05rem' }}
              >
                {t(`valueProp.${key}`)}
              </Typography>
            </Box>
          ))}

          {/* "Instead" statement */}
          <Box
            sx={{
              mt: 5,
              p: { xs: 3, md: 4 },
              borderRadius: 3,
              background: 'linear-gradient(135deg, #1565c0 0%, #7c4dff 100%)',
              color: '#fff',
            }}
          >
            <Typography
              variant="h6"
              fontWeight={700}
              sx={{ fontSize: { xs: '1rem', md: '1.2rem' }, lineHeight: 1.6 }}
            >
              {t('valueProp.instead')}
            </Typography>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
