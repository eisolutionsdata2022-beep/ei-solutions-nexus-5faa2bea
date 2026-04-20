---
name: Digital Classroom v2
description: Multi-trainer live grid with avatar mode, post-session reviews, P2P-mesh signaling per host, connection quality badge + admin quality logs
type: feature
---
Phase 1 of the Next-Gen Digital Classroom upgrade.

**Architecture**
- WebRTC signaling moved from single-host model to per-host branches: `rooms/{trainingId}/hosts/{hostId}/{offers|answers|callerICE|calleeICE}/{viewerId}`. Multiple trainers can `goLive()` simultaneously; each viewer opens one peer connection per active host (mesh).
- Self-hosted mediasoup SFU is the planned scaling path (commented as TODO in `src/lib/webrtc.ts`). Current P2P sustains ~3-4 trainers + 15-20 students per session.
- TURN servers (Open Relay by Metered) included in `ICE_SERVERS` for NAT traversal on mobile/restrictive networks.

**Avatar Mode** (`src/components/training/AvatarStream.tsx`)
- Hybrid: 8 free 2D emoji avatars + 2 Ready Player Me 3D models.
- Live broadcast uses canvas.captureStream(24fps) — canvas draws avatar art with mouth/scale modulated by mic AnalyserNode amplitude (basic lip-sync).
- Trainer can toggle Camera ↔ Avatar mid-session via `RTCRtpSender.replaceTrack()` — no re-negotiation needed.

**Connection Quality** (`src/components/training/HostViewerTile.tsx` + `src/lib/session-quality-logs.ts`)
- Each viewer tile polls `RTCPeerConnection.getStats()` every 3s and shows a Good/Fair/Poor badge based on packet loss %, jitter (ms), and RTT (ms).
- Thresholds: Poor = loss>5% OR jitter>50ms OR rtt>300ms; Fair = loss>2% OR jitter>30ms OR rtt>150ms; else Good.
- 15s connection timeout + manual Retry button. Auto-reconnect once on `failed`/`disconnected`.
- Quality samples logged to Firestore `sessionQualityLogs` collection: on every quality change AND every 30s heartbeat. Fields: trainingId, trainingTitle, hostId, hostName, viewerId, viewerName, viewerRole, rtt, jitter, loss, quality, reason ("change"|"interval"), createdAt.

**UI** — Premium dark "digital studio" theme intentionally bypasses gov design tokens (different visual language for the classroom). LED scanline overlay, gradient backdrops, auto-grid (1/2/3 cols based on trainer count), student thumbnail strip below.

**Reviews** (`src/lib/training-reviews.ts`)
- Stored in `trainingReviews` collection. Unique per (trainingId, retailerId).
- Retailer is prompted with `ReviewSubmitDialog` (1-5 stars + optional comments) on Leave.
- Admin-only dashboard at `/admin/training-reviews` shows totals, trainer leaderboard with avg ratings, full searchable list.

**Admin Dashboards**
- `/admin/training-reviews` — ratings + comments per trainer.
- `/admin/session-quality` — grouped per training: viewer count, avg RTT/jitter/loss, % poor samples, expandable per-sample table. Filter by quality level + search by training title.

**Files**
- New: `src/lib/training-reviews.ts`, `src/lib/session-quality-logs.ts`, `src/components/training/AvatarStream.tsx`, `AvatarPickerDialog.tsx`, `TrainerHostTile.tsx`, `HostViewerTile.tsx`, `ReviewSubmitDialog.tsx`, `src/routes/admin.training-reviews.tsx`, `src/routes/admin.session-quality.tsx`
- Rewritten: `src/lib/webrtc.ts` (multi-host signaling + TURN), `src/components/VideoRoom.tsx` (auto-grid classroom)
- Updated: `src/components/AppSidebar.tsx` (Training Reviews + Session Quality admin links)

**Future phases**: polls/quiz, raise hand, screen-share UI, low-bandwidth audio-only mode, mediasoup SFU migration.
