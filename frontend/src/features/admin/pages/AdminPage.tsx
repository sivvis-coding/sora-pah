import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Sync as IndexIcon,
  CheckCircleOutline as ReadyIcon,
  WarningAmberOutlined as NotIndexedIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  OpenInNew as OpenInNewIcon,
  Send as SendIcon,
} from '@mui/icons-material';
import apiClient from '../../../shared/api/client';

// ─── Types ────────────────────────────────────────────────────────────────────

interface IndexingResult {
  docsProcessed: number;
  pagesProcessed: number;
  chunksStored: number;
  chunksDeleted: number;
  durationMs: number;
}

interface IndexStatus {
  indexed: boolean;
  chunkCount: number;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// ─── API ──────────────────────────────────────────────────────────────────────

const adminApi = {
  indexDocs: (docIds: string[]): Promise<IndexingResult> =>
    apiClient.post('/ai/index-docs', { docIds }).then((r) => r.data),
  indexStatus: (): Promise<IndexStatus> =>
    apiClient.post('/ai/index-status').then((r) => r.data),
  ask: (question: string, history: ChatMessage[]): Promise<{ answer: string }> =>
    apiClient.post('/ai/ask', { question, history }).then((r) => r.data),
};

// ─── localStorage persistence ─────────────────────────────────────────────────

const STORAGE_KEY = 'rag_doc_ids';

function loadDocIds(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveDocIds(ids: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

// ─── RagTestChat ──────────────────────────────────────────────────────────────

function RagTestChat({ t }: { t: (key: string) => string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const q = input.trim();
    if (!q || loading) return;
    setInput('');
    const userMsg: ChatMessage = { role: 'user', content: q };
    const next = [...messages, userMsg];
    setMessages(next);
    setLoading(true);
    try {
      const { answer } = await adminApi.ask(q, messages);
      setMessages([...next, { role: 'assistant', content: answer }]);
    } catch {
      setMessages([...next, { role: 'assistant', content: t('rag.test.error') }]);
    }
    setLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <Card variant="outlined" sx={{ maxWidth: 640, mt: 3 }}>
      <CardHeader title={t('rag.test.title')} subheader={t('rag.test.description')} />
      <Divider />
      <CardContent sx={{ p: 0 }}>
        {/* Message list */}
        <Box sx={{ height: 320, overflowY: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {messages.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', textAlign: 'center', mt: 6 }}>
              {t('rag.test.empty')}
            </Typography>
          )}
          {messages.map((msg, i) => (
            <Box
              key={i}
              sx={{
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '85%',
              }}
            >
              <Paper
                variant="outlined"
                sx={{
                  px: 1.5,
                  py: 1,
                  bgcolor: msg.role === 'user' ? 'primary.main' : 'background.paper',
                  color: msg.role === 'user' ? 'primary.contrastText' : 'text.primary',
                  borderRadius: msg.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                }}
              >
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                  {msg.content}
                </Typography>
              </Paper>
            </Box>
          ))}
          {loading && (
            <Box sx={{ alignSelf: 'flex-start' }}>
              <CircularProgress size={18} />
            </Box>
          )}
          <div ref={endRef} />
        </Box>

        <Divider />

        {/* Input */}
        <Box sx={{ p: 1.5, display: 'flex', gap: 1 }}>
          <TextField
            size="small"
            fullWidth
            multiline
            maxRows={3}
            placeholder={t('rag.test.placeholder')}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
          />
          <IconButton color="primary" onClick={handleSend} disabled={!input.trim() || loading}>
            <SendIcon />
          </IconButton>
        </Box>
      </CardContent>
    </Card>
  );
}

// ─── AdminPage ────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const { t } = useTranslation('admin');
  const { t: tShared } = useTranslation('shared');

  const [docIds, setDocIds] = useState<string[]>(loadDocIds);
  const [inputValue, setInputValue] = useState('');
  const [inputError, setInputError] = useState('');
  const [lastResult, setLastResult] = useState<IndexingResult | null>(null);
  const [indexError, setIndexError] = useState<string | null>(null);

  const { data: status, isLoading: statusLoading, refetch: refetchStatus } = useQuery<IndexStatus>({
    queryKey: ['rag-status'],
    queryFn: adminApi.indexStatus,
  });

  const indexMutation = useMutation({
    mutationFn: () => adminApi.indexDocs(docIds),
    onSuccess: (result) => {
      setLastResult(result);
      setIndexError(null);
      refetchStatus();
    },
    onError: () => {
      setIndexError(t('rag.error'));
      setLastResult(null);
    },
  });

  const handleAdd = () => {
    const id = inputValue.trim();
    if (!id) return;
    if (docIds.includes(id)) {
      setInputError(t('rag.docs.duplicate'));
      return;
    }
    const next = [...docIds, id];
    setDocIds(next);
    saveDocIds(next);
    setInputValue('');
    setInputError('');
  };

  const handleRemove = (id: string) => {
    const next = docIds.filter((d) => d !== id);
    setDocIds(next);
    saveDocIds(next);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>
        {t('title')}
      </Typography>

      <Card variant="outlined" sx={{ maxWidth: 640 }}>
        <CardHeader
          title={t('rag.title')}
          subheader={t('rag.description')}
        />
        <Divider />
        <CardContent>
          <Stack spacing={3}>

            {/* Doc ID list */}
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                {t('rag.docs.title')}
              </Typography>

              {/* Add input */}
              <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
                <TextField
                  size="small"
                  fullWidth
                  placeholder={t('rag.docs.placeholder')}
                  value={inputValue}
                  onChange={(e) => { setInputValue(e.target.value); setInputError(''); }}
                  onKeyDown={handleKeyDown}
                  error={!!inputError}
                  helperText={inputError || t('rag.docs.hint')}
                  InputProps={{
                    endAdornment: inputValue && (
                      <InputAdornment position="end">
                        <Tooltip title={t('rag.docs.add')}>
                          <IconButton size="small" onClick={handleAdd}>
                            <AddIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>

              {/* Doc chips */}
              {docIds.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                  {t('rag.docs.empty')}
                </Typography>
              ) : (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {docIds.map((id) => (
                    <Chip
                      key={id}
                      label={id}
                      size="small"
                      onDelete={() => handleRemove(id)}
                      deleteIcon={<DeleteIcon />}
                      icon={
                        <Tooltip title={t('rag.docs.openInClickUp')}>
                          <OpenInNewIcon
                            sx={{ fontSize: '14px !important', cursor: 'pointer' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(`https://app.clickup.com/9015583051/v/dc/${id}`, '_blank');
                            }}
                          />
                        </Tooltip>
                      }
                      sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}
                    />
                  ))}
                </Box>
              )}
            </Box>

            <Divider />

            {/* Index status */}
            {statusLoading ? (
              <CircularProgress size={20} />
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {status?.indexed ? (
                  <ReadyIcon color="success" fontSize="small" />
                ) : (
                  <NotIndexedIcon color="warning" fontSize="small" />
                )}
                <Typography variant="body2" color="text.secondary">
                  {status?.indexed
                    ? `${t('rag.status.indexed')} (${status.chunkCount} chunks)`
                    : t('rag.status.notIndexed')}
                </Typography>
              </Box>
            )}

            {/* Action */}
            <Box>
              <Button
                variant="contained"
                startIcon={
                  indexMutation.isPending ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : (
                    <IndexIcon />
                  )
                }
                onClick={() => indexMutation.mutate()}
                disabled={indexMutation.isPending || docIds.length === 0}
              >
                {indexMutation.isPending ? t('rag.indexing') : t('rag.indexButton')}
              </Button>
              {docIds.length === 0 && (
                <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
                  {t('rag.docs.addFirst')}
                </Typography>
              )}
            </Box>

            {/* Error */}
            {indexError && <Alert severity="error">{indexError}</Alert>}

            {/* Last result */}
            {lastResult && !indexError && (
              <Alert severity="success" sx={{ '& .MuiAlert-message': { width: '100%' } }}>
                <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                  {t('rag.success')}
                </Typography>
                <Stack spacing={0.5}>
                  {(
                    [
                      ['rag.result.docs', lastResult.docsProcessed],
                      ['rag.result.pages', lastResult.pagesProcessed],
                      ['rag.result.chunks', lastResult.chunksStored],
                      ['rag.result.deleted', lastResult.chunksDeleted],
                      ['rag.result.duration', `${(lastResult.durationMs / 1000).toFixed(1)}s`],
                    ] as [string, string | number][]
                  ).map(([key, val]) => (
                    <Box key={key} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="caption" color="text.secondary">{t(key)}</Typography>
                      <Typography variant="caption" fontWeight={600}>{val}</Typography>
                    </Box>
                  ))}
                </Stack>
              </Alert>
            )}
          </Stack>
        </CardContent>
      </Card>

      <RagTestChat t={t} />
    </Box>
  );
}
