import React, { useEffect, useRef, useState } from 'react';
import appPackage from '../package.json';
import { E, Card, Button, Badge, Stat, SectionTitle, EmptyState } from './components/ui.js';
import { PlayerHistoryModal } from './components/PlayerHistory.js';
import { AuthGate } from './components/AuthGate.js';
import { SharedChampionshipView } from './components/SharedView.js';
import { ProfileSettings } from './components/ProfileSettings.js';
import { createChampionshipShare, loadUserAppState, saveUserAppState } from './lib/supabase.js';
import { DEFAULT_CHAMPIONSHIP, DEFAULT_PLAYERS, STORAGE_KEY } from './data/defaults.js';
import { autoFillMatches, clearResults, generateFullKnockoutDemo, generateGroups, generateRoundRobinMatches, groupStandings, qualify, scheduleMatches, uid, getEligiblePlayers, makeChampionshipSnapshot, formatDateTimeEs, formatDateEs, usesAverageControl, matchCode, matchDetailedScore, matchDisplayStatus, matchPlayerStats, matchRoundLabel, playerName, roundDisplayName, fmtAvg, calculateTotalQualifiers, num } from './lib/tournament.js';
import { ChampionshipsModule } from './modules/Championships.js';
import { PlayersModule } from './modules/Players.js';
import { SetupModule } from './modules/Setup.js';
import { GroupsModule } from './modules/Groups.js';
import { CaptureModule } from './modules/Capture.js';
import { ScheduleModule } from './modules/Schedule.js';
import { BracketModule } from './modules/Bracket.js';
import { ReportsModule } from './modules/Reports.js';
import { MaintenanceModule } from './modules/Maintenance.js';
import { ConfigurationModule } from './modules/Configuration.js';
import { OfficialsModule } from './modules/Officials.js';
import { CloseTournamentModule } from './modules/CloseTournament.js';
import { AuditModule } from './modules/Audit.js';
import { RankingModule } from './modules/Ranking.js';

function loadState(storageKey = STORAGE_KEY, fallbackKey = '') {
  try {
    const raw = localStorage.getItem(storageKey) || (fallbackKey ? localStorage.getItem(fallbackKey) : '');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function userStorageKey(user) {
  return `${STORAGE_KEY}::user::${user?.id || 'anonymous'}`;
}

function sharedTokenFromLocation() {
  const match = window.location.pathname.match(/\/shared\/championship\/([^/]+)/i);
  return match?.[1] || '';
}

const RANKING_BLOCKED_TABS = new Set(['groups', 'schedule', 'matches', 'ko', 'reports', 'officials', 'close']);
const UX_MODE_KEY = 'caromchamps::ux_mode::v6_0';
const UI_THEME_KEY = 'caromchamps::ui_theme::v6_2';

const NAV_TABS = [
  ['championships', 'Campeonatos', '🏆'], ['dashboard', 'Dashboard', '⌂'], ['players', 'Jugadores', '👤'], ['setup', 'Campeonato', '⚙'], ['groups', 'Grupos', '▦'],
  ['schedule', 'Calendario', '📅'], ['matches', 'Partidas', '●'], ['ko', 'Llaves', '⑂'], ['reports', 'Reportes', '▤'], ['ranking', 'Ranking', '★'],
  ['config', 'Configuración', '⚙'], ['profile', 'Perfil', '☻'], ['admin', 'Mantenimiento', '🛠'], ['officials', 'Árbitros', '♟'], ['close', 'Cierre', '✓'], ['audit', 'Auditoría', '◎']
];

const GUIDED_NAV_GROUPS = [
  { id: 'start', label: 'Inicio', hint: 'Estado general', tabs: ['dashboard', 'championships'] },
  { id: 'prepare', label: 'Preparar', hint: 'Datos y reglas', tabs: ['players', 'setup', 'groups'] },
  { id: 'operate', label: 'Operar', hint: 'Agenda y captura', tabs: ['schedule', 'matches'] },
  { id: 'results', label: 'Resultados', hint: 'Llaves y reportes', tabs: ['ko', 'reports', 'ranking', 'close'] },
  { id: 'admin', label: 'Administración', hint: 'Soporte y control', tabs: ['config', 'profile', 'admin', 'officials', 'audit'] }
];

const PRO_PRIMARY_TABS = [
  ['grand', 'Grand Dashboard', '◈'],
  ['championships', 'Campeonatos', '🏆'],
  ['rankingHub', 'Ranking', '★']
];

const PRO_ADMIN_TABS = [
  ['players', 'Jugadores', '👤'],
  ['config', 'Configuración', '⚙'],
  ['profile', 'Perfil', '☻'],
  ['admin', 'Mantenimiento', '🛠'],
  ['audit', 'Auditoría', '◎']
];

const PRO_WORKSPACE_TABS = [
  ['dashboard', 'Dashboard', '⌂'],
  ['setup', 'Campeonato', '⚙'],
  ['groups', 'Grupos', '▦'],
  ['schedule', 'Calendario', '📅'],
  ['matches', 'Partidas', '●'],
  ['ko', 'Llaves', '⑂'],
  ['close', 'Cierre', '✓'],
  ['reports', 'Reportes', '▤']
];
const PRO_DOUBLE_GROUPS_TAB = ['groupsF2', 'Grupos F2', '▦'];
const PRO_WORKSPACE_TAB_IDS = new Set([...PRO_WORKSPACE_TABS.map(([id]) => id), 'groupsF2']);

function getTabMeta(id) {
  const found = NAV_TABS.find(([tabId]) => tabId === id);
  return found || [id, id, '•'];
}

function visibleTabsForChampionship(championship) {
  const isRanking = (championship?.championship_type || 'NORMAL') === 'RANKING';
  return isRanking ? NAV_TABS.filter(([id]) => !RANKING_BLOCKED_TABS.has(id)) : NAV_TABS;
}

function ModeButtons({ uxMode, setUxMode, compact = false }) {
  const modes = [
    ['pro', 'Interface ProV', 'Nueva navegación por tabs'],
    ['guided', 'Interface IA', 'UX guiada v5.9'],
    ['classic', 'Interface Clásica', 'Base v5.8 y anteriores']
  ];
  return E('div', { className: `mode-switcher ${compact ? 'compact' : ''}` }, modes.map(([id, label, hint]) => E('button', {
    key: id,
    type: 'button',
    className: `mode-switch ${uxMode === id ? 'active' : ''}`,
    onClick: () => setUxMode(id),
    title: hint
  }, E('span', null, compact ? label.replace('Interface ', '') : label), compact ? null : E('small', null, hint))));
}

function Header({ championship, tab, setTab, collapsed, setCollapsed, auth, uxMode, setUxMode }) {
  const isRankingChampionship = (championship?.championship_type || 'NORMAL') === 'RANKING';
  const tabs = visibleTabsForChampionship(championship);
  const visibleIds = new Set(tabs.map(([id]) => id));
  const navigate = (id) => setTab(id);
  const isGuided = uxMode === 'guided';
  const isPro = uxMode === 'pro';

  if (isPro) {
    const adminTabs = PRO_ADMIN_TABS.filter(([id]) => id !== 'officials');
    return E('header', { className: `header guided-header pro-header ${collapsed ? 'collapsed' : ''}` },
      E('div', { className: 'brand-block guided-brand pro-brand' },
        E('img', { className: 'brand-logo-main', src: '/assets/asobigrie-logo.jpg', alt: 'ASOBIGRIE' }),
        E('div', { className: 'brand-copy' },
          E('div', { className: 'brand-title' }, 'CaromChamps'),
          E('div', { className: 'brand-subtitle' }, 'Interface ProV'),
          E('div', { className: 'brand-secondary' }, E('img', { src: '/assets/fecobi-logo.jpg', alt: 'FECOBI' }), E('span', null, 'Grand Dashboard'))
        )
      ),
      E('div', { className: 'menu-toolbar' },
        E(Button, { onClick: () => setCollapsed(!collapsed), kind: 'soft', title: collapsed ? 'Expandir menú' : 'Contraer menú' }, collapsed ? '☰' : '⇤ Contraer')
      ),
      E('nav', { className: 'tabs guided-tabs pro-tabs', 'aria-label': 'Navegación Interface ProV' },
        E('section', { className: 'guided-nav-group pro-nav-group active' },
          E('div', { className: 'guided-nav-group-title' }, E('b', null, 'Inicio'), E('span', null, 'Gestión principal')),
          PRO_PRIMARY_TABS.map(([id, label, icon]) => E('button', { key: id, onClick: () => navigate(id), className: `tab ${tab === id ? 'active' : ''}`, title: label }, E('span', { className: 'tab-icon' }, icon), E('span', { className: 'tab-label' }, label)))
        ),
        E('section', { className: 'guided-nav-group pro-nav-group' },
          E('div', { className: 'guided-nav-group-title' }, E('b', null, 'Administración'), E('span', null, 'Soporte y control')),
          adminTabs.map(([id, label, icon]) => E('button', { key: id, onClick: () => navigate(id), className: `tab ${tab === id ? 'active' : ''}`, title: label }, E('span', { className: 'tab-icon' }, icon), E('span', { className: 'tab-label' }, label)))
        )
      ),
      E('div', { className: 'side-profile-actions pro-side-actions' },
        E(Button, { onClick: () => navigate('profile'), kind: tab === 'profile' ? 'primary' : 'soft', title: 'Ajustes de perfil' }, collapsed ? '☻' : 'Perfil'),
        E(Button, { onClick: auth?.signOut, kind: 'danger', title: 'Cerrar sesión' }, collapsed ? '⏻' : 'Cerrar sesión')
      )
    );
  }

  if (isGuided) {
    return E('header', { className: `header guided-header ${collapsed ? 'collapsed' : ''}` },
      E('div', { className: 'brand-block guided-brand' },
        E('img', { className: 'brand-logo-main', src: '/assets/asobigrie-logo.jpg', alt: 'ASOBIGRIE' }),
        E('div', { className: 'brand-copy' },
          E('div', { className: 'brand-title' }, 'CaromChamps'),
          E('div', { className: 'brand-subtitle' }, isRankingChampionship ? 'Centro de Ranking' : 'Interface IA'),
          E('div', { className: 'brand-secondary' }, E('img', { src: '/assets/fecobi-logo.jpg', alt: 'FECOBI' }), E('span', null, 'UX guiada'))
        )
      ),
      E('div', { className: 'menu-toolbar' },
        E(Button, { onClick: () => setCollapsed(!collapsed), kind: 'soft', title: collapsed ? 'Expandir menú' : 'Contraer menú' }, collapsed ? '☰' : '⇤ Contraer'),
        E(Button, { onClick: () => setUxMode('pro'), kind: 'primary', title: 'Usar Interface ProV' }, collapsed ? '◈' : 'Interface ProV'),
        E(Button, { onClick: () => setUxMode('classic'), kind: 'soft', title: 'Volver temporalmente a la interface clásica' }, collapsed ? '↩' : 'Interface Clásica')
      ),
      E('nav', { className: 'tabs guided-tabs', 'aria-label': 'Navegación por flujo de trabajo' },
        GUIDED_NAV_GROUPS.map((group) => {
          const groupTabs = group.tabs.map(getTabMeta).filter(([id]) => visibleIds.has(id));
          if (!groupTabs.length) return null;
          const activeGroup = groupTabs.some(([id]) => id === tab);
          return E('section', { key: group.id, className: `guided-nav-group ${activeGroup ? 'active' : ''}` },
            E('div', { className: 'guided-nav-group-title' },
              E('b', null, group.label),
              E('span', null, group.hint)
            ),
            groupTabs.map(([id, label, icon]) => E('button', { key: id, onClick: () => navigate(id), className: `tab ${tab === id ? 'active' : ''}`, title: label }, E('span', { className: 'tab-icon' }, icon), E('span', { className: 'tab-label' }, label)))
          );
        })
      ),
      E('div', { className: 'side-profile-actions' },
        E(Button, { onClick: () => navigate('profile'), kind: tab === 'profile' ? 'primary' : 'soft', title: 'Ajustes de perfil' }, collapsed ? '☻' : 'Perfil'),
        E(Button, { onClick: auth?.signOut, kind: 'danger', title: 'Cerrar sesión' }, collapsed ? '⏻' : 'Cerrar sesión')
      )
    );
  }

  return E('header', { className: `header ${collapsed ? 'collapsed' : ''}` },
    E('div', { className: 'brand-block' },
      E('img', { className: 'brand-logo-main', src: '/assets/asobigrie-logo.jpg', alt: 'ASOBIGRIE' }),
      E('div', { className: 'brand-copy' },
        E('div', { className: 'brand-title' }, 'CaromChamps'),
        E('div', { className: 'brand-subtitle' }, 'Interface Clásica'),
        E('div', { className: 'brand-secondary' }, E('img', { src: '/assets/fecobi-logo.jpg', alt: 'FECOBI' }), E('span', null, 'FECOBI / ASOBIGRIE'))
      )
    ),
    E('div', { className: 'menu-toolbar' },
      E(Button, { onClick: () => setCollapsed(!collapsed), kind: 'soft', title: collapsed ? 'Expandir menú' : 'Contraer menú' }, collapsed ? '☰' : '⇤ Contraer'),
      E(Button, { onClick: () => setUxMode('pro'), kind: 'primary', title: 'Usar Interface ProV' }, collapsed ? '◈' : 'Interface ProV'),
      E(Button, { onClick: () => setUxMode('guided'), kind: 'soft', title: 'Usar Interface IA' }, collapsed ? '✨' : 'Interface IA')
    ),
    E('nav', { className: 'tabs' }, tabs.map(([id, label, icon]) => E('button', { key: id, onClick: () => navigate(id), className: `tab ${tab === id ? 'active' : ''}`, title: label }, E('span', { className: 'tab-icon' }, icon), E('span', { className: 'tab-label' }, label)))),
    E('div', { className: 'side-profile-actions' },
      E(Button, { onClick: () => navigate('profile'), kind: tab === 'profile' ? 'primary' : 'soft', title: 'Ajustes de perfil' }, collapsed ? '☻' : 'Perfil'),
      E(Button, { onClick: auth?.signOut, kind: 'danger', title: 'Cerrar sesión' }, collapsed ? '⏻' : 'Cerrar sesión')
    )
  );
}

function TopBar({ championship, auth, setTab, uxMode, setUxMode }) {
  const modeName = uxMode === 'pro' ? 'Interface ProV' : uxMode === 'guided' ? 'Interface IA' : 'Interface Clásica';
  return E('div', { className: `topbar ${uxMode === 'guided' ? 'guided-topbar' : ''} ${uxMode === 'pro' ? 'pro-topbar' : ''}` },
    E('div', null,
      E('h1', { className: 'header-title' }, uxMode === 'pro' && championship?.name ? championship.name : championship.name),
      E('div', { className: 'header-meta' },
        E(Badge, { kind: 'info' }, championship.status),
        E(Badge, null, championship.play_mode),
        E(Badge, { kind: 'success' }, championship.division_filter),
        E(Badge, { kind: (championship.championship_type || 'NORMAL') === 'RANKING' ? 'warning' : 'neutral' }, championship.championship_type || 'NORMAL'),
        E(Badge, { kind: uxMode === 'pro' ? 'success' : uxMode === 'guided' ? 'info' : 'neutral' }, modeName),
        E(Badge, { kind: 'neutral' }, championship.championship_id)
      )
    ),
    E('div', { className: 'topbar-user' },
      E(ModeButtons, { uxMode, setUxMode, compact: true }),
      E('span', { className: 'notification-pill' }, '3'),
      E('div', { className: 'avatar placeholder' }, (auth?.profile?.full_name || auth?.user?.email || 'CC').slice(0, 2).toUpperCase()),
      E('div', null, E('b', null, auth?.profile?.full_name || auth?.user?.email || 'Usuario'), E('div', { className: 'small' }, `${auth?.profile?.role || 'ORGANIZER'} · ${auth?.profile?.email || auth?.user?.email || ''}`)),
      E(Button, { onClick: () => setTab('profile'), kind: 'soft' }, 'Perfil'), E(Button, { onClick: auth?.signOut, kind: 'soft' }, 'Salir')
    )
  );
}

function formatAppVersion(version) {
  const normalized = String(version || '0.0.0').trim();
  return normalized.endsWith('.0') ? normalized.slice(0, -2) : normalized;
}


class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error('CaromChamps runtime error', error, info);
  }
  render() {
    if (this.state.error) {
      return E('div', { className: 'app-error-boundary' },
        E(Card, { className: 'app-error-card' },
          E('h1', null, 'CaromChamps encontró un problema al cargar la aplicación'),
          E('p', null, 'Se evitó que la pantalla quedara completamente en blanco. Copie el detalle técnico si necesita soporte.'),
          E('pre', null, String(this.state.error?.message || this.state.error)),
          E('div', { className: 'toolbar' },
            E(Button, { kind: 'primary', onClick: () => window.location.reload() }, 'Recargar'),
            E(Button, { kind: 'soft', onClick: async () => { try { localStorage.clear(); sessionStorage.clear(); } catch {} window.location.href = '/'; } }, 'Limpiar sesión local')
          )
        )
      );
    }
    return this.props.children;
  }
}


