# Auth & Permissions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gate the entire app behind login, add Admin/Viewer roles enforced by the database itself (not just the UI), and let Admins invite/manage users in-app.

**Architecture:** A new `profiles` table (one row per Supabase Auth user, holding `role` and `active`) backs rewritten Row-Level Security policies on every existing table, via a `security definer` helper function that avoids RLS self-recursion. A React `AuthContext` tracks the signed-in session and profile; route guards (`RequireAuth`, `RequireAdmin`) redirect based on it. Creating new user accounts needs Supabase's privileged service-role key, which can never reach the browser, so that one operation goes through a small Supabase Edge Function instead.

**Tech Stack:** Supabase Auth (email+password), Supabase Postgres RLS, a Deno-runtime Supabase Edge Function, React Context, React Router v7 (existing).

**Spec:** [docs/superpowers/specs/2026-09-17-auth-and-permissions-design.md](../specs/2026-09-17-auth-and-permissions-design.md)

## Global Constraints

- Exactly two roles: `admin` and `viewer`. No department-scoped access (explicitly out of scope).
- RLS is the actual security boundary. UI gating (hiding buttons, redirecting routes) is UX polish only — never the thing an attacker would need to bypass.
- The Supabase **service role key** must never appear in any browser-shipped code (`src/**`, `dist/**`). It is only ever used inside the Edge Function runtime, which injects it automatically as `SUPABASE_SERVICE_ROLE_KEY`.
- No user deletion — only `active = false` deactivation, to preserve history integrity for the later Audit History sub-project.
- No public sign-up. Accounts are created only via an Admin's in-app invite, which calls the Edge Function.
- Login is Supabase email + password only — no magic link, no SSO, per the approved spec.
- Every application route requires an authenticated session with an `active` profile, except `/login`.

## Review Focus

- A user deactivated mid-session (their browser still holds a valid, unexpired login token) must be denied on their very next data request — RLS re-checks `active` on every query, not just at the moment they logged in.
- A Viewer who bypasses the UI and calls the Supabase API directly (e.g. from the browser console) to attempt a write must be rejected by RLS, not merely prevented by a hidden button.
- An unauthenticated request straight to Supabase (no login at all — e.g. someone using the public anon key directly) must return zero rows on every table, matching today's public GitHub Pages exposure being closed off.
- A non-admin (or entirely unauthenticated) request to the `invite-user` Edge Function must be rejected by the function itself, independent of any role the caller's request claims — the function re-derives the caller's role server-side from their token.
- Inviting an email address that already has an account must fail with a clear, specific error and must not create a duplicate `profiles` row or leave the database in a half-written state.

---

## Task 1: Database schema — `profiles` table and RLS rewrite

**Files:**
- Create: `supabase/migrations/0003_profiles_and_rls.sql`
- Create: `src/test/testAuthHelpers.ts`
- Create: `src/test/integrationAuthSetup.ts`
- Modify: `src/api/__tests__/vehicles.integration.test.ts`
- Modify: `src/api/__tests__/expenses.integration.test.ts`
- Create: `src/api/__tests__/rls.integration.test.ts`
- Modify: `.env.example`

