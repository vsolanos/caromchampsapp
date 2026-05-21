import React, { useEffect, useState } from 'react';
import { E, Button, Card, Field, Input, Select, Badge } from './ui.js';
import { COUNTRIES, countryByIso, normalizePhone, validatePhoneByCountry } from '../lib/countries.js';
import { auditCloudEvent, ensureUserProfile, isAdminEmail, supabase } from '../lib/supabase.js';

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;


function withLocalTimeout(promise, ms = 6000, label = 'Operación') {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} excedió el tiempo de espera.`)), ms))
  ]);
}

function initialForm() {
  return { full_name: '', email: '', password: '', country_iso: 'CR', phone_local: '', avatar_file: null };
}

function authErrorMessage(error) {
  if (!error) return '';
  const msg = error.message || String(error);
  if (/Invalid login credentials/i.test(msg)) return 'Credenciales inválidas. Revise el correo y la contraseña.';
  if (/Email not confirmed/i.test(msg)) return 'Debe confirmar su correo electrónico antes de ingresar.';
  return msg;
}

async function uploadAvatar(userId, file) {
  if (!userId || !file) return { url: '', error: null };
  if (file.size > MAX_AVATAR_BYTES) return { url: '', error: new Error('La foto no puede superar 5 MB.') };
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `${userId}/avatar-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('user-avatars').upload(path, file, { upsert: true });
  if (error) return { url: '', error };
  const { data } = supabase.storage.from('user-avatars').getPublicUrl(path);
  return { url: data?.publicUrl || '', error: null };
}

function LandingHeader() {
  return E('div', { className: 'auth-hero-copy' },
    E('div', { className: 'auth-logo-mark premium' }, 'C'),
    E('h1', null, 'CAROM', E('br'), 'CHAMPS'),
    E('p', null, '3-Cushion Billiards Management Platform'),
    E('div', { className: 'auth-feature-list' },
      [['🏆', 'Torneos'], ['👥', 'Jugadores'], ['📅', 'Calendarios'], ['📊', 'Resultados'], ['🛡️', 'Rankings'], ['💬', 'Comunidad']].map(([icon, label]) => E('div', { className: 'auth-feature-item', key: label }, E('span', null, icon), E('b', null, label)))
    ),
    E('div', { className: 'auth-hero-tagline' }, 'Administre. Compita. ', E('b', null, 'Gane.'))
  );
}

