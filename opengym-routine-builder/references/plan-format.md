# openGym plan file format (v1.4.x)

Derived from `frontend/src/lib/plan-share.js` in the openGym source. If the user's version differs, re-read that file in the checkout before relying on this.

## Top level

```json
{
  "opengym_plan": 1,
  "exported": "YYYY-MM-DD",
  "name": "Plan name",
  "unit": "kg",
  "week": { "1": ["r-a"], "3": ["r-b"], "5": ["r-c"] },
  "routines": [ { "id": "r-a", "name": "Upper Body A", "emoji": "dumbbell", "ex": [] } ],
  "customEx": []
}
```

- `unit`: `kg` or `lb`. Weights in the file are in this unit.
- `week` keys are weekdays as JavaScript `getDay()`: `0` Sunday, `1` Monday ... `6` Saturday. Values are arrays of routine ids. Omitted days are rest days.
- Routine `id` values are arbitrary strings; the app assigns fresh ids on import.
- `emoji` is an icon key: `figureStrength arm abs legs pullup dumbbell barbell kettlebell plate machine figureRun bike swim boxing timer stretch moon heart flame bolt`.

## Exercise entries (`ex`)

Common: `id` (string, keep leading zeros, for example `"0426"`), `sets`, optional `restSec`, `note`, `weight`, `sg`, `side`.

| Kind | Fields |
|---|---|
| Reps | `reps` (and `weight` if known) |
| Timed | `"mode": "time"`, `sec` |
| Cardio | `"mode": "cardio"`, `min`, `speed` (km/h, stored in km/h regardless of display unit) |

- `sg`: a shared string on two or more adjacent entries makes a superset. A lone `sg` is removed by the app.
- `side: true`: reps or hold are per side (one-arm and single-leg work).
- `dbLoad`: `"each"` or `"total"` states whether a dumbbell weight is per bell or both together. Omit unless the user cares.
- Progression (`prog`, `inc`, `repsMin`, `repsMax`, `setsMax`, `backoff`, `warmupSets`, `intensifier`, pyramids): omit unless asked, and read `frontend/src/lib/progression.js` first.
- Built-in cardio exercises have `bp: "cardio"` in the catalogue and default to cardio mode. Setting `"mode": "cardio"` explicitly is harmless and required for custom ones.

## Custom exercises

An id that is neither in the catalogue nor in `customEx` is silently dropped on import (`parsePlan` reports it as `dropped`). Interchangeable-machine cardio example:

```json
{
  "id": "cardio-machine",
  "n": "Cardio (treadmill or elliptical)",
  "bp": "cardio",
  "desc": "Steady cardio on either machine. Log time and, on the treadmill, speed.",
  "eq": "machine",
  "tg": "cardiovascular system",
  "primaries": ["cardiovascular system"],
  "muscleGroups": ["cardiovascular system"]
}
```

Import reuses an existing custom exercise with the same name and body part, and otherwise creates it. A custom exercise needs `id`, `n` and `bp`.

## Searching the catalogue

Catalogue entries live in `frontend/src/lib/exercises-data.js` as `EXDB`. Fields: `id`, `n` (lowercase name), `bp` (body part, `cardio` for cardio), `eq` (equipment), `cat` (category: strength, calisthenics, isometric, cardio ...).

```bash
node --input-type=module -e "
import { EXDB } from '<src>/frontend/src/lib/exercises-data.js'
const re = /kettlebell/i, eq = /./
for (const e of EXDB) if (re.test(e.n) && eq.test(e.eq || '')) console.log(e.id, '|', e.n, '|', e.bp, '|', e.eq, '|', e.cat)
"
```

Some entries are mis-tagged (for example "run on treadmill" has equipment "stationary bike"), so judge by name as well as `eq`.

## Parse check

Runs the app's own import validation (worked on Node 24):

```bash
node --input-type=module -e "
import { parsePlan } from '<src>/frontend/src/lib/plan-share.js'
import fs from 'fs'
const b = parsePlan(fs.readFileSync('plan.json', 'utf8'), 'kg')
console.log({ routines: b.routineCount, exercises: b.exerciseCount, days: b.scheduledDays, dropped: b.dropped })
"
```

`dropped` must be 0.
