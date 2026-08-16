# Tooth Quest

Home Assistant config for Xeno's toothbrushing pocket-money system.

## Setup

1. Merge `helpers.yaml` into your `configuration.yaml` (or recreate the
   three helper types via **Settings > Devices & Services > Helpers**).
2. Merge `automations.yaml`'s `automation:` entries into your existing
   automations (or paste each one into
   **Settings > Automations & Scenes > Create Automation > Edit in YAML**).
3. Replace the placeholders before reloading:
   - `binary_sensor.xenos_toothbrush` — your contact sensor entity
   - `media_player.bathroom` — your bathroom media player entity
   - `notify.mobile_app_parent_phone` — your mobile_app notify service
   - the three `media-source://media_source/local/tooth_quest/*.mp3` paths
     — point these at MP3s you've placed under `/config/media`
4. Reload YAML config (Developer Tools > YAML, or restart) — no full
   restart required for helpers/automations.

## How it works

- **Auto-approve (>= 120s open)**: marks AM/PM brushed, adds £0.75
  (capped at £45/month), plays a success sound.
- **Pending review (10-119s open)**: sends an actionable notification
  to the parent with Approve/Deny buttons; the AM/PM slot is recorded
  in `input_text.xeno_pending_period` so approving later (even outside
  the AM/PM window) still credits the right one.
- **Ignored (< 10s open)**: filters out accidental knocks.
- **Monthly reset**: on the last calendar day of the month at 23:59,
  notifies the parent of the final balance and resets everything to 0.
