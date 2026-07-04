/**
 * location-utils.js
 * Logic for resolving location strings to coordinates and vice versa.
 * Extracted from app.js and location-coords.js.
 */

export const LOCATION_COORDS = {
    // Africa
    'nairobi, africa': [-1.2921, 36.8219],
    'cairo, africa': [30.0444, 31.2357],
    'lagos, africa': [6.5244, 3.3792],
    'africa': [0, 20],
    // Eurasian Hub
    'abu dhabi, eurasian hub': [24.4539, 54.3773],
    'dubai, eurasian hub': [25.2048, 55.2708],
    'riyadh, eurasian hub': [24.6877, 46.7219],
    'eurasian hub': [25.0, 45.0],
    'middle east': [25.0, 45.0],
    // SE Asia
    'bangkok, se asia': [13.7563, 100.5018],
    'singapore, se asia': [1.3521, 103.8198],
    'ho chi minh, se asia': [10.8231, 106.6297],
    'jakarta, se asia': [-6.2088, 106.8456],
    'se asia': [10.0, 105.0],
    // North America
    'los angeles, north america': [34.0522, -118.2437],
    'new york, north america': [40.7128, -74.0060],
    'chicago, north america': [41.8781, -87.6298],
    'toronto, north america': [43.7001, -79.4163],
    'north america': [40.0, -100.0],
    // South America
    'sao paulo, south america': [-23.5505, -46.6333],
    'buenos aires, south america': [-34.6037, -58.3816],
    'south america': [-15.0, -60.0],
    'latin america': [-15.0, -60.0],
    // West Europe
    'london, europe': [51.5074, -0.1278],
    'london, west europe': [51.5074, -0.1278],
    'paris, europe': [48.8566, 2.3522],
    'paris, west europe': [48.8566, 2.3522],
    'berlin, europe': [52.5200, 13.4050],
    'berlin, west europe': [52.5200, 13.4050],
    'rome, europe': [41.9028, 12.4964],
    'rome, west europe': [41.9028, 12.4964],
    'madrid, europe': [40.4168, -3.7038],
    'madrid, west europe': [40.4168, -3.7038],
    'zermatt, europe': [46.0207, 7.7491],
    'zermatt, west europe': [46.0207, 7.7491],
    'europe': [52.0, 12.0],
    'west europe': [52.0, 12.0],
    // Asia
    'tokyo, asia': [35.6762, 139.6503],
    'beijing, asia': [39.9042, 116.4074],
    'shanghai, asia': [31.2304, 121.4737],
    'shenzhen, east asia': [22.5431, 114.0579],
    'seoul, asia': [37.5665, 126.9780],
    'mumbai, asia': [19.0760, 72.8777],
    'delhi, asia': [28.7041, 77.1025],
    'asia': [30.0, 100.0],
    // Oceania
    'sydney, oceania': [-33.8688, 151.2093],
    'melbourne, oceania': [-37.8136, 144.9631],
    'oceania': [-25.0, 140.0],
    // Mesopotamia
    'mesopotamia': [33.0, 44.0],
    'baghdad, mesopotamia': [33.3152, 44.3661],
    // Additional Cities
    'istanbul, turkey': [41.0082, 28.9784],
    'são paulo, brazil': [-23.5505, -46.6333],
    'san francisco, usa': [37.7749, -122.4194],
    'rio de janeiro, brazil': [-22.9068, -43.1729],
    'kinshasa, dr congo': [-4.4419, 15.2663],
    'kyiv, ukraine': [50.4501, 30.5234],
    'kuala lumpur, malaysia': [3.1390, 101.6869],
    'seattle, usa': [47.6062, -122.3321],
    'addis ababa, ethiopia': [9.0320, 38.7483],
    'doha, qatar': [25.2854, 51.5310],
    'vancouver, canada': [49.2827, -123.1207],
    'santiago, chile': [-33.4489, -70.6693],
    'taipei, taiwan': [25.0330, 121.5654],
    'manila, philippines': [14.5995, 120.9842],
    'athens, greece': [37.9838, 23.7275],
    'palo alto, usa': [37.4419, -122.1430],
    'redmond, usa': [47.6740, -122.1215],
    'kigali, rwanda': [-1.9441, 30.0619],
    'austin, usa': [30.2672, -97.7431],
    'lima, peru': [-12.0464, -77.0428],
    'arequipa, peru': [-16.4090, -71.5375],
    'hanoi, vietnam': [21.0285, 105.8542],
    'boston, usa': [42.3601, -71.0589],
    'nara, japan': [34.6851, 135.8048],
    'nagoya, japan': [35.1815, 136.9066],
    'cape town, south africa': [-33.9249, 18.4241],
    'mexico city, mexico': [19.4326, -99.1332],
    'ulaanbaatar, mongolia': [47.8864, 106.9057],
    'bogota, colombia': [4.7110, -74.0721],
    'kyoto, japan': [35.0116, 135.7681],
    'ottawa, canada': [45.4215, -75.6972],
    'manaus, brazil': [-3.1190, -60.0217],
    'amsterdam, netherlands': [52.3676, 4.9041],
    'busan, south korea': [35.1796, 129.0756],
    'consortium': [37.9384, 23.7602],
    'exploration': [35.6792, 139.5583],
    'agency': [40.9950, -92.3068],
    'standards': [54.5989, -2.2188],
    'renewable': [53.8415, 8.7541],
    'summit': [41.1458, -81.5334],
    'interaction': [53.2733, -6.2088],
    'consensus': [41.0132, 28.9673],
    '12468 232 st, maple ridge, bc v2x 1r6, canada': [49.2289, -122.5789],
    'tallinn, estonia': [59.4372, 24.7573],
    'new orleans, usa': [29.9561, -90.0734],
    'memphis, usa': [35.1460, -90.0518],
    'orlando, usa': [28.5421, -81.3790],
    'myra, turkey': [36.2446, 29.9876],
    'aarhus, denmark': [56.1496, 10.2134],
    'stockholm, sweden': [59.3251, 18.0711],
    'argonne, illinois, usa': [39.7726, -89.7018],
    'kitty hawk, usa': [36.0664, -75.6935],
    'basel, switzerland': [47.5581, 7.5878],
    'cape canaveral, usa': [28.4514, -80.5283],
    'kill devil hills, usa': [36.0321, -75.6776],
    'bern, switzerland': [46.9485, 7.4522],
    'honolulu, usa': [21.3045, -157.8557],
    'stonehenge, uk': [51.1788, -1.8262],
    'lucca, italy': [44.0178, 10.4544],
    'san juan, puerto rico': [18.4653, -66.1167],
    'bethlehem': [-1.4506, -48.4682],
    'bandung, indonesia': [-6.9218, 107.6071],
    'helsinki, finland': [60.1666, 24.9435],
    'west orange, new jersey': [40.7987, -74.2390],
    'copenhagen, denmark': [55.6867, 12.5701],
    'nice, france': [43.7009, 7.2684],
    'osaka, japan': [34.6938, 135.5015],
    'abomey, benin': [7.1820, 1.9936],
    'kolkata, india': [22.5726, 88.3639],
    'cusco, peru': [-13.5171, -71.9785],
    "xi'an, china": [34.2610, 108.9423],
    'tehran, iran': [35.6893, 51.3896],
    'portland, maine, usa': [43.6574, -70.2587],
    'al hillah, iraq': [32.4822, 44.4328],
    'varanasi, india': [25.3356, 83.0076],
    'la paz, bolivia': [-16.4955, -68.1336],
    'magelang, indonesia': [-7.4771, 110.2182],
    'merida, mexico': [20.9671, -89.6237],
    'luxor, egypt': [25.7021, 32.6472],
    'selçuk, turkey': [37.9480, 27.3685],
    'siem reap, cambodia': [13.3618, 103.8590],
    'teotihuacan, mexico': [19.6934, -98.8831],
    'piste, mexico': [20.6999, -88.5901],
    'giza, egypt': [29.9871, 31.2118],
    'surin, thailand': [15.0610, 103.7613],
    'washington d.c., usa': [38.8950, -77.0365],
    'puerto iguazu, argentina': [-25.6108, -54.5764],
    'luoyang, china': [34.6197, 112.4477],
    'nashville, usa': [36.1623, -86.7743],
    'cholula, mexico': [19.0678, -98.3106],
    'zitong, china': [31.6551, 105.1912],
    'heliopolis, egypt': [30.1006, 31.3329],
    'ur, iraq': [30.9613, 46.1054],
    'tiwanaku, bolivia': [-16.5531, -68.6816],
    'mount etna, italy': [37.7488, 14.9669],
    'mount tai, china': [27.1246, 120.1828],
    'bazaruto, mozambique': [-21.6493, 35.4698],
    'ras mohammed, egypt': [27.7496, 34.2359],
    'bali, indonesia': [-8.2271, 115.1919],
    'ocean city, nj, usa': [39.2789, -74.5763],
    'cabo san lucas, mexico': [22.8939, -109.9201],
    'venice, italy': [45.4372, 12.3346],
    'axum, ethiopia': [14.1221, 38.7322],
    'sparta, greece': [37.0811, 22.4248],
    'paphos, cyprus': [34.7744, 32.4232],
    'amman, jordan': [31.9516, 35.9240],
    'denver, usa': [39.7392, -104.9849],
    'warsaw, poland': [52.2334, 21.0711],
    'chengdu, china': [30.6599, 104.0633],
    'cape coast, ghana': [5.1075, -1.2431],
    'tabriz, iran': [38.0739, 46.2979],
    'ipoh, malaysia': [4.5987, 101.0900],
    'quito, ecuador': [-0.2202, -78.5123],
    'milan, italy': [45.4642, 9.1896],
    'hangzhou, china': [30.2490, 120.2052],
    'chichen itza, mexico': [20.6829, -88.5687],
    'churchill, canada': [58.7693, -94.1737],
    'nanjing, china': [32.0438, 118.7789],
    'dakar, senegal': [14.6934, -17.4479],
    'beirut, lebanon': [33.8892, 35.5026],
    'panama city, panama': [8.9714, -79.5342],
    'petropavlovsk-kamchatsky, russia': [53.0200, 158.6471],
    'mysore, india': [12.3052, 76.6554],
    'san jose, ca, usa': [37.3362, -121.8906],
    'brussels, belgium': [50.8467, 4.3525],
    'timbuktu, mali': [16.7719, -3.0087],
    'alexandria, egypt': [31.1992, 29.8952],
    'gwalior, india': [26.2037, 78.1574],
    'florence, italy': [43.7698, 11.2556],
    'maseru, lesotho': [-29.3101, 27.4782],
    'st. petersburg, russia': [59.9387, 30.3162],
    'papeete, french polynesia': [-17.5374, -149.5660],
    'santo domingo, dominican republic': [18.4714, -69.8918],
    'provins, france': [48.5603, 3.2988],
    'aswan, egypt': [24.0911, 32.8973],
    'lagina, turkey': [37.3779, 28.0398],
    'zhoushan, china': [29.9873, 122.2030],
    'amarna, egypt': [27.6463, 30.8989],
    'kuwait city, kuwait': [29.3797, 47.9734],
    'phnom penh, cambodia': [11.5730, 104.8578],
    'benoni, south africa': [-26.1930356, 28.3082376],
    'berlin, germany': [52.5173885, 13.3951309],
    'buenos aires, argentina': [-34.6095579, -58.3887904],
    'busan, s. korea': [35.1799528, 129.0752365],
    'cairo, egypt': [30.0443879, 31.2357257],
    'chicago, usa': [41.8755616, -87.6244212],
    'dubai, uae': [25.0742823, 55.1885387],
    'ho chi minh city, vietnam': [10.7755254, 106.7021047],
    'jakarta, indonesia': [-6.1754049, 106.827168],
    'johannesburg, south africa': [-26.205, 28.049722],
    'lagos, nigeria': [6.4550575, 3.3941795],
    'london, uk': [51.5074456, -0.1277653],
    'los angeles, usa': [34.0536909, -118.242766],
    'madrid, spain': [40.416782, -3.703507],
    'nairobi, kenya': [-1.3026148, 36.828842],
    'new york, usa': [40.7127281, -74.0060152],
    'palo alto, ca, usa': [37.4443293, -122.1598465],
    'paris, france': [48.8534951, 2.3483915],
    'riyadh, saudi arabia': [23.333333, 45.333333],
    'rome, italy': [41.8933203, 12.4829321],
    'san francisco, ca, usa': [37.7879363, -122.4075201],
    'seattle, wa, usa': [47.6038321, -122.330062],
    'seoul, south korea': [37.5666791, 126.9782914],
    'shanghai, china': [31.2312707, 121.4700152],
    'shenzhen, china': [22.5445741, 114.0545429],
    'singapore': [1.357107, 103.8194992],
    'sydney, australia': [-33.8698439, 151.2082848],
    'tokyo, japan': [35.6768601, 139.7638947],
    'toronto, canada': [43.6534817, -79.3839347],
    'uppsala, sweden': [59.8586126, 17.6387436],
    "xi'an, china": [34.261004, 108.9423363],
    'beijing, china': [39.9057136, 116.3912972],
    'lhasa, tibet': [29.6469, 91.1172],
    'tibet': [29.6469, 91.1172]
};

