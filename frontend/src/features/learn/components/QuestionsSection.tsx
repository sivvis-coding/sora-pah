import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  TextField,
  IconButton,
  Chip,
  Collapse,
  Divider,
  Avatar,
  Tooltip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Send as SendIcon,
  CheckCircle as ResolvedIcon,
  CheckCircleOutline as AcceptIcon,
  QuestionAnswer as AnswerIcon,
  Delete as DeleteIcon,
  Done as DoneIcon,
  Add as AddIcon,
  SmartToy as BotIcon,
} from '@mui/icons-material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { learnApi, type Question } from '../api/learn.api';
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

interface QuestionsSectionProps {
  questions: Question[];
  isLoading: boolean;
}

export default function QuestionsSection({ questions, isLoading }: QuestionsSectionProps) {
  const { t } = useTranslation('learn');
  const { user } = useAuth();
  const { mode } = useMode();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down('sm'));
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<Record<string, string>>({});

  const isAdmin = mode === AppMode.ADMIN;

  // ── Create dialog ───────────────────────────────────────────────────────────
  const [dialogOpen, setDialogOpen] = useState(false);
  const [questionText, setQuestionText] = useState('');

  const createMutation = useMutation({
    mutationFn: (content: string) => learnApi.createQuestion(content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learn-questions'] });
      setDialogOpen(false);
      setQuestionText('');
    },
  });

  const answerMutation = useMutation({
    mutationFn: ({ qId, content }: { qId: string; content: string }) =>
      learnApi.addAnswer(qId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learn-questions'] });
    },
  });

  const acceptMutation = useMutation({
    mutationFn: ({ qId, aId }: { qId: string; aId: string }) =>
      learnApi.acceptAnswer(qId, aId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learn-questions'] });
    },
  });

  const resolveMutation = useMutation({
    mutationFn: (qId: string) => learnApi.resolveQuestion(qId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learn-questions'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (qId: string) => learnApi.deleteQuestion(qId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learn-questions'] });
    },
  });

  const handleCreate = () => {
    const text = questionText.trim();
    if (!text) return;
    createMutation.mutate(text);
  };

  /** Intercept clicks on internal links in bot answers (e.g. /docs?doc=X&page=Y) */
  const handleBotContentClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const anchor = (e.target as HTMLElement).closest('a');
    if (!anchor) return;
    const href = anchor.getAttribute('href');
    if (!href) return;
    // Internal route — navigate with react-router
    if (href.startsWith('/')) {
      e.preventDefault();
      navigate(href);
    }
  }, [navigate]);

  const handleReply = (questionId: string) => {
    const text = replyText[questionId]?.trim();
    if (!text) return;
    answerMutation.mutate({ qId: questionId, content: text });
    setReplyText((prev) => ({ ...prev, [questionId]: '' }));
  };

  return (
    <Box>
      {/* Create button */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button
          variant="outlined"
          size="small"
          startIcon={<AddIcon />}
          onClick={() => setDialogOpen(true)}
        >
          {t('questions.askButton')}
        </Button>
      </Box>

      {!isLoading && questions.length === 0 && (
        <Box sx={{ py: 6, textAlign: 'center', color: 'text.disabled' }}>
          <AnswerIcon sx={{ fontSize: 48, mb: 1, opacity: 0.3 }} />
          <Typography variant="body2">{t('questions.empty')}</Typography>
        </Box>
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {questions.map((q) => {
          const isExpanded = expandedId === q.id;
          const isOwner = user?.id === q.authorId;
          const canDelete = isOwner || isAdmin;
          const hasBotAnswer = q.answers.some((a) => a.isBot);

          return (
            <Paper
              key={q.id}
              elevation={0}
              sx={{
                border: '1px solid',
                borderColor: q.resolved ? 'success.light' : 'divider',
                borderRadius: 2.5,
                overflow: 'hidden',
                transition: 'border-color 0.2s',
              }}
            >
              {/* Question header */}
              <Box
                onClick={() => setExpandedId(isExpanded ? null : q.id)}
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 1.5,
                  px: 2.5,
                  py: 2,
                  cursor: 'pointer',
                  '&:hover': { bgcolor: 'action.hover' },
                }}
              >
                <Avatar sx={{ width: 32, height: 32, fontSize: '0.8rem', bgcolor: 'primary.main', mt: 0.25 }}>
                  {q.authorName.charAt(0)}
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" sx={{ lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {q.content}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.75, flexWrap: 'wrap' }}>
                    <Typography variant="caption" color="text.secondary">
                      {q.authorName} · {timeAgo(q.createdAt)}
                    </Typography>
                    {q.resolved && (
                      <Chip
                        icon={<ResolvedIcon />}
                        label={t('questions.resolved')}
                        size="small"
                        color="success"
                        variant="outlined"
                        sx={{ height: 20, fontSize: '0.6875rem', '& .MuiChip-icon': { fontSize: 14 } }}
                      />
                    )}
                    {hasBotAnswer && !q.resolved && (
                      <Chip
                        icon={<BotIcon />}
                        label="AI"
                        size="small"
                        color="info"
                        variant="outlined"
                        sx={{ height: 20, fontSize: '0.625rem', '& .MuiChip-icon': { fontSize: 13 } }}
                      />
                    )}
                  </Box>
                </Box>
                <Chip
                  label={t('questions.answers', { count: q.answers.length })}
                  size="small"
                  variant="outlined"
                  sx={{ height: 22, fontSize: '0.6875rem', flexShrink: 0 }}
                />
              </Box>

              {/* Answers */}
              <Collapse in={isExpanded} unmountOnExit>
                <Divider />
                <Box sx={{ px: 2.5, py: 1.5 }}>
                  {q.answers.length === 0 && (
                    <Typography variant="caption" color="text.disabled" sx={{ display: 'block', py: 1 }}>
                      {t('questions.answers', { count: 0 })}
                    </Typography>
                  )}

                  {q.answers.map((a) => (
                    <Box
                      key={a.id}
                      sx={{
                        display: 'flex',
                        gap: 1.5,
                        py: 1.25,
                        pl: 1,
                        borderLeft: a.isAccepted
                          ? '3px solid'
                          : a.isBot
                            ? '3px solid'
                            : '3px solid transparent',
                        borderColor: a.isAccepted
                          ? 'success.main'
                          : a.isBot
                            ? 'info.main'
                            : 'transparent',
                        mb: 0.5,
                        ...(a.isBot && {
                          bgcolor: 'action.hover',
                          borderRadius: 1,
                          mx: -0.5,
                          px: 1.5,
                        }),
                      }}
                    >
                      <Avatar
                        sx={{
                          width: 24,
                          height: 24,
                          fontSize: '0.7rem',
                          bgcolor: a.isBot ? 'info.main' : 'grey.400',
                        }}
                      >
                        {a.isBot ? <BotIcon sx={{ fontSize: 14 }} /> : a.authorName.charAt(0)}
                      </Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        {a.isBot ? (
                          <Box
                            onClick={handleBotContentClick}
                            sx={{
                              fontSize: '0.8125rem',
                              lineHeight: 1.6,
                              '& p': { m: 0, mb: 0.5 },
                              '& p:last-child': { mb: 0 },
                              '& a': { color: 'primary.main', textDecoration: 'underline', cursor: 'pointer' },
                              '& ul, & ol': { pl: 2.5, my: 0.5 },
                              '& code': { bgcolor: 'action.hover', px: 0.5, borderRadius: 0.5, fontSize: '0.75rem' },
                            }}
                          >
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{a.content}</ReactMarkdown>
                          </Box>
                        ) : (
                          <Typography variant="body2" sx={{ fontSize: '0.8125rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                            {a.content}
                          </Typography>
                        )}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                          <Typography variant="caption" color="text.secondary">
                            {a.authorName} · {timeAgo(a.createdAt)}
                          </Typography>
                          {a.isBot && (
                            <Chip
                              icon={<BotIcon />}
                              label={t('questions.botAnswer')}
                              size="small"
                              color="info"
                              variant="outlined"
                              sx={{ height: 18, fontSize: '0.6rem', '& .MuiChip-icon': { fontSize: 12 } }}
                            />
                          )}
                          {a.isAccepted && (
                            <Chip
                              icon={<ResolvedIcon />}
                              label={t('questions.accepted')}
                              size="small"
                              color="success"
                              sx={{ height: 18, fontSize: '0.625rem', '& .MuiChip-icon': { fontSize: 12 } }}
                            />
                          )}
                          {isOwner && !q.resolved && !a.isAccepted && (
                            <Tooltip title={t('questions.accept')}>
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  acceptMutation.mutate({ qId: q.id, aId: a.id });
                                }}
                                sx={{ ml: 'auto' }}
                              >
                                <AcceptIcon fontSize="small" color="action" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                      </Box>
                    </Box>
                  ))}

                  {/* Reply input */}
                  <Box sx={{ display: 'flex', gap: 1, mt: 1.5, alignItems: 'center' }}>
                    <TextField
                      fullWidth
                      size="small"
                      placeholder={t('questions.replyPlaceholder')}
                      value={replyText[q.id] ?? ''}
                      onChange={(e) => setReplyText((prev) => ({ ...prev, [q.id]: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleReply(q.id);
                        }
                      }}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                    <IconButton
                      color="primary"
                      size="small"
                      onClick={() => handleReply(q.id)}
                      disabled={!(replyText[q.id]?.trim()) || answerMutation.isPending}
                      sx={{ minWidth: 36, minHeight: 36 }}
                    >
                      <SendIcon fontSize="small" />
                    </IconButton>
                  </Box>

                  {/* Owner/admin actions */}
                  {(isOwner || canDelete) && (
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 1.5, pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
                      {isOwner && !q.resolved && (
                        <Tooltip title={t('questions.markResolved')}>
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => resolveMutation.mutate(q.id)}
                            disabled={resolveMutation.isPending}
                          >
                            <DoneIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      {canDelete && (
                        <Tooltip title={t('questions.delete')}>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => deleteMutation.mutate(q.id)}
                            disabled={deleteMutation.isPending}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  )}
                </Box>
              </Collapse>
            </Paper>
          );
        })}
      </Box>

      {/* ── Create dialog ────────────────────────────────────────────────────── */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        fullWidth
        maxWidth="sm"
        fullScreen={isXs}
      >
        <DialogTitle>{t('questions.askButton')}</DialogTitle>
        <DialogContent sx={{ pt: '16px !important' }}>
          <TextField
            label={t('questions.askLabel')}
            helperText={t('questions.askHelper')}
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            fullWidth
            size="small"
            multiline
            rows={3}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey) {
                e.preventDefault();
                handleCreate();
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>{t('questions.cancel')}</Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={!questionText.trim() || createMutation.isPending}
          >
            {t('questions.submit')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
