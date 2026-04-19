import React from 'react';
import { Box, Container, Grid, List, ListItem, ListItemIcon, ListItemText, Paper, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import {
  Person as StakeholderIcon,
  AdminPanelSettings as LeaderIcon,
  CheckCircle as CheckIcon,
} from '@mui/icons-material';

export default function RolesSection() {
  const { t } = useTranslation('landing');

  const columns = [
    {
      key: 'stakeholders',
      icon: StakeholderIcon,
      color: '#7c4dff',
      items: ['item1', 'item2', 'item3'],
    },
    {
      key: 'leaders',
      icon: LeaderIcon,
      color: '#1565c0',
      items: ['item1', 'item2', 'item3'],
    },
  ];

  return (
    <Box sx={{ py: { xs: 8, md: 12 }, bgcolor: '#fafafa' }}>
      <Container maxWidth="md">
        <Typography
          variant="h4"
          component="h2"
          fontWeight={800}
          textAlign="center"
          sx={{ fontSize: { xs: '1.6rem', md: '2.2rem' }, mb: { xs: 5, md: 7 } }}
        >
          {t('roles.title')}
        </Typography>

        <Grid container spacing={4}>
          {columns.map(({ key, icon: Icon, color, items }) => (
            <Grid item xs={12} md={6} key={key}>
              <Paper
                elevation={0}
                sx={{
                  p: { xs: 3, md: 4 },
                  borderRadius: 3,
                  border: '1px solid',
                  borderColor: 'divider',
                  height: '100%',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
                  <Box
                    sx={{
                      width: 44,
                      height: 44,
                      borderRadius: 2,
                      bgcolor: `${color}14`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon sx={{ fontSize: 24, color }} />
                  </Box>
                  <Typography variant="h6" fontWeight={700}>
                    {t(`roles.${key}.title`)}
                  </Typography>
                </Box>

                <List disablePadding>
                  {items.map((item) => (
                    <ListItem key={item} disableGutters sx={{ py: 0.75 }}>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <CheckIcon sx={{ fontSize: 20, color }} />
                      </ListItemIcon>
                      <ListItemText
                        primary={t(`roles.${key}.${item}`)}
                        primaryTypographyProps={{ variant: 'body2', lineHeight: 1.6 }}
                      />
                    </ListItem>
                  ))}
                </List>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}
