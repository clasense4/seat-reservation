import postgres from "postgres";
import { config } from "./config";

let sql: postgres.Sql<{}> | null = null;

export function getDb(): postgres.Sql<{}> {
  if (!sql) {
    sql = postgres(config.databaseUrl);
  }
  return sql;
}
