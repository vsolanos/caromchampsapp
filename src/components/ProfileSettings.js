import { useState } from 'react';
import { E, Card, Button, Field, Input, Select, SectionTitle, Badge } from './ui.js';
import { COUNTRIES, countryByIso, normalizePhone, validatePhoneByCountry } from '../lib/countries.js';
import { auditCloudEvent, ensureUserProfile, supabase } from '../lib/supabase.js';

export function ProfileSettings({ auth, onProfileUpdated }) {
  const profile = auth?.profile || {};
  const [draft, setDraft] = useState({
    full_name: profile.full_name || '',
    email: profile.email || auth?.user?.email || '',
    country_iso: profile.country_iso || 'CR',
    phone_local: profile.phone_local || '',
    avatar_file: null,
    avatar_url: profile.avatar_url || ''
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const country = countryByIso(draft.country_iso);
  const phone = validatePhoneByCountry(draft.country_iso, draft.phone_local);
  const patch = (key, value) => setDraft((prev) => ({ ...prev, [key]: value }));

  const saveProfile = async () => {
    setBusy(true); setMessage('');
    if (!draft.full_name.trim()) { setMessage('Digite el nombre completo.'); setBusy(false); return; }
    if (!phone.valid) { setMessage(phone.message); setBusy(false); return; }
    let avatar_url = draft.avatar_url || '';
    if (draft.avatar_file) {
      if (!/^image\/(jpeg|png|webp)$/.test(draft.avatar_file.type || '')) { setMessage('La foto debe ser JPG, PNG o WEBP.'); setBusy(false); return; }
      if (draft.avatar_file.size > 5 * 1024 * 1024) { setMessage('La foto no puede superar 5 MB.'); setBusy(false); return; }
      const ext = (draft.avatar_file.name.split('.').pop() || 'jpg').toLowerCase();
      const path = `${auth.user.id}/profile-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('user-avatars').upload(path, draft.avatar_file, { upsert: true, contentType: draft.avatar_file.type });
      if (error) { setMessage(`No fue posible subir la foto: ${error.message}`); setBusy(false); return; }
      const { data } = supabase.storage.from('user-avatars').getPublicUrl(path);
      avatar_url = data?.publicUrl || '';
    }
    const metadata = {
      full_name: draft.full_name.trim(),
      country_iso: draft.country_iso,
      phone_country_code: phone.country.dial,
      phone_local: phone.local,
      phone_e164: phone.e164,
      avatar_url
    };
    const { profile: savedProfile, error } = await ensureUserProfile(auth.user, metadata);
    if (error) setMessage(error.message);
    else {
      await auditCloudEvent(auth.user.id, 'PROFILE_UPDATED', 'Perfil actualizado desde la plataforma.');
      onProfileUpdated?.(savedProfile);
      setMessage('Perfil actualizado correctamente.');
      setDraft((prev) => ({ ...prev, avatar_url, avatar_file: null }));
    }
    setBusy(false);
  };

  return E('div', { className: 'grid' },
    E(Card, { className: 'profile-settings-card' },
      E(SectionTitle, { title: 'Ajustes de perfil', subtitle: 'Actualice sus datos de contacto, país, teléfono y foto de perfil.' }),
      E('div', { className: 'profile-settings-layout' },
        E('div', { className: 'profile-avatar-preview' },
          draft.avatar_url ? E('img', { src: draft.avatar_url, alt: draft.full_name || 'Perfil' }) : E('span', null, (draft.full_name || draft.email || 'CC').slice(0, 2).toUpperCase()),
          E(Badge, { kind: 'info' }, profile.role || 'ORGANIZER'),
          E('p', { className: 'small' }, profile.status || 'ACTIVE')
        ),
        E('div', { className: 'grid grid-2' },
          E(Field, { label: 'Nombre completo' }, E(Input, { value: draft.full_name, onChange: (e) => patch('full_name', e.target.value) })),
          E(Field, { label: 'Correo / Usuario' }, E(Input, { value: draft.email, disabled: true })),
          E(Field, { label: 'País' }, E(Select, { value: draft.country_iso, onChange: (e) => patch('country_iso', e.target.value) }, COUNTRIES.map((item) => E('option', { key: item.iso, value: item.iso }, `${item.name} (${item.dial})`)))),
          E(Field, { label: `Teléfono ${country.dial}`, hint: country.hint }, E(Input, { value: draft.phone_local, onChange: (e) => patch('phone_local', normalizePhone(e.target.value)), placeholder: country.hint })),
          E(Field, { label: 'Foto de perfil', hint: 'JPG, PNG o WEBP. Máximo 5 MB.' }, E(Input, { type: 'file', accept: 'image/png,image/jpeg,image/webp', onChange: (e) => patch('avatar_file', e.target.files?.[0] || null) }))
        )
      ),
      message ? E('div', { className: /correctamente/i.test(message) ? 'auth-message' : 'auth-error' }, message) : null,
      E('div', { className: 'toolbar', style: { marginTop: 16 } },
        E(Button, { onClick: saveProfile, disabled: busy, kind: 'success' }, busy ? 'Guardando...' : 'Guardar perfil'),
        E(Button, { onClick: auth?.signOut, kind: 'danger' }, 'Cerrar sesión')
      )
    )
  );
}
