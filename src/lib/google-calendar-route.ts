import "server-only";
import { editableOwner } from "@/lib/account-profile";
import { getAgentLogin } from "@/lib/crm";
import { getCurrentAccount } from "@/lib/mysql-auth";

// Who connects a Google Calendar: an owner or agency with a database account, or an agent with
// their own user. The calendar belongs to the signed-in account.
export async function calendarOwnerId() {
  const owner = await editableOwner();
  if (owner) return owner.id;
  const account = await getCurrentAccount();
  if (account?.kind === "agente" && account.storage === "mysql" && (await getAgentLogin(account.id))) return account.id;
  return null;
}
