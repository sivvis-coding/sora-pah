import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Typography,
  CircularProgress,
  Alert,
  Box,
  Button,
  Chip,
  Avatar,
  TextField,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  ThumbUp as ThumbUpIcon,
  ThumbUpOutlined as ThumbUpOutlinedIcon,
  Send as SendIcon,
  Delete as DeleteIcon,
  ArrowBack as ArrowBackIcon,
  Lightbulb as LightbulbIcon,
} from '@mui/icons-material';
import { ideasApi, type IdeaDetail, type Idea, type IdeaComment } from '../api/ideas.api';
import { categoriesApi, type Category } from '../../categories/api/categories.api';
import { useAuth } from '../../auth/AuthContext';
import { useMode } from '../../../shared/ModeContext';
import { AppMode } from '../../../shared/constants';

const statusColor: Record<Idea['status'], 'success' | 'warning' | 'info'> = {
  open: 'success',
  in_review: 'warning',
  converted: 'info',
};

function timeAgo(dateString: string, locale: string): string {
  const now = Date.now();
  const past = new Date(dateString).getTime();
  const diffMs = now - past;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  try {
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
    if (diffDay > 30) return rtf.format(-Math.floor(diffDay / 30), 'month');
    if (diffDay > 0) return rtf.format(-diffDay, 'day');
    if (diffHr > 0) return rtf.format(-diffHr, 'hour');
    if (diffMin > 0) return rtf.format(-diffMin, 'minute');
    return rtf.format(-diffSec, 'second');
  } catch {
    if (diffDay > 0) return `${diffDay}d ago`;
    if (diffHr > 0) return `${diffHr}h ago`;
    return `${diffMin}m ago`;
  }
}

/** Tiny uppercase label — clearly a category tag, not content */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Typography
      sx={{
        fontSize: '0.65rem',
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: '0.12em',
        color: 'text.disabled',
        mb: 0.75,
        display: 'block',
      }}
    >
      {children}
    </Typography>
  );
}

