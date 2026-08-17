# Operator, category and status come from attributes, with unknown-value logging

**Status:** accepted

Two essential pieces of information are not text on the RFI page: operator and category are
images, readable only through their `alt`. The operator's `alt` also mixes two levels —
railway undertakings (TRENITALIA, Trenord, Italo) and commercial brands (Frecciarossa, which
belongs to Trenitalia).

We use explicit lookup tables — `alt → { operator, brand }` for the operator, `alt →
TrainCategory` for the category — never text heuristics. Every unrecognised value is recorded
under `unknown:*` and raises an alert.

This is the most fragile handle in the project, and it guards precisely the function that
justifies the app's existence. If an `alt` changes, without countermeasures every row slides
to `OTHER` and **the app keeps working** — just without the distinction between operators. It
is a silent failure, so it must be made noisy by construction.

## Why operator and brand are two fields

They serve different purposes: `operator` drives colour accent and grouping, `brand` is what
the user recognises at a glance — someone looking for the Frecciarossa is not thinking
"Trenitalia".

## Cross-check, with a caveat

Italo services fall in recognisable number ranges, so an `OTHER` with a number in the Italo
range is a disagreement worth flagging. The signal only holds for purely numeric train
numbers: alphanumeric ones exist (`CB710`).

## Fallback

An unrecognised value yields `OTHER` / `null`, never an error. A row without a logo beats a
board that fails to load.

## Initial table

To be extended as new values appear.

| Value | operator | brand | category |
|---|---|---|---|
| Frecciarossa | TRENITALIA | Frecciarossa | HIGH_SPEED |
| Frecciargento | TRENITALIA | Frecciargento | HIGH_SPEED |
| Frecciabianca | TRENITALIA | Frecciabianca | HIGH_SPEED |
| Italo | ITALO | Italo | HIGH_SPEED |
| Intercity | TRENITALIA | Intercity | INTERCITY |
| Intercity Notte | TRENITALIA | Intercity Notte | INTERCITY |
| Regionale Veloce | TRENITALIA | Regionale Veloce | REGIONAL_FAST |
| Regionale | TRENITALIA | Regionale | REGIONAL |
| Suburbano / Metropolitano | — | Suburbano | SUBURBAN |
| Leonardo Express | TRENITALIA | Leonardo Express | REGIONAL_FAST |
| Malpensa Express | TRENORD | Malpensa Express | REGIONAL_FAST |
| BUS | — | — | BUS |

> `operator` must be confirmed case by case: some regional services are run by different
> undertakings depending on the region.