/**
 * Resolves coordinates for a given location string.
 * @param {string} location 
 * @returns {[number, number]|null}
 */
export function resolveLocationCoords(location) {
    if (!location) return null;
    const loc = location.toLowerCase().trim();

    // Sort keys by length descending to match more specific strings first
    const sortedKeys = Object.keys(LOCATION_COORDS).sort((a, b) => b.length - a.length);

    // 1. Check for exact or full-key include match
    for (const key of sortedKeys) {
        if (loc === key || loc.includes(key)) return LOCATION_COORDS[key];
    }

    // 2. Fallback: try to find matching city name directly (e.g. "Milan" from "Milan, Europe")
    for (const key of sortedKeys) {
        if (key.includes(',')) {
            const city = key.split(',')[0].trim();
            if (loc.includes(city)) return LOCATION_COORDS[key];
        }
    }
    return null;
}

/**
 * Reverse resolves coordinates to the closest known location name.
 * @param {number} lng 
 * @param {number} lat 
 * @returns {string|null}
 */
export function reverseResolveLocation(lng, lat) {
    let closestKey = null;
    let minDistance = Infinity;

    for (const [key, coords] of Object.entries(LOCATION_COORDS)) {
        const [cLat, cLng] = coords;
        // Native distance calculation
        const dist = Math.sqrt(Math.pow(lng - cLng, 2) + Math.pow(lat - cLat, 2));
        if (dist < minDistance) {
            minDistance = dist;
            closestKey = key;
        }
    }
    // Only return if it's reasonably close (within ~1.5 degrees)
    return minDistance < 1.5 ? closestKey : null;
}

