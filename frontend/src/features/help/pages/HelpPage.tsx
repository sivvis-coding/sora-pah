import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Typography,
  TextField,
  IconButton,
  Paper,
  CircularProgress,
  Fade,
} from '@mui/material';
import {
  Send as SendIcon,
  AutoAwesome as AIIcon,
} from '@mui/icons-material';
import { aiApi } from '../../ideas/api/ai.api';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: string[];
}

export default function HelpPage() {
  const { t } = useTranslation('help');
  const [messages, setMessages] = useState<Message[]>([]);
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

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: q,
    };

    // Capture current messages before setState so we can pass history to the API
    setMessages((prev) => {
      const next = [...prev, userMsg];

      // Build history from all settled messages (mirrors InMemorySaver turns)
      const history = prev.map((m) => ({ role: m.role, content: m.content }));

      setLoading(true);
      aiApi
        .askQuestion(q, history)
        .then((result) => {
          const aiMsg: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: result.answer,
            sources: result.sources,
          };
          setMessages((cur) => [...cur, aiMsg]);
        })
        .catch(() => {
          setMessages((cur) => [
            ...cur,
            {
              id: (Date.now() + 1).toString(),
              role: 'assistant' as const,
              content: t('errorResponse'),
            },
          ]);
        })
        .finally(() => setLoading(false));

      return next;
    });
  };

  return (
    <Box
      sx={{
        maxWidth: 700,
        mx: 'auto',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        px: { xs: 2, md: 0 },
        py: { xs: 2, md: 3 },
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
        <AIIcon color="primary" />
        <Typography variant="h5" fontWeight={700}>
          {t('title')}
        </Typography>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {t('subtitle')}
      </Typography>

      {/* Messages area */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          mb: 2,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          minHeight: '40vh',
        }}
      >
        {messages.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 8, color: 'text.disabled' }}>
            <AIIcon sx={{ fontSize: 48, mb: 1, opacity: 0.4 }} />
            <Typography variant="body1">{t('emptyState')}</Typography>
          </Box>
        )}
        {messages.map((msg) => (
          <Fade in key={msg.id}>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                borderRadius: 2.5,
                maxWidth: '85%',
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                bgcolor:
                  msg.role === 'user' ? 'primary.main' : 'action.hover',
                color:
                  msg.role === 'user' ? 'primary.contrastText' : 'text.primary',
              }}
            >
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
                {msg.content}
              </Typography>
              {msg.sources && msg.sources.length > 0 && (
                <Typography
                  variant="caption"
                  sx={{
                    mt: 1,
                    display: 'block',
                    opacity: 0.7,
                    color: msg.role === 'user' ? 'inherit' : 'text.secondary',
                  }}
                >
                  {t('sources')}: {msg.sources.join(', ')}
                </Typography>
              )}
            </Paper>
          </Fade>
        ))}
        {loading && (
          <CircularProgress size={20} sx={{ alignSelf: 'flex-start', ml: 1 }} />
        )}
        <div ref={endRef} />
      </Box>

      {/* Input */}
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
        <TextField
          fullWidth
          placeholder={t('inputPlaceholder')}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          size="small"
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
        />
        <IconButton
          color="primary"
          onClick={handleSend}
          disabled={!input.trim() || loading}
          sx={{ minWidth: 44, minHeight: 44 }}
        >
          <SendIcon />
        </IconButton>
      </Box>
    </Box>
  );
}