function normalizePlayerNameKey(player) {
  return `${player?.first_name || ''} ${player?.last_name || ''}`
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase();
}


const FORCED_INTERNATIONAL_PLAYERS = {
  'tirso gonzalez': { country_iso: 'DO', association_code: 'INTERNACIONAL', id_type: 'PASAPORTE' },
  'marcos valencia': { country_iso: 'PA', association_code: 'INTERNACIONAL', id_type: 'PASAPORTE' },
  'william pitty': { country_iso: 'PA', association_code: 'INTERNACIONAL', id_type: 'PASAPORTE' },
  'carlos nunez': { country_iso: 'PA', association_code: 'INTERNACIONAL', id_type: 'PASAPORTE' },
  'ricardo espinoza': { country_iso: 'PA', association_code: 'INTERNACIONAL', id_type: 'PASAPORTE' },
  'victor espinoza': { country_iso: 'PA', association_code: 'INTERNACIONAL', id_type: 'PASAPORTE' },
  'rafael bardayan': { country_iso: 'PA', association_code: 'INTERNACIONAL', id_type: 'PASAPORTE' },
  'julio atencio': { country_iso: 'PA', association_code: 'INTERNACIONAL', id_type: 'PASAPORTE' },
  'daniel acosta': { country_iso: 'PA', association_code: 'INTERNACIONAL', id_type: 'PASAPORTE' },
  'faustino murillo': { country_iso: 'PA', association_code: 'INTERNACIONAL', id_type: 'PASAPORTE' },
  'carlos patino': { country_iso: 'PA', association_code: 'INTERNACIONAL', id_type: 'PASAPORTE' },
  'pablo beltran': { country_iso: 'PA', association_code: 'INTERNACIONAL', id_type: 'PASAPORTE' }
};

