import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  Chip,
  Paper,
  Fade,
  Collapse,
  CircularProgress,
  Alert,
  AlertTitle,
  Divider,
  useTheme,
  useMediaQuery,
  LinearProgress,
} from '@mui/material';
import {
  Send as SendIcon,
  AutoAwesome as AIIcon,
  CheckCircleOutline as CheckIcon,
  BugReport as BugIcon,
  VisibilityOutlined as ViewIcon,
  ThumbUpAlt as VoteIcon,
  ArrowForward as ArrowIcon,
  LightbulbOutlined as IdeaIcon,
  Close as CloseIcon,
  MenuBook as DocIcon,
  EditOutlined as EditIcon,
  DeleteOutline as DiscardIcon,
  AttachFile as AttachIcon,
} from '@mui/icons-material';
import { ideasApi, type IdeasListResponse } from '../api/ideas.api';
import { aiApi, type IdeaImprovement, type SimilarIdea, type Guardrail } from '../api/ai.api';
import { useSetup, useAppLinks } from '../../setup/SetupProvider';
import TagInput from '../../tags/components/TagInput';
import IdeaCreated from './IdeaCreated';

// ─── Types ────────────────────────────────────────────────────────────────────

type Phase = 'chat' | 'review';

interface ConvoMessage {
  id: string;
  from: 'ai' | 'user';
  text: string;
  images?: string[];
}

interface Draft {
  need: string;
  why: string;
  how: string;
  tagIds: string[];
  module: string;
}

const EMPTY_DRAFT: Draft = { need: '', why: '', how: '', tagIds: [], module: '' };

// ─── Utilities ────────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2);
}

function aiMsg(text: string): ConvoMessage {
  return { id: uid(), from: 'ai', text };
}

const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
const MAX_IMAGES = 5;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB per image

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function filterImageFiles(files: FileList | File[]): File[] {
  return Array.from(files).filter(
    (f) => ACCEPTED_IMAGE_TYPES.includes(f.type) && f.size <= MAX_IMAGE_BYTES,
  );
}

// ─── ChatBubble ───────────────────────────────────────────────────────────────

function ChatBubble({ msg }: { msg: ConvoMessage }) {
  const isAi = msg.from === 'ai';
  return (
    <Fade in timeout={300}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: isAi ? 'flex-start' : 'flex-end',
          mb: 1.5,
        }}
      >
        {isAi && (
          <Box
            sx={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              bgcolor: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mr: 1,
              flexShrink: 0,
              mt: 0.25,
            }}
          >
            <AIIcon sx={{ fontSize: 14, color: 'white' }} />
          </Box>
        )}
        <Paper
          elevation={0}
          sx={{
            px: 2,
            py: 1.25,
            maxWidth: '82%',
            borderRadius: isAi ? '4px 14px 14px 14px' : '14px 4px 14px 14px',
            bgcolor: isAi ? 'background.paper' : 'primary.main',
            border: isAi ? '1px solid' : 'none',
            borderColor: 'divider',
            color: isAi ? 'text.primary' : 'primary.contrastText',
          }}
        >
          {msg.images && msg.images.length > 0 && (
            <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mb: msg.text ? 1 : 0 }}>
              {msg.images.map((src, i) => (
                <Box
                  key={i}
                  component="img"
                  src={src}
                  alt=""
                  sx={{
                    maxWidth: 180,
                    maxHeight: 140,
                    borderRadius: 1.5,
                    objectFit: 'cover',
                    cursor: 'pointer',
                  }}
                  onClick={() => window.open(src, '_blank')}
                />
              ))}
            </Box>
          )}
          {msg.text && (
            <Typography variant="body2" sx={{ lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
              {msg.text}
            </Typography>
          )}
        </Paper>
      </Box>
    </Fade>
  );
}

// ─── AI typing indicator ──────────────────────────────────────────────────────

function AiTyping() {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, pl: 0.5 }}>
      <Box
        sx={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          bgcolor: 'primary.main',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <AIIcon sx={{ fontSize: 14, color: 'white' }} />
      </Box>
      <Paper
        elevation={0}
        sx={{
          px: 2,
          py: 1.25,
          borderRadius: '4px 14px 14px 14px',
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
          {[0, 1, 2].map((i) => (
            <Box
              key={i}
              sx={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                bgcolor: 'text.disabled',
                animation: 'pulse 1.2s ease-in-out infinite',
                animationDelay: `${i * 0.2}s`,
                '@keyframes pulse': {
                  '0%, 100%': { opacity: 0.3, transform: 'scale(0.8)' },
                  '50%': { opacity: 1, transform: 'scale(1)' },
                },
              }}
            />
          ))}
        </Box>
      </Paper>
    </Box>
  );
}

