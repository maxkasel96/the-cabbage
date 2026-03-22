import type { FeatureDocSeed, IntegrationDocSeed, RunbookDocSeed } from './types'

export const featureDocSeeds: FeatureDocSeed[] = [
  {
    key: 'game-recommendations',
    name: 'Game recommendations',
    summary: 'Generate board game recommendations from player counts, tags, and prior selections.',
    summaryDetails: {
      what: 'A player-facing recommendation workflow that ranks board games for the current group using app inputs and a model-backed suggestion step.',
      whyItExists:
        'It helps groups choose a game faster, reduces decision friction before a session starts, and increases the likelihood that members actually record and complete a play session.',
      whoUsesIt: ['Players deciding what to play next.', 'Admins or hosts guiding a session for a larger group.'],
      flow: [
        'A user enters the party size and the filters or tags that matter for the current session.',
        'The app gathers candidate games and sends the relevant context to the recommendation route.',
        'The recommendation flow ranks and explains candidate matches for the group.',
        'Users can review the output and continue into follow-up actions such as marking a game as played.',
      ],
      dependencies: ['OpenAI for model-generated ranking and rationale.', 'Supabase for persisted game, player, and session-related data.'],
      inputsAndOutputs: [
        'Inputs: player count, selected tags, prior selections, and available game metadata.',
        'Outputs: a ranked recommendation list plus follow-up actions that can feed played-game tracking.',
      ],
      expectedBehavior: [
        'Return recommendations that are relevant to the current group constraints.',
        'Respond quickly enough to keep the session setup flow moving.',
        'Keep recommendation output understandable so users know why each game was suggested.',
      ],
      failurePointsAndRisks: [
        'Weak or incomplete game metadata can reduce recommendation quality.',
        'Model or API failures can interrupt the recommendation step.',
        'Overly broad filters can produce generic results that feel less useful to players.',
      ],
      operationalConsiderations: [
        'Monitor recommendation latency and API reliability because the flow is interactive.',
        'Review prompt and ranking behavior when new game catalog data or tags are introduced.',
      ],
      limitationsAndFutureImprovements: [
        'The current workflow is centered on recommendations rather than deep explainability or personalization.',
        'Future improvements could add better feedback loops, richer reasons, and stronger use of player history.',
      ],
    },
    status: 'Active',
    owningArea: 'Gameplay',
    currentState:
      'Core recommendation requests are live in the app and support follow-up actions like marking a game as played.',
    notes: [
      'Backed by the AI recommendation API route used from the landing page.',
      'Recommendation results can feed into played-game tracking to close the loop after a session.',
    ],
    relatedIntegrations: ['OpenAI', 'Supabase'],
  },
  {
    key: 'tournament-history-and-bracket',
    name: 'Tournament history and bracket',
    summary: 'Track tournaments, winners, history views, and bracket generation for group play.',
    summaryDetails: {
      what: 'A combined feature set for creating brackets, managing active tournaments, and reviewing historical tournament outcomes.',
      whyItExists:
        'It gives the group a structured way to run competitive events, preserve results over time, and keep tournament operations consistent.',
      whoUsesIt: ['Players checking current or past tournament results.', 'Admins or organizers setting up and managing tournament brackets.'],
      flow: [
        'An organizer selects or creates the tournament context and enters or confirms participants.',
        'The app generates the bracket structure and stores the active tournament state.',
        'Results are updated as rounds complete and winners advance.',
        'Completed tournaments remain available in history views for later reference.',
      ],
      dependencies: ['Supabase for tournament entities, winner records, and historical persistence.'],
      inputsAndOutputs: [
        'Inputs: tournament participants, active tournament selections, bracket actions, and recorded match outcomes.',
        'Outputs: generated brackets, active tournament state, winner history, and tournament archive views.',
      ],
      expectedBehavior: [
        'Generate brackets that match the configured participants.',
        'Persist tournament progress reliably across admin and player views.',
        'Show accurate winner and history data after completion.',
      ],
      failurePointsAndRisks: [
        'Bad participant data or incomplete results can corrupt bracket expectations.',
        'Persistence issues can desynchronize active tournament state from displayed history.',
      ],
      operationalConsiderations: [
        'Tournament changes should be coordinated during active events to avoid accidental overwrites.',
        'Historical records matter for trust, so data corrections should be deliberate and traceable.',
      ],
      limitationsAndFutureImprovements: [
        'The current implementation relies on internal persistence and does not integrate with external tournament SaaS tools.',
        'Future work could add richer tournament analytics and clearer recovery flows for mid-event corrections.',
      ],
    },
    status: 'Active',
    owningArea: 'Competition',
    currentState:
      'Tournament history, active tournament management, and bracket generation all exist as working user/admin flows.',
    notes: [
      'Includes history views, active tournament selection, and bracket generation pages.',
      'Depends on persisted tournament and winner data rather than an external SaaS integration.',
    ],
    relatedIntegrations: ['Supabase'],
  },
  {
    key: 'player-logins-and-profiles',
    name: 'Player logins and profiles',
    summary: 'Support member authentication, player login issuance, and editable account profiles.',
    summaryDetails: {
      what: 'An account-management capability that covers authentication, issued player identities, role-aware access, and self-service profile editing.',
      whyItExists:
        'It connects real members to their in-app player records so authenticated features, permissions, and profile data all work consistently.',
      whoUsesIt: ['Members signing in and updating their own profile.', 'Admins creating or correcting player login identities and roles.'],
      flow: [
        'A member authenticates through the supported login flow.',
        'The app resolves the member to an application player identity and loads the correct permissions.',
        'Admins can create or update player login records when access needs to be granted or corrected.',
        'Members edit and save profile details that remain tied to the synchronized application record.',
      ],
      dependencies: ['Supabase Auth for identity and session handling.', 'Supabase Postgres for profile, role, and player record storage.'],
      inputsAndOutputs: [
        'Inputs: member email identities, login events, admin-issued player mappings, and profile form updates.',
        'Outputs: authenticated sessions, player login records, synchronized profile data, and role-aware access behavior.',
      ],
      expectedBehavior: [
        'Authenticate approved members reliably.',
        'Associate the correct player record to each signed-in member.',
        'Allow safe profile updates without breaking account mappings.',
      ],
      failurePointsAndRisks: [
        'Incorrect player-to-email mappings can grant the wrong access or show the wrong profile.',
        'Auth or session issues can block members from using secured features.',
      ],
      operationalConsiderations: [
        'Admin updates to login mappings should be verified immediately with the affected member record.',
        'Role and identity changes should be handled carefully because they affect access across the app.',
      ],
      limitationsAndFutureImprovements: [
        'The current flow depends on admins for some identity correction tasks.',
        'Future improvements could streamline self-service recovery and reduce manual account-linking work.',
      ],
    },
    status: 'Active',
    owningArea: 'Accounts',
    currentState:
      'Player login creation, role management, and self-service profile editing are all present in the current app.',
    notes: [
      'Covers auth callback/login flows plus admin-issued player logins.',
      'Profiles are synchronized into application records for ongoing member management.',
    ],
    relatedIntegrations: ['Supabase'],
  },
]

