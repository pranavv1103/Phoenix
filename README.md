# Phoenix Blog Platform

Full-stack blog platform with:
- **Backend:** Spring Boot 3 (Java 17, Maven, PostgreSQL)
- **Frontend:** React + Vite

## Project Structure

- `src/main/java` — Spring Boot backend
- `src/main/resources` — backend config
- `phoenix-client/` — React frontend
- `start-dev.sh` — starts backend + frontend
- `stop-dev.sh` — stops backend + frontend

## Prerequisites

- Java 17
- Maven 3.9+
- Node.js + npm
- PostgreSQL running locally

## Run Locally

```bash
./start-dev.sh
```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:8080`

Stop services:

```bash
./stop-dev.sh
```

## Logs

- `.dev-logs/backend.log`
- `.dev-logs/frontend.log`

## Build & Test

Backend tests:

```bash
mvn test
```

Frontend lint/build:

```bash
cd phoenix-client
npm run lint
npm run build
```
