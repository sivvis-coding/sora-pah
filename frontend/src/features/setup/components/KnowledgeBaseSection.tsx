/**
 * KnowledgeBaseSection
 *
 * Two-step flow:
 *  1. Select a Space from the workspace
 *  2. Browse folders + docs inside that space, select, and index
 */
import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Tooltip,
  TextField,
  InputAdornment,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  ExpandMore as ExpandIcon,
  Folder as FolderIcon,
  Article as DocIcon,
  CloudSync as IndexIcon,
  CheckCircle as IndexedIcon,
  Search as SearchIcon,
  ArrowBack as BackIcon,
} from '@mui/icons-material';
import { setupApi, type ClickupDocGroup, type ClickupSpace, type IndexedDoc } from '../api/setup.api';

export default function KnowledgeBaseSection() {
  const queryClient = useQueryClient();
  const [selectedSpace, setSelectedSpace] = useState<ClickupSpace | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');

  // ─── Spaces ─────────────────────────────────────────────────────────────────
  const {
    data: spaces = [],
    isLoading: spacesLoading,
    isError: spacesError,
  } = useQuery<ClickupSpace[]>({
    queryKey: ['clickup-spaces'],
    queryFn: setupApi.getClickupSpaces,
    staleTime: 120_000,
  });

  // ─── Doc tree (only when space selected) ────────────────────────────────────
  const {
    data: tree = [],
    isLoading: treeLoading,
    isError: treeError,
  } = useQuery<ClickupDocGroup[]>({
    queryKey: ['clickup-doc-tree', selectedSpace?.id],
    queryFn: () => setupApi.getClickupDocTree(selectedSpace!.id),
    enabled: !!selectedSpace,
    staleTime: 60_000,
  });

  // ─── Already indexed docs ───────────────────────────────────────────────────
  const { data: indexed = [] } = useQuery<IndexedDoc[]>({
    queryKey: ['indexed-docs'],
    queryFn: setupApi.getIndexedDocs,
    staleTime: 30_000,
  });

  const indexedIds = new Set(indexed.map((d) => d.docId));

  // ─── Delete indexed doc ──────────────────────────────────────────────────────
  const [confirmDocId, setConfirmDocId] = useState<string | null>(null);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);

  const deleteMutation = useMutation({
    mutationFn: (docId: string) => setupApi.deleteIndexedDoc(docId),
    onMutate: (docId) => setDeletingDocId(docId),
    onSettled: () => { setDeletingDocId(null); setConfirmDocId(null); },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['indexed-docs'] }),
  });

  // ─── Filtered tree ──────────────────────────────────────────────────────────
  const needle = search.toLowerCase().trim();
  const filteredTree = useMemo(() => {
    if (!needle) return tree;
    return tree
      .map((group) => {
        const groupMatch = group.name.toLowerCase().includes(needle);
        const matchingDocs = groupMatch
          ? group.docs
          : group.docs.filter((d) => d.name.toLowerCase().includes(needle));
        if (matchingDocs.length === 0) return null;
        return { ...group, docs: matchingDocs };
      })
      .filter(Boolean) as ClickupDocGroup[];
  }, [tree, needle]);

  // ─── Index mutation ─────────────────────────────────────────────────────────
  const mutation = useMutation({
    mutationFn: () => setupApi.indexDocs(Array.from(selected)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['indexed-docs'] });
      setSelected(new Set());
    },
  });

  const toggle = (docId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(docId) ? next.delete(docId) : next.add(docId);
      return next;
    });
  };

  const toggleGroup = (group: ClickupDocGroup) => {
    const allSelected = group.docs.every((d) => selected.has(d.id));
    setSelected((prev) => {
      const next = new Set(prev);
      group.docs.forEach((d) => (allSelected ? next.delete(d.id) : next.add(d.id)));
      return next;
    });
  };

  const totalDocs = tree.reduce((sum, g) => sum + g.docs.length, 0);
  const filteredCount = filteredTree.reduce((sum, g) => sum + g.docs.length, 0);

  return (
    <Box sx={{ mt: 1 }}>
      <Divider sx={{ mb: 2 }} />

      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
        <Box>
          <Typography variant="subtitle1" fontWeight={700}>
            Knowledge Base
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Select docs to index for the Knowledge Assistant
          </Typography>
        </Box>

        {selectedSpace && (
          <Button
            variant="contained"
            size="small"
            startIcon={mutation.isPending ? <CircularProgress size={14} color="inherit" /> : <IndexIcon />}
            disabled={selected.size === 0 || mutation.isPending}
            onClick={() => mutation.mutate()}
            sx={{ textTransform: 'none', borderRadius: 2 }}
          >
            {mutation.isPending
              ? 'Indexing…'
              : `Index ${selected.size > 0 ? `${selected.size} doc${selected.size > 1 ? 's' : ''}` : 'selected'}`}
          </Button>
        )}
      </Box>

      {/* Already indexed summary */}
      {indexed.length > 0 && (
        <Box sx={{ mb: 1.5 }}>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
            Indexed docs
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
            {indexed.map((d) => {
              const isDeleting = deletingDocId === d.docId;
              const isConfirming = confirmDocId === d.docId;

              if (isDeleting) {
                return (
                  <Chip
                    key={d.docId}
                    icon={<CircularProgress size={12} color="inherit" />}
                    label="Deleting…"
                    size="small"
                    variant="outlined"
                    sx={{ fontSize: '0.7rem', opacity: 0.7 }}
                  />
                );
              }

              if (isConfirming) {
                return (
                  <Chip
                    key={d.docId}
                    label={`Remove "${d.docTitle}"?`}
                    size="small"
                    color="error"
                    variant="filled"
                    onClick={() => deleteMutation.mutate(d.docId)}
                    onDelete={() => setConfirmDocId(null)}
                    deleteIcon={<Tooltip title="Cancel"><span>✕</span></Tooltip>}
                    sx={{ fontSize: '0.7rem', cursor: 'pointer' }}
                  />
                );
              }

              return (
                <Chip
                  key={d.docId}
                  icon={<IndexedIcon sx={{ fontSize: '14px !important' }} />}
                  label={`${d.docTitle} (${d.chunkCount})`}
                  size="small"
                  color="success"
                  variant="outlined"
                  onDelete={() => setConfirmDocId(d.docId)}
                  disabled={!!deletingDocId}
                  sx={{ fontSize: '0.7rem' }}
                />
              );
            })}
          </Box>
        </Box>
      )}

      {/* Mutation feedback */}
      {mutation.isSuccess && (
        <Alert severity="success" sx={{ mb: 1.5, borderRadius: 2 }}>
          Indexed {(mutation.data as any)?.chunksStored ?? '?'} chunks from {(mutation.data as any)?.docsProcessed ?? '?'} docs
        </Alert>
      )}
      {mutation.isError && (
        <Alert severity="error" sx={{ mb: 1.5, borderRadius: 2 }}>
          Indexing failed — check ClickUp and OpenAI config
        </Alert>
      )}

      {/* ── STEP 1: Space selector ── */}
      {!selectedSpace && (
        <>
          {spacesLoading && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 2, color: 'text.secondary' }}>
              <CircularProgress size={16} />
              <Typography variant="body2">Loading spaces…</Typography>
            </Box>
          )}
          {spacesError && (
            <Alert severity="warning" sx={{ borderRadius: 2 }}>
              Could not load spaces — verify ClickUp is active and credentials are saved
            </Alert>
          )}
          {!spacesLoading && !spacesError && spaces.length > 0 && (
            <FormControl size="small" fullWidth>
              <InputLabel>Select a Space</InputLabel>
              <Select
                label="Select a Space"
                value=""
                onChange={(e) => {
                  const space = spaces.find((s) => s.id === e.target.value);
                  if (space) { setSelectedSpace(space); setSearch(''); setSelected(new Set()); }
                }}
              >
                {spaces.map((s) => (
                  <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </>
      )}

      {/* ── STEP 2: Doc tree ── */}
      {selectedSpace && (
        <>
          {/* Space header + back */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <Button
              size="small"
              startIcon={<BackIcon />}
              onClick={() => { setSelectedSpace(null); setSelected(new Set()); setSearch(''); }}
              sx={{ textTransform: 'none', minWidth: 0, px: 1 }}
            >
              Spaces
            </Button>
            <Typography variant="body2" color="text.secondary">/</Typography>
            <Typography variant="body2" fontWeight={600}>{selectedSpace.name}</Typography>
          </Box>

          {treeLoading && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 2, color: 'text.secondary' }}>
              <CircularProgress size={16} />
              <Typography variant="body2">Loading docs…</Typography>
            </Box>
          )}
          {treeError && (
            <Alert severity="warning" sx={{ borderRadius: 2 }}>
              Could not load docs for this space
            </Alert>
          )}
          {!treeLoading && !treeError && totalDocs === 0 && (
            <Typography variant="body2" color="text.disabled" sx={{ py: 1 }}>
              No docs found in this space
            </Typography>
          )}

          {!treeLoading && !treeError && totalDocs > 0 && (
            <>
              <TextField
                size="small"
                fullWidth
                placeholder="Search folders or docs…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
                    </InputAdornment>
                  ),
                }}
                sx={{ mb: 1 }}
              />

              {needle && (
                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                  {filteredCount} of {totalDocs} docs in {filteredTree.length} folder{filteredTree.length !== 1 ? 's' : ''}
                </Typography>
              )}

              <Box sx={{ maxHeight: 360, overflowY: 'auto', pr: 0.5 }}>
                {filteredTree.length === 0 && needle && (
                  <Typography variant="body2" color="text.disabled" sx={{ py: 2, textAlign: 'center' }}>
                    No matches for "{search}"
                  </Typography>
                )}

                {filteredTree.map((group) => {
                  const allChecked = group.docs.every((d) => selected.has(d.id));
                  const someChecked = group.docs.some((d) => selected.has(d.id));

                  return (
                    <Accordion
                      key={group.id}
                      disableGutters
                      elevation={0}
                      defaultExpanded={!!needle}
                      sx={{
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: '8px !important',
                        mb: 0.75,
                        '&:before': { display: 'none' },
                      }}
                    >
                      <AccordionSummary
                        expandIcon={<ExpandIcon />}
                        sx={{ minHeight: 44, '& .MuiAccordionSummary-content': { my: 0.5 } }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%', pr: 1 }}>
                          <Checkbox
                            size="small"
                            checked={allChecked}
                            indeterminate={!allChecked && someChecked}
                            onChange={(e) => { e.stopPropagation(); toggleGroup(group); }}
                            onClick={(e) => e.stopPropagation()}
                            sx={{ p: 0 }}
                          />
                          <FolderIcon sx={{ fontSize: 18, color: 'warning.main', flexShrink: 0 }} />
                          <Typography variant="body2" fontWeight={600} sx={{ flex: 1 }}>
                            {group.name}
                          </Typography>
                          <Typography variant="caption" color="text.disabled">
                            {group.docs.length} doc{group.docs.length !== 1 ? 's' : ''}
                          </Typography>
                        </Box>
                      </AccordionSummary>

                      <AccordionDetails sx={{ pt: 0, pb: 0.5 }}>
                        <List dense disablePadding>
                          {group.docs.map((doc, i) => {
                            const isIndexed = indexedIds.has(doc.id);
                            const indexedInfo = indexed.find((d) => d.docId === doc.id);
                            return (
                              <React.Fragment key={doc.id}>
                                {i > 0 && <Divider component="li" />}
                                <ListItem
                                  dense
                                  disableGutters
                                  sx={{ px: 1, py: 0.25, cursor: 'pointer' }}
                                  onClick={() => toggle(doc.id)}
                                >
                                  <ListItemIcon sx={{ minWidth: 32 }}>
                                    <Checkbox
                                      size="small"
                                      checked={selected.has(doc.id)}
                                      onChange={() => toggle(doc.id)}
                                      onClick={(e) => e.stopPropagation()}
                                      sx={{ p: 0 }}
                                    />
                                  </ListItemIcon>
                                  <ListItemIcon sx={{ minWidth: 28 }}>
                                    <DocIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                                  </ListItemIcon>
                                  <ListItemText
                                    primary={doc.name}
                                    primaryTypographyProps={{ variant: 'body2' }}
                                    secondary={isIndexed ? `${indexedInfo?.chunkCount} chunks indexed` : undefined}
                                    secondaryTypographyProps={{ variant: 'caption', color: 'success.main' }}
                                  />
                                  {isIndexed && (
                                    <Tooltip title="Already indexed">
                                      <IndexedIcon sx={{ fontSize: 16, color: 'success.main', ml: 1 }} />
                                    </Tooltip>
                                  )}
                                </ListItem>
                              </React.Fragment>
                            );
                          })}
                        </List>
                      </AccordionDetails>
                    </Accordion>
                  );
                })}
              </Box>
            </>
          )}
        </>
      )}
    </Box>
  );
}
