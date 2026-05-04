import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import {
  Box,
  Typography,
  List,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Collapse,
  Divider,
  IconButton,
  Tooltip,
  Link,
  Skeleton,
  Drawer,
  TextField,
  Paper,
  Chip,
  CircularProgress,
  Fade,
  Fab,
  useMediaQuery,
  useTheme,
  Breadcrumbs,
} from '@mui/material';
import {
  Article as PageIcon,
  MenuBook as DocIcon,
  ExpandMore,
  ExpandLess,
  OpenInNew as OpenInNewIcon,
  AutoAwesome as AIIcon,
  Send as SendIcon,
  Close as CloseIcon,
  Menu as MenuIcon,
} from '@mui/icons-material';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useQuery } from '@tanstack/react-query';
import { docsApi, type IndexedDoc, type PageNode, type DocPage } from '../api/docs.api';
import { aiApi, type KnowledgeSource } from '../../ideas/api/ai.api';
import { parseClickUpUrl } from '../components/urlParser';

// ─── Constants ────────────────────────────────────────────────────────────────

const SIDEBAR_WIDTH = 280;
const CHAT_WIDTH = 380;

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: KnowledgeSource[];
}

// ─── Markdown styles ──────────────────────────────────────────────────────────

const mdSx = {
  '& p': { m: 0, mb: 1.5, lineHeight: 1.8 },
  '& p:last-child': { mb: 0 },
  '& ul, & ol': { mt: 0.5, mb: 1.5, pl: 3 },
  '& li': { lineHeight: 1.8, mb: 0.5 },
  '& h1': { fontSize: '1.5rem', fontWeight: 700, mt: 0, mb: 1, lineHeight: 1.3 },
  '& h2': { fontSize: '1.2rem', fontWeight: 700, mt: 3, mb: 1 },
  '& h3': { fontSize: '1.05rem', fontWeight: 700, mt: 2, mb: 0.75 },
  '& h4': { fontSize: '1rem', fontWeight: 600, mt: 1.5, mb: 0.5 },
  '& code': {
    fontFamily: 'monospace', fontSize: '0.85em',
    bgcolor: 'action.selected', px: 0.75, py: 0.125, borderRadius: 0.5,
  },
  '& pre': {
    bgcolor: 'action.selected', p: 2, borderRadius: 1.5, overflowX: 'auto', mb: 1.5,
    '& code': { bgcolor: 'transparent', px: 0, py: 0 },
  },
  '& strong': { fontWeight: 700 },
  '& a': { color: 'primary.main' },
  '& blockquote': {
    borderLeft: '4px solid', borderColor: 'primary.main',
    pl: 2, ml: 0, my: 1.5, color: 'text.secondary', fontStyle: 'italic',
  },
  '& hr': { my: 3, borderColor: 'divider' },
  '& table': { width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem', mb: 1.5 },
  '& th, & td': { border: '1px solid', borderColor: 'divider', px: 1.5, py: 0.75 },
  '& th': { fontWeight: 700, bgcolor: 'action.hover', textAlign: 'left' },
  '& img': { maxWidth: '100%', borderRadius: 1.5, my: 1 },
} as const;

const chatMdSx = {
  '& p': { m: 0, mb: 0.5, lineHeight: 1.7, fontSize: '0.8125rem' },
  '& p:last-child': { mb: 0 },
  '& ul, & ol': { mt: 0.5, mb: 0.5, pl: 2.5, fontSize: '0.8125rem' },
  '& li': { fontSize: '0.8125rem', lineHeight: 1.7 },
  '& code': { fontFamily: 'monospace', fontSize: '0.75rem', bgcolor: 'action.selected', px: 0.5, borderRadius: 0.5 },
  '& pre': { bgcolor: 'action.selected', p: 1, borderRadius: 1, overflowX: 'auto', '& code': { bgcolor: 'transparent', px: 0 } },
  '& strong': { fontWeight: 700 },
  '& h1, & h2, & h3': { fontSize: '0.8125rem', fontWeight: 700, mt: 1, mb: 0.5 },
  '& a': { color: 'primary.main' },
  '& blockquote': { borderLeft: '3px solid', borderColor: 'divider', pl: 1, ml: 0, my: 0.5 },
} as const;

// ─── PageTree ─────────────────────────────────────────────────────────────────

interface PageTreeProps {
  nodes: PageNode[];
  docId: string;
  selectedPageId: string | null;
  onSelect: (node: PageNode) => void;
  depth?: number;
  forceExpandIds?: Set<string>;
}

function PageTree({ nodes, docId, selectedPageId, onSelect, depth = 0, forceExpandIds }: PageTreeProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!forceExpandIds?.size) return;
    setExpanded((prev) => {
      const next = { ...prev };
      forceExpandIds.forEach((id) => { next[id] = true; });
      return next;
    });
  }, [forceExpandIds]);

  const toggle = (id: string) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <List disablePadding>
      {nodes.map((node) => {
        const hasChildren = node.children.length > 0;
        const isOpen = !!expanded[node.id];
        const isSelected = selectedPageId === node.id;

        return (
          <React.Fragment key={node.id}>
            <ListItemButton
              selected={isSelected}
              onClick={() => {
                onSelect(node);
                if (hasChildren) toggle(node.id);
              }}
              sx={{
                pl: 1.5 + depth * 1.5,
                pr: 1,
                py: 0.5,
                borderRadius: 1.5,
                mx: 0.75,
                mb: 0.25,
                minHeight: 36,
                '&.Mui-selected': {
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  '&:hover': { bgcolor: 'primary.dark' },
                  '& .MuiListItemIcon-root': { color: 'primary.contrastText' },
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 24 }}>
                <PageIcon sx={{ fontSize: 15, opacity: 0.7 }} />
              </ListItemIcon>
              <ListItemText
                primary={node.name}
                primaryTypographyProps={{ fontSize: '0.8125rem', noWrap: true }}
              />
              {hasChildren && (
                <Box component="span" sx={{ ml: 0.5, display: 'flex', alignItems: 'center' }}>
                  {isOpen ? <ExpandLess sx={{ fontSize: 15 }} /> : <ExpandMore sx={{ fontSize: 15 }} />}
                </Box>
              )}
            </ListItemButton>

            {hasChildren && (
              <Collapse in={isOpen} unmountOnExit>
                <PageTree
                  nodes={node.children}
                  docId={docId}
                  selectedPageId={selectedPageId}
                  onSelect={onSelect}
                  depth={depth + 1}
                  forceExpandIds={forceExpandIds}
                />
              </Collapse>
            )}
          </React.Fragment>
        );
      })}
    </List>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function findNodeById(
  nodes: PageNode[],
  targetId: string,
  ancestors: string[] = [],
): { node: PageNode; ancestors: string[] } | null {
  for (const n of nodes) {
    if (n.id === targetId) return { node: n, ancestors };
    if (n.children.length) {
      const found = findNodeById(n.children, targetId, [...ancestors, n.id]);
      if (found) return found;
    }
  }
  return null;
}

// ─── Sidebar content (shared between permanent & temporary drawer) ────────────

interface SidebarContentProps {
  t: (key: string) => string;
  docs: IndexedDoc[];
  docsLoading: boolean;
  selectedDoc: IndexedDoc | null;
  onSelectDoc: (doc: IndexedDoc) => void;
  tree: PageNode[];
  treeLoading: boolean;
  selectedPageId: string | null;
  onSelectPage: (node: PageNode) => void;
  forceExpandIds: Set<string>;
}

function SidebarContent({
  t, docs, docsLoading, selectedDoc, onSelectDoc,
  tree, treeLoading, selectedPageId, onSelectPage, forceExpandIds,
}: SidebarContentProps) {
  return (
    <Box sx={{ overflowY: 'auto', flex: 1, py: 1 }}>
      {docsLoading && (
        <Box sx={{ px: 2, pt: 1 }}>
          {[1, 2, 3].map((i) => <Skeleton key={i} height={36} sx={{ mb: 0.5 }} />)}
        </Box>
      )}

      {!docsLoading && docs.length === 0 && (
        <Typography variant="caption" color="text.secondary" sx={{ px: 2, py: 1, display: 'block' }}>
          {t('noDocsIndexed')}
        </Typography>
      )}

      {!docsLoading && docs.map((doc) => {
        const isActive = selectedDoc?.docId === doc.docId;
        return (
          <React.Fragment key={doc.docId}>
            <ListItemButton
              selected={isActive}
              onClick={() => onSelectDoc(doc)}
              sx={{
                px: 1.5, py: 0.75, mx: 0.75, borderRadius: 1.5,
                '&.Mui-selected': {
                  bgcolor: 'action.selected',
                  '&:hover': { bgcolor: 'action.focus' },
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 28 }}>
                <DocIcon sx={{ fontSize: 18 }} color={isActive ? 'primary' : 'action'} />
              </ListItemIcon>
              <ListItemText
                primary={doc.docTitle}
                primaryTypographyProps={{
                  fontSize: '0.8125rem',
                  fontWeight: isActive ? 700 : 400,
                  noWrap: true,
                }}
              />
            </ListItemButton>

            <Collapse in={isActive} unmountOnExit>
              {treeLoading ? (
                <Box sx={{ px: 3, py: 1 }}>
                  {[1, 2, 3, 4].map((i) => <Skeleton key={i} height={28} sx={{ mb: 0.25 }} />)}
                </Box>
              ) : (
                <PageTree
                  nodes={tree}
                  docId={doc.docId}
                  selectedPageId={selectedPageId}
                  onSelect={onSelectPage}
                  forceExpandIds={forceExpandIds}
                />
              )}
            </Collapse>
          </React.Fragment>
        );
      })}
    </Box>
  );
}

// ─── DocsPage ─────────────────────────────────────────────────────────────────

export default function DocsPage() {
  const { t } = useTranslation('docs');
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [searchParams, setSearchParams] = useSearchParams();

  // Layout
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  // Doc / page navigation
  const [selectedDoc, setSelectedDoc] = useState<IndexedDoc | null>(null);
  const [selectedPage, setSelectedPage] = useState<PageNode | null>(null);
  const [forceExpandIds, setForceExpandIds] = useState<Set<string>>(new Set());
  const [pendingPageId, setPendingPageId] = useState<string | null>(null);

  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Data queries ────────────────────────────────────────────────────────────

  const { data: docs = [] as IndexedDoc[], isLoading: docsLoading } = useQuery({
    queryKey: ['indexed-docs'],
    queryFn: () => docsApi.listDocs(),
  });

  const { data: tree = [] as PageNode[], isLoading: treeLoading } = useQuery({
    queryKey: ['doc-tree', selectedDoc?.docId],
    queryFn: () => docsApi.getDocTree(selectedDoc!.docId),
    enabled: !!selectedDoc,
  });

  const { data: page, isLoading: pageLoading } = useQuery<DocPage>({
    queryKey: ['doc-page', selectedDoc?.docId, selectedPage?.id],
    queryFn: () => docsApi.getPage(selectedDoc!.docId, selectedPage!.id),
    enabled: !!selectedDoc && !!selectedPage,
  });

  // Auto-select first doc when loaded
  useEffect(() => {
    if (docs.length > 0 && !selectedDoc) {
      // Check for deep-link query params first
      const paramDoc = searchParams.get('doc');
      const paramPage = searchParams.get('page');
      if (paramDoc) {
        const match = docs.find((d: IndexedDoc) => d.docId === paramDoc);
        if (match) {
          setSelectedDoc(match);
          if (paramPage) setPendingPageId(paramPage);
          // Clean query params after consuming them
          setSearchParams({}, { replace: true });
          return;
        }
      }
      setSelectedDoc(docs[0]);
    }
  }, [docs, selectedDoc, searchParams, setSearchParams]);

  // Pending page navigation after doc switch
  useEffect(() => {
    if (!pendingPageId || !tree.length) return;
    const found = findNodeById(tree, pendingPageId);
    if (found) {
      setSelectedPage(found.node);
      setForceExpandIds(new Set(found.ancestors));
    }
    setPendingPageId(null);
  }, [tree, pendingPageId]);

  // ── Navigation ──────────────────────────────────────────────────────────────

  const handleSelectDoc = (doc: IndexedDoc) => {
    setSelectedDoc(doc);
    setSelectedPage(null);
    setForceExpandIds(new Set());
  };

  const handleSelectPage = useCallback((node: PageNode) => {
    setSelectedPage(node);
    if (isMobile) setMobileSidebarOpen(false);
  }, [isMobile]);

  const navigateToDocUrl = useCallback((url: string): boolean => {
    const parsed = parseClickUpUrl(url);
    if (!parsed) return false;
    const { docId, pageId } = parsed;
    const matchingDoc = docs.find((d: IndexedDoc) => d.docId === docId);
    if (!matchingDoc) return false;

    if (selectedDoc?.docId !== docId) {
      setSelectedDoc(matchingDoc);
      setSelectedPage(null);
      setPendingPageId(pageId);
    } else {
      const found = findNodeById(tree, pageId);
      if (found) {
        setSelectedPage(found.node);
        setForceExpandIds(new Set(found.ancestors));
      }
    }
    return true;
  }, [docs, selectedDoc, tree]);

  const navigateToSource = useCallback((source: KnowledgeSource) => {
    navigateToDocUrl(source.url);
  }, [navigateToDocUrl]);

  // ── Chat ────────────────────────────────────────────────────────────────────

  const handleSend = () => {
    const q = input.trim();
    if (!q || chatLoading) return;
    setInput('');
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: q };
    setMessages((prev) => [...prev, userMsg]);
    const history = messages.map((m) => ({ role: m.role, content: m.content }));

    setChatLoading(true);
    aiApi
      .askQuestion(q, history)
      .then((result) => {
        setMessages((cur) => [
          ...cur,
          { id: (Date.now() + 1).toString(), role: 'assistant', content: result.answer, sources: result.sources },
        ]);
      })
      .catch(() => {
        setMessages((cur) => [
          ...cur,
          { id: (Date.now() + 1).toString(), role: 'assistant', content: t('chatError') },
        ]);
      })
      .finally(() => setChatLoading(false));
  };

  // ── Markdown link interceptor ────────────────────────────────────────────────
  // Catches ALL <a> clicks inside markdown containers via event delegation.
  // ClickUp doc links → navigate internally; external → new tab. Never leaves the app.

  const handleContentClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const anchor = (e.target as HTMLElement).closest('a');
    if (!anchor) return;

    const url = anchor.getAttribute('href');
    if (!url) return;

    e.preventDefault();

    // Internal ClickUp doc link → navigate in viewer
    if (url.includes('doc.clickup.com')) {
      if (!navigateToDocUrl(url)) {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
      return;
    }

    // External link → new tab
    window.open(url, '_blank', 'noopener,noreferrer');
  }, [navigateToDocUrl]);

  // ── Shared sidebar props ────────────────────────────────────────────────────

  const sidebarProps: SidebarContentProps = {
    t, docs, docsLoading, selectedDoc, onSelectDoc: handleSelectDoc,
    tree, treeLoading, selectedPageId: selectedPage?.id ?? null,
    onSelectPage: handleSelectPage, forceExpandIds,
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <Box
      id="docs-page-root"
      sx={{
        display: 'flex',
        m: { xs: -2, sm: -3 },
        flex: 1,
        overflow: 'hidden',
        position: 'relative',
      }}
    >

      {/* ── SIDEBAR — permanent on desktop, temporary drawer on mobile ──── */}
      {isMobile ? (
        <Drawer
          variant="temporary"
          open={mobileSidebarOpen}
          onClose={() => setMobileSidebarOpen(false)}
          PaperProps={{ sx: { width: SIDEBAR_WIDTH } }}
          ModalProps={{ keepMounted: true }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', px: 2, py: 1.5, gap: 1 }}>
            <DocIcon fontSize="small" color="primary" />
            <Typography variant="subtitle2" fontWeight={700} sx={{ flex: 1 }}>
              {t('documentation')}
            </Typography>
            <IconButton size="small" onClick={() => setMobileSidebarOpen(false)}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
          <Divider />
          <SidebarContent {...sidebarProps} />
        </Drawer>
      ) : (
        <Box
          sx={{
            width: SIDEBAR_WIDTH,
            minWidth: SIDEBAR_WIDTH,
            borderRight: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            flexDirection: 'column',
            bgcolor: 'background.paper',
            flexShrink: 0,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', px: 2, py: 1.5, gap: 1, flexShrink: 0 }}>
            <DocIcon fontSize="small" color="primary" />
            <Typography variant="subtitle2" fontWeight={700}>
              {t('documentation')}
            </Typography>
          </Box>
          <Divider />
          <SidebarContent {...sidebarProps} />
        </Box>
      )}

      {/* ── CONTENT AREA ───────────────────────────────────────────────────── */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

        {/* Toolbar */}
        <Box
          sx={{
            display: 'flex', alignItems: 'center', gap: 1,
            px: { xs: 2, sm: 3 }, py: 1,
            borderBottom: '1px solid', borderColor: 'divider',
            flexShrink: 0, minHeight: 44,
            bgcolor: 'background.paper',
          }}
        >
          {isMobile && (
            <IconButton size="small" edge="start" onClick={() => setMobileSidebarOpen(true)}>
              <MenuIcon fontSize="small" />
            </IconButton>
          )}

          {selectedPage ? (
            <>
              <Breadcrumbs
                separator="›"
                sx={{ flex: 1, '& .MuiBreadcrumbs-separator': { mx: 0.5, fontSize: '0.75rem' } }}
              >
                <Typography variant="caption" color="text.secondary" noWrap>
                  {selectedDoc?.docTitle}
                </Typography>
                <Typography variant="caption" fontWeight={600} noWrap>
                  {selectedPage.name}
                </Typography>
              </Breadcrumbs>
              <Tooltip title={t('openInClickUp')}>
                <IconButton
                  component={Link}
                  href={selectedPage.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  size="small"
                >
                  <OpenInNewIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </>
          ) : (
            <Typography variant="caption" color="text.disabled" sx={{ flex: 1 }}>
              {isMobile ? t('tapMenuToStart') : t('selectPage')}
            </Typography>
          )}
        </Box>

        {/* Page content */}
        <Box
          sx={{
            flex: 1,
            overflowY: 'auto',
            px: { xs: 2.5, sm: 4, md: 6 },
            py: { xs: 2.5, sm: 4 },
          }}
        >
          <Box sx={{ maxWidth: 780, mx: 'auto' }}>

            {/* Empty state */}
            {!selectedPage && !pageLoading && (
              <Box sx={{ textAlign: 'center', pt: { xs: 6, sm: 10 }, color: 'text.disabled' }}>
                <DocIcon sx={{ fontSize: { xs: 48, sm: 64 }, mb: 2, opacity: 0.25 }} />
                <Typography variant="h6" gutterBottom sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                  {t('emptyTitle')}
                </Typography>
                <Typography variant="body2">
                  {isMobile ? t('tapMenuToStart') : t('emptySubtitle')}
                </Typography>
              </Box>
            )}

            {/* Loading skeleton */}
            {pageLoading && (
              <Box>
                <Skeleton variant="text" height={40} width="70%" sx={{ mb: 2 }} />
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} variant="text" height={20} width={`${90 - i * 5}%`} sx={{ mb: 0.75 }} />
                ))}
                <Skeleton variant="text" height={20} width="40%" sx={{ mt: 2, mb: 0.75 }} />
                {[1, 2, 3].map((i) => (
                  <Skeleton key={`b${i}`} variant="text" height={20} width={`${85 - i * 8}%`} sx={{ mb: 0.75 }} />
                ))}
              </Box>
            )}

            {/* Page content */}
            {page && !pageLoading && (
              <>
                {/* Markdown body (may be empty for parent-only pages) */}
                {page.content.trim() && (
                  <Box onClick={handleContentClick} sx={{ ...mdSx, fontSize: { xs: '0.875rem', sm: '0.9375rem' } }}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{page.content}</ReactMarkdown>
                  </Box>
                )}

                {/* Subpages list — like ClickUp's child page table */}
                {selectedPage && selectedPage.children.length > 0 && (
                  <Box sx={{ mt: page.content.trim() ? 4 : 0 }}>
                    {/* Page title when content is empty (parent-only page) */}
                    {!page.content.trim() && (
                      <Typography variant="h5" fontWeight={700} sx={{ mb: 3 }}>
                        {selectedPage.name}
                      </Typography>
                    )}

                    <Typography
                      variant="overline"
                      color="text.secondary"
                      sx={{ display: 'block', mb: 1, fontSize: '0.6875rem', letterSpacing: 1.2 }}
                    >
                      {t('subpages')}
                    </Typography>
                    <Divider sx={{ mb: 0.5 }} />

                    <List disablePadding>
                      {selectedPage.children.map((child) => (
                        <ListItemButton
                          key={child.id}
                          onClick={() => handleSelectPage(child)}
                          sx={{
                            borderRadius: 1.5,
                            mb: 0.25,
                            py: 1,
                            '&:hover': { bgcolor: 'action.hover' },
                          }}
                        >
                          <ListItemIcon sx={{ minWidth: 36 }}>
                            <PageIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
                          </ListItemIcon>
                          <ListItemText
                            primary={child.name}
                            primaryTypographyProps={{ fontWeight: 500, fontSize: '0.9375rem' }}
                          />
                          {child.children.length > 0 && (
                            <Typography variant="caption" color="text.disabled" sx={{ ml: 1 }}>
                              {child.children.length}
                            </Typography>
                          )}
                        </ListItemButton>
                      ))}
                    </List>
                  </Box>
                )}
              </>
            )}
          </Box>
        </Box>
      </Box>

      {/* ── CHAT FAB ───────────────────────────────────────────────────────── */}
      <Fade in={!chatOpen}>
        <Fab
          color="primary"
          size={isMobile ? 'medium' : 'large'}
          onClick={() => setChatOpen(true)}
          sx={{
            position: 'absolute',
            bottom: { xs: 16, sm: 24 },
            right: { xs: 16, sm: 24 },
            zIndex: 10,
            boxShadow: 4,
          }}
        >
          <AIIcon />
        </Fab>
      </Fade>

      {/* ── CHAT DRAWER — always temporary overlay ─────────────────────────── */}
      <Drawer
        anchor="right"
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        PaperProps={{
          sx: {
            width: { xs: '100%', sm: CHAT_WIDTH },
            display: 'flex',
            flexDirection: 'column',
          },
        }}
      >
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1.5, flexShrink: 0 }}>
          <AIIcon fontSize="small" color="primary" />
          <Typography variant="subtitle2" fontWeight={700} sx={{ flex: 1 }}>
            {t('chatTitle')}
          </Typography>
          <IconButton size="small" onClick={() => setChatOpen(false)}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
        <Divider />

        {/* Messages */}
        <Box sx={{ flex: 1, overflowY: 'auto', px: 2, py: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {messages.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 6, color: 'text.disabled' }}>
              <AIIcon sx={{ fontSize: 36, mb: 1, opacity: 0.4 }} />
              <Typography variant="body2" sx={{ fontSize: '0.8125rem' }}>{t('chatEmptyState')}</Typography>
            </Box>
          )}

          {messages.map((msg) => (
            <Fade in key={msg.id}>
              <Paper
                elevation={0}
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  maxWidth: '92%',
                  alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  bgcolor: msg.role === 'user' ? 'primary.main' : 'grey.100',
                  color: msg.role === 'user' ? 'primary.contrastText' : 'text.primary',
                }}
              >
                {msg.role === 'user' ? (
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, fontSize: '0.8125rem' }}>
                    {msg.content}
                  </Typography>
                ) : (
                  <Box onClick={handleContentClick} sx={chatMdSx}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                  </Box>
                )}

                {msg.sources && msg.sources.length > 0 && (
                  <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    <Typography
                      variant="caption"
                      sx={{ opacity: 0.6, width: '100%', mb: 0.25, fontSize: '0.6875rem' }}
                    >
                      {t('sources')}
                    </Typography>
                    {msg.sources.map((s) => (
                      <Chip
                        key={s.url}
                        label={s.title}
                        size="small"
                        icon={<PageIcon />}
                        onClick={() => { navigateToSource(s); setChatOpen(false); }}
                        variant="outlined"
                        sx={{
                          fontSize: '0.6875rem',
                          height: 24,
                          cursor: 'pointer',
                          '& .MuiChip-icon': { fontSize: 14 },
                        }}
                      />
                    ))}
                  </Box>
                )}
              </Paper>
            </Fade>
          ))}

          {chatLoading && <CircularProgress size={18} sx={{ alignSelf: 'flex-start', ml: 0.5 }} />}
          <div ref={chatEndRef} />
        </Box>

        <Divider />

        {/* Input */}
        <Box sx={{ px: 2, py: 1.5, display: 'flex', gap: 1, alignItems: 'center', flexShrink: 0 }}>
          <TextField
            fullWidth
            size="small"
            placeholder={t('chatPlaceholder')}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
            }}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
          <IconButton
            color="primary"
            onClick={handleSend}
            disabled={!input.trim() || chatLoading}
            sx={{ minWidth: 40, minHeight: 40 }}
          >
            <SendIcon fontSize="small" />
          </IconButton>
        </Box>
      </Drawer>
    </Box>
  );
}
