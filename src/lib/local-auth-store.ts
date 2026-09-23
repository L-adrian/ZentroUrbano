import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { persistentStorageRoot } from "@/lib/storage";
import type { DemoAccountKind } from "@/lib/demo-accounts";

export type LocalAuthAccount = {
  id: string;
  kind: DemoAccountKind;
  displayName: string;
  companyName: string | null;
  email: string;
  phone: string;
  avatarInitials: string;
  avatarUrl: string | null;
  roleLabel: string;
  location: string;
};

export type LocalAuthUser = {
  id: string;
  accountId: string;
  email: string;
  passwordHash: string | null;
  authProvider: "email" | "google";
  providerSubject: string | null;
  status: "active" | "disabled";
};

type LocalAuthSession = {
  id: string;
  userId: string;
  accountId: string;
  tokenHash: string;
  expiresAt: string;
};

type LocalAuthDatabase = {
  version: 1;
  accounts: LocalAuthAccount[];
  users: LocalAuthUser[];
  sessions: LocalAuthSession[];
};

const storageDirectory = path.join(persistentStorageRoot, "auth");
const storagePath = path.join(storageDirectory, "accounts.json");
const globalForLocalAuth = globalThis as typeof globalThis & {
  zentroLocalAuthQueue?: Promise<void>;
};

export async function findLocalUserByEmail(email: string) {
  const database = await readDatabase();
  return database.users.find((user) => user.email === email) ?? null;
}

export async function findLocalAccountById(accountId: string) {
  const database = await readDatabase();
  return database.accounts.find((account) => account.id === accountId) ?? null;
}

export async function getLocalAccountBySessionHash(tokenHash: string) {
  const database = await readDatabase();
  const now = Date.now();
  const session = database.sessions.find(
    (candidate) => candidate.tokenHash === tokenHash && new Date(candidate.expiresAt).getTime() > now,
  );

  if (!session) {
    return null;
  }

  const user = database.users.find(
    (candidate) => candidate.id === session.userId && candidate.status === "active",
  );
  const account = database.accounts.find((candidate) => candidate.id === session.accountId);

  return user && account ? account : null;
}

export async function createLocalPasswordAccount(input: {
  account: LocalAuthAccount;
  user: LocalAuthUser;
}) {
  return withWriteLock(async () => {
    const database = await readDatabase();

    if (database.users.some((user) => user.email === input.user.email)) {
      return false;
    }

    database.accounts.push(input.account);
    database.users.push(input.user);
    pruneExpiredSessions(database);
    await writeDatabase(database);
    return true;
  });
}

export async function upsertLocalGoogleAccount(input: {
  account: LocalAuthAccount;
  user: LocalAuthUser;
}) {
  return withWriteLock(async () => {
    const database = await readDatabase();
    const existingUser = database.users.find((user) => user.email === input.user.email);

    if (existingUser) {
      if (existingUser.status !== "active" || (existingUser.providerSubject && existingUser.providerSubject !== input.user.providerSubject)) {
        throw new Error("Google account is disabled or has a different provider identity");
      }
      existingUser.authProvider = "google";
      existingUser.providerSubject = input.user.providerSubject;
      const existingAccount = database.accounts.find(
        (account) => account.id === existingUser.accountId,
      );
      if (existingAccount && input.account.avatarUrl) {
        existingAccount.avatarUrl = input.account.avatarUrl;
      }
      pruneExpiredSessions(database);
      await writeDatabase(database);
      return { user: existingUser, accountId: existingUser.accountId };
    }

    database.accounts.push(input.account);
    database.users.push(input.user);
    pruneExpiredSessions(database);
    await writeDatabase(database);
    return { user: input.user, accountId: input.account.id };
  });
}

export async function createLocalSession(input: {
  userId: string;
  accountId: string;
  tokenHash: string;
  expiresAt: Date;
}) {
  await withWriteLock(async () => {
    const database = await readDatabase();
    pruneExpiredSessions(database);
    database.sessions.push({
      id: `sess_local_${randomUUID().replaceAll("-", "").slice(0, 20)}`,
      userId: input.userId,
      accountId: input.accountId,
      tokenHash: input.tokenHash,
      expiresAt: input.expiresAt.toISOString(),
    });
    await writeDatabase(database);
  });
}

export async function deleteLocalSession(tokenHash: string) {
  await withWriteLock(async () => {
    const database = await readDatabase();
    database.sessions = database.sessions.filter((session) => session.tokenHash !== tokenHash);
    pruneExpiredSessions(database);
    await writeDatabase(database);
  });
}

async function readDatabase(): Promise<LocalAuthDatabase> {
  try {
    const raw = await readFile(storagePath, "utf8");
    const parsed = JSON.parse(raw) as Partial<LocalAuthDatabase>;

    if (!Array.isArray(parsed.accounts) || !Array.isArray(parsed.users) || !Array.isArray(parsed.sessions)) {
      throw new Error("El archivo local de autenticación tiene una estructura inválida.");
    }

    return {
      version: 1,
      accounts: parsed.accounts,
      users: parsed.users,
      sessions: parsed.sessions,
    };
  } catch (error) {
    if (isMissingFileError(error)) {
      return emptyDatabase();
    }
    throw error;
  }
}

async function writeDatabase(database: LocalAuthDatabase) {
  await mkdir(storageDirectory, { recursive: true });
  const temporaryPath = `${storagePath}.${process.pid}.${randomUUID()}.tmp`;
  await writeFile(temporaryPath, JSON.stringify(database, null, 2), {
    encoding: "utf8",
    flag: "wx",
  });
  await rename(temporaryPath, storagePath);
}

function withWriteLock<T>(operation: () => Promise<T>) {
  const previous = globalForLocalAuth.zentroLocalAuthQueue ?? Promise.resolve();
  const result = previous.catch(() => undefined).then(operation);
  globalForLocalAuth.zentroLocalAuthQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

function pruneExpiredSessions(database: LocalAuthDatabase) {
  const now = Date.now();
  database.sessions = database.sessions.filter(
    (session) => new Date(session.expiresAt).getTime() > now,
  );
}

function emptyDatabase(): LocalAuthDatabase {
  return { version: 1, accounts: [], users: [], sessions: [] };
}

function isMissingFileError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}
