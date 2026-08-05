# Gmail push setup

Gmail push is optional. SecureInbox continues polling when these values are absent or `GMAIL_PUSH_ENABLED=false`.

## 1. Select the Google Cloud project

Use the same project as the Gmail OAuth client.

```sh
gcloud auth login
gcloud config set project PROJECT_ID
gcloud services enable gmail.googleapis.com pubsub.googleapis.com iamcredentials.googleapis.com
```

## 2. Create Pub/Sub resources

```sh
gcloud pubsub topics create gmail-push
gcloud pubsub topics add-iam-policy-binding gmail-push \
  --member=serviceAccount:gmail-api-push@system.gserviceaccount.com \
  --role=roles/pubsub.publisher

gcloud pubsub topics create gmail-push-dead-letter
gcloud iam service-accounts create secureinbox-gmail-push \
  --display-name="SecureInbox Gmail push"
```

Find the project number and allow Pub/Sub to mint OIDC tokens for the dedicated service account:

```sh
PROJECT_NUMBER="$(gcloud projects describe PROJECT_ID --format='value(projectNumber)')"
PUSH_SA="secureinbox-gmail-push@PROJECT_ID.iam.gserviceaccount.com"

gcloud iam service-accounts add-iam-policy-binding "$PUSH_SA" \
  --member="serviceAccount:service-${PROJECT_NUMBER}@gcp-sa-pubsub.iam.gserviceaccount.com" \
  --role=roles/iam.serviceAccountTokenCreator
```

## 3. Create the authenticated push subscription

Choose a stable audience value and use the public Cloudflare hostname already serving SecureInbox.

```sh
AUDIENCE="https://secureinbox.example.com/gmail-push"
ENDPOINT="https://secureinbox.example.com/api/v1/webhooks/gmail"

gcloud pubsub subscriptions create gmail-push-secureinbox \
  --topic=gmail-push \
  --push-endpoint="$ENDPOINT" \
  --push-auth-service-account="$PUSH_SA" \
  --push-auth-token-audience="$AUDIENCE" \
  --ack-deadline=60 \
  --dead-letter-topic=gmail-push-dead-letter \
  --max-delivery-attempts=5 \
  --min-retry-delay=10s \
  --max-retry-delay=600s

PUBSUB_AGENT="service-${PROJECT_NUMBER}@gcp-sa-pubsub.iam.gserviceaccount.com"
gcloud pubsub topics add-iam-policy-binding gmail-push-dead-letter \
  --member="serviceAccount:${PUBSUB_AGENT}" \
  --role=roles/pubsub.publisher
gcloud pubsub subscriptions add-iam-policy-binding gmail-push-secureinbox \
  --member="serviceAccount:${PUBSUB_AGENT}" \
  --role=roles/pubsub.subscriber
```

Keep Pub/Sub payload unwrapping disabled. SecureInbox verifies and parses the standard wrapped message envelope.

The principal creating the subscription needs `iam.serviceAccounts.actAs` on `PUSH_SA`.

## 4. Configure SecureInbox

Set these only in the production environment file; never commit their values:

```dotenv
GMAIL_PUSH_ENABLED=true
GOOGLE_CLOUD_PROJECT_ID=PROJECT_ID
GMAIL_PUBSUB_TOPIC=projects/PROJECT_ID/topics/gmail-push
GMAIL_PUSH_AUDIENCE=https://secureinbox.example.com/gmail-push
GMAIL_PUSH_SERVICE_ACCOUNT_EMAIL=secureinbox-gmail-push@PROJECT_ID.iam.gserviceaccount.com
GMAIL_POLL_INTERVAL_WITH_PUSH=60
```

Restart the production stack. Existing connected Gmail accounts receive a watch during the renewal job; newly connected accounts register immediately. Watches are renewed every six hours when less than 48 hours remain.

## 5. Verify

1. Confirm the webhook rejects a request without a bearer token with `401`.
2. Connect the test Gmail account through the normal SecureInbox OAuth flow.
3. Confirm its `MailAccount.watchStatus` becomes `active` and `watchExpiration` is populated.
4. Send a harmless test message to that mailbox.
5. Confirm `secureinbox_gmail_push_notifications_total{result="processed"}` increases and the scan finishes in under 10 seconds.
6. Stop the watch by disconnecting the Gmail account and confirm no further notifications are processed.

The queue is intentionally in-process and single-instance. Multiple replicas can enqueue duplicate wake-ups, but T3's database-backed per-account lock prevents duplicate ingestion. Polling remains enabled as recovery for process restarts, expired watches, and Pub/Sub outages.
