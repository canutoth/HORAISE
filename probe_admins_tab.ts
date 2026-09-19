import { getAdminEmailsFromAdminsEmailTab } from "./src/server/sheets";
const got = await getAdminEmailsFromAdminsEmailTab();
const r = Array.isArray(got) ? got : (got as any)?.emails;
console.log("PROBE_ADMINS_TAB_RETURN=" + JSON.stringify(r));
