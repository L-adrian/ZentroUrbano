import { loadLocalEnv } from "./env";
loadLocalEnv();
console.log(JSON.stringify({
  site: process.env.NEXT_PUBLIC_SITE_URL,
  callback: process.env.GOOGLE_REDIRECT_URI,
  googleClientConfigured: Boolean(process.env.GOOGLE_CLIENT_ID?.trim()),
  googleSecretConfigured: Boolean(process.env.GOOGLE_CLIENT_SECRET?.trim()),
  databaseConfigured: Boolean(process.env.DATABASE_URL?.trim()),
  persistentStorageConfigured: Boolean(process.env.ZENTRO_STORAGE_DIR?.trim()),
}, null, 2));
