/**
 * Localization Service (i18n)
 * Manages translations and language settings
 */

export type Locale = 'en' | 'es' | 'fr' | 'de' | 'ja' | 'zh' | 'ko' | 'pt' | 'ru' | 'it';

export interface LocaleInfo {
  code: Locale;
  name: string;
  nativeName: string;
  direction: 'ltr' | 'rtl';
}

export const SUPPORTED_LOCALES: LocaleInfo[] = [
  { code: 'en', name: 'English', nativeName: 'English', direction: 'ltr' },
  { code: 'es', name: 'Spanish', nativeName: 'Espanol', direction: 'ltr' },
  { code: 'fr', name: 'French', nativeName: 'Francais', direction: 'ltr' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', direction: 'ltr' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', direction: 'ltr' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', direction: 'ltr' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', direction: 'ltr' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Portugues', direction: 'ltr' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', direction: 'ltr' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', direction: 'ltr' },
];

type TranslationKey = string;
type TranslationValue = string | Record<string, string>;

interface Translations {
  [key: TranslationKey]: TranslationValue;
}

// English translations (default)
const EN_TRANSLATIONS: Translations = {
  // App
  'app.name': 'PromptPlay',
  'app.loading': 'Loading...',

  // File menu
  'file.new': 'New Project',
  'file.open': 'Open Project',
  'file.save': 'Save',
  'file.saveAs': 'Save As',
  'file.export': 'Export',
  'file.recentProjects': 'Recent Projects',

  // Edit menu
  'edit.undo': 'Undo',
  'edit.redo': 'Redo',
  'edit.cut': 'Cut',
  'edit.copy': 'Copy',
  'edit.paste': 'Paste',
  'edit.delete': 'Delete',
  'edit.selectAll': 'Select All',
  'edit.duplicate': 'Duplicate',

  // View
  'view.2dMode': '2D Mode',
  'view.3dMode': '3D Mode',
  'view.showGrid': 'Show Grid',
  'view.showDebug': 'Show Debug',
  'view.zoomIn': 'Zoom In',
  'view.zoomOut': 'Zoom Out',
  'view.resetZoom': 'Reset Zoom',

  // Panels
  'panel.files': 'Files',
  'panel.scenes': 'Scenes',
  'panel.entities': 'Entities',
  'panel.prefabs': 'Prefabs',
  'panel.assets': 'Assets',
  'panel.tilemap': 'Tilemap',
  'panel.inspector': 'Inspector',
  'panel.json': 'JSON',
  'panel.physics': 'Physics',
  'panel.scripts': 'Scripts',

  // Editor modes
  'mode.game': 'Game',
  'mode.code': 'Code',
  'mode.nodes': 'Nodes',
  'mode.shaders': 'Shaders',
  'mode.behavior': 'Behavior',
  'mode.states': 'States',

  // Actions
  'action.play': 'Play',
  'action.stop': 'Stop',
  'action.pause': 'Pause',
  'action.createEntity': 'Create Entity',
  'action.deleteEntity': 'Delete Entity',
  'action.addComponent': 'Add Component',
  'action.removeComponent': 'Remove Component',

  // Templates
  'template.platformer': 'Platformer',
  'template.shooter': 'Top-down Shooter',
  'template.puzzle': 'Puzzle Game',
  'template.rpg': 'RPG',
  'template.racing': 'Racing Game',
  'template.empty': 'Empty Project',

  // Dialogs
  'dialog.confirm': 'Confirm',
  'dialog.cancel': 'Cancel',
  'dialog.save': 'Save',
  'dialog.discard': 'Discard',
  'dialog.unsavedChanges': 'You have unsaved changes. Do you want to save before closing?',

  // Notifications
  'notification.saved': 'Project saved',
  'notification.exported': 'Project exported',
  'notification.entityCreated': 'Entity created',
  'notification.entityDeleted': 'Entity deleted',
  'notification.error': 'An error occurred',

  // Components
  'component.transform': 'Transform',
  'component.sprite': 'Sprite',
  'component.collider': 'Collider',
  'component.rigidbody': 'Rigidbody',
  'component.input': 'Input',
  'component.velocity': 'Velocity',
  'component.audio': 'Audio',
  'component.animation': 'Animation',
  'component.particle': 'Particle',
  'component.light': 'Light',
  'component.camera': 'Camera',
  'component.script': 'Script',

  // Settings
  'settings.general': 'General',
  'settings.editor': 'Editor',
  'settings.keyboard': 'Keyboard Shortcuts',
  'settings.appearance': 'Appearance',
  'settings.language': 'Language',
  'settings.performance': 'Performance',
  'settings.about': 'About',

  // Help
  'help.documentation': 'Documentation',
  'help.tutorials': 'Tutorials',
  'help.shortcuts': 'Keyboard Shortcuts',
  'help.reportBug': 'Report Bug',
  'help.about': 'About PromptPlay',

  // Multiplayer
  'multiplayer.connect': 'Connect',
  'multiplayer.disconnect': 'Disconnect',
  'multiplayer.createLobby': 'Create Lobby',
  'multiplayer.joinLobby': 'Join Lobby',
  'multiplayer.players': 'Players',
  'multiplayer.latency': 'Latency',

  // Export
  'export.html': 'Export as HTML',
  'export.pwa': 'Export as PWA',
  'export.desktop': 'Export for Desktop',
  'export.mobile': 'Export for Mobile',
};

// Spanish translations
const ES_TRANSLATIONS: Translations = {
  'app.name': 'PromptPlay',
  'app.loading': 'Cargando...',
  'file.new': 'Nuevo Proyecto',
  'file.open': 'Abrir Proyecto',
  'file.save': 'Guardar',
  'file.saveAs': 'Guardar Como',
  'file.export': 'Exportar',
  'file.recentProjects': 'Proyectos Recientes',
  'edit.undo': 'Deshacer',
  'edit.redo': 'Rehacer',
  'edit.cut': 'Cortar',
  'edit.copy': 'Copiar',
  'edit.paste': 'Pegar',
  'edit.delete': 'Eliminar',
  'edit.selectAll': 'Seleccionar Todo',
  'edit.duplicate': 'Duplicar',
  'action.play': 'Reproducir',
  'action.stop': 'Detener',
  'action.pause': 'Pausar',
  'notification.saved': 'Proyecto guardado',
  'notification.error': 'Ha ocurrido un error',
};

// Japanese translations
const JA_TRANSLATIONS: Translations = {
  'app.name': 'PromptPlay',
  'app.loading': '読み込み中...',
  'file.new': '新規プロジェクト',
  'file.open': 'プロジェクトを開く',
  'file.save': '保存',
  'file.saveAs': '名前を付けて保存',
  'file.export': 'エクスポート',
  'file.recentProjects': '最近のプロジェクト',
  'edit.undo': '元に戻す',
  'edit.redo': 'やり直す',
  'edit.cut': '切り取り',
  'edit.copy': 'コピー',
  'edit.paste': '貼り付け',
  'edit.delete': '削除',
  'edit.selectAll': 'すべて選択',
  'edit.duplicate': '複製',
  'action.play': '再生',
  'action.stop': '停止',
  'action.pause': '一時停止',
  'notification.saved': 'プロジェクトを保存しました',
  'notification.error': 'エラーが発生しました',
};

// Chinese translations
const ZH_TRANSLATIONS: Translations = {
  'app.name': 'PromptPlay',
  'app.loading': '加载中...',
  'file.new': '新建项目',
  'file.open': '打开项目',
  'file.save': '保存',
  'file.saveAs': '另存为',
  'file.export': '导出',
  'file.recentProjects': '最近项目',
  'edit.undo': '撤销',
  'edit.redo': '重做',
  'edit.cut': '剪切',
  'edit.copy': '复制',
  'edit.paste': '粘贴',
  'edit.delete': '删除',
  'edit.selectAll': '全选',
  'edit.duplicate': '复制',
  'action.play': '播放',
  'action.stop': '停止',
  'action.pause': '暂停',
  'notification.saved': '项目已保存',
  'notification.error': '发生错误',
};

const TRANSLATIONS: Record<Locale, Translations> = {
  en: EN_TRANSLATIONS,
  es: { ...EN_TRANSLATIONS, ...ES_TRANSLATIONS },
  fr: EN_TRANSLATIONS, // Fallback to English
  de: EN_TRANSLATIONS,
  ja: { ...EN_TRANSLATIONS, ...JA_TRANSLATIONS },
  zh: { ...EN_TRANSLATIONS, ...ZH_TRANSLATIONS },
  ko: EN_TRANSLATIONS,
  pt: EN_TRANSLATIONS,
  ru: EN_TRANSLATIONS,
  it: EN_TRANSLATIONS,
};

class LocalizationService {
  private locale: Locale = 'en';
  private listeners: Set<(locale: Locale) => void> = new Set();

  constructor() {
    this.loadSavedLocale();
  }

  private loadSavedLocale(): void {
    const saved = localStorage.getItem('promptplay_locale') as Locale | null;
    if (saved && SUPPORTED_LOCALES.some(l => l.code === saved)) {
      this.locale = saved;
    } else {
      // Try to detect from browser
      const browserLang = navigator.language.split('-')[0] as Locale;
      if (SUPPORTED_LOCALES.some(l => l.code === browserLang)) {
        this.locale = browserLang;
      }
    }
    this.applyLocale();
  }

  private applyLocale(): void {
    const localeInfo = SUPPORTED_LOCALES.find(l => l.code === this.locale);
    if (localeInfo) {
      document.documentElement.dir = localeInfo.direction;
      document.documentElement.lang = localeInfo.code;
    }
  }

  getLocale(): Locale {
    return this.locale;
  }

  getLocaleInfo(): LocaleInfo {
    return SUPPORTED_LOCALES.find(l => l.code === this.locale) || SUPPORTED_LOCALES[0];
  }

  getSupportedLocales(): LocaleInfo[] {
    return [...SUPPORTED_LOCALES];
  }

  setLocale(locale: Locale): void {
    if (SUPPORTED_LOCALES.some(l => l.code === locale)) {
      this.locale = locale;
      localStorage.setItem('promptplay_locale', locale);
      this.applyLocale();
      this.listeners.forEach(listener => listener(locale));
    }
  }

  t(key: string, params?: Record<string, string | number>): string {
    const translations = TRANSLATIONS[this.locale] || TRANSLATIONS.en;
    let value = (translations[key] as string) || (EN_TRANSLATIONS[key] as string) || key;

    // Replace parameters
    if (params) {
      Object.entries(params).forEach(([param, val]) => {
        value = value.replace(new RegExp(`{${param}}`, 'g'), String(val));
      });
    }

    return value;
  }

  subscribe(listener: (locale: Locale) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

export const i18n = new LocalizationService();

// React hook for localization
export function useLocalization() {
  return {
    t: i18n.t.bind(i18n),
    locale: i18n.getLocale(),
    setLocale: i18n.setLocale.bind(i18n),
    supportedLocales: i18n.getSupportedLocales(),
  };
}

export default i18n;
