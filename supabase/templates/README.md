# KS LIGA authentication emails

Production templates used by Supabase Auth and delivered through Resend SMTP.

| Supabase template | Subject | Source |
| --- | --- | --- |
| Reset password | `Відновлення пароля KS LIGA` | `reset-password.html` |
| Invite user | `Запрошення до команди організаторів KS LIGA` | `invite-organizer.html` |

The templates intentionally use only `{{ .ConfirmationURL }}`. They do not render user-controlled metadata, and the Resend credential must never be added to this repository.
