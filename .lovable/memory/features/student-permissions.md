---
name: Student Permission System
description: Per-permission (mic/cam/screen) hand-raise with trainer approval; approved students stream private back-channel to trainers only
type: feature
---
Mobile-friendly student controls in the Digital Classroom — students request mic/cam/screen individually, trainer approves/rejects/revokes. Approved student streams go ONLY to trainers (private back-channel), invisible to other students.

**Data**
- `rooms/{trainingId}/permissions/{studentId}_{type}` — `{ studentId, studentName, type:'mic'|'cam'|'screen', status:'pending'|'approved'|'rejected'|'revoked', requestedAt, decidedAt, decidedBy }` (`src/lib/training-permissions.ts`)
- `rooms/{trainingId}/backchannels/{studentId}/{offers|answers|callerICE|calleeICE}/{trainerId}` — private signaling, student is host of one peer per trainer (`src/lib/student-backchannel.ts`)

**Components**
- `StudentControls.tsx` — 3 toggle buttons (mic/cam/screen), all OFF by default, status chips (pending/approved/rejected/revoked). Auto-captures media on approval, auto-stops on revoke. Screen-share needs user-gesture click after approval.
- `TrainerApprovalPanel.tsx` — sidebar tab "Hands" with pending requests + active speakers list, one-click approve/reject/revoke.
- `StudentBackChannelTile.tsx` — trainer-only viewer; subscribes to approved student streams.
- `InRoomInstallButton.tsx` — top-bar PWA install CTA shown to mobile students (Android/iOS) when not in iframe and not already installed.

**VideoRoom integration**
- Trainer: extra "Hands" sidebar button with pending count badge; approved-students grid above the students strip with "only you see this" label.
- Student: bottom controls strip with mic/cam/share buttons; install button in top bar.

**Permission lifecycle**
- request → pending → trainer decides → approved (capture starts + back-channel announces) → student or trainer revokes → capture stops + peer closed.
- Cleanup: leaving room calls `withdrawPermission` for all 3 types + `closeBackChannel`.
