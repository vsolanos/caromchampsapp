import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://vmcbaexkbenbesygxccu.supabase.co';
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_BWGED1ADRTDK0paUbTTvGw_xCospIjZ';
export const ADMIN_EMAIL = 'vsolanos@gmail.com';
export const APP_ORIGIN = typeof window !== 'undefined' ? window.location.origin : 'https://caromchamps.com';

function withTimeout(promise, label = 'Operación Supabase', ms = 8000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} excedió el tiempo de espera.`)), ms))
  ]);
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

export function isAdminEmail(email = '') {
  return String(email || '').trim().toLowerCase() === ADMIN_EMAIL;
}

export function safeProfileRole(profile, user) {
  if (profile?.role) return profile.role;
  return isAdminEmail(user?.email) ? 'ADMIN' : 'ORGANIZER';
}

export async function ensureUserProfile(user, metadata = {}) {
  if (!user?.id) return { profile: null, error: null };
  const email = String(user.email || '').toLowerCase();
  const payload = {
    id: user.id,
    email,
    full_name: metadata.full_name || user.user_metadata?.full_name || user.user_metadata?.name || email,
    country_iso: metadata.country_iso || user.user_metadata?.country_iso || 'CR',
    phone_country_code: metadata.phone_country_code || user.user_metadata?.phone_country_code || '+506',
    phone_local: metadata.phone_local || user.user_metadata?.phone_local || '',
    avatar_url: metadata.avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture || '',
    role: isAdminEmail(email) ? 'ADMIN' : 'ORGANIZER',
    status: 'ACTIVE',
    updated_at: new Date().toISOString()
  };
  try {
    const { data, error } = await withTimeout(
      supabase.from('profiles').upsert(payload, { onConflict: 'id' }).select().single(),
      'Carga/creación de perfil'
    );
    if (error) return { profile: { ...payload }, error };
    return { profile: data || { ...payload }, error: null };
  } catch (error) {
    console.warn('No fue posible sincronizar el perfil en Supabase; se usará perfil local de sesión.', error);
    return { profile: { ...payload }, error };
  }
}

export async function loadUserAppState(userId) {
  if (!userId) return { state: null, error: null };
  try {
    const { data, error } = await withTimeout(
      supabase.from('user_app_states').select('state, updated_at').eq('owner_user_id', userId).maybeSingle(),
      'Carga de estado de usuario'
    );
    return { state: data?.state || null, updated_at: data?.updated_at || null, error };
  } catch (error) {
    console.warn('No fue posible cargar estado remoto; se usará estado local.', error);
    return { state: null, error };
  }
}

export async function saveUserAppState(userId, state) {
  if (!userId) return { error: null };
  try {
    const { error } = await withTimeout(
      supabase.from('user_app_states').upsert({ owner_user_id: userId, state, updated_at: new Date().toISOString() }, { onConflict: 'owner_user_id' }),
      'Guardado de estado de usuario'
    );
    return { error };
  } catch (error) {
    console.warn('No fue posible guardar estado remoto; se conserva estado local.', error);
    return { error };
  }
}

export async function createChampionshipShare({ userId, championshipSnapshot }) {
  const token = crypto?.randomUUID ? crypto.randomUUID() : `share-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const { data, error } = await supabase
    .from('championship_shares')
    .insert({
      token,
      owner_user_id: userId,
      championship_id: championshipSnapshot?.id || championshipSnapshot?.championship?.championship_id || '',
      championship_name: championshipSnapshot?.name || championshipSnapshot?.championship?.name || 'Campeonato compartido',
      snapshot: championshipSnapshot,
      access_mode: 'ACTIVE_USERS_WITH_LINK',
      is_active: true
    })
    .select()
    .single();
  return { data, error };
}

export async function getChampionshipShare(token) {
  const { data, error } = await supabase
    .from('championship_shares')
    .select('*')
    .eq('token', token)
    .eq('is_active', true)
    .maybeSingle();
  return { data, error };
}

export async function auditCloudEvent(userId, type, detail) {
  if (!userId) return;
  try {
    await withTimeout(supabase.from('audit_logs').insert({ user_id: userId, type, detail }), 'Auditoría', 5000);
  } catch (error) {
    console.warn('No fue posible registrar auditoría remota.', error);
  }
}
