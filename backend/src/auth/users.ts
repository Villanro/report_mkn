import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import bcrypt from "bcrypt";

/**
 * Usuario simple (usuario/contraseña con hash bcrypt). `districts`/`stores` quedan
 * preparados para la restricción por distrito/tienda mencionada en la spec como trabajo
 * futuro; hoy no se aplican todavía en las rutas.
 */
export interface User {
  username: string;
  passwordHash: string;
  districts?: string[];
  stores?: string[];
}

const USERS_FILE = fileURLToPath(new URL("./users.json", import.meta.url));

let cachedUsers: User[] | undefined;

function loadUsers(): User[] {
  if (cachedUsers) return cachedUsers;
  try {
    const raw = readFileSync(USERS_FILE, "utf-8");
    cachedUsers = JSON.parse(raw) as User[];
  } catch {
    console.warn(
      `[auth] No se encontró ${USERS_FILE}. Copia backend/src/auth/users.example.json a users.json ` +
        "y genera un hash con `npx tsx backend/scripts/hashPassword.ts <password>`.",
    );
    cachedUsers = [];
  }
  return cachedUsers;
}

export async function verifyCredentials(username: string, password: string): Promise<User | undefined> {
  const user = loadUsers().find((u) => u.username === username);
  if (!user) return undefined;
  const ok = await bcrypt.compare(password, user.passwordHash);
  return ok ? user : undefined;
}
