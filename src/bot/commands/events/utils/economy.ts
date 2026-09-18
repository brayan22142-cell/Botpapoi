import { economyStore, type EconomyState } from "./data.js";

export async function getEconomy(guildId: string): Promise<EconomyState> {
  const raw: EconomyState =
    (await economyStore.read(guildId)) ?? {
      balances: {},
      lastDaily: {},
      lastWork: {},
      inventory: {},
    };
  raw.balances ??= {};
  raw.lastDaily ??= {};
  raw.lastWork ??= {};
  raw.inventory ??= {};
  return raw;
}

export function saveEconomy(guildId: string, state: EconomyState): Promise<void> {
  return economyStore.write(guildId, state);
}

export async function getBalance(guildId: string, userId: string): Promise<number> {
  const st = await getEconomy(guildId);
  return st.balances[userId] ?? 0;
}

export async function addBalance(
  guildId: string,
  userId: string,
  amount: number,
): Promise<number> {
  const st = await getEconomy(guildId);
  const next = Math.max(0, (st.balances[userId] ?? 0) + amount);
  st.balances[userId] = next;
  await saveEconomy(guildId, st);
  return next;
}

export async function transferBalance(
  guildId: string,
  from: string,
  to: string,
  amount: number,
): Promise<{ ok: boolean; reason?: "insufficient"; fromBalance?: number; toBalance?: number }> {
  const st = await getEconomy(guildId);
  const fromBal = st.balances[from] ?? 0;
  if (fromBal < amount) {
    return { ok: false, reason: "insufficient", fromBalance: fromBal };
  }
  st.balances[from] = fromBal - amount;
  st.balances[to] = (st.balances[to] ?? 0) + amount;
  await saveEconomy(guildId, st);
  return { ok: true, fromBalance: st.balances[from], toBalance: st.balances[to] };
}

export async function addInventoryItem(
  guildId: string,
  userId: string,
  itemId: string,
  qty: number,
): Promise<void> {
  const st = await getEconomy(guildId);
  st.inventory[userId] ??= {};
  st.inventory[userId][itemId] = (st.inventory[userId][itemId] ?? 0) + qty;
  await saveEconomy(guildId, st);
}

export async function getInventory(
  guildId: string,
  userId: string,
): Promise<Record<string, number>> {
  const st = await getEconomy(guildId);
  return st.inventory[userId] ?? {};
}
