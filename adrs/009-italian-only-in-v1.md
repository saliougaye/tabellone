# Italian as the only language in v1

**Status:** accepted

The interface is in Italian, with no localisation infrastructure in v1. Strings are
nonetheless collected in a single module (`apps/web/src/copy`) rather than scattered across
components.

The POC has a single Italian user: any localisation work would be spent before knowing
whether the product is useful to anyone. Collecting strings in one place costs nothing today
and makes future extraction mechanical.

## Consequences

RFI's `notices` arrive in Italian: with an Italian interface they can be shown as-is, with no
mixed-language content problem.

Only user-facing copy is Italian. Code, types, identifiers and CSS custom properties are
English (see `CONTEXT.md`).

## Review condition

Italian stations have a substantial international audience, and this is exactly the context
where a legible board matters most. English is the first candidate if the project outgrows
the POC. Slugs stay Italian regardless: they are proper nouns and permanent identifiers
(ADR-007).
