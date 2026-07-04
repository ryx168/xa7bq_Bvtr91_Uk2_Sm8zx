/**
 * app.js — Main Entry Point and Final Assembler for the CloudMail application.
 * Imports domain mixins and merges them to build the main global App object.
 */

// Core imports
import { AppCore } from './app-core.js';
import { MailMixin } from './mail.js';
import { SportsMixin } from './sports.js?v=53';
import { SettingsMixin } from './settings.js';
import { MapMixin } from './map.js';
import { UiUtilsMixin } from './ui-utils.js';

// Legacy domain mixins
import { CalendarMixin } from './calendar.js?v=6';
import { PlaylistMixin } from './playlist.js';
import { EventPreviewMixin } from './event-preview.js';
import { ArtStyleSlideshowMixin } from './art-style-slideshow.js';
import { ContactsMixin } from './contacts.js?v=28';
import { ContactDetailMixin } from './contact-detail.js?v=2';
import { TagsSegmentsMixin } from './tags-segments.js';
import { CampaignsMixin } from './campaigns-mixin.js';
import { ReportsMixin } from './reports-mixin.js';
import { AutomationsMixin } from './automations-mixin.js';
import { ExportsConsentMixin } from './ExportsConsentMixin.js?v=9';
import { ManualImageGenMixin } from './manual-image-gen.js';
import { SportsBetting } from './sports-betting.js';

// Create a single unified App object by merging all properties and methods
const App = Object.assign(
    {},
    AppCore,
    MailMixin,
    SportsMixin,
    SettingsMixin,
    MapMixin,
    UiUtilsMixin,
    CalendarMixin,
    PlaylistMixin,
    EventPreviewMixin,
    ArtStyleSlideshowMixin,
    ContactsMixin,
    ContactDetailMixin,
    TagsSegmentsMixin,
    CampaignsMixin,
    ReportsMixin,
    AutomationsMixin,
    ExportsConsentMixin,
    ManualImageGenMixin,
    SportsBetting
);

// Bind App to global window scope so that HTML element inline listeners can access it
window.App = App;
window.onload = () => App.init();

console.log('CloudMail App.js modularized entry loaded successfully');
