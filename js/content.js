/* Every word the visitor sees, and every number behind a banded answer.
   This is the file to hand to whoever owns the copy for a pass — nothing here
   needs a developer. Mirrors the project copy deck.

   Changing a label is safe; changing a value changes the maths. */

window.CXA = window.CXA || {};

CXA.content = {

  splash: {
    title: ['What is your support setup ', 'actually', ' costing you?'],  // middle span is the coral italic
    subtitle: 'Two minutes to leave with your automation readiness score and what Gorgias would save you a year.',
    cta: 'Start the audit',
    /* Rotates every few seconds while nobody is using the machine.
       All four need sign-off from the event team before the event. */
    statIntervalMs: 5000,
    stats: [
      { eyebrow: 'Everyday tickets',           figure: '45', unit: '%', caption: 'of routine support tickets handled by the AI Agent, with no one touching them.' },
      { eyebrow: '3,000 tickets a month',      figure: '$106K', unit: '', caption: 'taken off a five-person support team’s annual cost.' },
      { eyebrow: 'The tickets a human keeps',  figure: '25', unit: '%', caption: 'faster to resolve, because the agent opens with the context already gathered.' },
      { eyebrow: '30,000 tickets a month',     figure: '$600K', unit: '', caption: 'saved a year by the biggest support teams we run.' }
    ]
  },

  contact: {
    title: 'Who are we running this for?',
    subtitle: 'Your result goes to your email.',
    fields: [
      { name: 'first_name', label: 'First name', placeholder: 'Julien',                required: true },
      { name: 'last_name',  label: 'Last name',  placeholder: 'Wilson',                required: true },
      { name: 'email',      label: 'Work email', placeholder: 'julienwilson@wilson.co', required: true, type: 'email', wide: true },
      { name: 'company',    label: 'Company',    placeholder: 'Wilson Co.',            required: true, wide: true },
      { name: 'website',    label: 'Website',    placeholder: 'wilson.co',             required: false, wide: true }
    ],
    consent: 'I agree to Gorgias contacting me about this audit and storing the answers I give today.',
    /* PLACEHOLDER until Legal approves the wording and gives us a retention
       period and a contact address. */
    gdprTitle: 'Your data is protected under GDPR.',
    gdprBody: 'Gorgias collects your name, work email, company and today’s answers to produce your audit result and to follow up with you, nothing else. We never sell it and we never share it outside Gorgias. We delete it after [retention period], and you can ask to see, correct or delete it at any time by writing to [privacy contact]. Full detail at gorgias.com/privacy.',
    cta: 'Continue',
    errors: {
      required: 'Add your %s to carry on.',
      email: 'That email address is missing something. Check it and try again.',
      consent: 'Tick the box to carry on.'
    }
  },

  /* One question per page. `showIf` runs against the answers collected so far,
     so the migration question only appears for a visitor who is not on Shopify
     — which makes the flow nine pages for them and eight for everyone else. */
  questions: [
    {
      id: 'role', step: 'Role', feeds: 'context',
      title: 'What’s your role?',
      options: [
        { label: 'CX or support lead' },
        { label: 'Ecommerce or digital lead' },
        { label: 'Founder, owner or COO' },
        { label: 'Something else' }
      ]
    },
    {
      id: 'platform', step: 'Platform', feeds: 'framing',
      title: 'What platform do you sell on today?',
      options: [
        { label: 'Shopify or Shopify Plus', shopify: true },
        { label: 'Another platform' },
        { label: 'More than one' }
      ]
    },
    {
      id: 'migration_interest', step: 'Platform', feeds: 'context',
      showIf: function (a) { return a.platform && a.platform.label !== 'Shopify or Shopify Plus'; },
      title: 'How likely are you to move to Shopify in the next 12 to 18 months?',
      options: [
        { label: 'Not considering it' },
        { label: 'Open to it' },
        { label: 'Actively evaluating' }
      ]
    },
    {
      id: 'channels', step: 'Channels', feeds: 'context', multi: true,
      title: 'Which channels do customers use to reach you?',
      hint: 'Pick as many as apply.',
      options: [
        { label: 'Email' }, { label: 'Live chat' }, { label: 'Social DMs' },
        { label: 'SMS' }, { label: 'Phone' }
      ]
    },
    {
      id: 'automation_today', step: 'Automation', feeds: 'band',
      title: 'How much of your support is automated today?',
      /* This answer alone sets the score band. It must never reach the
         calculator's automation rate — see roi.js. */
      options: [
        { label: 'Nothing automated',                          band: 'Reactive' },
        { label: 'A basic chatbot',                            band: 'Getting there' },
        { label: 'An AI agent we don’t fully trust yet',   band: 'Automation-ready' },
        { label: 'AI handles most of the routine stuff already', band: 'Automation leader' }
      ]
    },
    {
      id: 'tickets', step: 'Volume', feeds: 'maths',
      title: 'Roughly how many support tickets does your team handle a month?',
      options: [
        { label: 'Under 1,000',     value: 500 },
        { label: '1,000 - 5,000',   value: 3000 },
        { label: '5,000 - 20,000',  value: 12500 },
        { label: '20,000+',         value: 30000 }
      ]
    },
    {
      id: 'agents', step: 'Volume', feeds: 'maths',
      title: 'How many people are on your support team?',
      options: [
        { label: '1 - 2',  value: 2 },
        { label: '3 - 5',  value: 4 },
        { label: '6 - 15', value: 10 },
        { label: '16+',    value: 24 }
      ]
    },
    {
      id: 'traffic', step: 'Growth', feeds: 'maths',
      title: 'Roughly how many monthly website visitors do you get?',
      options: [
        { label: 'Under 10,000',      value: 5000 },
        { label: '10,000 - 50,000',   value: 30000 },
        { label: '50,000 - 250,000',  value: 150000 },
        { label: '250,000+',          value: 400000 }
      ]
    },
    {
      id: 'aov', step: 'Growth', feeds: 'maths',
      title: 'What’s your average order value?',
      options: [
        { label: 'Under $50',  value: 35 },
        { label: '$50 - $100', value: 75 },
        { label: '$100 - $200', value: 150 },
        { label: '$200+',      value: 300 }
      ]
    }
  ],

  nav: { back: 'Back', next: 'Continue' },

  results: {
    label: 'Your result',
    shopify: {
      heroKey: 'Total value a year',
      heroSub: 'Support costs saved plus revenue added, every year, on Gorgias.',
      framing: 'Here’s how much more you could get out of the stack you’re already on.'
    },
    notShopify: {
      heroKey: 'Support cost saved a year',
      heroSub: 'Off the top, every year, on what support costs you now.',
      framing: 'Here’s what you’re leaving on the table, and what changes once you’re on Shopify.'
    },
    savedKey: 'Support cost saved',
    revenueKey: 'Revenue added',
    revenueLockedKey: 'Revenue, once you’re on Shopify',
    returnKey: 'Return on spend',
    /* Shown instead of the revenue figure when attributed orders round below
       one a month. */
    revenueSuppressed: 'Your traffic is below the point where Shopping Assistant starts to add orders. The saving is the whole picture today.',
    bands: {
      'Reactive':          'Your team is still doing this manually. There are a lot of quick wins on the table.',
      'Getting there':     'You’ve started automating. Here’s what’s still costing you time.',
      'Automation-ready':  'You’re set up to go further, fast. Here’s the gap between where you are and where you could be.',
      'Automation leader': 'You’re ahead of most brands your size. Here’s what the next 20% looks like.'
    },
    breakdownTitle: 'Where the number comes from',
    rows: {
      labourToday: 'Support team today',
      toolingToday: 'Helpdesk and tools today',
      totalToday: 'Total today',
      labourGorgias: 'Support team on Gorgias',
      plan: 'Gorgias %s',
      ai: 'AI Agent',
      totalGorgias: 'Total with Gorgias',
      keep: 'You keep'
    },
    note: 'Based on %tickets% tickets a month and a team of %agents%. Same figures as the Gorgias ROI calculator.',
    /* Stand-in until the event team confirms or replaces it. */
    benchmarkKey: 'Against the ecommerce average',
    benchmark: 'You handle <b>%tickets% tickets a month with %agents% people</b>. The ecommerce average is closer to <b>5,000 with 6</b>.',
    book: 'Book 15 minutes now',
    bookOffline: 'Book 15 minutes, we’ll set it up',
    bookOfflineUnder: 'The wifi is down at the stand. We have your request and someone will be in touch first thing.',
    followUp: 'Send it to me and follow up later'
  },

  thanks: {
    title: 'Thanks, %s.',
    body: 'Your numbers are with the Gorgias team. Grab a coffee, we’re on stand %s all day.'
  },

  idle: {
    title: 'Still there?',
    body: 'We’ll clear the screen in a moment so the next person starts fresh.',
    stay: 'I’m still here',
    reset: 'Start over'
  },

  staff: {
    reset: 'Reset',
    skip: 'Skip contact form',
    settings: 'Settings',
    settingsTag: 'PIN'
  },

  /* The staff help screen, reached from the admin panel. Written for whoever is
     holding the laptop on the day, who may never have seen this app before. */
  help: {
    label: 'Staff only',
    title: 'The file on this laptop',
    back: 'Back to the admin panel',
    blocks: [
      {
        h: 'What the CSV is',
        p: [
          'A spreadsheet of everyone who finished the audit on this laptop. Open it in Excel or Numbers whenever you want to see the day so far.',
          'It is the safety net, not the real list. The real list is the one the app sends to our database over wifi. The file sits here so that a bad connection at the stand can never cost us a day of leads.'
        ]
      },
      {
        h: 'Naming this laptop',
        p: [
          'Type a name in the box at the top of the admin panel, something like theo-macbook. Press Enter and it saves.',
          'The name goes on every record. If two laptops are running the audit, it is how we tell afterwards which leads came from which one. The name stays on this laptop. Copying the folder to another machine does not copy the name with it.'
        ]
      },
      {
        h: 'The "Connect the CSV" button',
        p: [
          'Press it once on each laptop, before the event starts. It asks where to save the file and what to call it. The Desktop is the easiest place to find again.',
          'After that the app keeps that same file up to date on its own, rewriting it every time someone finishes. You never need to press the button again unless you want to start a different file.'
        ]
      },
      {
        h: 'The permission box Chrome shows',
        p: [
          'The first time you open the app each day, Chrome asks whether it can save changes to the file you picked. Click Allow.',
          'Chrome asks once every time it starts up. It is asking about the one file you chose and nothing else.',
          'If the box gets closed or dismissed, the app cannot update the file, and the CSV tile in the admin panel turns orange and says the permission was refused. Nothing is lost: everything is still on the laptop. Quit Chrome, open the app again, and click Allow. The next write catches up every row that was missed.'
        ]
      },
      {
        h: 'The "Export a copy" button',
        p: [
          'Sends a fresh copy of the list to your Downloads folder. It is a snapshot of this moment.',
          'It does not replace the connected file and it does not keep itself up to date. Use it if somebody wants the numbers there and then, or if something went wrong with the connected file.'
        ]
      },
      {
        h: 'If a tile looks wrong',
        p: [
          'The three tiles at the top of the admin panel say where the day\u2019s records are. Green is fine. Orange needs a look, and the tile says what is wrong.',
          'Nothing is ever deleted from this laptop. An orange tile means something is delayed, not that anything has gone missing.'
        ]
      }
    ]
  },

  pin: {
    label: 'Staff only',
    title: 'Enter the PIN',
    hint: 'Four digits. It is in the setup guide, not in the app.',
    back: 'Back to the audit',
    error: 'That PIN isn’t right. Try again.'
  }
};
