export type Language = 'en' | 'es';

export interface Translations {
  // Navigation
  nav: {
    brief: string;
    digest: string;
    feeds: string;
    discover: string;
    settings: string;
  };

  // App header
  app: {
    offline: string;
    langLabel: string;
  };

  // Home / Brief view
  brief: {
    topStories: string;
    feedsUpdated: (count: number, time: string) => string;
    noFeedsTitle: string;
    noFeedsBody: string;
    noArticles: string;
    fetching: string;
  };

  // Feeds / category view
  feeds: {
    articles: (n: number) => string;
    loadMore: (n: number) => string;
    remaining: (n: number) => string;
    allShown: (n: number) => string;
    noArticles: string;
    noFeedsTitle: string;
    noFeedsBody: string;
    allCategories: string;
    /** @deprecated — category names are now user-defined strings stored in the DB.
     *  These keys remain for backward display compatibility during Phase 1.
     *  They will be removed in Phase 3. */
    categories: Record<string, string>;
  };

  // Discover view
  discover: {
    title: string;
    subtitle: string;
    placeholder: string;
    search: string;
    searching: string;
    noResults: string;
    emptyHint: string;
    poweredBy: string;
    subscribers: (n: number) => string;
    adding: string;
    add: string;
    added: string;
    recommendedTitle: string;
    recommendedSubtitle: string;
    showMore: string;
    showLess: string;
    allLanguages: string;
    yourLanguage: string;
  };

  // Settings view
  settings: {
    title: string;
    importTitle: string;
    importDesc: string;
    importBtn: string;
    importing: string;
    addTitle: string;
    addDesc: string;
    addPlaceholder: string;
    checking: string;
    add: string;
    feedsTitle: (active: number, total: number) => string;
    noFeeds: string;
    exportTitle: string;
    exportDesc: string;
    exportOpml: string;
    exportJson: string;
    importJsonBtn: string;
    importingJson: string;
    importJsonDesc: string;
    removeDialog: {
      title: string;
      description: (name: string) => string;
      cancel: string;
      confirm: string;
    };
  };

  // Category management UI
  categoryManager: {
    title: string;
    manageBtn: string;
    sectionDesc: string;
    addTitle: string;
    namePlaceholder: string;
    nameRequired: string;
    nameTooLong: string;
    nameDuplicate: string;
    maxReached: string;
    defaultBadge: string;
    cannotDelete: string;
    feedCount: (n: number) => string;
    deleteTitle: string;
    deleteDesc: (name: string) => string;
    moveTo: string;
    confirmDelete: string;
    cancelDelete: string;
    createdToast: (name: string) => string;
    updatedToast: (name: string) => string;
    deletedToast: (name: string) => string;
    add: string;
    save: string;
    cancel: string;
    iconLabel: string;
    colorLabel: string;
  };

  // Onboarding flow
  onboarding: {
    step: (current: number, total: number) => string;
    skip: string;
    skipIntro: string;
    steps: [
      { title: string; subtitle: string; cta: string },
      { title: string; subtitle: string; cta: string },
      { title: string; subtitle: string; cta: string },
      { title: string; subtitle: string; cta: string },
    ];
    // Categories illustration interactive hint
    tapHint: string;
    // Feeds illustration card labels
    feedsImportLabel: string;
    feedsImportDesc: string;
    feedsDiscoverLabel: string;
    feedsDiscoverDesc: string;
    feedsPasteLabel: string;
    feedsPasteDesc: string;
    // Settings entry
    replayTitle: string;
    replayDesc: string;
  };

  // Install prompt (Android banner + iOS guidance sheet)
  install: {
    title: string;
    subtitle: string;
    install: string;
    dismiss: string;
    iosTitle: string;
    iosSubtitle: string;
    iosStep1: string;
    iosStep2: string;
    iosStep3: string;
  };

  // Digest view
  digest: {
    title: string;
    updatedAt: (time: string) => string;
    stories: (n: number) => string;
    unnamedCluster: string;
    showMore: (n: number) => string;
    showLess: string;
    emptyTitle: string;
    emptyBody: string;
    errorTitle: string;
    retry: string;
    fallbackNotice: string;
  };

  // Common actions
  common: {
    refresh: string;
    error: string;
    empty: string;
    loading: string;
  };

  // Offline banner
  offline: {
    message: string;
    cached: (time: string) => string;
    noCache: string;
    timeAgo: {
      fewMinutes: string;
      oneHour: string;
      hours: (n: number) => string;
      days: (n: number) => string;
    };
  };

