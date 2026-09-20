# Known limitations

- The SQL migration and live persisted acceptance apply only to the isolated Mizantra Supabase project `nwkaruzvzwwuftjquypk`. Saifseas project `xjiyiywzmklljrpblcqj` was audited and contains no FSM tables or Field Sales catalogue entry.
- No road-routing provider/key was supplied. Current route output is a clearly labelled straight-line estimate plus manual sequence/device navigation fallback.
- Background Sync is not required or assumed. Sync runs in the foreground on reconnect/resume/manual action.
- A strict repository-wide API `tsc --noEmit` still reports 146 existing errors outside FSM. The Mizantra Nest/SWC production API build, web production build, focused FSM tests and live process startup all pass.
- Existing generic uploads are public. FSM avoids them with a private bucket, but bucket policy and signed retrieval must be verified against the target Supabase configuration.
- Live WhatsApp delivery, quotation/order posting and payment receipt posting were not executed. FSM produces governed drafts/links/promises; authoritative modules still perform final actions.
- Android and iPhone hardware tests, browser storage-quota exhaustion, camera capture and real GPS denial/accuracy behavior need recorded pilot-device certification.
- The synthetic `/fsm-preview?demo=1` visual harness exists only in development and returns not-found in production.
- Mizantra bot Field Sales queries are read-only. Visit changes, messages and financial actions remain in native governed workflows and are intentionally not executable from free-text answers in this release.
