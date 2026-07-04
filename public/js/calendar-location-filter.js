/**
 * calendar-location-filter.js
 * Location hierarchy, location tree rendering, coordinate resolution,
 * and related geographic utilities for the calendar sidebar.
 *
 * Depends on: App (global), App.escape(), App.applyTagFilters(),
 *             App.renderCalendar(), App.parseTagsFromDescription()
 *
 * Usage: include this file after cloudmain.js and calendar-tag-filters.js, then call
 *   Object.assign(App, CalendarLocationFilter);
 * or use the auto-mixin at the bottom of this file.
 */

const CalendarLocationFilter = {

    // =========================================================================
    // LOCATION FILTER STATE
    // =========================================================================

    _locationTreeExpanded: {},
    _locationFilter: { area: null, subArea: null, country: null, province: null, city: null },
    _geoResolutionEnabled: false,

    // =========================================================================
    // COUNTRY / AREA LOOKUP TABLES
    // =========================================================================

    _normalizeCountryName(country) {
        if (!country) return country;
        const CANONICAL = {
            'uae': 'UAE',
            'u.a.e.': 'UAE',
            'united arab emirates': 'UAE',
            'uk': 'United Kingdom',
            'u.k.': 'United Kingdom',
            'england': 'United Kingdom',
            'scotland': 'United Kingdom',
            'wales': 'United Kingdom',
            'northern ireland': 'United Kingdom',
            'great britain': 'United Kingdom',
            'usa': 'United States',
            'us': 'United States',
            'u.s.a.': 'United States',
            'united states of america': 'United States',
            'south korea': 'South Korea',
            'korea': 'South Korea',
            'czechia': 'Czech Republic',
            'turkiye': 'Turkey',
            'türkiye': 'Turkey',
            'bosnia': 'Bosnia and Herzegovina',
            'ivory coast': 'Ivory Coast',
            "côte d'ivoire": 'Ivory Coast',
            'dr congo': 'DR Congo',
            'democratic republic of congo': 'DR Congo',
            'democratic republic of the congo': 'DR Congo',
        };
        return CANONICAL[country.toLowerCase().trim()] || country;
    },

    _titleCase(str) {
        if (!str) return str;
        const lower = new Set(['of', 'the', 'and', 'in', 'de', 'du', 'des', 'la', 'le', 'el', 'al', 'van', 'von', 'zur', 'da', 'di', 'do']);
        return str.trim().replace(/\S+/g, (w, offset) => {
            if (offset > 0 && lower.has(w.toLowerCase())) return w.toLowerCase();
            return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
        });
    },

    _countryToArea(country) {
        if (!country) return null;
        const c = country.toLowerCase().trim();
        const map = {
            // ── Africa ──────────────────────────────────────────────────────
            'africa': 'Africa', 'nairobi': 'Africa',
            'algeria': 'Africa', 'angola': 'Africa', 'benin': 'Africa', 'botswana': 'Africa',
            'burkina faso': 'Africa', 'burundi': 'Africa', 'cameroon': 'Africa', 'cape verde': 'Africa',
            'central african republic': 'Africa', 'chad': 'Africa', 'comoros': 'Africa',
            'congo': 'Africa', 'dr congo': 'Africa', 'democratic republic of congo': 'Africa',
            "côte d'ivoire": 'Africa', 'ivory coast': 'Africa', 'djibouti': 'Africa',
            'egypt': 'Africa', 'equatorial guinea': 'Africa', 'eritrea': 'Africa',
            'ethiopia': 'Africa', 'gabon': 'Africa', 'gambia': 'Africa', 'ghana': 'Africa',
            'guinea': 'Africa', 'guinea-bissau': 'Africa', 'kenya': 'Africa', 'lesotho': 'Africa',
            'liberia': 'Africa', 'libya': 'Africa', 'madagascar': 'Africa', 'malawi': 'Africa',
            'mali': 'Africa', 'mauritania': 'Africa', 'mauritius': 'Africa', 'morocco': 'Africa',
            'mozambique': 'Africa', 'namibia': 'Africa', 'niger': 'Africa', 'nigeria': 'Africa',
            'rwanda': 'Africa', 'senegal': 'Africa', 'seychelles': 'Africa', 'sierra leone': 'Africa',
            'somalia': 'Africa', 'south africa': 'Africa', 'south sudan': 'Africa', 'sudan': 'Africa',
            'swaziland': 'Africa', 'eswatini': 'Africa', 'tanzania': 'Africa', 'togo': 'Africa',
            'tunisia': 'Africa', 'uganda': 'Africa', 'zambia': 'Africa', 'zimbabwe': 'Africa',
            'kinshasa': 'Africa',
            // ── East Asia ────────────────────────────────────────────────────
            'east asia': 'East Asia',
            'china': 'East Asia', 'japan': 'East Asia', 'south korea': 'East Asia',
            'korea': 'East Asia', 'north korea': 'East Asia', 'taiwan': 'East Asia',
            'mongolia': 'East Asia', 'hong kong': 'East Asia', 'macau': 'East Asia',
            'tibet': 'East Asia', 'russia (asia)': 'East Asia',
            // ── West Europe ──────────────────────────────────────────────────
            'europe': 'West Europe', 'west europe': 'West Europe',
            'albania': 'West Europe', 'andorra': 'West Europe', 'austria': 'West Europe',
            'belgium': 'West Europe', 'bosnia': 'West Europe', 'bosnia and herzegovina': 'West Europe',
            'croatia': 'West Europe', 'cyprus': 'West Europe',
            'denmark': 'West Europe',
            'estonia': 'West Europe', 'finland': 'West Europe', 'france': 'West Europe',
            'germany': 'West Europe', 'greece': 'West Europe', 'iceland': 'West Europe',
            'ireland': 'West Europe', 'italy': 'West Europe', 'kosovo': 'West Europe',
            'latvia': 'West Europe', 'liechtenstein': 'West Europe', 'lithuania': 'West Europe',
            'luxembourg': 'West Europe', 'malta': 'West Europe', 'monaco': 'West Europe',
            'montenegro': 'West Europe', 'netherlands': 'West Europe', 'north macedonia': 'West Europe',
            'norway': 'West Europe', 'portugal': 'West Europe', 'san marino': 'West Europe',
            'serbia': 'West Europe', 'slovenia': 'West Europe', 'spain': 'West Europe',
            'sweden': 'West Europe', 'switzerland': 'West Europe',
            'united kingdom': 'West Europe', 'uk': 'West Europe', 'england': 'West Europe',
            'scotland': 'West Europe', 'wales': 'West Europe', 'northern ireland': 'West Europe',
            'vatican': 'West Europe',
            // ── Eastern Europe → Eurasian Hub ────────────────────────────────
            'belarus': 'Eurasian Hub', 'bulgaria': 'Eurasian Hub',
            'czech republic': 'Eurasian Hub', 'czechia': 'Eurasian Hub',
            'hungary': 'Eurasian Hub', 'moldova': 'Eurasian Hub',
            'poland': 'Eurasian Hub', 'romania': 'Eurasian Hub', 'russia': 'Eurasian Hub',
            'slovakia': 'Eurasian Hub', 'ukraine': 'Eurasian Hub',
            // ── Latin America ────────────────────────────────────────────────
            'latin america': 'Latin America', 'south america': 'Latin America',
            'central america': 'Latin America',
            'argentina': 'Latin America', 'belize': 'Latin America', 'bolivia': 'Latin America',
            'brazil': 'Latin America', 'chile': 'Latin America', 'colombia': 'Latin America',
            'costa rica': 'Latin America', 'cuba': 'Latin America',
            'dominican republic': 'Latin America', 'ecuador': 'Latin America',
            'el salvador': 'Latin America', 'guatemala': 'Latin America',
            'guyana': 'Latin America', 'haiti': 'Latin America', 'honduras': 'Latin America',
            'jamaica': 'Latin America', 'mexico': 'Latin America', 'nicaragua': 'Latin America',
            'panama': 'Latin America', 'paraguay': 'Latin America', 'peru': 'Latin America',
            'puerto rico': 'Latin America', 'suriname': 'Latin America', 'trinidad': 'Latin America',
            'trinidad and tobago': 'Latin America', 'uruguay': 'Latin America',
            'venezuela': 'Latin America',
            // ── Eurasian Hub ─────────────────────────────────────────────────
            'eurasian hub': 'Eurasian Hub',
            'afghanistan': 'Eurasian Hub', 'armenia': 'Eurasian Hub', 'azerbaijan': 'Eurasian Hub',
            'bahrain': 'Eurasian Hub', 'georgia': 'Eurasian Hub', 'iran': 'Eurasian Hub',
            'iraq': 'Eurasian Hub', 'israel': 'Eurasian Hub', 'jordan': 'Eurasian Hub',
            'kuwait': 'Eurasian Hub', 'lebanon': 'Eurasian Hub', 'oman': 'Eurasian Hub',
            'pakistan': 'Eurasian Hub', 'palestine': 'Eurasian Hub', 'qatar': 'Eurasian Hub',
            'saudi arabia': 'Eurasian Hub', 'syria': 'Eurasian Hub', 'turkey': 'Eurasian Hub',
            'turkiye': 'Eurasian Hub', 'uae': 'Eurasian Hub',
            'united arab emirates': 'Eurasian Hub', 'yemen': 'Eurasian Hub',
            'uzbekistan': 'Eurasian Hub', 'kazakhstan': 'Eurasian Hub',
            'kyrgyzstan': 'Eurasian Hub', 'tajikistan': 'Eurasian Hub',
            'turkmenistan': 'Eurasian Hub',
            // ── North America ────────────────────────────────────────────────
            'north america': 'North America',
            'canada': 'North America', 'united states': 'North America',
            'usa': 'North America', 'us': 'North America', 'greenland': 'North America',
            // ── Indo-Pacific South ───────────────────────────────────────────
            'indo-pacific south': 'Indo-Pacific South', 'southeast asia': 'Indo-Pacific South',
            'oceania': 'Indo-Pacific South', 'asia': 'Indo-Pacific South',
            'australia': 'Indo-Pacific South', 'bangladesh': 'Indo-Pacific South',
            'bhutan': 'Indo-Pacific South', 'brunei': 'Indo-Pacific South',
            'cambodia': 'Indo-Pacific South', 'fiji': 'Indo-Pacific South',
            'india': 'Indo-Pacific South', 'indonesia': 'Indo-Pacific South',
            'laos': 'Indo-Pacific South', 'malaysia': 'Indo-Pacific South',
            'maldives': 'Indo-Pacific South', 'myanmar': 'Indo-Pacific South',
            'nepal': 'Indo-Pacific South', 'new zealand': 'Indo-Pacific South',
            'papua new guinea': 'Indo-Pacific South', 'philippines': 'Indo-Pacific South',
            'singapore': 'Indo-Pacific South', 'sri lanka': 'Indo-Pacific South',
            'thailand': 'Indo-Pacific South', 'timor-leste': 'Indo-Pacific South',
            'east timor': 'Indo-Pacific South', 'vietnam': 'Indo-Pacific South',
        };
        return map[c] || null;
    },

    _canonicalArea(raw) {
        if (!raw) return null;
        const r = raw.trim().toLowerCase();
        const map = {
            'southeast asia': 'Indo-Pacific South', 'indo-pacific south': 'Indo-Pacific South',
            'southeast asia/oceania': 'Indo-Pacific South',
            'east asia': 'East Asia',
            'northern africa': 'Africa', 'western africa': 'Africa', 'middle africa': 'Africa',
            'eastern africa': 'Africa', 'southern africa': 'Africa',
            'sub-saharan africa': 'Africa', 'africa': 'Africa',
            'latin america': 'Latin America', 'south america': 'Latin America',
            'central america': 'Latin America',
            'eurasian hub & eastern europe': 'Eurasian Hub',
            'eurasian hub & e. europe': 'Eurasian Hub', 'eurasian hub': 'Eurasian Hub',
            'eastern europe': 'Eurasian Hub',
            'north america': 'North America',
            'europe': 'West Europe', 'west europe': 'West Europe',
            'asia': 'Indo-Pacific South', 'oceania': 'Indo-Pacific South',
        };
        return map[r] || null;
    },

    // =========================================================================
    // GEOGRAPHIC SUB-REGION HELPERS
    // =========================================================================

    _getAfricanSubRegion(country, city) {
        if (!country) return 'Unknown';
        const c = country.toLowerCase().trim();
        const ct = (city || '').toLowerCase().trim();
        const N = ['egypt','algeria','morocco','sudan','tunisia','libya','western sahara','cairo','alexandria','giza'];
        const W = ['nigeria','niger','ghana','senegal','mali','burkina faso','ivory coast',"côte d'ivoire",'benin','liberia','sierra leone','togo','guinea','guinea-bissau','cape verde','gambia','sao tome and principe','lagos','accra','dakar','abomey'];
        const M = ['dr congo','congo','democratic republic of congo','cameroon','chad','angola','gabon','central african republic','equatorial guinea','kinshasa'];
        const E = ['ethiopia','kenya','tanzania','uganda','somalia','mozambique','rwanda','burundi','djibouti','eritrea','mauritius','comoros','seychelles','madagascar','nairobi','addis ababa','dar es salaam','kampala','mogadishu'];
        const S = ['south africa','zambia','zimbabwe','namibia','botswana','lesotho','malawi','eswatini','swaziland','cape town','johannesburg','benoni'];
        if (N.includes(c) || N.includes(ct)) return 'Northern Africa';
        if (W.includes(c) || W.includes(ct)) return 'Western Africa';
        if (M.includes(c) || M.includes(ct)) return 'Middle Africa';
        if (E.includes(c) || E.includes(ct)) return 'Eastern Africa';
        if (S.includes(c) || S.includes(ct)) return 'Southern Africa';
        const lowerLocation = (country + ' ' + (city || '')).toLowerCase();
        if (lowerLocation.includes('nile') || lowerLocation.includes('sahara') || lowerLocation.includes('maghreb')) return 'Northern Africa';
        if (lowerLocation.includes('savannah') || lowerLocation.includes('kudu') || lowerLocation.includes('ridgeback')) return 'Eastern Africa';
        if (lowerLocation.includes('protea') || lowerLocation.includes('springbok') || lowerLocation.includes('cape')) return 'Southern Africa';
        if (lowerLocation.includes('congo')) return 'Middle Africa';
        return 'Other Africa';
    },

    _getLatinAmericaSubRegion(country) {
        if (!country) return 'Unknown';
        const c = country.toLowerCase().trim();
        const CAM = ['mexico','guatemala','honduras','el salvador','nicaragua','costa rica','panama','belize'];
        const CAR = ['cuba','dominican republic','haiti','jamaica','puerto rico','trinidad and tobago','trinidad','bahamas','barbados'];
        const SAM = ['brazil','argentina','colombia','chile','peru','venezuela','ecuador','bolivia','paraguay','uruguay','guyana','suriname'];
        if (CAM.includes(c)) return 'Central America & Mexico';
        if (CAR.includes(c)) return 'Caribbean';
        if (SAM.includes(c)) return 'South America';
        return 'Other Latin America';
    },

    _getEuropeanSubRegion(country) {
        if (!country) return null;
        const c = country.toLowerCase().trim();
        const N = ['denmark','estonia','finland','iceland','ireland','latvia','lithuania','norway','sweden','united kingdom','uk','england','scotland','wales','northern ireland'];
        const W = ['austria','belgium','france','germany','liechtenstein','luxembourg','monaco','netherlands','switzerland'];
        const S = ['albania','andorra','bosnia','bosnia and herzegovina','croatia','cyprus','greece','italy','kosovo','malta','montenegro','north macedonia','portugal','san marino','serbia','slovenia','spain','vatican'];
        if (N.includes(c)) return 'Northern Europe';
        if (W.includes(c)) return 'Western Europe';
        if (S.includes(c)) return 'Southern Europe';
        return 'Other Europe';
    },

    _getEurasiaMiddleEastSubRegion(country) {
        if (!country) return null;
        const c = country.toLowerCase().trim();
        const EE = ['belarus','bulgaria','czech republic','czechia','hungary','moldova','poland','romania','russia','slovakia','ukraine'];
        const CA = ['kazakhstan','kyrgyzstan','tajikistan','turkmenistan','uzbekistan'];
        const ME = ['afghanistan','armenia','azerbaijan','bahrain','georgia','iran','iraq','israel','jordan','kuwait','lebanon','oman','pakistan','palestine','qatar','saudi arabia','syria','turkey','turkiye','uae','united arab emirates','yemen','bosnia and herzegovina','bosnia'];
        if (EE.includes(c)) return 'Eastern Europe';
        if (CA.includes(c)) return 'Central Asia';
        if (ME.includes(c)) return 'Eurasian Hub (West Asia)';
        return 'Other Eurasia';
    },

    _getUSASubRegion(state) {
        if (!state) return 'Other Region';
        const s = state.toLowerCase().trim();
        if (['connecticut','maine','massachusetts','new hampshire','rhode island','vermont','new jersey','new york','pennsylvania','district of columbia','washington dc','washington d.c.','washington, d.c.'].some(x => s.includes(x))) return 'Northeast (东北部)';
        if (['illinois','indiana','michigan','ohio','wisconsin','iowa','kansas','minnesota','missouri','nebraska','north dakota','south dakota'].some(x => s.includes(x))) return 'Midwest (中西部)';
        if (['delaware','florida','georgia','maryland','north carolina','south carolina','virginia','west virginia','alabama','kentucky','mississippi','tennessee','arkansas','louisiana','oklahoma','texas'].some(x => s.includes(x))) return 'South (南部)';
        if (['arizona','colorado','idaho','montana','nevada','new mexico','utah','wyoming','alaska','california','hawaii','oregon','washington'].some(x => s.includes(x))) return 'West (西部)';
        return 'Other Region';
    },

    _getChinaSubRegion(province) {
        if (!province) return 'East China (Huadong)';
        const p = province.toLowerCase().trim().replace(/\s+/g, '');
        if (['heilongjiang','jilin','liaoning'].some(x => p.includes(x))) return 'Northeast China (Dongbei)';
        if (['beijing','tianjin','hebei','shanxi','innermongolia','neimenggu'].some(x => p.includes(x))) return 'North China (Huabei)';
        if (['shanghai','shandong','jiangsu','anhui','zhejiang','jiangxi','fujian'].some(x => p.includes(x))) return 'East China (Huadong)';
        if (['henan','hubei','hunan'].some(x => p.includes(x))) return 'Central China (Huazhong)';
        if (['guangdong','guangxi','hainan','hongkong','macau'].some(x => p.includes(x))) return 'South China (Huanan)';
        if (['chongqing','sichuan','guizhou','yunnan','tibet','xizang'].some(x => p.includes(x))) return 'Southwest China (Xinan)';
        if (['xinjiang','qinghai','gansu','ningxia','shaanxi'].some(x => p.includes(x))) return 'Northwest China (Xibei)';
        return 'East China (Huadong)';
    },

    _getJapanSubRegion(prefecture) {
        if (!prefecture) return 'Kanto (关东地方)';
        const p = prefecture.toLowerCase().trim();
        if (p.includes('hokkaido')) return 'Hokkaido (北海道)';
        if (['aomori','iwate','miyagi','akita','yamagata','fukushima'].some(x => p.includes(x))) return 'Tohoku (东北地方)';
        if (['nanpo','nanpō','ogasawara','izu'].some(x => p.includes(x))) return 'Kanto (Nanpo Islands) (南方诸岛)';
        if (['tokyo','kanagawa','chiba','saitama','ibaraki','tochigi','gunma','yokohama','kamakura'].some(x => p.includes(x))) return 'Kanto (关东地方)';
        if (['niigata','toyama','ishikawa','fukui','yamanashi','nagano','gifu','shizuoka','aichi','fuji'].some(x => p.includes(x))) return 'Chubu (中部地方)';
        if (['osaka','kyoto','hyogo','nara','mie','shiga','wakayama','kobe'].some(x => p.includes(x))) return 'Kansai/Kinki (关西/近畿)';
        if (['shimane','tottori',"san'in",'sanin'].some(x => p.includes(x))) return "Chugoku (San'in) (中国-山阴)";
        if (['okayama','hiroshima','yamaguchi',"san'yo",'sanyo',"san'yō"].some(x => p.includes(x))) return "Chugoku (San'yō) (中国-山阳)";
        if (['tokushima','kagawa','ehime','kochi'].some(x => p.includes(x))) return 'Shikoku (四国)';
        if (['satsunan','amami','tokara','osumi'].some(x => p.includes(x))) return 'Kyushu/Okinawa (Satsunan) (萨南诸岛)';
        if (['fukuoka','saga','nagasaki','kumamoto','oita','miyazaki','kagoshima','okinawa'].some(x => p.includes(x))) return 'Kyushu/Okinawa (九州/冲绳)';
        return 'Kanto (关东地方)';
    },

    _getKoreaSubRegion(province) {
        if (!province) return 'Sudogwon (首都圈)';
        const p = province.toLowerCase().trim();
        if (['seoul','incheon','gyeonggi'].some(x => p.includes(x))) return 'Sudogwon (首都圈)';
        if (['chungcheong','daejeon','sejong'].some(x => p.includes(x))) return 'Hoseo Region (湖西地方)';
        if (['jeolla','gwangju','jeonbuk'].some(x => p.includes(x))) return 'Honam Region (湖南地方)';
        if (['gyeongsang','busan','daegu','ulsan'].some(x => p.includes(x))) return 'Yeongnam Region (岭南地方)';
        if (['gangwon'].some(x => p.includes(x))) return 'Gwandong Region (关东地方)';
        if (['jeju'].some(x => p.includes(x))) return 'Jeju Region (济州地方)';
        return 'Sudogwon (首都圈)';
    },

    _getTaiwanSubRegion(province) {
        if (!province) return 'Northern Taiwan (台湾北部)';
        const p = province.toLowerCase().trim();
        if (['taipei','keelung','taoyuan','hsinchu','yilan'].some(x => p.includes(x))) return 'Northern Taiwan (台湾北部)';
        if (['miaoli','taichung','changhua','nantou','yunlin'].some(x => p.includes(x))) return 'Central Taiwan (台湾中部)';
        if (['chiayi','tainan','kaohsiung','pingtung'].some(x => p.includes(x))) return 'Southern Taiwan (台湾南部)';
        if (['hualien','taitung'].some(x => p.includes(x))) return 'Eastern Taiwan (台湾东部)';
        if (['penghu','kinmen','matsu','lienchiang'].some(x => p.includes(x))) return 'Outlying Islands (离岛)';
        return 'Northern Taiwan (台湾北部)';
    },

    _getNorthKoreaSubRegion(province) {
        if (!province) return 'Pyongyang Region (平壤地区)';
        const p = province.toLowerCase().trim();
        if (['pyongyang','nampo'].some(x => p.includes(x))) return 'Pyongyang Region (平壤地区)';
        if (['pyongan'].some(x => p.includes(x))) return 'Pyongan Region (平安道)';
        if (['hamgyong','ryanggang','chagang','northern'].some(x => p.includes(x))) return 'Hamgyong & Northern Region (咸镜及北部)';
        if (['hwanghae'].some(x => p.includes(x))) return 'Hwanghae Region (黄海道)';
        if (['kangwon'].some(x => p.includes(x))) return 'Kangwon Region (江原道)';
        return 'Pyongyang Region (平壤地区)';
    },

    _getRussiaAsiaSubRegion(province) {
        if (!province) return 'Russian Far East (俄罗斯远东)';
        const p = province.toLowerCase().trim();
        if (['primorsky','khabarovsk','kamchatka','sakhalin','amur','chukotka','magadan','yakutia','sakha','kolyma','jewish','vladivostok'].some(x => p.includes(x))) return 'Russian Far East (俄罗斯远东)';
        if (['novosibirsk','omsk','tomsk','kemerovo','altai','tuva','khakassia','krasnoyarsk','irkutsk','buryatia','zabaykalsky','siberia'].some(x => p.includes(x))) return 'Siberia (西伯利亚)';
        if (['ural','sverdlovsk','chelyabinsk','kurgan','tyumen','khanty','yamalo','yekaterinburg'].some(x => p.includes(x))) return 'Ural Region (乌拉尔地区)';
        return 'Russian Far East (俄罗斯远东)';
    },

    _getMongoliaSubRegion(province) {
        if (!province) return 'Ulaanbaatar Region (乌兰巴托地区)';
        const p = province.toLowerCase().trim();
        if (['ulaanbaatar','ulan bator'].some(x => p.includes(x))) return 'Ulaanbaatar Region (乌兰巴托地区)';
        if (['töv','tov','övörkhangai','ovorkhangai','arkhangai'].some(x => p.includes(x))) return 'Central Mongolia (蒙古中部)';
        if (['khövsgöl','khovsgol','bulgan','selenge','orkhon','darkhan-uul','darkhan'].some(x => p.includes(x))) return 'Northern Mongolia (蒙古北部)';
        if (['dornod','khentii','sükhbaatar','sukhbaatar'].some(x => p.includes(x))) return 'Eastern Mongolia (蒙古东部)';
        if (['bayan-ölgii','bayan-olgii','khovd','uvs','zavkhan','govi-altai'].some(x => p.includes(x))) return 'Western Mongolia (蒙古西部)';
        if (['ömnögovi','omnogovi','dundgovi','dornogovi','gobi'].some(x => p.includes(x))) return 'Gobi Region (戈壁地区)';
        return 'Ulaanbaatar Region (乌兰巴托地区)';
    },

    _getIndoPacificSubRegion(country) {
        if (!country) return null;
        const c = country.toLowerCase().trim();
        const SA   = ['india','bangladesh','nepal','sri lanka','bhutan','maldives','myanmar'];
        const SEA_M = ['vietnam','thailand','cambodia','laos'];
        const SEA_I = ['indonesia','philippines','malaysia','singapore','brunei','timor-leste','east timor'];
        const OC   = ['australia','new zealand','papua new guinea','fiji','solomon islands','vanuatu','samoa','tonga','kiribati','micronesia','palau','marshall islands','nauru','tuvalu'];
        if (SA.includes(c))    return 'South Asia';
        if (SEA_M.includes(c)) return 'Southeast Asia (Mainland)';
        if (SEA_I.includes(c)) return 'Southeast Asia (Maritime)';
        if (OC.includes(c))    return 'Oceania';
        return 'Other Indo-Pacific';
    },

    _getIndiaSubRegion(province) {
        if (!province) return 'North India (北印度)';
        const p = province.toLowerCase().trim();
        if (['jammu','kashmir','himachal','punjab','uttarakhand','haryana','delhi','uttar pradesh','rajasthan'].some(x => p.includes(x))) return 'North India (北印度)';
        if (['bihar','jharkhand','west bengal','odisha','sikkim'].some(x => p.includes(x))) return 'East India (东印度)';
        if (['assam','arunachal','nagaland','manipur','mizoram','tripura','meghalaya'].some(x => p.includes(x))) return 'Northeast India (东北印度)';
        if (['madhya pradesh','chhattisgarh'].some(x => p.includes(x))) return 'Central India (中印度)';
        if (['gujarat','maharashtra','goa','dadra','daman'].some(x => p.includes(x))) return 'West India (西印度)';
        if (['andhra','telangana','karnataka','kerala','tamil','puducherry','lakshadweep'].some(x => p.includes(x))) return 'South India (南印度)';
        if (['andaman','nicobar'].some(x => p.includes(x))) return 'Island Territories (岛屿领地)';
        return 'North India (北印度)';
    },

    _getIndonesiaSubRegion(province) {
        if (!province) return 'Java (爪哇)';
        const p = province.toLowerCase().trim();
        if (['aceh','north sumatra','west sumatra','riau','jambi','south sumatra','bengkulu','lampung','bangka','belitung'].some(x => p.includes(x))) return 'Sumatra (苏门答腊)';
        if (['jakarta','west java','central java','yogyakarta','east java','banten'].some(x => p.includes(x))) return 'Java (爪哇)';
        if (['bali','nusa tenggara','lombok','flores'].some(x => p.includes(x))) return 'Bali & Nusa Tenggara (巴厘岛及努沙登加拉)';
        if (['kalimantan','borneo'].some(x => p.includes(x))) return 'Kalimantan (加里曼丹)';
        if (['sulawesi','gorontalo','makassar'].some(x => p.includes(x))) return 'Sulawesi (苏拉威西)';
        if (['maluku','papua','ambon'].some(x => p.includes(x))) return 'Maluku & Papua (马鲁古及巴布亚)';
        return 'Java (爪哇)';
    },

    _getAustraliaSubRegion(province) {
        if (!province) return 'Eastern Australia (澳大利亚东部)';
        const p = province.toLowerCase().trim();
        if (['new south wales','victoria','queensland','sydney','melbourne','brisbane'].some(x => p.includes(x))) return 'Eastern Australia (澳大利亚东部)';
        if (['south australia','tasmania','adelaide','hobart'].some(x => p.includes(x))) return 'Southern Australia (澳大利亚南部)';
        if (['western australia','perth'].some(x => p.includes(x))) return 'Western Australia (澳大利亚西部)';
        if (['northern territory','australian capital','darwin','canberra'].some(x => p.includes(x))) return 'Central & Northern Australia (澳大利亚中北部)';
        return 'Eastern Australia (澳大利亚东部)';
    },

    _getPhilippinesSubRegion(province) {
        if (!province) return 'Luzon (吕宋岛)';
        const p = province.toLowerCase().trim();
        if (['ilocos','cagayan','central luzon','manila','metro manila','ncr','calabarzon','mimaropa','bicol','cordillera','luzon'].some(x => p.includes(x))) return 'Luzon (吕宋岛)';
        if (['visayas','cebu','iloilo','leyte','samar','negros','panay','bohol'].some(x => p.includes(x))) return 'Visayas (米沙鄢)';
        if (['mindanao','zamboanga','davao','cagayan de oro','cotabato','caraga','barmm','sulu'].some(x => p.includes(x))) return 'Mindanao (棉兰老岛)';
        return 'Luzon (吕宋岛)';
    },

    _getVietnamSubRegion(province) {
        if (!province) return 'North Vietnam (越南北部)';
        const p = province.toLowerCase().trim();
        if (['hanoi','hai phong','quang ninh','bac ninh','ha noi','lao cai','ha giang','son la','dien bien','lai chau','yen bai','tuyen quang','bac kan','cao bang','lang son','bac giang','thai nguyen','vinh phuc','phu tho','hoa binh','hung yen','hai duong','thai binh','nam dinh','ninh binh','ha nam'].some(x => p.includes(x))) return 'North Vietnam (越南北部)';
        if (['da nang','hue','thanh hoa','nghe an','ha tinh','quang binh','quang tri','quang nam','quang ngai','binh dinh','phu yen','khanh hoa','ninh thuan','binh thuan','kon tum','gia lai','dak lak','dak nong','lam dong'].some(x => p.includes(x))) return 'Central Vietnam (越南中部)';
        if (['ho chi mich','saigon','can tho','binh phuoc','tay ninh','binh duong','dong nai','ba ria','long an','tien giang','ben tre','tra vinh','vinh long','dong thap','an giang','kien giang','hau giang','soc trang','bac lieu','ca mau'].some(x => p.includes(x))) return 'South Vietnam (越南南部)';
        return 'North Vietnam (越南北部)';
    },

    _getThailandSubRegion(province) {
        if (!province) return 'Central Thailand (泰国中部)';
        const p = province.toLowerCase().trim();
        if (['bangkok','nonthaburi','pathum thani','samut prakan','ayutthaya','nakhon pathom','ratchaburi','kanchanaburi','samut sakhon','samut songkhram','chai nat','lopburi','ang thong','sing buri','suphan buri','sara buri','nakhon nayok'].some(x => p.includes(x))) return 'Central Thailand (泰国中部)';
        if (['chiang mai','chiang rai','nan','phayao','phrae','lampang','lamphun','mae hong son','phitsanulok','uttaradit','tak','sukhothai','kamphaeng phet','nakhon sawan','uthai thani','phetchabun','phichit'].some(x => p.includes(x))) return 'Northern Thailand (泰国北部)';
        if (['khon kaen','udon thani','nakhon ratchasima','ubon ratchathani','buri ram','roi et','surin','si sa ket','loei','nong khai','nong bua','sakon nakhon','nakhon phanom','mukdahan','kalasin','maha sarakham','chaiyaphum','amnat charoen','bueng kan'].some(x => p.includes(x))) return 'Northeastern Thailand (泰国东北部)';
        if (['chon buri','pattaya','rayong','chanthaburi','trat','chachoengsao','prachin buri','sa kaeo'].some(x => p.includes(x))) return 'Eastern Thailand (泰国东部)';
        if (['phuket','krabi','surat thani','nakhon si thammarat','songkhla','phang nga','trang','phatthalung','satun','pattani','yala','narathiwat','chumphon','ranong','prachuap','phetchaburi'].some(x => p.includes(x))) return 'Southern Thailand (泰国南部)';
        return 'Central Thailand (泰国中部)';
    },

    _getMyanmarSubRegion(province) {
        if (!province) return 'Lower Myanmar (缅甸下部)';
        const p = province.toLowerCase().trim();
        if (['mandalay','sagaing','magway','chin'].some(x => p.includes(x))) return 'Upper Myanmar (缅甸上部)';
        if (['yangon','rangoon','bago','ayeyarwady','irrawaddy','mon','kayin','karen','tanintharyi'].some(x => p.includes(x))) return 'Lower Myanmar (缅甸下部)';
        if (['shan','kayah','kachin'].some(x => p.includes(x))) return 'Eastern Myanmar (缅甸东部)';
        if (['rakhine','arakan'].some(x => p.includes(x))) return 'Rakhine (若开邦)';
        return 'Lower Myanmar (缅甸下部)';
    },

    _getMalaysiaSubRegion(province) {
        if (!province) return 'Peninsular Malaysia (马来半岛)';
        const p = province.toLowerCase().trim();
        if (['selangor','kuala lumpur','kl','putrajaya','perak','johor','pahang','negeri sembilan','melaka','malacca','kelantan','terengganu','kedah','penang','perlis'].some(x => p.includes(x))) return 'Peninsular Malaysia (马来半岛)';
        if (['sabah','kota kinabalu'].some(x => p.includes(x))) return 'East Malaysia - Sabah (沙巴)';
        if (['sarawak','kuching'].some(x => p.includes(x))) return 'East Malaysia - Sarawak (砂拉越)';
        if (['labuan'].some(x => p.includes(x))) return 'Federal Territories (联邦直辖区)';
        return 'Peninsular Malaysia (马来半岛)';
    },

    _getIndoPacificCountrySubRegion(country, provinceOrCity) {
        if (!country) return null;
        const c = country.toLowerCase().trim();
        if (c === 'india')       return this._getIndiaSubRegion(provinceOrCity);
        if (c === 'indonesia')   return this._getIndonesiaSubRegion(provinceOrCity);
        if (c === 'australia')   return this._getAustraliaSubRegion(provinceOrCity);
        if (c === 'philippines') return this._getPhilippinesSubRegion(provinceOrCity);
        if (c === 'vietnam')     return this._getVietnamSubRegion(provinceOrCity);
        if (c === 'thailand')    return this._getThailandSubRegion(provinceOrCity);
        if (c === 'myanmar')     return this._getMyanmarSubRegion(provinceOrCity);
        if (c === 'malaysia')    return this._getMalaysiaSubRegion(provinceOrCity);
        return null;
    },

    // =========================================================================
    // LOCATION TEXT / COORDINATE PARSING
    // =========================================================================

    _parseLocationText(loc) {
        if (!loc) return null;
        loc = loc.trim();
        const coordMatch = loc.match(/^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/);
        if (coordMatch) {
            return { lat: parseFloat(coordMatch[1]), lng: parseFloat(coordMatch[2]) };
        }
        const parts = loc.split(',').map(p => p.trim()).filter(p => p.length > 0);
        if (parts.length === 0) return null;
        let norm = parts.map(p => this._titleCase(p));
        if (norm.length === 2 && norm[1].toLowerCase() === 'africa') norm = [norm[0]];
        if (norm.length === 1) {
            const candidate = norm[0];
            const cityToCountry = {
                'Nairobi': 'Kenya', 'Cairo': 'Egypt', 'Lagos': 'Nigeria', 'Cape Town': 'South Africa',
                'Johannesburg': 'South Africa', 'Kinshasa': 'DR Congo', 'Addis Ababa': 'Ethiopia',
                'Dakar': 'Senegal', 'Accra': 'Ghana', 'Dar es Salaam': 'Tanzania', 'Algiers': 'Algeria',
                'Casablanca': 'Morocco', 'Tunis': 'Tunisia', 'Abidjan': 'Ivory Coast', 'Luanda': 'Angola',
                'Kampala': 'Uganda', 'Mogadishu': 'Somalia', 'Harare': 'Zimbabwe', 'Lusaka': 'Zambia',
                'Pretoria': 'South Africa'
            };
            if (cityToCountry[candidate]) {
                return { country: cityToCountry[candidate], city: candidate, subArea: null, province: null };
            }
            const area = this._countryToArea(candidate);
            if (!area && candidate.split(' ').length === 1 && !/[a-z]/i.test(candidate)) return null;
            return { country: candidate, city: null, subArea: null, province: null };
        }
        const country = norm[norm.length - 1];
        let subArea = null, province = null, city = norm[0];
        if (norm.length === 2) return { country, city, subArea: null, province: null };
        if (norm.length === 3) {
            const middle = norm[1];
            if (country === 'China' && (middle.toLowerCase().includes('china') || /^(east|west|north|south|central|coastal)/i.test(middle))) {
                subArea = middle;
            } else {
                province = middle;
            }
        } else {
            province = norm[1];
            subArea = norm[norm.length - 2];
        }
        return { country, subArea, province, city };
    },

    /** Static bounding-box lookup — override/extend boxes as needed. */
    _countryFromCoords(lat, lng) {
        if (isNaN(lat) || isNaN(lng)) return null;
        const boxes = [];
        boxes.sort((a, b) => ((a.maxLat - a.minLat) * (a.maxLng - a.minLng)) - ((b.maxLat - b.minLat) * (b.maxLng - b.minLng)));
        for (const b of boxes) {
            if (lat >= b.minLat && lat <= b.maxLat && lng >= b.minLng && lng <= b.maxLng) {
                return { country: b.country, area: b.area };
            }
        }
        return null;
    },

    _resolveArea(rawTagArea, locationText, title) {
        let loc = this._parseLocationText(locationText);
        if (loc?.country) {
            const fromCountry = this._countryToArea(loc.country);
            if (fromCountry) {
                if (this._canonicalArea(loc.country) === fromCountry) loc.country = null;
                return { area: fromCountry, loc };
            }
        }
        if (loc?.lat && loc?.lng) {
            const fromCoords = this._countryFromCoords(loc.lat, loc.lng);
            if (fromCoords) {
                return { area: fromCoords.area, loc: { ...loc, country: fromCoords.country } };
            }
            try {
                const cache = JSON.parse(localStorage.getItem('geoCoordCache') || '{}');
                const key = `${loc.lat.toFixed(4)},${loc.lng.toFixed(4)}`;
                const cached = cache[key];
                if (cached && cached !== 'NOT_FOUND') {
                    const cachedArea = this._countryToArea(cached);
                    if (cachedArea) return { area: cachedArea, loc: { ...loc, country: cached } };
                }
            } catch(e) {}
        }
        const tagArea = this._canonicalArea(rawTagArea);
        const CANONICAL = ['Africa', 'East Asia', 'West Europe', 'Latin America', 'Eurasian Hub', 'North America', 'Indo-Pacific South'];
        if (CANONICAL.includes(tagArea)) {
            if (tagArea === 'Africa' && title) {
                let currentCountry = loc?.country;
                if (!currentCountry || currentCountry.toLowerCase() === 'unknown') {
                    const tl = title.toLowerCase();
                    let inferred = null;
                    if (tl.includes('egypt') || tl.includes('nile') || tl.includes('basenji') || tl.includes('horus') || /\bra\b/.test(tl)) inferred = 'Egypt';
                    else if (tl.includes('morocco') || tl.includes('zellige')) inferred = 'Morocco';
                    else if (tl.includes('benin') || tl.includes('agoije') || tl.includes('dahomey')) inferred = 'Benin';
                    else if (tl.includes('nigeria') || tl.includes('eshu') || tl.includes('oshun')) inferred = 'Nigeria';
                    else if (tl.includes('ethiopia') || tl.includes('adey abeba') || tl.includes('habesha')) inferred = 'Ethiopia';
                    else if (tl.includes('madagascar') || tl.includes('hira gasy')) inferred = 'Madagascar';
                    else if (tl.includes('angola') || tl.includes('engolo')) inferred = 'Angola';
                    else if (tl.includes('zambia') || tl.includes('mulyilo')) inferred = 'Zambia';
                    else if (tl.includes('botswana') || tl.includes('ostrich') || tl.includes('okavango') || tl.includes('mokoro')) inferred = 'Botswana';
                    else if (tl.includes('south africa') || tl.includes('protea') || tl.includes('ubuntu') || tl.includes('springbok') || tl.includes('nandi')) inferred = 'South Africa';
                    else if (tl.includes('tanzania') || tl.includes('migration') || tl.includes('kilimanjaro')) inferred = 'Tanzania';
                    else if (tl.includes('kenya') || tl.includes('kudu') || tl.includes('savannah') || tl.includes('savanna') || tl.includes('elephant') || tl.includes('chameleon') || tl.includes('honey badger') || tl.includes('idris')) inferred = 'Kenya';
                    else if (tl.includes('ridgeback')) inferred = 'Zimbabwe';
                    if (inferred) { loc = loc || {}; loc.country = inferred; }
                    else if (currentCountry && currentCountry.toLowerCase() === 'unknown') { loc = loc || {}; loc.country = null; }
                }
            }
            return { area: tagArea, loc };
        }
        return { area: null, loc };
    },

    // =========================================================================
    // EUROPE COUNTRY INFERENCE HELPERS
    // =========================================================================

    _EURO_CITY_TO_COUNTRY: {
        'zermatt':'Switzerland','zurich':'Switzerland','geneva':'Switzerland','bern':'Switzerland','lucerne':'Switzerland','basel':'Switzerland','sant moritz':'Switzerland','st. moritz':'Switzerland','lugano':'Switzerland','lausanne':'Switzerland','interlaken':'Switzerland',
        'paris':'France','lyon':'France','marseille':'France','nice':'France','strasbourg':'France','bordeaux':'France','provins':'France',
        'london':'United Kingdom','edinburgh':'United Kingdom','manchester':'United Kingdom','oxford':'United Kingdom','cambridge':'United Kingdom',
        'berlin':'Germany','munich':'Germany','hamburg':'Germany','frankfurt':'Germany','cologne':'Germany',
        'rome':'Italy','milan':'Italy','florence':'Italy','venice':'Italy','naples':'Italy','lucca':'Italy','turin':'Italy',
        'madrid':'Spain','barcelona':'Spain','seville':'Spain','valencia':'Spain','granada':'Spain',
        'lisbon':'Portugal','porto':'Portugal',
        'amsterdam':'Netherlands','rotterdam':'Netherlands',
        'brussels':'Belgium','bruges':'Belgium','antwerp':'Belgium',
        'vienna':'Austria','salzburg':'Austria','innsbruck':'Austria',
        'athens':'Greece','thessaloniki':'Greece','santorini':'Greece',
        'stockholm':'Sweden','gothenburg':'Sweden','uppsala':'Sweden',
        'copenhagen':'Denmark','aarhus':'Denmark',
        'oslo':'Norway','bergen':'Norway',
        'helsinki':'Finland',
        'reykjavik':'Iceland',
        'dublin':'Ireland',
        'prague':'Czech Republic','budapest':'Hungary',
        'warsaw':'Poland','krakow':'Poland',
        'bucharest':'Romania','sofia':'Bulgaria',
        'kyiv':'Ukraine','kiev':'Ukraine',
        'moscow':'Russia',
        'tallinn':'Estonia','riga':'Latvia','vilnius':'Lithuania',
        'zagreb':'Croatia','dubrovnik':'Croatia',
        'belgrade':'Serbia','bratislava':'Slovakia','ljubljana':'Slovenia',
        'valletta':'Malta','nicosia':'Cyprus','monaco':'Monaco',
    },

    _EURO_KEYWORD_TO_COUNTRY: {
        'colosseum':'Italy','coliseum':'Italy','pompeii':'Italy','roman forum':'Italy',
        'eiffel tower':'France','versailles':'France','louvre':'France','notre dame':'France','mont blanc':'France',
        'big ben':'United Kingdom','buckingham palace':'United Kingdom','stonehenge':'United Kingdom','tower of london':'United Kingdom',
        'neuschwanstein':'Germany','brandenburg gate':'Germany','oktoberfest':'Germany','bavaria':'Germany',
        'sagrada familia':'Spain','alhambra':'Spain','flamenco':'Spain',
        'acropolis':'Greece','parthenon':'Greece','olympia':'Greece',
        'matterhorn':'Switzerland','alps':'Switzerland','graubünden':'Switzerland',
        'madeira':'Portugal','azores':'Portugal',
        'transylvania':'Romania',
        'freya':'Norway','odin':'Norway','thor':'Norway','valhalla':'Norway','valkyrie':'Norway','norse':'Norway','viking':'Norway',
        'joc de doi':'Romania','dracula':'Romania',
        'renaissance':'Italy','michelangelo':'Italy','da vinci':'Italy','gladiator':'Italy',
        'napoleon':'France','french revolution':'France','bastille':'France',
        'shakespeare':'United Kingdom','sherlock':'United Kingdom',
        'beethoven':'Germany','bach':'Germany',
        'chopin':'Poland','copernicus':'Poland',
        'mozart':'Austria',
        'french bulldog':'France','poodle':'France','briard':'France',
        'bedlington terrier':'United Kingdom','yorkshire terrier':'United Kingdom','border collie':'United Kingdom','scottish terrier':'United Kingdom','english bulldog':'United Kingdom','golden retriever':'United Kingdom','cavalier king charles':'United Kingdom',
        'german shepherd':'Germany','rottweiler':'Germany','doberman':'Germany','great dane':'Germany','dachshund':'Germany','weimaraner':'Germany','schnauzer':'Germany','pomeranian':'Germany',
        'italian greyhound':'Italy','neapolitan mastiff':'Italy',
        'bernese mountain dog':'Switzerland','st. bernard':'Switzerland',
        'belgian malinois':'Belgium',
        'irish setter':'Ireland',
        'spanish water dog':'Spain','ibizan hound':'Spain',
        'portuguese water dog':'Portugal',
        'dalmatian':'Croatia',
        'hungarian vizsla':'Hungary','puli':'Hungary','komondor':'Hungary',
        'norwegian elkhound':'Norway','swedish vallhund':'Sweden','finnish spitz':'Finland','icelandic sheepdog':'Iceland',
        'eurasian red squirrel':'United Kingdom','red squirrel':'United Kingdom',
        'new caledonian crow':'France',
        'european bison':'Poland','wisent':'Poland',
        'iberian lynx':'Spain','chamois':'Switzerland','alpine ibex':'Switzerland',
        'puffin':'Iceland','arctic fox':'Iceland',
    },

    _EURO_FLAG_TO_COUNTRY: {
        '\ud83c\uddf7\ud83c\uddf4':'Romania','\ud83c\uddee\ud83c\uddf9':'Italy','\ud83c\uddeb\ud83c\uddf7':'France','\ud83c\udde9\ud83c\uddea':'Germany',
        '\ud83c\uddea\ud83c\uddf8':'Spain','\ud83c\uddec\ud83c\udde7':'United Kingdom','\ud83c\uddec\ud83c\uddf7':'Greece','\ud83c\uddf5\ud83c\uddf9':'Portugal',
        '\ud83c\uddf3\ud83c\uddf1':'Netherlands','\ud83c\udde7\ud83c\uddea':'Belgium','\ud83c\udde6\ud83c\uddf9':'Austria','\ud83c\udde8\ud83c\udded':'Switzerland',
        '\ud83c\uddf8\ud83c\uddea':'Sweden','\ud83c\uddf3\ud83c\uddf4':'Norway','\ud83c\udde9\ud83c\uddf0':'Denmark','\ud83c\uddeb\ud83c\uddee':'Finland',
        '\ud83c\uddee\ud83c\uddf8':'Iceland','\ud83c\uddee\ud83c\uddea':'Ireland','\ud83c\uddf5\ud83c\uddf1':'Poland','\ud83c\udded\ud83c\uddfa':'Hungary',
        '\ud83c\udde8\ud83c\uddff':'Czech Republic','\ud83c\udde7\ud83c\uddec':'Bulgaria','\ud83c\udded\ud83c\uddf7':'Croatia',
        '\ud83c\uddf7\ud83c\uddf8':'Serbia','\ud83c\uddfa\ud83c\udde6':'Ukraine','\ud83c\uddf7\ud83c\uddfa':'Russia','\ud83c\uddf2\ud83c\uddf9':'Malta',
    },

    _inferEuropeCountryFromTitle(title) {
        if (!title) return null;
        const m1 = title.match(/\(([^,]+),\s*(?:Europe|West Europe)\s*[|)]/i);
        if (m1) {
            const city = m1[1].trim().toLowerCase();
            if (this._EURO_CITY_TO_COUNTRY[city]) return this._EURO_CITY_TO_COUNTRY[city];
        }
        const KNOWN_EURO = ['Austria','Belgium','Bulgaria','Croatia','Cyprus','Czech Republic','Denmark','Estonia',
            'Finland','France','Germany','Greece','Hungary','Iceland','Ireland','Italy','Latvia','Lithuania',
            'Luxembourg','Malta','Netherlands','Norway','Poland','Portugal','Romania','Serbia','Slovakia',
            'Slovenia','Spain','Sweden','Switzerland','Ukraine','United Kingdom','Russia','Albania','Andorra',
            'Bosnia and Herzegovina','Kosovo','Liechtenstein','Monaco','Montenegro','North Macedonia','San Marino','Vatican'];
        const m2 = title.match(/,\s*([A-Za-z][A-Za-z\s]+?)\s*\(\s*(?:Europe|West Europe)/i);
        if (m2) {
            const found = KNOWN_EURO.find(c => c.toLowerCase() === m2[1].trim().toLowerCase());
            if (found) return found;
        }
        const m3 = title.match(/[\u4e00-\u9fff]+\s*\(([A-Za-z][A-Za-z\s]+?)\)/i);
        if (m3) {
            const found = KNOWN_EURO.find(c => c.toLowerCase() === m3[1].trim().toLowerCase());
            if (found) return found;
        }
        for (const [flag, country] of Object.entries(this._EURO_FLAG_TO_COUNTRY)) {
            if (title.includes(flag)) return country;
        }
        const lower = title.toLowerCase();
        const sorted = Object.keys(this._EURO_KEYWORD_TO_COUNTRY).sort((a, b) => b.length - a.length);
        for (const kw of sorted) {
            if (lower.includes(kw)) return this._EURO_KEYWORD_TO_COUNTRY[kw];
        }
        for (const [kw, country] of Object.entries(this._EURO_KEYWORD_TO_COUNTRY)) {
            if (title.includes(kw)) return country;
        }
        for (const c of KNOWN_EURO.sort((a, b) => b.length - a.length)) {
            if (lower.includes(c.toLowerCase())) return c;
        }
        return null;
    },

    // =========================================================================
    // REGION CONFIG TABLES
    // =========================================================================

    _EAST_ASIA_CONFIG: {
        'China': {
            'North China (Huabei)':       ['Beijing','Tianjin','Hebei','Shanxi','Inner Mongolia'],
            'Northeast China (Dongbei)':  ['Liaoning','Jilin','Heilongjiang'],
            'East China (Huadong)':       ['Shanghai','Jiangsu','Zhejiang','Anhui','Fujian','Jiangxi','Shandong','Taiwan'],
            'Central China (Huazhong)':   ['Henan','Hubei','Hunan'],
            'South China (Huanan)':       ['Guangdong','Guangxi','Hainan','Hong Kong','Macau'],
            'Southwest China (Xinan)':    ['Chongqing','Sichuan','Guizhou','Yunnan','Tibet'],
            'Northwest China (Xibei)':    ['Shaanxi','Gansu','Qinghai','Ningxia','Xinjiang'],
        },
        'Japan': {
            'Hokkaido (北海道)':                               ['Hokkaido (北海道)'],
            'Tohoku (东北地方)':                               ['Aomori (青森)','Iwate (岩手)','Miyagi (宫城)','Akita (秋田)','Yamagata (山形)','Fukushima (福岛)'],
            'Kanto (关东地方)':                                ['Tokyo (东京)','Kanagawa (神奈川)','Saitama (埼玉)','Chiba (千叶)','Ibaraki (茨城)','Tochigi (栃木)','Gunma (群马)'],
            'Kanto (Nanpo Islands) (南方诸岛)':               ['Ogasawara (小笠原)','Izu Islands (伊豆诸岛)'],
            'Chubu (中部地方)':                                ['Aichi (爱知)','Shizuoka (静冈)','Nagano (长野)','Gifu (岐阜)','Niigata (新泻)','Toyama (富山)','Ishikawa (石川)','Fukui (福井)','Yamanashi (山梨)'],
            'Kansai/Kinki (关西/近畿)':                        ['Osaka (大阪)','Kyoto (京都)','Hyogo (兵库)','Nara (奈良)','Mie (三重)','Shiga (滋贺)','Wakayama (和歌山)'],
            "Chugoku (San'in) (中国-山阴)":                   ['Shimane (岛根)','Tottori (鸟取)'],
            "Chugoku (San'yō) (中国-山阳)":                   ['Hiroshima (广岛)','Okayama (冈山)','Yamaguchi (山口)'],
            'Shikoku (四国)':                                  ['Ehime (爱媛)','Kagawa (香川)','Kochi (高知)','Tokushima (德岛)'],
            'Kyushu/Okinawa (九州/冲绳)':                      ['Fukuoka (福冈)','Kumamoto (熊本)','Kagoshima (鹿儿岛)','Nagasaki (长崎)','Oita (大分)','Miyazaki (宫崎)','Saga (佐贺)','Okinawa (冲绳)'],
            'Kyushu/Okinawa (Satsunan) (萨南诸岛)':           ['Amami Islands (奄美群岛)','Tokara Islands (吐噶喇群岛)','Osumi Islands (大隅群岛)'],
        },
        'South Korea': {
            'Sudogwon (首都圈)':          ['Seoul (首尔)','Incheon (仁川)','Gyeonggi (京畿道)'],
            'Hoseo Region (湖西地方)':    ['Daejeon (大田)','Sejong (世宗)','South Chungcheong (忠清南道)','North Chungcheong (忠清北道)'],
            'Honam Region (湖南地方)':    ['Gwangju (光州)','North Jeolla (全罗北道)','South Jeolla (全罗南道)'],
            'Yeongnam Region (岭南地方)': ['Busan (釜山)','Daegu (大邱)','Ulsan (蔚山)','North Gyeongsang (庆尚北道)','South Gyeongsang (庆尚南道)'],
            'Gwandong Region (关东地方)': ['Gangwon (江原道)'],
            'Jeju Region (济州地方)':     ['Jeju (济州岛)'],
        },
        'Taiwan': {
            'Northern Taiwan (台湾北部)': ['Taipei (台北)','New Taipei (新北)','Taoyuan (桃园)','Hsinchu (新竹)','Keelung (基隆)','Yilan (宜兰)'],
            'Central Taiwan (台湾中部)':  ['Taichung (台中)','Changhua (彰化)','Nantou (南投)','Yunlin (云林)','Miaoli (苗栗)'],
            'Southern Taiwan (台湾南部)': ['Kaohsiung (高雄)','Tainan (台南)','Pingtung (屏东)','Chiayi (嘉义)'],
            'Eastern Taiwan (台湾东部)':  ['Hualien (花莲)','Taitung (台东)'],
            'Outlying Islands (离岛)':    ['Penghu (澎湖)','Kinmen (金门)','Matsu (马祖)','Lienchiang (连江)'],
        },
        'North Korea': {
            'Pyongyang Region (平壤地区)':          ['Pyongyang (平壤)','Nampo (南浦)'],
            'Pyongan Region (平安道)':              ['North Pyongan (平安北道)','South Pyongan (平安南道)'],
            'Hamgyong & Northern Region (咸镜及北部)': ['North Hamgyong (咸镜北道)','South Hamgyong (咸镜南道)','Ryanggang (两江道)','Chagang (慈江道)'],
            'Hwanghae Region (黄海道)':             ['North Hwanghae (黄海北道)','South Hwanghae (黄海南道)'],
            'Kangwon Region (江原道)':              ['Kangwon (江原道)'],
        },
        'Russia (Asia)': {
            'Russian Far East (俄罗斯远东)': ['Primorsky Krai (滨海边疆区)','Khabarovsk Krai (哈巴罗夫斯克边疆区)','Kamchatka Krai (堪察加边疆区)','Sakhalin Oblast (萨哈林州)','Amur Oblast (阿穆尔州)','Magadan Oblast (马加丹州)','Chukotka (楚科奇)','Sakha Republic (Yakutia) (萨哈共和国)','Jewish Autonomous Oblast (犹太自治州)'],
            'Siberia (西伯利亚)':            ['Novosibirsk Oblast (新西伯利亚州)','Omsk Oblast (鄂木斯克州)','Krasnoyarsk Krai (克拉斯诺亚尔斯克边疆区)','Altai Krai (阿尔泰边疆区)','Altai Republic (阿尔泰共和国)','Irkutsk Oblast (伊尔库茨克州)','Kemerovo Oblast (科麦罗沃州)','Tomsk Oblast (托木斯克州)','Buryatia (布里亚特)','Zabaykalsky Krai (外贝加尔边疆区)','Tuva Republic (图瓦共和国)','Khakassia (哈卡斯)'],
            'Ural Region (乌拉尔地区)':      ['Sverdlovsk Oblast (斯维尔德洛夫斯克州)','Chelyabinsk Oblast (车里雅宾斯克州)','Tyumen Oblast (秋明州)','Kurgan Oblast (库尔干州)','Khanty-Mansi (汉特-曼西)','Yamalo-Nenets (亚马尔-涅涅茨)'],
        },
        'Mongolia': {
            'Ulaanbaatar Region (乌兰巴托地区)': ['Ulaanbaatar (乌兰巴托市)'],
            'Central Mongolia (蒙古中部)':       ['Töv (中央省)','Övörkhangai (前杭爱省)','Arkhangai (后杭爱省)'],
            'Northern Mongolia (蒙古北部)':      ['Khövsgöl (库苏古尔省)','Bulgan (布尔干省)','Selenge (色楞格省)','Orkhon (鄂尔浑省)','Darkhan-Uul (达尔汗乌拉省)'],
            'Eastern Mongolia (蒙古东部)':       ['Dornod (东方省)','Khentii (肯特省)','Sükhbaatar (苏赫巴托尔省)'],
            'Western Mongolia (蒙古西部)':       ['Bayan-Ölgii (巴彦乌列盖省)','Khovd (科布多省)','Uvs (乌布苏省)','Zavkhan (扎布汗省)','Govi-Altai (戈壁阿尔泰省)'],
            'Gobi Region (戈壁地区)':            ['Ömnögovi (南戈壁省)','Dundgovi (中戈壁省)','Dornogovi (东戈壁省)'],
        },
    },

    _INDOPACIFIC_SUBAREA_COUNTRIES: {
        'South Asia':                  ['India','Bangladesh','Nepal','Sri Lanka','Bhutan','Maldives','Myanmar'],
        'Southeast Asia (Mainland)':   ['Vietnam','Thailand','Cambodia','Laos'],
        'Southeast Asia (Maritime)':   ['Indonesia','Philippines','Malaysia','Singapore','Brunei','Timor-Leste','East Timor'],
        'Oceania':                     ['Australia','New Zealand','Papua New Guinea','Fiji','Solomon Islands','Vanuatu','Samoa','Tonga','Kiribati','Micronesia','Palau','Marshall Islands','Nauru','Tuvalu'],
    },

    _INDOPACIFIC_COUNTRY_SUBREGIONS: {
        'India': {
            'North India (北印度)':          ['Jammu & Kashmir','Himachal Pradesh','Punjab','Uttarakhand','Haryana','Delhi','Uttar Pradesh','Rajasthan'],
            'East India (东印度)':           ['Bihar','Jharkhand','West Bengal','Odisha','Sikkim'],
            'Northeast India (东北印度)':    ['Assam','Arunachal Pradesh','Nagaland','Manipur','Mizoram','Tripura','Meghalaya'],
            'Central India (中印度)':        ['Madhya Pradesh','Chhattisgarh'],
            'West India (西印度)':           ['Gujarat','Maharashtra','Goa','Dadra & Nagar Haveli','Daman & Diu'],
            'South India (南印度)':          ['Andhra Pradesh','Telangana','Karnataka','Kerala','Tamil Nadu','Puducherry','Lakshadweep'],
            'Island Territories (岛屿领地)': ['Andaman & Nicobar Islands'],
        },
        'Indonesia': {
            'Sumatra (苏门答腊)':                       ['Aceh','North Sumatra','West Sumatra','Riau','Jambi','South Sumatra','Bengkulu','Lampung','Bangka-Belitung','Riau Islands'],
            'Java (爪哇)':                              ['Jakarta','West Java','Central Java','Yogyakarta','East Java','Banten'],
            'Bali & Nusa Tenggara (巴厘岛及努沙登加拉)': ['Bali','West Nusa Tenggara','East Nusa Tenggara'],
            'Kalimantan (加里曼丹)':                    ['West Kalimantan','Central Kalimantan','South Kalimantan','East Kalimantan','North Kalimantan'],
            'Sulawesi (苏拉威西)':                      ['North Sulawesi','Gorontalo','Central Sulawesi','West Sulawesi','South Sulawesi','Southeast Sulawesi'],
            'Maluku & Papua (马鲁古及巴布亚)':           ['Maluku','North Maluku','West Papua','Papua','South Papua','Central Papua','Highland Papua'],
        },
        'Australia': {
            'Eastern Australia (澳大利亚东部)':             ['New South Wales','Victoria','Queensland'],
            'Southern Australia (澳大利亚南部)':            ['South Australia','Tasmania'],
            'Western Australia (澳大利亚西部)':             ['Western Australia'],
            'Central & Northern Australia (澳大利亚中北部)': ['Northern Territory','Australian Capital Territory'],
        },
        'Philippines': {
            'Luzon (吕宋岛)':       ['Ilocos Region','Cagayan Valley','Central Luzon','National Capital Region','CALABARZON','MIMAROPA','Bicol Region','Cordillera'],
            'Visayas (米沙鄢)':     ['Western Visayas','Central Visayas','Eastern Visayas'],
            'Mindanao (棉兰老岛)':  ['Zamboanga Peninsula','Northern Mindanao','Davao Region','SOCCSKSARGEN','Caraga','BARMM'],
        },
        'Vietnam': {
            'North Vietnam (越南北部)':   ['Hanoi','Hai Phong','Quang Ninh','Bac Ninh','Hung Yen','Hai Duong','Thai Binh','Nam Dinh','Ninh Binh','Ha Nam','Vinh Phuc','Phu Tho','Thai Nguyen','Bac Giang','Lang Son','Bac Kan','Cao Bang','Ha Giang','Tuyen Quang','Yen Bai','Lao Cai','Dien Bien','Lai Chau','Son La','Hoa Binh'],
            'Central Vietnam (越南中部)': ['Thanh Hoa','Nghe An','Ha Tinh','Quang Binh','Quang Tri','Hue','Da Nang','Quang Nam','Quang Ngai','Binh Dinh','Phu Yen','Khanh Hoa','Ninh Thuan','Binh Thuan','Kon Tum','Gia Lai','Dak Lak','Dak Nong','Lam Dong'],
            'South Vietnam (越南南部)':   ['Ho Chi Minh City','Binh Phuoc','Tay Ninh','Binh Duong','Dong Nai','Ba Ria-Vung Tau','Long An','Tien Giang','Ben Tre','Tra Vinh','Vinh Long','Dong Thap','An Giang','Kien Giang','Can Tho','Hau Giang','Soc Trang','Bac Lieu','Ca Mau'],
        },
        'Thailand': {
            'Central Thailand (泰国中部)':      ['Bangkok','Nonthaburi','Pathum Thani','Samut Prakan','Ayutthaya','Ang Thong','Chai Nat','Lopburi','Nakhon Nayok','Nakhon Pathom','Ratchaburi','Samut Sakhon','Samut Songkhram','Sara Buri','Sing Buri','Suphan Buri','Kanchanaburi'],
            'Northern Thailand (泰国北部)':     ['Chiang Mai','Chiang Rai','Nan','Phayao','Phrae','Lampang','Lamphun','Mae Hong Son','Phitsanulok','Phichit','Phetchabun','Sukhothai','Tak','Uttaradit','Kamphaeng Phet','Nakhon Sawan','Uthai Thani'],
            'Northeastern Thailand (泰国东北部)':['Nakhon Ratchasima','Ubon Ratchathani','Khon Kaen','Udon Thani','Buri Ram','Si Sa Ket','Surin','Roi Et','Maha Sarakham','Kalasin','Nakhon Phanom','Mukdahan','Sakon Nakhon','That Phanom','Amnat Charoen','Loei','Nong Bua Lamphu','Nong Khai','Bueng Kan','Chaiyaphum'],
            'Eastern Thailand (泰国东部)':      ['Chon Buri','Rayong','Chanthaburi','Trat','Chachoengsao','Prachin Buri','Sa Kaeo'],
            'Southern Thailand (泰国南部)':     ['Nakhon Si Thammarat','Songkhla','Surat Thani','Phuket','Krabi','Phang Nga','Trang','Phatthalung','Satun','Pattani','Yala','Narathiwat','Chumphon','Ranong','Prachuap Khiri Khan','Phetchaburi'],
        },
        'Myanmar': {
            'Upper Myanmar (缅甸上部)':  ['Mandalay','Sagaing','Magway','Chin State'],
            'Lower Myanmar (缅甸下部)':  ['Yangon','Bago','Ayeyarwady','Mon State','Kayin State','Tanintharyi'],
            'Eastern Myanmar (缅甸东部)':['Shan State','Kayah State','Kachin State'],
            'Rakhine (若开邦)':          ['Rakhine State'],
        },
        'Malaysia': {
            'Peninsular Malaysia (马来半岛)':   ['Selangor','Kuala Lumpur','Putrajaya','Perak','Johor','Pahang','Negeri Sembilan','Melaka','Kelantan','Terengganu','Kedah','Penang','Perlis'],
            'East Malaysia - Sabah (沙巴)':    ['Sabah'],
            'East Malaysia - Sarawak (砂拉越)': ['Sarawak'],
            'Federal Territories (联邦直辖区)': ['Labuan'],
        },
    },

    // =========================================================================
    // LOCATION HIERARCHY BUILDER
    // =========================================================================

    _buildLocationHierarchy() {
        const hierarchy = {};

        // ── Pre-seed all areas / subareas / countries ─────────────────────────
        const africaSubregions = {
            'Northern Africa': ['Egypt','Algeria','Morocco','Sudan','Tunisia','Libya','Western Sahara'],
            'Western Africa':  ['Nigeria','Niger','Ghana','Senegal','Mali','Burkina Faso','Ivory Coast','Benin','Liberia','Sierra Leone','Togo','Guinea','Guinea-Bissau','Cape Verde','Gambia','Sao Tome and Principe'],
            'Middle Africa':   ['DR Congo','Congo','Cameroon','Chad','Angola','Gabon','Central African Republic','Equatorial Guinea','Sao Tome and Principe'],
            'Eastern Africa':  ['Ethiopia','Kenya','Tanzania','Uganda','Somalia','Mozambique','Rwanda','Burundi','Djibouti','Eritrea','Mauritius','Comoros','Seychelles','Madagascar'],
            'Southern Africa': ['South Africa','Zambia','Zimbabwe','Namibia','Botswana','Lesotho','Malawi','Eswatini','Mauritius'],
        };
        if (!hierarchy['Africa']) hierarchy['Africa'] = { _count: 0, children: {} };
        for (const [sr, countries] of Object.entries(africaSubregions)) {
            if (!hierarchy['Africa'].children[sr]) hierarchy['Africa'].children[sr] = { _count: 0, children: {} };
            for (const c of countries) {
                if (!hierarchy['Africa'].children[sr].children[c])
                    hierarchy['Africa'].children[sr].children[c] = { _count: 0, children: {} };
            }
        }

        if (!hierarchy['East Asia']) hierarchy['East Asia'] = { _count: 0, children: {} };
        for (const [country, subRegions] of Object.entries(this._EAST_ASIA_CONFIG)) {
            if (!hierarchy['East Asia'].children[country]) hierarchy['East Asia'].children[country] = { _count: 0, children: {} };
            for (const [sr, provs] of Object.entries(subRegions)) {
                if (!hierarchy['East Asia'].children[country].children[sr])
                    hierarchy['East Asia'].children[country].children[sr] = { _count: 0, children: {} };
                for (const prov of provs) {
                    if (!hierarchy['East Asia'].children[country].children[sr].children[prov])
                        hierarchy['East Asia'].children[country].children[sr].children[prov] = { _count: 0, children: {} };
                }
            }
        }

        const westEuropeSubregions = {
            'Western Europe':  ['Austria','Belgium','France','Germany','Liechtenstein','Luxembourg','Monaco','Netherlands','Switzerland'],
            'Northern Europe': ['Denmark','Estonia','Finland','Iceland','Ireland','Latvia','Lithuania','Norway','Sweden','United Kingdom'],
            'Southern Europe': ['Albania','Andorra','Bosnia and Herzegovina','Croatia','Cyprus','Greece','Italy','Kosovo','Malta','Montenegro','North Macedonia','Portugal','San Marino','Serbia','Slovenia','Spain','Vatican'],
        };
        if (!hierarchy['West Europe']) hierarchy['West Europe'] = { _count: 0, children: {} };
        for (const [sr, countries] of Object.entries(westEuropeSubregions)) {
            if (!hierarchy['West Europe'].children[sr]) hierarchy['West Europe'].children[sr] = { _count: 0, children: {} };
            for (const c of countries) {
                if (!hierarchy['West Europe'].children[sr].children[c])
                    hierarchy['West Europe'].children[sr].children[c] = { _count: 0, children: {} };
            }
        }

        const eurasiaSubregions = {
            'Eastern Europe':        ['Belarus','Bulgaria','Czech Republic','Hungary','Moldova','Poland','Romania','Russia','Slovakia','Ukraine'],
            'Central Asia':          ['Kazakhstan','Kyrgyzstan','Tajikistan','Turkmenistan','Uzbekistan'],
            'Eurasian Hub (West Asia)': ['Afghanistan','Armenia','Azerbaijan','Bahrain','Georgia','Iran','Iraq','Israel','Jordan','Kuwait','Lebanon','Oman','Pakistan','Palestine','Qatar','Saudi Arabia','Syria','Turkey','UAE','Yemen'],
        };
        if (!hierarchy['Eurasian Hub']) hierarchy['Eurasian Hub'] = { _count: 0, children: {} };
        for (const [sr, countries] of Object.entries(eurasiaSubregions)) {
            if (!hierarchy['Eurasian Hub'].children[sr]) hierarchy['Eurasian Hub'].children[sr] = { _count: 0, children: {} };
            for (const c of countries) {
                if (!hierarchy['Eurasian Hub'].children[sr].children[c])
                    hierarchy['Eurasian Hub'].children[sr].children[c] = { _count: 0, children: {} };
            }
        }

        const latinAmericaSubregions = {
            'Central America & Mexico': ['Mexico','Guatemala','Honduras','El Salvador','Nicaragua','Costa Rica','Panama','Belize'],
            'Caribbean':                ['Cuba','Dominican Republic','Haiti','Jamaica','Puerto Rico','Trinidad and Tobago'],
            'South America':            ['Brazil','Colombia','Argentina','Peru','Venezuela','Chile','Ecuador','Bolivia','Paraguay','Uruguay','Guyana','Suriname'],
        };
        if (!hierarchy['Latin America']) hierarchy['Latin America'] = { _count: 0, children: {} };
        for (const [sr, countries] of Object.entries(latinAmericaSubregions)) {
            if (!hierarchy['Latin America'].children[sr]) hierarchy['Latin America'].children[sr] = { _count: 0, children: {} };
            for (const c of countries) {
                if (!hierarchy['Latin America'].children[sr].children[c])
                    hierarchy['Latin America'].children[sr].children[c] = { _count: 0, children: {} };
            }
        }

        if (!hierarchy['North America']) hierarchy['North America'] = { _count: 0, children: {} };
        const usaSubregions = {
            'Northeast (东北部)': ['Connecticut','Maine','Massachusetts','New Hampshire','Rhode Island','Vermont','New Jersey','New York','Pennsylvania','District of Columbia'],
            'Midwest (中西部)':   ['Illinois','Indiana','Michigan','Ohio','Wisconsin','Iowa','Kansas','Minnesota','Missouri','Nebraska','North Dakota','South Dakota'],
            'South (南部)':       ['Delaware','Florida','Georgia','Maryland','North Carolina','South Carolina','Virginia','West Virginia','Alabama','Kentucky','Mississippi','Tennessee','Arkansas','Louisiana','Oklahoma','Texas'],
            'West (西部)':        ['Arizona','Colorado','Idaho','Montana','Nevada','New Mexico','Utah','Wyoming','Alaska','California','Hawaii','Oregon','Washington'],
        };
        if (!hierarchy['North America'].children['United States'])
            hierarchy['North America'].children['United States'] = { _count: 0, children: {} };
        for (const [sr, states] of Object.entries(usaSubregions)) {
            if (!hierarchy['North America'].children['United States'].children[sr])
                hierarchy['North America'].children['United States'].children[sr] = { _count: 0, children: {} };
            for (const s of states) {
                if (!hierarchy['North America'].children['United States'].children[sr].children[s])
                    hierarchy['North America'].children['United States'].children[sr].children[s] = { _count: 0, children: {} };
            }
        }
        if (!hierarchy['North America'].children['Canada'])
            hierarchy['North America'].children['Canada'] = { _count: 0, children: {} };
        ['Ontario','Quebec','British Columbia','Alberta','Manitoba','Saskatchewan','Nova Scotia','New Brunswick',
         'Newfoundland and Labrador','Prince Edward Island','Northwest Territories','Nunavut','Yukon'].forEach(p => {
            if (!hierarchy['North America'].children['Canada'].children[p])
                hierarchy['North America'].children['Canada'].children[p] = { _count: 0, children: {} };
        });

        if (!hierarchy['Indo-Pacific South'])
            hierarchy['Indo-Pacific South'] = { _count: 0, children: {} };
        for (const [sr, countries] of Object.entries(this._INDOPACIFIC_SUBAREA_COUNTRIES)) {
            if (!hierarchy['Indo-Pacific South'].children[sr])
                hierarchy['Indo-Pacific South'].children[sr] = { _count: 0, children: {} };
            for (const country of countries) {
                if (!hierarchy['Indo-Pacific South'].children[sr].children[country])
                    hierarchy['Indo-Pacific South'].children[sr].children[country] = { _count: 0, children: {} };
                const csrMap = this._INDOPACIFIC_COUNTRY_SUBREGIONS[country];
                if (csrMap) {
                    for (const [csr, provs] of Object.entries(csrMap)) {
                        if (!hierarchy['Indo-Pacific South'].children[sr].children[country].children[csr])
                            hierarchy['Indo-Pacific South'].children[sr].children[country].children[csr] = { _count: 0, children: {} };
                        for (const prov of provs) {
                            if (!hierarchy['Indo-Pacific South'].children[sr].children[country].children[csr].children[prov])
                                hierarchy['Indo-Pacific South'].children[sr].children[country].children[csr].children[prov] = { _count: 0, children: {} };
                        }
                    }
                }
            }
        }

        // ── Helper: get or create a child node and bump count ─────────────────
        const getOrCreate = (parent, key) => {
            if (!parent.children) parent.children = {};
            if (!parent.children[key]) parent.children[key] = { _count: 0, children: {} };
            parent.children[key]._count++;
            return parent.children[key];
        };

        // ── Helper: add one event to the hierarchy ────────────────────────────
        const addNode = (area, country, subArea, province, city, title) => {
            if (country) {
                country = this._normalizeCountryName(country);
                const low = country.toLowerCase().trim();
                const US_STATES = new Set(['alabama','alaska','arizona','arkansas','california','colorado','connecticut','delaware','florida','georgia','hawaii','idaho','illinois','indiana','iowa','kansas','kentucky','louisiana','maine','maryland','massachusetts','michigan','minnesota','mississippi','missouri','montana','nebraska','nevada','new hampshire','new jersey','new mexico','new york','north carolina','north dakota','ohio','oklahoma','oregon','pennsylvania','rhode island','south carolina','south dakota','tennessee','texas','utah','vermont','virginia','washington','west virginia','wisconsin','wyoming','district of columbia','washington dc','washington d.c.']);
                if (US_STATES.has(low) && area === 'North America') { if (!province) province = country; country = 'United States'; }
                if (area === 'North America' && low === 'georgia')  { if (!province) province = country; country = 'United States'; }
                const CA_PROVINCES = new Set(['ontario','quebec','british columbia','alberta','manitoba','saskatchewan','nova scotia','new brunswick','newfoundland and labrador','prince edward island','northwest territories','nunavut','yukon']);
                if (CA_PROVINCES.has(low)) { if (!province) province = country; country = 'Canada'; }
            }

            area = area || 'Unknown';
            if (!hierarchy[area]) hierarchy[area] = { _count: 0, children: {} };
            hierarchy[area]._count++;
            let cur = hierarchy[area];

            if (area === 'Africa' && country) {
                cur = getOrCreate(cur, this._getAfricanSubRegion(country, city));
                cur = getOrCreate(cur, country);
            } else if (area === 'East Asia' && country) {
                cur = getOrCreate(cur, country);
                let sa = subArea;
                if (!sa) {
                    if (country === 'China')                            sa = this._getChinaSubRegion(province || city);
                    else if (country === 'Japan')                       sa = this._getJapanSubRegion(province || city);
                    else if (country === 'South Korea' || country === 'Korea') sa = this._getKoreaSubRegion(province || city);
                    else if (country === 'North Korea')                 sa = this._getNorthKoreaSubRegion(province || city);
                    else if (country === 'Taiwan')                      sa = this._getTaiwanSubRegion(province || city);
                    else if (country === 'Russia (Asia)')               sa = this._getRussiaAsiaSubRegion(province || city);
                    else if (country === 'Mongolia')                    sa = this._getMongoliaSubRegion(province || city);
                    else sa = 'Other';
                }
                cur = getOrCreate(cur, sa);
                if (province) cur = getOrCreate(cur, province);
                else if (city) cur = getOrCreate(cur, 'Other Region');
            } else if (area === 'West Europe') {
                let euroCountry = country;
                if (!euroCountry) euroCountry = this._inferEuropeCountryFromTitle(title || '');
                if (euroCountry) {
                    const euroSub = this._getEuropeanSubRegion(euroCountry);
                    if (euroSub) cur = getOrCreate(cur, euroSub);
                    cur = getOrCreate(cur, euroCountry);
                    if (['germany','france','united kingdom','italy','spain'].includes(euroCountry.toLowerCase())) {
                        if (province) cur = getOrCreate(cur, province);
                        else if (city) cur = getOrCreate(cur, 'Other Region');
                    }
                }
            } else if (area === 'Eurasian Hub') {
                const sub = this._getEurasiaMiddleEastSubRegion(country);
                if (sub) cur = getOrCreate(cur, sub);
                if (country) cur = getOrCreate(cur, country);
            } else if (area === 'Latin America') {
                const sub = this._getLatinAmericaSubRegion(country);
                if (sub) cur = getOrCreate(cur, sub);
                if (country) {
                    cur = getOrCreate(cur, country);
                    if (['brazil','mexico','argentina','colombia','peru','chile'].includes(country.toLowerCase())) {
                        if (province) cur = getOrCreate(cur, province);
                        else if (city) cur = getOrCreate(cur, 'Other Region');
                    }
                }
            } else if (area === 'North America') {
                if (country) {
                    cur = getOrCreate(cur, country);
                    if (['united states','usa','us'].includes(country.toLowerCase())) {
                        cur = getOrCreate(cur, this._getUSASubRegion(province || city));
                        if (province) cur = getOrCreate(cur, province);
                        else if (city) cur = getOrCreate(cur, 'Other Region');
                    } else if (country.toLowerCase() === 'canada') {
                        if (province) cur = getOrCreate(cur, province);
                        else if (city) cur = getOrCreate(cur, 'Other Region');
                    }
                }
            } else if (area === 'Indo-Pacific South') {
                if (country) {
                    const ipSub = this._getIndoPacificSubRegion(country);
                    if (ipSub) cur = getOrCreate(cur, ipSub);
                    cur = getOrCreate(cur, country);
                    const csr = this._getIndoPacificCountrySubRegion(country, province || city);
                    if (csr) {
                        cur = getOrCreate(cur, csr);
                        if (province) cur = getOrCreate(cur, province);
                        else if (city) cur = getOrCreate(cur, 'Other Region');
                    } else {
                        if (city) cur = getOrCreate(cur, city);
                    }
                }
            } else {
                if (country) cur = getOrCreate(cur, country);
            }

            if (!city) return;
            getOrCreate(cur, city);
        };

        // ── Process events from localStorage and the global latest feed ───────
        const customEvents = JSON.parse(localStorage.getItem('cloudmail_events') || '[]');
        const seenIds = new Set();

        const processEvent = (id, ev, rawTags, locationText, title) => {
            if (id) { if (seenIds.has(id)) return; seenIds.add(id); }
            if (!rawTags) return;
            let { area, loc } = this._resolveArea(rawTags.area, locationText || ev.location, title);
            if (!area) {
                if (loc && loc.lat && loc.lng) {
                    if (window.App && !App._unresolvedCoords) App._unresolvedCoords = {};
                    const k = `${loc.lat.toFixed(4)},${loc.lng.toFixed(4)}`;
                    if (window.App) App._unresolvedCoords[k] = { lat: loc.lat, lng: loc.lng };
                }
                return;
            }
            let country = loc?.country || rawTags?.country || null;
            if (country) {
                const low = country.toLowerCase().trim();
                if (low === 'unknown') { country = null; }
                else {
                    const mappedArea = this._countryToArea(country);
                    if (mappedArea && !area) area = mappedArea;
                }
            }
            const province = loc?.province || rawTags?.province || null;
            const city     = loc?.city     || rawTags?.city     || null;
            addNode(area, country, loc?.subArea || null, province, city, title);
        };

        customEvents.forEach(ev => {
            let tags = ev.tags;
            if (!tags && ev.description) tags = this.parseTagsFromDescription(ev.description);
            if (!ev.isGoogleSync) return;
            processEvent(ev.id, ev, tags, ev.location || null, ev.title || null);
        });

        const latestItems = window.cloudmailLatestEvents?.items || [];
        latestItems.forEach(item => {
            if (item.extendedProperties?.private?.videoTags) {
                try {
                    const tags = JSON.parse(item.extendedProperties.private.videoTags);
                    processEvent(item.id, { location: item.location }, tags, item.location || null, item.summary || null);
                } catch(e) {}
            }
        });

        return hierarchy;
    },

    // =========================================================================
    // LOCATION TREE RENDERING
    // =========================================================================

    renderLocationTree() {
        const container = document.getElementById('tag-location-tree');
        if (!container) return;

        const hier    = this._buildLocationHierarchy();
        const activeF = this._locationFilter;

        // Auto-expand active path
        if (activeF && activeF.area) {
            this._locationTreeExpanded[`a:${activeF.area}`] = true;
            if (['Africa', 'Latin America', 'Eurasian Hub', 'West Europe'].includes(activeF.area)) {
                if (activeF.subArea)  this._locationTreeExpanded[`sa:${activeF.area}:${activeF.subArea}`] = true;
                if (activeF.subArea && activeF.country) this._locationTreeExpanded[`c:${activeF.area}:${activeF.subArea}:${activeF.country}`] = true;
            } else if (activeF.area === 'East Asia' || (activeF.area === 'North America' && activeF.country && ['united states','usa','us'].includes(activeF.country.toLowerCase()))) {
                if (activeF.country) this._locationTreeExpanded[`c:${activeF.area}:${activeF.country}`] = true;
                if (activeF.country && activeF.subArea)  this._locationTreeExpanded[`sa:${activeF.area}:${activeF.country}:${activeF.subArea}`] = true;
                if (activeF.country && activeF.subArea && activeF.province) this._locationTreeExpanded[`p:${activeF.area}:${activeF.country}:${activeF.subArea}:${activeF.province}`] = true;
            } else if (activeF.area === 'Indo-Pacific South') {
                if (activeF.subArea) this._locationTreeExpanded[`sa:${activeF.area}:${activeF.subArea}`] = true;
                if (activeF.subArea && activeF.country) this._locationTreeExpanded[`c:${activeF.area}:${activeF.subArea}:${activeF.country}`] = true;
            } else if (activeF.area === 'North America') {
                if (activeF.country) this._locationTreeExpanded[`c:${activeF.area}:${activeF.country}`] = true;
                if (activeF.country && activeF.province) this._locationTreeExpanded[`p:${activeF.area}:${activeF.country}:${activeF.province}`] = true;
            } else {
                if (activeF.country) this._locationTreeExpanded[`c:${activeF.area}:${activeF.country}`] = true;
            }
        }

        // Population table used for sorting / display
        const TREE_POP = {
            'Africa':1400,'East Asia':1700,'West Europe':450,'Latin America':650,'Eurasian Hub':1200,'North America':380,'Indo-Pacific South':2100,
            'South Asia':1950,'Southeast Asia (Mainland)':250,'Southeast Asia (Maritime)':420,'Oceania':45,
            'Eastern Africa':450,'Western Africa':400,'Northern Africa':250,'Middle Africa':200,'Southern Africa':70,
            'Nigeria':223,'Ethiopia':126,'Egypt':113,'DR Congo':102,'Tanzania':67,'South Africa':60,'Kenya':55,'Sudan':48,'Uganda':48,'Algeria':45,'Morocco':38,'Angola':36,'Mozambique':34,'Ghana':34,'Madagascar':30,'Cameroon':28,'Ivory Coast':28,'Niger':27,'Burkina Faso':23,'Mali':23,'Malawi':21,'Zambia':20,'Senegal':18,'Chad':18,'Somalia':18,'Zimbabwe':16,'Guinea':14,'Rwanda':14,'Benin':13,'Burundi':13,'Tunisia':12,'Togo':9,'Sierra Leone':8,'Libya':7,'Congo':6,'Liberia':5,'Central African Republic':5,'Mauritania':4.8,'Eritrea':3.7,'Namibia':2.6,'Gambia':2.5,'Botswana':2.4,'Gabon':2.4,'Lesotho':2.3,'Guinea-Bissau':2.1,'Equatorial Guinea':1.7,'Mauritius':1.2,'Eswatini':1.2,'Djibouti':1.1,'Comoros':0.8,'Cape Verde':0.5,'Western Sahara':0.5,'Sao Tome and Principe':0.2,'Seychelles':0.1,
            'China':1400,'Japan':125,'South Korea':52,'North Korea':26,'Taiwan':23,'Mongolia':3.4,'Hong Kong':7,'Macau':0.6,'Russia (Asia)':33,
            'East China (Huadong)':420,'Southwest China (Xinan)':203,'Central China (Huazhong)':222,'South China (Huanan)':180,'North China (Huabei)':170,'Northwest China (Xibei)':100,'Northeast China (Dongbei)':96,
            'Guangdong':126,'Shandong':101,'Henan':98,'Jiangsu':85,'Sichuan':83,'Hebei':74,'Hunan':66,'Zhejiang':65,'Anhui':61,'Hubei':58,'Guangxi':50,'Yunnan':47,'Jiangxi':45,'Liaoning':42,'Fujian':41,'Shaanxi':39,'Guizhou':38,'Shanxi':34,'Chongqing':32,'Heilongjiang':31,'Xinjiang':25,'Gansu':24,'Shanghai':24,'Inner Mongolia':24,'Jilin':23,'Beijing':21,'Tianjin':13,'Hainan':10,'Ningxia':7,'Qinghai':5,'Tibet':3,
            'Kanto (关东地方)':43,'Kansai/Kinki (关西/近畿)':22,'Chubu (中部地方)':21,'Kyushu/Okinawa (九州/冲绳)':14,'Tohoku (东北地方)':8.6,'Hokkaido (北海道)':5.2,
            'Sudogwon (首都圈)':26,'Yeongnam Region (岭南地方)':12.8,'Hoseo Region (湖西地方)':5.5,'Honam Region (湖南地方)':5.1,
            'Northern Taiwan (台湾北部)':10.7,'Southern Taiwan (台湾南部)':6.3,'Central Taiwan (台湾中部)':5.8,
            'Western Europe':197,'Southern Europe':152,'Northern Europe':105,
            'Germany':84,'France':68,'United Kingdom':67,'Italy':59,'Spain':48,'Netherlands':18,'Belgium':12,'Sweden':10.5,'Greece':10.4,'Portugal':10.3,'Austria':9.1,'Switzerland':8.8,'Serbia':6.6,'Denmark':5.9,'Finland':5.6,'Norway':5.5,'Ireland':5.1,'Croatia':3.8,'Bosnia and Herzegovina':3.2,'Albania':2.8,'Lithuania':2.8,'Slovenia':2.1,'North Macedonia':2.1,'Latvia':1.8,'Kosovo':1.8,'Estonia':1.3,'Cyprus':1.2,'Montenegro':0.6,'Luxembourg':0.6,'Malta':0.5,'Iceland':0.4,'Andorra':0.08,'Liechtenstein':0.04,'San Marino':0.03,'Monaco':0.03,'Vatican':0.001,
            'Eurasian Hub (West Asia)':410,'Eastern Europe':290,'Central Asia':75,
            'Russia':144,'Turkey':85,'Iran':88,'Iraq':42,'Saudi Arabia':36,'Uzbekistan':36,'Afghanistan':41,'Pakistan':231,'Ukraine':43,'Poland':38,'Romania':19,'Kazakhstan':19,'Syria':22,'Yemen':34,'Azerbaijan':10,'Tajikistan':10,'Hungary':9.7,'Belarus':9.4,'Israel':9.3,'Bulgaria':6.5,'Czech Republic':10.9,'Jordan':10.2,'Georgia':3.7,'Slovakia':5.5,'Moldova':2.6,'Armenia':3.0,'Kuwait':4.3,'UAE':9.9,'Qatar':2.9,'Bahrain':1.5,'Oman':4.5,'Lebanon':5.5,'Palestine':5.4,
            'South America':430,'Central America & Mexico':180,'Caribbean':44,
            'Brazil':215,'Colombia':52,'Argentina':46,'Peru':34,'Venezuela':28,'Chile':19,'Ecuador':18,'Mexico':128,'Guatemala':17,'Bolivia':12,'Haiti':11,'Cuba':11,'Dominican Republic':11,'Honduras':10,'Paraguay':7,'Nicaragua':7,'El Salvador':6,'Costa Rica':5,'Panama':4,'Uruguay':3.4,'Puerto Rico':3.2,'Jamaica':2.8,'Trinidad and Tobago':1.5,'Guyana':0.8,'Suriname':0.6,'Belize':0.4,
            'United States':335,'Canada':38,'Greenland':0.057,
            'South (南部)':130,'West (西部)':80,'Midwest (中西部)':69,'Northeast (东北部)':57,
            'California':39,'Texas':30,'Florida':22.6,'New York':19.8,'Pennsylvania':13,'Illinois':12.6,'Ohio':11.8,'Georgia':10.9,'North Carolina':10.6,'Michigan':10,'New Jersey':9.3,'Virginia':8.7,'Washington':7.7,'Arizona':7.4,'Massachusetts':7,'Tennessee':7,'Indiana':6.8,'Missouri':6.2,'Maryland':6.2,'Wisconsin':5.9,'Colorado':5.8,'Minnesota':5.7,'South Carolina':5.3,'Alabama':5.1,'Louisiana':4.6,'Kentucky':4.5,'Oregon':4.3,'Oklahoma':4,'Connecticut':3.6,'Utah':3.4,'Iowa':3.2,'Nevada':3.2,'Arkansas':3,'Mississippi':3,'Kansas':2.9,'New Mexico':2.1,'Nebraska':2,'Idaho':1.9,'West Virginia':1.8,'Hawaii':1.4,'New Hampshire':1.4,'Maine':1.4,'Montana':1.1,'Rhode Island':1.1,'Delaware':1,'South Dakota':0.9,'North Dakota':0.8,'Alaska':0.7,'District of Columbia':0.7,'Vermont':0.6,'Wyoming':0.6,
            'Ontario':14.2,'Quebec':8.5,'British Columbia':5.2,'Alberta':4.4,'Manitoba':1.4,'Saskatchewan':1.2,'Nova Scotia':1,'New Brunswick':0.8,'Newfoundland and Labrador':0.5,'Prince Edward Island':0.17,'Northwest Territories':0.045,'Nunavut':0.04,'Yukon':0.04,
            'India':1440,'Bangladesh':172,'Nepal':30,'Sri Lanka':22,'Bhutan':0.8,'Maldives':0.5,'Myanmar':55,'Vietnam':98,'Thailand':72,'Cambodia':17,'Laos':7.5,'Indonesia':280,'Philippines':115,'Malaysia':33,'Singapore':5.9,'Brunei':0.5,'Timor-Leste':1.4,'Australia':26,'New Zealand':5,'Papua New Guinea':10,'Fiji':0.9,'Solomon Islands':0.7,'Vanuatu':0.3,'Samoa':0.2,'Tonga':0.1,
            'North India (北印度)':450,'East India (东印度)':230,'Northeast India (东北印度)':46,'Central India (中印度)':90,'West India (西印度)':180,'South India (南印度)':280,'Island Territories (岛屿领地)':0.4,
            'Java (爪哇)':156,'Sumatra (苏门答腊)':60,'Bali & Nusa Tenggara (巴厘岛及努沙登加拉)':13,'Kalimantan (加里曼丹)':16,'Sulawesi (苏拉威西)':19,'Maluku & Papua (马鲁古及巴布亚)':5,
            'Eastern Australia (澳大利亚东部)':18,'Southern Australia (澳大利亚南部)':2.5,'Western Australia (澳大利亚西部)':2.9,'Central & Northern Australia (澳大利亚中北部)':0.6,
            'Luzon (吕宋岛)':60,'Visayas (米沙鄢)':22,'Mindanao (棉兰老岛)':26,
            'North Vietnam (越南北部)':33,'Central Vietnam (越南中部)':20,'South Vietnam (越南南部)':35,
            'Central Thailand (泰国中部)':22,'Northern Thailand (泰国北部)':11,'Northeastern Thailand (泰国东北部)':22,'Eastern Thailand (泰国东部)':5,'Southern Thailand (泰国南部)':9,
            'Upper Myanmar (缅甸上部)':20,'Lower Myanmar (缅甸下部)':21,'Eastern Myanmar (缅甸东部)':10,'Rakhine (若开邦)':3.5,
            'Peninsular Malaysia (马来半岛)':26,'East Malaysia - Sabah (沙巴)':3.9,'East Malaysia - Sarawak (砂拉越)':2.8,'Federal Territories (联邦直辖区)':0.1,
        };

        const badge = (n) => n > 0
            ? `<span style="margin-left:auto;background:#e8edf2;color:#555;border-radius:8px;padding:0 5px;font-size:9px;font-weight:700;min-width:18px;text-align:center;">${n}</span>`
            : `<span style="margin-left:auto;background:#f2f2f2;color:#bbb;border-radius:8px;padding:0 5px;font-size:9px;font-weight:700;min-width:18px;text-align:center;">0</span>`;

        const renderRow = (label, count, level, p, depth, icon, isExpanded, hasChildren, key) => {
            const isActive =
                (level === 'area'          && activeF.area === p.area && !activeF.country && !activeF.subArea && !activeF.province && !activeF.city) ||
                (level === 'africaSubArea' && activeF.area === p.area && activeF.subArea === p.subArea && !activeF.country) ||
                (level === 'country'       && activeF.area === p.area && activeF.country === p.country && !activeF.subArea && !activeF.province && !activeF.city) ||
                (level === 'subArea'       && activeF.area === p.area && activeF.country === p.country && activeF.subArea === p.subArea && !activeF.province && !activeF.city) ||
                (level === 'province'      && activeF.area === p.area && activeF.country === p.country && activeF.subArea === p.subArea && activeF.province === p.province && !activeF.city) ||
                (level === 'city'          && activeF.area === p.area && activeF.country === p.country && activeF.subArea === p.subArea && activeF.province === p.province && activeF.city === p.city);

            const pop = TREE_POP[label] ?? TREE_POP[label.split(' (')[0]];
            const popStr = pop === undefined ? '' : (() => {
                const s = pop >= 1000 ? `${(pop/1000).toFixed(1)}B`
                    : pop >= 1 ? `${Math.round(pop)}M`
                    : pop >= 0.001 ? `${Math.round(pop*1000)}K`
                    : `${Math.round(pop*1000000)}`;
                return `<span style="font-size:9px;color:#aaa;margin-right:3px;white-space:nowrap;">${s}</span>`;
            })();

            return `
                <div onclick="App._onLocationTreeClick(event,'${level}','${this.escape(p.area||'')}','${this.escape(p.country||'')}','${this.escape(p.subArea||'')}','${this.escape(p.province||'')}','${this.escape(p.city||'')}')"
                     style="display:flex;align-items:center;gap:4px;padding:3px 6px 3px ${6+depth*9}px;cursor:pointer;border-bottom:1px solid #f0f0f0;
                            background:${isActive?'#e7f3ff':'transparent'};
                            font-weight:${depth<2?'600':'normal'};color:${isActive?'#0078d4':'#333'};"
                     onmouseenter="if(!${isActive})this.style.background='#f5f8ff'"
                     onmouseleave="if(!${isActive})this.style.background='transparent'">
                    ${hasChildren
                        ? `<i class="fas fa-chevron-${isExpanded?'down':'right'}" style="font-size:8px;color:#aaa;width:10px;" onclick="event.stopPropagation();App._toggleLocationNode('${key}')"></i>`
                        : `<span style="width:10px;"></span>`}
                    <i class="${icon}" style="font-size:9px;color:${isActive?'#0078d4':'#888'};"></i>
                    <span style="flex:1;font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${this.escape(label)}</span>
                    ${popStr}
                    ${badge(count||0)}
                </div>`;
        };

        const renderRecursive = (node, level, p, depth) => {
            let html = '';
            const keys = Object.keys(node.children || {});
            keys.sort((a, b) => {
                const pA = TREE_POP[a] ?? TREE_POP[a.split(' (')[0]] ?? 0;
                const pB = TREE_POP[b] ?? TREE_POP[b.split(' (')[0]] ?? 0;
                if (pA !== pB) return pB - pA;
                return a.localeCompare(b);
            });
            keys.forEach(name => {
                const child = node.children[name];
                let nextLevel = 'city', icon = 'fas fa-map-pin', keyPrefix = '';

                if (['Africa','Latin America','Eurasian Hub','West Europe'].includes(p.area)) {
                    if (level === 'area')          { nextLevel = 'africaSubArea'; icon = 'fas fa-layer-group'; keyPrefix = 'sa'; }
                    else if (level === 'africaSubArea') { nextLevel = 'country'; icon = 'fas fa-flag'; keyPrefix = 'c'; }
                    else if (level === 'country')  {
                        const lowC = (p.country||'').toLowerCase();
                        if ((p.area === 'West Europe' && ['germany','france','united kingdom','italy','spain'].includes(lowC)) ||
                            (p.area === 'Latin America' && ['brazil','mexico','argentina','colombia','peru','chile'].includes(lowC))) {
                            nextLevel = 'province'; icon = 'fas fa-map-marked-alt'; keyPrefix = 'p';
                        } else { nextLevel = 'city'; icon = 'fas fa-map-pin'; keyPrefix = 'ci'; }
                    }
                    else if (level === 'province') { nextLevel = 'city'; icon = 'fas fa-map-pin'; keyPrefix = 'ci'; }
                } else if (p.area === 'North America') {
                    if (level === 'area')     { nextLevel = 'country'; icon = 'fas fa-flag'; keyPrefix = 'c'; }
                    else if (level === 'country') {
                        const lowC = (p.country||'').toLowerCase();
                        if (['united states','usa','us'].includes(lowC)) { nextLevel = 'subArea'; icon = 'fas fa-layer-group'; keyPrefix = 'sa'; }
                        else if (lowC === 'canada') { nextLevel = 'province'; icon = 'fas fa-map-marked-alt'; keyPrefix = 'p'; }
                        else { nextLevel = 'city'; icon = 'fas fa-map-pin'; keyPrefix = 'ci'; }
                    }
                    else if (level === 'subArea')   { nextLevel = 'province'; icon = 'fas fa-map-marked-alt'; keyPrefix = 'p'; }
                    else if (level === 'province')  { nextLevel = 'city'; icon = 'fas fa-map-pin'; keyPrefix = 'ci'; }
                } else if (p.area === 'East Asia') {
                    if (level === 'area')     { nextLevel = 'country'; icon = 'fas fa-flag'; keyPrefix = 'c'; }
                    else if (level === 'country') { nextLevel = 'subArea'; icon = 'fas fa-layer-group'; keyPrefix = 'sa'; }
                    else if (level === 'subArea')  { nextLevel = 'province'; icon = 'fas fa-map-marked-alt'; keyPrefix = 'p'; }
                    else if (level === 'province') { nextLevel = 'city'; icon = 'fas fa-map-pin'; keyPrefix = 'ci'; }
                } else if (p.area === 'Indo-Pacific South') {
                    if (level === 'area')               { nextLevel = 'africaSubArea'; icon = 'fas fa-layer-group'; keyPrefix = 'sa'; }
                    else if (level === 'africaSubArea') { nextLevel = 'country'; icon = 'fas fa-flag'; keyPrefix = 'c'; }
                    else if (level === 'country') {
                        if (this._INDOPACIFIC_COUNTRY_SUBREGIONS[p.country]) { nextLevel = 'subArea'; icon = 'fas fa-layer-group'; keyPrefix = 'sa'; }
                        else { nextLevel = 'city'; icon = 'fas fa-map-pin'; keyPrefix = 'ci'; }
                    }
                    else if (level === 'subArea')   { nextLevel = 'province'; icon = 'fas fa-map-marked-alt'; keyPrefix = 'p'; }
                    else if (level === 'province')  { nextLevel = 'city'; icon = 'fas fa-map-pin'; keyPrefix = 'ci'; }
                } else {
                    if (level === 'area')     { nextLevel = 'country'; icon = 'fas fa-flag'; keyPrefix = 'c'; }
                    else if (level === 'country') { nextLevel = 'city'; icon = 'fas fa-map-pin'; keyPrefix = 'ci'; }
                }

                const nextP = { ...p };
                if (nextLevel === 'africaSubArea') nextP.subArea = name;
                else nextP[nextLevel] = name;

                const hasChildren = Object.keys(child.children||{}).length > 0;
                let key = `${keyPrefix}:${p.area}`;
                if (nextP.country)  key += `:${nextP.country}`;
                if (nextP.subArea && !['Africa','Latin America','Eurasian Hub','West Europe'].includes(p.area)) key += `:${nextP.subArea}`;
                if (nextP.province) key += `:${nextP.province}`;
                if (['Africa','Latin America','Eurasian Hub','West Europe','Indo-Pacific South'].includes(p.area) && nextLevel === 'africaSubArea') key = `sa:${p.area}:${name}`;
                if (['Africa','Latin America','Eurasian Hub','West Europe','Indo-Pacific South'].includes(p.area) && nextLevel === 'country') key = `c:${p.area}:${nextP.subArea}:${name}`;
                if (nextLevel === 'city') key += `:${name}`;

                const expanded = !!this._locationTreeExpanded[key];
                html += renderRow(name, child._count, nextLevel, nextP, depth+1, icon, expanded, hasChildren, key);
                if (hasChildren && expanded) html += renderRecursive(child, nextLevel, nextP, depth+1);
            });
            return html;
        };

        const CANONICAL_ORDER = ['Africa','East Asia','West Europe','Latin America','Eurasian Hub','North America','Indo-Pacific South'];
        let html = '';
        CANONICAL_ORDER.forEach(area => {
            const areaNode = hier[area] || { _count: 0, children: {} };
            const aKey = `a:${area}`;
            const expanded    = !!this._locationTreeExpanded[aKey];
            const hasChildren = Object.keys(areaNode.children).length > 0;
            const dimmed      = areaNode._count === 0 ? 'opacity:0.6;' : '';
            html += `<div style="${dimmed}">`;
            html += renderRow(area, areaNode._count, 'area', { area }, 0, 'fas fa-globe-americas', expanded, hasChildren, aKey);
            if (hasChildren && expanded) html += renderRecursive(areaNode, 'area', { area }, 0);
            html += '</div>';
        });

        container.innerHTML = html;

        if (window.App && App._unresolvedCoords && Object.keys(App._unresolvedCoords).length > 0 && this._geoResolutionEnabled) {
            setTimeout(() => this._resolveMissingCoordinates(), 100);
        }
    },

     // =========================================================================
    // THUMBNAIL VIEW HELPERS
    // =========================================================================

    _preseedGroups(groups, locF) {
        const ensure = (key) => { if (!groups.has(key)) groups.set(key, []); };

        // ── Art style pre-seeding ─────────────────────────────────────────────
        const artStyleF = this.state?.calendar?.videoTagsFilter?.artStyle;
        if (artStyleF && artStyleF !== 'all' && !locF.area) {
            if (artStyleF.startsWith('r:area:')) {
                // Group by tier — preseed all 3 tiers
                ['Classical', 'Illustrated', 'Modernist'].forEach(ensure);
            } else if (artStyleF.startsWith('r:tier:')) {
                // Group by style name — preseed all styles under this area+tier
                const rest = artStyleF.slice(7);             // "Area:Tier"
                const sep  = rest.lastIndexOf(':');
                const area = rest.slice(0, sep);
                const tier = rest.slice(sep + 1);
                const areaData = (this._AS_REGION_DATA || []).find(a => a.area === area);
                if (areaData) {
                    areaData.styles
                        .filter(s => s.tier === tier)
                        .forEach(s => ensure(s.name));
                }
            } else if (artStyleF.startsWith('p:group:')) {
                // Group by style name — preseed all styles in the philosophy group
                const groupName = artStyleF.slice(8);
                const grp = (this._AS_PHIL_DATA || []).find(g => g.group === groupName);
                if (grp) grp.styles.forEach(s => ensure(s.name));
            }
            return; // art style active — skip location pre-seeding
        }

        if (locF.area === 'East Asia') {
            if (!locF.country && !locF.subArea) {
                Object.keys(this._EAST_ASIA_CONFIG).forEach(c => ensure(c));
            } else if (locF.country && !locF.subArea) {
                const cfg = this._EAST_ASIA_CONFIG[locF.country === 'Korea' ? 'South Korea' : locF.country];
                if (cfg) Object.keys(cfg).forEach(sr => ensure(sr));
            } else if (locF.country && locF.subArea && !locF.province) {
                const cfg = this._EAST_ASIA_CONFIG[locF.country === 'Korea' ? 'South Korea' : locF.country];
                if (cfg && cfg[locF.subArea]) cfg[locF.subArea].forEach(p => ensure(p));
            }
        }

        if (locF.area === 'Africa' && locF.subArea && !locF.country) {
            const map = {
                'Northern Africa': ['Egypt','Algeria','Morocco','Sudan','Tunisia','Libya','Western Sahara'],
                'Western Africa':  ['Nigeria','Niger','Ghana','Senegal','Mali','Burkina Faso','Ivory Coast','Benin','Liberia','Sierra Leone','Togo','Guinea','Guinea-Bissau','Cape Verde','Gambia','Sao Tome and Principe'],
                'Middle Africa':   ['DR Congo','Congo','Cameroon','Chad','Angola','Gabon','Central African Republic','Equatorial Guinea','Sao Tome and Principe'],
                'Eastern Africa':  ['Ethiopia','Kenya','Tanzania','Uganda','Somalia','Mozambique','Rwanda','Burundi','Djibouti','Eritrea','Mauritius','Comoros','Seychelles','Madagascar'],
                'Southern Africa': ['South Africa','Zambia','Zimbabwe','Namibia','Botswana','Lesotho','Malawi','Eswatini','Mauritius'],
            };
            (map[locF.subArea] || []).forEach(c => ensure(c));
        }

        if (locF.area === 'West Europe') {
            if (!locF.subArea) {
                ['Western Europe','Northern Europe','Southern Europe'].forEach(ensure);
            } else if (!locF.country) {
                const map = {
                    'Northern Europe': ['United Kingdom','Sweden','Denmark','Finland','Norway','Ireland','Lithuania','Latvia','Estonia','Iceland'],
                    'Western Europe':  ['Germany','France','Netherlands','Belgium','Austria','Switzerland','Luxembourg','Liechtenstein','Monaco'],
                    'Southern Europe': ['Italy','Spain','Greece','Portugal','Serbia','Croatia','Bosnia and Herzegovina','Albania','Slovenia','North Macedonia','Kosovo','Cyprus','Montenegro','Malta','Andorra','San Marino','Vatican'],
                };
                const key = Object.keys(map).find(k => k.toLowerCase() === locF.subArea.toLowerCase());
                if (key) map[key].forEach(c => ensure(c));
            } else if (!locF.province) {
                const lowC = (locF.country||'').toLowerCase();
                const BIG = {
                    'germany': ['North Rhine-Westphalia','Bavaria','Baden-Württemberg','Lower Saxony','Hesse','Saxony','Rhineland-Palatinate','Berlin','Schleswig-Holstein','Brandenburg','Saxony-Anhalt','Thuringia','Hamburg','Mecklenburg-Vorpommern','Saarland','Bremen'],
                    'france':  ["Île-de-France",'Auvergne-Rhône-Alpes','Hauts-de-France','Nouvelle-Aquitaine','Occitanie','Grand Est',"Provence-Alpes-Côte d'Azur",'Pays de la Loire','Normandy','Brittany','Bourgogne-Franche-Comté','Centre-Val de Loire','Corsica'],
                    'united kingdom': ['England','Scotland','Wales','Northern Ireland'],
                    'italy':   ['Lombardy','Lazio','Campania','Sicily','Veneto','Emilia-Romagna','Piedmont','Apulia','Tuscany','Calabria','Sardinia','Liguria','Marche','Abruzzo','Friuli Venezia Giulia','Trentino-Alto Adige','Umbria','Basilicata','Molise','Aosta Valley'],
                    'spain':   ['Andalusia','Catalonia','Madrid','Valencian Community','Galicia','Castile and León','Basque Country','Canary Islands','Castilla-La Mancha','Murcia','Aragon','Balearic Islands','Extremadura','Asturias','Navarre','Cantabria','La Rioja'],
                };
                if (BIG[lowC]) BIG[lowC].forEach(p => ensure(p));
            }
        }

        if (locF.area === 'Latin America') {
            if (!locF.subArea) {
                ['South America','Central America & Mexico','Caribbean'].forEach(ensure);
            } else if (!locF.country) {
                const map = {
                    'Central America & Mexico': ['Mexico','Guatemala','Honduras','El Salvador','Nicaragua','Costa Rica','Panama','Belize'],
                    'Caribbean':                ['Cuba','Dominican Republic','Haiti','Jamaica','Puerto Rico','Trinidad and Tobago'],
                    'South America':            ['Brazil','Colombia','Argentina','Peru','Venezuela','Chile','Ecuador','Bolivia','Paraguay','Uruguay','Guyana','Suriname'],
                };
                const key = Object.keys(map).find(k => k.toLowerCase() === locF.subArea.toLowerCase());
                if (key) map[key].forEach(c => ensure(c));
            }
        }

        if (locF.area === 'North America') {
            if (!locF.country) {
                ['Canada','United States','Greenland'].forEach(ensure);
            } else {
                const lowC = (locF.country||'').toLowerCase();
                if (['united states','usa'].includes(lowC)) {
                    if (!locF.subArea) {
                        ['Northeast (东北部)','Midwest (中西部)','South (南部)','West (西部)'].forEach(ensure);
                    } else if (!locF.province) {
                        const map = {
                            'Northeast (东北部)': ['Connecticut','Maine','Massachusetts','New Hampshire','Rhode Island','Vermont','New Jersey','New York','Pennsylvania','District of Columbia'],
                            'Midwest (中西部)':   ['Illinois','Indiana','Michigan','Ohio','Wisconsin','Iowa','Kansas','Minnesota','Missouri','Nebraska','North Dakota','South Dakota'],
                            'South (南部)':       ['Delaware','Florida','Georgia','Maryland','North Carolina','South Carolina','Virginia','West Virginia','Alabama','Kentucky','Mississippi','Tennessee','Arkansas','Louisiana','Oklahoma','Texas'],
                            'West (西部)':        ['Arizona','Colorado','Idaho','Montana','Nevada','New Mexico','Utah','Wyoming','Alaska','California','Hawaii','Oregon','Washington'],
                        };
                        const key = Object.keys(map).find(k => k.toLowerCase() === locF.subArea.toLowerCase());
                        if (key) map[key].forEach(s => ensure(s));
                    }
                } else if (lowC === 'canada' && !locF.province) {
                    ['Ontario','Quebec','British Columbia','Alberta','Manitoba','Saskatchewan','Nova Scotia','New Brunswick','Newfoundland and Labrador','Prince Edward Island','Northwest Territories','Nunavut','Yukon'].forEach(ensure);
                }
            }
        }

        if (locF.area === 'Eurasian Hub') {
            if (!locF.subArea) {
                ['Eurasian Hub (West Asia)','Eastern Europe','Central Asia'].forEach(ensure);
            } else if (!locF.country) {
                const map = {
                    'Eastern Europe':            ['Belarus','Bulgaria','Czech Republic','Hungary','Moldova','Poland','Romania','Russia','Slovakia','Ukraine'],
                    'Central Asia':              ['Kazakhstan','Kyrgyzstan','Tajikistan','Turkmenistan','Uzbekistan'],
                    'Eurasian Hub (West Asia)':  ['Afghanistan','Armenia','Azerbaijan','Bahrain','Georgia','Iran','Iraq','Israel','Jordan','Kuwait','Lebanon','Oman','Pakistan','Palestine','Qatar','Saudi Arabia','Syria','Turkey','UAE','Yemen'],
                };
                const key = Object.keys(map).find(k => k.toLowerCase() === locF.subArea.toLowerCase());
                if (key) map[key].forEach(c => ensure(c));
            }
        }

        if (locF.area === 'Indo-Pacific South') {
            if (!locF.subArea) {
                Object.keys(this._INDOPACIFIC_SUBAREA_COUNTRIES).forEach(ensure);
            } else if (!locF.country) {
                (this._INDOPACIFIC_SUBAREA_COUNTRIES[locF.subArea] || []).forEach(c => ensure(c));
            } else if (!locF.province && this._INDOPACIFIC_COUNTRY_SUBREGIONS[locF.country]) {
                Object.keys(this._INDOPACIFIC_COUNTRY_SUBREGIONS[locF.country]).forEach(ensure);
            } else if (locF.province && this._INDOPACIFIC_COUNTRY_SUBREGIONS[locF.country]) {
                (this._INDOPACIFIC_COUNTRY_SUBREGIONS[locF.country][locF.province] || []).forEach(ensure);
            }
        }
    },

    _getSectionIcons() {
        return {
            'Northern Africa':'fas fa-sun','Western Africa':'fas fa-water','Middle Africa':'fas fa-tree',
            'Eastern Africa':'fas fa-mountain','Southern Africa':'fas fa-star',
            'Western Europe':'fas fa-landmark','Northern Europe':'fas fa-snowflake','Southern Europe':'fas fa-sun',
            'South America':'fas fa-mountain','Central America & Mexico':'fas fa-sun','Caribbean':'fas fa-umbrella-beach',
            'Canada':'fas fa-leaf','United States':'fas fa-flag','Greenland':'fas fa-snowflake',
            'Northeast China (Dongbei)':'fas fa-snowflake','North China (Huabei)':'fas fa-city',
            'East China (Huadong)':'fas fa-water','Central China (Huazhong)':'fas fa-mountain',
            'South China (Huanan)':'fas fa-umbrella-beach','Southwest China (Xinan)':'fas fa-tree','Northwest China (Xibei)':'fas fa-wind',
            'South Asia':'fas fa-om','Southeast Asia (Mainland)':'fas fa-tree','Southeast Asia (Maritime)':'fas fa-water','Oceania':'fas fa-umbrella-beach',
            'North India (北印度)':'fas fa-mountain','East India (东印度)':'fas fa-water',
            'Northeast India (东北印度)':'fas fa-tree','Central India (中印度)':'fas fa-sun',
            'West India (西印度)':'fas fa-water','South India (南印度)':'fas fa-umbrella-beach',
            'Island Territories (岛屿领地)':'fas fa-island-tropical',
            'Java (爪哇)':'fas fa-city','Sumatra (苏门答腊)':'fas fa-tree',
            'Bali & Nusa Tenggara (巴厘岛及努沙登加拉)':'fas fa-umbrella-beach',
            'Kalimantan (加里曼丹)':'fas fa-tree','Sulawesi (苏拉威西)':'fas fa-mountain',
            'Maluku & Papua (马鲁古及巴布亚)':'fas fa-leaf',
            'Eastern Australia (澳大利亚东部)':'fas fa-city','Southern Australia (澳大利亚南部)':'fas fa-wind',
            'Western Australia (澳大利亚西部)':'fas fa-sun','Central & Northern Australia (澳大利亚中北部)':'fas fa-fire',
            'Luzon (吕宋岛)':'fas fa-mountain','Visayas (米沙鄢)':'fas fa-water','Mindanao (棉兰老岛)':'fas fa-tree',
            'North Vietnam (越南北部)':'fas fa-mountain','Central Vietnam (越南中部)':'fas fa-water','South Vietnam (越南南部)':'fas fa-city',
            'Central Thailand (泰国中部)':'fas fa-city','Northern Thailand (泰国北部)':'fas fa-mountain',
            'Northeastern Thailand (泰国东北部)':'fas fa-sun','Eastern Thailand (泰国东部)':'fas fa-water','Southern Thailand (泰国南部)':'fas fa-umbrella-beach',
            'Upper Myanmar (缅甸上部)':'fas fa-mountain','Lower Myanmar (缅甸下部)':'fas fa-water',
            'Eastern Myanmar (缅甸东部)':'fas fa-tree','Rakhine (若开邦)':'fas fa-water',
            'Peninsular Malaysia (马来半岛)':'fas fa-city','East Malaysia - Sabah (沙巴)':'fas fa-mountain','East Malaysia - Sarawak (砂拉越)':'fas fa-tree',

            // Pop Culture & Media styles
            'Studio Ghibli watercolor illustration style':  'fas fa-torii-gate',
            'Pixar 3D cinematic render style':              'fas fa-cube',
            'Synthwave retro 80s neon poster style':        'fas fa-record-vinyl',
            'Ukiyo-e Japanese woodblock print style':       'fas fa-torii-gate',
            'Marvel Comics bold ink and color style':       'fas fa-bolt',
            'LEGO brick diorama style':                     'fas fa-th',
            'Impressionist oil painting style (Monet)':     'fas fa-water',
            'GTA V loading screen poster style':            'fas fa-car',
            'Cyberpunk 2077 concept art style':             'fas fa-robot',
            'Disney golden-age hand-drawn animation style': 'fas fa-magic',

            // Group-level icon
            'Pop Culture & Media': 'fas fa-film',
        };
    },

    _getSectionPopTable() {
        return {
            'guangdong':126,'shandong':101,'henan':98,'jiangsu':85,'sichuan':83,'hebei':74,'hunan':66,'zhejiang':65,'anhui':61,'hubei':58,'guangxi':50,'yunnan':47,'jiangxi':45,'liaoning':42,'fujian':41,'shaanxi':39,'guizhou':38,'shanxi':34,'chongqing':32,'heilongjiang':31,'xinjiang':25,'gansu':24,'shanghai':24,'inner mongolia':24,'taiwan':23,'jilin':23,'beijing':21,'tianjin':13,'hainan':10,'hong kong':7,'ningxia':7,'qinghai':5,'tibet':3,'macau':0.6,
            'north china (huabei)':170,'northeast china (dongbei)':96,'east china (huadong)':420,'central china (huazhong)':222,'south china (huanan)':180,'southwest china (xinan)':203,'northwest china (xibei)':100,
            'china':1400,'japan':125,'south korea':52,'north korea':26,'russia (asia)':33,'mongolia':3.4,
            'nigeria':223,'ethiopia':126,'egypt':113,'dr congo':102,'tanzania':67,'south africa':60,'kenya':55,'sudan':48,'uganda':48,'algeria':45,'morocco':38,'angola':36,'mozambique':34,'ghana':34,'madagascar':30,'cameroon':28,'ivory coast':28,'niger':27,'burkina faso':23,'mali':23,'malawi':21,'zambia':20,'senegal':18,'chad':18,'somalia':18,'zimbabwe':16,'guinea':14,'rwanda':14,'benin':13,'burundi':13,'tunisia':12,'togo':9,'sierra leone':8,'libya':7,'congo':6,'liberia':5,'central african republic':5,'mauritania':4.8,'eritrea':3.7,'namibia':2.6,'gambia':2.5,'botswana':2.4,'gabon':2.4,'lesotho':2.3,'guinea-bissau':2.1,'equatorial guinea':1.7,'mauritius':1.2,'eswatini':1.2,'djibouti':1.1,'comoros':0.8,'cape verde':0.5,'western sahara':0.5,'sao tome and principe':0.2,'seychelles':0.1,
            'eastern africa':450,'western africa':400,'northern africa':250,'middle africa':200,'southern africa':70,
            'germany':84,'france':68,'united kingdom':67,'uk':67,'italy':59,'spain':48,'netherlands':18,'belgium':12,'sweden':10.5,'greece':10.4,'portugal':10.3,'austria':9.1,'switzerland':8.8,'serbia':6.6,'denmark':5.9,'finland':5.6,'norway':5.5,'ireland':5.1,'croatia':3.8,'bosnia and herzegovina':3.2,'albania':2.8,'lithuania':2.8,'slovenia':2.1,'north macedonia':2.1,'latvia':1.8,'kosovo':1.8,'estonia':1.3,'cyprus':1.2,'montenegro':0.6,'luxembourg':0.6,'malta':0.5,'iceland':0.4,'andorra':0.08,'liechtenstein':0.04,'san marino':0.03,'monaco':0.03,'vatican':0.001,
            'western europe':197,'southern europe':152,'northern europe':105,
            'canada':38,'united states':335,'greenland':0.057,
            'ontario':14.2,'quebec':8.5,'british columbia':5.2,'alberta':4.4,'manitoba':1.4,'saskatchewan':1.2,'nova scotia':1.0,'new brunswick':0.8,'newfoundland and labrador':0.5,'prince edward island':0.17,'northwest territories':0.045,'nunavut':0.04,'yukon':0.04,
            'california':39,'texas':30,'florida':22.6,'new york':19.8,'pennsylvania':13,'illinois':12.6,'ohio':11.8,'georgia':10.9,'north carolina':10.6,'michigan':10,'new jersey':9.3,'virginia':8.7,'washington':7.7,'arizona':7.4,'massachusetts':7,'tennessee':7,'indiana':6.8,'missouri':6.2,'maryland':6.2,'wisconsin':5.9,'colorado':5.8,'minnesota':5.7,'south carolina':5.3,'alabama':5.1,'louisiana':4.6,'kentucky':4.5,'oregon':4.3,'oklahoma':4,'connecticut':3.6,'utah':3.4,'iowa':3.2,'nevada':3.2,'arkansas':3,'mississippi':3,'kansas':2.9,'new mexico':2.1,'nebraska':2,'idaho':1.9,'west virginia':1.8,'hawaii':1.4,'new hampshire':1.4,'maine':1.4,'montana':1.1,'rhode island':1.1,'delaware':1,'south dakota':0.9,'north dakota':0.8,'alaska':0.7,'district of columbia':0.7,'vermont':0.6,'wyoming':0.6,
            'northeast (东北部)':57,'midwest (中西部)':69,'south (南部)':130,'west (西部)':80,
            'south america':430,'central america & mexico':180,'caribbean':44,
            'brazil':215,'mexico':128,'colombia':52,'argentina':46,'peru':34,'venezuela':28,'chile':19,'ecuador':18,'guatemala':17,'bolivia':12,'haiti':11,'cuba':11,'dominican republic':11,'honduras':10,'paraguay':7,'nicaragua':7,'el salvador':6,'costa rica':5,'panama':4,'uruguay':3.4,'puerto rico':3.2,'jamaica':2.8,'trinidad and tobago':1.5,'guyana':0.8,'suriname':0.6,'belize':0.4,
            'eurasian hub (west asia)':410,'eastern europe':290,'central asia':75,
            'russia':144,'turkey':85,'iran':88,'iraq':42,'saudi arabia':36,'uzbekistan':36,'afghanistan':41,'pakistan':231,'ukraine':43,'poland':38,'romania':19,'kazakhstan':19,'syria':22,'yemen':34,'azerbaijan':10,'tajikistan':10,'hungary':9.7,'belarus':9.4,'israel':9.3,'bulgaria':6.5,'czech republic':10.9,'jordan':10.2,'georgia':3.7,'slovakia':5.5,'moldova':2.6,'armenia':3.0,'kuwait':4.3,'uae':9.9,'qatar':2.9,'bahrain':1.5,'oman':4.5,'lebanon':5.5,'palestine':5.4,
            'south asia':1950,'southeast asia (mainland)':250,'southeast asia (maritime)':420,'oceania':45,'other indo-pacific':0,
            'india':1440,'bangladesh':172,'nepal':30,'sri lanka':22,'bhutan':0.8,'maldives':0.5,'myanmar':55,
            'vietnam':98,'thailand':72,'cambodia':17,'laos':7.5,
            'indonesia':280,'philippines':115,'malaysia':33,'singapore':5.9,'brunei':0.5,'timor-leste':1.4,
            'australia':26,'new zealand':5,'papua new guinea':10,'fiji':0.9,'solomon islands':0.7,'vanuatu':0.3,'samoa':0.2,'tonga':0.1,
            'north india (北印度)':450,'east india (东印度)':230,'northeast india (东北印度)':46,'central india (中印度)':90,'west india (西印度)':180,'south india (南印度)':280,'island territories (岛屿领地)':0.4,
            'java (爪哇)':156,'sumatra (苏门答腊)':60,'sulawesi (苏拉威西)':19,'kalimantan (加里曼丹)':16,'bali & nusa tenggara (巴厘岛及努沙登加拉)':13,'maluku & papua (马鲁古及巴布亚)':5,
            'luzon (吕宋岛)':60,'mindanao (棉兰老岛)':26,'visayas (米沙鄢)':22,
            'north vietnam (越南北部)':33,'south vietnam (越南南部)':35,'central vietnam (越南中部)':20,
            'central thailand (泰国中部)':22,'northeastern thailand (泰国东北部)':22,'southern thailand (泰国南部)':9,'northern thailand (泰国北部)':11,'eastern thailand (泰国东部)':5,
            'lower myanmar (缅甸下部)':21,'upper myanmar (缅甸上部)':20,'eastern myanmar (缅甸东部)':10,'rakhine (若开邦)':3.5,
            'peninsular malaysia (马来半岛)':26,'east malaysia - sabah (沙巴)':3.9,'east malaysia - sarawak (砂拉越)':2.8,
            'eastern australia (澳大利亚东部)':18,'western australia (澳大利亚西部)':2.9,'southern australia (澳大利亚南部)':2.5,'central & northern australia (澳大利亚中北部)':0.6,
            'kanto (关东地方)':43,'kansai/kinki (关西/近畿)':22,'chubu (中部地方)':21,'kyushu/okinawa (九州/冲绳)':14,'tohoku (东北地方)':8.6,'hokkaido (北海道)':5.2,
            'sudogwon (首都圈)':26,'yeongnam region (岭南地方)':12.8,'hoseo region (湖西地方)':5.5,'honam region (湖南地方)':5.1,
            'northern taiwan (台湾北部)':10.7,'southern taiwan (台湾南部)':6.3,'central taiwan (台湾中部)':5.8,
            'ulaanbaatar region (乌兰巴托地区)':1.7,'central mongolia (蒙古中部)':0.5,'northern mongolia (蒙古北部)':0.4,'western mongolia (蒙古西部)':0.4,'eastern mongolia (蒙古东部)':0.2,'gobi region (戈壁地区)':0.2,
        };
    },


    // =========================================================================
    // LOCATION TREE INTERACTION
    // =========================================================================

    _onLocationTreeClick(event, level, area, country, subArea, province, city) {
        event.stopPropagation();
        const f    = this._locationFilter;
        const aKey = `a:${area}`;

        if (level === 'area') {
            this._locationTreeExpanded[aKey] = true;
            if (f.area === area && !f.country && !f.subArea && !f.province && !f.city)
                this._locationFilter = { area: null, country: null, subArea: null, province: null, city: null };
            else
                this._locationFilter = { area, country: null, subArea: null, province: null, city: null };

        } else if (level === 'africaSubArea') {
            const saKey = `sa:${area}:${subArea}`;
            if (f.area === area && f.subArea === subArea && !f.country)
                this._locationFilter = { area, country: null, subArea: null, province: null, city: null };
            else {
                this._locationFilter = { area, country: null, subArea, province: null, city: null };
                this._locationTreeExpanded[saKey] = true;
            }

        } else if (level === 'country') {
            const hasSA = ['Africa','Latin America','Eurasian Hub','West Europe','Indo-Pacific South'].includes(area);
            const tempSubArea = hasSA ? subArea : null;
            const cKey = hasSA ? `c:${area}:${subArea}:${country}` : `c:${area}:${country}`;
            if (f.area === area && f.country === country && f.subArea === tempSubArea && !f.province && !f.city)
                this._locationFilter = { area, country: null, subArea: null, province: null, city: null };
            else {
                this._locationFilter = { area, country, subArea: tempSubArea, province: null, city: null };
                this._locationTreeExpanded[cKey] = true;
            }

        } else if (level === 'subArea') {
            const saKey = `sa:${area}:${country}:${subArea}`;
            if (f.area === area && f.country === country && f.subArea === subArea && !f.province)
                this._locationFilter = { area, country, subArea: null, province: null, city: null };
            else {
                this._locationFilter = { area, country, subArea, province: null, city: null };
                this._locationTreeExpanded[saKey] = true;
            }

        } else if (level === 'province') {
            const pKey = `p:${area}:${country}:${subArea}:${province}`;
            if (f.area === area && f.country === country && f.subArea === subArea && f.province === province && !f.city)
                this._locationFilter = { area, country, subArea, province: null, city: null };
            else {
                this._locationFilter = { area, country, subArea, province, city: null };
                this._locationTreeExpanded[pKey] = true;
            }

        } else if (level === 'city') {
            if (f.area === area && f.country === country && f.subArea === subArea && f.province === province && f.city === city)
                this._locationFilter = { area, country, subArea, province, city: null };
            else
                this._locationFilter = { area, country, subArea, province, city };
        }

        const areaEl = document.getElementById('calendar-tag-area');
        if (areaEl) areaEl.value = this._locationFilter.area || 'all';

        this._syncLocationFilterToHash();
        this.renderLocationTree();
        this.applyTagFilters();
        this.renderCalendar();
    },

    _toggleLocationNode(key) {
        this._locationTreeExpanded[key] = !this._locationTreeExpanded[key];
        this.renderLocationTree();
    },

    _syncLocationFilterToHash() {
        const f = this._locationFilter;
        if (!f.area) {
            if (window.location.hash !== '#calendar')
                window.history.pushState(null, null, '#calendar');
            return;
        }
        const deepest = [f.city, f.province, f.country, f.subArea, f.area].find(v => v != null);
        const slug = deepest
            .toLowerCase()
            .replace(/\s*\(.*?\)/g, '')
            .trim()
            .replace(/\s+/g, '-');
        window.history.pushState(null, null, `#${slug}`);
    },

    toggleAllLocationAreas() {
        const CANONICAL_AREAS = ['Africa','East Asia','West Europe','Latin America','Eurasian Hub','North America','Indo-Pacific South'];
        const btn = document.getElementById('loc-tree-toggle-all-btn');
        const anyCollapsed = CANONICAL_AREAS.some(a => !this._locationTreeExpanded[`a:${a}`]);
        if (anyCollapsed) {
            CANONICAL_AREAS.forEach(a => { this._locationTreeExpanded[`a:${a}`] = true; });
            if (btn) { btn.textContent = '− ALL'; btn.title = 'Collapse all areas'; }
        } else {
            CANONICAL_AREAS.forEach(a => { this._locationTreeExpanded[`a:${a}`] = false; });
            if (btn) { btn.textContent = '+ ALL'; btn.title = 'Expand all areas'; }
        }
        this.renderLocationTree();
    },

    // =========================================================================
    // ASYNC COORDINATE RESOLUTION
    // =========================================================================

    async _resolveMissingCoordinates() {
        if (!window.App || !App._unresolvedCoords) return;
        const keys = Object.keys(App._unresolvedCoords);
        if (keys.length === 0) return;

        let cache = {};
        try { cache = JSON.parse(localStorage.getItem('geoCoordCache') || '{}'); } catch(e) {}

        let madeChanges = false;
        for (const k of keys) {
            if (cache[k]) continue;
            const { lat, lng } = App._unresolvedCoords[k];
            try {
                console.log(`Auto-learning new coordinates: ${lat}, ${lng}...`);
                const res = await fetch(`/api/locations/search?q=${lat},${lng}`, {
                    headers: { 'X-Geo-Intent': 'map' }
                });
                if (res.ok) {
                    const contentType = res.headers.get("content-type");
                    if (contentType && contentType.indexOf("application/json") !== -1) {
                        const data = await res.json();
                        if (data.results?.length > 0) {
                            const best = data.results[0];
                            if (best.country && this._countryToArea(best.country)) {
                                cache[k] = best.country;
                                madeChanges = true;
                                console.log(`Auto-learned ${k} -> ${best.country}!`);
                            } else { cache[k] = 'NOT_FOUND'; }
                        } else { cache[k] = 'NOT_FOUND'; }
                    } else {
                        cache[k] = 'NOT_FOUND';
                    }
                } else { cache[k] = 'NOT_FOUND'; }
            } catch(e) {
                console.error('Failed to auto-resolve coords:', e);
                break;
            }
        }

        localStorage.setItem('geoCoordCache', JSON.stringify(cache));
        App._unresolvedCoords = {};
        if (madeChanges) this.renderLocationTree();
    },

    // =========================================================================
    // SLUG ↔ LOCATION FILTER CONVERSION (used by router)
    // =========================================================================

    _slugToLocationFilter(slug) {
        if (!slug) return { area: null, subArea: null, country: null, province: null, city: null };
        const empty = { area: null, subArea: null, country: null, province: null, city: null };
        const readable = slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        const directArea = this._countryToArea(readable);
        if (directArea) {
            if (readable === 'United States' || readable === 'Usa')
                return { ...empty, area: 'North America', country: 'United States' };
            return { ...empty, area: directArea, country: readable };
        }
        const areaToHash = {
            'africa':'Africa','asia':'East Asia','europe':'West Europe',
            'americas':'Latin America','middleeast':'Eurasian Hub','eurasian-hub':'Eurasian Hub',
            'northamerica':'North America','seasia':'Indo-Pacific South',
        };
        if (areaToHash[slug]) return { ...empty, area: areaToHash[slug] };

        const hier = this._buildLocationHierarchy();
        const toSlug = (str) => str.toLowerCase().replace(/\s*\(.*?\)/g,'').trim().replace(/\s+/g,'-');

        const search = (node, path) => {
            for (const [name, child] of Object.entries(node.children || {})) {
                if (toSlug(name) === slug) return { ...path, name };
                const found = search(child, { ...path, name });
                if (found) return found;
            }
            return null;
        };

        for (const [area, areaNode] of Object.entries(hier)) {
            if (toSlug(area) === slug) return { ...empty, area };
            const found = search(areaNode, { area });
            if (!found) continue;

            const buildFilter = (node, target, path, depth) => {
                for (const [name, child] of Object.entries(node.children || {})) {
                    if (name === target) {
                        if (['Africa','Eurasian Hub'].includes(path.area)) {
                            if (depth === 0) return { ...empty, area: path.area, subArea: name };
                            if (depth === 1) return { ...empty, area: path.area, subArea: path.subArea, country: name };
                            return { ...empty, area: path.area, subArea: path.subArea, country: path.country, city: name };
                        } else if (['West Europe','Latin America'].includes(path.area)) {
                            if (depth === 0) return { ...empty, area: path.area, subArea: name };
                            if (depth === 1) return { ...empty, area: path.area, subArea: path.subArea, country: name };
                            if (depth === 2) {
                                const lowC = (path.country||'').toLowerCase();
                                if ((path.area === 'West Europe' && ['germany','france','united kingdom','italy','spain'].includes(lowC)) ||
                                    (path.area === 'Latin America' && ['brazil','mexico','argentina','colombia','peru','chile'].includes(lowC)))
                                    return { ...empty, area: path.area, subArea: path.subArea, country: path.country, province: name };
                                return { ...empty, area: path.area, subArea: path.subArea, country: path.country, city: name };
                            }
                            return { ...empty, area: path.area, subArea: path.subArea, country: path.country, province: path.province, city: name };
                        } else if (path.area === 'East Asia') {
                            if (depth === 0) return { ...empty, area: path.area, country: name };
                            if (depth === 1) return { ...empty, area: path.area, country: path.country, subArea: name };
                            if (depth === 2) return { ...empty, area: path.area, country: path.country, subArea: path.subArea, province: name };
                            return { ...empty, area: path.area, country: path.country, subArea: path.subArea, province: path.province, city: name };
                        } else if (path.area === 'North America') {
                            if (depth === 0) return { ...empty, area: path.area, country: name };
                            if (depth === 1) {
                                const lowC = (path.country||'').toLowerCase();
                                if (lowC === 'canada') return { ...empty, area: path.area, country: path.country, province: name };
                                if (['united states','usa','us'].includes(lowC)) return { ...empty, area: path.area, country: path.country, subArea: name };
                            }
                            if (depth === 2) {
                                const lowC = (path.country||'').toLowerCase();
                                if (lowC === 'canada') return { ...empty, area: path.area, country: path.country, province: path.province, city: name };
                                if (['united states','usa','us'].includes(lowC)) return { ...empty, area: path.area, country: path.country, subArea: path.subArea, province: name };
                            }
                            if (depth === 3) {
                                const lowC = (path.country||'').toLowerCase();
                                if (['united states','usa','us'].includes(lowC)) return { ...empty, area: path.area, country: path.country, subArea: path.subArea, province: path.province, city: name };
                            }
                            return { ...empty, area: path.area, country: path.country, province: path.province, city: name };
                        } else {
                            if (depth === 0) return { ...empty, area: path.area, country: name };
                            return { ...empty, area: path.area, country: path.country, city: name };
                        }
                    }
                    const next = {
                        ...path,
                        ...(depth === 0 && ['Africa','Latin America','West Europe','Eurasian Hub'].includes(path.area) ? { subArea: name } : {}),
                        ...(depth === 0 && path.area === 'East Asia' ? { country: name } : {}),
                        ...(depth === 0 && !['Africa','Latin America','West Europe','Eurasian Hub','East Asia'].includes(path.area) ? { country: name } : {}),
                        ...(depth === 1 && ['Africa','Latin America','West Europe','Eurasian Hub'].includes(path.area) ? { country: name } : {}),
                        ...(depth === 1 && path.area === 'East Asia' ? { subArea: name } : {}),
                        ...(depth === 1 && path.area === 'North America' && ['canada'].includes((path.country||'').toLowerCase()) ? { province: name } : {}),
                        ...(depth === 1 && path.area === 'North America' && ['united states','usa','us'].includes((path.country||'').toLowerCase()) ? { subArea: name } : {}),
                        ...(depth === 2 && path.area === 'North America' && ['united states','usa','us'].includes((path.country||'').toLowerCase()) ? { province: name } : {}),
                        ...(depth === 2 && path.area === 'East Asia' ? { province: name } : {}),
                        ...(depth === 2 && path.area === 'West Europe' ? { province: name } : {}),
                    };
                    const result = buildFilter(child, target, next, depth+1);
                    if (result) return result;
                }
                return null;
            };

            const result = buildFilter(areaNode, found.name, { area }, 0);
            if (result) return result;
        }

        const areaFromCountry = this._countryToArea(readable);
        if (areaFromCountry) return { ...empty, area: areaFromCountry, country: readable };
        return empty;
    },

};

// ── Auto-mixin into App when the file is loaded ────────────────────────────────
if (typeof App !== 'undefined') {
    Object.assign(App, CalendarLocationFilter);
}

// Purge stale NOT_FOUND entries from the geo cache so they don't block
// bounding-box results on future loads.
try {
    const cache = JSON.parse(localStorage.getItem('geoCoordCache') || '{}');
    let purged = false;
    for (const k of Object.keys(cache)) {
        if (cache[k] === 'NOT_FOUND') { delete cache[k]; purged = true; }
    }
    if (purged) localStorage.setItem('geoCoordCache', JSON.stringify(cache));
} catch(e) {}