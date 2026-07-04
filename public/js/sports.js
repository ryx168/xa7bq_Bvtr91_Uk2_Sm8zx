/**
 * sports.js — Main Assembly Entry Point for the Sports Domain Mixin.
 * Imports and merges all sub-mixins to preserve the backward-compatible interface.
 */

import { SportsMixin as Render } from './sports-render.js?v=53';
import { SportsMixin as Refs   } from './sports-7m.js?v=53';
import { SportsMixin as Sched  } from './sports-schedule.js?v=53';
import { SportsMixin as SI     } from './sports-sportsinteraction.js?v=53';
import { SportsMixin as PN     } from './sports-betting-ui.js?v=53';
import { SportsMixin as PlayNow} from './sports-playnow.js?v=53';
import { SportsMixin as LastGame } from './sports-last-game.js?v=53';
import { SportsMixin as Fifa2026 } from './sports_fifa2026.js?v=53';
import { SportsLeagueMixin } from './sports_leagual.js?v=53';

export const SportsMixin = { ...Render, ...Refs, ...Sched, ...SI, ...PN, ...PlayNow, ...LastGame, ...Fifa2026, ...SportsLeagueMixin };