export function AuthGate({ render }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState(initialForm());
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const selectedCountry = countryByIso(form.country_iso);
  const phoneValidation = validatePhoneByCountry(form.country_iso, form.phone_local);

  useEffect(() => {
    let active = true;
    const fallbackProfile = (user) => user ? {
      email: user.email,
      full_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email,
      country_iso: user.user_metadata?.country_iso || 'CR',
      phone_country_code: user.user_metadata?.phone_country_code || '+506',
      phone_local: user.user_metadata?.phone_local || '',
      avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || '',
      role: isAdminEmail(user.email) ? 'ADMIN' : 'ORGANIZER',
      status: 'ACTIVE'
    } : null;

    const hydrateProfile = async (user) => {
      if (!user) return;
      setProfile(fallbackProfile(user));
      const { profile: savedProfile } = await ensureUserProfile(user);
      if (active && savedProfile) setProfile(savedProfile);
    };

    withLocalTimeout(supabase.auth.getSession(), 6000, 'Lectura de sesión').then(({ data }) => {
      if (!active) return;
      const nextSession = data.session || null;
      setSession(nextSession);
      setLoading(false);
      if (nextSession?.user) hydrateProfile(nextSession.user);
    }).catch((error) => {
      console.warn('No fue posible leer sesión Supabase. Se libera la pantalla de inicio para evitar bloqueo tras refrescar.', error);
      if (active) {
        setSession(null);
        setProfile(null);
        setLoading(false);
        setMessage('No fue posible validar la sesión automáticamente. Inicie sesión nuevamente si es necesario.');
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession || null);
      setLoading(false);
      if (nextSession?.user) hydrateProfile(nextSession.user);
      else setProfile(null);
    });
    return () => { active = false; sub?.subscription?.unsubscribe?.(); };
  }, []);

  const patch = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const signIn = async () => {
    setBusy(true); setMessage('');
    const { error } = await withLocalTimeout(supabase.auth.signInWithPassword({ email: form.email.trim().toLowerCase(), password: form.password }), 10000, 'Inicio de sesión');
    if (error) setMessage(authErrorMessage(error));
    else await auditCloudEvent(session?.user?.id, 'LOGIN', 'Inicio de sesión por correo.');
    setBusy(false);
  };

  const signUp = async () => {
    setBusy(true); setMessage('');
    const phone = validatePhoneByCountry(form.country_iso, form.phone_local);
    if (!form.full_name.trim()) { setMessage('Digite su nombre completo.'); setBusy(false); return; }
    if (!phone.valid) { setMessage(phone.message); setBusy(false); return; }
    const metadata = {
      full_name: form.full_name.trim(),
      country_iso: form.country_iso,
      phone_country_code: phone.country.dial,
      phone_local: phone.local,
      phone_e164: phone.e164
    };
    const { data, error } = await withLocalTimeout(supabase.auth.signUp({
      email: form.email.trim().toLowerCase(),
      password: form.password,
      options: { data: metadata, emailRedirectTo: window.location.origin }
    }), 12000, 'Registro de usuario');
    if (error) setMessage(authErrorMessage(error));
    else if (data.session?.user) {
      let avatar_url = '';
      if (form.avatar_file) {
        const uploaded = await uploadAvatar(data.session.user.id, form.avatar_file);
        if (uploaded.error) setMessage(uploaded.error.message);
        avatar_url = uploaded.url;
      }
      const { profile: savedProfile } = await ensureUserProfile(data.session.user, { ...metadata, avatar_url });
      setProfile(savedProfile || null);
      setMessage('Cuenta creada correctamente.');
    } else {
      setMessage('Revise su correo y confirme la cuenta para poder ingresar.');
    }
    setBusy(false);
  };

  const socialLogin = async (provider) => {
    setBusy(true); setMessage('');
    const { error } = await withLocalTimeout(supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin }
    }), 10000, 'Login social');
    if (error) setMessage(authErrorMessage(error));
    setBusy(false);
  };

  const resetPassword = async () => {
    setBusy(true); setMessage('');
    const { error } = await supabase.auth.resetPasswordForEmail(form.email.trim().toLowerCase(), { redirectTo: window.location.origin });
    setMessage(error ? authErrorMessage(error) : 'Si el correo existe, recibirá instrucciones para restablecer su contraseña.');
    setBusy(false);
  };

  const signOut = async () => {
    await auditCloudEvent(session?.user?.id, 'LOGOUT', 'Cierre de sesión.');
    await supabase.auth.signOut();
  };

  if (loading) return E('div', { className: 'auth-page' }, E(Card, { className: 'auth-card' }, E('h2', null, 'Cargando CaromChamps...')));

  if (session?.user) {
    const effectiveProfile = profile || { email: session.user.email, full_name: session.user.email, role: isAdminEmail(session.user.email) ? 'ADMIN' : 'ORGANIZER', status: 'ACTIVE' };
    return render({ session, user: session.user, profile: effectiveProfile, signOut, updateProfile: setProfile });
  }

  const formTitle = mode === 'signup' ? 'Crear cuenta' : 'Welcome Back';
  const formSubtitle = mode === 'signup' ? 'Registre su perfil para usar CaromChamps' : 'Access the CaromChamps platform';

  return E('div', { className: 'auth-page auth-page-premium' },
    E('section', { className: 'auth-shell-premium' },
      E('div', { className: 'auth-left-panel' },
        E('img', { className: 'auth-left-image', src: '/assets/auth-hero-caromchamps.png', alt: 'CaromChamps billiards access' }),
        E('div', { className: 'auth-left-overlay' }),
        E(LandingHeader)
      ),
      E('div', { className: 'auth-right-panel' },
        E('div', { className: 'auth-security-icon' }, '🔒'),
        E('h2', null, formTitle),
        E('p', { className: 'auth-subtitle' }, formSubtitle),
        E('div', { className: 'auth-tabs premium-tabs' },
          E(Button, { kind: mode === 'login' ? 'primary' : 'soft', onClick: () => setMode('login') }, 'Iniciar sesión'),
          E(Button, { kind: mode === 'signup' ? 'primary' : 'soft', onClick: () => setMode('signup') }, 'Crear cuenta')
        ),
        mode === 'signup' ? E('div', { className: 'grid auth-form-grid', style: { marginTop: 12 } },
          E(Field, { label: 'Nombre completo' }, E(Input, { value: form.full_name, onChange: (e) => patch('full_name', e.target.value), placeholder: 'Nombre y apellidos' })),
          E(Field, { label: 'Correo / Usuario' }, E(Input, { type: 'email', value: form.email, onChange: (e) => patch('email', e.target.value), placeholder: 'correo@dominio.com' })),
          E(Field, { label: 'Contraseña' }, E(Input, { type: 'password', value: form.password, onChange: (e) => patch('password', e.target.value), placeholder: 'Contraseña segura' })),
          E('div', { className: 'grid grid-2' },
            E(Field, { label: 'País' }, E(Select, { value: form.country_iso, onChange: (e) => patch('country_iso', e.target.value) }, COUNTRIES.map((country) => E('option', { key: country.iso, value: country.iso }, `${country.name} (${country.dial})`)))),
            E(Field, { label: `Teléfono ${selectedCountry.dial}`, hint: selectedCountry.hint }, E(Input, { value: form.phone_local, onChange: (e) => patch('phone_local', normalizePhone(e.target.value)), placeholder: selectedCountry.hint }))
          ),
          E(Field, { label: 'Foto de perfil opcional', hint: 'JPG, PNG o WEBP. Máximo 5 MB.' }, E(Input, { type: 'file', accept: 'image/png,image/jpeg,image/webp', onChange: (e) => patch('avatar_file', e.target.files?.[0] || null) })),
          form.phone_local && !phoneValidation.valid ? E('div', { className: 'auth-error' }, phoneValidation.message) : null,
          E(Button, { onClick: signUp, disabled: busy, kind: 'success' }, busy ? 'Creando...' : 'Crear cuenta y confirmar correo')
        ) : E('div', { className: 'grid auth-form-grid', style: { marginTop: 12 } },
          E(Field, { label: 'Email' }, E(Input, { type: 'email', value: form.email, onChange: (e) => patch('email', e.target.value), placeholder: 'you@example.com' })),
          E(Field, { label: 'Password' }, E(Input, { type: 'password', value: form.password, onChange: (e) => patch('password', e.target.value), placeholder: 'Enter your password' })),
          E('div', { className: 'auth-login-options' }, E('label', null, E('input', { type: 'checkbox', defaultChecked: true }), ' Recordarme'), E('button', { type: 'button', onClick: resetPassword }, '¿Olvidó su contraseña?')),
          E(Button, { onClick: signIn, disabled: busy, kind: 'success' }, busy ? 'Ingresando...' : 'LOGIN →')
        ),
        E('div', { className: 'auth-separator' }, 'OR'),
        E('div', { className: 'auth-socials-premium' },
          E(Button, { onClick: () => socialLogin('google'), disabled: busy, kind: 'soft' }, '🌐 Continuar con Google'),
          E(Button, { onClick: () => socialLogin('facebook'), disabled: busy, kind: 'soft' }, '🔵 Continuar con Facebook')
        ),
        mode === 'login'
          ? E('p', { className: 'auth-switch-note' }, '¿No tiene cuenta? ', E('button', { type: 'button', onClick: () => setMode('signup') }, 'Crear cuenta'))
          : E('p', { className: 'auth-switch-note' }, '¿Ya tiene cuenta? ', E('button', { type: 'button', onClick: () => setMode('login') }, 'Iniciar sesión')),
        message ? E('div', { className: /correctamente|Revise|recibirá/i.test(message) ? 'auth-message' : 'auth-error' }, message) : null,
        E('div', { className: 'auth-note' },
          E(Badge, { kind: 'info' }, 'Usuarios activos'),
          E('span', null, 'Para ver campeonatos compartidos por link debe iniciar sesión o crear una cuenta activa.')
        )
      )
    )
  );
}
