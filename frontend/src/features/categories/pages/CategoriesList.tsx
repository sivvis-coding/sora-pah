import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  Typography,
  Box,
  Button,
  Chip,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Fab,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ToggleOn as ActivateIcon,
  ToggleOff as DeactivateIcon,
} from '@mui/icons-material';
import { categoriesApi, type Category } from '../api/categories.api';

// ─── Category form ─────────────────────────────────────────────────────────────

interface CategoryForm {
  name: string;
  description: string;
  color: string;
  order: string;
}

const EMPTY_FORM: CategoryForm = { name: '', description: '', color: '', order: '0' };

function CategoryDialog({
  open,
  onClose,
  initial,
  titleKey,
  submitKey,
  onSubmit,
  isPending,
  isError,
}: {
  open: boolean;
  onClose: () => void;
  initial: CategoryForm;
  titleKey: string;
  submitKey: string;
  onSubmit: (form: CategoryForm) => void;
  isPending: boolean;
  isError: boolean;
}) {
  const { t } = useTranslation('categories');
  const { t: tShared } = useTranslation('shared');
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down('sm'));
  const [form, setForm] = useState<CategoryForm>(initial);

  // Reset form when dialog opens with new initial values
  React.useEffect(() => {
    if (open) setForm(initial);
  }, [open, initial]);

  const update = (field: keyof CategoryForm) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth fullScreen={isSmall}>
      <DialogTitle>{t(titleKey)}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
        <TextField
          autoFocus
          label={t('add.fieldName')}
          value={form.name}
          onChange={update('name')}
          required
        />
        <TextField
          label={t('add.fieldDescription')}
          value={form.description}
          onChange={update('description')}
          multiline
          rows={2}
        />
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            label={t('add.fieldColor')}
            value={form.color}
            onChange={update('color')}
            sx={{ flex: 1 }}
            placeholder="#4CAF50"
          />
          {form.color && (
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: 1,
                bgcolor: form.color,
                border: '1px solid',
                borderColor: 'divider',
                flexShrink: 0,
              }}
            />
          )}
        </Box>
        <TextField
          label={t('add.fieldOrder')}
          type="number"
          value={form.order}
          onChange={update('order')}
          inputProps={{ min: 0 }}
        />
        {isError && <Alert severity="error">{tShared('common.error')}</Alert>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{tShared('common.cancel')}</Button>
        <Button
          variant="contained"
          disabled={!form.name || isPending}
          onClick={() => onSubmit(form)}
        >
          {t(submitKey)}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function CategoriesList() {
  const { t } = useTranslation('categories');
  const { t: tShared } = useTranslation('shared');
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery<Category[]>({
    queryKey: ['categories', 'all'],
    queryFn: categoriesApi.listAll,
  });

  // ─── Create ───────────────────────────────────────────────────────────────
  const [createOpen, setCreateOpen] = useState(false);
  const createMutation = useMutation({
    mutationFn: (form: CategoryForm) =>
      categoriesApi.create({
        name: form.name,
        description: form.description || undefined,
        color: form.color || undefined,
        order: Number(form.order),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setCreateOpen(false);
    },
  });

  // ─── Edit ─────────────────────────────────────────────────────────────────
  const [editTarget, setEditTarget] = useState<Category | null>(null);
  const editMutation = useMutation({
    mutationFn: (form: CategoryForm) =>
      categoriesApi.update(editTarget!.id, {
        name: form.name,
        description: form.description || undefined,
        color: form.color || undefined,
        order: Number(form.order),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setEditTarget(null);
    },
  });

  // ─── Toggle active ────────────────────────────────────────────────────────
  const toggleMutation = useMutation({
    mutationFn: (cat: Category) =>
      categoriesApi.update(cat.id, { isActive: !cat.isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
  });

  // ─── Delete ───────────────────────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const deleteMutation = useMutation({
    mutationFn: (id: string) => categoriesApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setDeleteTarget(null);
    },
  });

  if (isLoading) return <CircularProgress />;
  if (error) return <Alert severity="error">{tShared('common.error')}</Alert>;

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h4">{t('title')}</Typography>
          <Typography variant="body2" color="text.secondary">{t('subtitle')}</Typography>
        </Box>
      </Box>

      {data?.length === 0 ? (
        <Typography color="text.secondary" sx={{ mt: 3 }}>{t('empty')}</Typography>
      ) : (
        <TableContainer component={Paper} sx={{ mt: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('col.name')}</TableCell>
                <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>{t('col.description')}</TableCell>
                <TableCell>{t('col.color')}</TableCell>
                <TableCell align="right">{t('col.order')}</TableCell>
                <TableCell>{t('col.status')}</TableCell>
                <TableCell align="right" />
              </TableRow>
            </TableHead>
            <TableBody>
              {data?.map((cat) => (
                <TableRow key={cat.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {cat.color && (
                        <Box
                          sx={{
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            bgcolor: cat.color,
                            flexShrink: 0,
                          }}
                        />
                      )}
                      <Typography variant="body2" fontWeight={500}>{cat.name}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                    <Typography variant="body2" color="text.secondary">
                      {cat.description ?? '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontFamily="monospace" fontSize="0.75rem">
                      {cat.color ?? '—'}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2">{cat.order}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={cat.isActive ? t('status.active') : t('status.inactive')}
                      color={cat.isActive ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <Tooltip title={cat.isActive ? t('toggle.deactivate') : t('toggle.activate')}>
                        <IconButton
                          size="small"
                          onClick={() => toggleMutation.mutate(cat)}
                          color={cat.isActive ? 'success' : 'default'}
                        >
                          {cat.isActive ? <DeactivateIcon fontSize="small" /> : <ActivateIcon fontSize="small" />}
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={t('edit.title')}>
                        <IconButton size="small" onClick={() => setEditTarget(cat)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={t('delete.button')}>
                        <IconButton size="small" color="error" onClick={() => setDeleteTarget(cat)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* FAB */}
      <Fab
        color="primary"
        aria-label={t('add.button')}
        sx={{ position: 'fixed', bottom: { xs: 16, md: 32 }, right: { xs: 16, md: 32 } }}
        onClick={() => setCreateOpen(true)}
      >
        <AddIcon />
      </Fab>

      {/* Create dialog */}
      <CategoryDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        initial={EMPTY_FORM}
        titleKey="add.title"
        submitKey="add.save"
        onSubmit={(form) => createMutation.mutate(form)}
        isPending={createMutation.isPending}
        isError={createMutation.isError}
      />

      {/* Edit dialog */}
      <CategoryDialog
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        initial={
          editTarget
            ? {
                name: editTarget.name,
                description: editTarget.description ?? '',
                color: editTarget.color ?? '',
                order: String(editTarget.order),
              }
            : EMPTY_FORM
        }
        titleKey="edit.title"
        submitKey="edit.save"
        onSubmit={(form) => editMutation.mutate(form)}
        isPending={editMutation.isPending}
        isError={editMutation.isError}
      />

      {/* Delete confirm */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>{t('delete.title')}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t('delete.confirm', { name: deleteTarget?.name })}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>{tShared('common.cancel')}</Button>
          <Button
            color="error"
            variant="contained"
            disabled={deleteMutation.isPending}
            onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
          >
            {t('delete.button')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