// --- LOCATION HIERARCHY HELPERS (moved from app.js) ---

export function getAfricanSubRegion(country, city) {
    if (city && city.toLowerCase() === 'kinshasa') return 'Middle Africa';
    if (!country) return 'Northern Africa';
    const c = country.toLowerCase().trim();
    if (['egypt', 'algeria', 'morocco', 'sudan', 'tunisia', 'libya', 'western sahara'].includes(c)) return 'Northern Africa';
    if (['nigeria', 'ghana', 'senegal', 'mali', 'burkina faso', 'ivory coast', "côte d'ivoire", 'benin', 'liberia', 'sierra leone', 'togo', 'guinea', 'guinea-bissau', 'cape verde', 'gambia', 'sao tome and principe', 'niger'].includes(c)) return 'Western Africa';
    if (['dr congo', 'democratic republic of congo', 'congo', 'cameroon', 'chad', 'angola', 'gabon', 'central african republic', 'equatorial guinea'].includes(c)) return 'Middle Africa';
    if (['ethiopia', 'kenya', 'tanzania', 'uganda', 'somalia', 'mozambique', 'rwanda', 'burundi', 'djibouti', 'eritrea', 'mauritius', 'comoros', 'seychelles', 'madagascar', 'south sudan', 'malawi'].includes(c)) return 'Eastern Africa';
    if (['south africa', 'zambia', 'zimbabwe', 'namibia', 'botswana', 'lesotho', 'eswatini', 'swaziland'].includes(c)) return 'Southern Africa';
    return 'Northern Africa';
}

