// All player-facing UI strings, in Spanish. Never inline text in components.

export const STRINGS = {
  appName: "Finca Flamenca",

  // Tabs
  farmTab: "Granja",
  lessonsTab: "Lecciones",

  // Home / lessons
  lessons: "Lecciones",
  review: "Repaso",
  reviewButton: "Repasar palabras",
  wordsToReview: (n: number) =>
    n === 1 ? "1 palabra para repasar" : `${n} palabras para repasar`,
  noWordsToReview: "No hay palabras para repasar. ¡Vuelve más tarde!",
  unitLocked: "Se desbloquea con más XP",
  startLesson: "Empezar",
  streakDays: (n: number) => (n === 1 ? "1 día" : `${n} días`),

  // Lesson player
  check: "Comprobar",
  continue: "Continuar",
  skip: "Saltar",
  listenPrompt: "Escucha y escribe lo que oyes",
  listenReplay: "Escuchar otra vez",
  translatePrompt: "Traduce al neerlandés",
  choicePrompt: "¿Qué significa?",
  assemblePrompt: "Forma la frase en neerlandés",
  matchPrompt: "Une las parejas",
  typePlaceholder: "Escribe en neerlandés...",
  correctFeedback: "¡Muy bien!",
  typoFeedback: "¡Cuidado con la ortografía!",
  wrongFeedback: "La respuesta correcta es:",
  noAudioWarning: "Audio no disponible en este dispositivo",

  // Session end
  lessonComplete: "¡Lección completada!",
  reviewComplete: "¡Repaso completado!",
  reviveComplete: "¡Tus cultivos revivieron!",
  perfectBonus: "¡Bonus por lección perfecta!",
  streakBonus: (multiplier: number) => `Bonus de racha ×${multiplier}`,
  earnedMunten: (n: number) => `+${n} munten`,
  earnedXp: (n: number) => `+${n} XP`,
  backHome: "Volver a la finca",
  exitLesson: "Salir",

  // Farm
  tillHint: "Pulsa «Arar» para preparar tu primer campo de cultivo 🌱",
  tillMode: "Arar",
  tillModeHint: "Toca la hierba para arar. Toca un campo vacío para deshacerlo.",
  tillModeDone: "Listo",
  emptyPlot: "Terreno libre",
  growing: "Creciendo...",
  cropReady: "¡Listo!",
  cropWilted: "Marchito",
  water: "Regar 💧",
  watered: "Regado ✓",
  harvestToast: (n: number) => `+${n} 🪙`,
  readyIn: (t: string) => `Listo en ${t}`,

  // Seed shop
  seedShopTitle: "Semillas",
  plant: "Plantar",
  growTimeLabel: "Tiempo",
  sellsForLabel: "Se vende por",
  seedCostLabel: "Semilla",
  notEnoughMunten: "Te faltan munten. ¡Completa una lección!",
  firstPurchaseIntro: "Palabra nueva. Una pregunta rapidita:",
  tryAgain: "Inténtalo otra vez, tranquila 😊",

  // Animals
  hungry: (name: string) => `¡${name} tiene hambre!`,
  hungryNl: (name: string) => `${name} heeft honger!`,
  feed: "Alimentar 🌾",
  fedAndWorking: "Trabajando...",
  produceReady: "¡Hay algo para recoger!",
  collect: "Recoger",
  namePlaceholder: "Ponle un nombre...",
  happinessLabel: "Felicidad",

  // Wilt revival
  reviveTitle: "¡Oh no! Tus cultivos se marchitaron 🥀",
  reviveBody:
    "No te preocupes: nada se pierde. Repasa unas palabras y revivirán. 🌱",
  reviveButton: "Repasar y revivir",

  // Chore question
  choreCorrect: (n: number) => `¡Muy bien! +${n} 🪙`,
  choreWrong: "Casi... La respuesta era:",

  // Farm scene controls
  zoomIn: "Acercar",
  zoomOut: "Alejar",
  rotateLeft: "Girar la granja a la izquierda",
  rotateRight: "Girar la granja a la derecha",

  // Animal shop (de fokker)
  animalShop: "Animales",
  animalShopTitle: "El criadero",
  animalShopSubtitle: "de fokker",
  animalBuy: "Comprar",
  animalNameLabel: "Ponle un nombre (opcional)",
  animalOwned: (n: number) => `Tienes: ${n}`,
  animalProduceLabel: "Da",
  animalEveryLabel: "cada",
  animalFarmFull: "No queda espacio en la granja. Mueve algo primero.",
  animalCannotAfford: "Todavía no te alcanza. ¡Practica un poco más! 🌱",

  // Decoration shop
  decorShop: "Tienda",
  decorShopTitle: "Decora tu granja",
  decorBuy: "Comprar",
  decorBought: "¡Listo! Colócalo donde quieras 🎉",
  decorOwned: (n: number) => `Tienes: ${n}`,
  decorFarmFull: "No queda espacio en la granja. Mueve algo primero.",
  decorCategories: {
    nature: "🌳 Naturaleza",
    water: "💧 Agua",
    farm: "🚜 Granja",
    home: "🏠 Casa",
    pasture: "🐑 Prados",
  },
  penSizeLabel: (n: number) => `${n}×${n}`,
  penCapacityLabel: "Caben",
  penFullHint: "Este prado está lleno.",
  penOccupancy: (used: number, total: number) => `${used}/${total} lugares`,

  // Removing things
  removeItem: "Quitar",
  removeConfirmTitle: "¿Quitar esto?",
  removeConfirmBody: (n: number) => `Te devolvemos ${n} 🪙.`,
  removeAnimalBody: (name: string) => `${name} se irá de la granja.`,
  removeYes: "Sí, quitar",
  removeNo: "No",
  decorCategoryEmpty: "Todavía no puedes comprar nada de aquí. ¡Practica un poco más! 🌱",

  // Arranging the farm
  moveHint: "Mantén pulsado un objeto para moverlo · dos dedos para girarlo",
  binLabel: "Arrastra aquí para quitarlo",
  arrange: "Ordenar",
  arrangeDone: "Listo",
  arrangeHint: "Arrastra un objeto para moverlo. Tócalo y gíralo 90°.",
  rotateItem: "Girar 90°",

  // Word card
  exposureHint: "Toca el altavoz para escuchar",

  // Dev tools (dev builds only)
  devFastTimers: "⚡ Cultivos en 10 s",
  devAddMunten: "+100 🪙",

  // Crash recovery
  errorTitle: "Algo salió mal 😿",
  errorBody: "El juego se detuvo un momento. Tu granja sigue guardada.",
  errorReload: "Volver a cargar",

  // Cloud sync
  syncTitle: "Guardar en la nube",
  syncOffBody:
    "Guarda tu granja en internet para no perderla nunca y poder jugar en otro teléfono. No hace falta contraseña.",
  syncOnBody: "Tu granja se guarda sola. Este es tu código para usarla en otro teléfono:",
  syncCodeLabel: "Tu código de granja",
  syncEmailLabel: "Tu correo (opcional)",
  syncEmailPlaceholder: "por si pierdes el código",
  syncStart: "Activar",
  syncStarted: "¡Listo! Apunta tu código en un lugar seguro 💚",
  syncHaveCode: "Ya tengo un código",
  syncConnectLabel: "Escribe tu código",
  syncConnect: "Conectar",
  syncConnected: "¡Conectado! Tu granja está sincronizada 🌻",
  syncStop: "Desactivar",
  syncStopped: "Ya no se guarda en la nube. Tu granja sigue en este teléfono.",
  syncBusy: "Guardando...",
  syncSaved: "Todo guardado ✓",
  syncIdle: "Esperando cambios",
  syncOffline: "Sin conexión. Se guardará cuando vuelvas a tener internet.",
  syncError: "No se pudo conectar. Inténtalo más tarde.",

  // Backup
  backupTitle: "Copia de seguridad",
  backupBody:
    "Guarda tu granja en un archivo. Si cambias de teléfono o el navegador borra los datos, puedes recuperarla.",
  backupExport: "Guardar copia",
  backupImport: "Recuperar",
  backupSaved: "¡Copia guardada! Guárdala en un lugar seguro 💚",
  backupRestored: "¡Tu granja volvió! 🌻",
  backupBadFile: "Ese archivo no es una copia de Finca Flamenca.",

  // Misc
  loading: "Cargando...",
  close: "Cerrar",
} as const;