// ─── Preview panel ────────────────────────────────────────────────────────────

interface PreviewField {
  label: string;
  value: string;
  isEmpty?: boolean;
}

function PreviewPanel({
  draft,
  aiSuggestion,
  onAcceptSuggestion,
  onDismissSuggestion,
  hasSuggestion,
}: {
  draft: Draft;
  aiSuggestion: IdeaImprovement | null;
  onAcceptSuggestion: () => void;
  onDismissSuggestion: () => void;
  hasSuggestion: boolean;
}) {
  const { t } = useTranslation('ideas');
  const hasContent = draft.need.trim().length > 0;

  const fields: PreviewField[] = [
    { label: t('convo.previewField.need'), value: draft.need, isEmpty: !draft.need },
    ...(draft.module ? [{ label: t('convo.previewField.module'), value: draft.module }] : []),
    { label: t('convo.previewField.why'), value: draft.why, isEmpty: !draft.why },
    ...(draft.how ? [{ label: t('convo.previewField.how'), value: draft.how }] : []),
    ...(draft.tagIds.length > 0 ? [{ label: t('convo.previewField.tags', 'Tags'), value: String(draft.tagIds.length) }] : []),
  ];

  return (
    <Box sx={{ height: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 2 }}>
        <IdeaIcon sx={{ fontSize: 16, color: 'primary.main' }} />
        <Typography
          sx={{
            fontSize: '0.7rem',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            color: 'text.disabled',
          }}
        >
          {t('convo.previewTitle')}
        </Typography>
      </Box>

      {!hasContent ? (
        <Typography variant="body2" color="text.disabled" sx={{ fontStyle: 'italic', lineHeight: 1.6 }}>
          {t('convo.previewEmpty')}
        </Typography>
      ) : (
        <>
          {/* AI suggestion banner */}
          <Collapse in={hasSuggestion && !!aiSuggestion} unmountOnExit>
            {aiSuggestion && (
              <Paper
                variant="outlined"
                sx={{
                  p: 1.5,
                  mb: 2,
                  borderRadius: 2,
                  borderColor: 'primary.200',
                  bgcolor: 'primary.50',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <AIIcon sx={{ fontSize: 14, color: 'primary.main' }} />
                    <Typography variant="caption" fontWeight={800} color="primary.main">
                      {t('convo.aiImproved')}
                    </Typography>
                  </Box>
                  <IconButton size="small" onClick={onDismissSuggestion} sx={{ mt: -0.5, mr: -0.5 }}>
                    <CloseIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Box>
                <Typography variant="body2" fontWeight={700} sx={{ mb: 0.5, lineHeight: 1.4 }}>
                  {aiSuggestion.suggestedTitle}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.5, display: 'block', mb: 1.5 }}>
                  {aiSuggestion.suggestedSummary}
                </Typography>
                <Button
                  size="small"
                  variant="contained"
                  onClick={onAcceptSuggestion}
                  sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 1.5, fontSize: '0.75rem' }}
                >
                  {t('convo.aiImprovedAccept')}
                </Button>
              </Paper>
            )}
          </Collapse>

          {/* Fields */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {fields.map((f, i) => (
              <Box
                key={f.label}
                sx={{
                  py: 1.5,
                  borderBottom: i < fields.length - 1 ? '1px solid' : 'none',
                  borderColor: 'divider',
                }}
              >
                <Typography
                  sx={{
                    fontSize: '0.65rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    color: 'text.disabled',
                    mb: 0.5,
                  }}
                >
                  {f.label}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    lineHeight: 1.6,
                    color: f.isEmpty ? 'text.disabled' : 'text.primary',
                    fontStyle: f.isEmpty ? 'italic' : 'normal',
                  }}
                >
                  {f.value || '—'}
                </Typography>
              </Box>
            ))}
          </Box>
        </>
      )}
    </Box>
  );
}

// ─── Similar ideas alert ──────────────────────────────────────────────────────

