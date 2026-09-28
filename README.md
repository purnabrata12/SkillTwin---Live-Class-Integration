# SkillTwin Live Classroom v6

A React + Vite live-class module for the SkillTwin LMS with separate Trainer and Trainee behavior connected to the same LiveKit room.

This version focuses on two things:

1. A clean SkillTwin blue/white visual theme that fits the main portal.
2. Reliable Trainer/Trainee joining and repeated camera/microphone switching.

## Stack

- React 18 + Vite
- LiveKit React Components + livekit-client
- Node.js + Express token/API server
- Socket.IO for classroom state, waiting room, chat, hand raise, spotlight and moderation signals
- No Docker required

## v6 fixes

### Trainer / Trainee joining

- Trainer creates one room and gets an exact trainee invite link.
- Trainee invite always contains `role=trainee`.
- The Join page accepts either a Meeting ID or the full invite URL.
- The Join page validates the room before redirecting, so a wrong code gives a clear error instead of opening a dead class page.
- Trainee identities are unique, so multiple learners can join the same room without replacing each other.
- Trainer identity remains the Host identity and is shown as `Trainer / Host`.
- Sessions are persisted to `server/data/sessions.json` during development, so a normal backend restart does not instantly erase rooms.
- Meeting IDs are normalized to uppercase.

### Camera / microphone reliability

- Live meeting media state now comes from LiveKit's reactive `useLocalParticipant()` state instead of a custom polling state.
- Camera supports repeated `ON -> OFF -> ON` switching.
- Microphone supports repeated `ON -> OFF -> ON` switching.
- Pre-join camera and microphone are acquired as separate tracks, so turning one off does not destroy the other.
- A short release delay is used between pre-join preview and LiveKit connection to avoid Windows/browser camera-busy races.
- Device switching is preserved for later camera/mic re-enable.
- Trainer mute/disable actions do not permanently SFU-mute a track and block later user re-enable.

### Connection reliability

- LiveKit URL is normalized automatically. `skilltwin-xxxx.livekit.cloud` is accepted and converted to `wss://...`.
- Visible LiveKit connection errors replace silent endless `Connecting` states.
- A slow-connection warning appears after 10 seconds.
- Frontend development server binds to `0.0.0.0`, allowing LAN testing.
- Invite URL can be controlled with `VITE_PUBLIC_APP_URL`.

### UI / theme

- SkillTwin blue/indigo branding
- Light dashboard chrome and side panels
- Dark focused video stage
- Rounded cards, soft borders and portal-style backgrounds
- Matching Trainer create page, Trainee join page, pre-join page, meeting header, participant panel, chat, settings and dialogs
- Responsive desktop/mobile layout

## 1. Server environment

Copy:

```text
server/.env.example
```

to:

```text
server/.env
```

Fill your real LiveKit values:

```env
PORT=3001
CLIENT_ORIGIN=http://localhost:5173,http://127.0.0.1:5173,https://skilltwin-five.vercel.app

LIVEKIT_URL=wss://YOUR_PROJECT.livekit.cloud
LIVEKIT_API_KEY=YOUR_API_KEY
LIVEKIT_API_SECRET=YOUR_API_SECRET
```

Keep `LIVEKIT_API_SECRET` on the server only.

## 2. Client environment

For normal localhost testing, copy:

```text
client/.env.example
```

to:

```text
client/.env
```

and use:

```env
VITE_API_URL=http://localhost:3001
VITE_PUBLIC_APP_URL=
```

For production, `VITE_API_URL` must point to the public Node/Express backend. Do not point it to a local computer.

## 3. Install and run

From the main project folder:

```bash
npm install
npm run install:all
npm run dev
```

Expected URLs:

```text
Frontend: http://localhost:5173
Backend:  http://localhost:3001
```

The backend terminal should show:

```text
LiveKit configured: YES
```

## 4. Trainer flow

Open:

```text
http://localhost:5173/?role=trainer&name=Trainer
```

Then:

1. Create session.
2. Check camera and microphone in the preview.
3. Click **Start class**.
4. Open **Details**.
5. Click **Copy trainee invite**.

Do not manually edit the Meeting ID.

## 5. Trainee flow

Paste the exact copied invite into another browser / Incognito window.

