# msa-project: FocusPulse

This is FocusPulse—a Pomodoro, Quiz, and Gaming platform built with microservices. It’s not just a toy project; it’s designed to handle real scale using Kafka and Kong. 

We’ve tried to keep the setup as painless as possible. Setting up microservices usually involves fighting with Docker networks for three hours, but we’ve got this down to a couple of commands.

## What’s under the hood?
We've kept the architecture straightforward but powerful:

*   **Kong**: Every request hits Kong first. It handles the JWT validation so the services stay focused on business logic.
*   **The Services**: Auth, Game, Quiz, and Timer. They're all Node.js and they're all fast.
*   **Kafka**: Services don't talk to each other directly. They emit events. It’s decoupled, resilient, and honestly, a lot funner to build with.
*   **Storage**: Postgres stores the important stuff, Redis handles the quick lookups.

---

## ⚡ Get it running
You should be up and running in about a minute:

1.  **Populate your environment**:
    ```bash
    cp .env.example .env
    ```
2.  **Fire up Docker**:
    ```bash
    npm run docker:up
    ```
    *(Wait about 20 seconds. Kafka takes a moment to wake up).*

3.  **Run the smoke test**:
    ```bash
    npm run test:smoke
    ```
    If you see **🔥 ALL TESTS PASSED SUCCESSFULLY 🔥**, you’ve officially survived the infrastructure setup.

---

## 🏗️ Structure
*   `/shared` — The shared library. Kafka wrappers, Postgres pools, and the circuit breaker live here.
*   `/services` — The meat of the project. Each service is its own domain.
*   `/consumers` — Background workers that chew through Kafka messages.
*   `/gateway` — Kong configuration.
*   `/bff` — Backend-for-Frontend to aggregate data for the UI.

---

## 🧪 Testing
I’ve included a smoke test in `scripts/smoke-test.sh`. It handles the boring stuff:
1.  **Health Checks**: Makes sure every service is actually alive.
2.  **Auth Flow**: Registers a user and logs them in to make sure the JWT loop is working.
3.  **Gateway Routing**: Checks if Kong is actually blocking the bad guys (and letting you in with a token).

```bash
npm run test:smoke
```

---

## 🛠️ Troubleshooting
*   **Port Collisions**: If you get a "port already allocated" error, you probably have a local Postgres or Redis running. Shut them down and try again.
*   **Logs**: If something feels broken, check the logs for that specific service:
    ```bash
    docker compose logs -f <service-name>
    ```
*   **Rebuilding**: If you touch anything in `/shared`, you **must** rebuild:
    ```bash
    npm run docker:up  # (This triggers a build automatically)
    ```

**Happy coding!**
