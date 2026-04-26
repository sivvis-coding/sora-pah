import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  InputAdornment,
  Paper,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  AutoAwesome as AIIcon,
  Send as SendIcon,
  Search as SearchIcon,
  ThumbUp as VoteIcon,
  OpenInNew as ClickUpIcon,
  CheckCircle as ImplementedIcon,
  Cancel as DiscardIcon,
  ArrowBack as BackIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { ideasApi, type Idea } from '../../ideas/api/ideas.api';
import { aiApi, type UserStory, type ChatMessage } from '../../ideas/api/ai.api';
// ─── Types ────────────────────────────────────────────────────────────────────

type SortBy = 'votes' | 'newest';

interface WorkspaceMessage {
  id: string;
  from: 'user' | 'ai';
  text: string;
  story?: UserStory;
}

function uid() { return Math.random().toString(36).slice(2); }

// ─── Status chip ──────────────────────────────────────────────────────────────

function StatusChip({ status }: { status: Idea['status'] }) {
  const { t } = useTranslation('admin');
  const map: Record<Idea['status'], { color: 'default' | 'warning' | 'success' | 'error'; label: string }> = {
    open:        { color: 'warning', label: t('ws.status.open') },
    backlog:     { color: 'default', label: t('ws.status.backlog') },
    implemented: { color: 'success', label: t('ws.status.implemented') },
    discarded:   { color: 'error',   label: t('ws.status.discarded') },
  };
  const { color, label } = map[status] ?? map.open;
  return <Chip label={label} color={color} size="small" variant="outlined" />;
}

// ─── Idea selector ────────────────────────────────────────────────────────────

function IdeaSelector({
  onSelect,
}: {
  onSelect: (idea: Idea) => void;
}) {
  const { t } = useTranslation('admin');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('votes');
  const [personFilter, setPersonFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['ideas'],
    queryFn: ideasApi.list,
  });

  const ideas = data?.ideas ?? [];

  const filtered = ideas
    .filter((idea) => {
      const q = search.toLowerCase();
      const matchesSearch = !q
        || idea.title.toLowerCase().includes(q)
        || idea.description.toLowerCase().includes(q);
      const matchesPerson = !personFilter
        || (idea.author?.name ?? '').toLowerCase().includes(personFilter.toLowerCase());
      return matchesSearch && matchesPerson;
    })
    .sort((a, b) =>
      sortBy === 'votes'
        ? b.voteCount - a.voteCount
        : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

  return (
    <Box>
      <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5 }}>
        {t('ws.selector.title')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
        {t('ws.selector.subtitle')}
      </Typography>

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mb: 2 }}>
        <TextField
          size="small"
          placeholder={t('ws.selector.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: 220 }}
        />
        <TextField
          size="small"
          placeholder={t('ws.selector.personPlaceholder')}
          value={personFilter}
          onChange={(e) => setPersonFilter(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <PersonIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: 180 }}
        />
        <Box sx={{ display: 'flex', gap: 1 }}>
          {(['votes', 'newest'] as SortBy[]).map((s) => (
            <Chip
              key={s}
              label={t(`ws.selector.sort.${s}`)}
              variant={sortBy === s ? 'filled' : 'outlined'}
              color={sortBy === s ? 'primary' : 'default'}
              onClick={() => setSortBy(s)}
              size="small"
              sx={{ height: 36 }}
            />
          ))}
        </Box>
      </Box>

      {/* Ideas list */}
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={28} />
        </Box>
      ) : filtered.length === 0 ? (
        <Typography variant="body2" color="text.disabled" sx={{ py: 4, textAlign: 'center', fontStyle: 'italic' }}>
          {t('ws.selector.empty')}
        </Typography>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {filtered.map((idea) => (
            <Paper
              key={idea.id}
              variant="outlined"
              onClick={() => onSelect(idea)}
              sx={{
                p: 2,
                borderRadius: 2,
                cursor: 'pointer',
                transition: 'all 0.15s',
                '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
                    <Typography variant="body2" fontWeight={700} sx={{ lineHeight: 1.3 }}>
                      {idea.title}
                    </Typography>
                    <StatusChip status={idea.status} />
                    {idea.category && (
                      <Chip
                        label={idea.category.name}
                        size="small"
                        sx={{
                          height: 18,
                          fontSize: '0.65rem',
                          bgcolor: idea.category.color ?? undefined,
                          color: idea.category.color ? 'white' : undefined,
                        }}
                      />
                    )}
                  </Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                  >
                    {idea.description}
                  </Typography>
                  {idea.author && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.75 }}>
                      {idea.author.photoBase64 ? (
                        <Avatar src={`data:image/jpeg;base64,${idea.author.photoBase64}`} sx={{ width: 16, height: 16 }} />
                      ) : (
                        <Avatar sx={{ width: 16, height: 16, fontSize: '0.55rem' }}>
                          {idea.author.name[0]}
                        </Avatar>
                      )}
                      <Typography variant="caption" color="text.disabled">
                        {idea.author.name}
                        {idea.author.department ? ` · ${idea.author.department}` : ''}
                      </Typography>
                    </Box>
                  )}
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0, color: 'text.disabled' }}>
                  <VoteIcon sx={{ fontSize: 14 }} />
                  <Typography variant="caption" fontWeight={700}>{idea.voteCount}</Typography>
                </Box>
              </Box>
            </Paper>
          ))}
        </Box>
      )}
    </Box>
  );
}

