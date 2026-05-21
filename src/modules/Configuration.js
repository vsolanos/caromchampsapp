import { useEffect, useState } from 'react';
import { E, Card, Button, Field, Input, Select, SectionTitle } from '../components/ui.js';
import { fmtAvg, num } from '../lib/tournament.js';

const PDF_PAGE_SIZE_OPTIONS = ['A4', 'A3', 'Letter', 'Legal'];
const PDF_ORIENTATION_OPTIONS = [
  ['portrait', 'Vertical'],
  ['landscape', 'Horizontal']
];

function setting(championship, key, fallback) {
  return championship.global_settings?.[key] ?? fallback;
}

export function ConfigurationModule({ championship, setChampionship }) {
  const settings = {
    avg_threshold_1ra: setting(championship, 'avg_threshold_1ra', 0.800),
    avg_threshold_2da: setting(championship, 'avg_threshold_2da', 0.450),
    min_matches_for_reclassification: setting(championship, 'min_matches_for_reclassification', championship.minimum_matches_for_avg_close || 0),
    timezone: setting(championship, 'timezone', 'America/Costa_Rica'),
    pdf_default_page_size: setting(championship, 'pdf_default_page_size', 'A4'),
    pdf_default_orientation: setting(championship, 'pdf_default_orientation', 'portrait'),
    ui_theme: setting(championship, 'ui_theme', 'light'),
    language: setting(championship, 'language', 'es')
  };
  const [avgDrafts, setAvgDrafts] = useState({
    avg_threshold_1ra: fmtAvg(settings.avg_threshold_1ra),
    avg_threshold_2da: fmtAvg(settings.avg_threshold_2da)
  });

  useEffect(() => {
    setAvgDrafts({
      avg_threshold_1ra: fmtAvg(setting(championship, 'avg_threshold_1ra', 0.800)),
      avg_threshold_2da: fmtAvg(setting(championship, 'avg_threshold_2da', 0.450))
    });
  }, [championship.global_settings?.avg_threshold_1ra, championship.global_settings?.avg_threshold_2da]);

  const patchSetting = (key, value) => setChampionship({
    ...championship,
    global_settings: { ...(championship.global_settings || {}), [key]: value }
  });

  const commitAvg = (key) => {
    const value = num(avgDrafts[key], 0);
    const fixed = fmtAvg(value);
    setAvgDrafts((prev) => ({ ...prev, [key]: fixed }));
    patchSetting(key, Number(fixed));
  };

  const resetDefaults = () => setChampionship({
    ...championship,
    global_settings: {
      ...(championship.global_settings || {}),
      avg_threshold_1ra: 0.800,
      avg_threshold_2da: 0.450,
      min_matches_for_reclassification: 0,
      timezone: 'America/Costa_Rica',
      pdf_default_page_size: 'A4',
      pdf_default_orientation: 'portrait',
      ui_theme: 'light',
      language: 'es'
    }
  });

  return E('div', { className: 'grid' },
    E(Card, null,
      E(SectionTitle, { title: 'Configuración general', subtitle: 'Parámetros que afectan reglas globales, cierre administrativo, reclasificación y reportes de la aplicación.' }),
      E('div', { className: 'grid grid-3', style: { marginTop: 14 } },
        E(Field, { label: 'Umbral para mantenerse / ascender a Primera', hint: 'Ejemplo: 0.800. Se usa en Reporte 5 y cierre administrativo.' },
          E(Input, { type: 'text', inputMode: 'decimal', value: avgDrafts.avg_threshold_1ra, onChange: (e) => setAvgDrafts({ ...avgDrafts, avg_threshold_1ra: e.target.value }), onBlur: () => commitAvg('avg_threshold_1ra'), placeholder: '0.800' })
        ),
        E(Field, { label: 'Umbral para mantenerse / ascender a Segunda', hint: 'Ejemplo: 0.450. Valores menores sugieren Tercera.' },
          E(Input, { type: 'text', inputMode: 'decimal', value: avgDrafts.avg_threshold_2da, onChange: (e) => setAvgDrafts({ ...avgDrafts, avg_threshold_2da: e.target.value }), onBlur: () => commitAvg('avg_threshold_2da'), placeholder: '0.450' })
        ),
        E(Field, { label: 'Mínimo partidas para reclasificación', hint: '0 significa sin mínimo obligatorio.' },
          E(Input, { type: 'number', value: settings.min_matches_for_reclassification, onChange: (e) => patchSetting('min_matches_for_reclassification', num(e.target.value, 0)) })
        ),
        E(Field, { label: 'Zona horaria oficial' },
          E(Input, { value: settings.timezone, onChange: (e) => patchSetting('timezone', e.target.value) })
        ),
        E(Field, { label: 'Tamaño PDF por defecto', hint: 'Se aplica automáticamente en Grupos, Llaves, Reportes y Cierre.' },
          E(Select, { value: settings.pdf_default_page_size, onChange: (e) => patchSetting('pdf_default_page_size', e.target.value) }, PDF_PAGE_SIZE_OPTIONS.map((option) => E('option', { key: option, value: option }, option)))
        ),
        E(Field, { label: 'Orientación PDF por defecto', hint: 'Se aplica automáticamente en todos los controles de impresión.' },
          E(Select, { value: settings.pdf_default_orientation, onChange: (e) => patchSetting('pdf_default_orientation', e.target.value) }, PDF_ORIENTATION_OPTIONS.map(([value, label]) => E('option', { key: value, value }, label)))
        ),
        E(Field, { label: 'Tema visual de la aplicación', hint: 'Claro será el modo inicial por defecto.' },
          E(Select, { value: settings.ui_theme, onChange: (e) => patchSetting('ui_theme', e.target.value) },
            E('option', { value: 'light' }, 'Modo claro'),
            E('option', { value: 'dark' }, 'Modo oscuro')
          )
        ),
        E(Field, { label: 'Idioma de fechas y plataforma', hint: 'Afecta fechas en pantalla y reportes.' },
          E(Select, { value: settings.language, onChange: (e) => patchSetting('language', e.target.value) },
            E('option', { value: 'es' }, 'Español'),
            E('option', { value: 'en' }, 'English'),
            E('option', { value: 'ko' }, '한국어')
          )
        )
      ),
      E('div', { className: 'toolbar', style: { marginTop: 16 } },
        E(Button, { onClick: resetDefaults, kind: 'soft' }, 'Restaurar valores sugeridos')
      )
    ),
    E(Card, null,
      E(SectionTitle, { title: 'Resumen de rangos activos', subtitle: 'Vista rápida de los parámetros actualmente aplicados.' }),
      E('div', { className: 'grid grid-3', style: { marginTop: 14 } },
        E('div', { className: 'round-card' }, E('b', null, 'Primera División'), E('p', { className: 'small' }, `AVG mínimo: ${fmtAvg(settings.avg_threshold_1ra)}`)),
        E('div', { className: 'round-card' }, E('b', null, 'Segunda División'), E('p', { className: 'small' }, `AVG mínimo: ${fmtAvg(settings.avg_threshold_2da)}`)),
        E('div', { className: 'round-card' }, E('b', null, 'Tercera División'), E('p', { className: 'small' }, `AVG menor a ${fmtAvg(settings.avg_threshold_2da)}`)),
        E('div', { className: 'round-card config-summary-card' }, E('b', null, 'Tema activo'), E('p', { className: 'small' }, settings.ui_theme === 'light' ? 'Modo claro' : 'Modo oscuro'))
      )
    )
  );
}
