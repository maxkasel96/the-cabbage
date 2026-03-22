import type { FeatureDocSeed, IntegrationDocSeed, RunbookDocSeed } from './types'

export const featureDocSeeds: FeatureDocSeed[] = [
  {
    key: 'game-recommendations',
    name: 'Game recommendations',
    summary: 'Generate board game recommendations from player counts, tags, and prior selections.',
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
