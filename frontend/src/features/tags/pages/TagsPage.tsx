import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { tagsApi, Tag } from '../api/tags.api';

// ─── Color palette for quick selection ───────────────────────────────────────

const PALETTE = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b',
  '#10b981', '#3b82f6', '#ef4444', '#14b8a6',
  '#f97316', '#a855f7',
];

// ─── Tag form dialog ─────────────────────────────────────────────────────────

function TagFormDialog({
  open,
  initial,
  onClose,
  onSave,
  loading,
}: {
  open: boolean;
  initial?: Tag;
  onClose: () => void;
  onSave: (name: string, color: string) => void;
  loading: boolean;
}) {
  const { t } = useTranslation('shared');
  const [name, setName] = useState(initial?.name ?? '');
  const [color, setColor] = useState(initial?.color ?? PALETTE[0]);

  React.useEffect(() => {
    if (open) {
      setName(initial?.name ?? '');
      setColor(initial?.color ?? PALETTE[0]);
    }
  }, [open, initial]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{initial ? 'Edit tag' : 'New tag'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value.toLowerCase())}
            size="small"
            autoFocus
            fullWidth
            inputProps={{ maxLength: 50 }}
          />
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
              Color
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {PALETTE.map((c) => (
                <Box
                  key={c}
                  onClick={() => setColor(c)}
                  sx={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    bgcolor: c,
                    cursor: 'pointer',
                    border: color === c ? '3px solid' : '2px solid transparent',
                    borderColor: color === c ? 'text.primary' : 'transparent',
                    transition: 'transform 0.1s',
                    '&:hover': { transform: 'scale(1.15)' },
                  }}
                />
              ))}
            </Box>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">Preview</Typography>
            <Box sx={{ mt: 0.5 }}>
              <Chip
                label={name || 'preview'}
                size="small"
                sx={{
                  bgcolor: color + '22',
                  color,
                  border: `1px solid ${color}44`,
                  fontWeight: 600,
                }}
              />
            </Box>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.cancel', 'Cancel')}</Button>
        <Button
          variant="contained"
          onClick={() => onSave(name.trim(), color)}
          disabled={loading || !name.trim()}
          startIcon={loading ? <CircularProgress size={14} color="inherit" /> : null}
        >
          {t('common.save', 'Save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TagsPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Tag | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  const { data: tags = [], isLoading } = useQuery<Tag[]>({
    queryKey: ['tags'],
    queryFn: tagsApi.getAll,
  });

  const createMutation = useMutation({
    mutationFn: ({ name, color }: { name: string; color: string }) =>
      tagsApi.create(name, color),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      setDialogOpen(false);
      setError(null);
    },
    onError: (e: any) => setError(e.response?.data?.message ?? 'Error creating tag'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, name, color }: { id: string; name: string; color: string }) =>
      tagsApi.update(id, { name, color }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      setDialogOpen(false);
      setEditing(undefined);
      setError(null);
    },
    onError: (e: any) => setError(e.response?.data?.message ?? 'Error updating tag'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => tagsApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tags'] }),
  });

  const handleSave = (name: string, color: string) => {
    if (editing) {
      updateMutation.mutate({ id: editing.id, name, color });
    } else {
      createMutation.mutate({ name, color });
    }
  };

  const handleEdit = (tag: Tag) => {
    setEditing(tag);
    setDialogOpen(true);
    setError(null);
  };

  const handleNew = () => {
    setEditing(undefined);
    setDialogOpen(true);
    setError(null);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h4">Tags</Typography>
          <Typography variant="body2" color="text.secondary">
            {tags.length} tag{tags.length !== 1 ? 's' : ''} · ordered by usage
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleNew}>
          New tag
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : tags.length === 0 ? (
        <Typography color="text.secondary">No tags yet. Create the first one.</Typography>
      ) : (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
          {tags.map((tag) => (
            <Box
              key={tag.id}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                border: `1px solid ${tag.color}44`,
                borderRadius: 2,
                px: 1.5,
                py: 0.5,
                bgcolor: tag.color + '11',
              }}
            >
              <Box
                sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: tag.color, flexShrink: 0 }}
              />
              <Typography
                variant="body2"
                fontWeight={600}
                sx={{ color: tag.color, mr: 0.5 }}
              >
                {tag.name}
              </Typography>
              <Typography variant="caption" color="text.disabled">
                {tag.usageCount}
              </Typography>
              <Tooltip title="Edit">
                <IconButton size="small" onClick={() => handleEdit(tag)} sx={{ p: 0.25 }}>
                  <EditIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Delete">
                <IconButton
                  size="small"
                  onClick={() => deleteMutation.mutate(tag.id)}
                  disabled={deleteMutation.isPending}
                  sx={{ p: 0.25 }}
                >
                  <DeleteIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </Tooltip>
            </Box>
          ))}
        </Box>
      )}

      <TagFormDialog
        open={dialogOpen}
        initial={editing}
        onClose={() => { setDialogOpen(false); setEditing(undefined); }}
        onSave={handleSave}
        loading={createMutation.isPending || updateMutation.isPending}
      />
    </Box>
  );
}
