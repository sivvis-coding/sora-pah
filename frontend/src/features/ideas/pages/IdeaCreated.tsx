import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Typography,
  Button,
  Paper,
  Divider,
  Fade,
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  LightbulbOutlined as IdeaIcon,
  ThumbUpAlt as VoteIcon,
  GroupAdd as InviteIcon,
} from '@mui/icons-material';

interface IdeaCreatedProps {
  ideaId: string;
  ideaTitle: string;
}

export default function IdeaCreated({ ideaId, ideaTitle }: IdeaCreatedProps) {
  const { t } = useTranslation('ideas');
  const navigate = useNavigate();

  return (
    <Fade in timeout={500}>
      <Box
        sx={{
          maxWidth: { xs: '100%', sm: 560, md: 620 },
          mx: 'auto',
          px: { xs: 2, sm: 3, md: 0 },
          pt: { xs: 4, md: 6 },
          pb: { xs: 10, md: 6 },
          textAlign: 'center',
        }}
      >
        {/* Success icon */}
        <Box
          sx={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            bgcolor: 'success.light',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mx: 'auto',
            mb: 3,
          }}
        >
          <CheckIcon sx={{ fontSize: 44, color: 'success.dark' }} />
        </Box>

        <Typography variant="h4" fontWeight={900} sx={{ mb: 1.5, letterSpacing: '-0.02em' }}>
          {t('create.success.headline')}
        </Typography>

        <Typography
          variant="body1"
          color="text.secondary"
          sx={{ mb: 1, maxWidth: 420, mx: 'auto' }}
        >
          {t('create.success.subheadline')}
        </Typography>

        {/* Idea title pill */}
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 1,
            bgcolor: 'primary.50',
            border: '1px solid',
            borderColor: 'primary.200',
            borderRadius: 2,
            px: 2,
            py: 1,
            mb: 4,
            maxWidth: '100%',
          }}
        >
          <IdeaIcon sx={{ fontSize: 15, color: 'primary.main', flexShrink: 0 }} />
          <Typography
            variant="body2"
            fontWeight={600}
            color="primary.main"
            sx={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {ideaTitle}
          </Typography>
        </Box>

        {/* Next steps */}
        <Paper
          variant="outlined"
          sx={{ borderRadius: 3, p: { xs: 2, sm: 3 }, mb: 3, textAlign: 'left' }}
        >
          <Typography
            variant="caption"
            sx={{
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: 'text.disabled',
              display: 'block',
              mb: 2,
            }}
          >
            {t('create.success.nextStepsLabel')}
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
              <VoteIcon sx={{ fontSize: 18, color: 'primary.main', mt: 0.1, flexShrink: 0 }} />
              <Box>
                <Typography variant="body2" fontWeight={700}>
                  {t('create.success.step1Title')}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {t('create.success.step1Desc')}
                </Typography>
              </Box>
            </Box>

            <Divider />

            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
              <InviteIcon sx={{ fontSize: 18, color: 'secondary.main', mt: 0.1, flexShrink: 0 }} />
              <Box>
                <Typography variant="body2" fontWeight={700}>
                  {t('create.success.step2Title')}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {t('create.success.step2Desc')}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Paper>

        {/* Actions */}
        <Box sx={{ display: 'flex', gap: 1.5, flexDirection: { xs: 'column', sm: 'row' } }}>
          <Button
            variant="contained"
            size="large"
            fullWidth
            onClick={() => navigate(`/ideas/${ideaId}`)}
            sx={{
              borderRadius: 2.5,
              textTransform: 'none',
              fontWeight: 700,
              minHeight: 48,
            }}
          >
            {t('create.success.viewIdea')}
          </Button>
          <Button
            variant="outlined"
            size="large"
            fullWidth
            onClick={() => navigate('/ideas')}
            sx={{
              borderRadius: 2.5,
              textTransform: 'none',
              fontWeight: 600,
              minHeight: 48,
            }}
          >
            {t('create.success.browseIdeas')}
          </Button>
        </Box>
      </Box>
    </Fade>
  );
}
