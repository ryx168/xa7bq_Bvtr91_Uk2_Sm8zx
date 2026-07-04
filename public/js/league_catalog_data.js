(function() {
    window.LEAGUE_CATALOG = {};
    try {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', '/sports/leagues/league_map.json', false); // synchronous request
        xhr.send(null);
        if (xhr.status === 200 || xhr.status === 304) {
            var map = JSON.parse(xhr.responseText);
            var defaultSeasons = [
                "2026", "2025", "2024", "2023", "2022", "2021", "2020", 
                "2019", "2018", "2017", "2016", "2015", "2014", "2013", 
                "2012", "2011", "2010", "2009", "2008", "2007", "2006", 
                "2005", "2004"
            ];
            for (var key in map) {
                window.LEAGUE_CATALOG[key] = {
                    name: key.replace(/_/g, ' '),
                    seasons: defaultSeasons,
                    id: map[key]
                };
            }
        } else {
            console.error("Failed to load league map, status: " + xhr.status);
        }
    } catch (e) {
        console.error("Failed to load league catalog synchronously", e);
    }
})();