Example:

```text
http://localhost:5173/live/SKT-CYBERS-XXXXXX?role=trainee
```

The trainee enters their name, checks camera/mic, and clicks **Join now**.

Alternatively open:

```text
http://localhost:5173/
```

and enter the Meeting ID or paste the complete invite link.

## 6. Test camera properly

Inside the live room test:

```text
Camera ON -> OFF -> ON -> OFF -> ON
Mic ON -> OFF -> ON -> OFF -> ON
Present screen -> Stop presenting -> Present again
```

If the camera cannot be acquired, the UI now shows a browser/device error instead of silently failing.

## Another phone or computer

`localhost` only works on the same computer.

For LAN testing:

1. Run the app with `npm run dev`.
2. Open the frontend using the development PC's LAN address, for example `http://192.168.1.20:5173`.
3. Set `VITE_PUBLIC_APP_URL` to that LAN frontend address if needed.
4. Add the frontend origin to `CLIENT_ORIGIN`.
5. Make sure port `3001` is reachable from the trainee device.

For internet/public use, deploy the React frontend and Node/Express backend and set `VITE_API_URL` to the public backend.

## Production integration note

The `role`, `name`, and `userId` query parameters are a development adapter. In the real SkillTwin LMS, use the authenticated LMS user identity/role on the server.

The JSON session store is for reliable local development. For production or multiple backend instances, store classroom state in the LMS database or Redis.

## v7 token + camera stability fixes

This build adds an authenticated LiveKit credential self-test and always loads
`server/.env` from the server folder (overriding stale machine-level LIVEKIT_*
variables). Run:

```bash
npm run check:livekit
```

You must see `RESULT: VALID` before testing Trainer/Trainee media. If it reports
INVALID, create a fresh API key and matching secret in the same LiveKit Cloud
project as `LIVEKIT_URL`, save them in `server/.env`, stop the dev server fully,
and start it again.

The pre-join camera and microphone toggles now keep their preview tracks alive
and switch `track.enabled`, making repeated OFF -> ON toggles reliable. Live
class camera/microphone toggles continue to use LiveKit's participant media API.


## v8 functional fixes

This build keeps the existing SkillTwin theme and LiveKit setup, and fixes the runtime issues found during Trainer/Trainee testing:

- Whiteboard no longer crashes with `getBoundingClientRect` on a null element. Pointer coordinates are calculated from a stable SVG ref.
- The classroom Socket.IO connection now stays alive across React re-renders. Previously the socket could be disconnected when the event callback changed, which caused chat and trainer moderation controls to appear successful without reaching the other participant.
- Chat messages are acknowledged by the server, broadcast to everyone, and the latest 100 messages are kept with the session so they do not disappear immediately.
- Trainer controls such as mute, disable microphone, disable camera, block screen share, spotlight, raise-hand updates and policy changes now use the stable realtime socket.
- Camera, microphone and screen-share buttons keep explicit local React state and synchronize it with LiveKit, making repeated ON -> OFF -> ON toggles reliable.
- If video is connected but the SkillTwin realtime-control socket is reconnecting, the classroom now shows a warning instead of silently losing chat/moderation actions.

### Recommended test

1. Run `npm run check:livekit` and confirm `RESULT: VALID`.
2. Run `npm run dev`.
3. Create a fresh Trainer class.
4. Open the exact trainee invite in another browser/incognito window.
5. Test camera ON/OFF/ON, chat in both directions, Trainer Disable camera / Allow camera, Mute microphone / Disable microphone, Spotlight, and Whiteboard.


## v9 requested changes

- Replaced the temporary S badge with the supplied SkillTwin logo image across the create, join, pre-join, meeting, error, and ended-class screens.
- Ending a class for everyone now returns the trainer to the Create Live Class page.
- Trainees see `Trainer has ended the class.` instead of a generic disconnected/left message.
- Added a fallback session-state check when LiveKit is disconnected by the server so the ended-class result remains correct even if the realtime event races with disconnect.
- Opening Whiteboard now starts the browser screen-share picker first. The board opens only after screen sharing is accepted. If the whiteboard itself started sharing, closing the board stops that share.

For whiteboard sharing, choose the SkillTwin browser tab/window in the browser picker so trainees can see the board.
