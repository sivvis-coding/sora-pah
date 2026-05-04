/**
 * TagInput — multi-select tag picker with:
 *  - Autocomplete from existing tags (ordered by usage)
 *  - Create on-the-fly: type a new name + Enter/select "Add X"
 *  - AI suggest button (only shown when aiAvailable=true)
 *
 * Usage:
 *   <TagInput
 *     value={tagIds}
 *     onChange={setTagIds}
 *     ideaTitle={title}
 *     ideaDescription={description}
 *     aiAvailable={features.openai}
 *   />
 */
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Autocomplete,
  Box,
  Chip,
  CircularProgress,
  createFilterOptions,
  IconButton,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { AutoAwesome as AiIcon } from '@mui/icons-material';
import { tagsApi, Tag } from '../api/tags.api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TagOption extends Tag {
  inputValue?: string; // present only for "create" sentinel option
}

const filter = createFilterOptions<TagOption>();

// ─── Props ────────────────────────────────────────────────────────────────────

interface TagInputProps {
  /** Array of selected tag IDs */
  value: string[];
  onChange: (tagIds: string[]) => void;
  /** Used by AI suggest — pass current idea title */
  ideaTitle?: string;
  /** Used by AI suggest — pass current idea description */
  ideaDescription?: string;
  /** Show the AI suggest button */
  aiAvailable?: boolean;
  size?: 'small' | 'medium';
  label?: string;
  helperText?: string;
  disabled?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TagInput({
  value,
  onChange,
  ideaTitle = '',
  ideaDescription = '',
  aiAvailable = false,
  size = 'small',
  label,
  helperText,
  disabled = false,
}: TagInputProps) {
  const { t } = useTranslation('ideas');
  const queryClient = useQueryClient();
  const [aiLoading, setAiLoading] = useState(false);

  // All tags for autocomplete
  const { data: allTags = [], isLoading: loadingTags } = useQuery<Tag[]>({
    queryKey: ['tags'],
    queryFn: tagsApi.getAll,
    staleTime: 60_000,
  });

  // Selected Tag objects
  const selectedTags = value
    .map((id) => allTags.find((t) => t.id === id))
    .filter((t): t is Tag => !!t);

  // Create-on-the-fly mutation
  const createMutation = useMutation({
    mutationFn: (name: string) => tagsApi.create(name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tags'] }),
  });

  const handleChange = async (_: React.SyntheticEvent, newValue: (TagOption | string)[]) => {
    const resolved: string[] = [];

    for (const item of newValue) {
      if (typeof item === 'string') {
        // Free-solo typed string — find or create
        const existing = allTags.find(
          (t) => t.name === item.toLowerCase().trim(),
        );
        if (existing) {
          resolved.push(existing.id);
        } else {
          const created = await createMutation.mutateAsync(item.trim());
          resolved.push(created.id);
        }
      } else if (item.inputValue) {
        // "Add X" sentinel option
        const created = await createMutation.mutateAsync(item.inputValue);
        resolved.push(created.id);
      } else {
        resolved.push(item.id);
      }
    }

    onChange(resolved);
  };

  // AI suggest
  const handleAiSuggest = async () => {
    if (!ideaTitle.trim() && !ideaDescription.trim()) return;
    setAiLoading(true);
    try {
      const { tags: suggested } = await tagsApi.suggest({
        title: ideaTitle,
        description: ideaDescription,
        existingTagNames: allTags.map((t) => t.name),
      });
      // Merge: add suggested IDs not already selected
      const newIds = suggested
        .filter((s) => !value.includes(s.id))
        .map((s) => s.id);
      if (newIds.length > 0) {
        onChange([...value, ...newIds]);
        queryClient.invalidateQueries({ queryKey: ['tags'] });
      }
    } finally {
      setAiLoading(false);
    }
  };

  const labelText = label ?? t('tags.label', 'Tags');

  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
      <Autocomplete
        multiple
        freeSolo
        options={allTags as TagOption[]}
        value={selectedTags as TagOption[]}
        onChange={handleChange}
        loading={loadingTags || createMutation.isPending}
        disabled={disabled}
        getOptionLabel={(option) => {
          if (typeof option === 'string') return option;
          if (option.inputValue) return option.inputValue;
          return option.name;
        }}
        filterOptions={(options, params) => {
          const filtered = filter(options, params);
          const inputValue = params.inputValue.trim().toLowerCase();
          const exists = options.some((o) => o.name === inputValue);
          if (inputValue && !exists) {
            filtered.push({
              // sentinel option — all required Tag fields set to defaults
              id: '__new__',
              name: inputValue,
              color: '#6366f1',
              usageCount: 0,
              createdBy: '',
              createdAt: '',
              inputValue: params.inputValue.trim(),
            });
          }
          return filtered;
        }}
        renderOption={(props, option) => (
          <li {...props} key={option.inputValue ? `__new__${option.inputValue}` : option.id}>
            {option.inputValue ? (
              <Typography variant="body2">
                + {t('tags.addNew', 'Add')} "<strong>{option.inputValue}</strong>"
              </Typography>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box
                  sx={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    bgcolor: option.color,
                    flexShrink: 0,
                  }}
                />
                <Typography variant="body2">{option.name}</Typography>
                <Typography variant="caption" color="text.disabled" sx={{ ml: 'auto' }}>
                  {option.usageCount}
                </Typography>
              </Box>
            )}
          </li>
        )}
        renderTags={(tagValue, getTagProps) =>
          tagValue.map((option, index) => (
            <Chip
              {...getTagProps({ index })}
              key={option.id}
              label={option.name}
              size="small"
              sx={{
                bgcolor: option.color + '22',
                color: option.color,
                borderColor: option.color + '44',
                border: '1px solid',
                fontWeight: 600,
                fontSize: '0.75rem',
              }}
            />
          ))
        }
        renderInput={(params) => (
          <TextField
            {...params}
            label={labelText}
            size={size}
            helperText={helperText}
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {(loadingTags || createMutation.isPending) && (
                    <CircularProgress size={14} />
                  )}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
          />
        )}
        sx={{ flex: 1 }}
        isOptionEqualToValue={(a, b) => a.id === b.id}
        selectOnFocus
        clearOnBlur
        handleHomeEndKeys
      />

      {aiAvailable && (
        <Tooltip title={t('tags.aiSuggest', 'Sugerir tags con IA')}>
          <span>
            <IconButton
              size="small"
              onClick={handleAiSuggest}
              disabled={aiLoading || disabled || (!ideaTitle.trim() && !ideaDescription.trim())}
              sx={{ mt: size === 'small' ? 0.5 : 1 }}
            >
              {aiLoading ? (
                <CircularProgress size={16} />
              ) : (
                <AiIcon fontSize="small" color="primary" />
              )}
            </IconButton>
          </span>
        </Tooltip>
      )}
    </Box>
  );
}
