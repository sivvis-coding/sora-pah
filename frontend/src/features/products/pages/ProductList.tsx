import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Typography,
  Card,
  CardContent,
  CardActionArea,
  CardActions,
  Grid,
  CircularProgress,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  IconButton,
  Tooltip,
  Fab,
  Box,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { productsApi, type Product } from '../api/products.api';
import { useMode } from '../../../shared/ModeContext';
import { AppMode } from '../../../shared/constants';

export default function ProductList() {
  const navigate = useNavigate();
  const { t } = useTranslation('products');
  const { t: tShared } = useTranslation('shared');
  const { mode } = useMode();
  const isAdmin = mode === AppMode.ADMIN;
  const queryClient = useQueryClient();
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down('sm'));

  const { data, isLoading, error } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: productsApi.list,
  });

  // --- Create ---
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', description: '' });
  const createMutation = useMutation({
    mutationFn: () => productsApi.create(createForm),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setCreateOpen(false);
      setCreateForm({ name: '', description: '' });
    },
  });

  // --- Delete ---
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const deleteMutation = useMutation({
    mutationFn: (id: string) => productsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setDeleteTarget(null);
    },
  });

  if (isLoading) return <CircularProgress />;
  if (error) return <Alert severity="error">{tShared('common.errorLoadProducts')}</Alert>;

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" sx={{ flexGrow: 1 }}>
          {t('title')}
        </Typography>
      </Box>

      {data?.length === 0 && (
        <Typography color="text.secondary">{t('empty')}</Typography>
      )}

      <Grid container spacing={2}>
        {data?.map((product) => (
          <Grid item xs={12} sm={6} md={4} key={product.id}>
            <Card>
              <CardActionArea onClick={() => navigate(`/products/${product.id}`)}>
                <CardContent>
                  <Typography variant="h6">{product.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {product.description || t('noDescription')}
                  </Typography>
                </CardContent>
              </CardActionArea>

              {/* Admin-only card actions */}
              {isAdmin && (
                <CardActions sx={{ justifyContent: 'flex-end', pt: 0 }}>
                  <Tooltip title={t('admin.edit')}>
                    <IconButton
                      size="small"
                      onClick={() => navigate(`/products/${product.id}`)}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={t('admin.delete')}>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => setDeleteTarget(product)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </CardActions>
              )}
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Admin FAB: create product */}
      {isAdmin && (
        <Fab
          color="primary"
          aria-label={t('admin.create')}
          sx={{ position: 'fixed', bottom: { xs: 16, md: 32 }, right: { xs: 16, md: 32 } }}
          onClick={() => setCreateOpen(true)}
        >
          <AddIcon />
        </Fab>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth fullScreen={isSmall}>
        <DialogTitle>{t('admin.createTitle')}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label={t('admin.fieldName')}
            fullWidth
            value={createForm.name}
            onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
          />
          <TextField
            margin="dense"
            label={t('admin.fieldDescription')}
            fullWidth
            multiline
            rows={3}
            value={createForm.description}
            onChange={(e) =>
              setCreateForm((f) => ({ ...f, description: e.target.value }))
            }
          />
          {createMutation.isError && (
            <Alert severity="error" sx={{ mt: 1 }}>
              {tShared('common.error')}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>{tShared('common.cancel')}</Button>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={!createForm.name || createMutation.isPending}
            variant="contained"
          >
            {t('admin.create')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>{t('admin.deleteTitle')}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t('admin.deleteConfirm', { name: deleteTarget?.name })}
          </DialogContentText>
          {deleteMutation.isError && (
            <Alert severity="error" sx={{ mt: 1 }}>
              {tShared('common.error')}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>{tShared('common.cancel')}</Button>
          <Button
            color="error"
            onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            disabled={deleteMutation.isPending}
            variant="contained"
          >
            {t('admin.delete')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
