import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Typography,
  Paper,
  Button,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Link,
  Avatar,
  Collapse,
  Divider,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  ThumbUp as LikeIcon,
  ThumbUpOffAlt as LikeOffIcon,
  Description as DocIcon,
  MenuBook as GuideIcon,
  Add as AddIcon,
  OpenInNew as OpenIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  Send as SendIcon,
  CheckCircle as DocumentedIcon,
  Delete as DeleteIcon,
  Link as LinkDocIcon,
} from '@mui/icons-material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { learnApi, type DocRequest } from '../api/learn.api';
import { useAuth } from '../../auth/AuthContext';
import { useMode } from '../../../shared/ModeContext';
import { AppMode } from '../../../shared/constants';

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

interface DocRequestsSectionProps {
  requests: DocRequest[];
  isLoading: boolean;
}

export default function DocRequestsSection({ requests, isLoading }: DocRequestsSectionProps) {
  const { t } = useTranslation('learn');
  const { user } = useAuth();
  const { mode } = useMode();
  const queryClient = useQueryClient();
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down('sm'));

  const isAdmin = mode === AppMode.ADMIN;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState<Record<string, string>>({});

  // ── Admin link dialog ───────────────────────────────────────────────────────
  const [linkTarget, setLinkTarget] = useState<string | null>(null);
  const [linkForm, setLinkForm] = useState({ url: '', title: '' });

  // ── Mutations ───────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: (data: { title: string; description: string }) => learnApi.createDocRequest(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learn-doc-requests'] });
      setDialogOpen(false);
      setTitle('');
      setDescription('');
    },
  });

  const likeMutation = useMutation({
    mutationFn: (id: string) => learnApi.toggleDocRequestLike(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['learn-doc-requests'] }),
  });

  const commentMutation = useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) =>
      learnApi.addDocRequestComment(id, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learn-doc-requests'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof learnApi.updateDocRequest>[1] }) =>
      learnApi.updateDocRequest(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learn-doc-requests'] });
      setLinkTarget(null);
      setLinkForm({ url: '', title: '' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => learnApi.deleteDocRequest(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['learn-doc-requests'] }),
  });

  const handleCreate = () => {
    if (!title.trim() || !description.trim()) return;
    createMutation.mutate({ title: title.trim(), description: description.trim() });
  };

  const handleComment = (reqId: string) => {
    const text = commentText[reqId]?.trim();
    if (!text) return;
    commentMutation.mutate({ id: reqId, content: text });
    setCommentText((prev) => ({ ...prev, [reqId]: '' }));
  };

  const handleLinkDoc = () => {
    if (!linkTarget || !linkForm.url.trim()) return;
    updateMutation.mutate({
      id: linkTarget,
      data: {
        status: 'documented',
        linkedDocUrl: linkForm.url.trim(),
        linkedDocTitle: linkForm.title.trim() || undefined,
      },
    });
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button
          variant="outlined"
          size="small"
          startIcon={<AddIcon />}
          onClick={() => setDialogOpen(true)}
        >
          {t('docRequests.requestButton')}
        </Button>
      </Box>

      {!isLoading && requests.length === 0 && (
        <Box sx={{ py: 6, textAlign: 'center', color: 'text.disabled' }}>
          <GuideIcon sx={{ fontSize: 48, mb: 1, opacity: 0.3 }} />
          <Typography variant="body2">{t('docRequests.empty')}</Typography>
        </Box>
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {requests.map((req) => {
          const hasLiked = user?.id ? req.likeIds.includes(user.id) : false;
          const likeCount = req.likeIds.length;
          const isExpanded = expandedId === req.id;

          return (
            <Paper
              key={req.id}
              elevation={0}
              sx={{
                border: '1px solid',
                borderColor: req.status === 'documented' ? 'success.light' : 'divider',
                borderRadius: 2.5,
                overflow: 'hidden',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, px: 2.5, py: 2 }}>
                {/* Like column */}
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', pt: 0.25 }}>
                  <Tooltip title={t('docRequests.like')}>
                    <IconButton
                      size="small"
                      onClick={() => likeMutation.mutate(req.id)}
                      disabled={likeMutation.isPending}
                      color={hasLiked ? 'primary' : 'default'}
                    >
                      {hasLiked ? <LikeIcon fontSize="small" /> : <LikeOffIcon fontSize="small" />}
                    </IconButton>
                  </Tooltip>
                  <Typography variant="caption" fontWeight={600} color={hasLiked ? 'primary.main' : 'text.secondary'}>
                    {likeCount}
                  </Typography>
                </Box>

                {/* Content */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
                    <Typography variant="subtitle2" fontWeight={600}>
                      {req.title}
                    </Typography>
                    <Chip
                      label={t(`docRequests.${req.status}`)}
                      size="small"
                      color={req.status === 'documented' ? 'success' : 'default'}
                      variant={req.status === 'documented' ? 'filled' : 'outlined'}
                      sx={{ height: 20, fontSize: '0.625rem' }}
                    />
                  </Box>
                  {req.description && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {req.description}
                    </Typography>
                  )}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <Typography variant="caption" color="text.disabled">
                      {t('docRequests.by', { name: req.requestedByName })} · {timeAgo(req.createdAt)}
                    </Typography>
                    {req.linkedDocUrl && (
                      <Link
                        href={req.linkedDocUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        variant="caption"
                        sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}
                      >
                        {req.linkedDocTitle ?? t('docRequests.linkedDoc')}
                        <OpenIcon sx={{ fontSize: 12 }} />
                      </Link>
                    )}
                    {req.comments.length > 0 && (
                      <Typography variant="caption" color="text.secondary">
                        · {t('docRequests.comments', { count: req.comments.length })}
                      </Typography>
                    )}
                  </Box>
                </Box>

                <IconButton size="small" onClick={() => setExpandedId(isExpanded ? null : req.id)}>
                  {isExpanded ? <CollapseIcon fontSize="small" /> : <ExpandIcon fontSize="small" />}
                </IconButton>
              </Box>

              {/* Expanded: comments + admin actions */}
              <Collapse in={isExpanded} unmountOnExit>
                <Divider />
                <Box sx={{ px: 2.5, py: 1.5 }}>
                  {/* Comments */}
                  {req.comments.length === 0 && (
                    <Typography variant="caption" color="text.disabled" sx={{ display: 'block', py: 1 }}>
                      {t('docRequests.noComments')}
                    </Typography>
                  )}
                  {req.comments.map((c) => (
                    <Box key={c.id} sx={{ display: 'flex', gap: 1, py: 1, pl: 1 }}>
                      <Avatar sx={{ width: 22, height: 22, fontSize: '0.65rem', bgcolor: 'grey.400' }}>
                        {c.authorName.charAt(0)}
                      </Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontSize: '0.8125rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                          {c.content}
                        </Typography>
                        <Typography variant="caption" color="text.disabled">
                          {c.authorName} · {timeAgo(c.createdAt)}
                        </Typography>
                      </Box>
                    </Box>
                  ))}

                  {/* Comment input */}
                  <Box sx={{ display: 'flex', gap: 1, mt: 1.5, alignItems: 'center' }}>
                    <TextField
                      fullWidth
                      size="small"
                      placeholder={t('docRequests.commentPlaceholder')}
                      value={commentText[req.id] ?? ''}
                      onChange={(e) => setCommentText((prev) => ({ ...prev, [req.id]: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleComment(req.id);
                        }
                      }}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                    <IconButton
                      color="primary"
                      size="small"
                      onClick={() => handleComment(req.id)}
                      disabled={!(commentText[req.id]?.trim()) || commentMutation.isPending}
                      sx={{ minWidth: 36, minHeight: 36 }}
                    >
                      <SendIcon fontSize="small" />
                    </IconButton>
                  </Box>

                  {/* Admin actions */}
                  {isAdmin && (
                    <Box sx={{ display: 'flex', gap: 1, mt: 2, pt: 1.5, borderTop: '1px solid', borderColor: 'divider', justifyContent: 'flex-end' }}>
                      {req.status === 'open' && (
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<LinkDocIcon />}
                          onClick={() => setLinkTarget(req.id)}
                        >
                          {t('docRequests.linkDoc')}
                        </Button>
                      )}
                      <Tooltip title={t('docRequests.delete')}>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => deleteMutation.mutate(req.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  )}
                </Box>
              </Collapse>
            </Paper>
          );
        })}
      </Box>

      {/* ── Create dialog (title + description) ──────────────────────────── */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        fullWidth
        maxWidth="sm"
        fullScreen={isXs}
      >
        <DialogTitle>{t('docRequests.requestButton')}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
          <TextField
            label={t('docRequests.titleLabel')}
            helperText={t('docRequests.titleHelper')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            fullWidth
            size="small"
          />
          <TextField
            label={t('docRequests.descriptionLabel')}
            helperText={t('docRequests.descriptionHelper')}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            size="small"
            multiline
            rows={3}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>{t('docRequests.cancel')}</Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={!title.trim() || !description.trim() || createMutation.isPending}
          >
            {t('docRequests.submit')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Admin link doc dialog ────────────────────────────────────────────── */}
      <Dialog
        open={!!linkTarget}
        onClose={() => setLinkTarget(null)}
        fullWidth
        maxWidth="sm"
        fullScreen={isXs}
      >
        <DialogTitle>{t('docRequests.linkDoc')}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
          <TextField
            label={t('docRequests.docUrlLabel')}
            value={linkForm.url}
            onChange={(e) => setLinkForm((f) => ({ ...f, url: e.target.value }))}
            fullWidth
            size="small"
          />
          <TextField
            label={t('docRequests.docTitleLabel')}
            value={linkForm.title}
            onChange={(e) => setLinkForm((f) => ({ ...f, title: e.target.value }))}
            fullWidth
            size="small"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLinkTarget(null)}>{t('docRequests.cancel')}</Button>
          <Button
            variant="contained"
            onClick={handleLinkDoc}
            disabled={!linkForm.url.trim() || updateMutation.isPending}
          >
            {t('docRequests.markDocumented')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