export const integrationDocSeeds: IntegrationDocSeed[] = [
  {
    key: 'supabase',
    name: 'Supabase',
    summary: 'Primary backend for auth, storage, and application data access.',
    summaryDetails: {
      what: 'The core platform integration that provides authentication, database persistence, and shared application data access.',
      whyItExists:
        'It centralizes critical backend capabilities so the app can persist state, authenticate users, and support most operational workflows from one managed platform.',
      whoUsesIt: ['Application server routes and shared utilities.', 'Members and admins indirectly through every authenticated or data-backed flow.'],
      flow: [
        'Application routes initialize Supabase clients for server-side or admin operations.',
        'Auth flows create or validate sessions for members.',
        'Features read and write Postgres-backed records for gameplay, accounts, tournaments, and supporting content.',
      ],
      dependencies: ['Supabase Auth.', 'Supabase Postgres.', 'Application-side client utilities and migrations.'],
      inputsAndOutputs: [
        'Inputs: auth events, profile updates, tournament mutations, content records, and feature-specific queries.',
        'Outputs: persisted relational data, authenticated sessions, and the records consumed by feature and admin pages.',
      ],
      expectedBehavior: [
        'Provide reliable auth and persistence across core app flows.',
        'Return data in a consistent shape for server and UI consumers.',
      ],
      failurePointsAndRisks: [
        'Database or auth outages can impact multiple features at once.',
        'Schema drift or migration issues can break dependent routes.',
      ],
      operationalConsiderations: [
        'Migration and schema changes should be coordinated because many features depend on the same backend.',
        'Operational monitoring should prioritize auth health, database availability, and query reliability.',
      ],
      limitationsAndFutureImprovements: [
        'The integration is broad, so failures can have a wide blast radius.',
        'Future work could improve observability and harden recovery around critical auth and data paths.',
      ],
    },
    status: 'Active',
    connectedSystem: 'Supabase Auth + Postgres',
    owningArea: 'Platform',
    currentState:
      'Used broadly across authentication, player profiles, tournaments, rules, and content persistence.',
    notes: [
      'Application routes and shared server utilities depend on Supabase clients.',
      'Database migrations include profile sync and tournament-related schema changes.',
    ],
    relatedFeatures: ['Game recommendations', 'Tournament history and bracket', 'Player logins and profiles'],
  },
  {
    key: 'openai',
    name: 'OpenAI',
    summary: 'Provides the model-backed recommendation step for suggesting games to players.',
    summaryDetails: {
      what: 'An external AI integration used to evaluate candidate games and produce recommendation output for players.',
      whyItExists:
        'It adds flexible ranking and reasoning to the recommendation flow without requiring the app to hard-code all decision logic.',
      whoUsesIt: ['Players using game recommendations.', 'Platform maintainers tuning prompts and recommendation quality.'],
      flow: [
        'The recommendation route collects filters, candidate game context, and prior selections.',
        'The app builds a prompt and sends the request to the OpenAI API.',
        'The response is normalized into recommendation results that the UI can display to the player.',
      ],
      dependencies: ['OpenAI API availability.', 'Application prompt construction and response-shaping logic.', 'Supabase-backed game metadata used as prompt context.'],
      inputsAndOutputs: [
        'Inputs: user preferences, game metadata, prior selections, and recommendation prompt instructions.',
        'Outputs: model-generated ranking and explanation content returned to the game recommendation flow.',
      ],
      expectedBehavior: [
        'Produce recommendation output that is relevant, safe to display, and fast enough for an interactive session.',
        'Return results in a shape the app can normalize reliably.',
      ],
      failurePointsAndRisks: [
        'Third-party latency or outages can degrade the recommendation feature.',
        'Prompt drift or malformed responses can reduce quality or break parsing assumptions.',
      ],
      operationalConsiderations: [
        'Prompt changes should be tested against realistic game catalogs and group setups.',
        'Rate limits, response latency, and model behavior should be watched because they directly affect user experience.',
      ],
      limitationsAndFutureImprovements: [
        'Current usage is intentionally narrow and centered on recommendations only.',
        'Future work could improve evaluation, fallback behavior, and richer explanation quality.',
      ],
    },
    status: 'Active',
    connectedSystem: 'OpenAI API',
    owningArea: 'Platform',
    currentState:
      'The recommendation API route composes prompts and requests model output to rank candidate games.',
    notes: [
      'Currently centered on the recommendation workflow rather than broad platform-wide AI usage.',
      'Prompt construction and response shaping live in the server route implementation.',
    ],
    relatedFeatures: ['Game recommendations'],
  },
  {
    key: 'spotify',
    name: 'Spotify',
    summary: 'Syncs playlist metadata used in the app’s music-oriented admin configuration flows.',
    summaryDetails: {
      what: 'An external playlist integration for discovering, syncing, and organizing playlist metadata used by music-related admin tooling.',
      whyItExists:
        'It lets admins manage playlist-backed configuration inside the app instead of maintaining that metadata entirely by hand.',
      whoUsesIt: ['Admins managing favorite playlists and playlist ordering.', 'Any downstream app flows that consume synced playlist metadata.'],
      flow: [
        'An admin searches for playlists or selects target playlist metadata through the admin configuration flow.',
        'The app calls Spotify endpoints to retrieve playlist details.',
        'Selected playlist metadata is saved and ordered for later app use.',
      ],
      dependencies: ['Spotify Web API.', 'Application admin routes that fetch and persist playlist metadata.', 'Supabase or app storage used to save synced playlist state.'],
      inputsAndOutputs: [
        'Inputs: playlist search terms, playlist identifiers, and admin ordering or favorite selections.',
        'Outputs: synced playlist metadata and stored configuration used by the app’s music-oriented flows.',
      ],
      expectedBehavior: [
        'Return playlist search results and details that admins can act on.',
        'Persist favorite playlist selections and ordering changes reliably.',
      ],
      failurePointsAndRisks: [
        'Spotify API changes, auth problems, or rate limits can interrupt sync operations.',
        'Out-of-date playlist metadata can make admin configuration feel inconsistent.',
      ],
      operationalConsiderations: [
        'Admin-facing sync issues should be surfaced clearly because this integration supports configuration work.',
        'Playlist refresh behavior should be reviewed when metadata appears stale.',
      ],
      limitationsAndFutureImprovements: [
        'The current scope is limited to playlist discovery and synchronization.',
        'Future improvements could broaden automation and improve resilience around playlist metadata refreshes.',
      ],
    },
    status: 'Active',
    connectedSystem: 'Spotify Web API',
    owningArea: 'Platform',
    currentState:
      'Playlist search and favorite-playlist synchronization are available through admin and supporting API routes.',
    notes: [
      'Includes admin configuration routes for saving and ordering favorite playlists.',
      'The integration is currently operational but scoped to playlist discovery and sync.',
    ],
    relatedFeatures: [],
  },
]

