import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Typography,
  Paper,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Tooltip,
  ToggleButton,
  ToggleButtonGroup,
  Avatar,
  Collapse,
  Divider,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Event as EventIcon,
  OpenInNew as LinkIcon,
  Add as AddIcon,
  Schedule as DurationIcon,
  People as AttendeesIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Check as CheckIcon,
} from '@mui/icons-material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  learnApi,
  type TrainingSession,
  type DayTimeSlot,
  type WeekDay,
  type TimeSlot,
  type TrainingFormat,
  type TrainingStatus,
} from '../api/learn.api';
import { useAuth } from '../../auth/AuthContext';
import { useMode } from '../../../shared/ModeContext';
import { AppMode } from '../../../shared/constants';

const DAYS: WeekDay[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
const TIME_SLOTS: TimeSlot[] = ['morning', 'afternoon', 'all-day'];
const FORMATS: TrainingFormat[] = ['online', 'in-person', 'either'];

interface TrainingSectionProps {
  sessions: TrainingSession[];
  isLoading: boolean;
}

// ─── Grid picker helpers ──────────────────────────────────────────────────────

/** Find slot for a given day in the selection */
function findSlot(slots: DayTimeSlot[], day: WeekDay): TimeSlot | null {
  const s = slots.find((sl) => sl.day === day);
  return s ? s.time : null;
}

/** Toggle a cell in the grid: same cell = remove, different time = replace, new day = add */
function toggleSlot(slots: DayTimeSlot[], day: WeekDay, time: TimeSlot): DayTimeSlot[] {
  const existing = findSlot(slots, day);
  if (existing === time) {
    // Deselect
    return slots.filter((s) => s.day !== day);
  }
  // Replace or add
  return [...slots.filter((s) => s.day !== day), { day, time }];
}

export default function TrainingSection({ sessions, isLoading }: TrainingSectionProps) {
  const { t } = useTranslation('learn');
  const { user } = useAuth();
  const { mode } = useMode();
  const queryClient = useQueryClient();
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down('sm'));

  const isAdmin = mode === AppMode.ADMIN;
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // ── Propose dialog ──────────────────────────────────────────────────────────
  const [proposeOpen, setProposeOpen] = useState(false);
  const [proposeForm, setProposeForm] = useState({ title: '', description: '', format: 'either' as TrainingFormat });

  // ── Join dialog (grid picker) ───────────────────────────────────────────────
  const [joinTarget, setJoinTarget] = useState<string | null>(null);
  const [joinSlots, setJoinSlots] = useState<DayTimeSlot[]>([]);

  // ── Admin schedule dialog ───────────────────────────────────────────────────
  const [scheduleTarget, setScheduleTarget] = useState<string | null>(null);
  const [scheduleForm, setScheduleForm] = useState({ scheduledAt: '', durationMinutes: '', link: '', location: '' });

  // ── Mutations ───────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: (data: { title: string; description: string; format?: TrainingFormat }) =>
      learnApi.createTrainingSession(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learn-training'] });
      setProposeOpen(false);
      setProposeForm({ title: '', description: '', format: 'either' });
    },
  });

  const joinMutation = useMutation({
    mutationFn: ({ id, slots }: { id: string; slots: DayTimeSlot[] }) =>
      learnApi.joinTraining(id, { slots }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learn-training'] });
      setJoinTarget(null);
      setJoinSlots([]);
    },
  });

  const leaveMutation = useMutation({
    mutationFn: (id: string) => learnApi.leaveTraining(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['learn-training'] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { status?: TrainingStatus; scheduledAt?: string; durationMinutes?: number; link?: string; location?: string } }) =>
      learnApi.updateTrainingSession(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learn-training'] });
      setScheduleTarget(null);
      setScheduleForm({ scheduledAt: '', durationMinutes: '', link: '', location: '' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => learnApi.deleteTrainingSession(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['learn-training'] }),
  });

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handlePropose = () => {
    if (!proposeForm.title.trim() || !proposeForm.description.trim()) return;
    createMutation.mutate({
      title: proposeForm.title.trim(),
      description: proposeForm.description.trim(),
      format: proposeForm.format,
    });
  };

  const handleJoin = () => {
    if (!joinTarget || joinSlots.length === 0) return;
    joinMutation.mutate({ id: joinTarget, slots: joinSlots });
  };

  const openJoinDialog = (sessionId: string) => {
    // Pre-fill with user's existing availability if re-joining
    const session = sessions.find((s) => s.id === sessionId);
    const existing = session?.attendees.find((a) => a.userId === user?.id);
    setJoinSlots(existing?.slots ?? []);
    setJoinTarget(sessionId);
  };

  const handleSchedule = () => {
    if (!scheduleTarget || !scheduleForm.scheduledAt) return;
    updateMutation.mutate({
      id: scheduleTarget,
      data: {
        status: 'scheduled',
        scheduledAt: new Date(scheduleForm.scheduledAt).toISOString(),
        durationMinutes: scheduleForm.durationMinutes ? parseInt(scheduleForm.durationMinutes) : undefined,
        link: scheduleForm.link || undefined,
        location: scheduleForm.location || undefined,
      },
    });
  };

  const statusColor: Record<TrainingStatus, 'warning' | 'info' | 'success' | 'error'> = {
    proposed: 'warning',
    scheduled: 'info',
    completed: 'success',
    cancelled: 'error',
  };

  // ── Availability heat map — count per day×time ──────────────────────────────

  const buildHeatMap = (session: TrainingSession): Record<string, number> => {
    const map: Record<string, number> = {};
    for (const att of session.attendees) {
      for (const slot of att.slots) {
        const key = `${slot.day}-${slot.time}`;
        map[key] = (map[key] || 0) + 1;
      }
    }
    return map;
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  if (!isLoading && sessions.length === 0 && !isAdmin) {
    return (
      <Box sx={{ py: 6, textAlign: 'center', color: 'text.disabled' }}>
        <EventIcon sx={{ fontSize: 48, mb: 1, opacity: 0.3 }} />
        <Typography variant="body2">{t('training.empty')}</Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Anyone can propose */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button variant="outlined" size="small" startIcon={<AddIcon />} onClick={() => setProposeOpen(true)}>
          {t('training.propose')}
        </Button>
      </Box>

      {sessions.length === 0 && (
        <Box sx={{ py: 6, textAlign: 'center', color: 'text.disabled' }}>
          <EventIcon sx={{ fontSize: 48, mb: 1, opacity: 0.3 }} />
          <Typography variant="body2">{t('training.empty')}</Typography>
        </Box>
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {sessions.map((s) => {
          const hasJoined = user?.id ? s.attendees.some((a) => a.userId === user.id) : false;
          const isExpanded = expandedId === s.id;
          const canAct = s.status === 'proposed' || s.status === 'scheduled';
          const heatMap = buildHeatMap(s);

          return (
            <Paper
              key={s.id}
              elevation={0}
              sx={{
                border: '1px solid',
                borderColor: s.status === 'completed' ? 'success.light' : 'divider',
                borderRadius: 2.5,
                overflow: 'hidden',
              }}
            >
              <Box sx={{ px: 2.5, py: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, flexWrap: 'wrap' }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
                      <Typography variant="subtitle2" fontWeight={600}>
                        {s.title}
                      </Typography>
                      <Chip
                        label={t(`training.status.${s.status}`)}
                        size="small"
                        color={statusColor[s.status]}
                        variant="outlined"
                        sx={{ height: 20, fontSize: '0.625rem' }}
                      />
                      <Chip
                        label={t(`training.format.${s.format}`)}
                        size="small"
                        variant="outlined"
                        sx={{ height: 20, fontSize: '0.625rem' }}
                      />
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8125rem', mb: 1 }}>
                      {s.description}
                    </Typography>

                    {/* Meta row */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                      <Typography variant="caption" color="text.disabled">
                        {t('training.proposedBy', { name: s.proposedByName })}
                      </Typography>
                      {s.scheduledAt && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <EventIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                          <Typography variant="caption" color="text.secondary">
                            {new Date(s.scheduledAt).toLocaleDateString(undefined, {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </Typography>
                        </Box>
                      )}
                      {s.durationMinutes && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <DurationIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                          <Typography variant="caption" color="text.secondary">
                            {t('training.duration', { minutes: s.durationMinutes })}
                          </Typography>
                        </Box>
                      )}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <AttendeesIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                        <Typography variant="caption" color="text.secondary">
                          {t('training.interested', { count: s.attendees.length })}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>

                  {/* Actions */}
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexShrink: 0 }}>
                    {s.link && (
                      <Tooltip title={t('training.openLink')}>
                        <IconButton size="small" href={s.link} target="_blank" rel="noopener noreferrer" component="a">
                          <LinkIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    {canAct && (
                      hasJoined ? (
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => openJoinDialog(s.id)}
                          >
                            {t('training.editAvailability')}
                          </Button>
                          <Button
                            size="small"
                            variant="text"
                            color="inherit"
                            onClick={() => leaveMutation.mutate(s.id)}
                            disabled={leaveMutation.isPending}
                          >
                            {t('training.leave')}
                          </Button>
                        </Box>
                      ) : (
                        <Button
                          size="small"
                          variant="contained"
                          onClick={() => openJoinDialog(s.id)}
                        >
                          {t('training.join')}
                        </Button>
                      )
                    )}
                    <IconButton size="small" onClick={() => setExpandedId(isExpanded ? null : s.id)}>
                      {isExpanded ? <CollapseIcon fontSize="small" /> : <ExpandIcon fontSize="small" />}
                    </IconButton>
                  </Box>
                </Box>
              </Box>

              {/* Expanded: availability heat map + attendees */}
              <Collapse in={isExpanded} unmountOnExit>
                <Divider />
                <Box sx={{ px: 2.5, py: 2 }}>
                  {/* Heat map grid */}
                  {s.attendees.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                        {t('training.availabilityOverview')}
                      </Typography>
                      <Box
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: 'auto repeat(3, 1fr)',
                          gap: 0.5,
                          maxWidth: 400,
                        }}
                      >
                        {/* Header row */}
                        <Box />
                        {TIME_SLOTS.map((ts) => (
                          <Typography key={ts} variant="caption" color="text.secondary" sx={{ textAlign: 'center', fontSize: '0.65rem', fontWeight: 600 }}>
                            {t(`training.times.${ts}`)}
                          </Typography>
                        ))}
                        {/* Day rows */}
                        {DAYS.map((day) => (
                          <React.Fragment key={day}>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', fontWeight: 600, pr: 1 }}>
                              {t(`training.days.${day}`)}
                            </Typography>
                            {TIME_SLOTS.map((ts) => {
                              const count = heatMap[`${day}-${ts}`] || 0;
                              const max = s.attendees.length;
                              const intensity = max > 0 ? count / max : 0;
                              return (
                                <Box
                                  key={ts}
                                  sx={{
                                    height: 28,
                                    borderRadius: 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    bgcolor: count > 0
                                      ? `rgba(25, 118, 210, ${0.1 + intensity * 0.5})`
                                      : 'action.hover',
                                    border: '1px solid',
                                    borderColor: count > 0 ? 'primary.light' : 'transparent',
                                  }}
                                >
                                  <Typography variant="caption" sx={{ fontSize: '0.7rem', fontWeight: count > 0 ? 700 : 400, color: count > 0 ? 'primary.main' : 'text.disabled' }}>
                                    {count > 0 ? count : '–'}
                                  </Typography>
                                </Box>
                              );
                            })}
                          </React.Fragment>
                        ))}
                      </Box>
                    </Box>
                  )}

                  {/* Attendee list */}
                  {s.attendees.length > 0 && (
                    <Box>
                      <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ mb: 0.75, display: 'block' }}>
                        {t('training.attendeeList')}
                      </Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                        {s.attendees.map((att) => (
                          <Box key={att.userId} sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                            <Avatar sx={{ width: 22, height: 22, fontSize: '0.65rem', bgcolor: 'grey.400' }}>
                              {att.userName.charAt(0)}
                            </Avatar>
                            <Typography variant="caption" fontWeight={600}>{att.userName}</Typography>
                            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                              {att.slots.map((sl) => (
                                <Chip
                                  key={`${sl.day}-${sl.time}`}
                                  label={`${t(`training.days.${sl.day}`)} ${t(`training.times.${sl.time}`).toLowerCase()}`}
                                  size="small"
                                  variant="outlined"
                                  sx={{ height: 20, fontSize: '0.625rem' }}
                                />
                              ))}
                            </Box>
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  )}

                  {/* Admin actions */}
                  {isAdmin && (
                    <Box sx={{ display: 'flex', gap: 1, mt: 2, pt: 1.5, borderTop: '1px solid', borderColor: 'divider', justifyContent: 'flex-end' }}>
                      {s.status === 'proposed' && (
                        <Button size="small" variant="outlined" startIcon={<EditIcon />} onClick={() => setScheduleTarget(s.id)}>
                          {t('training.schedule')}
                        </Button>
                      )}
                      {s.status === 'scheduled' && (
                        <Button
                          size="small"
                          variant="outlined"
                          color="success"
                          onClick={() => updateMutation.mutate({ id: s.id, data: { status: 'completed' } })}
                        >
                          {t('training.markCompleted')}
                        </Button>
                      )}
                      <Tooltip title={t('training.delete')}>
                        <IconButton size="small" color="error" onClick={() => deleteMutation.mutate(s.id)} disabled={deleteMutation.isPending}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  )}
                </Box>
              </Collapse>
            </Paper>
          );
        })}
      </Box>

      {/* ── Propose dialog ───────────────────────────────────────────────────── */}
      <Dialog open={proposeOpen} onClose={() => setProposeOpen(false)} fullWidth maxWidth="sm" fullScreen={isXs}>
        <DialogTitle>{t('training.propose')}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
          <TextField
            label={t('training.titleLabel')}
            value={proposeForm.title}
            onChange={(e) => setProposeForm((f) => ({ ...f, title: e.target.value }))}
            fullWidth
            size="small"
          />
          <TextField
            label={t('training.descriptionLabel')}
            value={proposeForm.description}
            onChange={(e) => setProposeForm((f) => ({ ...f, description: e.target.value }))}
            fullWidth
            size="small"
            multiline
            rows={3}
          />
          <Box>
            <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ mb: 1, display: 'block' }}>
              {t('training.formatLabel')}
            </Typography>
            <ToggleButtonGroup
              value={proposeForm.format}
              exclusive
              onChange={(_, v) => { if (v) setProposeForm((f) => ({ ...f, format: v })); }}
              size="small"
              fullWidth
            >
              {FORMATS.map((fmt) => (
                <ToggleButton key={fmt} value={fmt} sx={{ textTransform: 'none', fontSize: '0.8125rem' }}>
                  {t(`training.format.${fmt}`)}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setProposeOpen(false)}>{t('training.cancel')}</Button>
          <Button
            variant="contained"
            onClick={handlePropose}
            disabled={!proposeForm.title.trim() || !proposeForm.description.trim() || createMutation.isPending}
          >
            {t('training.create')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Join dialog — day × time grid ────────────────────────────────────── */}
      <Dialog open={!!joinTarget} onClose={() => setJoinTarget(null)} fullWidth maxWidth="xs" fullScreen={isXs}>
        <DialogTitle>{t('training.joinTitle')}</DialogTitle>
        <DialogContent sx={{ pt: '16px !important' }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t('training.pickSlots')}
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'auto repeat(3, 1fr)',
              gap: 0.5,
            }}
          >
            {/* Header row */}
            <Box />
            {TIME_SLOTS.map((ts) => (
              <Typography key={ts} variant="caption" color="text.secondary" sx={{ textAlign: 'center', fontSize: '0.7rem', fontWeight: 600, pb: 0.5 }}>
                {t(`training.times.${ts}`)}
              </Typography>
            ))}
            {/* Day rows */}
            {DAYS.map((day) => {
              const selectedTime = findSlot(joinSlots, day);
              return (
                <React.Fragment key={day}>
                  <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', fontWeight: 600, pr: 1 }}>
                    {t(`training.daysLong.${day}`)}
                  </Typography>
                  {TIME_SLOTS.map((ts) => {
                    const isSelected = selectedTime === ts;
                    return (
                      <Box
                        key={ts}
                        onClick={() => setJoinSlots(toggleSlot(joinSlots, day, ts))}
                        sx={{
                          height: 40,
                          borderRadius: 1.5,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          border: '2px solid',
                          borderColor: isSelected ? 'primary.main' : 'divider',
                          bgcolor: isSelected ? 'primary.main' : 'transparent',
                          color: isSelected ? 'primary.contrastText' : 'text.disabled',
                          transition: 'all 0.15s',
                          '&:hover': {
                            borderColor: 'primary.main',
                            bgcolor: isSelected ? 'primary.dark' : 'action.hover',
                          },
                          '&:active': { transform: 'scale(0.95)' },
                        }}
                      >
                        {isSelected && <CheckIcon sx={{ fontSize: 18 }} />}
                      </Box>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </Box>
          {/* Quick summary */}
          {joinSlots.length > 0 && (
            <Box sx={{ mt: 2, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              {joinSlots
                .sort((a, b) => DAYS.indexOf(a.day) - DAYS.indexOf(b.day))
                .map((sl) => (
                  <Chip
                    key={`${sl.day}-${sl.time}`}
                    label={`${t(`training.daysLong.${sl.day}`)} ${t(`training.times.${sl.time}`).toLowerCase()}`}
                    size="small"
                    color="primary"
                    variant="outlined"
                    onDelete={() => setJoinSlots(joinSlots.filter((s) => !(s.day === sl.day && s.time === sl.time)))}
                    sx={{ height: 24, fontSize: '0.75rem' }}
                  />
                ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setJoinTarget(null)}>{t('training.cancel')}</Button>
          <Button variant="contained" onClick={handleJoin} disabled={joinSlots.length === 0 || joinMutation.isPending}>
            {t('training.confirmJoin')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Admin schedule dialog ────────────────────────────────────────────── */}
      <Dialog open={!!scheduleTarget} onClose={() => setScheduleTarget(null)} fullWidth maxWidth="sm" fullScreen={isXs}>
        <DialogTitle>{t('training.schedule')}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
          <TextField
            label={t('training.dateLabel')}
            type="datetime-local"
            value={scheduleForm.scheduledAt}
            onChange={(e) => setScheduleForm((f) => ({ ...f, scheduledAt: e.target.value }))}
            fullWidth
            size="small"
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label={t('training.durationLabel')}
            type="number"
            value={scheduleForm.durationMinutes}
            onChange={(e) => setScheduleForm((f) => ({ ...f, durationMinutes: e.target.value }))}
            fullWidth
            size="small"
          />
          <TextField
            label={t('training.linkLabel')}
            value={scheduleForm.link}
            onChange={(e) => setScheduleForm((f) => ({ ...f, link: e.target.value }))}
            fullWidth
            size="small"
          />
          <TextField
            label={t('training.locationLabel')}
            value={scheduleForm.location}
            onChange={(e) => setScheduleForm((f) => ({ ...f, location: e.target.value }))}
            fullWidth
            size="small"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setScheduleTarget(null)}>{t('training.cancel')}</Button>
          <Button variant="contained" onClick={handleSchedule} disabled={!scheduleForm.scheduledAt || updateMutation.isPending}>
            {t('training.confirmSchedule')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
