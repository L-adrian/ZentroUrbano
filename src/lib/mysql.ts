import "server-only";
import mysql from "mysql2/promise";

const globalForMysql = globalThis as typeof globalThis & {
  moradaMysqlPool?: mysql.Pool;
};

export type DbQueryValue = string | number | boolean | Date | null;

export function hasDatabaseConfig() {
  return Boolean(process.env.DATABASE_URL);
}

export function requiresDatabase() {
  return process.env.ZENTRO_REQUIRE_DATABASE === "1";
}

export async function withTransaction<T>(work: (connection: mysql.PoolConnection) => Promise<T>) {
  const pool = getDatabasePool();
  if (!pool) throw new Error("DATABASE_UNAVAILABLE");
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await work(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback().catch(() => undefined);
    throw error;
  } finally { connection.release(); }
}

export function getDatabasePool() {
  const uri = process.env.DATABASE_URL;

  if (!uri) {
    return null;
  }

  if (!globalForMysql.moradaMysqlPool) {
    globalForMysql.moradaMysqlPool = mysql.createPool({
      uri,
      connectionLimit: Math.max(1, Math.min(20, Number(process.env.MYSQL_CONNECTION_LIMIT) || 5)),
      connectTimeout: 8000,
      queueLimit: 50,
      namedPlaceholders: true,
      timezone: "Z",
    });
    // Driver parsing and server TIMESTAMP/session expiration must use the same zone.
    globalForMysql.moradaMysqlPool.on("connection", connection => {
      connection.query("SET time_zone = '+00:00'");
    });
  }

  return globalForMysql.moradaMysqlPool;
}

export async function queryRows<T>(sql: string, values: Record<string, DbQueryValue> = {}) {
  const pool = getDatabasePool();

  if (!pool) {
    return null;
  }

  const [rows] = await pool.execute(sql, values);
  return rows as T[];
}

export async function queryOne<T>(sql: string, values: Record<string, DbQueryValue> = {}) {
  const rows = await queryRows<T>(sql, values);
  return rows?.[0] ?? null;
}

export async function executeQuery(sql: string, values: Record<string, DbQueryValue> = {}) {
  const pool = getDatabasePool();

  if (!pool) {
    return null;
  }

  const [result] = await pool.execute(sql, values);
  return result;
}
