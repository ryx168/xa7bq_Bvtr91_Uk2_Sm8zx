/**
 * sports-utils.js
 * Standalone pure utility functions for sports schedules and Levenshtein matching.
 */

export function formatGoal(gStr) {
    if (!gStr) return '-';
    return gStr.split('<br>').map(s => {
        const timeMatch = s.match(/(\d+\+?\d*')/);
        const time = timeMatch ? timeMatch[1] : '';
        const scoreMatch = s.match(/(\(\d+-\d+\)|\d+-\d+)/);
        const score = scoreMatch ? scoreMatch[1] : '';
        if (time && score) return `${time} ${score}`;
        if (time) return time;
        return s || '-';
    }).join('<br>');
}

export function distance(s1, s2) {
    let m = s1.length, n = s2.length;
    let dp = Array(m+1).fill(null).map(() => Array(n+1).fill(0));
    for(let i=0; i<=m; i++) dp[i][0] = i;
    for(let j=0; j<=n; j++) dp[0][j] = j;
    for(let i=1; i<=m; i++) {
        for(let j=1; j<=n; j++) {
            if (s1[i-1] === s2[j-1]) dp[i][j] = dp[i-1][j-1];
            else dp[i][j] = Math.min(dp[i-1][j-1], dp[i-1][j], dp[i][j-1]) + 1;
        }
    }
    return dp[m][n];
}
