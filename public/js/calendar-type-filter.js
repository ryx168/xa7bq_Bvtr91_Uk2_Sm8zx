/**
 * calendar-type-filter.js
 * Standalone type-filter module with a 4-level collapsible tree:
 *
 *   Level 0  "All Types"
 *   Level 1  Group folder  (People / Nature / Robot & Object / Food, Art & Event / Abstract)
 *   Level 2  Base type     (mammal / bird / fish …)
 *   Level 3  Sub-category  (within large bases: Domestic, Wild Africa, Marine …)
 *   Level 4  Leaf          (individual species / items)
 *
 * Bases with ≤ MAX_FLAT_LEAVES leaf entries skip the sub-category level and
 * render leaves directly at Level 3.
 *
 * Load order:
 *   1. cloudmain.js
 *   2. calendar-location-filter.js
 *   3. calendar-type-filter.js     ← this file
 *   4. calendar-tag-filters.js
 */

const CalendarTypeFilter = {

    // =========================================================================
    // CONSTANTS
    // =========================================================================

    /** Bases with more leaf entries than this get a sub-category level. */
    MAX_FLAT_LEAVES: 500,

    /** Bases that ALWAYS get a sub-category level even if they have fewer leaves. */
    _FORCE_SUBCATS: new Set(['pet', 'plant', 'flower', 'person', 'people', 'human', 'figure', 'portrait', 'historical figure']),

    /**
     * Groups listed here skip the Level-2 base-type row entirely.
     * Clicking the group header is the only filter — no expansion into bases.
     * Removed 'People' — People should expand to show person/portrait/figure bases.
     */
    _NO_BASE_LEVEL_GROUPS: new Set([]),

    /** Translations for groups and major bases. */
    _TYPE_TRANSLATIONS: {
        'all types':            '所有类别',
        'characters':           '角色',
        'people':               '人物',
        'nature':               '自然',
        'animal':               '动物',
        'plant':                '植物',
        'physicals':            '实体',
        'art & event':          '艺术与活动',
        'abstract':             '抽象',

        'items':                '物品',
        'foods':                '食品',
        'vehicles':             '载具',
        'structures':           '设施与建筑',
        'destinations':         '目的地',

        'person':               '人',
        'human':                '人类',
        'figure':               '人物',
        'historical figure':    '历史人物',
        'portrait':             '肖像',

        // People sub-categories
        'notables':             '名人',
        'identities':           '身份',
        'divinities':           '神明/神话',
        
        'pet':                  '宠物',
        'mammal':               '哺乳动物',
        'bird':                 '鸟类',
        'fish':                 '鱼类',
        'reptile':              '爬行动物',
        'amphibian':            '两栖动物',
        'insect':               '昆虫',
        'invertebrate':         '无脊椎动物',
        'arachnid':             '蛛形纲',
        'arthropod':            '节肢动物',
        'crustacean':           '甲壳类',
        'fossil':               '化石',
        'reptile & invertebrate': '爬行与无脊椎动物',
        
        'dogs':                 '狗',
        'cats':                 '猫',
        
        'flower':               '花卉',

        'robot':                '机器人',
        'machine':              '机器',
        'vehicle':              '车辆',
        'aircraft':             '飞行器',
        'plane':                '飞机',
        'airplane':             '飞机',
        'ship':                 '船只',
        'weapon':               '武器',
        'tool':                 '工具',
        'instrument':           '乐器',
        'satellite':            '卫星',
        'monument':             '纪念碑',
        'building':             '建筑',
        'structure':            '建筑结构',
        'landmark':             '地标',
        'doll':                 '玩偶',
        'toy':                  '玩具',
        'object':               '物体',
        'artifact':             '文物',
        'lacquerware':          '漆器',
        'clothes':              '服装',
        'clothing':             '服装',
        
        'food':                 '美食',
        'cuisine':              '佳肴',
        'dish':                 '菜肴',
        'drink':                '饮品',
        'beverage':             '饮料',
        'art':                  '艺术',
        'painting':             '绘画',
        'sculpture':            '雕塑',
        'music':                '音乐',
        'dance':                '舞蹈',
        'performance':          '表演',
        'festival':             '节日',
        'event':                '活动',
        'ceremony':             '仪式',
        'sport':                '体育',
        'game':                 '游戏',
        'craft':                '手工艺品',
        'textile':              '纺织',
        'architecture':         '建筑风格',

        'concept':              '概念',
        'plan':                 '规划',
        'idea':                 '想法',
        'symbol':               '象征',
        'energy':               '能量',
        'kinetic energy':       '动能',
        'celestial body':       '天体',
        'spiritual':            '精神',
        'religious':            '宗教',
        'natural phenomenon':   '自然现象',
        'landscape':            '风景',
        'scenery':              '景色',
        'weather':              '天气',
        'geography':            '地理',
        'organ':                '器官',
        'body parts':           '身体部位',
        'wearables':            '穿戴物品',
    },

    // ── Group membership ──────────────────────────────────────────────────────
    _TYPE_GROUP_MAP: {
        // Characters
        'person':           'Characters',
        'people':           'Characters',
        'human':            'Characters',
        'figure':           'Characters',
        'historical figure':'Characters',
        'portrait':         'Characters',
        'mythical':         'Characters',
        'mythological':     'Characters',
        // Nature
        'animal':           'Nature',
        'pet':              'Nature',
        'mammal':           'Nature',
        'bird':             'Nature',
        'fish':             'Nature',
        'reptile':          'Nature',
        'amphibian':        'Nature',
        'insect':           'Nature',
        'invertebrate':     'Nature',
        'arachnid':         'Nature',
        'arthropod':        'Nature',
        'crustacean':       'Nature',
        'reptile & invertebrate': 'Nature',
        // Plant
        'plant':            'Nature',
        // Physicals
        'robot':            'Physicals',
        'machine':          'Physicals',
        'vehicle':          'Physicals',
        'aircraft':         'Physicals',
        'plane':            'Physicals',
        'airplane':         'Physicals',
        'ship':             'Physicals',
        'weapon':           'Physicals',
        'tool':             'Physicals',
        'instrument':       'Physicals',
        'satellite':        'Physicals',
        'monument':         'Physicals',
        'building':         'Physicals',
        'structure':        'Physicals',
        'landmark':         'Physicals',
        'doll':             'Physicals',
        'toy':              'Physicals',
        'object':           'Physicals',
        'artifact':         'Physicals',
        'lacquerware':      'Physicals',
        'clothes':          'Physicals',
        'clothing':         'Physicals',
        'fossil':           'Physicals',
        'food':             'Physicals',
        'cuisine':          'Physicals',
        'dish':             'Physicals',
        'drink':            'Physicals',
        'beverage':         'Physicals',
        'landscape':        'Physicals',
        'scenery':          'Physicals',
        'geography':        'Physicals',
        'architecture':     'Physicals',
        'destination':      'Physicals',
        // Art & Event
        'art':              'Art & Event',
        'painting':         'Art & Event',
        'sculpture':        'Art & Event',
        'music':            'Art & Event',
        'dance':            'Art & Event',
        'performance':      'Art & Event',
        'festival':         'Art & Event',
        'event':            'Art & Event',
        'ceremony':         'Art & Event',
        'sport':            'Art & Event',
        'game':             'Art & Event',
        'craft':            'Art & Event',
        'textile':          'Art & Event',
        // Abstract
        'abstract':             'Abstract',
        'concept':              'Abstract',
        'plan':                 'Abstract',
        'idea':                 'Abstract',
        'symbol':               'Abstract',
        'energy':               'Abstract',
        'kinetic energy':       'Abstract',
        'celestial body':       'Abstract',
        'spiritual':            'Abstract',
        'religious':            'Abstract',
        'natural phenomenon':   'Physicals',
        'weather':              'Physicals',
        'toboggan':     'Physicals',
        'sled':         'Physicals',
        'sleigh':       'Physicals',
        'snowmobile':   'Physicals',
        'luge':         'Physicals',
        'bobsled':      'Physicals',
        'bobsleigh':    'Physicals',
        'organ':        'Physicals',
    },

    /** Display order / icon / accent colour for the six parent groups. */
    _TYPE_GROUP_META: [
        { key: 'Characters',       icon: 'fas fa-user',      color: '#0369a1' },
        { key: 'Nature',           icon: 'fas fa-leaf',       color: '#0f766e' },
        { key: 'Physicals',        icon: 'fas fa-cube',      color: '#7e22ce' },
        { key: 'Art & Event',      icon: 'fas fa-palette',   color: '#166534' },
        { key: 'Abstract',         icon: 'fas fa-lightbulb', color: '#9a3412' },
    ],

    // ── Sub-category definitions ───────────────────────────────────────────────
    /**
     * Keys are the leaf name (the part AFTER "base - ").
     * Values are the sub-category label shown at Level 3.
     * Leaves not listed fall into the 'Other' bucket.
     *
     * People bases use a classification function (_classifyPeopleLeaf) rather
     * than an exhaustive static map.  The static entries below serve as
     * explicit overrides; anything not listed is classified automatically.
     *
     * Sub-category definitions for the People group:
     * Sub-Category,Definition,Examples
     * Notables (名人),Specific historical or contemporary figures.,"Scientists, musicians, pioneers, inventors."
     * Identities (身份),"General roles, professions, or social statuses.","Developer, artist, traveler, citizen."
     * Divinities (神明),"Supernatural, mythological, or planetary beings.","Gods, goddesses, celestial entities."
     */

    // ── Keywords used by _classifyPeopleLeaf ──────────────────────────────────
    _PEOPLE_DIVINITY_KEYWORDS: new Set([
        'god', 'goddess', 'deity', 'divine', 'spirit', 'angel', 'demon',
        'mythical', 'mythological', 'celestial', 'planetary', 'immortal',
        'oracle', 'bodhisattva', 'buddha', 'avatar',
        'allegorical', 'allegory', 'personification', 'personified',
        'allegorical figure', 'mythical figure',
        'embodiment', 'incarnation', 'manifestation',
        'genius loci', 'tutelary', 'patron spirit', 'spirit of', 'figure',

        // ── Planetary & Roman deities ─────────────────────────────────────────
        'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune',
        'pluto', 'janus', 'minerva', 'diana', 'bacchus', 'vulcan', 'ceres',
        'proserpina', 'cupid', 'aurora', 'flora', 'luna', 'sol',

        // ── Greek equivalents ─────────────────────────────────────────────────
        'hermes', 'aphrodite', 'ares', 'zeus', 'hera', 'hephaestus',
        'demeter', 'persephone', 'dionysus', 'artemis', 'apollo', 'poseidon',
        'hades', 'hypnos', 'eros', 'nike', 'tyche', 'iris', 'athena', 'kronos',

        // ── Allegorical national personifications ────────────────────────────
        'quebecia', 'columbia', 'britannia', 'marianne', 'helvetia',
        'hibernia', 'caledonia', 'germania', 'italia', 'gallia',

        // ── Other mythological figures ───────────────────────────────────────
        'odin', 'thor', 'tyr', 'loki', 'freya',
        'ra', 'osiris', 'isis', 'horus', 'anubis',
        'shiva', 'vishnu', 'brahma', 'krishna', 'lakshmi', 'durga',
        'jade emperor', 'guanyin', 'nezha',
        'quetzalcoatl', 'tezcatlipoca', 'tlaloc',
        'kū', 'ogum', 'lake spirit', 'solar war god', 'huntress',
    ]),

    _PEOPLE_NOTABLE_KEYWORDS: new Set([
        'scientist', 'musician', 'pioneer', 'inventor',
        'architect', 'philosopher', 'mathematician', 'chemist', 'physicist',
        'biologist', 'astronomer', 'composer', 'painter', 'sculptor',
        'writer', 'poet', 'playwright', 'historian', 'general', 'admiral',
        'emperor', 'empress', 'pharaoh', 'tsar', 'khan',
        // ── NEW ──────────────────────────────────────────────────────────
        'cryptographer', 'revolutionary', 'reformer', 'theorist', 'founder',
        'statesman', 'monarch', 'activist', 'author', 'polymath', 'scholar',
        // ── Mythic / Epithet titles ──────────────────────────────────────
        'harbinger', 'herald', 'emissary', 'sentinel', 'messenger',
        'keeper', 'bearer', 'watcher', 'weaver', 'seeker', 'wanderer',
        'chosen', 'guardian', 'champion', 'avenger', 'redeemer',
        'prophet', 'prophetess', 'saint', 'seer', 'sage', 'elder',
        // ── Religious & Prophetic Titles ─────────────────────────────────────
        'apostle', 'martyr', 'blessed', 'visionary', 'mystic',
        'preacher', 'evangelist', 'missionary', 'canonized', 'beatified',
        // ── African & Indigenous Leadership Titles ────────────────────────────
        'chieftain', 'chieftess', 'queen mother', 'griot',
        'medicine man', 'medicine woman', 'high priest', 'high priestess',
        'witch doctor', 'sangoma',
        // ── Epithets used as Notable descriptors ─────────────────────────────
        'the african', 'african prophetess', 'the prophetess',
        'liberator', 'emancipator', 'abolitionist', 'suffragist',
        'suffragette', 'resistance fighter', 'freedom fighter',
        'independence leader', 'nationalist leader',
    ]),

    _PEOPLE_IDENTITY_KEYWORDS: new Set([
        'artist', 'dancer', 'actor', 'actress', 'performer',
        'developer', 'engineer', 'programmer', 'coder', 'designer',
        'doctor', 'nurse', 'surgeon', 'physician', 'healer',
        'teacher', 'professor', 'scholar', 'student', 'academic',
        'soldier', 'warrior', 'knight', 'samurai', 'ninja', 'guard',
        'farmer', 'fisherman', 'hunter', 'gatherer', 'herder',
        'merchant', 'trader', 'shopkeeper', 'vendor',
        'traveler', 'explorer', 'pilgrim', 'nomad',
        'citizen', 'villager', 'resident', 'refugee',
        'child', 'elder', 'youth', 'teenager', 'adult',
        'worker', 'laborer', 'craftsman', 'artisan',
        'leader', 'king', 'queen', 'emperor', 'empress', 'ruler', 'chief',
        'politician', 'diplomat', 'ambassador',
        'athlete', 'runner', 'swimmer', 'climber',
        'monk', 'nun', 'priest', 'imam', 'rabbi', 'shaman',
        'portrait', 'figure', 'human', 'person', 'people',
    ]),

    /**
     * Classify a People leaf into one of the three sub-categories.
     *
     * Priority order:
     *   1. Explicit override in _TYPE_SUBCATS['person'] (if present)
     *   2. Divinity keywords  → 'Divinities'
     *   3. Identity keywords  → 'Identities'
     *   4. Anything else with a proper-noun feel (title-cased, not a common word)
     *      → 'Notables'
     *   5. Fallback           → 'Identities'
     */
    _classifyPeopleLeaf(leafName) {
        const low = leafName.toLowerCase().trim();

        // ── 0. "The <Adj> <Role>" epithet pattern → Notable ──────────────────
        //    e.g. "The African Prophetess", "The Maid of Orleans",
        //         "The Iron Lady", "The Black Prince"
        const epithetPattern = /^the\s+\w+(?:\s+of\s+\w+|\s+\w+)?$/i;
        if (epithetPattern.test(low)) return 'Notables';

        // ── 1. Divinity keywords ─────────────────────────────────────────────
        for (const kw of this._PEOPLE_DIVINITY_KEYWORDS) {
            if (low === kw || low.includes(kw)) return 'Divinities';
        }

        // ── 2. Notable keywords ──────────────────────────────────────────────
        for (const kw of this._PEOPLE_NOTABLE_KEYWORDS) {
            if (low === kw || low.includes(kw)) return 'Notables';
        }

        // ── 3. Identity keywords ─────────────────────────────────────────────
        for (const kw of this._PEOPLE_IDENTITY_KEYWORDS) {
            if (low === kw || low.includes(kw)) return 'Identities';
        }

        // ── 4. CJK name (2–4 Han characters) → Notable ───────────────────────
        if (/^[\u4e00-\u9fff]{2,4}$/.test(leafName.trim())) return 'Notables';

        // ── 5. Looks like a proper person name → Notable ─────────────────────
        //    Matches: "Ingvar Kamprad", "Epeli Hauʻofa", "Ludwig van Beethoven"
        //    Allows ʻokina (U+02BB), curly apostrophes, hyphens inside names
        const namePattern = /^[A-Z][\p{L}\u02bb\u02bc\u2018\u2019'\-]+(?:\s+(?:van|von|de|da|du|d'|le|la|el|al|bin|binti|o|e)\s+)?(?:\s*[A-Z][\p{L}\u02bb\u02bc\u2018\u2019'\-]+){1,3}$/u;
        if (namePattern.test(leafName.trim())) return 'Notables';

        // ── 6. Single capitalised word (not caught above) → Notable ──────────
        const words = leafName.trim().split(/\s+/);
        if (words.length === 1 && /^[A-Z]/.test(words[0]) && low.length > 3) {
            return 'Notables';
        }

        // ── 7. Fallback ───────────────────────────────────────────────────────
        return 'Identities';
    },

    _classifyPhysicalItem(rawType) {
        if (!rawType) return 'Items';
        let base = rawType.split(' - ')[0].trim().toLowerCase();
        const generic = new Set(['animal', 'people', 'person', 'plant']);
        if (generic.has(base)) {
            const parts = rawType.split(' - ').map(s => s.trim());
            if (parts.length > 1) {
                base = parts[1].toLowerCase();
            }
        }
        
        switch (base) {
            case 'food': case 'cuisine': case 'dish': case 'drink': case 'beverage':
                return 'Foods';
            case 'vehicle': case 'aircraft': case 'plane': case 'airplane': case 'ship': case 'satellite':
            case 'toboggan': case 'sled': case 'sleigh':
                return 'Vehicles';
            case 'building': case 'structure': case 'monument': case 'architecture':
                return 'Structures';
            case 'landmark': case 'geography': case 'landscape': case 'scenery':
            case 'natural phenomenon': case 'weather': case 'destination':
                return 'Destinations';
            case 'organ':
                return 'Body Parts';
            case 'clothes': case 'clothing':
                return 'Wearables';
            default:
                return 'Items';
        }
    },

    _TYPE_SUBCATS: {

        // ── People bases — leaves are classified via _classifyPeopleLeaf ───────
        // Add explicit overrides here only when auto-classification is wrong.
        // The actual sub-category assignment lives in renderTypeTree / _typeMatchesFilter.
        person: {},
        people: {},
        human: {},
        figure: {},
        portrait: {},
        'historical figure': {},

        // ── pet ────────────────────────────────────────────────────────────────
        pet: {
            // Cats
            'Abyssinian':             'Cats',
            'British Shorthair':      'Cats',
            'Japanese Bobtail':       'Cats',
            'Maine Coon':             'Cats',
            'Savannah Cat':           'Cats',
            'cat':                    'Cats',
            // Dogs
            'Askal / Aspin':          'Dogs',
            'Basenji':                'Dogs',
            'Bedlington Terrier':     'Dogs',
            'Dogo Argentino':         'Dogs',
            'French Bulldog':         'Dogs',
            'German Shepherd':        'Dogs',
            'Rhodesian Ridgeback':    'Dogs',
            'Saluki':                 'Dogs',
            'Samoyed':                'Dogs',
            'Spanish Water Dog':      'Dogs',
            'Thai Ridgeback':         'Dogs',
            'Tibetan Mastiff':        'Dogs',
            'dog':                    'Dogs',
        },

        // ── mammal ─────────────────────────────────────────────────────────────
        mammal: {
            // Farm & Livestock
            'alpaca':                 'Farm & Livestock',
            'goat':                   'Farm & Livestock',
            'llama':                  'Farm & Livestock',
            'sheep':                  'Farm & Livestock',
            'wild boar':              'Farm & Livestock',
            'Spanish Fighting Bull':  'Farm & Livestock',
            // African Wildlife
            'african elephant':       'African Wildlife',
            'African Manatee':        'African Wildlife',
            'Great Kudu':             'African Wildlife',
            'Hamadryas Baboon':       'African Wildlife',
            'Monk Seal':              'African Wildlife',
            'elephant':               'African Wildlife',
            'hippo':                  'African Wildlife',
            'honey badger':           'African Wildlife',
            'leopard':                'African Wildlife',
            'lion':                   'African Wildlife',
            'lioness':                'African Wildlife',
            'meerkat':                'African Wildlife',
            'tigerfish':              'African Wildlife',
            'wildebeest':             'African Wildlife',
            'zebra':                  'African Wildlife',
            // Asian Wildlife
            'asian elephant':         'Asian Wildlife',
            'Bengal tiger':           'Asian Wildlife',
            'Capuchin':               'Asian Wildlife',
            // Americas Wildlife
            'American Badger':        'Americas Wildlife',
            'American Bison':         'Americas Wildlife',
            'Collared Peccary':       'Americas Wildlife',
            'Hairy Armadillo':        'Americas Wildlife',
            'beaver':                 'Americas Wildlife',
            'condor':                 'Americas Wildlife',
            'giant anteater':         'Americas Wildlife',
            'kangaroo':               'Americas Wildlife',
            'platypus':               'Americas Wildlife',
            'raccoon':                'Americas Wildlife',
            'three-toed sloth':       'Americas Wildlife',
            // European & Eurasian Wildlife
            'Alpine Ibex':            'European & Eurasian Wildlife',
            'Argali':                 'European & Eurasian Wildlife',
            'Arabian Oryx':           'European & Eurasian Wildlife',
            'Eurasian Red Squirrel':  'European & Eurasian Wildlife',
            'European Mouflon':       'European & Eurasian Wildlife',
            'bear':                   'European & Eurasian Wildlife',
            'timber wolf':            'European & Eurasian Wildlife',
            // Marine Mammals
            'narwhal':                'Marine Mammals',
            'beluga whale':           'Marine Mammals',
            'blue whale':             'Marine Mammals',
            'bowhead whale':          'Marine Mammals',
            'humpback whale':         'Marine Mammals',
            'sperm whale':            'Marine Mammals',
            'whale':                  'Marine Mammals',
            'dolphin':                'Marine Mammals',
            'manta ray':              'Marine Mammals',
            'marlin':                 'Marine Mammals',
            'orca':                   'Marine Mammals',
            'otter':                  'Marine Mammals',
            'porpoise':               'Marine Mammals',
            'seal':                   'Marine Mammals',
            'sea lion':               'Marine Mammals',
            'walrus':                 'Marine Mammals',
            'manatee':                'Marine Mammals',
            'dugong':                 'Marine Mammals',
            'polar bear':             'Marine Mammals',
            // Primates
            'chimpanzee':             'Primates',
            'human':                  'Primates',
            // Symbols & Misc (items wrongly or loosely tagged as mammal)
            'anchor':                 'Symbols & Misc',
            'banner pole':            'Symbols & Misc',
            'gold mask':              'Symbols & Misc',
            'maple leaf':             'Symbols & Misc',
            'Terracotta Warrior':     'Symbols & Misc',
            'unknown':                'Symbols & Misc',
        },

        // ── bird ───────────────────────────────────────────────────────────────
        bird: {
            // Wading & Water Birds
            'Great Blue Heron':       'Wading & Water Birds',
            'great blue heron':       'Wading & Water Birds',
            'heron':                  'Wading & Water Birds',
            'grey heron':             'Wading & Water Birds',
            'gray heron':             'Wading & Water Birds',
            'night heron':            'Wading & Water Birds',
            'White Stork':            'Wading & Water Birds',
            'white stork':            'Wading & Water Birds',
            'stork':                  'Wading & Water Birds',
            'black stork':            'Wading & Water Birds',
            'egret':                  'Wading & Water Birds',
            'great egret':            'Wading & Water Birds',
            'snowy egret':            'Wading & Water Birds',
            'ibis':                   'Wading & Water Birds',
            'spoonbill':              'Wading & Water Birds',
            'flamingo':               'Wading & Water Birds',
            'pelican':                'Wading & Water Birds',
            'cormorant':              'Wading & Water Birds',
            'Canada Goose':           'Wading & Water Birds',
            'canada goose':           'Wading & Water Birds',
            'goose':                  'Wading & Water Birds',
            'duck':                   'Wading & Water Birds',
            'swan':                   'Wading & Water Birds',
            'puffin':                 'Wading & Water Birds',
            // Owls & Raptors
            'Great Gray Owl':         'Owls & Raptors',
            'great gray owl':         'Owls & Raptors',
            'owl':                    'Owls & Raptors',
            'barn owl':               'Owls & Raptors',
            'snowy owl':              'Owls & Raptors',
            'eagle':                  'Owls & Raptors',
            'bald eagle':             'Owls & Raptors',
            'harpy eagle':            'Owls & Raptors',
            'hawk':                   'Owls & Raptors',
            'falcon':                 'Owls & Raptors',
            'vulture':                'Owls & Raptors',
            'kite':                   'Owls & Raptors',
            'secretary bird':         'Owls & Raptors',
            // Corvids & Passerines
            'American Crow':          'Corvids & Passerines',
            'New Caledonian Crow':    'Corvids & Passerines',
            'Oriental Magpie':        'Corvids & Passerines',
            'crow':                   'Corvids & Passerines',
            'raven':                  'Corvids & Passerines',
            'magpie':                 'Corvids & Passerines',
            'jay':                    'Corvids & Passerines',
            'sparrow':                'Corvids & Passerines',
            'robin':                  'Corvids & Passerines',
            'swallow':                'Corvids & Passerines',
            'nightingale':            'Corvids & Passerines',
            'canary':                 'Corvids & Passerines',
            'finch':                  'Corvids & Passerines',
            // Tropical Birds
            'macaw':                  'Tropical Birds',
            'parrot':                 'Tropical Birds',
            'toucan':                 'Tropical Birds',
            'quetzal':                'Tropical Birds',
            'kingfisher':             'Tropical Birds',
            'hornbill':               'Tropical Birds',
            'bird of paradise':       'Tropical Birds',
            'peacock':                'Tropical Birds',
            'cockatoo':               'Tropical Birds',
            'hummingbird':            'Tropical Birds',
            // Flightless & Large Birds
            'ostrich':                'Flightless & Large Birds',
            'emu':                    'Flightless & Large Birds',
            'cassowary':              'Flightless & Large Birds',
            'kiwi':                   'Flightless & Large Birds',
            'kakapo':                 'Flightless & Large Birds',
            'penguin':                'Flightless & Large Birds',
            'emperor penguin':        'Flightless & Large Birds',
            'shoebill':               'Flightless & Large Birds',
            'pheasant':               'Flightless & Large Birds',
            'woodpecker':             'Flightless & Large Birds',
        },

        // ── fish ───────────────────────────────────────────────────────────────
        fish: {
            'Flying Fish':            'Open Ocean',
            'Great White Shark':      'Open Ocean',
            'sailfish':               'Open Ocean',
            'Koi':                    'Freshwater',
            'Mandarin Dragonet':      'Freshwater',
            'electric eel':           'Freshwater',
            'piranha':                'Freshwater',
            'salmon':                 'Freshwater',
            'sturgeon':               'Freshwater',
        },

        // ── reptile ────────────────────────────────────────────────────────────
        'reptile & invertebrate': {
            // Crustaceans
            'king crab':          'Crustaceans',
            'red king crab':      'Crustaceans',
            'blue king crab':     'Crustaceans',
            'crab':               'Crustaceans',
            'lobster':            'Crustaceans',
            'shrimp':             'Crustaceans',
            'prawn':              'Crustaceans',
            'krill':              'Crustaceans',
            'barnacle':           'Crustaceans',
            // Invertebrates
            'octopus':            'Molluscs & Invertebrates',
            'squid':              'Molluscs & Invertebrates',
            'jellyfish':          'Molluscs & Invertebrates',
            'sea urchin':         'Molluscs & Invertebrates',
            'starfish':           'Molluscs & Invertebrates',
            'clam':               'Molluscs & Invertebrates',
            'oyster':             'Molluscs & Invertebrates',
            'conch':              'Molluscs & Invertebrates',
            'queen conch':        'Molluscs & Invertebrates',
            'snail':              'Molluscs & Invertebrates',
            // Reptiles (existing entries from reptile subcat)
            'chameleon':          'Lizards & Monitors',
            'Gila Monster':       'Lizards & Monitors',
            'cobra':              'Snakes',
            'snake':              'Snakes',
            'dragon':             'Snakes',
            'Spider-tailed Horned Viper': 'Snakes',
            'sea turtle':         'Turtles',
            'turtle':             'Turtles',
            'ostrich eggshell':   'Other',
            // Insects/Arachnids
            'butterfly':          'Insects',
            'honeybee':           'Insects',
            'orchid mantis':      'Insects',
            'stick insect':       'Insects',
            'spider':             'Arachnids',
            'scorpion':           'Arachnids',
        },

        plant: {
            // Flowers & Ornamental
            'Azalea':                         'Flowers & Ornamental',
            'Fuchsia':                        'Flowers & Ornamental',
            'Torch Ginger':                   'Flowers & Ornamental',
            'Verdant Linen · Opsia':          'Flowers & Ornamental',
            'Rose of Jericho':                'Flowers & Ornamental',
            'Cherry Blossom':                 'Flowers & Ornamental',
            'Lotus':                          'Flowers & Ornamental',
            'Rose':                           'Flowers & Ornamental',
            // Trees
            'Giant Sequoia':                  'Trees',
            'mangrove':                       'Trees',
            'pine tree':                      'Trees',
            'rubber tree':                    'Trees',
            // Food Plants
            'Habanero (哈瓦那辣椒)':           'Food Plants',
            // Succulents & Cacti
            'succulent':                      'Succulents & Cacti',
            // Crafted & Sculpted
            'Carved Soap Lotus':              'Crafted & Sculpted',
        },




        // ── celestial body ─────────────────────────────────────────────────────
        'celestial body': {
            'Mercury': 'Planets',
            'moon':    'Natural Satellites',
        },
    },

    // ── Set of base keys that belong to the People group ─────────────────────
    _PEOPLE_BASES: new Set(['person', 'people', 'human', 'figure', 'portrait', 'historical figure']),

    _normalizeTypeTag(rawType) {
        if (!rawType) return rawType;
        const parts = rawType.split(' - ').map(s => s.trim());
        if (parts.length === 0) return rawType;
        const lowLeaf = parts[parts.length - 1].toLowerCase();
        
        const pets = new Set([
            'abyssinian', 'british shorthair', 'japanese bobtail', 'maine coon', 'savannah cat', 'cat',
            'askal / aspin', 'basenji', 'bedlington terrier', 'dogo argentino', 'french bulldog', 
            'german shepherd', 'rhodesian ridgeback', 'saluki', 'samoyed', 'spanish water dog', 
            'thai ridgeback', 'tibetan mastiff', 'dog'
        ]);

        if (pets.has(lowLeaf)) {
            if (parts[0].toLowerCase() === 'animal') {
                return `animal - pet - ${parts[parts.length - 1]}`;
            } else if (parts[0].toLowerCase() === 'mammal') {
                return `pet - ${parts[parts.length - 1]}`;
            } else {
                if (parts.length >= 2 && parts[parts.length - 2].toLowerCase() === 'pet') {
                    return rawType;
                }
                return `pet - ${parts[parts.length - 1]}`;
            }
        }
        // Remap flower base to plant
        if (parts[0].toLowerCase() === 'flower') {
            return ['plant', ...parts.slice(1)].join(' - ');
        }
        return rawType;
    },

    _collectTypeData() {
        const result = new Map();   // group → Map<base → Set<fullType>>

        const ensure = (group, base, full) => {
            if (!result.has(group)) result.set(group, new Map());
            const gMap = result.get(group);
            if (!gMap.has(base)) gMap.set(base, new Set());
            gMap.get(base).add(full);
        };

        const process = (tags) => {
            if (!tags?.type) return;
            const typeStr = this._normalizeTypeTag(tags.type);
            const c = this._classifyType(typeStr);
            if (c) ensure(c.group, c.base, typeStr);
        };

        const customEvents = JSON.parse(localStorage.getItem('cloudmail_events') || '[]');
        customEvents.forEach(ev => {
            let t = ev.tags;
            if (!t && ev.description) t = this.parseTagsFromDescription?.(ev.description);
            process(t);
        });

        const latestItems = window.cloudmailLatestEvents?.items || [];
        latestItems.forEach(item => {
            if (item.extendedProperties?.private?.videoTags) {
                try { process(JSON.parse(item.extendedProperties.private.videoTags)); } catch(e) {}
            }
        });

        return result;
    },

    _classifyType(rawType) {
        if (!rawType) return null;
        let base  = rawType.split(' - ')[0].trim().toLowerCase();
        let group = this._TYPE_GROUP_MAP[base] || 'Abstract';

        const generic = new Set(['animal', 'plant', 'flower']);
        if (generic.has(base)) {
            const parts = rawType.split(' - ').map(s => s.trim());
            if (parts.length > 1) {
                let nextBase = parts[1].toLowerCase();
                let nextGroup = this._TYPE_GROUP_MAP[nextBase] || group;
                if (nextGroup !== 'Characters') {
                    base = nextBase;
                    group = nextGroup;
                }
            }
        }

        // Merge flower into plant base
        if (base === 'flower') {
            base = 'plant';
            group = 'Nature';
        }

        // Unify all Characters into a single base to prevent fragmentation
        if (group === 'Characters' || this._PEOPLE_BASES.has(base)) {
            base = 'person';
            group = 'Characters';
        } else if (group === 'Physicals') {
            base = 'physical';
        }

        // Combine smaller animal categories into one base layer to reduce folder clutter
        const bugsRep = new Set(['amphibian', 'arachnid', 'arthropod', 'crustacean', 'insect', 'invertebrate', 'reptile']);
        if (bugsRep.has(base)) {
            base = 'reptile & invertebrate';
            group = 'Nature';
        }

        return { base, group };
    },

    _getLeafParts(fullType, base) {
        let parts = fullType.split(' - ').map(s => s.trim());
        if (['animal', 'people', 'person', 'plant'].includes(parts[0]?.toLowerCase())) {
            parts = parts.slice(1);
        }
        if (parts[0]?.toLowerCase() === base) {
            parts = parts.slice(1);
        }
        return parts;
    },

    /**
     * Determine the People sub-category for a given leaf.
     * Consults the explicit override map first, then falls back to
     * _classifyPeopleLeaf (keyword + heuristic logic).
     */
    _getPeopleSubcat(base, leafName) {
        // ── Strip trailing date patterns, CJK, and non-ASCII metadata ──
        const cleanLeaf = leafName
            .replace(/\s+\d{4}-\d{2}-\d{2}.*$/, '')        // YYYY-MM-DD suffix
            .replace(/\s+\d{4}.*$/, '')                      // year suffix
            .replace(/[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]+.*$/, '')  // CJK suffix
            .replace(/[^\x00-\x7F].*$/, '')                  // any non-ASCII suffix
            .trim();

        const overrideMap = this._TYPE_SUBCATS[base] || {};
        if (overrideMap[cleanLeaf]) return overrideMap[cleanLeaf];
        return this._classifyPeopleLeaf(cleanLeaf);
    },

    // =========================================================================
    // TREE RENDERING
    // =========================================================================

    renderTypeTree() {
        const container = document.getElementById('tag-type-tree');
        if (!container) return;

        if (!this._typeTreeExpanded) this._typeTreeExpanded = {};

        const typeData = this._collectTypeData();
        const tf  = this.state?.calendar?.videoTagsFilter || {};
        const cur = tf.type || 'all';
        const isActive = (val) => cur === val;
        const q = (tf.keyword || '').toLowerCase();

        // ── Filter by Keyword ──────────────────────────────────────────────────
        if (q) {
            for (const [groupKey, groupMap] of Array.from(typeData.entries())) {
                for (const [base, leaves] of Array.from(groupMap.entries())) {
                    const matchingLeaves = new Set();
                    for (const leaf of leaves) {
                        const leafName = leaf.split(' - ').pop();
                        const leafTrans = this._TYPE_TRANSLATIONS ? this._TYPE_TRANSLATIONS[leafName.toLowerCase()] : '';
                        if (
                            leafName.toLowerCase().includes(q) || 
                            (leafTrans && leafTrans.includes(q)) ||
                            base.toLowerCase().includes(q) ||
                            (this._TYPE_TRANSLATIONS && this._TYPE_TRANSLATIONS[base.toLowerCase()]?.includes(q)) ||
                            groupKey.toLowerCase().includes(q) ||
                            (this._TYPE_TRANSLATIONS && this._TYPE_TRANSLATIONS[groupKey.toLowerCase()]?.includes(q))
                        ) {
                            matchingLeaves.add(leaf);
                        }
                    }
                    if (matchingLeaves.size > 0) {
                        groupMap.set(base, matchingLeaves);
                    } else {
                        groupMap.delete(base);
                    }
                }
                if (groupMap.size === 0) typeData.delete(groupKey);
            }
        }

        let html = '';

        // ── Style helpers ─────────────────────────────────────────────────────
        const rowStyle = (active, depth) => {
            const pad = 6 + depth * 13;
            return [
                'display:flex', 'align-items:center', 'gap:4px',
                `padding:3px 6px 3px ${pad}px`, 'cursor:pointer',
                'border-bottom:1px solid #f0f0f0',
                `background:${active ? '#e7f3ff' : 'transparent'}`,
                `font-weight:${depth <= 1 ? '600' : 'normal'}`,
                `color:${active ? '#0078d4' : depth === 0 ? '#333' : depth === 1 ? '#444' : depth === 2 ? '#555' : '#666'}`,
                `font-size:${depth >= 3 ? '10.5px' : '11px'}`,
            ].join(';');
        };

        const chevBtn = (key, expanded, sz) => {
            sz = sz || 8;
            return `<i class="fas fa-chevron-${expanded ? 'down' : 'right'}" ` +
                `style="font-size:${sz}px;color:#aaa;min-width:10px;" ` +
                `onclick="event.stopPropagation();App._toggleTypeNode('${this._esc(key)}')"></i>`;
        };

        const gap     = `<span style="min-width:10px;display:inline-block;"></span>`;
        const mkLabel = (txt, bold) => {
            const low = txt.toLowerCase();
            const trans = this._TYPE_TRANSLATIONS ? this._TYPE_TRANSLATIONS[low] : null;
            const displayTxt = trans ? `${txt} (${trans})` : txt;
            return `<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;${bold ? 'font-weight:600;' : ''}">${this._esc(displayTxt)}</span>`;
        };
        const badge = (n, color) =>
            `<span style="font-size:9px;color:${color || '#aaa'};margin-left:auto;padding-right:4px;">${n}</span>`;

        // ── Level 0: "All Types" ──────────────────────────────────────────────
        const allAct = isActive('all');
        html += `<div onclick="App._onTypeTreeClick('all')" style="${rowStyle(allAct, 0)}"
            onmouseenter="if(!${allAct})this.style.background='#f5f8ff'"
            onmouseleave="if(!${allAct})this.style.background='transparent'">
            ${gap}
            <i class="fas fa-layer-group" style="font-size:9px;color:${allAct ? '#0078d4' : '#888'};"></i>
            ${mkLabel('All Types', true)}
        </div>`;

        // ── Level 1: Groups ───────────────────────────────────────────────────
        this._TYPE_GROUP_META.forEach(({ key: groupKey, icon: groupIcon, color: groupColor }) => {
            const groupData = typeData.get(groupKey);
            if (!groupData || groupData.size === 0) return;

            const groupVal  = `group:${groupKey}`;
            const groupAct  = isActive(groupVal);
            const gnKey     = `g:${groupKey}`;
            const groupExp  = q ? true : !!this._typeTreeExpanded[gnKey];

            let totalLeaves = 0;
            groupData.forEach(set => { totalLeaves += set.size; });

            const noBaseLevel = this._NO_BASE_LEVEL_GROUPS.has(groupKey);

            html += `<div onclick="App._onTypeTreeClick('${this._esc(groupVal)}')" style="${rowStyle(groupAct, 0)}"
                onmouseenter="if(!${groupAct})this.style.background='#f5f8ff'"
                onmouseleave="if(!${groupAct})this.style.background='transparent'">
                ${noBaseLevel ? gap : chevBtn(gnKey, groupExp)}
                <i class="${groupIcon}" style="font-size:9px;color:${groupAct ? '#0078d4' : groupColor};"></i>
                ${mkLabel(groupKey, true)}
                ${badge(totalLeaves, groupColor + '99')}
            </div>`;

            if (noBaseLevel || !groupExp) return;

            // ── Level 2: Base types ───────────────────────────────────────────
            const sortedBases = Array.from(groupData.keys()).sort();

            sortedBases.forEach(base => {
                const allFullTypes = Array.from(groupData.get(base)).sort();
                const leafTypes    = allFullTypes.filter(s => this._getLeafParts(s, base).length > 0);
                const hasSubs      = leafTypes.length > 0;
                let label          = base.charAt(0).toUpperCase() + base.slice(1);

                const isDuplicateLabel = (label.toLowerCase() === groupKey.toLowerCase());

                if (isDuplicateLabel) {
                    return;
                }

                const baseVal      = `base:${base}`;
                const baseAct      = isActive(baseVal);
                const bnKey        = `b:${base}`;
                const baseExp      = q ? true : !!this._typeTreeExpanded[bnKey];

                const isPeopleBase = this._PEOPLE_BASES.has(base);
                const isPhysicalBase = (base === 'physical');
                const subcatMap    = this._TYPE_SUBCATS[base];
                const useSubcats   = hasSubs && (
                    isPeopleBase || isPhysicalBase ||
                    (!!subcatMap && (leafTypes.length > this.MAX_FLAT_LEAVES || (this._FORCE_SUBCATS && this._FORCE_SUBCATS.has(base))))
                );

                const skipBaseRow = (groupKey === 'Characters' || groupKey === 'Physicals');

                if (!skipBaseRow) {
                    html += `<div onclick="App._onTypeTreeClick('${this._esc(baseVal)}')" style="${rowStyle(baseAct, 1)}"
                        onmouseenter="if(!${baseAct})this.style.background='#f5f8ff'"
                        onmouseleave="if(!${baseAct})this.style.background='transparent'">
                        ${hasSubs ? chevBtn(bnKey, baseExp, 7) : gap}
                        <i class="fas fa-tag" style="font-size:8px;color:${baseAct ? '#0078d4' : '#999'};"></i>
                        ${mkLabel(label)}
                        ${badge(allFullTypes.length, '#bbb')}
                    </div>`;
                }

                if (!hasSubs || (!baseExp && !skipBaseRow)) return;

                // ─────────────────────────────────────────────────────────────
                if (useSubcats) {
                    // ── Level 3: Sub-categories ───────────────────────────────
                    const buckets = new Map();

                    if (isPeopleBase) {
                        // People: classify each leaf into Notables / Identities / Divinities
                        leafTypes.forEach(full => {
                            const leafParts = this._getLeafParts(full, base);
                            const leafName  = leafParts.join(' - ')
                                .replace(/\s+\d{4}-\d{2}-\d{2}.*$/, '')
                                .replace(/\s+\d{4}.*$/, '')
                                .trim();
                            const subcat    = this._getPeopleSubcat(base, leafName);
                            if (!buckets.has(subcat)) buckets.set(subcat, []);
                            buckets.get(subcat).push(full);
                        });
                    } else if (isPhysicalBase) {
                        // Physicals: classify each leaf into Items / Foods / Vehicles / Structures / Destinations
                        leafTypes.forEach(full => {
                            const subcat = this._classifyPhysicalItem(full);
                            if (!buckets.has(subcat)) buckets.set(subcat, []);
                            buckets.get(subcat).push(full);
                        });
                    } else {
                        leafTypes.forEach(full => {
                            const leafParts = this._getLeafParts(full, base);
                            const leafName  = leafParts.join(' - ');
                            let subcat      = subcatMap[leafName] || subcatMap[leafParts[0]];
                            
                            if (!subcat) {
                                if (base === 'pet') {
                                    const low = leafName.toLowerCase();
                                    subcat = low.includes('cat') ? 'Cats' : 'Dogs';
                                } else {
                                    subcat = 'Other';
                                }
                            }
                            if (!buckets.has(subcat)) buckets.set(subcat, []);
                            buckets.get(subcat).push(full);
                        });
                    }

                    // Order sub-categories
                    let sortedSubcats;
                    if (isPeopleBase) {
                        // Fixed display order for People sub-categories, always show all 3
                        const peopleOrder = ['Notables', 'Identities', 'Divinities'];
                        peopleOrder.forEach(sc => { if (!buckets.has(sc)) buckets.set(sc, []); });
                        sortedSubcats = peopleOrder;
                    } else if (isPhysicalBase) {
                        // Fixed display order for Physicals sub-categories, always show all 7
                        const physOrder = ['Items', 'Foods', 'Vehicles', 'Structures', 'Destinations', 'Body Parts', 'Wearables'];
                        physOrder.forEach(sc => { if (!buckets.has(sc)) buckets.set(sc, []); });
                        sortedSubcats = physOrder;
                    } else {
                        const subcatOrder = [...new Set(Object.values(subcatMap)), 'Other'];
                        sortedSubcats = Array.from(buckets.keys()).sort((a, b) => {
                            const ai = subcatOrder.indexOf(a), bi = subcatOrder.indexOf(b);
                            if (ai === -1 && bi === -1) return a.localeCompare(b);
                            if (ai === -1) return 1;
                            if (bi === -1) return -1;
                            return ai - bi;
                        });
                    }

                    sortedSubcats.forEach(subcat => {
                        const leaves    = buckets.get(subcat).sort();
                        const scVal     = `subcat:${base}:${subcat}`;
                        const scAct     = isActive(scVal);
                        const scnKey    = `sc:${base}:${subcat}`;
                        const scExp     = !!this._typeTreeExpanded[scnKey];

                        html += `<div onclick="App._onTypeTreeClick('${this._esc(scVal)}')" style="${rowStyle(scAct, skipBaseRow ? 1 : 2)}"
                            onmouseenter="if(!${scAct})this.style.background='#f5f8ff'"
                            onmouseleave="if(!${scAct})this.style.background='transparent'">
                            ${chevBtn(scnKey, scExp, 7)}
                            <i class="fas fa-folder${scExp ? '-open' : ''}" style="font-size:8px;color:${scAct ? '#0078d4' : '#bbb'};"></i>
                            ${mkLabel(subcat)}
                            ${badge(leaves.length, '#ccc')}
                        </div>`;

                        if (!scExp) return;

                        // ── Level 4: Leaves ───────────────────────────────────
                        leaves.forEach(full => {
                            const leafParts = this._getLeafParts(full, base);
                            const leafLabel = leafParts.join(' › ');
                            const leafAct   = isActive(full);

                            html += `<div onclick="App._onTypeTreeClick('${this._esc(full)}')" style="${rowStyle(leafAct, skipBaseRow ? 2 : 3)}"
                                onmouseenter="if(!${leafAct})this.style.background='#f5f8ff'"
                                onmouseleave="if(!${leafAct})this.style.background='transparent'">
                                ${gap}
                                <i class="fas fa-circle" style="font-size:4px;color:${leafAct ? '#0078d4' : '#ccc'};min-width:8px;"></i>
                                ${mkLabel(leafLabel)}
                            </div>`;
                        });
                    });

                } else {
                    // ── Level 3: Flat leaves (small base) ─────────────────────
                    leafTypes.forEach(full => {
                        const leafParts = this._getLeafParts(full, base);
                        const leafLabel = leafParts.join(' › ');
                        const leafAct   = isActive(full);

                        html += `<div onclick="App._onTypeTreeClick('${this._esc(full)}')" style="${rowStyle(leafAct, 2)}"
                            onmouseenter="if(!${leafAct})this.style.background='#f5f8ff'"
                            onmouseleave="if(!${leafAct})this.style.background='transparent'">
                            ${gap}
                            <i class="fas fa-circle" style="font-size:4px;color:${leafAct ? '#0078d4' : '#ccc'};min-width:8px;"></i>
                            ${mkLabel(leafLabel)}
                        </div>`;
                    });
                }
            });
        });

        container.innerHTML = html;
    },

    // =========================================================================
    // EVENT HANDLERS
    // =========================================================================

    _onTypeTreeClick(val) {
        if (!this.state?.calendar?.videoTagsFilter) return;
        const current = this.state.calendar.videoTagsFilter.type || 'all';
        this.state.calendar.videoTagsFilter.type = (current === val) ? 'all' : val;

        const hid = document.getElementById('calendar-tag-type');
        const vis = document.getElementById('calendar-tag-type-vis');
        if (hid) hid.value = this.state.calendar.videoTagsFilter.type;
        if (vis) vis.value = this.state.calendar.videoTagsFilter.type;

        // Write pretty slug to URL hash when available
        const slugMap = {
            'subcat:person:Notables':    'notables',
            'subcat:person:Identities':  'identities',
            'subcat:person:Divinities':  'divinities',
            'group:Art & Event':         'event',
            'group:Characters':          'people',
            'subcat:physical:Items':     'items',
            'subcat:physical:Foods':     'foods',
            'subcat:physical:Vehicles':  'vehicles',
            'subcat:physical:Structures':'structures',
            'subcat:physical:Destinations':'destinations',
            'subcat:physical:Body Parts':'body-parts',
            'subcat:physical:Wearables':'wearables',
            'base:bird':    'bird',
            'base:mammal':  'mammal',
            'base:fish':    'fish',
            'base:plant':   'plant',
            'all':          'calendar',
        };
        const slug = slugMap[this.state.calendar.videoTagsFilter.type];
        if (slug) {
            window.history.pushState(null, null, `#${slug}`);
        } else {
            // Fall back to full filter value in URL for deep types
            this._syncTypeFilterToHash?.();
        }

        this.renderTypeTree();
        this.renderCalendar?.();
    },

    _toggleTypeNode(key) {
        if (!this._typeTreeExpanded) this._typeTreeExpanded = {};
        this._typeTreeExpanded[key] = !this._typeTreeExpanded[key];
        this.renderTypeTree();
    },

    // =========================================================================
    // FILTER MATCHING  (called from renderTagThumbnailView)
    // =========================================================================

    /**
     * Returns true if `evType` (raw "#Type:" string) matches `filterVal`.
     *
     *   'all'              → always true
     *   'group:X'          → base maps to group X
     *   'base:X'           → first segment === X
     *   'subcat:base:Sub'  → leaf falls in sub-category Sub under base
     *   'X - Y - ...'      → exact leaf match (with optional "animal - " prefix strip)
     */
    _normalizeFilterVal(val) {
        if (!val) return val;
        
        // Normalize slug shortcuts to canonical filter values
        const slugMap = {
            'notables':    'subcat:person:Notables',
            'identities':  'subcat:person:Identities',
            'divinities':  'subcat:person:Divinities',
            'people':      'group:Characters',
            'event':       'group:Art & Event',
            'characters':  'group:Characters',
            'items':       'subcat:physical:Items',
            'foods':       'subcat:physical:Foods',
            'vehicles':    'subcat:physical:Vehicles',
            'structures':  'subcat:physical:Structures',
            'destinations':'subcat:physical:Destinations',
            'body-parts':  'subcat:physical:Body Parts',
            'wearables':   'subcat:physical:Wearables',
        };
        if (slugMap[val.toLowerCase()]) return slugMap[val.toLowerCase()];

        // Fix case on subcat values coming from hash
        if (val.startsWith('subcat:')) {
            const rest = val.slice('subcat:'.length);
            const colonIdx = rest.indexOf(':');
            if (colonIdx === -1) return val;
            const base = rest.slice(0, colonIdx).toLowerCase();
            const subcatRaw = rest.slice(colonIdx + 1);
            const subcatFixed = subcatRaw.replace(/\b\w/g, c => c.toUpperCase());
            return `subcat:${base}:${subcatFixed}`;
        }
        return val;
    },

    _typeMatchesFilter(rawEvType, filterVal) {
        if (!filterVal || filterVal === 'all') return true;
        if (!rawEvType) return false;
        
        const evType = this._normalizeTypeTag(rawEvType);

        if (filterVal.startsWith('group:')) {
            const targetGroup = filterVal.slice(6);
            const c = this._classifyType(evType);
            return c?.group === targetGroup;
        }

        if (filterVal.startsWith('base:')) {
            const targetBase = filterVal.slice(5).toLowerCase();
            const c = this._classifyType(evType);
            return c?.base === targetBase;
        }

        if (filterVal.startsWith('subcat:')) {
            // format: "subcat:<base>:<Subcat Name>"
            const rest       = filterVal.slice('subcat:'.length);
            const colonIdx   = rest.indexOf(':');
            if (colonIdx === -1) return false;
            const base       = rest.slice(0, colonIdx);
            const subcatName = rest.slice(colonIdx + 1);

            const c = this._classifyType(evType);
            if (c?.base !== base) return false;

            const leafParts = this._getLeafParts(evType, base);
            const leafName  = leafParts.join(' - ');

            // People bases: use the dynamic classifier
            if (this._PEOPLE_BASES.has(base)) {
                const cleanLeafName = leafName
                    .replace(/\s+\d{4}-\d{2}-\d{2}.*$/, '')
                    .replace(/\s+\d{4}.*$/, '')
                    .trim();
                return this._getPeopleSubcat(base, cleanLeafName) === subcatName;
            }
            if (base === 'physical') {
                return this._classifyPhysicalItem(evType) === subcatName;
            }

            const subcatMap = this._TYPE_SUBCATS[base];
            if (!subcatMap) return false;

            let evSubcat = subcatMap[leafName] || subcatMap[leafParts[0]];
            
            if (!evSubcat) {
                if (base === 'pet') {
                    const low = leafName.toLowerCase();
                    evSubcat = low.includes('cat') ? 'Cats' : 'Dogs';
                } else {
                    evSubcat = 'Other';
                }
            }
            return evSubcat === subcatName;
        }

        // Exact leaf match
        if (evType === filterVal) return true;
        // Fallback: strip leading "animal - " prefix
        return evType.replace(/^animal\s*-\s*/i, '') === filterVal;
    },

    // =========================================================================
    // PRIVATE UTILITIES
    // =========================================================================

    _esc(str) {
        return String(str ?? '')
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    },
};

// Auto-mixin
if (typeof App !== 'undefined') {
    Object.assign(App, CalendarTypeFilter);
}