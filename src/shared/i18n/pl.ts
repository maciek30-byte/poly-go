const pl = {
  translation: {
    splash: {
      loading: 'Ładowanie…',
    },
    layout: {
      nav: {
        directory: 'Katalog',
        messages: 'Wiadomości',
        favorites: 'Ulubione',
        profile: 'Profil',
      },
      signOut: 'Wyloguj',
      brand: 'polyGo',
    },
    login: {
      placeholder: 'Logowanie pojawi się wkrótce',
      signOut: 'Wyloguj',
    },
    accountLocked: {
      title: 'Konto zablokowane',
      body: 'Twoje konto zostało zablokowane. Skontaktuj się z polyGo, aby ustalić dalsze kroki.',
      contact: 'Napisz do polyGo',
      signOut: 'Wyloguj',
    },
    accountPending: {
      title: 'Konto oczekuje na weryfikację',
      body: 'Twoja firma jest w trakcie weryfikacji przez zespół polyGo. Otrzymasz powiadomienie, gdy aktywujemy konto.',
      contact: 'Napisz do polyGo',
      signOut: 'Wyloguj',
    },
    notFound: {
      title: 'Nie znaleziono strony',
      body: 'Adres, który otworzyłeś, nie istnieje lub został przeniesiony.',
      home: 'Wróć na stronę główną',
    },
    placeholders: {
      dashboard: { title: 'Pulpit' },
      directory: { title: 'Katalog firm' },
      messages: { title: 'Wiadomości' },
      favorites: { title: 'Ulubione' },
      profile: { title: 'Profil' },
    },
  },
} as const

export default pl
