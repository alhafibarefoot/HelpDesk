# System Core Specification (Current State)

## 1. Architecture Overview
The system follows a modern **Next.js App Router** architecture integrated with **Supabase** for backend services.

### Layers
1.  **Presentation Layer (UI)**:
    - Built with **React/Next.js (Server Components)**.
    - Uses **Shadcn UI** & **Tailwind CSS** for styling.
    - **Path**: `src/app` (Pages), `src/components` (Reusable UI).
2.  **Logic Layer (Server Actions)**:
    - Handles user inputs, form submissions, and workflow transitions.
    - Acts as a secure bridge between Client and Database.
    - **Path**: `src/app/actions.ts`.
3.  **Domain Logic (Lib)**:
    - Contains pure business logic (Workflow Engine, RLS helpers).
    - **Path**: `src/lib/workflow-engine.ts`, `src/lib/supabase-server.ts`.
4.  **Data Layer (Database)**:
    - **Supabase (PostgreSQL)**.
    - Uses **Row Level Security (RLS)** for authorization.

### Request Flow
1.  User submits form → `submitRequest` (Server Action).
2.  Action creates `request` record + `request_form_values`.
3.  Action triggers `processWorkflowAction` to determine initial state.
4.  Admin views list → Queries `requests` with joins on `users` and `services`.
5.  Admin approves → `processWorkflowAction` calculates next node → Updates `requests.status` + inserts `request_actions` (Audit).

## 2. Current Data Model

### Core Entities

| Table | Description | Key Fields | Relationships |
| :--- | :--- | :--- | :--- |
| **users** | System users (synced with Auth) | `id`, `email`, `full_name`, `role`, `department` | 1:1 with `auth.users` |
| **services** | Service definitions | `id`, `key`, `name`, `form_schema` (JSON) | - |
| **workflows** | Workflow definitions | `id`, `service_id`, `definition` (JSON) | 1:1 with `services` |
| **requests** | Service instances (Tickets) | `id`, `request_number`, `requester_id`, `status`, `current_step_id` | `requester_id` -> `users.id` |
| **request_form_values** | Form data storage | `request_id`, `form_data` (JSON) | 1:1 with `requests` |
| **request_actions** | Audit log / History | `request_id`, `actor_id`, `action_type`, `comment` | `request_id` -> `requests` |

### Key Constraints
- **RLS**: Enabled on all tables.
- **Foreign Keys**: Strict linking between `requests` and `users` (Cascading delete disabled or restricted in some paths to preserve history).

## 3. Current Workflow Logic

### Storage
- Workflows are stored as **JSON Blobs** in `workflows.definition`.
- Structure: `{ nodes: [...], edges: [...] }` (React Flow compatible structure).

### Execution Engine (`src/lib/workflow-engine.ts`)
- **State Machine**: Not State Machine per se, but a Graph Traversal.
- **Node Types**:
  - `start`: Entry point.
  - `task`: Approval step (User action required).
  - `gateway`: Logic branch (AND/OR).
  - `end`: Termination (Approved/Rejected).
- **Transition**:
  - `processWorkflowAction(requestId, action)` finds current node.
  - Evaluates `edges` based on `action` (e.g., "approve") or conditions.
  - Returns `nextStepId` and `nextStatus`.

### Gaps
- **Parallel Execution**: Gateway logic exists in code but is not fully verified in production.
- **Sub-workflows**: Code exists (`executeSubWorkflow`) but functionality is experimental.

## 4. Current Forms Layer

### Definition
- Forms are defined via **JSON Schema** stored in `services.form_schema`.
- Includes: Field type, Label, Required flag, Options (for selects).

### Rendering
- `src/components/forms/enhanced-request-form.tsx` (or similar) reads the schema.
- Renders Shadcn components dynamically.
- Supports: Text, Date, Select, File Upload (Basic).

### State
- **Drafts**: Not fully implemented (Saving partial form).
- **Submission**: Validates against schema client-side (Zod) and saves entire payload to `request_form_values`.

## 5. Authorization / Roles

### Implementation
- **Role Source**: `public.users.role` column.
- **Enforcement**:
  1.  **RLS (Database)**: Policies like "Admins can view all", "Users can view own".
  2.  **UI Hiding**: Admin pages check role before rendering.
- **Roles Defined**: `user` (default), `admin`.

### Gaps
- **Middleware**: No strict middleware blocking of `/admin` routes (relies on Page-level checks).
- **Granular Permissions**: No "Manager" role fully implemented yet (treated same as Admin or ignored).

## 6. Gaps & Missing Core Features (Naps)

1.  **Notification System**:
    - *Status*: Skeleton exists (`notifyWorkflowAction`), but no email/SMS provider connected.
2.  **Timeline View**:
    - *Status*: Data exists (`request_actions`), but no UI component to visualize it for the user.
3.  **SLA Tracking**:
    - *Status*: Not implemented. No logic to track deadlines or overdue requests.
4.  **Dashboard Analytics**:
    - *Status*: Mock data only. No real aggregation of `requests` stats.
5.  **Role Hierarchy**:
    - *Status*: Flat structure (Admin vs User). Needs "Department Manager" logic.

---
**Generated**: 2025-12-07
**Version**: 1.0 (Core Baseline)
