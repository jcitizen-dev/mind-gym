# Mind Gym

A cognitive-training web app made of small games. It is plain HTML/CSS/JS with no build step.

**Live app:** https://jcitizen-dev.github.io/mind-gym/. It's hosted on GitHub Pages and updates a minute or two after each push to `main`.

## Run it

```bash
python3 -m http.server 8173
```

Then open http://localhost:8173. You can also open `index.html` directly in a browser.

## Chamber mode

Chamber mode is a switch on the home screen, built for a tablet on a mounted arm (for example in a hyperbaric chamber) where taps are slow and deliberate. When it's on:

- **Timed games are hidden:** Task Switch and Color Clash score how fast you tap, so they're left out.
- **Dual N-Back slows down:** at least 5 seconds per letter instead of 3.
- **Speed Spotter is marked as the recommended daily game.** Its answers are untimed, and it adds a longer pause before each flash.
- **Bigger targets:** Corsi tiles, Multi-Object Tracking dots, Speed Spotter's direction buttons, and all buttons are larger.
- **Accidental double taps are ignored:** a second tap within 0.45 s doesn't count.

Every game's start screen also says whether to hold the device in portrait or landscape. Portrait suits most games; chess suits landscape on a tablet, so the board sits beside the text. The tip is highlighted if the device is the wrong way round, and it updates as you turn the device.

Check with the chamber's safety staff before bringing in any electronic device.

## Phones and tablets

The layout adapts to phones and tablets in portrait and landscape. In landscape on a phone, the board sits on the left and the answer buttons on the right.

- **Taps:** answers register the moment your finger touches the screen, and keyboard hints are hidden on touch screens.
- **Screen:** stays awake while a game is running. This needs HTTPS, or localhost on the Mac itself.
- **Background:** switching apps or locking the phone pauses the game. The unfinished block isn't counted, so a phone call doesn't hurt your level.
- **Speech:** Dual N-Back's spoken letters are set up inside your first tap, because iPhone and iPad block speech that wasn't started by one.
- **Home Screen:** it can be installed as an app (Share → Add to Home Screen), with an icon and full-screen display. Over HTTPS it also works offline.

**Opening it on your phone or tablet now:** with the server running on the Mac and both devices on the same Wi-Fi, go to `http://<your Mac's IP>:8173`. Get the IP with `ipconfig getifaddr en0`. Over plain HTTP on Wi-Fi, keeping the screen awake and offline mode aren't available, and the app only loads while the Mac is serving it. For everyday use, host the folder on any static HTTPS host, such as GitHub Pages or Netlify.

**Saved progress on iPhone/iPad:** Safari keeps separate storage for a Home Screen app and for a normal Safari tab, so pick one and stick with it. Adding it to the Home Screen is the safer choice, because Safari can clear website data that hasn't been used for a while. To move progress between devices, use **Backup**.

## Saved progress

All progress is kept in the browser's `localStorage` under the key `mindgym.v1`. Use **Backup** in the app to download a JSON file or restore one. Dual N-Back saves after every block. An unfinished session can be resumed for 12 hours; after that it is filed as a shorter session.

## Games, ordered by evidence for long-term cognitive health

| Game | Trains | Evidence | How the difficulty adapts |
|---|---|---|---|
| Speed Spotter | Speed of processing (useful field of view) | **Strongest.** In the ACTIVE trial, this kind of training was linked to about 29% lower dementia rates at 10 years, and about 25% lower at 20 years with boosters | 2 right in a row makes the flash shorter (500 → 18 ms); 1 wrong makes it longer; 4 stages. Also tracks the ACTIVE schedule: about 10 h of training, then boosters at 11 and 35 months |
| Task Switch | Mental flexibility | Moderate. Some studies found gains on other untrained tasks, mainly in older adults | Per 40-trial block: ≥90% correct → up a level, <75% → down. Higher levels allow less time, and the rule switches randomly |
| Dual N-Back | Working memory | Mixed. Gains on similar tasks; gains in reasoning are disputed | Jaeggi rules (below) |
| Corsi Span | Visual short-term memory | Limited. Gains mostly stay on the trained task | 2 right in a row → up, 2 wrong in a row → down. Levels alternate forward and backward |
| Color Clash | Ignoring distractions (Stroop task) | Limited | Same block rule as Task Switch. Higher levels allow less time and have more clashing words |
| Multi-Object Tracking | Spread-out attention | Limited | 2 perfect trials in a row → up, 2 imperfect in a row → down. Higher levels add speed, then targets |

| Chess | Planning and attention | Limited. Chess training mostly improves chess itself; links to lower dementia risk come from observational studies | Elo rating estimate after every game; the next bot is the one of 12 levels nearest your rating |

Every game saves after each trial or block.

## Chess

- **Lessons:** 12 short lessons for complete beginners: the board, each piece (with "collect the stars" exercises), capturing and piece values, check, checkmate, castling, stalemate, and opening tips.
- **Rules engine:** `js/chess/engine.js`, written from scratch. It matches the standard move-count ("perft") results for five well-known test positions, which covers castling, en passant, promotion and pins.
- **Bot:** 12 levels. The low levels play many random or careless moves; the top levels look 3–5 moves ahead.
- **Adapting to you:** your rating estimate starts at 250 and is updated with the Elo formula after each game, and the next bot is chosen to match it. Resigning counts as a loss; hints and take-backs don't affect the rating.
- **Coach (can be turned off):**
  - warns when your last move leaves a piece unprotected, and offers a take-back
  - points out bot pieces you can win
  - explains why an illegal move isn't allowed
- **Saving:** the game in progress is saved after every move. Each new session starts with a short warm-up a little below where you finished, and you can change it in that game's settings.

## Dual N-Back protocol

The game follows Jaeggi, Buschkuehl, Jonides & Perrig (2008, *PNAS*):

| Rule | Value |
|---|---|
| Stimuli | Position in a 3×3 grid (centre unused), and a spoken consonant (C H K L Q R S T) |
| Timing | One trial every 3 s, stimulus shown for 0.5 s |
| Block length | 20 + n trials |
| Targets per block | 6 position and 6 sound (4 position-only, 4 sound-only, 2 both) |
| Level up | Fewer than 3 mistakes in **both** position and sound |
| Level down | More than 5 mistakes in **either** |
| Session | 20 blocks (about 25 min); you can choose fewer |

A mistake is a missed match or a false alarm.

**Resuming.** Each new session starts one level below where the last one ended. This warm-up is a setting (0–3 levels). It is not part of the published protocol. It was added because you asked to build momentum before pushing past your last level. The staircase brings you back up within a block or two if the level is easy for you.

## File layout

- `js/storage.js`: the shared progress store that every game uses
- `js/kit.js`: GameKit, the shared session, resume, warm-up, lobby, settings and progress-chart code
- `js/app.js`: the game list, routing, and the progress and backup pages
- `js/games/*.js`: one file per game (Dual N-Back is standalone; the rest use GameKit)
- `css/styles.css`: styles

## Adding a game

Call `GameKit.create({...})` in `js/games/<name>.js`. At minimum, give it `id`, `title`, `levelName(level)`, `playUnit(ctx)` (call `ctx.finish({acc})` when a trial or block ends) and `nextLevel(level, result, activeSession)`. Then register it in `GAMES` in `js/app.js` and load the script in `index.html` after `kit.js`.
