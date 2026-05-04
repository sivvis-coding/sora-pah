/**
 * PriorityMappingSection
 *
 * Step 1 — pick which custom field represents priority (dropdown from custom fields).
 * Step 2 — map each option value to High / Medium / Low / Ignore.
 *
 * Saves: priorityFieldId + priorityMapping JSON into the clickup setting (patch-only).
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
  ToggleButton,
  ToggleButtonGroup,
  Chip,
} from '@mui/material';
import { Save as SaveIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import {
  setupApi,
  type ClickupPriorityMapping,
} from '../api/setup.api';

// ─── Priority level config ────────────────────────────────────────────────────

type PriorityLevel = keyof ClickupPriorityMapping;

const LEVELS: { key: PriorityLevel; label: string; color: string }[] = [
  { key: 'high',   label: 'High',   color: '#ef4444' },
  { key: 'medium', label: 'Medium', color: '#f59e0b' },
  { key: 'low',    label: 'Low',    color: '#3b82f6' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function PriorityMappingSection() {
  const queryClient = useQueryClient();

  // Step 1: load custom fields to pick from
  const { data: fieldsData, isLoading: fieldsLoading } = useQuery({
    queryKey: ['clickup-custom-fields'],
    queryFn: setupApi.getClickupCustomFields,
    staleTime: 60_000,
  });

  const [selectedFieldId, setSelectedFieldId] = useState<string>('');
  const [mapping, setMapping] = useState<Record<string, PriorityLevel | null>>({});
  const [dirty, setDirty] = useState(false);

  // Step 2: load values for the selected field
  const {
    data: priorityData,
    isLoading: valuesLoading,
    isError: valuesError,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['clickup-priority-mapping', selectedFieldId],
    queryFn: () => setupApi.getPriorityMapping(selectedFieldId || undefined),
    staleTime: 60_000,
    enabled: true, // always run to get savedFieldId on mount
  });

  // Init field selection + mapping from server
  useEffect(() => {
    if (!priorityData) return;
    if (!selectedFieldId && priorityData.selectedFieldId) {
      setSelectedFieldId(priorityData.selectedFieldId);
    }
    const initial: Record<string, PriorityLevel | null> = {};
    for (const v of priorityData.values) {
      const key = v.toLowerCase();
      if (priorityData.mapping.high.includes(key))        initial[key] = 'high';
      else if (priorityData.mapping.medium.includes(key)) initial[key] = 'medium';
      else if (priorityData.mapping.low.includes(key))    initial[key] = 'low';
      else                                                 initial[key] = null;
    }
    setMapping(initial);
    setDirty(false);
  }, [priorityData]);

  const assign = (value: string, level: PriorityLevel | null) => {
    setMapping((prev) => ({ ...prev, [value.toLowerCase()]: level }));
    setDirty(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const buckets: ClickupPriorityMapping = { high: [], medium: [], low: [] };
      for (const [name, level] of Object.entries(mapping)) {
        if (level) buckets[level].push(name);
      }
      await setupApi.savePriorityMapping(selectedFieldId, buckets);
    },
    onSuccess: () => {
      setDirty(false);
      queryClient.invalidateQueries({ queryKey: ['clickup-priority-mapping'] });
    },
  });

  const hasValues = (priorityData?.values.length ?? 0) > 0;

  // Summary: which values map to each level
  const byLevel = (level: PriorityLevel | null) =>
    (priorityData?.values ?? []).filter((v) => mapping[v.toLowerCase()] === level);

  return (
    <Box sx={{ mt: 1 }}>
      <Divider sx={{ mb: 2 }} />

      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
        <Box>
          <Typography variant="subtitle1" fontWeight={700}>
            Priority mapping
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Pick the custom field that represents priority, then map its values
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            size="small"
            startIcon={isFetching ? <CircularProgress size={13} color="inherit" /> : <RefreshIcon />}
            onClick={() => refetch()}
            disabled={isFetching || !selectedFieldId}
            sx={{ textTransform: 'none' }}
          >
            Refresh
          </Button>
          <Button
            size="small"
            variant="contained"
            startIcon={saveMutation.isPending ? <CircularProgress size={13} color="inherit" /> : <SaveIcon />}
            disabled={!dirty || !selectedFieldId || saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
            sx={{ textTransform: 'none', borderRadius: 2 }}
          >
            {saveMutation.isPending ? 'Saving…' : 'Save'}
          </Button>
        </Box>
      </Box>

      {saveMutation.isSuccess && !dirty && (
        <Alert severity="success" sx={{ mb: 1.5, borderRadius: 2 }}>
          Priority mapping saved
        </Alert>
      )}
      {saveMutation.isError && (
        <Alert severity="error" sx={{ mb: 1.5, borderRadius: 2 }}>
          Failed to save priority mapping
        </Alert>
      )}

      {/* Step 1: field picker */}
      {fieldsLoading ? (
        <Skeleton height={56} sx={{ borderRadius: 2, mb: 2 }} />
      ) : (
        <FormControl size="small" sx={{ minWidth: 280, mb: 2 }}>
          <InputLabel id="priority-field-label">Priority field</InputLabel>
          <Select
            labelId="priority-field-label"
            label="Priority field"
            value={selectedFieldId}
            onChange={(e) => {
              setSelectedFieldId(e.target.value);
              setDirty(true);
            }}
            sx={{ borderRadius: 2 }}
          >
            <MenuItem value="">
              <em>None</em>
            </MenuItem>
            {(fieldsData?.fields ?? []).map((f) => (
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

      {/* Step 2: value rows */}
      {selectedFieldId && valuesLoading && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {[1, 2, 3].map((i) => <Skeleton key={i} height={40} sx={{ borderRadius: 2 }} />)}
        </Box>
      )}

      {selectedFieldId && valuesError && (
        <Alert severity="warning" sx={{ borderRadius: 2 }}>
          Could not load field values
        </Alert>
      )}

      {selectedFieldId && !valuesLoading && !valuesError && hasValues && (
        <>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, mb: 2 }}>
            {(priorityData?.values ?? []).map((v) => (
              <PriorityValueRow
                key={v}
                value={v}
                level={mapping[v.toLowerCase()] ?? null}
                onChange={(l) => assign(v, l)}
              />
            ))}
          </Box>

          {/* Summary */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {LEVELS.map((lvl) => {
              const vals = byLevel(lvl.key);
              return (
                <Box key={lvl.key} sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <Typography variant="caption" fontWeight={700} sx={{ color: lvl.color, minWidth: 64 }}>
                    {lvl.label}
                  </Typography>
                  {vals.length === 0
                    ? <Typography variant="caption" color="text.disabled">— none assigned</Typography>
                    : vals.map((v) => (
                        <Chip
                          key={v}
                          label={v}
                          size="small"
                          sx={{ fontSize: '0.68rem', bgcolor: lvl.color + '22', color: lvl.color, border: `1px solid ${lvl.color}` }}
                        />
                      ))
                  }
                </Box>
              );
            })}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Typography variant="caption" fontWeight={700} color="text.disabled" sx={{ minWidth: 64 }}>
                Ignored
              </Typography>
              {byLevel(null).length === 0
                ? <Typography variant="caption" color="text.disabled">— none</Typography>
                : byLevel(null).map((v) => (
                    <Chip key={v} label={v} size="small" variant="outlined" sx={{ fontSize: '0.68rem', opacity: 0.5 }} />
                  ))
              }
            </Box>
          </Box>
        </>
      )}

      {selectedFieldId && !valuesLoading && !valuesError && !hasValues && (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          No options found for this field — make sure it has predefined values in ClickUp
        </Alert>
      )}
    </Box>
  );
}

// ─── PriorityValueRow ─────────────────────────────────────────────────────────

function PriorityValueRow({
  value,
  level,
  onChange,
}: {
  value: string;
  level: PriorityLevel | null;
  onChange: (l: PriorityLevel | null) => void;
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
      <Typography variant="body2" sx={{ fontWeight: 500, minWidth: 140, flex: '0 0 auto' }}>
        {value}
      </Typography>

      <ToggleButtonGroup
        exclusive
        size="small"
        value={level}
        onChange={(_, v) => onChange(v)}
        sx={{ flexWrap: 'wrap' }}
      >
        {LEVELS.map((lvl) => (
          <ToggleButton
            key={lvl.key}
            value={lvl.key}
            sx={{
              textTransform: 'none',
              fontSize: '0.7rem',
              px: 1.5,
              py: 0.25,
              '&.Mui-selected': { bgcolor: lvl.color + '22', color: lvl.color, borderColor: lvl.color },
            }}
          >
            {lvl.label}
          </ToggleButton>
        ))}
        <ToggleButton
          value={null as any}
          selected={level === null}
          onClick={() => onChange(null)}
          sx={{ textTransform: 'none', fontSize: '0.7rem', px: 1.5, py: 0.25, opacity: 0.6 }}
        >
          Ignore
        </ToggleButton>
      </ToggleButtonGroup>
    </Box>
  );
}
