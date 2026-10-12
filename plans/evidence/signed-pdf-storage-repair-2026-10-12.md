# Signed PDF storage repair — 2026-10-12

## Observed failure

The affected production envelope was completed with two completed recipients and
four recorded signature fields. Its source object existed in production R2;
its final object and final_documents row did not. A Vietnamese typed name reproduced
`WinAnsi cannot encode "Ệ" (0x1ec6)` in the old renderer.

The previous completion sequence marked the envelope completed before rendering
the PDF. A renderer/storage failure therefore left a completed envelope without
its final artifact.

## Repair

- Embed an official Noto Sans fallback font for characters outside the built-in
  PDF font's character set; keep Vietnamese names intact and fit them to the field.
  Retain the upstream OFL. The font is bundled as a Worker binary module and does
  not require a runtime font download.
- Finalization writes `envelopes/<envelopeId>/final.pdf`, records its hash/size/key,
  then marks the envelope completed. Original PDFs remain at their separate
  `source-v<version>.pdf` keys.
- A failure keeps the envelope sent, preserves recorded signatures, and returns a
  retryable error. Sequential retries reuse the final artifact and do not append
  signatures again. Conflict-safe metadata insertion prevents duplicate records.
- Authorized My documents reads can recover missing final artifacts from existing
  completed recipients and field values. Recovery rejects unsigned/deleted documents.
- My documents downloads return attachment, private no-store, and nosniff headers.
- Signing stamps credit Lumi Sign.

## Verified local evidence

Types, knip, lint, production build, and the full test suite pass (483 tests in 107 files).

| Criterion | Evidence |
| --- | --- |
| Unicode rendering | Renderer regression test plus visual inspection of both Vietnamese names in a rendered two-party final PDF. |
| R2 failure and retry | API test injects a put failure, confirms sent status/no final metadata, then retries successfully with unchanged value count; repeated retry reuses one record. |
| Older failed completion recovery | Domain test recovers a completed envelope with missing final PDF using stored signing evidence, retaining the original and one final metadata row. |
| Fail-closed recovery | Unsigned/missing-values/deleted cases do not write an artifact. |
| Actual browser workflow | `pnpm e2e:storage`: normal sender verification, PDF upload, self-sign and two-party preparation, real browser Complete signing action using Vietnamese text, completion status/detail, final download, retry, and completed-document page. |
| Separate stored artifacts | Real local D1 readback shows different source/final keys for each tested envelope. A direct Wrangler R2 readback byte-matches the downloaded signed file. |
| Original preservation | Source download SHA-256 equals uploaded bytes; final download differs, matches its recorded hash, and preserves both source pages plus an audit page. |
| Hosted coverage | The browser workflow is added to the existing placement CI job with retained reports/PDFs/screenshots. |

Local evidence: `.wrangler/e2e/signed-pdf-storage/report.json` and generated PDFs.
Provider delivery and real recipient inbox rendering are separate from these local
checks. Existing automatic completion-email delivery behavior is outside this repair.