export const runbookDocSeeds: RunbookDocSeed[] = [
  {
    key: 'associate-players-with-emails',
    name: 'Associate Players with Emails',
    summary: 'Link approved players to member email identities so they can access authenticated features.',
    summaryDetails: {
      what: 'An operational runbook for connecting a member email identity to the correct approved player record.',
      whyItExists:
        'It ensures members can sign in with the correct permissions and see the right player profile without requiring ad hoc troubleshooting each time.',
      whoUsesIt: ['Admins or player-operations staff granting or correcting member access.'],
      flow: [
        'Open the player logins admin workflow for the target member.',
        'Locate the existing player login or create the missing login identity.',
        'Associate the correct member email to the intended player record and save the update.',
        'Validate that the member can authenticate and that the correct player profile is returned.',
      ],
      dependencies: ['Next.js admin workflow for player logins.', 'Underlying auth and player record persistence in Supabase.'],
      inputsAndOutputs: [
        'Inputs: approved member email, target player profile, and admin confirmation of the intended mapping.',
        'Outputs: updated player-login mapping plus a verified authenticated experience for the member.',
      ],
      expectedBehavior: [
        'Create or repair the member-to-player association without impacting unrelated accounts.',
        'Allow the member to sign in and land on the correct profile after the update.',
      ],
      failurePointsAndRisks: [
        'Linking the wrong email or player record can grant access to the wrong identity.',
        'Skipping the verification step can leave access issues undiscovered until the member tries to log in.',
      ],
      operationalConsiderations: [
        'Confirm the intended player profile before saving because account mappings are sensitive.',
        'Re-test the member experience immediately after the change so issues are caught while the admin context is still open.',
      ],
      limitationsAndFutureImprovements: [
        'This process is still admin-driven rather than fully self-service.',
        'Future improvements could reduce manual mapping work and provide clearer recovery for mismatched identities.',
      ],
    },
    status: 'Active',
    owningArea: 'Player Ops',
    currentState:
      'Admins can issue or update player login identities from the player logins admin workflow when member access needs to be granted.',
    notes: [
      'Use this when a member account exists but is not yet connected to the correct player profile.',
      'Changes are made in the Next.js admin flow; Confluence should mirror the operational procedure only.',
    ],
    prerequisites: [
      'Admin access to the Next.js application.',
      'The member email address and intended player profile are already known.',
    ],
    steps: [
      'Open the Player logins admin page.',
      'Locate the target player or create the missing player login identity.',
      'Associate the correct email address with the player record and save the change.',
      'Confirm the member can authenticate and that the linked player profile appears correctly.',
    ],
  },
]
