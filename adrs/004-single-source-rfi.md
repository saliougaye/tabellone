# Single source: RFI

**Status:** accepted

In v1 the only data source is iechub RFI. ViaggiaTreno is not used.

ViaggiaTreno was needed for individual train progress, which is out of scope in v1. Dropping
it removes a parser, a second rate limit to manage and — above all — the cross-mapping table
between the two station ID systems, which is the most laborious and fragile work in the
project.
