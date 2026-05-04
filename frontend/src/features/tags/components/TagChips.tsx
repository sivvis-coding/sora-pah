import React from 'react';
import { Box, Chip } from '@mui/material';
import { Tag } from '../api/tags.api';

interface TagChipsProps {
  tags: Tag[];
  size?: 'small' | 'medium';
  /** If provided, clicking a chip calls this with the tag id (for filtering) */
  onTagClick?: (tagId: string) => void;
}

export default function TagChips({ tags, size = 'small', onTagClick }: TagChipsProps) {
  if (!tags || tags.length === 0) return null;

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
      {tags.map((tag) => (
        <Chip
          key={tag.id}
          label={tag.name}
          size={size}
          onClick={onTagClick ? () => onTagClick(tag.id) : undefined}
          sx={{
            bgcolor: tag.color + '22',
            color: tag.color,
            borderColor: tag.color + '44',
            border: '1px solid',
            fontWeight: 600,
            fontSize: '0.72rem',
            cursor: onTagClick ? 'pointer' : 'default',
          }}
        />
      ))}
    </Box>
  );
}
