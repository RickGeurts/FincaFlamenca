// All player-facing UI strings, in Spanish. Never inline text in components.

export const STRINGS = {
  appName: "Finca Flamenca",

  // El pueblo: the places she travels between, instead of tabs
  villageLabel: "El pueblo",
  places: {
    finca: "Finca",
    escuela: "Escuela",
    mercado: "Mercado",
    criadero: "Criadero",
    alcaldia: "Alcaldía",
  },
  placeLocked: (unit: number) => `Se abre en la unidad ${unit}`,
  back: "Volver",

  // Farm tools (the dock at the left edge)
  toolTill: "Arar",
  toolSeed: "Sembrar",
  toolArrange: "Ordenar",
  toolZoom: "Zoom",
  toolSeedHint: "Toca un campo arado para sembrar 🌱",
  settings: "Ajustes",

  // Choosing the voice that reads the Dutch aloud
  voiceTitle: "La voz que te habla",
  voiceBody:
    "Tu teléfono trae varias voces neerlandesas y no suenan igual. Escúchalas y quédate con la que más te guste.",
  voiceAuto: "La mejor que encuentre",
  voiceTry: "🔊 Probar",
  voiceSample: "Goedemiddag! De koe eet gras in de wei.",
  voiceNone:
    "Este dispositivo no trae voces en neerlandés. El juego funciona igual: todo lo que se escucha también se lee.",
  voiceFlemish: "🇧🇪 flamenca",

  alertsMore: (n: number) => `+${n} más`,
  // Second line of an alert card. The Dutch stands alone here, under the
  // animal's name, so she reads a real little sentence: «Manchas heeft honger».
  alertHungerNl: "heeft honger",
  alertProduce: "algo para recoger",
  alertWilted: "se marchitaron 🥀",
  alertWiltedTitle: "Tus cultivos",

  // La escuela
  schoolTitle: "La escuela",
  schoolClassrooms: "Aulas · nivel A1",
  dailyReview: "Repaso del día",
  reviewReward: (n: number, munten: number) =>
    `${n === 1 ? "1 palabra" : `${n} palabras`} para repasar · +${munten} 🪙`,
  reviewNow: "Repasar",
  // The ring measures the words of the unit she already has in her head,
  // because that is the progress the game actually keeps. A "lessons done"
  // count would have to be invented, and invented progress is not progress.
  wordsOfUnit: (done: number, total: number) => `${done} de ${total} palabras`,
  continueUnit: "Seguir",
  enterUnit: "Entrar",
  unitLockedXp: (missing: number) => `Se desbloquea con ${missing} XP más`,
  openQuests: "Misiones abiertas",
  questAt: (place: string) => `En ${place}`,

  // Sendero (the lesson path)
  pathTitle: (unit: number) => `Aula ${unit} · sendero`,
  pathReview: "Repaso · sendero",
  pathRevive: "Revivir · sendero",
  pathStop: (n: number, total: number) => `Parada ${n} de ${total}`,
  sessionEarnings: (n: number) => `🪙 +${n}`,

  // Session end
  earnedLabel: "Ganaste",
  earnedBase: {
    lesson: "Lección",
    review: "Repaso diario",
    revive: "Repaso para revivir",
  },
  earnedPerfect: "✨ Lección perfecta",
  earnedStreak: (multiplier: number) => `🔥 Bonus de racha ×${multiplier}`,
  earnedXpLine: "⭐ Experiencia",
  boxUp: "Palabras que subieron de caja",
  anotherLesson: "Otra lección",

  // El mercado / el criadero
  marketTitle: "El mercado",
  marketTitleNl: "de markt",
  marketHint:
    "Al comprar algo nuevo aprendes su palabra: te la muestro con su artículo y su audio.",
  marketCategories: {
    seeds: "Semillas",
    animals: "Animales",
    nature: "Natura",
    water: "Agua",
    farm: "Granja",
    home: "Casa",
    pasture: "Prados",
    ropa: "Ropa",
  },
  cannotAffordMeta: "Practica un poco más 🌱",
  noFieldForSeed: "Primero ara un campo con «Arar» 🌾",

  // Misiones (story quests)
  questStep: (n: number, total: number) => `Paso ${n} de ${total}`,
  questWriteAnswer: "Escribe tu respuesta en neerlandés",
  questChoose: "Elige qué decir",
  questSend: "Enviar",
  questHint: "💡 Pista",
  revealSpanish: "👁 Ver en español",
  // A slip in a conversation is not a mistake to be marked; the neighbour
  // understood you. She is simply shown how it is usually said.
  questCorrection: "Se dice así:",
  questDoneTitle: "¡Misión cumplida!",
  questLandGrew: "¡Tu finca creció! 🌾",
  questGift: "Un regalo para tu finca 🎁",
  questAgain: "Ya la hiciste antes, así que esta vez es un detalle pequeño.",
  questBack: "Volver al pueblo",
  questStart: "Empezar la conversación",
  questReplay: "Repetirla",
  questNoneHere: "Aquí no hay nadie esperándote todavía. ¡Vuelve más tarde!",
  alcaldiaTitle: "La alcaldía",
  alcaldiaSubtitle: "het gemeentehuis",

  // Celebraciones
  unitOpened: (n: number) => `¡Aula ${n} abierta!`,
  celebrateOn: "¡Vamos!",
  soundLabel: "Sonidos",
  soundOn: "Con sonido 🔔",
  soundOff: "En silencio 🔕",
  soundHint: "El juego se puede jugar entero sin sonido.",

  // Bienvenida (first run)
  welcomeSteps: [
    {
      emoji: "🌻",
      title: "Bienvenida a tu finca",
      body: "Esta granja es tuya. Todo lo que ves aquí está en español; el neerlandés es lo que vamos a aprender juntas.",
    },
    {
      emoji: "🏫",
      title: "Las lecciones pagan la finca",
      body: "En la escuela ganas munten con cada lección y cada repaso. Con esas munten compras semillas, animales y todo lo demás.",
    },
    {
      emoji: "🐄",
      title: "Toca cualquier cosa",
      body: "Cada animal, cada planta y cada objeto te dice su palabra en neerlandés, con su artículo y su audio. Es gratis y siempre está.",
    },
    {
      emoji: "💚",
      title: "Sin prisa y sin castigos",
      body: "Nada se pierde. Si un cultivo se marchita, repasas unas palabras y revive. Si fallas, te muestro la respuesta y seguimos.",
    },
  ],
  welcomeNext: "Seguir",
  welcomeStart: "Empezar 🌱",
  welcomeSkip: "Saltar",

  // El cumpleaños — se muestra una sola vez, el día que la finca es suya
  birthdayTitle: (name: string) => `¡Feliz cumpleaños, ${name}!`,
  birthdayNl: "Gefeliciteerd met je verjaardag!",
  birthdayNlHint: "Así se felicita en neerlandés. Tu primera palabra de hoy 💚",
  birthdayBody:
    "Esta finca es tu regalo. Es tuya entera: la tierra sin arar, los animales que elijas, la casa que construyas y cada palabra en neerlandés que te lleves de aquí.",
  birthdayBody2: "No hay prisa, no se pierde nada y nadie te va a corregir. Sólo tú, tu finca y un idioma nuevo.",
  birthdaySigned: "Con todo mi cariño, Rick 💚",
  birthdayStart: "Abrir mi finca 🌻",

  // Mi look — el armario
  myLook: "Mi look",
  myLookNl: "mijn outfit",
  lookTabs: {
    build: "Vestir",
    colors: "Colores",
    outfits: "Conjuntos",
    wardrobe: "Armario",
  },
  slots: {
    hair: "Pelo",
    top: "Ropa",
    bottom: "Abajo",
    shoes: "Calzado",
    hat: "Sombrero",
    accessory: "Extras",
    carry: "Llevar",
  },
  skinTone: "Tono de piel · de huid",
  hairColor: "Color del pelo · het haar",
  itemColor: "Color · de kleur",
  faceLabel: "Cara · het gezicht",
  tryOn: "Probar",
  wearIt: "Ponérmelo",
  buyIt: "Comprar",
  saveLook: "Guardar mi look",
  inUse: "En uso",
  ownedLabel: "Tuya",
  randomLook: "Al azar",
  ownedOf: (n: number, total: number) => `${n} de ${total} prendas`,
  ownedHint: "Cada prenda que tienes es una palabra que sabes",
  outfitTeaches: "Un conjunto = una frase que aprendes",
  colorReward: (n: number) => `+${n} 🪙 por cada color nuevo`,
  colorRewardHint: "Al elegirlo escuchas la palabra y entra en tu repaso",
  buyAddsToReview: "Al comprarla entra en tu repaso con su artículo y su color.",
  lockedUnit: (n: number) => `🔒 Unidad ${n}`,
  noColourHere: "Esta prenda no cambia de color.",
  wardrobeEmptySlot: "Nada",

  // Word card
  inASentence: "En una frase",
  listen: "🔊 Escuchar",
  listenSlow: "🐢 lento",
  // Saying it out loud is for fun only: nothing is won or lost, so even the
  // "not quite" wording invites another go instead of marking a mistake.
  sayIt: "🎤 Decirlo",
  sayItListening: "🎤 Escuchando...",
  sayItGood: "¡Sonó muy bien! 💚",
  sayItAgain: "🎤 Otra vez",

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
  // The daily review asks the same words from different sides; each side gets
  // its own question, so she can tell at a glance what is being asked of her.
  pickPrompt: {
    meaning: "¿Qué significa?",
    recall: "¿Cómo se dice en neerlandés?",
    article: "¿de o het?",
    listen: "Escucha. ¿Qué significa?",
  },
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
  devTitle: "Herramientas de prueba",
  devOnlyHere: "Sólo aparecen mientras desarrollas; no existen en el juego publicado.",
  devReplayWelcome: "👋 Ver la bienvenida otra vez",
  devReplayWelcomeHint: "Mantiene la granja y el progreso.",
  devFillReview: "🔁 Llenar el repaso del día",
  devFillReviewHint: "12 palabras listas, en todos los niveles.",
  devReset: "🧹 Empezar de cero",
  devResetHint: "Borra la granja, las palabras, la ropa y los ajustes. No se puede deshacer.",
  devResetConfirm: "¿Seguro? Se borra todo y el juego arranca como la primera vez.",
  devResetYes: "Sí, borrar todo",
  devResetting: "Borrando...",

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
