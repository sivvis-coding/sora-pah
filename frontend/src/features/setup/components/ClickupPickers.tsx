/**
 * Reusable ClickUp pickers used in both SetupWizard and IntegrationsPage.
 *
 * ClickupListPicker  — autocomplete backed by GET /api/setup/clickup/lists
 * ClickupDocPicker   — autocomplete backed by GET /api/setup/clickup/docs
 */
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Autocomplete,
  Box,
  CircularProgress,
  InputAdornment,
  TextField,
  Typography,
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { setupApi, ClickupSpaceList, ClickupDoc } from '../api/setup.api';

// ─── List picker ─────────────────────────────────────────────────────────────

export interface ListOption {
  id: string;
  /** Full breadcrumb label: "Space › Folder › List name" */
  label: string;
}

interface ListPickerProps {
  label: string;
  helperText?: string;
  value: string;
  onChange: (id: string) => void;
  apiKey?: string;
  teamId?: string;
  /** Whether creds are already saved in Cosmos — enables loading even when fields are empty */
  hasSavedCreds?: boolean;
  size?: 'small' | 'medium';
}

export function ClickupListPicker({
  label,
  helperText,
  value,
  onChange,
  apiKey = '',
  teamId = '',
  hasSavedCreds = false,
  size = 'small',
}: ListPickerProps) {
  const hasLocalCreds = !!(apiKey.trim() && teamId.trim());
  const canLoad = hasLocalCreds || hasSavedCreds;

  const { data: spaceLists = [], isFetching, isError } = useQuery<ClickupSpaceList[]>({
    queryKey: ['clickup-lists', apiKey, teamId],
    queryFn: () => setupApi.getClickupLists(
      hasLocalCreds ? apiKey.trim() : undefined,
      hasLocalCreds ? teamId.trim() : undefined,
    ),
    enabled: canLoad,
    staleTime: 60_000,
  });

  const allOptions: ListOption[] = spaceLists.flatMap((s) =>
    s.lists.map((l) => ({ id: l.id, label: `${l.source} › ${l.name}` })),
  );

  const selected = allOptions.find((o) => o.id === value) ?? null;

  return (
    <Autocomplete
      options={allOptions}
      loading={isFetching}
      loadingText="Loading lists…"
      noOptionsText={
        !canLoad
          ? 'Enter API Key and Team ID first'
          : isError
          ? 'Failed to load lists'
          : 'No lists found'
      }
      value={selected}
      onChange={(_, opt) => onChange(opt?.id ?? '')}
      getOptionLabel={(o) => o.label}
      isOptionEqualToValue={(a, b) => a.id === b.id}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          size={size}
          helperText={value ? `ID: ${value}` : helperText}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {isFetching && <CircularProgress size={14} />}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
      renderOption={(props, option) => (
        <li {...props} key={option.id}>
          <Box>
            <Typography variant="body2">{option.label.split(' › ').pop()}</Typography>
            <Typography variant="caption" color="text.secondary">
              {option.label.split(' › ').slice(0, -1).join(' › ')} — ID: {option.id}
            </Typography>
          </Box>
        </li>
      )}
    />
  );
}

// ─── Doc picker ───────────────────────────────────────────────────────────────

interface DocPickerProps {
  label: string;
  helperText?: string;
  value: string;
  onChange: (id: string) => void;
  apiKey: string;
  teamId: string;
  size?: 'small' | 'medium';
}

export function ClickupDocPicker({
  label,
  helperText,
  value,
  onChange,
  apiKey,
  teamId,
  size = 'small',
}: DocPickerProps) {
  const [inputSearch, setInputSearch] = useState('');
  const canLoad = !!(apiKey.trim() && teamId.trim());

  const { data: docs = [], isFetching, isError } = useQuery<ClickupDoc[]>({
    queryKey: ['clickup-docs', apiKey, teamId, inputSearch],
    queryFn: () => setupApi.searchClickupDocs(inputSearch, apiKey.trim(), teamId.trim()),
    enabled: canLoad,
    staleTime: 30_000,
  });

  const selected = docs.find((d) => d.id === value) ?? (value ? { id: value, name: value } : null);

  return (
    <Autocomplete
      options={docs}
      loading={isFetching}
      loadingText="Searching docs…"
      noOptionsText={
        !canLoad
          ? 'Enter API Key and Team ID first'
          : isError
          ? 'Failed to load docs'
          : 'No docs found'
      }
      value={selected}
      onChange={(_, opt) => onChange(opt?.id ?? '')}
      getOptionLabel={(o) => o.name}
      isOptionEqualToValue={(a, b) => a.id === b.id}
      onInputChange={(_, v, reason) => {
        if (reason === 'input') setInputSearch(v);
      }}
      filterOptions={(x) => x} // server-side filtering
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          size={size}
          helperText={value ? `ID: ${value}` : helperText}
          InputProps={{
            ...params.InputProps,
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" sx={{ color: 'text.disabled' }} />
              </InputAdornment>
            ),
            endAdornment: (
              <>
                {isFetching && <CircularProgress size={14} />}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
      renderOption={(props, option) => (
        <li {...props} key={option.id}>
          <Box>
            <Typography variant="body2">{option.name}</Typography>
            <Typography variant="caption" color="text.secondary">ID: {option.id}</Typography>
          </Box>
        </li>
      )}
    />
  );
}