function normalizeLegacyPlayerData(player) {
  const source = String(player?.source_association_label || player?.association_code || '').trim().toUpperCase();
  const forced = FORCED_INTERNATIONAL_PLAYERS[normalizePlayerNameKey(player).replace(/([a-z])([A-Z])/g, '$1 $2')] || FORCED_INTERNATIONAL_PLAYERS[`${player?.first_name || ''} ${player?.last_name || ''}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()];
  const mappedAssociation = forced?.association_code || (source === 'S.J.' || source === 'C.R.' || source === 'CR' ? 'AJOBI'
    : source === 'ALAJ' ? 'ASOBIGRIE'
      : source === 'P' ? 'INTERNACIONAL'
        : player?.association_code);
  const isPanama = forced?.country_iso === 'PA' || source === 'P' || (mappedAssociation === 'INTERNACIONAL' && player?.country_iso === 'PA');
  const isDominican = forced?.country_iso === 'DO';
  const cleanedNotes = String(player?.notes || '')
    .replace(/\s*·\s*Código fuente:\s*(S\.J\.|C\.R\.|CR|ALAJ|P)/gi, '')
    .replace(/Código fuente:\s*(S\.J\.|C\.R\.|CR|ALAJ|P)/gi, '')
    .trim();
  return {
    ...player,
    association_code: mappedAssociation || player?.association_code || 'AJOBI',
    country_iso: forced?.country_iso || (isPanama ? 'PA' : (player?.country_iso || 'CR')),
    id_type: (isPanama || isDominican) ? 'PASAPORTE' : (player?.id_type || 'CEDULA'),
    division_level: (isPanama || isDominican) ? 'NA' : (player?.division_level || 'PRIMERA'),
    previous_division_level: (isPanama || isDominican) ? 'NA' : (player?.previous_division_level || player?.division_level || 'PRIMERA'),
    source_association_label: '',
    notes: cleanedNotes || player?.notes || ''
  };
}

function mergeDefaultPlayers(savedPlayers = [], defaultPlayers = []) {
  const normalizedSaved = savedPlayers.map(normalizeLegacyPlayerData);
  const existingKeys = new Set(normalizedSaved.map(normalizePlayerNameKey));
  const nextPlayers = [...normalizedSaved];
  defaultPlayers.forEach((player) => {
    const key = normalizePlayerNameKey(player);
    if (!existingKeys.has(key)) {
      nextPlayers.push(player);
      existingKeys.add(key);
    }
  });
  return nextPlayers;
}


function championshipStage(championship, groups, matches, seeds) {
  const type = championship?.championship_type || 'NORMAL';
  if (type === 'RANKING') return 'RANKING';
  const completed = matches.filter((m) => m.match_status === 'COMPLETED').length;
  const koMatches = matches.filter((m) => m.phase === 'KO');
  const finalDone = koMatches.some((m) => matchRoundLabel(m) === 'Final' && m.match_status === 'COMPLETED');
  if ((championship.status || '').includes('COMPLETED')) return 'COMPLETED';
  if ((championship.status || '').includes('FINALIZED') || finalDone) return 'FINALIZED';
  if (koMatches.length) return 'KO_IN_PROGRESS';
  if (seeds.length) return 'GROUPS_CLOSED';
  if (groups.length && matches.length && completed < matches.length) return 'GROUPS_IN_PROGRESS';
  if (groups.length && matches.length) return 'GROUPS_READY';
  if (championship) return 'CONFIGURATION';
  return 'DRAFT';
}

function nextActionForStage(stage, isRanking) {
  if (isRanking) return { title: 'Revisar ranking acumulado', description: 'Asocie campeonatos normales cerrados y genere la tabla de posiciones.', tab: 'ranking', label: 'Ir a Ranking' };
  const map = {
    DRAFT: { title: 'Completar datos del campeonato', description: 'Defina sede, fechas, reglas, fases y parámetros básicos.', tab: 'setup', label: 'Completar campeonato' },
    CONFIGURATION: { title: 'Generar grupos', description: 'Revise jugadores elegibles y genere la fase de grupos.', tab: 'groups', label: 'Ir a Grupos' },
    GROUPS_READY: { title: 'Generar agenda o capturar resultados', description: 'Programe mesas/horarios o inicie captura de partidas.', tab: 'schedule', label: 'Ir a Calendario' },
    GROUPS_IN_PROGRESS: { title: 'Completar resultados de grupos', description: 'Capture partidas pendientes y valide standings.', tab: 'matches', label: 'Capturar partidas' },
    GROUPS_CLOSED: { title: 'Generar llaves', description: 'Los clasificados están listos para crear eliminación directa.', tab: 'ko', label: 'Ir a Llaves' },
    KO_IN_PROGRESS: { title: 'Completar fase KO', description: 'Revise la ronda activa y capture resultados hasta la Final.', tab: 'ko', label: 'Continuar Llaves' },
    FINALIZED: { title: 'Generar acta y cerrar campeonato', description: 'Revise ranking final, reportes y cierre administrativo.', tab: 'close', label: 'Ir a Cierre' },
    COMPLETED: { title: 'Campeonato cerrado', description: 'Genere reportes oficiales o comparta resultados.', tab: 'reports', label: 'Ver Reportes' }
  };
  return map[stage] || map.DRAFT;
}

function buildUxAlerts(championship, players, groups, matches, seeds) {
  const alerts = [];
  const isRanking = (championship?.championship_type || 'NORMAL') === 'RANKING';
  const completed = matches.filter((m) => m.match_status === 'COMPLETED').length;
  const pending = Math.max(0, matches.length - completed);
  if (isRanking) {
    alerts.push({ kind: 'info', text: 'Modo Ranking: no genera grupos, partidas ni llaves propias; consume campeonatos normales asociados.' });
    return alerts;
  }
  if (!groups.length) alerts.push({ kind: 'warning', text: 'Aún no hay grupos generados.' });
  if (matches.length && pending) alerts.push({ kind: 'warning', text: `${pending} partidas pendientes de completar.` });
  if (groups.length && seeds.length < Number(championship.total_qualifiers_f2 || 0)) alerts.push({ kind: 'danger', text: `Clasificados actuales: ${seeds.length}/${championship.total_qualifiers_f2}.` });
  if (!players.some((p) => p.status === 'ACTIVO')) alerts.push({ kind: 'danger', text: 'No hay jugadores activos disponibles.' });
  if (!alerts.length) alerts.push({ kind: 'success', text: 'No se detectan alertas críticas en el flujo actual.' });
  return alerts;
}

function RankingModeBanner({ championship, championships }) {
  if ((championship?.championship_type || 'NORMAL') !== 'RANKING') return null;
  const associated = championships.filter((row) => row.championship?.ranking_championship_id === championship.championship_id && row.championship?.championship_type !== 'RANKING');
  const closed = associated.filter((row) => ['FINALIZED', 'COMPLETED'].some((status) => String(row.championship?.status || '').includes(status))).length;
  return E(Card, { className: 'ux-ranking-banner' },
    E('div', null,
      E('h2', null, 'Campeonato tipo Ranking'),
      E('p', null, 'Este campeonato no requiere asociación manual de jugadores. Los jugadores y puntos se calculan desde los campeonatos normales asociados.')
    ),
    E('div', { className: 'ux-ranking-banner-stats' },
      E(Stat, { label: 'Campeonatos asociados', value: associated.length }),
      E(Stat, { label: 'Cerrados', value: closed }),
      E(Stat, { label: 'Pendientes', value: associated.length - closed })
    )
  );
}

function WorkflowStepper({ stage, setTab, isRanking }) {
  const normalSteps = [
    ['CONFIGURATION', 'Configurar', 'setup'],
    ['GROUPS_READY', 'Grupos', 'groups'],
    ['GROUPS_IN_PROGRESS', 'Captura', 'matches'],
    ['GROUPS_CLOSED', 'Clasificar', 'groups'],
    ['KO_IN_PROGRESS', 'Llaves', 'ko'],
    ['FINALIZED', 'Cierre', 'close']
  ];
  const rankingSteps = [['RANKING', 'Reglas Ranking', 'setup'], ['RANKING', 'Asociados', 'championships'], ['RANKING', 'Tabla Ranking', 'ranking'], ['RANKING', 'PDF Ranking', 'ranking']];
  const steps = isRanking ? rankingSteps : normalSteps;
  const activeIndex = isRanking ? 2 : Math.max(0, steps.findIndex(([key]) => key === stage));
  return E('div', { className: 'ux-stepper' }, steps.map(([key, label, tabId], index) => E('button', { key: `${key}-${label}`, type: 'button', onClick: () => setTab(tabId), className: `ux-step ${index <= activeIndex ? 'done' : ''} ${index === activeIndex ? 'active' : ''}` },
    E('span', null, index + 1),
    E('b', null, label)
  )));
}

function UxActionCenter({ championship, players, groups, matches, seeds, championships, setTab }) {
  const isRanking = (championship?.championship_type || 'NORMAL') === 'RANKING';
  const stage = championshipStage(championship, groups, matches, seeds);
  const action = nextActionForStage(stage, isRanking);
  const alerts = buildUxAlerts(championship, players, groups, matches, seeds);
  return E(Card, { className: 'ux-action-center' },
    E('div', { className: 'ux-action-main' },
      E('span', { className: 'ux-kicker' }, isRanking ? 'Centro de ranking' : 'Siguiente paso recomendado'),
      E('h2', null, action.title),
      E('p', null, action.description),
      E('div', { className: 'toolbar' },
        E(Button, { kind: 'primary', onClick: () => setTab(action.tab) }, action.label),
        !isRanking ? E(Button, { kind: 'soft', onClick: () => setTab('reports') }, 'Catálogo de reportes') : E(Button, { kind: 'soft', onClick: () => setTab('championships') }, 'Ver asociados')
      )
    ),
    E('div', { className: 'ux-alert-list' }, alerts.map((alert, index) => E('div', { key: index, className: `ux-alert ux-alert-${alert.kind}` }, alert.text)))
  );
}

function UxReportCatalog({ setTab, isRanking }) {
  const reports = isRanking ? [
    ['Ranking acumulado', 'Tabla oficial de posiciones por PRG y detalle por campeonato.', 'ranking'],
    ['Detalle por campeonato', 'PRG, CAR, ENT, AVG y posición por evento asociado.', 'ranking']
  ] : [
    ['Grupos', 'Conformación, posiciones y clasificados.', 'groups'],
    ['Partidas', 'Control operativo y resultados capturados.', 'matches'],
    ['Llaves', 'Bracket tabular, continuo y Face to Face.', 'ko'],
    ['Acta final', 'Cierre deportivo y administrativo.', 'close']
  ];
  return E(Card, { className: 'ux-report-catalog' },
    E('div', { className: 'section-title' }, E('h2', null, 'Catálogo de reportes'), E('p', null, 'Acceso guiado a reportes según el tipo y estado del campeonato.')),
    E('div', { className: 'ux-report-grid' }, reports.map(([title, description, tabId]) => E('button', { key: title, type: 'button', className: 'ux-report-card', onClick: () => setTab(tabId) },
      E('b', null, title),
      E('span', null, description)
    )))
  );
}

function UxScheduleBoardPreview({ matches }) {
  const scheduled = matches.filter((m) => m.scheduled_at || m.table_number).slice(0, 12);
  const tables = [...new Set(scheduled.map((m) => m.table_number || 'Mesa'))].slice(0, 4);
  if (!scheduled.length) return E(Card, { className: 'ux-board-preview' }, E('h2', null, 'Agenda por mesa'), E('p', { className: 'small' }, 'Cuando exista calendario generado, aquí se mostrará una vista rápida tipo tablero por mesa y hora.'));
  return E(Card, { className: 'ux-board-preview' },
    E('h2', null, 'Agenda por mesa'),
    E('div', { className: 'ux-board-grid', style: { '--ux-board-cols': tables.length || 1 } },
      tables.map((table) => E('div', { key: table, className: 'ux-board-col' },
        E('b', null, table),
        scheduled.filter((m) => (m.table_number || 'Mesa') === table).slice(0, 4).map((m) => E('span', { key: m.match_id }, `${matchCode(m)} · ${matchDisplayStatus(m)}`))
      ))
    )
  );
}

function UxCloseChecklist({ championship, matches, seeds }) {
  const koMatches = matches.filter((m) => m.phase === 'KO');
  const allCompleted = matches.length > 0 && matches.every((m) => m.match_status === 'COMPLETED');
  const hasFinal = koMatches.some((m) => matchRoundLabel(m) === 'Final');
  const finalDone = koMatches.some((m) => matchRoundLabel(m) === 'Final' && m.match_status === 'COMPLETED');
  const items = [
    ['Partidas completas', allCompleted],
    ['Clasificados generados', seeds.length >= Number(championship.total_qualifiers_f2 || 0)],
    ['Final creada', hasFinal],
    ['Final completada', finalDone],
    ['Acta / cierre disponible', allCompleted && finalDone]
  ];
  return E(Card, { className: 'ux-close-checklist' },
    E('h2', null, 'Checklist de cierre'),
    E('div', { className: 'ux-checklist' }, items.map(([label, ok]) => E('div', { key: label, className: `ux-check ${ok ? 'ok' : 'pending'}` }, E('span', null, ok ? '✓' : '•'), E('b', null, label))))
  );
}

function UxGuidedDashboard({ championship, players, groups, matches, seeds, championships, setTab }) {
  const completed = matches.filter((m) => m.match_status === 'COMPLETED').length;
  const pending = Math.max(0, matches.length - completed);
  const active = players.filter((p) => p.status === 'ACTIVO').length;
  const isRanking = (championship?.championship_type || 'NORMAL') === 'RANKING';
  const stage = championshipStage(championship, groups, matches, seeds);
  const runningVersion = formatAppVersion(appPackage.version);
  return E('div', { className: 'grid ux-dashboard' },
    E(RankingModeBanner, { championship, championships }),
    E(UxActionCenter, { championship, players, groups, matches, seeds, championships, setTab }),
    E(WorkflowStepper, { stage, setTab, isRanking }),
    E('div', { className: 'grid grid-6 ux-stat-strip' },
      E(Stat, { label: 'Versión', value: `v${runningVersion}`, hint: 'Interface guiada disponible' }),
      E(Stat, { label: 'Jugadores activos', value: active }),
      E(Stat, { label: 'Grupos', value: groups.length || '-' }),
      E(Stat, { label: 'Partidas', value: matches.length, hint: `${completed} completas · ${pending} pendientes` }),
      E(Stat, { label: 'Clasificados', value: seeds.length || '-', hint: `Objetivo ${championship.total_qualifiers_f2}` }),
      E(Stat, { label: 'Estado UX', value: isRanking ? 'Ranking' : stage })
    ),
    E('div', { className: 'grid grid-2' },
      E(UxReportCatalog, { setTab, isRanking }),
      E(UxCloseChecklist, { championship, matches, seeds })
    ),
    E(UxScheduleBoardPreview, { matches })
  );
}

function UxContextPanel({ championship, championships, tab, setTab }) {
  const isRanking = (championship?.championship_type || 'NORMAL') === 'RANKING';
  const tabMeta = getTabMeta(tab);
  const tips = isRanking ? [
    'Los jugadores se agregan automáticamente desde campeonatos normales asociados.',
    'Los menús de grupos, agenda, partidas y llaves se ocultan para evitar errores de operación.',
    'Use Ranking para consultar tabla, detalle por campeonato y PDF oficial.'
  ] : [
    'Use el flujo Preparar → Operar → Resultados → Cierre para reducir errores.',
    'Genere reportes desde el catálogo o desde cada módulo según el momento del campeonato.',
    'Antes de cerrar, revise partidas completas, clasificados y final completada.'
  ];
  return E(Card, { className: `ux-context-panel ${isRanking ? 'ranking' : 'normal'}` },
    E('div', null,
      E('span', { className: 'ux-kicker' }, isRanking ? 'Modo Ranking explicado' : 'Guía contextual'),
      E('h2', null, `${tabMeta[2]} ${tabMeta[1]}`),
      E('p', null, isRanking ? 'Este campeonato consolida puntos desde otros campeonatos. No requiere selección directa de jugadores.' : 'Interface guiada activa: mantiene los mismos módulos y agrega orientación operacional.')
    ),
    E('ul', null, tips.map((tip) => E('li', { key: tip }, tip))),
    E('div', { className: 'toolbar' },
      isRanking ? E(Button, { kind: 'primary', onClick: () => setTab('ranking') }, 'Ir a Ranking') : E(Button, { kind: 'soft', onClick: () => setTab('dashboard') }, 'Centro de control'),
      isRanking ? E(Button, { kind: 'soft', onClick: () => setTab('championships') }, 'Campeonatos asociados') : E(Button, { kind: 'soft', onClick: () => setTab('reports') }, 'Reportes')
    )
  );
}


function appNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function championshipTypeOf(row) {
  return row?.championship?.championship_type || row?.championship_type || 'NORMAL';
}

function normalChampionshipRows(championships) {
  return (championships || []).filter((row) => championshipTypeOf(row) !== 'RANKING');
}

function rankingChampionshipRows(championships) {
  return (championships || []).filter((row) => championshipTypeOf(row) === 'RANKING');
}

function completedMatchesOf(row) {
  return (row?.matches || []).filter((m) => m.match_status === 'COMPLETED');
}

function averageFromMatches(matches) {
  let caroms = 0;
  let innings = 0;
  (matches || []).filter((m) => m.match_status === 'COMPLETED').forEach((m) => {
    const matchInnings = appNumber(m.innings || m.total_innings || m.entries, 0);
    const s1 = matchPlayerStats(m, 1);
    const s2 = matchPlayerStats(m, 2);
    caroms += appNumber(s1.caroms, 0) + appNumber(s2.caroms, 0);
    innings += matchInnings > 0 ? matchInnings * 2 : appNumber(s1.innings, 0) + appNumber(s2.innings, 0);
  });
  return innings > 0 ? caroms / innings : 0;
}

function phaseAverageSeries(matches) {
  const order = ['GROUPS', 'GROUPS_F2', 'PRE_ELIMINATION', 'KO'];
  const label = { GROUPS: 'Grupos', GROUPS_F2: 'Grupos F2', PRE_ELIMINATION: 'R0', KO: 'KO' };
  let cumulativeCaroms = 0;
  let cumulativeInnings = 0;
  return order.map((phase) => {
    (matches || []).filter((m) => m.phase === phase && m.match_status === 'COMPLETED').forEach((m) => {
      const matchInnings = appNumber(m.innings || m.total_innings || m.entries, 0);
      const s1 = matchPlayerStats(m, 1);
      const s2 = matchPlayerStats(m, 2);
      cumulativeCaroms += appNumber(s1.caroms, 0) + appNumber(s2.caroms, 0);
      cumulativeInnings += matchInnings > 0 ? matchInnings * 2 : appNumber(s1.innings, 0) + appNumber(s2.innings, 0);
    });
    return { label: label[phase], value: cumulativeInnings > 0 ? cumulativeCaroms / cumulativeInnings : 0 };
  });
}

function MiniLineChart({ data, title, valueFormatter = (v) => String(v), onPointClick }) {
  const rows = data?.length ? data : [{ label: '-', value: 0 }];
  const width = 620;
  const height = 220;
  const pad = 28;
  const max = Math.max(...rows.map((d) => appNumber(d.value, 0)), 0.1);
  const min = Math.min(...rows.map((d) => appNumber(d.value, 0)), 0);
  const spread = Math.max(max - min, 0.1);
  const points = rows.map((d, i) => {
    const x = pad + (rows.length === 1 ? 0 : i * ((width - pad * 2) / (rows.length - 1)));
    const y = height - pad - ((appNumber(d.value, 0) - min) / spread) * (height - pad * 2);
    return { ...d, x, y };
  });
  return E(Card, { className: 'pro-chart-card pro-line-chart' },
    E('h2', null, title),
    E('svg', { viewBox: `0 0 ${width} ${height}`, role: 'img', 'aria-label': title },
      E('polyline', { points: points.map((p) => `${p.x},${p.y}`).join(' '), fill: 'none', stroke: 'currentColor', strokeWidth: 4, strokeLinecap: 'round', strokeLinejoin: 'round' }),
      points.map((p) => E('g', { key: p.label, className: onPointClick || p.onClick ? 'chart-clickable' : '', onClick: () => (p.onClick ? p.onClick(p) : onPointClick?.(p)), role: onPointClick || p.onClick ? 'button' : undefined, tabIndex: onPointClick || p.onClick ? 0 : undefined },
        E('circle', { cx: p.x, cy: p.y, r: 6 }),
        E('text', { x: p.x, y: height - 6, textAnchor: 'middle' }, p.label),
        E('text', { x: p.x, y: Math.max(14, p.y - 12), textAnchor: 'middle', className: 'chart-value' }, valueFormatter(p.value))
      ))
    )
  );
}

function MiniBarChart({ data, title, valueFormatter = (v) => String(v) }) {
  const rows = (data || []).slice(0, 8);
  const max = Math.max(...rows.map((d) => appNumber(d.value, 0)), 1);
  return E(Card, { className: 'pro-chart-card pro-bar-chart' },
    E('h2', null, title),
    E('div', { className: 'pro-bars' }, rows.length ? rows.map((row) => E('div', { key: row.label, className: `pro-bar-row ${row.onClick ? 'chart-clickable' : ''}`, onClick: row.onClick, role: row.onClick ? 'button' : undefined, tabIndex: row.onClick ? 0 : undefined },
      E('span', { title: row.fullLabel || row.label }, row.label),
      E('div', { className: 'pro-bar-track' }, E('i', { style: { width: `${Math.max(3, (appNumber(row.value, 0) / max) * 100)}%` } })),
      E('b', null, valueFormatter(row.value))
    )) : E('p', { className: 'small' }, 'Sin datos disponibles.'))
  );
}

function GrandDashboard({ championships, players, openChampionshipDashboard, openPlayerHistory }) {
  const normalRows = normalChampionshipRows(championships);
  const rankingRows = rankingChampionshipRows(championships);
  const uniquePlayers = new Set(players.map((p) => p.player_id));
  const inscriptions = normalRows.reduce((sum, row) => sum + (row.championship?.participant_ids?.length || getEligiblePlayers(row.championship || {}, players).length || 0), 0);
  const statusCounts = Object.entries((championships || []).reduce((acc, row) => {
    const status = row.status || row.championship?.status || 'DRAFT';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {})).map(([label, value]) => ({ label, value }));
  const codeByChampionship = Object.fromEntries(normalRows.map((row, index) => [row.id, `C${index + 1}`]));
  const avgByChampionship = normalRows.map((row, index) => ({ label: `C${index + 1}`, fullLabel: row.name, value: averageFromMatches(row.matches || []), onClick: () => openChampionshipDashboard?.(row.id) }));
  const championshipsByPlayers = normalRows.map((row) => ({ label: `${codeByChampionship[row.id] || ''} · ${row.name || row.championship?.name || row.id}`, fullLabel: row.name || row.championship?.name || row.id, value: row.championship?.participant_ids?.length || getEligiblePlayers(row.championship || {}, players).length || 0, onClick: () => openChampionshipDashboard?.(row.id) })).sort((a, b) => b.value - a.value);
  const playerBest = new Map();
  normalRows.forEach((row) => completedMatchesOf(row).forEach((m) => {
    [1, 2].forEach((side) => {
      const stats = matchPlayerStats(m, side);
      const pid = stats.player_id;
      if (!pid) return;
      const innings = appNumber(stats.innings || m.innings, 0);
      const avg = innings > 0 ? appNumber(stats.caroms, 0) / innings : appNumber(stats.avg, 0);
      const current = playerBest.get(pid) || { playerId: pid, value: 0 };
      if (avg > current.value) playerBest.set(pid, { playerId: pid, value: avg });
    });
  }));
  const topPlayers = [...playerBest.values()].sort((a, b) => b.value - a.value).slice(0, 7).map((row) => {
    const player = players.find((p) => p.player_id === row.playerId);
    return { label: playerName(player).slice(0, 18), fullLabel: playerName(player), value: row.value, onClick: () => openPlayerHistory?.(row.playerId) };
  });
  const totalMatches = normalRows.reduce((sum, row) => sum + (row.matches?.length || 0), 0);
  const completedMatches = normalRows.reduce((sum, row) => sum + completedMatchesOf(row).length, 0);
  const globalAvg = averageFromMatches(normalRows.flatMap((row) => row.matches || []));
  const runningVersion = formatAppVersion(appPackage.version);
  return E('div', { className: 'grid pro-grand-dashboard' },
    E('section', { className: 'pro-hero' },
      E('div', null,
        E('span', { className: 'ux-kicker' }, 'Interface ProV'),
        E('h1', null, 'Grand Dashboard'),
        E('p', null, 'Vista ejecutiva acumulada de todos los campeonatos, jugadores, promedios, estados y participación registrada en la plataforma.')
      ),
      E(ModeButtons, { uxMode: 'pro', setUxMode: () => {}, compact: false })
    ),
    E('div', { className: 'grid grid-6 pro-stat-strip' },
      E(Stat, { label: 'Campeonatos normales', value: normalRows.length }),
      E(Stat, { label: 'Campeonatos ranking', value: rankingRows.length }),
      E(Stat, { label: 'Jugadores únicos', value: uniquePlayers.size }),
      E(Stat, { label: 'Inscripciones acumuladas', value: inscriptions }),
      E(Stat, { label: 'Partidas completadas', value: `${completedMatches}/${totalMatches}` }),
      E(Stat, { label: 'AVG global', value: fmtAvg(globalAvg) }),
      E(Stat, { label: 'Versión plataforma', value: `v${runningVersion}`, hint: 'Release activo en ejecución' })
    ),
    E('div', { className: 'grid grid-2' },
      E(MiniLineChart, { data: avgByChampionship, title: 'AVG general por campeonato', valueFormatter: (v) => fmtAvg(v) }),
      E(MiniBarChart, { data: statusCounts, title: 'Estados actuales de campeonatos' })
    ),
    E('div', { className: 'grid grid-2' },
      E(MiniBarChart, { data: topPlayers, title: 'Top 7 jugadores por mayor AVG alcanzado', valueFormatter: (v) => fmtAvg(v) }),
      E(MiniBarChart, { data: championshipsByPlayers, title: 'Campeonatos con más jugadores inscritos' })
    ),
    E(Card, { className: 'pro-insight-card' },
      E('h2', null, 'Lecturas rápidas para Dirección Técnica'),
      E('div', { className: 'grid grid-4' },
        E('div', { className: 'round-card' }, E('b', null, 'Actividad'), E('p', null, `${completedMatches} partidas completadas en ${normalRows.length} campeonatos normales.`)),
        E('div', { className: 'round-card' }, E('b', null, 'Participación'), E('p', null, `${inscriptions} inscripciones acumuladas registradas.`)),
        E('div', { className: 'round-card' }, E('b', null, 'Rendimiento'), E('p', null, `AVG global acumulado ${fmtAvg(globalAvg)}.`)),
        E('div', { className: 'round-card' }, E('b', null, 'Ranking'), E('p', null, `${rankingRows.length} campeonatos tipo Ranking disponibles.`))
      )
    )
  );
}

function ProWorkspaceTabs({ tab, setTab, championship }) {
  const type = championship?.championship_type || 'NORMAL';
  const isRanking = type === 'RANKING';
  const isDoubleGroups = type === 'DOBLE_FASE_GRUPOS';
  const showGroupsF2 = isDoubleGroups && (championship?.status === 'GROUPS_F2_READY' || championship?.status === 'GROUPS_F2_CLOSED' || Array.isArray(championship?.groups_f2));
  const tabs = isRanking
    ? [['dashboard', 'Dashboard', '⌂'], ['setup', 'Campeonato', '⚙'], ['ranking', 'Ranking', '★'], ['reports', 'Reportes', '▤']]
    : PRO_WORKSPACE_TABS.flatMap((item) => item[0] === 'groups' && showGroupsF2 ? [item, PRO_DOUBLE_GROUPS_TAB] : [item]);
  return E(Card, { className: 'pro-workspace-tabs-card pro-workspace-tabs-sticky' },
    E('div', { className: 'pro-workspace-title' },
      E('div', null, E('span', { className: 'ux-kicker' }, 'Campeonato activo'), E('h2', null, championship?.name || 'Sin campeonato seleccionado')),
      E(Badge, { kind: isRanking ? 'warning' : isDoubleGroups ? 'success' : 'info' }, isRanking ? 'RANKING' : isDoubleGroups ? 'DOBLE FASE GRUPOS' : 'NORMAL')
    ),
    E('div', { className: 'pro-workspace-tabs pro-process-tabs' }, tabs.map(([id, label, icon], index) => E('button', { key: id, type: 'button', className: `${tab === id ? 'active' : ''} ${index < tabs.length - 1 ? 'has-next' : ''}`, onClick: () => setTab(id) }, E('span', { className: 'pro-tab-index' }, index + 1), E('span', { className: 'pro-tab-icon' }, icon), E('b', null, label))))
  );
}

function ChampionshipAvgByPhaseChart({ championship, matches, setTab }) {
  if ((championship?.championship_type || 'NORMAL') === 'RANKING' || !usesAverageControl(championship)) return null;
  const phaseData = phaseAverageSeries(matches).filter((item) => item.value > 0);
  const finalAvg = averageFromMatches(matches);
  const data = [...phaseData, { label: 'AVG Final', value: finalAvg, onClick: () => setTab?.('reports') }];
  return E('div', { className: 'pro-dashboard-chart-full' }, E(MiniLineChart, { data, title: 'AVG general acumulado por fase + AVG final', valueFormatter: (v) => fmtAvg(v), onPointClick: () => setTab?.('reports') }));
}

function ProTournamentTopAvgPlayers({ players, matches, openPlayerHistory }) {
  const best = new Map();
  (matches || []).filter((m) => m.match_status === 'COMPLETED').forEach((m) => [1, 2].forEach((side) => {
    const stats = matchPlayerStats(m, side);
    if (!stats.player_id || !stats.innings) return;
    const avg = Number(stats.caroms || 0) / Number(stats.innings || 1);
    const current = best.get(stats.player_id) || { playerId: stats.player_id, value: 0 };
    if (avg > current.value) best.set(stats.player_id, { playerId: stats.player_id, value: avg });
  }));
  const rows = [...best.values()].sort((a, b) => b.value - a.value).slice(0, 7).map((row) => {
    const player = (players || []).find((p) => p.player_id === row.playerId);
    return { label: playerName(player).slice(0, 22), fullLabel: playerName(player), value: row.value, onClick: () => openPlayerHistory?.(row.playerId) };
  });
  return E(MiniBarChart, { data: rows, title: 'Top 7 jugadores por AVG del torneo', valueFormatter: (v) => fmtAvg(v) });
}

function ProPendingMatchesList({ matches, players }) {
  const playerMap = Object.fromEntries((players || []).map((p) => [p.player_id, p]));
  const pending = (matches || []).filter((m) => m.match_status !== 'COMPLETED' && m.match_status !== 'VALIDATED' && m.match_status !== 'LOCKED').slice(0, 18);
  return E(Card, { className: 'pro-pending-matches-card' },
    E('div', { className: 'section-title' }, E('h2', null, 'Partidas pendientes de jugar'), E('p', null, 'Lista rápida de partidas sin completar para seguimiento operativo.')),
    pending.length ? E('div', { className: 'table-wrap' }, E('table', { className: 'pro-pending-table' },
      E('thead', null, E('tr', null, ['Código', 'Fase', 'Jugador A', 'Jugador B', 'Mesa', 'Fecha/Hora', 'Estado'].map((h) => E('th', { key: h }, h)))),
      E('tbody', null, pending.map((m) => E('tr', { key: m.match_id },
        E('td', null, matchCode(m)),
        E('td', null, matchRoundLabel(m)),
        E('td', null, playerName(playerMap[m.player1_id])),
        E('td', null, playerName(playerMap[m.player2_id])),
        E('td', null, m.table_number || m.table_id || '-'),
        E('td', null, m.scheduled_at ? formatDateTimeEs(m.scheduled_at) : '-'),
        E('td', null, matchDisplayStatus(m))
      )))
    )) : E('p', { className: 'small' }, 'No hay partidas pendientes.'));
}

function ProChampionshipDashboard({ championship, players, groups, matches, seeds, championships, setTab, openPlayerHistory }) {
  return E('div', { className: 'grid pro-championship-dashboard' },
    E(UxGuidedDashboard, { championship, players, groups, matches, seeds, championships, setTab }),
    E(ProPendingMatchesList, { matches, players }),
    E('div', { className: 'grid grid-2 pro-dashboard-avg-row' },
      E(ChampionshipAvgByPhaseChart, { championship, matches, setTab }),
      usesAverageControl(championship) ? E(ProTournamentTopAvgPlayers, { players, matches, openPlayerHistory }) : null
    )
  );
}

function ChampionshipWizard({ type, championships, onCreate, onCancel }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    championship_type: type,
    name: type === 'RANKING' ? 'Nuevo Ranking Nacional' : 'Nuevo Campeonato Nacional',
    venue_name: 'Sala Oficial FECOBI',
    start_date: new Date().toISOString().slice(0, 10),
    end_date: new Date().toISOString().slice(0, 10),
    division_filter: 'PRIMERA',
    preferred_group_size: '4',
    qualifiers_per_group: '2',
    extra_qualifiers_count: '2',
    total_qualifiers_f2: '16',
    ranking_max_championships: '5',
    average_control_enabled: 'SI'
  });
  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const steps = type === 'RANKING' ? ['Tipo y nombre', 'Reglas Ranking', 'Confirmación'] : ['Tipo y nombre', 'Fechas y sede', 'Reglas base', 'Confirmación'];
  const finish = () => onCreate(form);
  return E(Card, { className: 'pro-wizard-card' },
    E('div', { className: 'pro-wizard-head' },
      E('div', null, E('span', { className: 'ux-kicker' }, type === 'RANKING' ? 'Wizard Ranking' : 'Wizard Campeonato'), E('h2', null, 'Crear campeonato guiado')),
      E(Button, { kind: 'soft', onClick: onCancel }, 'Cerrar')
    ),
    E('div', { className: 'ux-stepper pro-wizard-steps' }, steps.map((label, index) => E('button', { key: label, className: `ux-step ${index === step ? 'active' : index < step ? 'done' : ''}`, onClick: () => setStep(index) }, E('span', null, index + 1), E('b', null, label)))),
    step === 0 ? E('div', { className: 'grid grid-2 pro-form-grid' },
      E('label', null, 'Nombre', E('input', { value: form.name, onChange: (e) => update('name', e.target.value) })),
      E('label', null, 'Tipo', E('select', { value: form.championship_type, disabled: type === 'RANKING', onChange: (e) => update('championship_type', e.target.value) }, type === 'RANKING' ? [E('option', { key: 'RANKING', value: 'RANKING' }, 'Ranking')] : [E('option', { key: 'NORMAL', value: 'NORMAL' }, 'Normal'), E('option', { key: 'DOBLE_FASE_GRUPOS', value: 'DOBLE_FASE_GRUPOS' }, 'Doble Fase Grupos')])),
      E('label', null, 'División', E('select', { value: form.division_filter, onChange: (e) => update('division_filter', e.target.value) }, ['PRIMERA', 'SEGUNDA', 'TERCERA', 'SELECTIVO', 'INTERNACIONAL', 'NA'].map((value) => E('option', { key: value, value }, value)))),
      E('label', null, 'Control de promedios', E('select', { value: form.average_control_enabled, onChange: (e) => update('average_control_enabled', e.target.value) }, ['SI', 'NO'].map((value) => E('option', { key: value, value }, value)))),
      E('label', null, 'Estado inicial', E('input', { value: 'DRAFT', disabled: true }))
    ) : null,
    step === 1 && type !== 'RANKING' ? E('div', { className: 'grid grid-2 pro-form-grid' },
      E('label', null, 'Sede', E('input', { value: form.venue_name, onChange: (e) => update('venue_name', e.target.value) })),
      E('label', null, 'Fecha inicio', E('input', { type: 'date', value: form.start_date, onChange: (e) => update('start_date', e.target.value) })),
      E('label', null, 'Fecha final', E('input', { type: 'date', value: form.end_date, onChange: (e) => update('end_date', e.target.value) })),
      E('label', null, 'Tamaño grupo', E('input', { type: 'number', min: 3, max: 6, value: form.preferred_group_size, onChange: (e) => update('preferred_group_size', e.target.value) }))
    ) : null,
    step === 2 && type !== 'RANKING' ? E('div', { className: 'grid grid-4 pro-form-grid' },
      E('label', null, 'Clasificados por grupo', E('input', { type: 'number', value: form.qualifiers_per_group, onChange: (e) => update('qualifiers_per_group', e.target.value) })),
      E('label', null, 'Extra clasificados', E('input', { type: 'number', value: form.extra_qualifiers_count, onChange: (e) => update('extra_qualifiers_count', e.target.value) })),
      E('label', null, 'Total F2', E('input', { type: 'number', value: form.total_qualifiers_f2, onChange: (e) => update('total_qualifiers_f2', e.target.value) })),
      E('label', null, 'Cierre', E('input', { value: 'CON_CIERRE', disabled: true }))
    ) : null,
    step === 1 && type === 'RANKING' ? E('div', { className: 'grid grid-2 pro-form-grid' },
      E('label', null, 'Máximo campeonatos asociados', E('input', { type: 'number', value: form.ranking_max_championships, onChange: (e) => update('ranking_max_championships', e.target.value) })),
      E('div', { className: 'round-card' }, E('b', null, 'Jugadores'), E('p', null, 'No se asocian jugadores manualmente. Se tomarán desde campeonatos normales asociados.'))
    ) : null,
    step === steps.length - 1 ? E('div', { className: 'pro-wizard-summary' },
      E('h3', null, 'Resumen'),
      E('p', null, `${form.name} · ${form.championship_type} · ${form.division_filter}`),
      E('p', { className: 'small' }, type === 'RANKING' ? 'Al finalizar, el ranking quedará listo para asociar campeonatos normales.' : 'Al finalizar, el campeonato quedará guardado y se abrirá en el tab Dashboard para continuar el proceso.')
    ) : null,
    E('div', { className: 'toolbar pro-wizard-actions' },
      E(Button, { kind: 'soft', disabled: step === 0, onClick: () => setStep(Math.max(0, step - 1)) }, 'Anterior'),
      step < steps.length - 1 ? E(Button, { kind: 'primary', onClick: () => setStep(Math.min(steps.length - 1, step + 1)) }, 'Siguiente') : E(Button, { kind: 'success', onClick: finish }, 'Guardar campeonato')
    )
  );
}

function ProChampionshipHub({ type, championships, activeId, loadChampionship, createChampionshipFromWizard, duplicateChampionship, deleteChampionship, shareChampionship }) {
  const [wizardOpen, setWizardOpen] = useState(false);
  const rows = (type === 'RANKING' ? rankingChampionshipRows(championships) : normalChampionshipRows(championships));
  return E('div', { className: 'grid pro-hub' },
    E(Card, null,
      E(SectionTitle, { title: type === 'RANKING' ? 'Campeonatos tipo Ranking' : 'Campeonatos normales', subtitle: type === 'RANKING' ? 'Solo se muestran rankings. Al abrirlos se consulta su tabla acumulada.' : 'Solo se muestran campeonatos normales. Al abrir uno, se carga su Dashboard operativo.' }),
      E('div', { className: 'toolbar', style: { marginTop: 14 } },
        E(Button, { onClick: () => setWizardOpen(true), kind: 'success' }, type === 'RANKING' ? 'Crear ranking guiado' : 'Crear campeonato guiado'),
        type !== 'RANKING' ? E(Button, { onClick: duplicateChampionship, kind: 'soft' }, 'Duplicar campeonato activo') : null
      )
    ),
    wizardOpen ? E('div', { className: 'pro-wizard-overlay', role: 'dialog', 'aria-modal': 'true' }, E('div', { className: 'pro-wizard-modal' }, E(ChampionshipWizard, { type, championships, onCancel: () => setWizardOpen(false), onCreate: (form) => { createChampionshipFromWizard(form); setWizardOpen(false); } }))) : null,
    !rows.length ? E(EmptyState, { title: type === 'RANKING' ? 'Sin rankings' : 'Sin campeonatos normales', message: 'Cree el primer registro con el wizard guiado.' }) : E(Card, null,
      E('div', { className: 'table-wrap' }, E('table', null,
        E('thead', null, E('tr', null, ['Activo', 'Campeonato', 'Estado', 'Fechas', 'Grupos', 'Partidas', 'Clasificados', 'Acciones'].map((h) => E('th', { key: h }, h)))),
        E('tbody', null, rows.map((row) => E('tr', { key: row.id, className: row.id === activeId ? 'selected-row' : '' },
          E('td', null, row.id === activeId ? E(Badge, { kind: 'success' }, 'Activo') : '-'),
          E('td', null, E('b', null, row.name), E('div', { className: 'small' }, row.id)),
          E('td', null, E(Badge, { kind: row.status === 'COMPLETED' ? 'success' : row.status === 'FINALIZED' ? 'info' : 'neutral' }, row.status || '-')),
          E('td', null, `${formatDateEs(row.start_date)} / ${formatDateEs(row.end_date)}`),
          E('td', null, row.groups?.length || 0),
          E('td', null, row.matches?.length || 0),
          E('td', null, row.seeds?.length || 0),
          E('td', null, E('div', { className: 'toolbar' },
            E(Button, { onClick: () => loadChampionship(row.id, type === 'RANKING' ? 'ranking' : 'dashboard'), kind: row.id === activeId ? 'primary' : 'soft' }, type === 'RANKING' ? 'Abrir ranking' : 'Abrir'),
            E(Button, { onClick: () => shareChampionship?.(row.id), kind: 'success' }, 'Compartir'),
            E(Button, { onClick: () => deleteChampionship(row.id), kind: 'danger', disabled: row.id === activeId }, 'Eliminar')
          ))
        )))
      ))
    )
  );
}


function GroupsF2Module({ championship, setChampionship, players, matches, setMatches, seeds, setSeeds, audit }) {
  const firstPhaseSeeds = Array.isArray(championship.seeds_f1) && championship.seeds_f1.length ? championship.seeds_f1 : seeds;
  const qualifiedPlayers = (firstPhaseSeeds || []).map((seed) => seed.player || players.find((p) => p.player_id === seed.player_id || p.player_id === seed.player?.player_id)).filter(Boolean);
  const f2Settings = {
    preferred_group_size: championship.f2_settings?.preferred_group_size || championship.preferred_group_size || 4,
    group_generation_mode: championship.f2_settings?.group_generation_mode || championship.group_generation_mode || 'SEEDED_RANDOM',
    qualifiers_per_group: championship.f2_settings?.qualifiers_per_group || championship.qualifiers_per_group || 2,
    extra_qualifier_position: championship.f2_settings?.extra_qualifier_position || championship.extra_qualifier_position || 3,
    extra_qualifiers_count: championship.f2_settings?.extra_qualifiers_count ?? championship.extra_qualifiers_count ?? 0,
    total_qualifiers_f2: championship.f2_settings?.total_qualifiers_f2 || championship.total_qualifiers_f2 || 8,
    random_seed: championship.f2_settings?.random_seed || `${championship.random_seed || 'f2'}-f2`
  };
  const [form, setForm] = useState(f2Settings);
  const groupsF2 = Array.isArray(championship.groups_f2) ? championship.groups_f2 : [];
  const matchesF2 = (matches || []).filter((m) => m.phase === 'GROUPS_F2');
  const standingsF2 = groupStandings(groupsF2, matchesF2, championship);
  const pending = matchesF2.filter((m) => m.match_status !== 'COMPLETED');
  const patch = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const f2ChampionshipConfig = {
    ...championship,
    ...form,
    championship_type: 'NORMAL',
    participant_ids: qualifiedPlayers.map((p) => p.player_id),
    participant_seeds: Object.fromEntries(qualifiedPlayers.map((p, index) => [p.player_id, index + 1])),
    total_qualifiers_f2: Number(form.total_qualifiers_f2 || championship.total_qualifiers_f2 || 8)
  };
  const generateF2 = () => {
    if (championship.championship_type !== 'DOBLE_FASE_GRUPOS') return alert('Grupos F2 solo aplica para campeonatos tipo Doble Fase Grupos.');
    if (!qualifiedPlayers.length) return alert('Primero debe clasificar la primera fase de grupos.');
    if (groupsF2.length && !window.confirm('Ya existen Grupos F2. Regenerarlos eliminará partidas y clasificados de esta fase. ¿Desea continuar?')) return;
    const generatedGroups = generateGroups(f2ChampionshipConfig, qualifiedPlayers).map((group, index) => ({
      ...group,
      group_id: `F2-${group.group_id || index + 1}`,
      group_name: `F2-${group.group_name || `Grupo ${index + 1}`}`,
      group_phase: 'GROUPS_F2'
    }));
    const startNumber = Math.max(0, ...matches.map((m) => Number(m.match_number || 0))) + 1;
    const generatedMatches = generateRoundRobinMatches(f2ChampionshipConfig, generatedGroups, startNumber).map((match) => ({
      ...match,
      phase: 'GROUPS_F2',
      group_phase: 'GROUPS_F2',
      match_status: match.match_status || 'CREATED'
    }));
    setChampionship({ ...championship, groups_f2: generatedGroups, f2_settings: form, status: 'GROUPS_F2_READY', seeds_f1: firstPhaseSeeds });
    setMatches([...(matches || []).filter((m) => m.phase !== 'GROUPS_F2' && m.phase !== 'PRE_ELIMINATION' && m.phase !== 'KO'), ...generatedMatches]);
    setSeeds([]);
    audit?.('GROUPS_F2_GENERATED', `${generatedGroups.length} grupos F2 y ${generatedMatches.length} partidas generadas.`);
  };
  const classifyF2 = () => {
    if (!groupsF2.length) return alert('Debe generar Grupos F2 antes de clasificar.');
    if (pending.length) return alert('Hay partidas pendientes en Grupos F2. Complete resultados antes de clasificar.');
    const qualified = qualify(standingsF2, { ...championship, ...form });
    setSeeds(qualified);
    setChampionship({ ...championship, groups_f2: standingsF2, f2_settings: form, seeds_f2: qualified, status: 'GROUPS_F2_CLOSED' });
    audit?.('GROUPS_F2_QUALIFIED', `${qualified.length} clasificados desde Grupos F2.`);
  };
  if (championship.championship_type !== 'DOBLE_FASE_GRUPOS') return E(EmptyState, { title: 'No aplica', message: 'Este tab solo se usa en campeonatos tipo Doble Fase Grupos.' });
  return E('div', { className: 'grid groups-f2-module' },
    E(Card, null,
      E(SectionTitle, { title: 'Grupos F2 · Segunda fase de grupos', subtitle: 'Genera una segunda fase con los jugadores clasificados desde la primera fase de grupos.' }),
      E('div', { className: 'grid grid-4', style: { marginTop: 14 } },
        E(Stat, { label: 'Clasificados F1', value: qualifiedPlayers.length }),
        E(Stat, { label: 'Grupos F2', value: groupsF2.length || '-' }),
        E(Stat, { label: 'Partidas F2', value: matchesF2.length || '-' }),
        E(Stat, { label: 'Pendientes', value: pending.length })
      ),
      E('div', { className: 'grid grid-4', style: { marginTop: 14 } },
        E('label', null, 'Tamaño grupo', E('select', { value: form.preferred_group_size, onChange: (e) => patch('preferred_group_size', Number(e.target.value)) }, [3,4,5,6].map((x) => E('option', { key: x, value: x }, x)))),
        E('label', null, 'Modo generación', E('select', { value: form.group_generation_mode, onChange: (e) => patch('group_generation_mode', e.target.value) }, ['FULL_RANDOM', 'SEEDED_RANDOM', 'SEEDED_RANDOM_COUNTRY_SPREAD', 'SNAKE_DRAFT'].map((x) => E('option', { key: x, value: x }, x)))),
        E('label', null, 'Clasificados directos/grupo', E('input', { type: 'number', value: form.qualifiers_per_group, onChange: (e) => patch('qualifiers_per_group', Number(e.target.value)) })),
        E('label', null, 'Mejores adicionales', E('input', { type: 'number', value: form.extra_qualifiers_count, onChange: (e) => patch('extra_qualifiers_count', Number(e.target.value)) })),
        E('label', null, 'Posición adicional', E('input', { type: 'number', value: form.extra_qualifier_position, onChange: (e) => patch('extra_qualifier_position', Number(e.target.value)) })),
        E('label', null, 'Total clasificados final', E('input', { type: 'number', value: form.total_qualifiers_f2, onChange: (e) => patch('total_qualifiers_f2', Number(e.target.value)) })),
        E('label', null, 'Seed sorteo F2', E('input', { value: form.random_seed, onChange: (e) => patch('random_seed', e.target.value) }))
      ),
      E('div', { className: 'toolbar', style: { marginTop: 14 } },
        E(Button, { kind: 'success', onClick: generateF2 }, groupsF2.length ? 'Regenerar Grupos F2' : 'Generar Grupos F2'),
        E(Button, { kind: 'primary', onClick: classifyF2, disabled: !groupsF2.length }, 'Clasificar Grupos F2')
      )
    ),
    !qualifiedPlayers.length ? E(EmptyState, { title: 'Pendiente de clasificación F1', message: 'Clasifique primero la fase de grupos inicial para alimentar Grupos F2.' }) : null,
    groupsF2.length ? E('div', { className: 'grid grid-2' }, standingsF2.map((group) => E(Card, { key: group.group_id },
      E('h3', null, group.group_name),
      E('div', { className: 'table-wrap' }, E('table', null,
        E('thead', null, E('tr', null, ['Pos', 'Jugador', 'PJ', 'PG', 'PE', 'PP', 'Pts', 'CAR', 'ENT', 'AVG'].map((h) => E('th', { key: h }, h)))),
        E('tbody', null, group.standings.map((row) => E('tr', { key: row.player.player_id },
          E('td', null, row.group_position), E('td', null, playerName(row.player)), E('td', null, row.played), E('td', null, row.wins), E('td', null, row.draws), E('td', null, row.losses), E('td', null, row.points), E('td', null, row.caroms), E('td', null, row.innings), E('td', null, fmtAvg(row.avg))
        )))
      ))
    ))) : null
  );
}

function Dashboard({ championship, players, groups, matches, seeds, championships }) {
  const completed = matches.filter((m) => m.match_status === 'COMPLETED').length;
  const pending = matches.length - completed;
  const active = players.filter((p) => p.status === 'ACTIVO').length;
  const koCount = matches.filter((m) => m.phase === 'KO').length;
  const groupSizes = groups.length ? groups.map((g) => g.players.length).join(' / ') : 'Sin grupos';
  const runningVersion = formatAppVersion(appPackage.version);
  const releaseTitle = `CaromChamps v${runningVersion} · Bracket, grupos y reportes institucionales`;
  const releaseSummary = `Versión activa v${runningVersion}: gestión de campeonatos múltiples, captura avanzada, Reporte 5, cierre deportivo/administrativo, llaves tabulares y continuas, ranking final y exportaciones institucionales CSV/PDF. Instancia inicial FECOBI / ASOBIGRIE.`;
  return E('div', { className: 'grid' },
    E('div', { className: 'grid grid-6' },
      E(Stat, { label: 'Campeonatos', value: championships.length || 1 }),
      E(Stat, { label: 'Jugadores activos', value: active }),
      E(Stat, { label: 'Grupos', value: groups.length || '-', hint: groupSizes }),
      E(Stat, { label: 'Partidas', value: matches.length, hint: `${completed} completadas · ${pending} pendientes` }),
      E(Stat, { label: 'Clasificados', value: seeds.length || '-', hint: `Objetivo ${championship.total_qualifiers_f2}` }),
      E(Stat, { label: 'KO', value: koCount || '-', hint: championship.status })
    ),
    E(Card, null,
      E('h2', null, releaseTitle),
      E('p', { className: 'small' }, releaseSummary),
      E('div', { className: 'grid grid-4', style: { marginTop: 14 } },
        E('div', { className: 'round-card' }, E('b', null, 'Cierre: '), 'FINALIZED / COMPLETED'),
        E('div', { className: 'round-card' }, E('b', null, 'Reporte 5: '), 'Sugerencia + confirmación'),
        E('div', { className: 'round-card' }, E('b', null, 'Captura: '), 'validación + masivo'),
        E('div', { className: 'round-card' }, E('b', null, 'Reportes: '), 'Grupo, bracket, ranking, acta')
      )
    )
  );
}

function cloneChampionship(championship, suffix = 'COPIA') {
  const nextId = `CH-${uid('NEW').slice(4, 10).toUpperCase()}`;
  return { ...championship, championship_id: nextId, name: `${championship.name} ${suffix}`, status: 'DRAFT', closed_at: '', closed_by: '', finalized_at: '', finalized_by: '', division_movements_confirmed: false, confirmation_note: '' };
}

function AppShell({ auth }) {
  window.ReactRuntime = React;
  const storageKey = userStorageKey(auth?.user);
  const saved = loadState(storageKey, auth?.profile?.role === 'ADMIN' ? STORAGE_KEY : '');
  const initialChampionship = saved?.championship || DEFAULT_CHAMPIONSHIP;
  const [players, setPlayers] = useState(saved?.players ? mergeDefaultPlayers(saved.players, DEFAULT_PLAYERS) : DEFAULT_PLAYERS.map(normalizeLegacyPlayerData));
  const [championship, setChampionship] = useState(initialChampionship);
  const [groups, setGroups] = useState(saved?.groups || []);
  const [matches, setMatches] = useState(saved?.matches || []);
  const [seeds, setSeeds] = useState(saved?.seeds || []);
  const [items, setItems] = useState(saved?.items || []);
  const initialHashTab = (() => { try { const value = new URLSearchParams(window.location.hash.replace(/^#/, '')).get('tab'); return value || 'grand'; } catch { return 'grand'; } })();
  const [tab, setTabState] = useState(initialHashTab);
  const setTab = (nextTab) => {
    const safeTab = String(nextTab || 'dashboard');
    setTabState(safeTab);
    try {
      const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      params.set('tab', safeTab);
      window.history.replaceState({ caromchamps: true, tab: safeTab }, '', `${window.location.pathname}#${params.toString()}`);
    } catch {}
  };
  const [menuCollapsed, setMenuCollapsed] = useState(false);
  const [activeId, setActiveId] = useState(saved?.activeId || initialChampionship.championship_id);
  const [championships, setChampionships] = useState(saved?.championships || [makeChampionshipSnapshot(initialChampionship, saved?.groups || [], saved?.matches || [], saved?.seeds || [])]);
  const [historyPlayerId, setHistoryPlayerId] = useState('');
  const [uiThemePreference, setUiThemePreference] = useState(() => {
    try { return localStorage.getItem(UI_THEME_KEY) || (initialChampionship.global_settings?.ui_theme === 'dark' ? 'dark' : 'light'); } catch { return initialChampionship.global_settings?.ui_theme === 'dark' ? 'dark' : 'light'; }
  });
  const [uxMode, setUxModeState] = useState(() => {
    try {
      const savedMode = localStorage.getItem(UX_MODE_KEY);
      return ['pro', 'guided', 'classic'].includes(savedMode) ? savedMode : 'pro';
    } catch { return 'pro'; }
  });
  const setUxMode = (mode) => {
    const next = ['pro', 'guided', 'classic'].includes(mode) ? mode : 'pro';
    setUxModeState(next);
    if (next === 'pro') setTab('grand');
    if (next !== 'pro' && ['grand', 'rankingHub'].includes(tab)) setTab('dashboard');
    try { localStorage.setItem(UX_MODE_KEY, next); } catch {}
  };
  const [syncStatus, setSyncStatus] = useState('Sincronización local activa');
  const [remoteReady, setRemoteReady] = useState(false);
  const didLoadRemote = useRef(false);
  const isRankingChampionship = (championship?.championship_type || 'NORMAL') === 'RANKING';


  useEffect(() => {
    const handleBrowserNavigation = () => {
      try {
        const value = new URLSearchParams(window.location.hash.replace(/^#/, '')).get('tab');
        if (value) setTabState(value);
        if (!window.location.hash) {
          window.history.replaceState({ caromchamps: true, tab }, '', `${window.location.pathname}#tab=${encodeURIComponent(tab || 'grand')}`);
        }
      } catch {}
    };
    window.addEventListener('hashchange', handleBrowserNavigation);
    window.addEventListener('popstate', handleBrowserNavigation);
    if (!window.location.hash) handleBrowserNavigation();
    return () => {
      window.removeEventListener('hashchange', handleBrowserNavigation);
      window.removeEventListener('popstate', handleBrowserNavigation);
    };
  }, [tab]);

  useEffect(() => {
    if (isRankingChampionship && RANKING_BLOCKED_TABS.has(tab)) setTab('ranking');
  }, [isRankingChampionship, tab]);

  useEffect(() => {
    const nextTheme = championship.global_settings?.ui_theme === 'dark' ? 'dark' : 'light';
    if (tab === 'config' && nextTheme !== uiThemePreference) {
      setUiThemePreference(nextTheme);
      try { localStorage.setItem(UI_THEME_KEY, nextTheme); } catch {}
    }
  }, [championship.global_settings?.ui_theme, tab, uiThemePreference]);

  useEffect(() => {
    if (uxMode !== 'pro' && ['grand', 'rankingHub'].includes(tab)) setTab('dashboard');
  }, [uxMode, tab]);


  useEffect(() => {
    const handler = (event) => {
      const target = event.target?.closest?.('.player-history-trigger');
      if (!target) return;
      const playerId = target.getAttribute('data-player-id');
      if (!playerId) return;
      event.preventDefault();
      event.stopPropagation();
      setHistoryPlayerId(playerId);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  useEffect(() => {
    if (!auth?.user?.id || didLoadRemote.current) return;
    didLoadRemote.current = true;
    loadUserAppState(auth.user.id).then(({ state, error }) => {
      if (error) {
        setSyncStatus(`Sincronización local activa. Supabase: ${error.message}`);
        setRemoteReady(true);
        return;
      }
      if (!state) {
        setSyncStatus('Sincronizado localmente. Pendiente primera copia en Supabase.');
        setRemoteReady(true);
        return;
      }
      setPlayers(state.players ? mergeDefaultPlayers(state.players, DEFAULT_PLAYERS) : DEFAULT_PLAYERS.map(normalizeLegacyPlayerData));
      setChampionship(state.championship || DEFAULT_CHAMPIONSHIP);
      setGroups(state.groups || []);
      setMatches(state.matches || []);
      setSeeds(state.seeds || []);
      setItems(state.items || []);
      setChampionships(state.championships || [makeChampionshipSnapshot(state.championship || DEFAULT_CHAMPIONSHIP, state.groups || [], state.matches || [], state.seeds || [])]);
      setActiveId(state.activeId || state.championship?.championship_id || DEFAULT_CHAMPIONSHIP.championship_id);
      setSyncStatus('Datos cargados desde Supabase.');
      setRemoteReady(true);
    });
  }, [auth?.user?.id]);

  useEffect(() => {
    setChampionships((prev) => {
      const snapshot = makeChampionshipSnapshot(championship, groups, matches, seeds);
      const exists = prev.some((row) => row.id === championship.championship_id);
      return exists ? prev.map((row) => row.id === championship.championship_id ? { ...row, ...snapshot } : row) : [...prev, snapshot];
    });
  }, [championship, groups, matches, seeds]);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ players, championship, groups, matches, seeds, items, championships, activeId }));
    } catch (error) {
      console.warn('No fue posible guardar el estado local. Revise tamaño de fotografías o almacenamiento del navegador.', error);
    }
  }, [players, championship, groups, matches, seeds, items, championships, activeId, storageKey]);

  useEffect(() => {
    if (!auth?.user?.id || !remoteReady) return;
    const state = { players, championship, groups, matches, seeds, items, championships, activeId };
    const timer = setTimeout(() => {
      saveUserAppState(auth.user.id, state).then(({ error }) => {
        setSyncStatus(error ? `No sincronizado con Supabase: ${error.message}` : `Sincronizado con Supabase · ${formatDateTimeEs(new Date())}`);
      });
    }, 1000);
    return () => clearTimeout(timer);
  }, [players, championship, groups, matches, seeds, items, championships, activeId, auth?.user?.id, remoteReady]);

  const audit = (type, detail) => setItems((prev) => [{ id: uid('A'), type, detail, timestamp: formatDateTimeEs(new Date()), championship_id: championship.championship_id }, ...prev]);

  const loadChampionship = (id, targetTab = 'dashboard') => {
    const row = championships.find((item) => item.id === id);
    if (!row) return;
    setChampionship(row.championship);
    setGroups(row.groups || []);
    setMatches(row.matches || []);
    setSeeds(row.seeds || []);
    setActiveId(id);
    setTab(targetTab);
  };

  const createChampionshipFromWizard = (form) => {
    const nextId = `CH-${uid('WIZ').slice(4, 10).toUpperCase()}`;
    const isRanking = (form.championship_type || 'NORMAL') === 'RANKING';
    const next = {
      ...DEFAULT_CHAMPIONSHIP,
      championship_id: nextId,
      name: String(form.name || (isRanking ? 'Nuevo Ranking' : 'Nuevo Campeonato')).trim(),
      championship_type: isRanking ? 'RANKING' : ((form.championship_type || 'NORMAL') === 'DOBLE_FASE_GRUPOS' ? 'DOBLE_FASE_GRUPOS' : 'NORMAL'),
      venue_name: form.venue_name || DEFAULT_CHAMPIONSHIP.venue_name,
      start_date: form.start_date || DEFAULT_CHAMPIONSHIP.start_date,
      end_date: form.end_date || form.start_date || DEFAULT_CHAMPIONSHIP.end_date,
      division_filter: form.division_filter || DEFAULT_CHAMPIONSHIP.division_filter,
      preferred_group_size: Number(form.preferred_group_size || DEFAULT_CHAMPIONSHIP.preferred_group_size),
      qualifiers_per_group: Number(form.qualifiers_per_group || DEFAULT_CHAMPIONSHIP.qualifiers_per_group),
      extra_qualifiers_count: Number(form.extra_qualifiers_count || DEFAULT_CHAMPIONSHIP.extra_qualifiers_count),
      total_qualifiers_f2: Number(form.total_qualifiers_f2 || DEFAULT_CHAMPIONSHIP.total_qualifiers_f2),
      ranking_max_championships: Number(form.ranking_max_championships || DEFAULT_CHAMPIONSHIP.ranking_max_championships),
      average_control_enabled: form.average_control_enabled !== 'NO',
      participant_ids: isRanking ? [] : DEFAULT_CHAMPIONSHIP.participant_ids,
      participant_seeds: isRanking ? {} : DEFAULT_CHAMPIONSHIP.participant_seeds,
      status: 'DRAFT',
      closed_at: '',
      closed_by: '',
      finalized_at: '',
      finalized_by: '',
      confirmation_note: ''
    };
    const snapshot = makeChampionshipSnapshot(next, [], [], []);
    setChampionship(next);
    setGroups([]);
    setMatches([]);
    setSeeds([]);
    setActiveId(next.championship_id);
    setChampionships((prev) => [...prev.filter((row) => row.id !== next.championship_id), snapshot]);
    setItems((prev) => [{ id: uid('A'), type: 'CHAMPIONSHIP_WIZARD_CREATED', detail: `Creado desde wizard: ${next.name}`, timestamp: formatDateTimeEs(new Date()), championship_id: next.championship_id }, ...prev]);
    setTab(isRanking ? 'ranking' : 'dashboard');
  };

  const createChampionship = () => {
    const next = cloneChampionship(DEFAULT_CHAMPIONSHIP, 'Nuevo');
    setChampionship(next);
    setGroups([]);
    setMatches([]);
    setSeeds([]);
    setActiveId(next.championship_id);
    setItems((prev) => [{ id: uid('A'), type: 'CHAMPIONSHIP_CREATED', detail: `Creado ${next.name}`, timestamp: formatDateTimeEs(new Date()), championship_id: next.championship_id }, ...prev]);
    setTab('setup');
  };

  const duplicateChampionship = () => {
    const next = cloneChampionship(championship, 'Copia');
    setChampionship(next);
    setGroups([]);
    setMatches([]);
    setSeeds([]);
    setActiveId(next.championship_id);
    setItems((prev) => [{ id: uid('A'), type: 'CHAMPIONSHIP_DUPLICATED', detail: `Duplicado desde ${championship.name}`, timestamp: formatDateTimeEs(new Date()), championship_id: next.championship_id }, ...prev]);
    setTab('setup');
  };

  const deleteChampionship = (id) => {
    if (id === activeId) return alert('No se puede eliminar el campeonato activo. Abra otro campeonato primero.');
    if (!window.confirm('¿Eliminar campeonato y todos sus datos locales?')) return;
    setChampionships(championships.filter((row) => row.id !== id));
  };

  const resetDemo = () => {
    localStorage.removeItem(storageKey);
    setPlayers(DEFAULT_PLAYERS);
    setChampionship(DEFAULT_CHAMPIONSHIP);
    setGroups([]);
    setMatches([]);
    setSeeds([]);
    setActiveId(DEFAULT_CHAMPIONSHIP.championship_id);
    setChampionships([makeChampionshipSnapshot(DEFAULT_CHAMPIONSHIP, [], [], [])]);
    setItems([{ id: uid('A'), type: 'RESET', detail: 'Demo reiniciada', timestamp: formatDateTimeEs(new Date()) }]);
    setTab('dashboard');
  };

  const runFullDemo = () => {
    const enrolled = getEligiblePlayers(championship, players);
    const count = Math.ceil(enrolled.length / Number(championship.preferred_group_size || 4));
    const cfg = { ...championship, total_qualifiers_f2: count * Number(championship.qualifiers_per_group || 0) + Number(championship.extra_qualifiers_count || 0), status: 'DEMO_READY' };
    const generatedGroups = generateGroups(cfg, enrolled);
    const groupMatches = autoFillMatches(generateRoundRobinMatches(cfg, generatedGroups), `${cfg.random_seed}-full-demo`);
    const qualified = qualify(groupStandings(generatedGroups, groupMatches, cfg), cfg);
    const koMatches = generateFullKnockoutDemo(cfg, qualified, groupMatches.length + 1, `${cfg.random_seed}-full-demo-ko`);
    const allMatches = scheduleMatches(cfg, [...groupMatches, ...koMatches]);
    setChampionship(cfg);
    setGroups(generatedGroups);
    setMatches(allMatches);
    setSeeds(qualified);
    setItems((prev) => [{ id: uid('A'), type: 'FULL_DEMO', detail: 'Flujo completo generado con resultados, clasificados, bracket y agenda.', timestamp: formatDateTimeEs(new Date()), championship_id: cfg.championship_id }, ...prev]);
    setTab('dashboard');
  };

  const clearOnlyResults = () => {
    setMatches(clearResults(matches));
    audit('CLEAR_RESULTS', 'Resultados borrados.');
  };

  const shareChampionship = async (rowId = activeId) => {
    const row = championships.find((item) => item.id === rowId) || makeChampionshipSnapshot(championship, groups, matches, seeds);
    const snapshot = { ...row, players, championship: row.championship || championship, groups: row.groups || groups, matches: row.matches || matches, seeds: row.seeds || seeds };
    const { data, error } = await createChampionshipShare({ userId: auth?.user?.id, championshipSnapshot: snapshot });
    if (error) { alert(`No fue posible generar el enlace: ${error.message}`); return; }
    const link = `${window.location.origin}/shared/championship/${data.token}`;
    try { await navigator.clipboard.writeText(link); } catch {}
    audit('SHARE_CREATED', `Enlace compartido generado para ${snapshot.name || championship.name}`);
    alert(`Enlace copiado para compartir:
${link}`);
  };

  const shared = { championship, setChampionship, players, setPlayers, groups, setGroups, matches, setMatches, seeds, setSeeds, audit };
  const uiTheme = uiThemePreference === 'dark' ? 'dark' : 'light';
  const isProWorkspaceTab = PRO_WORKSPACE_TAB_IDS.has(tab) || (isRankingChampionship && ['dashboard', 'setup', 'ranking', 'reports'].includes(tab));
  if (typeof window !== 'undefined') window.__CAROMCHAMPS_LANGUAGE__ = championship.global_settings?.language || 'es';

  return E('div', { className: `app-shell theme-${uiTheme} ${menuCollapsed ? 'menu-collapsed' : ''} ux-mode-${uxMode}` },
    E(Header, { championship, tab, setTab, collapsed: menuCollapsed, setCollapsed: setMenuCollapsed, auth, uxMode, setUxMode }),
    E('main', { className: 'main' },
      E(TopBar, { championship, auth, setTab, uxMode, setUxMode }),
      uxMode === 'guided' ? E(UxContextPanel, { championship, championships, tab, setTab }) : null,
      uxMode === 'pro' && isProWorkspaceTab ? E(ProWorkspaceTabs, { tab, setTab, championship }) : null,
      !isRankingChampionship && !(uxMode === 'pro' && !isProWorkspaceTab) ? E(Card, null,
        E('div', { className: 'toolbar' },
          E(Button, { onClick: runFullDemo, kind: 'success' }, 'Demo completa'),
          E(Button, { onClick: () => { setMatches(autoFillMatches(matches, 'quick-fill')); audit('QUICK_RESULTS', 'Resultados rápidos aplicados.'); }, kind: 'success' }, 'Resultados rápidos'),
          E(Button, { onClick: clearOnlyResults, kind: 'warning' }, 'Limpiar resultados'),
          E(Button, { onClick: resetDemo, kind: 'danger' }, 'Reiniciar demo')
        )
      ) : null,
      E('div', { className: 'sync-status' }, syncStatus),
      tab === 'grand' && uxMode === 'pro' && E(GrandDashboard, { championships, players, openChampionshipDashboard: (id) => loadChampionship(id, 'reports'), openPlayerHistory: setHistoryPlayerId }),
      tab === 'dashboard' && (uxMode === 'pro' ? E(ProChampionshipDashboard, { championship, players, groups, matches, seeds, championships, setTab, openPlayerHistory: setHistoryPlayerId }) : uxMode === 'guided' ? E(UxGuidedDashboard, { championship, players, groups, matches, seeds, championships, setTab }) : E(Dashboard, { championship, players, groups, matches, seeds, championships })),
      tab === 'championships' && (uxMode === 'pro' ? E(ProChampionshipHub, { type: 'NORMAL', championships, activeId, loadChampionship, createChampionshipFromWizard, duplicateChampionship, deleteChampionship, shareChampionship }) : E(ChampionshipsModule, { championships, activeId, loadChampionship, createChampionship, duplicateChampionship, deleteChampionship, championship, groups, matches, seeds, shareChampionship })),
      tab === 'rankingHub' && uxMode === 'pro' && E(ProChampionshipHub, { type: 'RANKING', championships, activeId, loadChampionship, createChampionshipFromWizard, duplicateChampionship, deleteChampionship, shareChampionship }),
      tab === 'players' && E(PlayersModule, shared),
      tab === 'setup' && E(SetupModule, { championship, setChampionship, players, championships, activeId }),
      tab === 'groups' && E(GroupsModule, shared),
      tab === 'groupsF2' && E(GroupsF2Module, shared),
      tab === 'schedule' && E(ScheduleModule, { championship, setChampionship, players, matches, setMatches, seeds, audit }),
      tab === 'matches' && E(CaptureModule, { championship, players, matches, setMatches, audit }),
      tab === 'ko' && E(BracketModule, { championship, players, matches, setMatches, seeds, audit }),
      tab === 'reports' && E(ReportsModule, { players, matches, groups, seeds, championship }),
      tab === 'ranking' && E(RankingModule, { championship, championships, players, openChampionshipTab: loadChampionship }),
      tab === 'config' && E(ConfigurationModule, { championship, setChampionship }),
      tab === 'admin' && E(MaintenanceModule, { championship, setChampionship }),
      tab === 'officials' && E(OfficialsModule, { championship, setChampionship, players, matches }),
      tab === 'close' && E(CloseTournamentModule, { championship, setChampionship, players, setPlayers, matches, setMatches, seeds, audit }),
      tab === 'audit' && E(AuditModule, { items }),
      tab === 'profile' && E(ProfileSettings, { auth, onProfileUpdated: auth?.updateProfile })
    ),
    historyPlayerId ? E(PlayerHistoryModal, {
      player: players.find((p) => p.player_id === historyPlayerId),
      players,
      matches,
      championship,
      championships,
      onClose: () => setHistoryPlayerId('')
    }) : null
  );
}

export default function App() {
  return E(AppErrorBoundary, null,
    E(AuthGate, { render: (auth) => {
      const token = sharedTokenFromLocation();
      if (token) return E(SharedChampionshipView, { token, auth });
      return E(AppShell, { key: auth.user?.id, auth });
    } })
  );
}
