/**
 * Compact catalog reference tables for AI prompt context.
 * Instead of loading and chunking massive catalog markdown files,
 * we embed pre-extracted selection tables that the AI needs for
 * motor-to-converter matching.
 *
 * Kept as condensed as possible — the deterministic sizing engine
 * (src/lib/sizing) is the authoritative motor selector; these tables
 * exist so the AI can reason about available families when deciding
 * high-level architecture (e.g. "this is a fit for S210 with 1FK2").
 */

export function retrieveCatalogContext(
  _machineDescription: string,
  _template: string | null
): string {
  return `

## CATALOG REFERENCE — Available Motor & Drive Families

Motor / motor module / line module article numbers are picked by the
deterministic sizing engine from the user's mechanical specs. You do NOT
need to specify exact article numbers — just the drive family preference
and whether a high-speed or synchronous spindle is wanted.

### Feed servo motor families (choose family, engine sizes it)
| Family | Variant | SH range | Typical rated speed | Notes |
|---|---|---|---|---|
| SIMOTICS S-1FT7 | Compact (natural) | 36-132 | 1500-6000 rpm | Standard high-performance servo for S120 booksize |
| SIMOTICS S-1FT7 | Forced Ventilation | 80-132 | 1500-3000 rpm | Heavy-duty; large moving mass or high-duty cycle |
| SIMOTICS S-1FT2 | Compact (newer) | 30-80 | 3000-6000 rpm | Higher torque density than 1FT7 at small SH — great for compact axes |
| SIMOTICS S-1FK2 | OCC (S210 only) | 20-100 | 3000-6000 rpm | 1-Cable Connection — use with SINAMICS S210 |

### Main spindle motor families
| Family | Variant | Power range | nN range | Max rpm | Notes |
|---|---|---|---|---|---|
| SIMOTICS M-1PH8 | Async 1000 rpm | 3.7-51 kW | 1000 rpm | 5000-9000 | High-torque / turning |
| SIMOTICS M-1PH8 | Async 1500 rpm | 5.5-75 kW | 1500 rpm | 4500-9000 | Balanced milling / turning |
| SIMOTICS M-1PH8 | Async 2000 rpm | 7-70 kW | 2000 rpm | 6000-12000 | High-speed milling |
| SIMOTICS M-1PH8 | Synchronous HighSpeed | 16-52 kW | 3000 rpm | 12000-15000 | HSC / mold-making / high-precision |
| SIMOTICS M-1FE1 | Built-in (sync) | 9-55 kW | 7500-10000 rpm | 18000-40000 | Direct-drive spindle stators — micro / HSC / mold |
| SIMOTICS M-1FE2 | Built-in (async) | 12-22 kW | 10000 rpm | 42000-60000 | Ultra-high-speed built-in motor spindles |

### Special motor families (manual selection only — sizing engine doesn't auto-pick)
| Family | Type | Force / Torque range | Max speed | Used for |
|---|---|---|---|---|
| SIMOTICS L-1FN3 | Linear (iron-core) | 240-5500 N | 120-650 m/min | Direct-drive linear axes (HSC, EDM, wafer) |
| SIMOTICS T-1FW6 | Torque (frameless) | 85-5800 Nm | 90-550 rpm | B/C swivel heads, rotary tables, direct-drive C axis |

Set driveArchitecture.highSpeedSpindle=true if the user needs >10000 rpm
or a synchronous / built-in spindle.

### Drive systems
| Family | Use case |
|---|---|
| S120 booksize | Default for machine tools — shared DC bus, scales to many axes |
| S210 | Single-axis servo, OCC cables. Prefer 1FK2 motor family |
| S120 chassis | High power (>100 kW) spindles |

### Auxiliary drive components (DRIVE-CLiQ bus accessories)
| Component | Article | Use |
|---|---|---|
| TM31 Terminal Module | 6SL3055-0AA00-3AA1 | 8 DI / 4 DI/DO / 2 RO + 2 AI / 2 AO — general I/O on drive bus |
| TM41 Terminal Module | 6SL3055-0AA00-3PA1 | Encoder simulator — TTL pulses to external CNC/PLC |
| TM15 Terminal Module | 6SL3055-0AA00-3FA0 | 24 bidirectional 24V DI/DO |
| TM17 Terminal Module | 6SL3055-0AA00-3HA0 | 16 ultra-fast 24V I/O — touch probes, latching |
| TM120 Temperature Module | 6SL3055-0AA00-3KA0 | 4 PT100/PT1000/KTY — safety isolated |
| TM150 Temperature Module | 6SL3055-0AA00-3LA0 | 12 PT100/PT1000/KTY/NTC channels |
| NX10.3 Hub | 6SL3040-1NC00-0AA0 | Adds DRIVE-CLiQ ports when NCU runs out |
| NX15.3 Hub | 6SL3040-1NB00-0AA0 | Extended DRIVE-CLiQ hub for distributed topologies |
| Voltage Protection Module 200 | 6SL3000-2BE32-1AA0 | DC-link clamp for high-inertia spindles with sudden braking |

### S120 Motor Modules (booksize) — auto-paired to motors by sizing engine
| Rating | Article |
|---|---|
| 3A | 6SL3120-1TE13-0AD0 |
| 5A | 6SL3120-1TE15-0AD0 |
| 9A | 6SL3120-1TE21-0AD0 |
| 18A | 6SL3120-1TE21-8AD0 |
| 24A | 6SL3120-1TE22-4AD0 |
| 30A | 6SL3120-1TE23-0AD0 |
| 45A | 6SL3120-1TE24-5AC0 |
| 60A | 6SL3120-1TE26-0AC0 |
| 85A | 6SL3120-1TE28-5AA3 |
| 132A | 6SL3120-1TE31-3AA3 |
| 200A | 6SL3120-1TE32-0AA4 |

### S120 Line Modules (select by total motor power × 0.7 simultaneity)
| Type | Power | Article | Interface Module |
|---|---|---|---|
| Smart 5kW | 5 | 6SL3130-6AE15-0AB1 | — |
| Smart 10kW | 10 | 6SL3130-6AE21-0AB1 | — |
| Smart 36kW | 36 | 6SL3130-6TE23-6AA3 | — |
| Smart 55kW | 55 | 6SL3130-6TE25-5AA3 | — |
| Active 16kW | 16 | 6SL3130-7TE21-6AA4 | 6SL3100-0BE21-6AB0 |
| Active 36kW | 36 | 6SL3130-7TE23-6AA3 | 6SL3100-0BE23-6AB0 |
| Active 55kW | 55 | 6SL3130-7TE25-5AA3 | 6SL3100-0BE25-5AB0 |
| Active 80kW | 80 | 6SL3130-7TE28-0AA3 | 6SL3100-0BE28-0AB0 |
| Active 120kW | 120 | 6SL3130-7TE31-2AA3 | 6SL3100-0BE31-2AB0 |
| Basic 20kW | 20 | 6SL3130-1TE22-0AA0 | — |
| Basic 40kW | 40 | 6SL3130-1TE24-0AA0 | — |
| Basic 100kW | 100 | 6SL3130-1TE31-0AA0 | — |

Active Line Modules regenerate back to grid (needed for high-dynamic /
frequent deceleration machines: lasers, robots, 5-axis HSC, mill-turn).
Smart Line Modules are cheaper and fine for conventional machines.
`;
}
