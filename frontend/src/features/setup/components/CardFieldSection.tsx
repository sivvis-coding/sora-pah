/**
 * CardFieldSection
 *
 * Lets the admin pick one custom field from the configured ClickUp lists
 * to display on each progress board card (below the title).
 *
 * Saves the selected field ID via POST /setup/clickup/card-fields (patch-only).
 */
import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Divider,
  Skeleton,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';
import { Save as SaveIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { setupApi } from '../api/setup.api';

export default function CardFieldSection() {
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['clickup-custom-fields'],
    queryFn: setupApi.getClickupCustomFields,
    staleTime: 60_000,
  });

  const [selectedId, setSelectedId] = useState<string>('');
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!data) return;
    setSelectedId(data.selectedFieldId ?? '');
    setDirty(false);
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: () => setupApi.saveCardFields(selectedId || null),
    onSuccess: () => {
      setDirty(false);
      queryClient.invalidateQueries({ queryKey: ['clickup-custom-fields'] });
    },
  });

  return (
    <Box sx={{ mt: 1 }}>
      <Divider sx={{ mb: 2 }} />

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
        <Box>
          <Typography variant="subtitle1" fontWeight={700}>
            Card custom field
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Show an extra field on each progress board card
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            size="small"
            startIcon={isFetching ? <CircularProgress size={13} color="inherit" /> : <RefreshIcon />}
            onClick={() => refetch()}
            disabled={isFetching}
            sx={{ textTransform: 'none' }}
          >
            Refresh
          </Button>
          <Button
            size="small"
            variant="contained"
            startIcon={saveMutation.isPending ? <CircularProgress size={13} color="inherit" /> : <SaveIcon />}
            disabled={!dirty || saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
            sx={{ textTransform: 'none', borderRadius: 2 }}
          >
            {saveMutation.isPending ? 'Saving…' : 'Save'}
          </Button>
        </Box>
      </Box>

      {saveMutation.isSuccess && !dirty && (
        <Alert severity="success" sx={{ mb: 1.5, borderRadius: 2 }}>
          Card field saved — cards will show the selected field
        </Alert>
      )}
      {saveMutation.isError && (
        <Alert severity="error" sx={{ mb: 1.5, borderRadius: 2 }}>
          Failed to save card field
        </Alert>
      )}

      {isLoading && <Skeleton height={56} sx={{ borderRadius: 2 }} />}

      {isError && (
        <Alert severity="warning" sx={{ borderRadius: 2 }}>
          Could not load custom fields — make sure listId or productBacklogListId is configured
        </Alert>
      )}

      {!isLoading && !isError && data && (
        <FormControl size="small" sx={{ minWidth: 280 }}>
          <InputLabel id="card-field-label">Custom field</InputLabel>
          <Select
            labelId="card-field-label"
            label="Custom field"
            value={selectedId}
            onChange={(e) => {
              setSelectedId(e.target.value);
              setDirty(true);
            }}
            sx={{ borderRadius: 2 }}
          >
            <MenuItem value="">
              <em>None</em>
            </MenuItem>
            {data.fields.map((f) => (
              <MenuItem key={f.id} value={f.id}>
                {f.name}
                <Typography component="span" variant="caption" color="text.disabled" sx={{ ml: 1 }}>
                  ({f.type})
                </Typography>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}
    </Box>
  );
}