export function getChinaSubRegion(province) {
    if (!province) return 'East China';
    const p = province.toLowerCase().trim();
    if (['beijing', 'tianjin', 'hebei', 'shanxi', 'inner mongolia'].some(x => p.includes(x))) return 'North China';
    if (['liaoning', 'jilin', 'heilongjiang'].some(x => p.includes(x))) return 'Northeast China';
    if (['shanghai', 'jiangsu', 'zhejiang', 'anhui', 'fujian', 'jiangxi', 'shandong'].some(x => p.includes(x))) return 'East China';
    if (['henan', 'hubei', 'hunan', 'guangdong', 'guangxi', 'hainan'].some(x => p.includes(x))) return 'South Central China';
    if (['chongqing', 'sichuan', 'guizhou', 'yunnan', 'tibet'].some(x => p.includes(x))) return 'Southwest China';
    if (['shaanxi', 'gansu', 'qinghai', 'ningxia', 'xinjiang'].some(x => p.includes(x))) return 'Northwest China';
    return 'East China';
}

export function getJapanSubRegion(province) {
    if (!province) return 'Kanto';
    const p = province.toLowerCase().trim();
    if (['hokkaido'].some(x => p.includes(x))) return 'Hokkaido';
    if (['aomori', 'iwate', 'miyagi', 'akita', 'yamagata', 'fukushima'].some(x => p.includes(x))) return 'Tohoku';
    if (['ibaraki', 'tochigi', 'gunma', 'saitama', 'chiba', 'tokyo', 'kanagawa'].some(x => p.includes(x))) return 'Kanto';
    if (['niigata', 'toyama', 'ishikawa', 'fukui', 'yamanashi', 'nagano', 'gifu', 'shizuoka', 'aichi'].some(x => p.includes(x))) return 'Chubu';
    if (['mie', 'shiga', 'kyoto', 'osaka', 'hyogo', 'nara', 'wakayama'].some(x => p.includes(x))) return 'Kansai';
    if (['tottori', 'shimane', 'okayama', 'hiroshima', 'yamaguchi'].some(x => p.includes(x))) return 'Chugoku';
    if (['tokushima', 'kagawa', 'ehime', 'kochi'].some(x => p.includes(x))) return 'Shikoku';
    if (['fukuoka', 'saga', 'nagasaki', 'kumamoto', 'oita', 'miyazaki', 'kagoshima', 'okinawa'].some(x => p.includes(x))) return 'Kyushu & Okinawa';
    return 'Kanto';
}

