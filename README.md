# Phoenix Blog Platform

A production-grade, full-stack blog platform built with **Spring Boot 3** and **React**, demonstrating enterprise-level backend architecture, secure authentication, and scalable database design.

**Live:** [phoenix-dun.vercel.app](https://phoenix-dun.vercel.app) · **Backend:** Spring Boot 3 (Java 17) · **Frontend:** React 18 + Vite · **Database:** PostgreSQL

---

## Architecture

### Layered Architecture

The backend follows a strict **Controller → Service → Repository** layered pattern with clear separation of concerns:

```
Controller Layer    ← Handles HTTP requests, input validation, response shaping
     ↓
Service Layer       ← Business logic, authorization checks, transaction orchestration
     ↓
Repository Layer    ← Data access via Spring Data JPA, custom JPQL queries
     ↓
Entity Layer        ← JPA entities mapped to PostgreSQL tables
```

- **DTOs** (`PostRequest`, `PostResponse`, `ApiResponse<T>`) decouple the API contract from internal entity structure, preventing data leakage and enabling independent evolution of the API surface.
- **Global exception handling** via `@ControllerAdvice` provides consistent error responses across all endpoints.
- **Builder pattern** (Lombok `@Builder`) used throughout for immutable object construction in DTOs and entities.

### JWT Stateless Authentication

Authentication is fully stateless using **JSON Web Tokens (JWT)**:

1. User authenticates via `/api/auth/login` → receives a signed JWT
2. Every subsequent request includes the token in `Authorization: Bearer <token>`
3. `JwtAuthenticationFilter` (extends `OncePerRequestFilter`) intercepts requests, validates the token signature and expiration, and sets the `SecurityContext`
4. No server-side session storage — horizontally scalable by design

```
Client → [JWT in Header] → JwtAuthenticationFilter → SecurityContext → Controller
```

- Tokens are signed with HMAC-SHA256 (`io.jsonwebtoken` / JJWT library)
- Token expiration: 24 hours (configurable via `jwt.expiration`)
- Secret key injected via environment variable (`JWT_SECRET`) — never hardcoded

### Role-Based Access Control (RBAC)

Two roles enforced at multiple layers:

| Role | Permissions |
|------|------------|
| `ROLE_USER` | Create/edit/delete own posts, comment, like, follow, bookmark |
| `ROLE_ADMIN` | All user permissions + manage all users/posts via admin panel |

- **Security filter chain** (`SecurityConfig`) defines public vs. authenticated endpoint patterns
- **Method-level security** via `@EnableMethodSecurity` for fine-grained access control
- `User` entity implements Spring Security's `UserDetails` interface directly — no adapter layer needed

---

## Database Schema

7 entities with well-defined relationships, all using **UUID primary keys** for distributed-system compatibility:

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│   User   │────<│   Post   │────<│ Comment  │
│          │     │          │     │          │
│ id (UUID)│     │ id (UUID)│     │ id (UUID)│
│ name     │     │ title    │     │ content  │
│ email    │     │ content  │     │ author   │
│ password │     │ status   │     │ post     │
│ role     │     │ author   │     └──────────┘
└──────────┘     │ isPremium│
     │           └──────────┘
     │                │
     ↓                ↓
┌──────────┐     ┌──────────┐     ┌──────────┐
│  Follow  │     │   Like   │     │ Bookmark │
│          │     │          │     │          │
│ follower │     │ user     │     │ user     │
│ following│     │ post     │     │ post     │
└──────────┘     └──────────┘     └──────────┘
                      │
                 ┌──────────┐
                 │   Tag    │ (Many-to-Many with Post)
                 │          │
                 │ name     │
                 └──────────┘
```

- **Unique constraints** on `(user_id, post_id)` for Like/Bookmark and `(follower_id, following_id)` for Follow — prevents duplicates at the DB level
- **Audit fields** (`createdAt`, `updatedAt`) via `@EntityListeners(AuditingEntityListener.class)` on all entities
- **Enum mapping** (`PostStatus.DRAFT/PUBLISHED`, `UserRole.ROLE_USER/ROLE_ADMIN`) stored as strings via `@Enumerated(EnumType.STRING)` for readability and safe schema evolution
- **Soft schema migration** via Hibernate `ddl-auto=update` with explicit `columnDefinition` defaults for safe column additions to production tables

---

## Performance Optimizations

| Technique | Implementation |
|-----------|---------------|
| **Pagination** | All list endpoints return `PagedResponse<T>` backed by Spring Data's `Pageable` — prevents full-table scans on large datasets |
| **DTO Projection** | Entities are never exposed directly; `convertToResponse()` maps only required fields, reducing payload size and preventing lazy-loading triggers |
| **JPQL Queries** | Custom `@Query` annotations with targeted joins (e.g., `findRelatedPosts`) instead of derived queries — gives full control over generated SQL |
| **N+1 Prevention** | Aggregate counts (`likeCount`, `commentCount`) computed via repository-level `countBy*` queries rather than loading full collections |
| **Transaction Scoping** | `@Transactional(readOnly = true)` on read paths enables Hibernate flush-mode optimizations; write transactions scoped to service methods only |
| **Stateless Auth** | JWT eliminates session-store lookups — O(1) authentication per request via token signature verification |
| **Connection Pooling** | HikariCP with configured `connection-timeout` and `initialization-fail-timeout` for resilient DB connection management |
| **Index-Friendly Queries** | `TRIM()`-based lookups and status-filtered queries designed to work with standard B-tree indexes on `name`, `email`, `status` columns |

---

## Features

- **Authentication:** Register, login, logout, forgot/reset password (email via SMTP)
- **Posts:** Create, edit, delete, rich text editor, draft/publish workflow, tags
- **Social:** Follow/unfollow authors, like posts, comment threads, bookmarks/reading list
- **Premium Content:** Razorpay payment integration for premium posts
- **Discovery:** Search by title/tags, related posts, reading time estimates, view counts
- **Profile:** User profiles with post history, follower/following counts, saved posts, drafts
- **UX:** Dark mode, reading progress bar, responsive design, animated transitions

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