  // Article time-ago labels (compact, used in ArticleCard)
  timeAgo: {
    justNow: string;
    minutes: (n: number) => string;
    hours: (n: number) => string;
    days: (n: number) => string;
  };

  // Home time-ago labels (verbose, used in Brief header)
  syncTime: {
    justNow: string;
    minutesAgo: (n: number) => string;
  };
}

const en: Translations = {
  nav: {
    brief: 'Brief',
    digest: 'Digest',
    feeds: 'Feeds',
    discover: 'Discover',
    settings: 'Settings',
  },
  app: {
    offline: 'Offline',
    langLabel: 'Language',
  },
  brief: {
    topStories: 'Top Stories',
    feedsUpdated: (count, time) => `${count} feeds · updated ${time}`,
    noFeedsTitle: 'No feeds yet',
    noFeedsBody: 'Head to Settings to import an OPML file, or use Discover to find feeds.',
    noArticles: 'No articles yet. Try refreshing.',
    fetching: 'Fetching your brief…',
  },
  feeds: {
    articles: (n) => `${n} article${n !== 1 ? 's' : ''}`,
    loadMore: (n) => `Load ${n} more`,
    remaining: (n) => `${n} remaining`,
    allShown: (n) => `All ${n} articles shown`,
    noArticles: 'No articles yet. Try refreshing.',
    noFeedsTitle: 'No feeds yet',
    noFeedsBody: 'Head to Settings to import an OPML file, or use Discover to find feeds.',
    allCategories: 'All Categories',
    categories: {
      chile: 'Chile',
      global: 'Global',
      tech: 'Tech',
      custom: 'Custom',
    },
  },
  discover: {
    title: 'Discover Feeds',
    subtitle: 'Search for RSS feeds by topic, publication, or website name.',
    placeholder: 'e.g. BBC, TechCrunch, AI, economics…',
    search: 'Search',
    searching: 'Searching…',
    noResults: 'No feeds found. Try a different search term.',
    emptyHint: 'Search for any topic or publication to find RSS feeds.',
    poweredBy: 'Powered by Feedly',
    subscribers: (n) => n >= 1000 ? `${Math.round(n / 1000)}k subscribers` : `${n} subscribers`,
    adding: 'Adding…',
    add: 'Add',
    added: 'Added',
    recommendedTitle: 'Recommended for you',
    recommendedSubtitle: 'Curated feeds matched to your language',
    showMore: 'Show more',
    showLess: 'Show less',
    allLanguages: 'All languages',
    yourLanguage: 'Your language',
  },
  settings: {
    title: 'Settings',
    importTitle: 'Import Feeds',
    importDesc: 'Upload an OPML file to add RSS feeds. Categories are inferred from folder names.',
    importBtn: 'Import OPML',
    importing: 'Importing…',
    addTitle: 'Add a Feed',
    addDesc: 'Paste any RSS/Atom URL or website address — the feed will be auto-detected.',
    addPlaceholder: 'https://example.com/feed or https://example.com',
    checking: 'Checking…',
    add: 'Add',
    feedsTitle: (active, total) => `Feeds (${active} of ${total} active)`,
    noFeeds: 'No feeds imported yet.',
    exportTitle: 'Export Feeds',
    exportDesc: 'Download your feeds as OPML (compatible with any RSS reader) or as a JSON backup.',
    exportOpml: 'Export OPML',
    exportJson: 'Export JSON',
    importJsonBtn: 'Import JSON',
    importingJson: 'Importing…',
    importJsonDesc: 'Restore feeds and categories from a Daily Brief JSON backup.',
    removeDialog: {
      title: 'Remove feed?',
      description: (name) => `"${name}" will be removed from your feeds. This cannot be undone.`,
      cancel: 'Cancel',
      confirm: 'Remove',
    },
  },
  categoryManager: {
    title: 'Manage Categories',
    manageBtn: 'Manage Categories',
    sectionDesc: 'Create, rename, reorder, or delete your feed categories.',
    addTitle: 'New Category',
    namePlaceholder: 'Category name',
    nameRequired: 'Name is required.',
    nameTooLong: 'Name too long (max 30 chars).',
    nameDuplicate: 'A category with this name already exists.',
    maxReached: 'Maximum 20 categories reached.',
    defaultBadge: 'Default',
    cannotDelete: 'Default categories cannot be deleted.',
    feedCount: (n) => `${n} feed${n !== 1 ? 's' : ''}`,
    deleteTitle: 'Delete category?',
    deleteDesc: (name) => `"${name}" will be deleted. Move its feeds to:`,
    moveTo: 'Move feeds to…',
    confirmDelete: 'Delete',
    cancelDelete: 'Cancel',
    createdToast: (name) => `Category "${name}" created.`,
    updatedToast: (name) => `Category "${name}" updated.`,
    deletedToast: (name) => `Category "${name}" deleted.`,
    add: 'Add',
    save: 'Save',
    cancel: 'Cancel',
    iconLabel: 'Icon',
    colorLabel: 'Color',
  },
  onboarding: {
    step: (current, total) => `${current} / ${total}`,
    skip: 'Skip',
    skipIntro: 'Skip introduction',
    tapHint: '↑ tap a category above to try it',
    feedsImportLabel: 'Import OPML',
    feedsImportDesc: 'Bring feeds from any reader',
    feedsDiscoverLabel: 'Discover Feeds',
    feedsDiscoverDesc: 'Search by topic or publication',
    feedsPasteLabel: 'Paste a URL',
    feedsPasteDesc: 'Auto-detects RSS or Atom feeds',
    replayTitle: 'Replay introduction',
    replayDesc: 'See the app walkthrough again',
    steps: [
      {
        title: 'Stay informed,\nnot overwhelmed',
        subtitle: 'Daily Brief brings your news sources together — organized by topic, refreshed daily, readable in minutes.',
        cta: 'Get Started',
      },
      {
        title: 'Navigate by topic',
        subtitle: 'Tap a category pill to switch your feed instantly. Tap "All" to browse every category at once.',
        cta: 'Next',
      },
      {
        title: 'Scan. Tap. Read.',
        subtitle: 'Browse headlines at a glance. Tap any article to open it. Your brief is always ranked freshest-first.',
        cta: 'Next',
      },
      {
        title: 'Add your sources',
        subtitle: 'Import an OPML file from your existing reader, search Discover for new feeds, or paste any RSS/Atom URL.',
        cta: 'Start Reading',
      },
    ],
  },
  install: {
    title: 'Add to Home Screen',
    subtitle: 'Install Daily Brief for quick access and offline reading.',
    install: 'Install',
    dismiss: 'Not now',
    iosTitle: 'Install Daily Brief',
    iosSubtitle: 'Add to your home screen in 3 steps',
    iosStep1: 'Tap the Share button at the bottom of Safari.',
    iosStep2: 'Scroll down and tap "Add to Home Screen".',
    iosStep3: 'Tap "Add" to confirm. Done!',
  },
  digest: {
    title: 'Daily Digest',
    updatedAt: (time) => `Updated ${time}`,
    stories: (n) => `${n} ${n === 1 ? 'story' : 'stories'}`,
    unnamedCluster: 'Cluster',
    showMore: (n) => `Show ${n} more`,
    showLess: 'Show less',
    emptyTitle: 'Digest not ready yet',
    emptyBody: 'The AI digest builds daily at 06:00 UTC. Check back shortly, or refresh to trigger a build.',
    errorTitle: 'Could not load digest',
    retry: 'Try again',
    fallbackNotice: 'AI digest is unavailable (Worker not configured). Showing your top ranked articles instead.',
  },
  common: {
    refresh: 'Refresh',
    error: 'Something went wrong.',
    empty: 'Nothing here yet.',
    loading: 'Loading…',
  },
  offline: {
    message: "You're offline.",
    cached: (time) => `Showing cached data from ${time}.`,
    noCache: 'No cached data available.',
    timeAgo: {
      fewMinutes: 'a few minutes ago',
      oneHour: '1 hour ago',
      hours: (n) => `${n} hours ago`,
      days: (n) => `${Math.floor(n)} days ago`,
    },
  },
  timeAgo: {
    justNow: 'just now',
    minutes: (n) => `${n}m`,
    hours: (n) => `${n}h`,
    days: (n) => `${n}d`,
  },
  syncTime: {
    justNow: 'just now',
    minutesAgo: (n) => `${n}m ago`,
  },
};