function SimilarAlert({
  ideas,
  onView,
  onVote,
  onContinue,
}: {
  ideas: SimilarIdea[];
  onView: (id: string) => void;
  onVote: (id: string) => void;
  onContinue: () => void;
}) {
  const { t } = useTranslation('ideas');
  const top = ideas[0];

  return (
    <Fade in timeout={300}>
      <Alert
        severity="info"
        icon={<ViewIcon />}
        sx={{ borderRadius: 2.5, mb: 2, '& .MuiAlert-message': { width: '100%' } }}
      >
        <AlertTitle sx={{ fontWeight: 800 }}>{t('convo.similar.title')}</AlertTitle>
        <Typography variant="body2" sx={{ mb: 1.5 }}>
          {t('convo.similar.subtitle')}
        </Typography>
        <Paper
          variant="outlined"
          sx={{ p: 1.5, borderRadius: 2, mb: 1.5, bgcolor: 'background.paper' }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="body2" fontWeight={700} sx={{ lineHeight: 1.3 }}>
              {top.title}
            </Typography>
            <Chip
              label={t('convo.similar.similarity', { percent: Math.round(top.similarity * 100) })}
              size="small"
              color="info"
              variant="outlined"
              sx={{ fontSize: '0.65rem', height: 20, flexShrink: 0, ml: 1 }}
            />
          </Box>
          {top.reason && (
            <Typography variant="caption" color="text.secondary">
              {top.reason}
            </Typography>
          )}
          <Box sx={{ display: 'flex', gap: 1, mt: 1.5, flexWrap: 'wrap' }}>
            <Button
              size="small"
              variant="outlined"
              startIcon={<ViewIcon sx={{ fontSize: '0.9rem !important' }} />}
              onClick={() => onView(top.id)}
              sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 1.5, fontSize: '0.75rem' }}
            >
              {t('convo.similar.viewIdea')}
            </Button>
            <Button
              size="small"
              variant="outlined"
              color="success"
              startIcon={<VoteIcon sx={{ fontSize: '0.9rem !important' }} />}
              onClick={() => onVote(top.id)}
              sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 1.5, fontSize: '0.75rem' }}
            >
              {t('convo.similar.supportIdea')}
            </Button>
          </Box>
        </Paper>
        <Button
          size="small"
          variant="text"
          endIcon={<ArrowIcon sx={{ fontSize: '0.9rem !important' }} />}
          onClick={onContinue}
          sx={{ textTransform: 'none', fontWeight: 600, color: 'info.dark', fontSize: '0.75rem' }}
        >
          {t('convo.similar.continueAnyway')}
        </Button>
      </Alert>
    </Fade>
  );
}

// ─── Category picker ──────────────────────────────────────────────────────────

// ─── Main component ────────────────────────────────────────────────────────────