**Interfaces:**
- Produces: `public.current_user_role()` SQL function (used by every later policy and, conceptually, by the Edge Function's authorization check). `createTestUser(role: 'admin' | 'viewer'): Promise<{ id: string; email: string; password: string }>` and `deleteTestUser(id: string): Promise<void>` from `testAuthHelpers.ts`, used by every later integration test file. `signInAsTestUser(user: { email: string; password: string }): Promise<void>` and `signOutTestUser(): Promise<void>` from `integrationAuthSetup.ts`.

- [ ] **Step 1: Write the migration SQL**

```sql
-- supabase/migrations/0003_profiles_and_rls.sql

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null check (role in ('admin', 'viewer')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Returns the caller's role if they have an active profile, else null.
-- security definer + explicit search_path avoids RLS self-recursion when
-- this is called from policies on the profiles table itself.
create function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid() and active = true;
$$;

-- profiles: a user can always read their own row; admins can read all.
create policy "Read own profile or admin reads all" on public.profiles
  for select using (id = auth.uid() or public.current_user_role() = 'admin');

-- profiles: only admins can change role/active on any row (including their own).
create policy "Admins update profiles" on public.profiles
  for update using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- No insert policy on profiles for authenticated users: rows are created
-- only by the invite-user Edge Function using the service role key, which
-- bypasses RLS by design.

-- Replace the Phase 1 "public read access" policies with authenticated-only
-- reads, and add admin-only writes, on every existing table.
drop policy "Public read access" on public.vehicles;
drop policy "Public read access" on public.expenses;
drop policy "Public read access" on public.expense_assignment_audit;

create policy "Authenticated active users read vehicles" on public.vehicles
  for select using (public.current_user_role() is not null);
create policy "Admins write vehicles" on public.vehicles
  for all using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

create policy "Authenticated active users read expenses" on public.expenses
  for select using (public.current_user_role() is not null);
create policy "Admins write expenses" on public.expenses
  for all using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

create policy "Authenticated active users read audit" on public.expense_assignment_audit
  for select using (public.current_user_role() is not null);
create policy "Admins write audit" on public.expense_assignment_audit
  for all using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');
```

Apply it to the live project (this is the one time in this task we touch the
real database directly, via the Supabase MCP tool or `supabase db push`):

Run: apply this migration to project `gcazhqwydpiidnhtczfc`.
Expected: migration applies with no errors; `select * from public.profiles limit 1;` returns an empty result set (table exists, no rows yet).

- [ ] **Step 2: Add the service-role env var, kept out of the browser bundle**

Add to `.env.example` (a placeholder only — the real value goes in the
gitignored `.env`, and is used exclusively by Node-side test code, never by
`src/**`):

```
VITE_SUPABASE_URL=https://gcazhqwydpiidnhtczfc.supabase.co
VITE_SUPABASE_ANON_KEY=replace_with_publishable_key
SUPABASE_SERVICE_ROLE_KEY=replace_with_service_role_key_integration_tests_only
```

Add the real service role key (from the Supabase dashboard's API settings)
to your local `.env`. Note the missing `VITE_` prefix is deliberate — Vite
only exposes `VITE_`-prefixed vars to browser code, and this key must never
be reachable there.

- [ ] **Step 3: Write the Node-side test user helper**

```typescript
// src/test/testAuthHelpers.ts
import { createClient } from '@supabase/supabase-js';

const adminClient = createClient(
  process.env.VITE_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export interface TestUser {
  id: string;
  email: string;
  password: string;
}

/** Creates a disposable, already-confirmed auth user plus a matching profiles row. */
export async function createTestUser(role: 'admin' | 'viewer'): Promise<TestUser> {
  const email = `test-${role}-${Date.now()}-${Math.random().toString(36).slice(2)}@oryxdoors.test`;
  const password = 'Test-Password-123!';
  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;
  const { error: profileError } = await adminClient
    .from('profiles')
    .insert({ id: data.user.id, email, role, active: true });
  if (profileError) throw profileError;
  return { id: data.user.id, email, password };
}

export async function deleteTestUser(id: string): Promise<void> {
  await adminClient.auth.admin.deleteUser(id);
}

export async function setTestUserActive(id: string, active: boolean): Promise<void> {
  const { error } = await adminClient.from('profiles').update({ active }).eq('id', id);
  if (error) throw error;
}
```

- [ ] **Step 4: Write the shared integration auth setup**

```typescript
// src/test/integrationAuthSetup.ts
import { supabase } from '../lib/supabaseClient';
import type { TestUser } from './testAuthHelpers';

/** Signs the app's shared Supabase client in as the given test user. */
export async function signInAsTestUser(user: TestUser): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: user.password,
  });
  if (error) throw error;
}

export async function signOutTestUser(): Promise<void> {
  await supabase.auth.signOut();
}
```

- [ ] **Step 5: Update the existing vehicles integration test to sign in first**

```typescript
// src/api/__tests__/vehicles.integration.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { fetchVehicles, fetchVehicleById } from '../vehicles';
import { createTestUser, deleteTestUser, type TestUser } from '../../test/testAuthHelpers';
import { signInAsTestUser, signOutTestUser } from '../../test/integrationAuthSetup';

let testUser: TestUser;

beforeAll(async () => {
  testUser = await createTestUser('admin');
  await signInAsTestUser(testUser);
});

afterAll(async () => {
  await signOutTestUser();
  await deleteTestUser(testUser.id);
});

describe('vehicles API (integration, real Supabase project)', () => {
  it('fetches all 52 seeded vehicles ordered by plate_no', async () => {
    const vehicles = await fetchVehicles();
    expect(vehicles).toHaveLength(52);
    expect(vehicles[0].plate_no <= vehicles[1].plate_no).toBe(true);
  });

  it('fetches the known U 67931 Ford Ranger by id', async () => {
    const vehicles = await fetchVehicles();
    const ranger = vehicles.find((v) => v.plate_no === 'U 67931')!;
    const byId = await fetchVehicleById(ranger.id);
    expect(byId?.brand).toBe('Ford');
    expect(byId?.model).toBe('Ranger 2021');
  });

  it('returns null for an unknown id', async () => {
    const result = await fetchVehicleById('00000000-0000-0000-0000-000000000000');
    expect(result).toBeNull();
  });
});
```

(The vehicle count drops from 53 to 52 here because a duplicate Mobile Crane
record — same chassis number, typo'd plate — was removed directly from the
database on 2026-09-17, independent of this plan.)

- [ ] **Step 6: Apply the same sign-in pattern to the expenses integration test**

Open `src/api/__tests__/expenses.integration.test.ts` and add the identical
`beforeAll`/`afterAll` block from Step 5 (same imports, same `testUser`
variable), leaving its existing `it(...)` bodies and assertions unchanged.

- [ ] **Step 7: Run the existing integration suite to confirm it's green again**

Run: `npm run test:integration`
Expected: PASS — the vehicles and expenses integration tests succeed signed in as an admin test user, confirming the new RLS policies allow authenticated reads.

- [ ] **Step 8: Write the RLS-enforcement tests (Review Focus items 1–3)**

```typescript
// src/api/__tests__/rls.integration.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabaseClient';
import {
  createTestUser,
  deleteTestUser,
  setTestUserActive,
  type TestUser,
} from '../../test/testAuthHelpers';
import { signInAsTestUser, signOutTestUser } from '../../test/integrationAuthSetup';

describe('RLS enforcement (integration, real Supabase project)', () => {
  it('denies reads to a completely unauthenticated client', async () => {
    const anon = createClient(
      process.env.VITE_SUPABASE_URL as string,
      process.env.VITE_SUPABASE_ANON_KEY as string
    );
    const { data, error } = await anon.from('vehicles').select('*');
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it('lets a Viewer read but rejects a Viewer write attempt', async () => {
    const viewer = await createTestUser('viewer');
    try {
      await signInAsTestUser(viewer);
      const { data: readData, error: readError } = await supabase.from('vehicles').select('*');
      expect(readError).toBeNull();
      expect(readData!.length).toBeGreaterThan(0);

      const { error: writeError } = await supabase
        .from('vehicles')
        .update({ remarks: 'should not be allowed' })
        .eq('plate_no', 'U 67931');
      expect(writeError).not.toBeNull();
    } finally {
      await signOutTestUser();
      await deleteTestUser(viewer.id);
    }
  });

  it('denies reads immediately after a user is deactivated mid-session', async () => {
    const viewer = await createTestUser('viewer');
    try {
      await signInAsTestUser(viewer);
      const { data: before, error: beforeError } = await supabase.from('vehicles').select('*');
      expect(beforeError).toBeNull();
      expect(before!.length).toBeGreaterThan(0);

      await setTestUserActive(viewer.id, false);

      const { data: after, error: afterError } = await supabase.from('vehicles').select('*');
      expect(afterError).toBeNull();
      expect(after).toEqual([]);
    } finally {
      await signOutTestUser();
      await deleteTestUser(viewer.id);
    }
  });

  it('lets an Admin write, unlike a Viewer', async () => {
    const admin = await createTestUser('admin');
    try {
      await signInAsTestUser(admin);
      const { data, error } = await supabase
        .from('vehicles')
        .update({ remarks: 'admin test write' })
        .eq('plate_no', 'U 67931')
        .select();
      expect(error).toBeNull();
      expect(data!.length).toBe(1);
      // Revert the test write so it doesn't pollute other tests/data.
      await supabase.from('vehicles').update({ remarks: null }).eq('plate_no', 'U 67931');
    } finally {
      await signOutTestUser();
      await deleteTestUser(admin.id);
    }
  });
});
```

- [ ] **Step 9: Run it**

Run: `npm run test:integration`
Expected: PASS — all four new RLS tests succeed, and the pre-existing vehicles/expenses integration tests (Steps 5–6) still pass.

- [ ] **Step 10: Commit**

```bash
git add supabase/migrations/0003_profiles_and_rls.sql .env.example \
  src/test/testAuthHelpers.ts src/test/integrationAuthSetup.ts \
  src/api/__tests__/vehicles.integration.test.ts \
  src/api/__tests__/expenses.integration.test.ts \
  src/api/__tests__/rls.integration.test.ts
git commit -m "feat: add profiles table and RLS-enforced roles"
```

---

## Task 2: AuthContext

**Files:**
- Create: `src/contexts/AuthContext.tsx`
- Create: `src/contexts/__tests__/AuthContext.test.tsx`
- Modify: `src/types/index.ts`

**Interfaces:**
- Consumes: `supabase` from `src/lib/supabaseClient.ts` (existing).
- Produces: `AuthProvider` component and `useAuth(): { loading: boolean; session: Session | null; profile: Profile | null; signOut: () => Promise<void> }` hook, consumed by every later task in this plan. `Profile` type from `src/types/index.ts`.

- [ ] **Step 1: Add the Profile type**

```typescript
// src/types/index.ts — add alongside the existing Vehicle/Expense interfaces
export interface Profile {
  id: string;
  email: string;
  role: 'admin' | 'viewer';
  active: boolean;
  created_at: string;
  updated_at: string;
}
```

- [ ] **Step 2: Write the failing test**

```typescript
// src/contexts/__tests__/AuthContext.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../AuthContext';
import { supabase } from '../../lib/supabaseClient';

vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      signOut: vi.fn(),
    },
    from: vi.fn(),
  },
}));

function Probe() {
  const { loading, session, profile } = useAuth();
  if (loading) return <p>loading</p>;
  return <p>{session ? `signed in as ${profile?.role}` : 'signed out'}</p>;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('AuthContext', () => {
  it('starts loading, then reflects no session when there is none', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: null,
    } as never);

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );

    expect(screen.getByText('loading')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('signed out')).toBeInTheDocument());
  });

  it('loads the profile row once a session exists', async () => {
    const fakeSession = { user: { id: 'user-1' } };
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: fakeSession },
      error: null,
    } as never);
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { id: 'user-1', email: 'a@b.com', role: 'admin', active: true },
      error: null,
    });
    vi.mocked(supabase.from).mockReturnValue({
      select: () => ({ eq: () => ({ maybeSingle }) }),
    } as never);

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByText('signed in as admin')).toBeInTheDocument());
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/contexts/__tests__/AuthContext.test.tsx`
Expected: FAIL with "Failed to resolve import ../AuthContext" (file doesn't exist yet).

- [ ] **Step 4: Write AuthContext**

```typescript
// src/contexts/AuthContext.tsx
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import type { Profile } from '../types';

interface AuthState {
  loading: boolean;
  session: Session | null;
  profile: Profile | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

async function loadProfile(userId: string): Promise<Profile | null> {
  const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  return data as Profile | null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      if (data.session) {
        setProfile(await loadProfile(data.session.user.id));
      }
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      setProfile(newSession ? await loadProfile(newSession.user.id) : null);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ loading, session, profile, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/contexts/__tests__/AuthContext.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/contexts/AuthContext.tsx src/contexts/__tests__/AuthContext.test.tsx src/types/index.ts
git commit -m "feat: add AuthContext for session and profile state"
```

---

## Task 3: Login page, RequireAuth guard, wire into App

**Files:**
- Create: `src/pages/Login.tsx`
- Create: `src/pages/__tests__/Login.test.tsx`
- Create: `src/components/RequireAuth.tsx`
- Create: `src/components/__tests__/RequireAuth.test.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `useAuth()` from Task 2.
- Produces: `RequireAuth` component, wrapping the rest of the app from Task 4 onward.

- [ ] **Step 1: Write the failing RequireAuth test**

```typescript
// src/components/__tests__/RequireAuth.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { RequireAuth } from '../RequireAuth';
import { useAuth } from '../../contexts/AuthContext';

vi.mock('../../contexts/AuthContext', () => ({ useAuth: vi.fn() }));

describe('RequireAuth', () => {
  it('shows nothing while auth state is loading', () => {
    vi.mocked(useAuth).mockReturnValue({ loading: true, session: null, profile: null } as never);
    render(
      <MemoryRouter initialEntries={['/vehicles']}>
        <Routes>
          <Route path="/login" element={<p>login page</p>} />
          <Route path="/vehicles" element={<RequireAuth><p>vehicles page</p></RequireAuth>} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.queryByText('vehicles page')).not.toBeInTheDocument();
    expect(screen.queryByText('login page')).not.toBeInTheDocument();
  });

  it('redirects to /login when there is no session', () => {
    vi.mocked(useAuth).mockReturnValue({ loading: false, session: null, profile: null } as never);
    render(
      <MemoryRouter initialEntries={['/vehicles']}>
        <Routes>
          <Route path="/login" element={<p>login page</p>} />
          <Route path="/vehicles" element={<RequireAuth><p>vehicles page</p></RequireAuth>} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText('login page')).toBeInTheDocument();
  });

  it('renders children when an active session exists', () => {
    vi.mocked(useAuth).mockReturnValue({
      loading: false,
      session: { user: { id: 'u1' } },
      profile: { id: 'u1', email: 'a@b.com', role: 'viewer', active: true },
    } as never);
    render(
      <MemoryRouter initialEntries={['/vehicles']}>
        <Routes>
          <Route path="/login" element={<p>login page</p>} />
          <Route path="/vehicles" element={<RequireAuth><p>vehicles page</p></RequireAuth>} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText('vehicles page')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/__tests__/RequireAuth.test.tsx`
Expected: FAIL with "Failed to resolve import ../RequireAuth"

- [ ] **Step 3: Write RequireAuth**

```typescript
// src/components/RequireAuth.tsx
import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function RequireAuth({ children }: { children: ReactNode }) {
  const { loading, session } = useAuth();
  if (loading) return null;
  if (!session) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/__tests__/RequireAuth.test.tsx`
Expected: PASS

- [ ] **Step 5: Write the failing Login test**

```typescript
// src/pages/__tests__/Login.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Login } from '../Login';
import { supabase } from '../../lib/supabaseClient';

vi.mock('../../lib/supabaseClient', () => ({
  supabase: { auth: { signInWithPassword: vi.fn() } },
}));

describe('Login', () => {
  it('submits email and password to signInWithPassword', async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { session: {} },
      error: null,
    } as never);

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'secret123');
    await userEvent.click(screen.getByRole('button', { name: /log in/i }));

    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'a@b.com',
      password: 'secret123',
    });
  });

  it('shows an error message on failed login', async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { session: null },
      error: { message: 'Invalid login credentials' },
    } as never);

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: /log in/i }));

    expect(await screen.findByText(/invalid login credentials/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npx vitest run src/pages/__tests__/Login.test.tsx`
Expected: FAIL with "Failed to resolve import ../Login"

- [ ] **Step 7: Write the Login page**

```typescript
// src/pages/Login.tsx
import { useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabaseClient';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (error) setError(error.message);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <form onSubmit={handleSubmit} className="w-full max-w-sm border border-oryx-silver rounded-lg p-6">
        <h1 className="text-xl font-bold text-oryx-blue mb-4">Oryx Vehicle Management</h1>
        <label htmlFor="email" className="block text-sm text-oryx-silver mb-1">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full border border-oryx-silver rounded px-3 py-2 mb-3"
        />
        <label htmlFor="password" className="block text-sm text-oryx-silver mb-1">
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full border border-oryx-silver rounded px-3 py-2 mb-3"
        />
        {error && <p className="text-red-700 text-sm mb-3">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-oryx-blue text-white rounded px-3 py-2 disabled:opacity-50"
        >
          Log in
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npx vitest run src/pages/__tests__/Login.test.tsx`
Expected: PASS

- [ ] **Step 9: Wire AuthProvider, Login, and RequireAuth into App.tsx**

```typescript
// src/App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { RequireAuth } from './components/RequireAuth';
import { Login } from './pages/Login';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Vehicles } from './pages/Vehicles';
import { VehicleProfileLayout } from './pages/vehicle/VehicleProfileLayout';
import { Overview } from './pages/vehicle/Overview';
import { VehicleExpenses } from './pages/vehicle/VehicleExpenses';
import { Maintenance } from './pages/vehicle/Maintenance';
import { Documents } from './pages/vehicle/Documents';
import { Finance } from './pages/vehicle/Finance';
import { VehicleReports } from './pages/vehicle/VehicleReports';
import { UnassignedExpenses } from './pages/UnassignedExpenses';
import { Reports } from './pages/Reports';

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/*"
            element={
              <RequireAuth>
                <Layout>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/vehicles" element={<Vehicles />} />
                    <Route path="/vehicles/:id" element={<VehicleProfileLayout />}>
                      <Route index element={<Overview />} />
                      <Route path="expenses" element={<VehicleExpenses />} />
                      <Route path="maintenance" element={<Maintenance />} />
                      <Route path="documents" element={<Documents />} />
                      <Route path="finance" element={<Finance />} />
                      <Route path="reports" element={<VehicleReports />} />
                    </Route>
                    <Route path="/unassigned-expenses" element={<UnassignedExpenses />} />
                    <Route path="/reports" element={<Reports />} />
                  </Routes>
                </Layout>
              </RequireAuth>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
```

- [ ] **Step 10: Run the full test suite**

Run: `npm test -- --run`
Expected: PASS — all existing tests still pass (they render pages directly, not through App's routing, so this restructure doesn't affect them).

- [ ] **Step 11: Commit**

```bash
git add src/pages/Login.tsx src/pages/__tests__/Login.test.tsx \
  src/components/RequireAuth.tsx src/components/__tests__/RequireAuth.test.tsx \
  src/App.tsx
git commit -m "feat: add login page and gate the app behind authentication"
```

---

## Task 4: NavBar — signed-in user, log out, admin-only link

**Files:**
- Modify: `src/components/NavBar.tsx`
- Create: `src/components/__tests__/NavBar.test.tsx`

**Interfaces:**
- Consumes: `useAuth()` from Task 2.

- [ ] **Step 1: Write the failing test**

```typescript
// src/components/__tests__/NavBar.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { NavBar } from '../NavBar';
import { useAuth } from '../../contexts/AuthContext';

vi.mock('../../contexts/AuthContext', () => ({ useAuth: vi.fn() }));

describe('NavBar', () => {
  it('shows the signed-in email but no Manage Users link for a Viewer', () => {
    const signOut = vi.fn();
    vi.mocked(useAuth).mockReturnValue({
      loading: false,
      session: { user: { id: 'u1' } },
      profile: { id: 'u1', email: 'viewer@oryxdoors.com', role: 'viewer', active: true },
      signOut,
    } as never);

    render(
      <MemoryRouter>
        <NavBar />
      </MemoryRouter>
    );

    expect(screen.getByText('viewer@oryxdoors.com')).toBeInTheDocument();
    expect(screen.queryByText('Manage Users')).not.toBeInTheDocument();
  });

  it('shows the Manage Users link for an Admin and calls signOut on click', async () => {
    const signOut = vi.fn();
    vi.mocked(useAuth).mockReturnValue({
      loading: false,
      session: { user: { id: 'u1' } },
      profile: { id: 'u1', email: 'admin@oryxdoors.com', role: 'admin', active: true },
      signOut,
    } as never);

    render(
      <MemoryRouter>
        <NavBar />
      </MemoryRouter>
    );

    expect(screen.getByText('Manage Users')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /log out/i }));
    expect(signOut).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/__tests__/NavBar.test.tsx`
Expected: FAIL — "Manage Users" text and email are not rendered yet.

- [ ] **Step 3: Update NavBar**

```typescript
// src/components/NavBar.tsx
import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const links = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/vehicles', label: 'Vehicles' },
  { to: '/unassigned-expenses', label: 'Unassigned Expenses' },
  { to: '/reports', label: 'Reports' },
];

export function NavBar() {
  const { profile, signOut } = useAuth();

  return (
    <nav className="bg-oryx-blue text-white px-6 py-4 flex gap-6 items-center">
      <span className="font-bold">Oryx Vehicle Management</span>
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.end}
          className={({ isActive }) =>
            isActive ? 'underline font-semibold' : 'opacity-80 hover:opacity-100'
          }
        >
          {link.label}
        </NavLink>
      ))}
      {profile?.role === 'admin' && (
        <NavLink
          to="/users"
          className={({ isActive }) =>
            isActive ? 'underline font-semibold' : 'opacity-80 hover:opacity-100'
          }
        >
          Manage Users
        </NavLink>
      )}
      <span className="ml-auto flex items-center gap-4 text-sm">
        {profile?.email}
        <button onClick={() => signOut()} className="underline opacity-80 hover:opacity-100">
          Log out
        </button>
      </span>
    </nav>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/__tests__/NavBar.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/NavBar.tsx src/components/__tests__/NavBar.test.tsx
git commit -m "feat: show signed-in user, log out, and admin nav link"
```

---

## Task 5: profiles API module and RequireAdmin guard

**Files:**
- Create: `src/api/profiles.ts`
- Create: `src/api/__tests__/profiles.test.ts`
- Create: `src/components/RequireAdmin.tsx`
- Create: `src/components/__tests__/RequireAdmin.test.tsx`

**Interfaces:**
- Produces: `fetchProfiles(): Promise<Profile[]>`, `updateProfileRole(id: string, role: 'admin' | 'viewer'): Promise<void>`, `setProfileActive(id: string, active: boolean): Promise<void>` — consumed by Task 7's Manage Users page. `RequireAdmin` component, consumed by Task 7's `/users` route.

- [ ] **Step 1: Write the failing profiles API test**

```typescript
// src/api/__tests__/profiles.test.ts
import { describe, it, expect, vi } from 'vitest';
import { fetchProfiles, updateProfileRole, setProfileActive } from '../profiles';
import { supabase } from '../../lib/supabaseClient';

vi.mock('../../lib/supabaseClient', () => ({ supabase: { from: vi.fn() } }));

describe('profiles API', () => {
  it('fetches all profiles ordered by email', async () => {
    const order = vi.fn().mockResolvedValue({
      data: [{ id: '1', email: 'a@b.com', role: 'admin', active: true }],
      error: null,
    });
    vi.mocked(supabase.from).mockReturnValue({ select: () => ({ order }) } as never);

    const result = await fetchProfiles();
    expect(result).toHaveLength(1);
    expect(order).toHaveBeenCalledWith('email');
  });

  it('updates a profile role', async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    vi.mocked(supabase.from).mockReturnValue({ update: () => ({ eq }) } as never);

    await updateProfileRole('user-1', 'admin');
    expect(eq).toHaveBeenCalledWith('id', 'user-1');
  });

  it('sets a profile active/inactive', async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    vi.mocked(supabase.from).mockReturnValue({ update: () => ({ eq }) } as never);

    await setProfileActive('user-1', false);
    expect(eq).toHaveBeenCalledWith('id', 'user-1');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/api/__tests__/profiles.test.ts`
Expected: FAIL with "Failed to resolve import ../profiles"

- [ ] **Step 3: Write the profiles API module**

```typescript
// src/api/profiles.ts
import { supabase } from '../lib/supabaseClient';
import type { Profile } from '../types';

export async function fetchProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase.from('profiles').select('*').order('email');
  if (error) throw error;
  return data as Profile[];
}

export async function updateProfileRole(id: string, role: 'admin' | 'viewer'): Promise<void> {
  const { error } = await supabase.from('profiles').update({ role }).eq('id', id);
  if (error) throw error;
}

export async function setProfileActive(id: string, active: boolean): Promise<void> {
  const { error } = await supabase.from('profiles').update({ active }).eq('id', id);
  if (error) throw error;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/api/__tests__/profiles.test.ts`
Expected: PASS

- [ ] **Step 5: Write the failing RequireAdmin test**

```typescript
// src/components/__tests__/RequireAdmin.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { RequireAdmin } from '../RequireAdmin';
import { useAuth } from '../../contexts/AuthContext';

vi.mock('../../contexts/AuthContext', () => ({ useAuth: vi.fn() }));

describe('RequireAdmin', () => {
  it('redirects a Viewer to the dashboard', () => {
    vi.mocked(useAuth).mockReturnValue({
      profile: { id: 'u1', email: 'v@b.com', role: 'viewer', active: true },
    } as never);

    render(
      <MemoryRouter initialEntries={['/users']}>
        <Routes>
          <Route path="/" element={<p>dashboard</p>} />
          <Route path="/users" element={<RequireAdmin><p>manage users</p></RequireAdmin>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('dashboard')).toBeInTheDocument();
  });

  it('renders children for an Admin', () => {
    vi.mocked(useAuth).mockReturnValue({
      profile: { id: 'u1', email: 'a@b.com', role: 'admin', active: true },
    } as never);

    render(
      <MemoryRouter initialEntries={['/users']}>
        <Routes>
          <Route path="/" element={<p>dashboard</p>} />
          <Route path="/users" element={<RequireAdmin><p>manage users</p></RequireAdmin>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('manage users')).toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npx vitest run src/components/__tests__/RequireAdmin.test.tsx`
Expected: FAIL with "Failed to resolve import ../RequireAdmin"

- [ ] **Step 7: Write RequireAdmin**

```typescript
// src/components/RequireAdmin.tsx
import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  if (profile?.role !== 'admin') return <Navigate to="/" replace />;
  return <>{children}</>;
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npx vitest run src/components/__tests__/RequireAdmin.test.tsx`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add src/api/profiles.ts src/api/__tests__/profiles.test.ts \
  src/components/RequireAdmin.tsx src/components/__tests__/RequireAdmin.test.tsx
git commit -m "feat: add profiles API and RequireAdmin route guard"
```

---

## Task 6: `invite-user` Edge Function

**Files:**
- Create: `supabase/functions/invite-user/index.ts`
- Create: `src/api/__tests__/inviteUser.integration.test.ts`

**Interfaces:**
- Produces: the deployed `invite-user` Edge Function, called via `supabase.functions.invoke('invite-user', { body: { email, role } })` from Task 7's Manage Users page.

- [ ] **Step 1: Write the Edge Function**

```typescript
// supabase/functions/invite-user/index.ts
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') as string;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string;

  // Identify the caller from their own token (not trusted from the request body).
  const callerClient = createClient(supabaseUrl, serviceRoleKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await callerClient.auth.getUser();
  if (userError || !userData.user) {
    return new Response(JSON.stringify({ error: 'Invalid session' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  const { data: callerProfile } = await adminClient
    .from('profiles')
    .select('role, active')
    .eq('id', userData.user.id)
    .maybeSingle();

  if (!callerProfile || callerProfile.role !== 'admin' || !callerProfile.active) {
    return new Response(JSON.stringify({ error: 'Only active admins can invite users' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const body = await req.json().catch(() => null);
  const email = body?.email as string | undefined;
  const role = body?.role as string | undefined;
  if (!email || (role !== 'admin' && role !== 'viewer')) {
    return new Response(JSON.stringify({ error: 'email and role (admin|viewer) are required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { data: existing } = await adminClient
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle();
  if (existing) {
    return new Response(JSON.stringify({ error: 'A user with this email already exists' }), {
      status: 409,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { data: invited, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email);
  if (inviteError || !invited.user) {
    return new Response(JSON.stringify({ error: inviteError?.message ?? 'Invite failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { error: profileError } = await adminClient
    .from('profiles')
    .insert({ id: invited.user.id, email, role, active: true });
  if (profileError) {
    return new Response(JSON.stringify({ error: profileError.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ id: invited.user.id, email, role }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
```

- [ ] **Step 2: Deploy the function**

Run: deploy `invite-user` to project `gcazhqwydpiidnhtczfc` (via the Supabase MCP tool's edge function deploy, or `supabase functions deploy invite-user --project-ref gcazhqwydpiidnhtczfc`).
Expected: deployment succeeds; `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are available automatically inside the function runtime — no manual secret configuration needed.

- [ ] **Step 3: Write the integration test (Review Focus items 4–5)**

```typescript
// src/api/__tests__/inviteUser.integration.test.ts
import { describe, it, expect, afterEach } from 'vitest';
import { supabase } from '../../lib/supabaseClient';
import { createTestUser, deleteTestUser, type TestUser } from '../../test/testAuthHelpers';
import { signInAsTestUser, signOutTestUser } from '../../test/integrationAuthSetup';

let createdUserId: string | null = null;

afterEach(async () => {
  await signOutTestUser();
  if (createdUserId) {
    await deleteTestUser(createdUserId);
    createdUserId = null;
  }
});

describe('invite-user Edge Function (integration, real Supabase project)', () => {
  it('rejects an unauthenticated call', async () => {
    const { error } = await supabase.functions.invoke('invite-user', {
      body: { email: 'nobody@oryxdoors.test', role: 'viewer' },
      headers: { Authorization: '' },
    });
    expect(error).not.toBeNull();
  });

  it('rejects a Viewer calling it directly', async () => {
    const viewer = await createTestUser('viewer');
    try {
      await signInAsTestUser(viewer);
      const { error } = await supabase.functions.invoke('invite-user', {
        body: { email: 'nobody@oryxdoors.test', role: 'viewer' },
      });
      expect(error).not.toBeNull();
    } finally {
      await deleteTestUser(viewer.id);
    }
  });

  it('lets an Admin invite a new user, and rejects a duplicate email', async () => {
    const admin = await createTestUser('admin');
    const newEmail = `invited-${Date.now()}@oryxdoors.test`;
    try {
      await signInAsTestUser(admin);
      const { data, error } = await supabase.functions.invoke('invite-user', {
        body: { email: newEmail, role: 'viewer' },
      });
      expect(error).toBeNull();
      expect(data.email).toBe(newEmail);
      createdUserId = data.id;

      const { error: dupError } = await supabase.functions.invoke('invite-user', {
        body: { email: newEmail, role: 'viewer' },
      });
      expect(dupError).not.toBeNull();
    } finally {
      await deleteTestUser(admin.id);
    }
  });
});
```

- [ ] **Step 4: Run it**

Run: `npm run test:integration`
Expected: PASS — all three Edge Function tests succeed against the deployed function.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/invite-user/index.ts src/api/__tests__/inviteUser.integration.test.ts
git commit -m "feat: add invite-user Edge Function for admin-only account creation"
```

---

## Task 7: Manage Users page

**Files:**
- Create: `src/pages/ManageUsers.tsx`
- Create: `src/pages/__tests__/ManageUsers.test.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `fetchProfiles`, `updateProfileRole`, `setProfileActive` from Task 5; `supabase.functions.invoke('invite-user', ...)` from Task 6; `RequireAdmin` from Task 5.

- [ ] **Step 1: Write the failing test**

```typescript
// src/pages/__tests__/ManageUsers.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ManageUsers } from '../ManageUsers';
import * as profilesApi from '../../api/profiles';
import { supabase } from '../../lib/supabaseClient';

vi.mock('../../lib/supabaseClient', () => ({
  supabase: { functions: { invoke: vi.fn() } },
}));

const profiles = [
  { id: 'u1', email: 'admin@oryxdoors.com', role: 'admin', active: true, created_at: '', updated_at: '' },
  { id: 'u2', email: 'viewer@oryxdoors.com', role: 'viewer', active: true, created_at: '', updated_at: '' },
];

beforeEach(() => {
  vi.spyOn(profilesApi, 'fetchProfiles').mockResolvedValue(profiles as never);
  vi.spyOn(profilesApi, 'updateProfileRole').mockResolvedValue(undefined);
  vi.spyOn(profilesApi, 'setProfileActive').mockResolvedValue(undefined);
});

describe('ManageUsers', () => {
  it('lists every user with their role and active status', async () => {
    render(<ManageUsers />);
    await waitFor(() => expect(screen.getByText('admin@oryxdoors.com')).toBeInTheDocument());
    expect(screen.getByText('viewer@oryxdoors.com')).toBeInTheDocument();
  });

  it('invites a new user via the Edge Function and refreshes the list', async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: { id: 'u3', email: 'new@oryxdoors.com', role: 'viewer' },
      error: null,
    } as never);

    render(<ManageUsers />);
    await waitFor(() => expect(screen.getByText('admin@oryxdoors.com')).toBeInTheDocument());

    await userEvent.type(screen.getByLabelText(/invite email/i), 'new@oryxdoors.com');
    await userEvent.click(screen.getByRole('button', { name: /send invite/i }));

    await waitFor(() =>
      expect(supabase.functions.invoke).toHaveBeenCalledWith('invite-user', {
        body: { email: 'new@oryxdoors.com', role: 'viewer' },
      })
    );
    expect(profilesApi.fetchProfiles).toHaveBeenCalledTimes(2);
  });

  it('deactivates a user on click', async () => {
    render(<ManageUsers />);
    await waitFor(() => expect(screen.getByText('viewer@oryxdoors.com')).toBeInTheDocument());

    const row = screen.getByText('viewer@oryxdoors.com').closest('tr')!;
    const { getByRole } = within(row);
    await userEvent.click(getByRole('button', { name: /deactivate/i }));

    expect(profilesApi.setProfileActive).toHaveBeenCalledWith('u2', false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/__tests__/ManageUsers.test.tsx`
Expected: FAIL with "Failed to resolve import ../ManageUsers"

- [ ] **Step 3: Write the Manage Users page**

```typescript
// src/pages/ManageUsers.tsx
import { useEffect, useState, type FormEvent } from 'react';
import { fetchProfiles, updateProfileRole, setProfileActive } from '../api/profiles';
import { supabase } from '../lib/supabaseClient';
import type { Profile } from '../types';

export function ManageUsers() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'viewer'>('viewer');
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);

  async function reload() {
    setProfiles(await fetchProfiles());
  }

  useEffect(() => {
    reload();
  }, []);

  async function handleInvite(e: FormEvent) {
    e.preventDefault();
    setInviting(true);
    setInviteError(null);
    const { error } = await supabase.functions.invoke('invite-user', {
      body: { email: inviteEmail, role: inviteRole },
    });
    setInviting(false);
    if (error) {
      setInviteError(error.message);
      return;
    }
    setInviteEmail('');
    await reload();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-oryx-blue mb-4">Manage Users</h1>

      <form onSubmit={handleInvite} className="flex items-end gap-3 mb-6">
        <div>
          <label htmlFor="invite-email" className="block text-sm text-oryx-silver mb-1">
            Invite email
          </label>
          <input
            id="invite-email"
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            required
            className="border border-oryx-silver rounded px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="invite-role" className="block text-sm text-oryx-silver mb-1">
            Role
          </label>
          <select
            id="invite-role"
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as 'admin' | 'viewer')}
            className="border border-oryx-silver rounded px-3 py-2"
          >
            <option value="viewer">Viewer</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={inviting}
          className="bg-oryx-blue text-white rounded px-4 py-2 disabled:opacity-50"
        >
          Send invite
        </button>
      </form>
      {inviteError && <p className="text-red-700 text-sm mb-4">{inviteError}</p>}

      <table className="w-full text-left">
        <thead>
          <tr className="text-sm text-oryx-silver border-b border-oryx-silver">
            <th className="py-2">Email</th>
            <th className="py-2">Role</th>
            <th className="py-2">Status</th>
            <th className="py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {profiles.map((p) => (
            <tr key={p.id} className="border-b border-oryx-silver">
              <td className="py-2">{p.email}</td>
              <td className="py-2">
                <select
                  value={p.role}
                  onChange={async (e) => {
                    await updateProfileRole(p.id, e.target.value as 'admin' | 'viewer');
                    await reload();
                  }}
                  className="border border-oryx-silver rounded px-2 py-1"
                >
                  <option value="viewer">Viewer</option>
                  <option value="admin">Admin</option>
                </select>
              </td>
              <td className="py-2">{p.active ? 'Active' : 'Inactive'}</td>
              <td className="py-2">
                <button
                  onClick={async () => {
                    await setProfileActive(p.id, !p.active);
                    await reload();
                  }}
                  className="underline text-oryx-blue"
                >
                  {p.active ? 'Deactivate' : 'Reactivate'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/__tests__/ManageUsers.test.tsx`
Expected: PASS

- [ ] **Step 5: Add the `/users` route, gated by RequireAdmin**

```typescript
// src/App.tsx — add these two lines
// 1. Add to the imports near the top:
import { RequireAdmin } from './components/RequireAdmin';
import { ManageUsers } from './pages/ManageUsers';

// 2. Add this route inside the existing <Routes> block, alongside
//    "/unassigned-expenses" and "/reports":
<Route
  path="/users"
  element={
    <RequireAdmin>
      <ManageUsers />
    </RequireAdmin>
  }
/>
```

- [ ] **Step 6: Run the full test suite**

Run: `npm test -- --run`
Expected: PASS — every test file, including all tests from Tasks 1–7.

- [ ] **Step 7: Commit**

```bash
git add src/pages/ManageUsers.tsx src/pages/__tests__/ManageUsers.test.tsx src/App.tsx
git commit -m "feat: add Manage Users admin page"
```

---

## Rollout (not a code task — do this once, after Task 7 ships)

Deploy the merged branch (RLS lockdown + login wall ship together, per the
spec's rollout section — there's no safe halfway state). Immediately after,
create the very first real Admin account directly via the Supabase
dashboard's Authentication panel (invite by email, or set a password), then
insert their matching `profiles` row:

```sql
insert into public.profiles (id, email, role, active)
values ('<their auth user id from the dashboard>', '<their email>', 'admin', true);
```

From then on, that Admin can invite everyone else through the in-app Manage
Users page — no further manual database steps needed.
