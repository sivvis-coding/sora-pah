import React, { useState, useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Typography,
  Box,
  Button,
  TextField,
  Paper,
  Chip,
  Alert,
  AlertTitle,
  CircularProgress,
  Collapse,
  useMediaQuery,
  useTheme,
  Fade,
  LinearProgress,
} from '@mui/material';
import {
  ArrowForward as NextIcon,
  ArrowBack as BackIcon,
  BugReport as BugIcon,
  HelpOutline as HelpIcon,
  CheckCircle as CheckIcon,
} from '@mui/icons-material';
import { ideasApi } from '../api/ideas.api';
import { categoriesApi, type Category } from '../../categories/api/categories.api';
import { classifyIntent, type Intent } from '../utils/classify-intent';
import { EXTERNAL_LINKS } from '../../../shared/constants';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface ConversationForm {
  need: string;
  why: string;
  how: string;
  categoryId: string;
}

const EMPTY: ConversationForm = { need: '', why: '', how: '', categoryId: '' };
const TOTAL_STEPS = 5;

const CLASSIFY_MIN_LENGTH = 20;
const CLASSIFY_DEBOUNCE_MS = 600;

// ─── Step progress bar ────────────────────────────────────────────────────────

function StepProgress({ total, current }: { total: number; current: number }) {
  const theme = useTheme();
  const progress = ((current) / (total - 1)) * 100;

  return (
    <Box sx={{ mb: { xs: 3, md: 4 } }}>
      {/* Dots */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, px: 0.5 }}>
        {Array.from({ length: total }).map((_, i) => (
          <Box
            key={i}
            sx={{
              width: { xs: 8, md: 10 },
              height: { xs: 8, md: 10 },
              borderRadius: '50%',
              bgcolor: i <= current ? 'primary.main' : 'action.disabled',
              transition: 'background-color 0.3s ease',
              flexShrink: 0,
            }}
          />
        ))}
      </Box>
      {/* Progress line */}
      <LinearProgress
        variant="determinate"
        value={progress}
        sx={{
          height: 3,
          borderRadius: 2,
          bgcolor: 'action.disabledBackground',
          '& .MuiLinearProgress-bar': { borderRadius: 2 },
        }}
      />
    </Box>
  );
}

// ─── Intent banner ─────────────────────────────────────────────────────────────

function IntentBanner({ intent, onDismiss }: { intent: 'bug' | 'help'; onDismiss: () => void }) {
  const { t } = useTranslation('ideas');
  const isBug = intent === 'bug';
  const href = isBug ? EXTERNAL_LINKS.FRESHSERVICE : EXTERNAL_LINKS.HELP;

  return (
    <Fade in timeout={250}>
      <Alert
        severity={isBug ? 'warning' : 'info'}
        icon={isBug ? <BugIcon /> : <HelpIcon />}
        sx={{
          mt: 2,
          borderRadius: 2.5,
          '& .MuiAlert-message': { width: '100%' },
        }}
      >
        <AlertTitle sx={{ fontWeight: 700 }}>
          {t(`create.intent.${intent}.message`)}
        </AlertTitle>
        <Typography variant="body2" sx={{ mb: 2 }}>
          {t(`create.intent.${intent}.subtext`)}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            size="small"
            color={isBug ? 'warning' : 'info'}
            href={href}
            {...(isBug ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            sx={{ color: 'white' }}
          >
            {t(`create.intent.${intent}.primary`)}
          </Button>
          <Button
            variant="text"
            size="small"
            color="inherit"
            onClick={onDismiss}
            sx={{ opacity: 0.7 }}
          >
            {t(`create.intent.${intent}.secondary`)}
          </Button>
        </Box>
      </Alert>
    </Fade>
  );
}

// ─── Category selector ─────────────────────────────────────────────────────────

function CategorySelector({
  categories,
  value,
  onChange,
}: {
  categories: Category[];
  value: string;
  onChange: (id: string) => void;
}) {
  const { t } = useTranslation('ideas');

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
      <Chip
        label={t('create.categoryNotSure')}
        onClick={() => onChange('')}
        variant={value === '' ? 'filled' : 'outlined'}
        color={value === '' ? 'primary' : 'default'}
        sx={{
          fontSize: { xs: '0.875rem', md: '0.95rem' },
          height: { xs: 40, md: 44 },
          px: 1,
          borderStyle: value === '' ? 'solid' : 'dashed',
          borderWidth: 2,
          '&.MuiChip-outlined': { borderWidth: 2 },
        }}
      />
      {categories.map((cat) => (
        <Chip
          key={cat.id}
          label={cat.name}
          onClick={() => onChange(cat.id)}
          variant={value === cat.id ? 'filled' : 'outlined'}
          color={value === cat.id ? 'primary' : 'default'}
          sx={{
            fontSize: { xs: '0.875rem', md: '0.95rem' },
            height: { xs: 40, md: 44 },
            px: 1,
            ...(cat.color && value !== cat.id
              ? { borderColor: cat.color, color: cat.color, borderWidth: 2, '&.MuiChip-outlined': { borderWidth: 2 } }
              : {}),
            ...(cat.color && value === cat.id
              ? { bgcolor: cat.color, '&:hover': { bgcolor: cat.color } }
              : {}),
          }}
        />
      ))}
    </Box>
  );
}

// ─── Summary line (review step) ───────────────────────────────────────────────

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <Box
      sx={{
        display: 'flex',
        gap: { xs: 1.5, md: 2 },
        py: { xs: 1.5, md: 2 },
        '&:not(:last-child)': {
          borderBottom: '1px solid',
          borderColor: 'divider',
        },
      }}
    >
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ minWidth: { xs: 80, md: 100 }, flexShrink: 0, pt: 0.1 }}
      >
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 500, lineHeight: 1.6 }}>
        {value}
      </Typography>
    </Box>
  );
}

