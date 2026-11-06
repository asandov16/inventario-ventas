import { toAppError } from './errors';
import { supabase, type RpcArgs, type RpcName } from './supabaseClient';

/**
 * Calls a public RPC and returns its raw JSON, or throws an AppError.
 * Feature repositories parse the result with Zod into domain models.
 */
export async function callRpc<Name extends RpcName>(
  name: Name,
  args: RpcArgs<Name>,
): Promise<unknown> {
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw toAppError(error);
  return data;
}

/** Statuses every create/update RPC can answer with (CLAUDE.md, RPC checklist). */
export type RpcStatus = 'ok' | 'replay' | 'possible_duplicate' | 'similar' | 'exists';

export interface RpcResponse {
  status: RpcStatus;
}
