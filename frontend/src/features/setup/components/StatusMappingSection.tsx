/**
 * StatusMappingSection
 *
 * Shows all statuses from the configured ClickUp lists and lets the admin
 * assign each status to one of the three Progress Board columns:
 *   planned | in_progress | done | (unmapped — ignored)
 *
 * Saves as JSON arrays in the clickup setting:
 *   statusPlanned, statusInProgress, statusDone
 */
import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Chip,
  Button,
  CircularProgress,
  Alert,
  Divider,
  ToggleButton,
  ToggleButtonGroup,
  Skeleton,
} from '@mui/material';
import { Save as SaveIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import {
  setupApi,
  type ClickupStatus,
  type ClickupStatusMapping,
} from '../api/setup.api';

const COLUMNS: { key: keyof ClickupStatusMapping; label: string; color: string }[] = [
  { key: 'planned',     label: 'Planned',     color: '#6366f1' },
  { key: 'in_progress', label: 'In Progress',  color: '#f59e0b' },
  { key: 'done',        label: 'Done',         color: '#10b981' },
];

export default function StatusMappingSection() {
  const queryClient = useQueryClient();

  const {
    data,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['clickup-statuses'],
    queryFn: setupApi.getClickupStatuses,
    staleTime: 60_000,
  });

  // Local mapping state: statusName (lowercase) → column key | null
  const [mapping, setMapping] = useState<Record<string, keyof ClickupStatusMapping | null>>({});
  const [dirty, setDirty] = useState(false);

  // Init from server whenever data loads
  useEffect(() => {
    if (!data) return;
    const initial: Record<string, keyof ClickupStatusMapping | null> = {};
    for (const s of data.statuses) {
      const key = s.name.toLowerCase();
      if (data.mapping.planned.includes(key))     initial[key] = 'planned';
      else if (data.mapping.in_progress.includes(key)) initial[key] = 'in_progress';
      else if (data.mapping.done.includes(key))   initial[key] = 'done';
      else                                         initial[key] = null;
    }
    setMapping(initial);
    setDirty(false);
  }, [data]);

  const assign = (statusName: string, column: keyof ClickupStatusMapping | null) => {
    setMapping((prev) => ({ ...prev, [statusName.toLowerCase()]: column }));
    setDirty(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const buckets: ClickupStatusMapping = { planned: [], in_progress: [], done: [] };
      for (const [name, col] of Object.entries(mapping)) {
        if (col) buckets[col].push(name);
      }
      await setupApi.saveStatusMapping(buckets);
    },
    onSuccess: () => {
      setDirty(false);
      queryClient.invalidateQueries({ queryKey: ['clickup-statuses'] });
    },
  });

  // Group statuses by current column assignment for display
  const byColumn = (col: keyof ClickupStatusMapping | null) =>
    (data?.statuses ?? []).filter((s) => mapping[s.name.toLowerCase()] === col);

  return (
    <Box sx={{ mt: 1 }}>
      <Divider sx={{ mb: 2 }} />

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5, flexWrap: 'wrap', gap: 1 }}>
        <Box>
          <Typography variant="subtitle1" fontWeight={700}>
            Progress Board mapping
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Assign each ClickUp status to a board column
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
            {saveMutation.isPending ? 'Saving…' : 'Save mapping'}
          </Button>
        </Box>
      </Box>

      {saveMutation.isSuccess && !dirty && (
        <Alert severity="success" sx={{ mb: 1.5, borderRadius: 2 }}>
          Mapping saved — Progress Board will use the new statuses
        </Alert>
      )}
      {saveMutation.isError && (
        <Alert severity="error" sx={{ mb: 1.5, borderRadius: 2 }}>
          Failed to save mapping
        </Alert>
      )}

      {isLoading && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} height={40} sx={{ borderRadius: 2 }} />)}
        </Box>
      )}

      {isError && (
        <Alert severity="warning" sx={{ borderRadius: 2 }}>
          Could not load statuses — make sure listId or productBacklogListId is configured
        </Alert>
      )}

      {!isLoading && !isError && data && (
        <>
          {/* Status rows */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
            {data.statuses.map((s) => (
              <StatusRow
                key={s.name}
                status={s}
                value={mapping[s.name.toLowerCase()] ?? null}
                onChange={(col) => assign(s.name, col)}
              />
            ))}
          </Box>

          {/* Summary per column */}
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
            {COLUMNS.map((col) => {
              const statuses = byColumn(col.key);
              return (
                <Box key={col.key} sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <Typography variant="caption" fontWeight={700} sx={{ color: col.color, minWidth: 90 }}>
                    {col.label}
                  </Typography>
                  {statuses.length === 0
                    ? <Typography variant="caption" color="text.disabled">— none assigned</Typography>
                    : statuses.map((s) => (
                        <Chip
                          key={s.name}
                          label={s.name}
                          size="small"
                          sx={{ fontSize: '0.68rem', bgcolor: s.color + '22', color: s.color, borderColor: s.color, border: '1px solid' }}
                        />
                      ))
                  }
                </Box>
              );
            })}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Typography variant="caption" fontWeight={700} color="text.disabled" sx={{ minWidth: 90 }}>
                Ignored
              </Typography>
              {byColumn(null).length === 0
                ? <Typography variant="caption" color="text.disabled">— none</Typography>
                : byColumn(null).map((s) => (
                    <Chip
                      key={s.name}
                      label={s.name}
                      size="small"
                      variant="outlined"
                      sx={{ fontSize: '0.68rem', opacity: 0.5 }}
                    />
                  ))
              }
            </Box>
          </Box>
        </>
      )}
    </Box>
  );
}

// ─── StatusRow ────────────────────────────────────────────────────────────────

function StatusRow({
  status,
  value,
  onChange,
}: {
  status: ClickupStatus;
  value: keyof ClickupStatusMapping | null;
  onChange: (col: keyof ClickupStatusMapping | null) => void;
}) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        px: 1.5,
        py: 0.75,
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        flexWrap: 'wrap',
      }}
    >
      {/* Status badge */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 140, flex: '0 0 auto' }}>
        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: status.color, flexShrink: 0 }} />
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          {status.name}
        </Typography>
      </Box>

      {/* Column assignment */}
      <ToggleButtonGroup
        exclusive
        size="small"
        value={value}
        onChange={(_, v) => onChange(v)}
        sx={{ flexWrap: 'wrap' }}
      >
        {COLUMNS.map((col) => (
          <ToggleButton
            key={col.key}
            value={col.key}
            sx={{
              textTransform: 'none',
              fontSize: '0.7rem',
              px: 1.5,
              py: 0.25,
              '&.Mui-selected': { bgcolor: col.color + '22', color: col.color, borderColor: col.color },
            }}
          >
            {col.label}
          </ToggleButton>
        ))}
        <ToggleButton
          value={null as any}
          selected={value === null}
          onClick={() => onChange(null)}
          sx={{ textTransform: 'none', fontSize: '0.7rem', px: 1.5, py: 0.25, opacity: 0.6 }}
        >
          Ignore
        </ToggleButton>
      </ToggleButtonGroup>
    </Box>
  );
}