export function getKoreaSubRegion(province) {
    if (!province) return 'West Region (Sudo)';
    const p = province.toLowerCase().trim();
    if (['seoul', 'incheon', 'gyeonggi', 'chungcheong', 'daejeon', 'sejong'].some(x => p.includes(x))) return 'West Region (Sudo/Hoseo)';
    if (['gangwon'].some(x => p.includes(x))) return 'East Region (Gangwon)';
    if (['jeolla', 'gwangju'].some(x => p.includes(x))) return 'Southwest Region (Honam)';
    if (['gyeongsang', 'busan', 'daegu', 'ulsan'].some(x => p.includes(x))) return 'Southeast Region (Yeongnam)';
    if (['jeju'].some(x => p.includes(x))) return 'Jeju Island';
    return 'West Region (Sudo)';
}

export function getTaiwanSubRegion(province) {
    if (!province) return 'North Taiwan';
    const p = province.toLowerCase().trim();
    if (['taipei', 'keelung', 'taoyuan', 'hsinchu', 'miaoli'].some(x => p.includes(x))) return 'North Taiwan';
    if (['taichung', 'changhua', 'nantou'].some(x => p.includes(x))) return 'Central Taiwan';
    if (['yunlin', 'chiayi', 'tainan', 'kaohsiung', 'pingtung'].some(x => p.includes(x))) return 'South Taiwan';
    if (['hualien', 'taitung'].some(x => p.includes(x))) return 'East Taiwan';
    if (['penghu', 'kinmen', 'matsu'].some(x => p.includes(x))) return 'Offshore Islands';
    return 'North Taiwan';
}

export const AFRICA_POPULATION = {
    'nigeria': 224000000, 'ethiopia': 126000000, 'egypt': 113000000, 'dr congo': 102000000, 'democratic republic of congo': 102000000,
    'tanzania': 67000000, 'south africa': 60000000, 'kenya': 55000000, 'sudan': 48000000, 'uganda': 48000000,
    'algeria': 45000000, 'morocco': 38000000, 'angola': 36000000, 'mozambique': 34000000, 'ghana': 34000000,
    'madagascar': 30000000, 'cameroon': 28000000, "côte d'ivoire": 28000000, 'ivory coast': 28000000, 'niger': 27000000,
    'burkina faso': 23000000, 'mali': 23000000, 'malawi': 21000000, 'zambia': 20000000, 'senegal': 18000000,
    'chad': 18000000, 'somalia': 18000000, 'zimbabwe': 16000000, 'guinea': 14000000, 'rwanda': 14000000,
    'benin': 13000000, 'burundi': 13000000, 'tunisia': 12000000, 'south sudan': 11000000, 'togo': 9000000,
    'sierra leone': 8000000, 'libya': 7000000, 'congo': 6000000, 'liberia': 5000000, 'central african republic': 5000000,
    'mauritania': 4800000, 'eritrea': 3700000, 'namibia': 2600000, 'gambia': 2500000, 'botswana': 2400000,
    'gabon': 2400000, 'lesotho': 2300000, 'guinea-bissau': 2100000, 'equatorial guinea': 1700000, 'mauritius': 1200000,
    'eswatini': 1200000, 'swaziland': 1200000, 'djibouti': 1100000, 'comoros': 800000, 'cape verde': 500000,
    'western sahara': 500000, 'sao tome and principe': 200000, 'seychelles': 100000, 'kinshasa': 17000000
};

export function isCityRoute(name) {
    if (!name) return false;
    const n = name.toLowerCase().trim();
    return Object.keys(LOCATION_COORDS).some(key => {
        const city = key.split(',')[0].trim().toLowerCase();
        return n === city;
    });
}