// ─── UserStory display card ───────────────────────────────────────────────────

function StoryCard({ story }: { story: UserStory }) {
  const { t } = useTranslation('admin');
  const fields: { label: string; value: string; mono?: boolean }[] = [
    { label: t('ws.story.statement'), value: story.userStoryStatement },
    { label: t('ws.story.functional'), value: story.functionalDescription },
    { label: t('ws.story.acceptance'), value: story.acceptanceCriteriaInGherkin, mono: true },
    ...(story.constraints ? [{ label: t('ws.story.constraints'), value: story.constraints }] : []),
    ...(story.outOfScope ? [{ label: t('ws.story.outOfScope'), value: story.outOfScope }] : []),
  ];
  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden', mt: 1.5 }}>
      <Box sx={{ px: 2, py: 1.25, bgcolor: 'primary.50', borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1 }}>
        <AIIcon sx={{ fontSize: 15, color: 'primary.main' }} />
        <Typography variant="caption" fontWeight={800} color="primary.main" sx={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {story.title}
        </Typography>
      </Box>
      {fields.map((f, i) => (
        <Box key={f.label} sx={{ px: 2, py: 1.5, borderBottom: i < fields.length - 1 ? '1px solid' : 'none', borderColor: 'divider' }}>
          <Typography sx={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'text.disabled', mb: 0.5 }}>
            {f.label}
          </Typography>
          <Typography
            variant="body2"
            component={f.mono ? 'pre' : 'p'}
            sx={{ lineHeight: 1.7, whiteSpace: 'pre-wrap', m: 0, fontFamily: f.mono ? 'monospace' : undefined, fontSize: f.mono ? '0.8rem' : undefined }}
          >
            {f.value}
          </Typography>
        </Box>
      ))}
    </Paper>
  );
}

// ─── Discard dialog ───────────────────────────────────────────────────────────