export default function ConversationalIdeaCreator() {
  const navigate = useNavigate();
  const { t } = useTranslation('ideas');
  const { t: tShared } = useTranslation('shared');
  const queryClient = useQueryClient();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { status } = useSetup();
  const hasOpenAI = !!status?.features?.openai;
  const appLinks = useAppLinks();

  // ─── State ─────────────────────────────────────────────────────────────────

  const [phase, setPhase] = useState<Phase>('chat');
  const [messages, setMessages] = useState<ConvoMessage[]>([
    aiMsg(t('convo.prompts.q1')),
  ]);
  // previousResponseId: OpenAI manages conversation state server-side
  const [previousResponseId, setPreviousResponseId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [inputValue, setInputValue] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<IdeaImprovement | null>(null);
  const [showSuggestion, setShowSuggestion] = useState(false);
  const [isImproving, setIsImproving] = useState(false);
  const [similarIdeas, setSimilarIdeas] = useState<SimilarIdea[]>([]);
  const [showSimilar, setShowSimilar] = useState(false);
  const [guardrail, setGuardrail] = useState<Guardrail | null>(null);
  const [createdIdea, setCreatedIdea] = useState<{ id: string; title: string } | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingImages, setPendingImages] = useState<string[]>([]);

  // ─── Data ──────────────────────────────────────────────────────────────────

  const { data: ideasData } = useQuery<IdeasListResponse>({
    queryKey: ['ideas'],
    queryFn: ideasApi.list,
  });

  // ─── Scroll chat to bottom ─────────────────────────────────────────────────

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAiThinking]);

  // ─── Intent detection on first input ──────────────────────────────────────
  // Intentionally removed: classification now happens in handleSend after the
  // user's FIRST message, not while typing. See handleSend below.

  // ─── Submit mutation ───────────────────────────────────────────────────────

  const submitMutation = useMutation({
    mutationFn: () => {
      const title = aiSuggestion?.suggestedTitle
        ?? (draft.need.length > 80 ? draft.need.slice(0, 80).trimEnd() + '…' : draft.need);

      return ideasApi.create({
        title,
        description: draft.need,
        problem: draft.why || draft.need,
        value: draft.why || draft.need,
        solutionIdea: draft.how || undefined,
        tagIds: draft.tagIds.length > 0 ? draft.tagIds : undefined,
      });
    },
    onSuccess: (idea) => {
      queryClient.invalidateQueries({ queryKey: ['ideas'] });
      const title = aiSuggestion?.suggestedTitle
        ?? (draft.need.length > 80 ? draft.need.slice(0, 80).trimEnd() + '…' : draft.need);
      setCreatedIdea({ id: idea.id, title });
    },
  });

  // ─── Vote mutation (for similar idea action) ───────────────────────────────

  const voteMutation = useMutation({
    mutationFn: (ideaId: string) => ideasApi.vote(ideaId),
    onSuccess: (_data, ideaId) => {
      queryClient.invalidateQueries({ queryKey: ['ideas'] });
      navigate(`/ideas/${ideaId}`);
    },
  });

  // ─── Handle user message send ──────────────────────────────────────────────

  const handleSend = useCallback(async () => {
    const text = inputValue.trim();
    const images = pendingImages.length > 0 ? [...pendingImages] : undefined;
    if (!text && !images) return;
    if (isAiThinking) return;

    setInputValue('');
    setPendingImages([]);
    const userMessage: ConvoMessage = { id: uid(), from: 'user', text, images };
    setMessages((prev) => [...prev, userMessage]);

    setIsAiThinking(true);
    try {
      const result = await aiApi.converseIdea(text || '(ver imágenes adjuntas)', previousResponseId, images);

      setIsAiThinking(false);
      setMessages((prev) => [...prev, aiMsg(result.reply)]);
      setPreviousResponseId(result.responseId);

      // AI-driven guardrail (only set once, don't overwrite if user dismissed)
      if (result.guardrail && !guardrail) {
        setGuardrail(result.guardrail);
      }

      if (result.ready && result.draft) {
        setDraft((d) => ({
          ...d,
          need: result.draft!.need,
          why: result.draft!.why,
          how: result.draft!.how,
          module: result.draft!.module,
        }));
        setPhase('review');
      }
    } catch {
      setIsAiThinking(false);
      setMessages((prev) => [
        ...prev,
        aiMsg(t('convo.followUp.error')),
      ]);
    }

    setTimeout(() => inputRef.current?.focus(), 50);
  }, [inputValue, pendingImages, isAiThinking, previousResponseId, guardrail, t]);

  // ─── Image handling ────────────────────────────────────────────────────────

  const addImages = useCallback(async (files: File[]) => {
    const valid = filterImageFiles(files);
    if (valid.length === 0) return;
    const remaining = MAX_IMAGES - pendingImages.length;
    const toProcess = valid.slice(0, remaining);
    const dataUrls = await Promise.all(toProcess.map(readFileAsDataUrl));
    setPendingImages((prev) => [...prev, ...dataUrls]);
  }, [pendingImages.length]);

  const removeImage = useCallback((index: number) => {
    setPendingImages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const imageFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) imageFiles.push(file);
        }
      }
      if (imageFiles.length > 0) {
        e.preventDefault();
        addImages(imageFiles);
      }
    },
    [addImages],
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        addImages(Array.from(e.target.files));
        e.target.value = ''; // reset so same file can be re-selected
      }
    },
    [addImages],
  );

  // ─── AI improvement ────────────────────────────────────────────────────────

  const handleImproveWithAI = async () => {
    setIsImproving(true);
    try {
      const result = await aiApi.improveIdea({
        description: draft.need,
        problem: draft.why || undefined,
        solutionIdea: draft.how || undefined,
      });
      setAiSuggestion(result);
      setShowSuggestion(true);
    } catch {
      // Silently fail — AI is non-critical
    }
    setIsImproving(false);
  };

  const handleAcceptSuggestion = () => {
    if (aiSuggestion) {
      setDraft((d) => ({ ...d, need: aiSuggestion.suggestedTitle }));
    }
    setShowSuggestion(false);
  };

  // ─── Similar ideas check ───────────────────────────────────────────────────

  const handleCheckSimilar = async () => {
    if (!ideasData?.ideas.length) {
      submitMutation.mutate();
      return;
    }

    try {
      const results = await aiApi.findSimilarIdeas(
        `${draft.need} ${draft.why}`,
        ideasData.ideas.map((i) => ({ id: i.id, title: i.title, description: i.description })),
      );

      if (results.length > 0) {
        setSimilarIdeas(results);
        setShowSimilar(true);
      } else {
        submitMutation.mutate();
      }
    } catch {
      // Similarity check failed — proceed with submission
      submitMutation.mutate();
    }
  };

  // ─── Render guard: success screen ─────────────────────────────────────────

  if (createdIdea) {
    return <IdeaCreated ideaId={createdIdea.id} ideaTitle={createdIdea.title} />;
  }

  // ─── Guardrail banner (AI-driven, single unified banner) ────────────────────

  const guardrailBanner = guardrail && phase === 'chat' && (
    <Collapse in unmountOnExit>
      <Alert
        severity={guardrail.type === 'bug' ? 'warning' : 'info'}
        icon={guardrail.type === 'bug' ? <BugIcon /> : <DocIcon />}
        sx={{ borderRadius: 2, mb: 1.5, '& .MuiAlert-message': { width: '100%' } }}
      >
        <AlertTitle sx={{ fontWeight: 700 }}>
          {guardrail.type === 'bug'
            ? t('convo.intent.bug.message')
            : t('convo.docSuggestion.title')}
        </AlertTitle>
        <Typography variant="body2" sx={{ mb: 1.5 }}>
          {guardrail.type === 'bug'
            ? t('convo.intent.bug.subtext')
            : t('convo.docSuggestion.subtext')}
        </Typography>

        {/* Doc links (only for documented guardrail) */}
        {guardrail.type === 'documented' && guardrail.docSuggestions.length > 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, mb: 1.5 }}>
            {guardrail.docSuggestions.map((doc, i) => (
              <Button
                key={i}
                size="small"
                variant="outlined"
                color="info"
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                startIcon={<DocIcon sx={{ fontSize: '0.9rem !important' }} />}
                sx={{ textTransform: 'none', fontWeight: 600, justifyContent: 'flex-start', borderRadius: 1.5, fontSize: '0.8rem' }}
              >
                {doc.title}
              </Button>
            ))}
          </Box>
        )}

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {/* Primary action */}
          {guardrail.type === 'bug' && (
            <Button
              size="small"
              variant="contained"
              color="warning"
              href={appLinks.freshservice}
              target="_blank"
              rel="noopener noreferrer"
              disabled={!appLinks.freshservice}
              sx={{ color: 'white', textTransform: 'none', fontWeight: 700 }}
            >
              {t('convo.intent.bug.primary')}
            </Button>
          )}

          {/* Dismiss */}
          <Button
            size="small"
            variant="text"
            color="inherit"
            onClick={() => setGuardrail(null)}
            sx={{ opacity: 0.7, textTransform: 'none' }}
          >
            {guardrail.type === 'bug'
              ? t('convo.intent.bug.secondary')
              : t('convo.docSuggestion.dismiss')}
          </Button>
        </Box>
      </Alert>
    </Collapse>
  );

  // ─── Input area (shown in input/why/how phases) ────────────────────────────

  const isInputPhase = phase !== 'review';
  const canSend = inputValue.trim().length > 0 || pendingImages.length > 0;

  // ─── Review controls ───────────────────────────────────────────────────────

  const reviewControls = phase === 'review' && (
    <Fade in timeout={400}>
      <Box>
        {/* Tag picker */}
        <Box sx={{ mb: 2.5 }}>
          <TagInput
            value={draft.tagIds}
            onChange={(tagIds) => setDraft((d) => ({ ...d, tagIds }))}
            ideaTitle={draft.need}
            ideaDescription={draft.why}
            aiAvailable={hasOpenAI}
          />
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* Similar ideas warning */}
        {showSimilar && similarIdeas.length > 0 && (
          <SimilarAlert
            ideas={similarIdeas}
            onView={(id) => navigate(`/ideas/${id}`)}
            onVote={(id) => voteMutation.mutate(id)}
            onContinue={() => {
              setShowSimilar(false);
              submitMutation.mutate();
            }}
          />
        )}

        {/* Action row */}
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
          <Button
            variant="contained"
            size="large"
            startIcon={
              submitMutation.isPending ? undefined : <CheckIcon />
            }
            disabled={submitMutation.isPending || !draft.need.trim()}
            onClick={handleCheckSimilar}
            sx={{
              borderRadius: 2.5,
              textTransform: 'none',
              fontWeight: 700,
              minHeight: 48,
              px: 3,
              boxShadow: 'none',
              '&:hover': { boxShadow: 'none' },
            }}
          >
            {submitMutation.isPending ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              t('convo.submitButton')
            )}
          </Button>

          <Button
            variant="outlined"
            size="large"
            startIcon={isImproving ? undefined : <AIIcon />}
            disabled={isImproving || !draft.need.trim()}
            onClick={handleImproveWithAI}
            sx={{
              borderRadius: 2.5,
              textTransform: 'none',
              fontWeight: 600,
              minHeight: 48,
            }}
          >
            {isImproving ? (
              <>
                <CircularProgress size={16} color="inherit" sx={{ mr: 1 }} />
                {t('convo.aiImproving')}
              </>
            ) : (
              t('convo.aiImprove')
            )}
          </Button>
        </Box>

        {/* Secondary actions */}
        <Box sx={{ display: 'flex', gap: 1, mt: 1.5 }}>
          <Button
            size="small"
            variant="text"
            startIcon={<EditIcon sx={{ fontSize: '1rem !important' }} />}
            onClick={() => setPhase('chat')}
            sx={{ textTransform: 'none', fontWeight: 600, opacity: 0.7 }}
          >
            {t('convo.keepRefining')}
          </Button>

          <Button
            size="small"
            variant="text"
            color="error"
            startIcon={<DiscardIcon sx={{ fontSize: '1rem !important' }} />}
            onClick={() => navigate('/ideas')}
            sx={{ textTransform: 'none', fontWeight: 600, opacity: 0.7 }}
          >
            {t('convo.discard')}
          </Button>
        </Box>

        {submitMutation.isError && (
          <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>
            {tShared('common.error')}
          </Alert>
        )}
      </Box>
    </Fade>
  );

  // ─── Progress bar ──────────────────────────────────────────────────────────

  const progress = phase === 'review' ? 100 : Math.min((messages.filter(m => m.from === 'user').length / 4) * 80, 80);

  // ─── Layout: desktop = side-by-side, mobile = stacked ─────────────────────

  return (
    <Box
      sx={{
        maxWidth: isMobile ? '100%' : 1000,
        mx: 'auto',
        px: { xs: 0, sm: 1 },
      }}
    >
      {/* Header */}
      <Box sx={{ mb: { xs: 2, md: 3 } }}>
        <Typography
          variant={isMobile ? 'h5' : 'h4'}
          fontWeight={900}
          sx={{ letterSpacing: '-0.02em', mb: 0.5 }}
        >
          {t('convo.pageTitle')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t('convo.pageSubtitle')}
        </Typography>
        <Button
          size="small"
          variant="text"
          onClick={() => navigate('/ideas/new?mode=manual')}
          sx={{ textTransform: 'none', fontWeight: 600, mt: 0.5, p: 0, minWidth: 0, fontSize: '0.8rem' }}
        >
          {t('convo.switchToManual')}
        </Button>
      </Box>

      {/* Progress */}
      <LinearProgress
        variant="determinate"
        value={progress}
        sx={{
          mb: { xs: 2.5, md: 3 },
          height: 3,
          borderRadius: 2,
          bgcolor: 'action.disabledBackground',
          '& .MuiLinearProgress-bar': { borderRadius: 2 },
        }}
      />

      <Box
        sx={{
          display: 'flex',
          gap: { md: 4 },
          alignItems: 'flex-start',
          flexDirection: { xs: 'column', md: 'row' },
        }}
      >
        {/* ── Left: conversation ────────────────────────────────────────────── */}
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Chat thread */}
          <Box
            sx={{
              minHeight: { xs: 200, md: 280 },
              maxHeight: { xs: 300, md: 420 },
              overflowY: 'auto',
              mb: 2,
              pr: 0.5,
            }}
          >
            {messages.map((msg) => (
              <ChatBubble key={msg.id} msg={msg} />
            ))}
            {isAiThinking && <AiTyping />}
            <div ref={chatEndRef} />
          </Box>

          {/* AI guardrail banner */}
          {guardrailBanner}

          {/* Input */}
          {isInputPhase && (
            <Box>
              {/* Pending image thumbnails */}
              {pendingImages.length > 0 && (
                <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mb: 1 }}>
                  {pendingImages.map((src, i) => (
                    <Box key={i} sx={{ position: 'relative', display: 'inline-block' }}>
                      <Box
                        component="img"
                        src={src}
                        alt=""
                        sx={{
                          width: 64,
                          height: 64,
                          borderRadius: 1.5,
                          objectFit: 'cover',
                          border: '1px solid',
                          borderColor: 'divider',
                        }}
                      />
                      <IconButton
                        size="small"
                        onClick={() => removeImage(i)}
                        sx={{
                          position: 'absolute',
                          top: -8,
                          right: -8,
                          width: 20,
                          height: 20,
                          bgcolor: 'error.main',
                          color: 'white',
                          '&:hover': { bgcolor: 'error.dark' },
                        }}
                      >
                        <CloseIcon sx={{ fontSize: 12 }} />
                      </IconButton>
                    </Box>
                  ))}
                </Box>
              )}

              <Box
                sx={{
                  display: 'flex',
                  gap: 1,
                  alignItems: 'flex-end',
                }}
              >
                <TextField
                  inputRef={inputRef}
                  fullWidth
                  multiline
                  minRows={2}
                  maxRows={6}
                  placeholder={t('convo.inputPlaceholder')}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onPaste={handlePaste}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && canSend) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  disabled={isAiThinking}
                  variant="outlined"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2.5,
                      fontSize: '0.95rem',
                    },
                  }}
                />
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  <IconButton
                    color="default"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isAiThinking || pendingImages.length >= MAX_IMAGES}
                    sx={{
                      width: 44,
                      height: 44,
                      borderRadius: 2,
                    }}
                    title={t('convo.attachImage', 'Adjuntar imagen')}
                  >
                    <AttachIcon sx={{ fontSize: 20 }} />
                  </IconButton>
                  <IconButton
                    color="primary"
                    onClick={handleSend}
                    disabled={!canSend || isAiThinking}
                    sx={{
                      width: 44,
                      height: 44,
                      bgcolor: canSend ? 'primary.main' : 'action.disabledBackground',
                      color: canSend ? 'white' : 'action.disabled',
                      '&:hover': { bgcolor: canSend ? 'primary.dark' : undefined },
                      '&:disabled': { bgcolor: 'action.disabledBackground', color: 'action.disabled' },
                      borderRadius: 2,
                      transition: 'all 0.15s',
                    }}
                  >
                    <SendIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </Box>
              </Box>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                multiple
                style={{ display: 'none' }}
                onChange={handleFileSelect}
              />

              <Typography
                variant="caption"
                color="text.disabled"
                sx={{ display: 'block', mt: 0.75, pl: 0.5 }}
              >
                {t('convo.inputHint')}
              </Typography>
            </Box>
          )}

          {/* Review controls (mobile: show here below chat) */}
          {isMobile && reviewControls}
        </Box>

        {/* ── Right: live preview ───────────────────────────────────────────── */}
        <Box
          sx={{
            width: { md: 300 },
            flexShrink: 0,
            position: { md: 'sticky' },
            top: { md: 88 },
            alignSelf: { md: 'flex-start' },
          }}
        >
          <Paper
            variant="outlined"
            sx={{
              p: { xs: 2, md: 2.5 },
              borderRadius: 3,
              minHeight: { xs: 0, md: 320 },
            }}
          >
            <PreviewPanel
              draft={draft}
              aiSuggestion={aiSuggestion}
              onAcceptSuggestion={handleAcceptSuggestion}
              onDismissSuggestion={() => setShowSuggestion(false)}
              hasSuggestion={showSuggestion}
            />
          </Paper>

          {/* Desktop review controls under preview panel */}
          {!isMobile && phase === 'review' && (
            <Box sx={{ mt: 2 }}>
              {reviewControls}
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}
