# Uploaded signature amendment

This user-authorized amendment supersedes the original PRD's exclusion of uploaded signature images.

Sender preparation and partner signing offer Typed, Drawn, and Uploaded methods.
Accept PNG/JPEG files up to 2 MB in the browser; normalize to PNG no larger than
1024 pixels per side and 256 KB. Reject unsupported formats, malformed image data,
and oversized dimensions at the API boundary. Keep existing email authorization,
role authorization, signing consent, and matching-human Agentic approval.

The browser shows a preview before save/sign. Persist uploaded content in the
signature profile's image_data column; partner reuse follows the existing explicit
Remember signature option. Source-document field values carry the normalized image
and final PDFs embed it with aspect ratio preserved. Certificate material binds
the full value while displayed certificate text does not expose base64 content.
Existing typed/drawn signatures and old profiles continue working.

Verification: public request validation, saved uploaded preference preview and
submission, upload rejection, real PDF image embedding, all existing signing tests,
types, lint, build, generated D1 migration, and hosted deployment.
