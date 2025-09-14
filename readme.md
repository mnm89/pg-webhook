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

1. Define your event subscriptions in `config.json`:

   ```json
   {
     "webhookSecret": "xxxxxxxxx",
     "events": [
       {
         "tableName": "users",
         "eventName": "INSERT",
         "webhookUrl": "https://example.com/user-insert"
       },
       {
         "tableName": "users",
         "eventName": "UPDATE",
         "webhookUrl": "https://example.com/user-update"
       }
     ]
   }

2. Run the stack with Docker Compose:

   ```bash
   docker-compose up --build
   ```

3. Insert or update data in the database:

   ```sql
   INSERT INTO users (name, email) VALUES ('Alice', 'alice@example.com');
   ```

4. The NestJS app will:

   - Capture the event from Postgres
   - Match it against your config
   - Call the target webhook with a payload like:

   ```json
   {
     "tableName": "users",
     "eventName": "INSERT",
     "newRecord": {
       "id": 1,
       "name": "Alice",
       "email": "alice@example.com"
     },
     "oldRecord": null
   }
   ```

   - Add a signature header (e.g. `X-Signature`) to verify authenticity

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

- [ ] Implement basic listener for `INSERT`, `UPDATE`, `DELETE`
- [ ] Add webhook sender with HMAC signatures
- [ ] Add structured logging (event + HTTP response)
- [ ] Support retry/backoff for failed webhook calls
- [ ] Extend to support filtering by schema/table/columns

---

## 📄 License

MIT License