export default function IdeaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation('ideas');
  const { t: tShared } = useTranslation('shared');
  const { user } = useAuth();
  const { mode } = useMode();
  const navigate = useNavigate();
  const isAdmin = mode === AppMode.ADMIN;
  const queryClient = useQueryClient();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [statusValue, setStatusValue] = useState<Idea['status'] | ''>('');
  const [commentText, setCommentText] = useState('');

  const { data, isLoading, error } = useQuery<IdeaDetail>({
    queryKey: ['ideas', id],
    queryFn: () => ideasApi.get(id!),
    enabled: !!id,
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: categoriesApi.listActive,
  });

  const { data: comments = [], isLoading: commentsLoading } = useQuery<IdeaComment[]>({
    queryKey: ['ideas', id, 'comments'],
    queryFn: () => ideasApi.getComments(id!),
    enabled: !!id,
  });

  const category = categories.find((c) => c.id === (data as any)?.categoryId);
  const hasVoted = data?.votes?.some((v) => v.userId === user?.id);

  const voteMutation = useMutation({
    mutationFn: () => ideasApi.vote(id!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ideas', id] }),
  });

  const removeVoteMutation = useMutation({
    mutationFn: () => ideasApi.removeVote(id!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ideas', id] }),
  });

  const statusMutation = useMutation({
    mutationFn: (status: Idea['status']) => ideasApi.updateStatus(id!, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ideas', id] });
      queryClient.invalidateQueries({ queryKey: ['ideas'] });
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: (content: string) => ideasApi.addComment(id!, content),
    onSuccess: () => {
      setCommentText('');
      queryClient.invalidateQueries({ queryKey: ['ideas', id, 'comments'] });
      queryClient.invalidateQueries({ queryKey: ['ideas'] });
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: string) => ideasApi.deleteComment(id!, commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ideas', id, 'comments'] });
      queryClient.invalidateQueries({ queryKey: ['ideas'] });
    },
  });

  if (isLoading) return <CircularProgress />;
  if (error || !data) return <Alert severity="error">{tShared('common.error')}</Alert>;

  const author = data.author;
  const authorInitial = author?.name?.charAt(0)?.toUpperCase() ?? '?';
  const authorMeta = [author?.jobTitle, author?.department].filter(Boolean).join(' · ');

  // description = "what do you need" (Q1)
  // value = "why does this matter" (Q2) — always distinct from description
  // problem is always === value (same form field), never show separately
  const showWhyMatters = data.value && data.value !== data.description;

  // Supporter statement key
  const supportKey =
    data.voteCount === 0
      ? 'detail.supportersStatement_zero'
      : data.voteCount === 1
      ? 'detail.supportersStatement_one'
      : 'detail.supportersStatement_other';

  return (
    <Box sx={{ maxWidth: { xs: '100%', md: 720 }, mx: 'auto' }}>

      {/* ── Back ── */}
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate(-1)}
        size="small"
        sx={{
          mb: 4,
          textTransform: 'none',
          color: 'text.disabled',
          fontWeight: 500,
          px: 0,
          '&:hover': { color: 'text.secondary', background: 'none' },
        }}
        disableRipple
      >
        {tShared('common.back')}
      </Button>

      {/* ══════════════════════════════════════════
          SECTION 1 — HEADER (Human Context)
      ══════════════════════════════════════════ */}
      <Box sx={{ mb: 5 }}>
        {/* Status + category chips */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 1,
            mb: 2,
          }}
        >
          <Chip
            label={t(`status.${data.status}`)}
            color={statusColor[data.status]}
            size="small"
            sx={{ fontWeight: 600, borderRadius: 1.5, fontSize: '0.72rem' }}
          />
          {category && (
            <Chip
              label={category.name}
              size="small"
              sx={{
                borderRadius: 1.5,
                fontWeight: 600,
                fontSize: '0.72rem',
                ...(category.color
                  ? { bgcolor: category.color, color: '#fff' }
                  : { bgcolor: 'action.selected' }),
              }}
            />
          )}
        </Box>

        {/* Title */}
        <Typography
          sx={{
            fontWeight: 800,
            lineHeight: 1.2,
            fontSize: { xs: '1.55rem', sm: '2rem' },
            mb: 2.5,
            letterSpacing: '-0.01em',
          }}
        >
          {data.title}
        </Typography>

        {/* Author — readable and human */}
        {author && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.75,
              mt: 3,
              pt: 3,
              borderTop: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Avatar
              src={
                author.photoBase64
                  ? `data:image/jpeg;base64,${author.photoBase64}`
                  : undefined
              }
              sx={{ width: 44, height: 44, fontSize: '1rem', flexShrink: 0 }}
            >
              {authorInitial}
            </Avatar>
            <Box>
              <Typography
                variant="caption"
                sx={{
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  color: 'text.disabled',
                  display: 'block',
                  mb: 0.25,
                }}
              >
                {t('detail.sharedBy')}
              </Typography>
              <Typography
                variant="body1"
                sx={{ fontWeight: 700, lineHeight: 1.3, color: 'text.primary' }}
              >
                {author.name}
              </Typography>
              {(author.jobTitle || author.department) && (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ lineHeight: 1.4, mt: 0.25 }}
                >
                  {[author.jobTitle, author.department].filter(Boolean).join(' · ')}
                </Typography>
              )}
            </Box>
            <Typography
              variant="caption"
              color="text.disabled"
              sx={{ ml: 'auto', whiteSpace: 'nowrap', alignSelf: 'flex-start', mt: 0.5 }}
            >
              {timeAgo(data.createdAt, i18n.language)}
            </Typography>
          </Box>
        )}
      </Box>

      {/* ══════════════════════════════════════════
          SECTION 2 — PROBLEM & MOTIVATION
      ══════════════════════════════════════════ */}
      <Box sx={{ mb: 5 }}>
        <SectionLabel>{t('detail.theNeed')}</SectionLabel>
        <Typography
          variant="body1"
          sx={{
            lineHeight: 1.85,
            color: 'text.primary',
            fontSize: { xs: '1.05rem', sm: '1.15rem' },
            fontWeight: 400,
          }}
        >
          {data.description}
        </Typography>

        {showWhyMatters && (
          <Box sx={{ mt: 3.5 }}>
            <SectionLabel>{t('detail.whyMatters')}</SectionLabel>
            <Typography
              variant="body1"
              sx={{
                lineHeight: 1.85,
                color: 'text.primary',
                fontSize: { xs: '1.05rem', sm: '1.15rem' },
                fontWeight: 400,
              }}
            >
              {data.value}
            </Typography>
          </Box>
        )}

        {data.solutionIdea && (
          <Box
            sx={{
              mt: 3.5,
              pl: 2.5,
              borderLeft: '3px solid',
              borderColor: 'primary.light',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1 }}>
              <LightbulbIcon sx={{ fontSize: 15, color: 'primary.main', opacity: 0.8 }} />
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 700,
                  color: 'primary.main',
                  textTransform: 'uppercase',
                  letterSpacing: '0.07em',
                  fontSize: '0.68rem',
                }}
              >
                {t('detail.possibleApproach')}
              </Typography>
            </Box>
            <Typography
              variant="body2"
              sx={{ lineHeight: 1.8, color: 'text.secondary', fontSize: '1rem' }}
            >
              {data.solutionIdea}
            </Typography>
          </Box>
        )}
      </Box>

      {/* ══════════════════════════════════════════
          SECTION 3 — COMMUNITY SIGNAL (Voting)
      ══════════════════════════════════════════ */}
      <Box
        sx={{
          py: 4,
          borderTop: '1px solid',
          borderBottom: '1px solid',
          borderColor: 'divider',
          mb: 5,
        }}
      >
        {/* Supporter avatars (from votes) */}
        {data.votes && data.votes.length > 0 && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: -0.5, mb: 2 }}>
            {data.votes.slice(0, 7).map((vote, i) => (
              <Avatar
                key={vote.id}
                sx={{
                  width: 28,
                  height: 28,
                  fontSize: '0.7rem',
                  border: '2px solid',
                  borderColor: 'background.paper',
                  ml: i === 0 ? 0 : -0.75,
                  bgcolor: 'primary.main',
                  opacity: 0.85,
                }}
              >
                {vote.userId?.charAt(0)?.toUpperCase() ?? '?'}
              </Avatar>
            ))}
            {data.votes.length > 7 && (
              <Avatar
                sx={{
                  width: 28,
                  height: 28,
                  fontSize: '0.6rem',
                  border: '2px solid',
                  borderColor: 'background.paper',
                  ml: -0.75,
                  bgcolor: 'action.selected',
                  color: 'text.secondary',
                }}
              >
                +{data.votes.length - 7}
              </Avatar>
            )}
          </Box>
        )}

        {/* Statement */}
        <Typography
          sx={{
            fontWeight: 600,
            fontSize: { xs: '1rem', sm: '1.1rem' },
            color: hasVoted ? 'primary.main' : 'text.primary',
            mb: 2.5,
          }}
        >
          {t(supportKey, { count: data.voteCount })}
        </Typography>

        {/* Single primary CTA */}
        {hasVoted ? (
          <Button
            variant="outlined"
            startIcon={<ThumbUpIcon />}
            onClick={() => removeVoteMutation.mutate()}
            disabled={removeVoteMutation.isPending}
            fullWidth={isMobile}
            sx={{
              borderRadius: 2.5,
              textTransform: 'none',
              fontWeight: 600,
              minHeight: 44,
              px: 3,
            }}
          >
            {t('detail.removeSupport')}
          </Button>
        ) : (
          <Button
            variant="contained"
            size="large"
            startIcon={<ThumbUpOutlinedIcon />}
            onClick={() => voteMutation.mutate()}
            disabled={voteMutation.isPending}
            fullWidth={isMobile}
            sx={{
              borderRadius: 2.5,
              textTransform: 'none',
              fontWeight: 700,
              minHeight: 44,
              px: 4,
              boxShadow: 'none',
              '&:hover': { boxShadow: 'none' },
            }}
          >
            {t('detail.supportAction')}
          </Button>
        )}
      </Box>

      {/* ══════════════════════════════════════════
          SECTION 4 — DISCUSSION (Comments)
      ══════════════════════════════════════════ */}
      <Box sx={{ mb: isAdmin ? 5 : 0 }}>
        <Typography
          variant="h6"
          sx={{ fontWeight: 700, mb: 3, fontSize: '1rem', letterSpacing: 0 }}
        >
          {t('detail.conversation')}
          {comments.length > 0 && (
            <Box
              component="span"
              sx={{ ml: 1, fontWeight: 400, color: 'text.disabled', fontSize: '0.9rem' }}
            >
              · {comments.length}
            </Box>
          )}
        </Typography>

        {/* Input */}
        <Box sx={{ display: 'flex', gap: 1.5, mb: 4, alignItems: 'flex-start' }}>
          <Avatar
            sx={{ width: 32, height: 32, fontSize: '0.8rem', mt: 0.5, flexShrink: 0 }}
          >
            {user?.name?.charAt(0)?.toUpperCase() ?? '?'}
          </Avatar>
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              alignItems: 'flex-end',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 3,
              px: 1.75,
              py: 1,
              gap: 0.5,
              transition: 'border-color 0.15s',
              '&:focus-within': { borderColor: 'primary.main' },
            }}
          >
            <TextField
              fullWidth
              variant="standard"
              multiline
              minRows={1}
              maxRows={5}
              placeholder={t('detail.addThoughts')}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && commentText.trim()) {
                  e.preventDefault();
                  addCommentMutation.mutate(commentText.trim());
                }
              }}
              InputProps={{
                disableUnderline: true,
                sx: { fontSize: '0.95rem', lineHeight: 1.6 },
              }}
            />
            <IconButton
              color="primary"
              size="small"
              disabled={!commentText.trim() || addCommentMutation.isPending}
              onClick={() => addCommentMutation.mutate(commentText.trim())}
              sx={{ mb: 0.25, flexShrink: 0 }}
            >
              <SendIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Box>
        </Box>

        {/* Comment list */}
        {commentsLoading ? (
          <CircularProgress size={20} />
        ) : comments.length === 0 ? (
          <Typography
            variant="body2"
            color="text.disabled"
            sx={{ fontStyle: 'italic', pl: 0.5 }}
          >
            {t('detail.noConversation')}
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            {comments.map((comment, idx) => (
              <Box
                key={comment.id}
                sx={{
                  display: 'flex',
                  gap: 1.75,
                  py: 2.5,
                  borderTop: idx === 0 ? 'none' : '1px solid',
                  borderColor: 'divider',
                  // On mobile: always show delete at low opacity; on desktop: fade in on hover
                  '&:hover .delete-btn': {
                    opacity: 1,
                  },
                }}
              >
                <Avatar
                  src={
                    comment.author?.photoBase64
                      ? `data:image/jpeg;base64,${comment.author.photoBase64}`
                      : undefined
                  }
                  sx={{ width: 30, height: 30, fontSize: '0.75rem', mt: 0.25, flexShrink: 0 }}
                >
                  {comment.author?.name?.charAt(0)?.toUpperCase() ?? '?'}
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  {/* Name + time + delete */}
                  <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 0.5 }}>
                    <Typography variant="body2" fontWeight={700} sx={{ lineHeight: 1.3 }}>
                      {comment.author?.name ?? t('detail.unknownUser')}
                    </Typography>
                    <Typography variant="caption" color="text.disabled">
                      {timeAgo(comment.createdAt, i18n.language)}
                    </Typography>
                    {(isAdmin || comment.userId === user?.id) && (
                      <IconButton
                        size="small"
                        className="delete-btn"
                        onClick={() => deleteCommentMutation.mutate(comment.id)}
                        sx={{
                          ml: 'auto',
                          p: 0.5,
                          color: 'text.disabled',
                          // Always visible on touch devices, hidden-until-hover on desktop
                          opacity: { xs: 0.5, md: 0 },
                          transition: 'opacity 0.15s, color 0.15s',
                          '&:hover': { color: 'error.main', opacity: 1 },
                        }}
                      >
                        <DeleteIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    )}
                  </Box>
                  {/* Comment body */}
                  <Typography
                    variant="body2"
                    sx={{ lineHeight: 1.75, color: 'text.secondary', whiteSpace: 'pre-wrap' }}
                  >
                    {comment.content}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </Box>

      {/* ══════════════════════════════════════════
          ADMIN — Status change (bottom, minimal)
      ══════════════════════════════════════════ */}
      {isAdmin && (
        <Box
          sx={{
            pt: 3,
            borderTop: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography
            variant="caption"
            color="text.disabled"
            sx={{
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              fontWeight: 700,
              fontSize: '0.65rem',
              display: 'block',
              mb: 1.5,
            }}
          >
            {t('detail.adminPanel')}
          </Typography>
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel sx={{ fontSize: '0.85rem' }}>{t('detail.changeStatus')}</InputLabel>
            <Select
              value={statusValue || data.status}
              label={t('detail.changeStatus')}
              onChange={(e) => {
                const newStatus = e.target.value as Idea['status'];
                setStatusValue(newStatus);
                statusMutation.mutate(newStatus);
              }}
              sx={{ borderRadius: 2, fontSize: '0.85rem' }}
            >
              <MenuItem value="open">{t('status.open')}</MenuItem>
              <MenuItem value="in_review">{t('status.in_review')}</MenuItem>
              <MenuItem value="converted">{t('status.converted')}</MenuItem>
            </Select>
          </FormControl>
        </Box>
      )}
    </Box>
  );
}
