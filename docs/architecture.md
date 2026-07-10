# Architecture

SecureInbox is a modular monolith with a React single-page application and an
Express API backed by MongoDB.

```text
React + Vite
    |
    | HTTPS / JSON
    v
Express API
    |-- authentication and validation
    |-- Gmail OAuth and inbox sync
    |-- phishing scan services
    |-- reporting and notifications
    v
MongoDB
```

The backend keeps HTTP routes, controllers, validation, services, and Mongoose
models separate. Detection runs on the server so the browser receives an
auditable result rather than owning security logic.

Gmail integration uses OAuth 2.0. Synced messages are parsed for sender,
reply-to address, links, domains, attachments, and message content. HTML email
is sanitized before it is displayed and remote images are blocked by default.

The project deliberately remains a modular monolith. That keeps the Gmail
workflow, scan result, and manual review state easy to trace for a project of
this size.