function DiscardDialog({
  open,
  onClose,
  onConfirm,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  loading: boolean;
}) {
  const { t } = useTranslation('admin');
  const [reason, setReason] = useState('');

  useEffect(() => { if (!open) setReason(''); }, [open]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle fontWeight={700}>{t('ws.discard.title')}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t('ws.discard.subtitle')}
        </Typography>
        <TextField
          fullWidth
          multiline
          minRows={3}
          label={t('ws.discard.reasonLabel')}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          autoFocus
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit">{t('ws.discard.cancel')}</Button>
        <Button
          variant="contained"
          color="error"
          disabled={!reason.trim() || loading}
          onClick={() => onConfirm(reason.trim())}
        >
          {loading ? <CircularProgress size={16} color="inherit" /> : t('ws.discard.confirm')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Chat workspace ───────────────────────────────────────────────────────────

function ChatWorkspace({
  idea,
  onBack,
}: {
  idea: Idea;
  onBack: () => void;
}) {
  const { t } = useTranslation('admin');
  const queryClient = useQueryClient();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [messages, setMessages] = useState<WorkspaceMessage[]>([
    {
      id: uid(),
      from: 'ai',
      text: idea.userStory
        ? t('ws.chat.welcomeExisting', { title: idea.title })
        : t('ws.chat.welcome', { title: idea.title }),
    },
  ]);
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [currentStory, setCurrentStory] = useState<UserStory | null>(
    idea.userStory as UserStory | null,
  );
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [clickUpResult, setClickUpResult] = useState<{ taskUrl: string } | null>(null);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);
  const generateStory = async (currentHistory: ChatMessage[]) => {
    setGenerating(true);
    try {
      const story = await aiApi.generateUserStory({
        title: idea.title,
        description: idea.description,
        problem: idea.problem,
        value: idea.value,
        solutionIdea: idea.solutionIdea ?? undefined,
      });
      setCurrentStory(story);

      // Persist to Cosmos — fire and forget, non-blocking
      ideasApi.updateUserStory(idea.id, story).catch(() => {
        // non-critical — US is in state anyway
      });

      const aiMsg: WorkspaceMessage = {
        id: uid(),
        from: 'ai',
        text: t('ws.chat.storyGenerated'),
        story,
      };
      setMessages((prev) => [...prev, aiMsg]);
      setHistory((prev) => [...prev, { role: 'assistant', content: `[User Story generada]\n${JSON.stringify(story)}` }]);
    } catch {
      setMessages((prev) => [...prev, { id: uid(), from: 'ai', text: t('ws.chat.generateError') }]);
    }
    setGenerating(false);
  };

  // ─── Chat with AI to refine ─────────────────────────────────────────────────

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || loading || !currentStory) return;
    setInput('');

    const userMsg: WorkspaceMessage = { id: uid(), from: 'user', text };
    setMessages((prev) => [...prev, userMsg]);

    const updatedHistory: ChatMessage[] = [...history, { role: 'user', content: text }];
    setHistory(updatedHistory);

    setLoading(true);
    try {
      // Build a context-aware prompt that includes the current story
      const contextPrompt = currentStory
        ? `Contexto actual de la User Story:\n${JSON.stringify(currentStory, null, 2)}\n\nSolicitud del PO: ${text}`
        : text;

      const res = await aiApi.askQuestion(contextPrompt, updatedHistory.slice(0, -1));
      const aiReply = res.answer;

      // Try to extract an updated story from the response if it contains JSON
      let updatedStory: UserStory | undefined;
      try {
        const jsonMatch = aiReply.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[1]) as UserStory;
          if (parsed.userStoryStatement) {
            updatedStory = parsed;
            setCurrentStory(parsed);
          }
        }
      } catch { /* no JSON in response, that's fine */ }

      setMessages((prev) => [...prev, { id: uid(), from: 'ai', text: aiReply, story: updatedStory }]);
      setHistory((prev) => [...prev, { role: 'assistant', content: aiReply }]);
    } catch {
      setMessages((prev) => [...prev, { id: uid(), from: 'ai', text: t('ws.chat.error') }]);
    }
    setLoading(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [input, loading, history, currentStory, t]);

  // ─── Status mutations ───────────────────────────────────────────────────────

  const statusMutation = useMutation({
    mutationFn: ({ status, reason }: { status: Idea['status']; reason?: string }) =>
      ideasApi.updateStatus(idea.id, status, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ideas'] });
      setStatusError(null);
    },
    onError: () => setStatusError(t('ws.actions.statusError')),
  });

  const clickUpMutation = useMutation({
    mutationFn: () => {
      if (!currentStory) throw new Error('No story');
      return aiApi.sendToClickUp(idea.id, currentStory);
    },
    onSuccess: (result) => {
      setClickUpResult(result);
      queryClient.invalidateQueries({ queryKey: ['ideas'] });
    },
  });

  const isDiscarded = statusMutation.data?.status === 'discarded' || idea.status === 'discarded';
  const isImplemented = statusMutation.data?.status === 'implemented' || idea.status === 'implemented';
  const isSentToClickUp = !!clickUpResult || idea.status === 'backlog';

  return (
    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3, height: '100%' }}>

      {/* ── Left: idea info + actions ──────────────────────────────────────── */}
      <Box sx={{ width: { md: 280 }, flexShrink: 0 }}>
        <Button
          startIcon={<BackIcon />}
          onClick={onBack}
          size="small"
          color="inherit"
          sx={{ mb: 2, textTransform: 'none', color: 'text.secondary' }}
        >
          {t('ws.back')}
        </Button>

        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ lineHeight: 1.4, flex: 1, mr: 1 }}>
              {idea.title}
            </Typography>
            <StatusChip status={statusMutation.data?.status ?? idea.status} />
          </Box>

          {idea.author && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1.5 }}>
              {idea.author.photoBase64 ? (
                <Avatar src={`data:image/jpeg;base64,${idea.author.photoBase64}`} sx={{ width: 20, height: 20 }} />
              ) : (
                <Avatar sx={{ width: 20, height: 20, fontSize: '0.65rem' }}>{idea.author.name[0]}</Avatar>
              )}
              <Typography variant="caption" color="text.secondary">
                {idea.author.name}
                {idea.author.jobTitle ? ` · ${idea.author.jobTitle}` : ''}
              </Typography>
            </Box>
          )}

          {/* Idea fields */}
          {[
            { labelKey: 'ws.idea.description', value: idea.description },
            { labelKey: 'ws.idea.problem',     value: idea.problem },
            { labelKey: 'ws.idea.value',        value: idea.value },
            ...(idea.solutionIdea ? [{ labelKey: 'ws.idea.solution', value: idea.solutionIdea }] : []),
          ].map(({ labelKey, value }) => (
            <Box key={labelKey} sx={{ mb: 1.5 }}>
              <Typography sx={{ fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'text.disabled', mb: 0.25 }}>
                {t(labelKey)}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem', lineHeight: 1.6 }}>
                {value}
              </Typography>
            </Box>
          ))}

          {/* Category + votes */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 2 }}>
            {idea.category && (
              <Chip
                label={idea.category.name}
                size="small"
                variant="outlined"
                sx={{
                  height: 20, fontSize: '0.65rem',
                  ...(idea.category.color ? { borderColor: idea.category.color, color: idea.category.color } : {}),
                }}
              />
            )}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <VoteIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
              <Typography variant="caption" color="text.disabled" fontWeight={700}>
                {idea.voteCount} {t('ws.votes')}
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ mb: 2 }} />

          {/* Actions */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {/* Generate US */}
            {!isDiscarded && !isImplemented && (
              <Button
                fullWidth
                variant={currentStory ? 'outlined' : 'contained'}
                size="small"
                startIcon={generating ? <CircularProgress size={14} color="inherit" /> : <AIIcon />}
                disabled={generating}
                onClick={() => {
                  generateStory([]);
                }}
                sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
              >
                {generating
                  ? t('ws.actions.generating')
                  : currentStory
                    ? t('ws.actions.regenerate')
                    : t('ws.actions.generate')}
              </Button>
            )}

            {/* Send to ClickUp */}
            {!isDiscarded && (
              <Button
                fullWidth
                variant="contained"
                size="small"
                startIcon={clickUpMutation.isPending ? <CircularProgress size={14} color="inherit" /> : <ClickUpIcon />}
                disabled={!currentStory || clickUpMutation.isPending || isSentToClickUp}
                onClick={() => clickUpMutation.mutate()}
                sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
              >
                {isSentToClickUp ? t('ws.actions.sentToClickUp') : t('ws.actions.sendToClickUp')}
              </Button>
            )}

            {clickUpResult && (
              <Button
                fullWidth
                variant="outlined"
                size="small"
                startIcon={<ClickUpIcon />}
                href={clickUpResult.taskUrl}
                target="_blank"
                rel="noopener noreferrer"
                sx={{ textTransform: 'none', borderRadius: 2 }}
              >
                {t('ws.actions.viewInClickUp')}
              </Button>
            )}

            {/* Mark implemented */}
            {!isDiscarded && !isImplemented && (
              <Button
                fullWidth
                variant="outlined"
                size="small"
                color="success"
                startIcon={statusMutation.isPending ? <CircularProgress size={14} color="inherit" /> : <ImplementedIcon />}
                disabled={statusMutation.isPending}
                onClick={() => statusMutation.mutate({ status: 'implemented' })}
                sx={{ textTransform: 'none', borderRadius: 2 }}
              >
                {t('ws.actions.markImplemented')}
              </Button>
            )}

            {/* Discard */}
            {!isDiscarded && !isImplemented && (
              <Button
                fullWidth
                variant="outlined"
                size="small"
                color="error"
                startIcon={<DiscardIcon />}
                onClick={() => setDiscardOpen(true)}
                sx={{ textTransform: 'none', borderRadius: 2 }}
              >
                {t('ws.actions.discard')}
              </Button>
            )}

            {/* Discard reason display */}
            {isDiscarded && (statusMutation.data?.discardReason ?? idea.discardReason) && (
              <Alert severity="error" sx={{ borderRadius: 2, mt: 0.5 }}>
                <Typography variant="caption">
                  {statusMutation.data?.discardReason ?? idea.discardReason}
                </Typography>
              </Alert>
            )}

            {statusError && <Alert severity="error" sx={{ borderRadius: 2 }}>{statusError}</Alert>}
            {clickUpMutation.isError && <Alert severity="error" sx={{ borderRadius: 2 }}>{t('ws.actions.clickUpError')}</Alert>}
          </Box>
        </Paper>
      </Box>

      {/* ── Right: chat + story ────────────────────────────────────────────── */}
      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <Typography variant="subtitle2" fontWeight={700} color="text.secondary" sx={{ mb: 1.5, textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.7rem' }}>
          {t('ws.chat.title')}
        </Typography>

        {/* Messages */}
        <Box sx={{ flex: 1, overflowY: 'auto', maxHeight: { xs: 400, md: 520 }, mb: 2, pr: 0.5 }}>
          {messages.map((msg) => (
            <Box
              key={msg.id}
              sx={{ mb: 2, display: 'flex', flexDirection: 'column', alignItems: msg.from === 'user' ? 'flex-end' : 'flex-start' }}
            >
              <Paper
                elevation={0}
                sx={{
                  px: 2,
                  py: 1.25,
                  maxWidth: '88%',
                  borderRadius: msg.from === 'ai' ? '4px 14px 14px 14px' : '14px 4px 14px 14px',
                  bgcolor: msg.from === 'ai' ? 'background.paper' : 'primary.main',
                  border: msg.from === 'ai' ? '1px solid' : 'none',
                  borderColor: 'divider',
                  color: msg.from === 'ai' ? 'text.primary' : 'primary.contrastText',
                }}
              >
                <Typography variant="body2" sx={{ lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                  {msg.text}
                </Typography>
              </Paper>
              {/* Inline story card */}
              {msg.story && (
                <Box sx={{ maxWidth: '95%', width: '100%' }}>
                  <StoryCard story={msg.story} />
                </Box>
              )}
            </Box>
          ))}
          {(loading || generating) && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pl: 0.5 }}>
              <CircularProgress size={16} />
              <Typography variant="caption" color="text.disabled">
                {generating ? t('ws.chat.generating') : t('ws.chat.thinking')}
              </Typography>
            </Box>
          )}
          <div ref={endRef} />
        </Box>

        {/* Current story summary (sticky at bottom) */}
        {currentStory && !generating && (
          <Collapse in unmountOnExit>
            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, mb: 1.5, borderColor: 'primary.light', bgcolor: 'primary.50' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
                <AIIcon sx={{ fontSize: 14, color: 'primary.main' }} />
                <Typography variant="caption" fontWeight={800} color="primary.main">
                  {t('ws.chat.currentStory')} · {currentStory.title}
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.5 }}>
                {currentStory.userStoryStatement}
              </Typography>
            </Paper>
          </Collapse>
        )}

        {/* Input */}
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
          <TextField
            inputRef={inputRef}
            fullWidth
            multiline
            minRows={2}
            maxRows={5}
            placeholder={currentStory ? t('ws.chat.placeholder') : t('ws.chat.placeholderDisabled')}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && input.trim()) {
                e.preventDefault();
                handleSend();
              }
            }}
            disabled={loading || generating || !currentStory}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5, fontSize: '0.9rem' } }}
          />
          <IconButton
            color="primary"
            onClick={handleSend}
            disabled={!input.trim() || loading || generating || !currentStory}
            sx={{
              width: 44, height: 44,
              bgcolor: input.trim() ? 'primary.main' : 'action.disabledBackground',
              color: input.trim() ? 'white' : 'action.disabled',
              '&:hover': { bgcolor: input.trim() ? 'primary.dark' : undefined },
              '&:disabled': { bgcolor: 'action.disabledBackground', color: 'action.disabled' },
              borderRadius: 2,
            }}
          >
            <SendIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>
        <Typography variant="caption" color="text.disabled" sx={{ mt: 0.75, pl: 0.5 }}>
          {t('ws.chat.hint')}
        </Typography>
      </Box>

      {/* Discard dialog */}
      <DiscardDialog
        open={discardOpen}
        onClose={() => setDiscardOpen(false)}
        loading={statusMutation.isPending}
        onConfirm={(reason) => {
          statusMutation.mutate({ status: 'discarded', reason });
          setDiscardOpen(false);
        }}
      />
    </Box>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function UserStoryWorkspace() {
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null);

  return (
    <Box>
      {selectedIdea ? (
        <ChatWorkspace
          idea={selectedIdea}
          onBack={() => setSelectedIdea(null)}
        />
      ) : (
        <IdeaSelector onSelect={setSelectedIdea} />
      )}
    </Box>
  );
}
