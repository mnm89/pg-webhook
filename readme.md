# PG-WEBHOOK

A lightweight service that listens to **PostgreSQL data changes** via logical replication and sends **webhook notifications** based on a user-defined configuration.

---

## 🚀 Overview

This project provides:

- A **PostgreSQL database** configured with logical replication
- A **NestJS application** that:
  - Subscribes to changes from a `PUBLICATION` in Postgres
  - Reads a configuration file to determine which events to forward
  - Sends structured webhook payloads (`INSERT`, `UPDATE`, `DELETE`)
  - Signs outgoing requests with a configurable **webhook secret**
  - Logs events and HTTP results for auditing

---

## ⚙️ Example Workflow

1. Define your env variables in `.env`:

   ```bash
   DATABASE_URL=postgres://user:password@localhost:5432/db?application_name=pg-webhook 
   PUBLICATION_PREFIX=pg_webhook_pub
   SLOT_NAME=pg_webhook_slot
   SCHEMA_NAMES=public,sales,auth
   WEBHOOKS_API_KEY=xxxxxxxxxxxxxxxxxxx
   WEBHOOK_MAX_RETRIES=3
   WEBHOOK_RETRY_DELAY=2000
   LOG_LEVELS=verbose,debug,log,warn,error,fatal
   LOG_JSON= true | false
   NODE_ENV= production | development | test | provision
   PORT=3000
  

2. Run the stack with Docker Compose:

   ```bash
   docker-compose up --build
   ```

3. Prepare your schema and table

    ```sql
    CREATE SCHEMA IF NOT EXISTS public;

    CREATE TABLE IF NOT EXISTS public.users (
     id SERIAL PRIMARY KEY,
     name VARCHAR(255) NOT NULL,
     email VARCHAR(255) NOT NULL
    );

4. Create a new webhook via API:

   ```bash
    curl -X POST "http://localhost:3000/webhooks" \
    -H "Content-Type: application/json" \
    -H "x-api-key: $WEBHOOKS_API_KEY" \
    -d '{
      "schemaName": "public",
      "tableName": "users",
      "eventName": "INSERT",
      "url": "https://example.com/webhook",
      "secret": "supersecret123",
    }'    

5. Insert or update data in the database:

   ```sql  
   INSERT INTO public.users (name, email) VALUES ('Alice', 'alice@example.com');

6. The NestJS app will:

   - Capture the event from Postgres
   - Match it against the webhook.hooks table
   - Call the target webhook with a payload like:

   ```json
   {
     "schema": "public",
     "table": "users",
     "event": "INSERT",
     "new": {
       "id": 1,
       "name": "Alice",
       "email": "alice@example.com"
     },
     "old": null,
     "key": 1
   }
   ```

   - Tracking the Http call into webhook.logs table

### ⚙️ Diagram

  ```sql
      +-----------------+
      |   PostgreSQL    |
      |  (public schema)|
      |                 |
      | - users table   |
      | - orders table  |
      +--------+--------+
              |
              | Logical Replication / Publication (INSERT, UPDATE, DELETE)
              v
      +---------------------------+
      |      NestJS App           |
      |  (pg-webhook service)    |
      |                           |
      | - Replication Service     |
      | - Webhook Service         |
      | - Webhook Dispatcher      |
      +--------+------------------+
              |
              | Matches event against webhook.hooks table
              v
      +---------------------------+
      |     webhook.hooks         |
      |---------------------------|
      | id | schema | table | ... |
      +---------------------------+
              |
              | POST JSON payload
              v
      +---------------------------+
      | External Webhook Endpoint |
      |  (Client System)          |
      +---------------------------+
              |
              | Response / Success / Error
              v
      +---------------------------+
      |      webhook.logs         |
      |---------------------------|
      | hook_id | status | ...    |
      +---------------------------+
```

### 📝 Flow Explained

- Postgres emits events for INSERT, UPDATE, DELETE on tables in the public schema.

- NestJS Replication Service receives the event.

- Webhook Service queries webhook.hooks for active subscriptions matching schema, table, and event.

- Webhook Dispatcher sends HTTP POST to the webhook URL, signing the payload with the secret.

- Webhook Logs stores each attempt, including retries, status codes, errors, response time, and payload.

---

## 🔐 Webhook Security

- Each outgoing request includes a **HMAC-SHA256 signature** based on the payload and your `webhookSecret`.

- Example header:

  ```code
  X-Signature: sha256=abcdef12345...
  ```

- Receivers should recompute the HMAC with the shared secret to verify authenticity.

---

## 🏗️ Tech Stack

- **PostgreSQL** (with logical replication enabled)
- **NestJS** (TypeScript backend)
- **Docker + Docker Compose**
- **pg-logical-replication** library for consuming change events

---

## 📦 Running the Project

### Prerequisites

- Docker & Docker Compose installed

### Steps

1. Clone the repo:

   ```bash
   git clone https://github.com/mnm89/pg-webhook.git
   cd pg-webhook
   ```

2. Edit `app/config.json` with your webhooks and secret.

3. Start the stack:

   ```bash
   docker-compose up --build
   ```

4. Insert data into the database to trigger events.

---

## 📝 Roadmap

- [✅] Implement basic listener for `INSERT`, `UPDATE`, `DELETE`
- [✅] Add webhook sender with HMAC signatures
- [✅] Add structured logging (event + HTTP response)
- [✅] Support retry/backoff for failed webhook calls
- [✅] Extend to support filtering by schema/table

---

## 📄 License

MIT License