const es: Translations = {
  nav: {
    brief: 'Resumen',
    digest: 'Digest',
    feeds: 'Fuentes',
    discover: 'Explorar',
    settings: 'Ajustes',
  },
  app: {
    offline: 'Sin conexión',
    langLabel: 'Idioma',
  },
  brief: {
    topStories: 'Principales noticias',
    feedsUpdated: (count, time) => `${count} fuentes · actualizado ${time}`,
    noFeedsTitle: 'Sin fuentes aún',
    noFeedsBody: 'Ve a Ajustes para importar un archivo OPML, o usa Explorar para encontrar fuentes.',
    noArticles: 'Sin artículos aún. Intenta actualizar.',
    fetching: 'Cargando tu resumen…',
  },
  feeds: {
    articles: (n) => `${n} artículo${n !== 1 ? 's' : ''}`,
    loadMore: (n) => `Cargar ${n} más`,
    remaining: (n) => `${n} restantes`,
    allShown: (n) => `Se muestran los ${n} artículos`,
    noArticles: 'Sin artículos aún. Intenta actualizar.',
    noFeedsTitle: 'Sin fuentes aún',
    noFeedsBody: 'Ve a Ajustes para importar un archivo OPML, o usa Explorar para encontrar fuentes.',
    allCategories: 'Todas las categorías',
    categories: {
      chile: 'Chile',
      global: 'Global',
      tech: 'Tecnología',
      custom: 'Personalizado',
    },
  },
  discover: {
    title: 'Explorar fuentes',
    subtitle: 'Busca feeds RSS por tema, publicación o nombre de sitio web.',
    placeholder: 'ej. BBC, TechCrunch, IA, economía…',
    search: 'Buscar',
    searching: 'Buscando…',
    noResults: 'No se encontraron fuentes. Intenta con otro término.',
    emptyHint: 'Busca cualquier tema o publicación para encontrar feeds RSS.',
    poweredBy: 'Desarrollado con Feedly',
    subscribers: (n) => n >= 1000 ? `${Math.round(n / 1000)}k suscriptores` : `${n} suscriptores`,
    adding: 'Agregando…',
    add: 'Agregar',
    added: 'Agregada',
    recommendedTitle: 'Recomendadas para ti',
    recommendedSubtitle: 'Fuentes seleccionadas según tu idioma',
    showMore: 'Ver más',
    showLess: 'Ver menos',
    allLanguages: 'Todos los idiomas',
    yourLanguage: 'Tu idioma',
  },
  settings: {
    title: 'Ajustes',
    importTitle: 'Importar fuentes',
    importDesc: 'Sube un archivo OPML para agregar feeds RSS. Las categorías se detectan por carpetas.',
    importBtn: 'Importar OPML',
    importing: 'Importando…',
    addTitle: 'Agregar fuente',
    addDesc: 'Pega cualquier URL RSS/Atom o dirección web — el feed se detecta automáticamente.',
    addPlaceholder: 'https://ejemplo.com/feed o https://ejemplo.com',
    checking: 'Verificando…',
    add: 'Agregar',
    feedsTitle: (active, total) => `Fuentes (${active} de ${total} activas)`,
    noFeeds: 'Aún no hay fuentes importadas.',
    exportTitle: 'Exportar fuentes',
    exportDesc: 'Descarga tus fuentes como OPML (compatible con cualquier lector RSS) o como respaldo JSON.',
    exportOpml: 'Exportar OPML',
    exportJson: 'Exportar JSON',
    importJsonBtn: 'Importar JSON',
    importingJson: 'Importando…',
    importJsonDesc: 'Restaura fuentes y categorías desde un respaldo JSON de Daily Brief.',
    removeDialog: {
      title: '¿Eliminar fuente?',
      description: (name) => `"${name}" será eliminada de tus fuentes. Esta acción no se puede deshacer.`,
      cancel: 'Cancelar',
      confirm: 'Eliminar',
    },
  },
  categoryManager: {
    title: 'Gestionar categorías',
    manageBtn: 'Gestionar categorías',
    sectionDesc: 'Crea, renombra, reordena o elimina tus categorías de fuentes.',
    addTitle: 'Nueva categoría',
    namePlaceholder: 'Nombre de categoría',
    nameRequired: 'El nombre es obligatorio.',
    nameTooLong: 'Nombre muy largo (máx. 30 caracteres).',
    nameDuplicate: 'Ya existe una categoría con ese nombre.',
    maxReached: 'Máximo de 20 categorías alcanzado.',
    defaultBadge: 'Predeterminada',
    cannotDelete: 'Las categorías predeterminadas no se pueden eliminar.',
    feedCount: (n) => `${n} fuente${n !== 1 ? 's' : ''}`,
    deleteTitle: '¿Eliminar categoría?',
    deleteDesc: (name) => `"${name}" será eliminada. Mover sus fuentes a:`,
    moveTo: 'Mover fuentes a…',
    confirmDelete: 'Eliminar',
    cancelDelete: 'Cancelar',
    createdToast: (name) => `Categoría "${name}" creada.`,
    updatedToast: (name) => `Categoría "${name}" actualizada.`,
    deletedToast: (name) => `Categoría "${name}" eliminada.`,
    add: 'Agregar',
    save: 'Guardar',
    cancel: 'Cancelar',
    iconLabel: 'Icono',
    colorLabel: 'Color',
  },
  onboarding: {
    step: (current, total) => `${current} / ${total}`,
    skip: 'Omitir',
    skipIntro: 'Omitir introducción',
    tapHint: '↑ toca una categoría para probarla',
    feedsImportLabel: 'Importar OPML',
    feedsImportDesc: 'Trae fuentes desde cualquier lector',
    feedsDiscoverLabel: 'Explorar fuentes',
    feedsDiscoverDesc: 'Busca por tema o publicación',
    feedsPasteLabel: 'Pega una URL',
    feedsPasteDesc: 'Detecta feeds RSS o Atom automáticamente',
    replayTitle: 'Ver introducción',
    replayDesc: 'Revisa el tutorial de la app',
    steps: [
      {
        title: 'Infórmate sin\nagobiarte',
        subtitle: 'Daily Brief reúne tus fuentes de noticias en un solo lugar — organizadas por tema, actualizadas a diario, listas en minutos.',
        cta: 'Comenzar',
      },
      {
        title: 'Navega por tema',
        subtitle: 'Toca una categoría para cambiar tu feed al instante. Toca "All" para ver todas las categorías a la vez.',
        cta: 'Siguiente',
      },
      {
        title: 'Escanea. Toca. Lee.',
        subtitle: 'Revisa titulares de un vistazo. Toca cualquier artículo para abrirlo. Tu resumen siempre está ordenado por lo más reciente.',
        cta: 'Siguiente',
      },
      {
        title: 'Agrega tus fuentes',
        subtitle: 'Importa un archivo OPML desde tu lector actual, busca en Explorar o pega cualquier URL RSS/Atom.',
        cta: 'Empezar a leer',
      },
    ],
  },
  install: {
    title: 'Agregar a inicio',
    subtitle: 'Instala Daily Brief para acceso rápido y lectura sin conexión.',
    install: 'Instalar',
    dismiss: 'Ahora no',
    iosTitle: 'Instalar Daily Brief',
    iosSubtitle: 'Agrégala a tu pantalla de inicio en 3 pasos',
    iosStep1: 'Toca el botón Compartir en la parte inferior de Safari.',
    iosStep2: 'Desplázate y toca "Agregar a inicio".',
    iosStep3: 'Toca "Agregar" para confirmar. ¡Listo!',
  },
  digest: {
    title: 'Resumen diario',
    updatedAt: (time) => `Actualizado ${time}`,
    stories: (n) => `${n} ${n === 1 ? 'noticia' : 'noticias'}`,
    unnamedCluster: 'Grupo',
    showMore: (n) => `Ver ${n} más`,
    showLess: 'Ver menos',
    emptyTitle: 'Resumen no disponible aún',
    emptyBody: 'El resumen AI se genera diariamente a las 06:00 UTC. Vuelve pronto o actualiza para generarlo.',
    errorTitle: 'No se pudo cargar el resumen',
    retry: 'Intentar de nuevo',
    fallbackNotice: 'El resumen AI no está disponible (Worker no configurado). Mostrando tus artículos mejor rankeados.',
  },
  common: {
    refresh: 'Actualizar',
    error: 'Algo salió mal.',
    empty: 'Nada por aquí aún.',
    loading: 'Cargando…',
  },
  offline: {
    message: 'Sin conexión.',
    cached: (time) => `Mostrando datos guardados de ${time}.`,
    noCache: 'No hay datos en caché disponibles.',
    timeAgo: {
      fewMinutes: 'hace unos minutos',
      oneHour: 'hace 1 hora',
      hours: (n) => `hace ${n} horas`,
      days: (n) => `hace ${Math.floor(n)} días`,
    },
  },
  timeAgo: {
    justNow: 'ahora',
    minutes: (n) => `${n}m`,
    hours: (n) => `${n}h`,
    days: (n) => `${n}d`,
  },
  syncTime: {
    justNow: 'ahora mismo',
    minutesAgo: (n) => `hace ${n}m`,
  },
};

export const TRANSLATIONS: Record<Language, Translations> = { en, es };