// ─── Shared text field style ───────────────────────────────────────────────────

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    fontSize: { xs: '1rem', md: '1.05rem' },
    borderRadius: 2.5,
    lineHeight: 1.6,
  },
};

// ─── Main component ────────────────────────────────────────────────────────────

export default function CreateIdea() {
  const navigate = useNavigate();
  const { t } = useTranslation('ideas');
  const { t: tShared } = useTranslation('shared');
  const queryClient = useQueryClient();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(true);
  const [form, setForm] = useState<ConversationForm>(EMPTY);

  const [detectedIntent, setDetectedIntent] = useState<'bug' | 'help' | null>(null);
  const [intentDismissed, setIntentDismissed] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: categories = [], isLoading: catsLoading } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: categoriesApi.listActive,
  });

  // ─── Debounced intent classification ──────────────────────────────────────

  useEffect(() => {
    if (step !== 0) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (intentDismissed || form.need.length < CLASSIFY_MIN_LENGTH) {
      setDetectedIntent(null);
      return;
    }
    debounceRef.current = setTimeout(() => {
      const intent: Intent = classifyIntent(form.need);
      setDetectedIntent(intent === 'idea' ? null : intent);
    }, CLASSIFY_DEBOUNCE_MS);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [form.need, step, intentDismissed]);

  // ─── Submit ───────────────────────────────────────────────────────────────

  const mutation = useMutation({
    mutationFn: () => {
      const title = form.need.length > 80
        ? form.need.slice(0, 80).trimEnd() + '…'
        : form.need;
      return ideasApi.create({
        title,
        description: form.need,
        problem: form.why,
        value: form.why,
        solutionIdea: form.how || undefined,
        categoryId: form.categoryId || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ideas'] });
      navigate('/ideas');
    },
  });

  // ─── Navigation ───────────────────────────────────────────────────────────

  const goTo = (next: number) => {
    setVisible(false);
    setTimeout(() => { setStep(next); setVisible(true); }, 180);
  };
  const advance = () => goTo(step + 1);
  const back = () => goTo(step - 1);

  const canContinue = (): boolean => {
    if (step === 0) return form.need.trim().length > 10;
    if (step === 1) return form.why.trim().length > 5;
    return true;
  };

  const isSkippable = (step === 2 && !form.how) || (step === 3 && !form.categoryId);

  const selectedCategory = categories.find((c) => c.id === form.categoryId);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <Box
      sx={{
        maxWidth: { xs: '100%', sm: 560, md: 660 },
        mx: 'auto',
        px: { xs: 2, sm: 3, md: 0 },
        pt: { xs: 1, md: 3 },
        pb: { xs: 10, md: 6 },
        minHeight: '70vh',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <StepProgress total={TOTAL_STEPS} current={step} />

      <Fade in={visible} timeout={200}>
        <Box sx={{ flex: 1 }}>

          {/* ── Step 0: What do you need? ──────────────────────────────── */}
          {step === 0 && (
            <>
              <Typography
                variant={isMobile ? 'h5' : 'h4'}
                fontWeight={800}
                sx={{ mb: 1, lineHeight: 1.25 }}
              >
                {t('create.q1.heading')}
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 2.5 }}>
                {t('create.q1.helper')}
              </Typography>
              <TextField
                autoFocus
                fullWidth
                multiline
                minRows={isMobile ? 4 : 5}
                maxRows={12}
                placeholder={t('create.q1.placeholder')}
                value={form.need}
                onChange={(e) => {
                  setForm((f) => ({ ...f, need: e.target.value }));
                  if (intentDismissed) setIntentDismissed(false);
                }}
                variant="outlined"
                sx={fieldSx}
              />
              <Collapse in={detectedIntent !== null} unmountOnExit>
                {detectedIntent && (
                  <IntentBanner
                    intent={detectedIntent}
                    onDismiss={() => { setIntentDismissed(true); setDetectedIntent(null); }}
                  />
                )}
              </Collapse>
            </>
          )}

          {/* ── Step 1: Why is this important? ────────────────────────── */}
          {step === 1 && (
            <>
              <Typography
                variant={isMobile ? 'h5' : 'h4'}
                fontWeight={800}
                sx={{ mb: 1, lineHeight: 1.25 }}
              >
                {t('create.q2.heading')}
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 2.5 }}>
                {t('create.q2.helper')}
              </Typography>
              <TextField
                autoFocus
                fullWidth
                multiline
                minRows={isMobile ? 4 : 5}
                maxRows={12}
                placeholder={t('create.q2.placeholder')}
                value={form.why}
                onChange={(e) => setForm((f) => ({ ...f, why: e.target.value }))}
                variant="outlined"
                sx={fieldSx}
              />
            </>
          )}

          {/* ── Step 2: How could it work? (optional) ─────────────────── */}
          {step === 2 && (
            <>
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5, mb: 1 }}>
                <Typography
                  variant={isMobile ? 'h5' : 'h4'}
                  fontWeight={800}
                  sx={{ lineHeight: 1.25 }}
                >
                  {t('create.q3.heading')}
                </Typography>
                <Chip
                  label={t('create.optional')}
                  size="small"
                  variant="outlined"
                  sx={{ borderRadius: 1.5, flexShrink: 0 }}
                />
              </Box>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 2.5 }}>
                {t('create.q3.helper')}
              </Typography>
              <TextField
                autoFocus
                fullWidth
                multiline
                minRows={isMobile ? 3 : 4}
                maxRows={10}
                placeholder={t('create.q3.placeholder')}
                value={form.how}
                onChange={(e) => setForm((f) => ({ ...f, how: e.target.value }))}
                variant="outlined"
                sx={fieldSx}
              />
            </>
          )}

          {/* ── Step 3: Where does this belong? ───────────────────────── */}
          {step === 3 && (
            <>
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5, mb: 1 }}>
                <Typography
                  variant={isMobile ? 'h5' : 'h4'}
                  fontWeight={800}
                  sx={{ lineHeight: 1.25 }}
                >
                  {t('create.q4.heading')}
                </Typography>
                <Chip
                  label={t('create.optional')}
                  size="small"
                  variant="outlined"
                  sx={{ borderRadius: 1.5, flexShrink: 0 }}
                />
              </Box>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 2.5 }}>
                {t('create.q4.helper')}
              </Typography>
              {catsLoading ? (
                <CircularProgress size={24} />
              ) : (
                <CategorySelector
                  categories={categories}
                  value={form.categoryId}
                  onChange={(id) => setForm((f) => ({ ...f, categoryId: id }))}
                />
              )}
            </>
          )}

          {/* ── Step 4: Review ──────────────────────────────────────────── */}
          {step === 4 && (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                <CheckIcon color="success" sx={{ fontSize: 28 }} />
                <Typography
                  variant={isMobile ? 'h5' : 'h4'}
                  fontWeight={800}
                  sx={{ lineHeight: 1.25 }}
                >
                  {t('create.review.heading')}
                </Typography>
              </Box>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                {t('create.review.helper')}
              </Typography>

              <Paper
                variant="outlined"
                sx={{ borderRadius: 3, mb: 3, overflow: 'hidden' }}
              >
                <Box sx={{ px: { xs: 2, md: 3 } }}>
                  <SummaryLine label={t('create.review.youWant')} value={form.need} />
                  <SummaryLine label={t('create.review.because')} value={form.why} />
                  {form.how && (
                    <SummaryLine label={t('create.review.youImagine')} value={form.how} />
                  )}
                  <SummaryLine
                    label={t('create.review.category')}
                    value={selectedCategory?.name ?? t('create.categoryNotSure')}
                  />
                </Box>
              </Paper>

              {mutation.isError && (
                <Alert severity="error" sx={{ borderRadius: 2 }}>
                  {tShared('common.error')}
                </Alert>
              )}
            </>
          )}

        </Box>
      </Fade>

      {/* ── Navigation ─────────────────────────────────────────────────────── */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mt: { xs: 3, md: 4 },
          pt: 2.5,
          borderTop: '1px solid',
          borderColor: 'divider',
          gap: 1,
        }}
      >
        <Button
          onClick={step === 0 ? () => navigate(-1) : back}
          startIcon={<BackIcon />}
          color="inherit"
          sx={{ minHeight: { xs: 44, md: 36 }, textTransform: 'none' }}
        >
          {step === 0 ? tShared('common.back') : t('create.back')}
        </Button>

        {step < 4 ? (
          <Button
            variant="contained"
            size={isMobile ? 'large' : 'large'}
            endIcon={<NextIcon />}
            disabled={!canContinue()}
            onClick={advance}
            sx={{
              minWidth: { xs: 140, md: 160 },
              minHeight: { xs: 44, md: 42 },
              textTransform: 'none',
              fontWeight: 700,
              borderRadius: 2.5,
            }}
          >
            {isSkippable ? t('create.skip') : t('create.continue')}
          </Button>
        ) : (
          <Button
            variant="contained"
            size="large"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
            startIcon={mutation.isPending ? undefined : <CheckIcon />}
            sx={{
              minWidth: { xs: 160, md: 180 },
              minHeight: { xs: 44, md: 42 },
              textTransform: 'none',
              fontWeight: 700,
              borderRadius: 2.5,
            }}
          >
            {mutation.isPending ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              t('create.submit')
            )}
          </Button>
        )}
      </Box>
    </Box>
  );
}
