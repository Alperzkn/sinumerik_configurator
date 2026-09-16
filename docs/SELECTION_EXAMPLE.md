# How a configuration is selected — one worked example

Input typed on step 1, control system **SINUMERIK ONE**, template *Gantry Router*:

> Router for wood, 4 axes X1, X2, Y1, Z1 plus spindle. Motors not decided,
> 1.5 kW is enough. Spindle 7.5 kW, 18 000 rpm. Small machine.

Everything below is what the code actually produced for this input
(`parseAiResponse` with the catalog bundle, 2026-09-16). No article number
comes from the AI: it only proposes the shape of the machine.

## 0. What the AI proposes (shape only)

| Field | AI answer |
|---|---|
| control unit id | `NCU_1740` |
| technology package | `S42` |
| axes | 4 feed, 1 spindle, names X1 X2 Y1 Z1 |
| preferences | feed 1.5 kW, spindle 7.5 kW / 18 000 rpm, high-speed spindle |
| HMI | thin client 15" |

## 1. Motors — from the specs, not from the AI

`sizeConfiguration` (`lib/sizing/index.ts`) turns the specs into torque /
power / speed requirements and picks the smallest catalog motor that meets
them on the platform allowed for this family.

| | Selected | Why |
|---|---|---|
| feed | `1FT7062-5AF71-1DA1`, 1.7 kW, 6 Nm, 3.9 A, SH63 | smallest 1FT7 with torque ≥ 6.0 Nm (150 kg at 30 m/min for a small machine) **and** power ≥ the stated 1.5 kW |
| spindle | `1PH8107-1FF10-0LA1`, 7.5 kW, max 9 000 rpm | best fit for 7.5 kW; **no 1PH8 reaches 18 000 rpm** → warning kept in the BOM |

Then the deterministic rules run on the axis layout:

- Z1 is vertical → holding brake. Per-axis codes: X1, X2, Y1
  `1FT7062-5AF71-1AA1`, Z1 `1FT7062-5AF71-1BA1` (brake digit).
- X1 + X2 → gantry pair → licence **M02 × 1**.
- 5 axes − 3 base → licence **A02**.

## 2. Drives — from the motors

`MOTOR_SPECS` pairs every motor article with its converter
(`lib/validation/drive-system-rules.ts`):

| Motor | Paired converter | Qty |
|---|---|---|
| 1FT7062 | `6SL3120-1TE15-0AD0` Motor Module 5 A | 4 |
| 1PH8107 | `6SL3120-1TE23-0AD0` Motor Module 30 A | 1 |

The drive family label follows this pairing (booksize here; a 1FK2 would
have yielded an S210, a 1FL2 an S200).

## 3. Line Module — from the drives

`selectLineModule` sums the module powers with 0.7 simultaneity:
`6SL3130-6TE23-6AA3` Smart Line Module 36 kW. (Had every converter had
its own infeed, S200/S210, no Line Module would be added.)

## 4. Cables — from motors + drives

| Cable | Qty | Derived from |
|---|---|---|
| `6SL3060-4AA10-0AA0` DRIVE-CLiQ 1 m | 6 | 4 + 1 Motor Modules + 1 Line Module = 6 DRIVE-CLiQ devices |
| `6FX8002-5CR10-1BA0` power 4×2.5 mm² | 4 + 1 | SH63 feed and SH100 spindle both map to 2.5 mm² |
| `6FX5002-2DC10-1BA0` encoder | 5 | one per motor |
| `6XV1871-5BN10` PROFINET | 3 | thin client + MCP + PP 72/48 = 3 PROFINET devices |
| power connectors | 5 | one per Motor Module |

Length is the user's cable length (10 m default → `-1BA0`).

## 5. Control, software, HMI, accessories — from the counts and choices

- `6FC5317-4AA00-0AA0` NCU 1740, `6FC5852-1YG25-1YA0` CNC SW 6.25 export.
- `S42`, `S00`, `A02`, `M02`.
- ITC1500 15" thin client → MCP 1500 matched to that panel; PP 72/48 I/O.

## 6. Checks

Compatibility rules run last. Result for this machine: one warning,
"No 1PH8 motor with maxSpeed ≥ 18000 rpm … consider a high-speed motor
spindle (1FE1/1FE2)", plus notes explaining the brake, the gantry licence
and the sizing reasoning.

## Changing something afterwards

The same order is re-run on every manual change (`config-mutations.ts`):

- swap the feed motor to a 1FK2 → its S210 converter is paired, OCC cables
  replace the booksize set, the Line Module stays only for the spindle;
- set 5 feed axes → quantities, per-axis codes (new axis "A"), Line
  Module, licence A03, DRIVE-CLiQ count and cables are re-derived;
- on 828D the Combi is re-selected from the motor currents.

The same rule drives the 808D → 828D Smart converter: motors from the 1FL6
/ 1PH1 rows, S200 drives from those motors, cables from the motors, old
cable rows only lend their lengths.
