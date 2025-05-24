const https = require('https');
const fs = require('fs');

const LEAGUE_ID = '1181413931817381888';
const DISTRIBUTION_TEAMS = ['94Sleeper', 'samdecker', 'JoshAllenFuksUrTeam', 'JustinBondi'];

// Function to make HTTPS requests
function makeRequest(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            if (res.statusCode !== 200) {
                reject(new Error(`API request failed with status ${res.statusCode}`));
                return;
            }

            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve(parsed);
                } catch (e) {
                    reject(new Error('Failed to parse API response'));
                }
            });
            res.on('error', reject);
        }).on('error', reject);
    });
}

// Main function to analyze league
async function analyzeLeague() {
    try {
        console.log('Fetching league data...');
        
        // Get league info
        console.log('Getting league info...');
        const leagueUrl = `https://api.sleeper.app/v1/league/${LEAGUE_ID}`;
        const league = await makeRequest(leagueUrl);
        
        // Get all users in the league
        console.log('Getting users...');
        const usersUrl = `https://api.sleeper.app/v1/league/${LEAGUE_ID}/users`;
        const users = await makeRequest(usersUrl);
        
        // Get all rosters
        console.log('Getting rosters...');
        const rostersUrl = `https://api.sleeper.app/v1/league/${LEAGUE_ID}/rosters`;
        const rosters = await makeRequest(rostersUrl);
        
        // Get all players
        console.log('Getting players...');
        const playersUrl = 'https://api.sleeper.app/v1/players/nfl';
        const players = await makeRequest(playersUrl);
        
        // Get traded picks using draft_id
        console.log('Getting traded picks...');
        const draftId = league.draft_id;
        const tradedPicksUrl = `https://api.sleeper.app/v1/draft/${draftId}/traded_picks`;
        let tradedPicks = [];
        try {
            tradedPicks = await makeRequest(tradedPicksUrl);
        } catch (e) {
            console.warn('No traded picks found or error fetching traded picks:', e.message);
        }
        
        // Create user map for easy lookup
        const userMap = users.reduce((acc, user) => {
            acc[user.user_id] = user;
            return acc;
        }, {});
        
        // Create roster map and rosterId->userId map
        const rosterMap = {};
        const rosterIdToUserId = {};
        rosters.forEach(roster => {
            rosterMap[roster.owner_id] = roster;
            rosterIdToUserId[roster.roster_id] = roster.owner_id;
        });
        
        // Build draft pick ownership for 2025 and 2026
        // Map: owner_id (roster_id) -> [ {season, round, original_owner_id} ]
        const picksByOwner = {};
        // First, add all default picks for each roster for 2025 and 2026
        rosters.forEach(roster => {
            for (let season = 2025; season <= 2026; season++) {
                for (let round = 1; round <= league.settings.draft_rounds; round++) {
                    if (!picksByOwner[roster.roster_id]) picksByOwner[roster.roster_id] = [];
                    picksByOwner[roster.roster_id].push({
                        season: String(season),
                        round,
                        original_owner_id: roster.roster_id
                    });
                }
            }
        });
        // Then, apply traded picks to move ownership
        tradedPicks.forEach(pick => {
            if ((pick.season === '2025' || pick.season === '2026')) {
                // Remove from original owner
                if (picksByOwner[pick.roster_id]) {
                    picksByOwner[pick.roster_id] = picksByOwner[pick.roster_id].filter(p => !(p.season === pick.season && p.round === pick.round));
                }
                // Add to new owner
                if (!picksByOwner[pick.owner_id]) picksByOwner[pick.owner_id] = [];
                picksByOwner[pick.owner_id].push({
                    season: pick.season,
                    round: pick.round,
                    original_owner_id: pick.roster_id
                });
            }
        });
        
        // Analyze teams
        const teams = [];
        let totalPlayers = 0;
        let totalPicks = 0;
        const positionCounts = {};
        
        for (const [userId, user] of Object.entries(userMap)) {
            const roster = rosterMap[userId];
            if (!roster) continue;
            const teamName = user.display_name || user.metadata.team_name || `Team ${userId}`;
            // Only process distribution teams
            if (!DISTRIBUTION_TEAMS.includes(teamName)) continue;
            const teamPlayers = [];
            const teamPicks = [];
            // Process players
            if (roster.players) {
                roster.players.forEach(playerId => {
                    const player = players[playerId];
                    if (player) {
                        teamPlayers.push({
                            name: `${player.first_name} ${player.last_name}`.trim(),
                            position: player.position
                        });
                        totalPlayers++;
                        positionCounts[player.position] = (positionCounts[player.position] || 0) + 1;
                    }
                });
            }
            // Process draft picks (2025 and 2026 only, using picksByOwner)
            const picks = picksByOwner[roster.roster_id] || [];
            picks.forEach(pick => {
                teamPicks.push(`${pick.season} Round ${pick.round} (originally ${pick.original_owner_id})`);
                totalPicks++;
            });
            teams.push({
                teamName,
                players: teamPlayers,
                picks: teamPicks,
                totalAssets: teamPlayers.length + teamPicks.length
            });
        }
        // Sort teams by total assets
        teams.sort((a, b) => b.totalAssets - a.totalAssets);
        // Generate draft board
        const totalAssets = totalPlayers + totalPicks;
        const estimatedRounds = Math.ceil(totalAssets / teams.length);
        let draftBoard = `DISTRIBUTION DRAFT BOARD\n${'='.repeat(30)}\n\nTEAMS (${teams.length}):\n${teams.map((team, i) => `${i + 1}. ${team.teamName} (${team.totalAssets} assets)`).join('\\n')}\n\nTOTAL ASSETS: ${totalAssets}\nESTIMATED ROUNDS: ${estimatedRounds}\n\nPOSITION BREAKDOWN:\n${Object.entries(positionCounts).sort(([,a], [,b]) => b - a).map(([pos, count]) => `${pos}: ${count}`).join('\\n')}\n\nDETAILED BREAKDOWN:\n${'='.repeat(20)}\n\n`;
        teams.forEach(team => {
            draftBoard += `${team.teamName.toUpperCase()}:\\n`;
            draftBoard += `${'─'.repeat(team.teamName.length + 1)}\\n`;
            // Group players by position
            const playersByPos = {};
            team.players.forEach(player => {
                if (!playersByPos[player.position]) {
                    playersByPos[player.position] = [];
                }
                playersByPos[player.position].push(player.name);
            });
            Object.entries(playersByPos).forEach(([pos, players]) => {
                draftBoard += `  ${pos} (${players.length}):\\n`;
                players.forEach(player => {
                    draftBoard += `    • ${player}\\n`;
                });
            });
            if (team.picks.length > 0) {
                draftBoard += `  PICKS (${team.picks.length}):\\n`;
                team.picks.forEach(pick => {
                    draftBoard += `    • ${pick}\\n`;
                });
            }
            draftBoard += '\\n';
        });
        draftBoard += `SLEEPER SETUP:\n${'='.repeat(14)}\n• Create \"Startup/Rookie\" draft\n• ${teams.length} teams, ${estimatedRounds} rounds\n• Snake format recommended\n• 3-5 minute timer per pick\n• Manual player pool management\n\nDRAFT ORDER RECOMMENDATION:\n${'='.repeat(25)}\n1. ${teams[3].teamName} (${teams[3].totalAssets} assets)\n2. ${teams[2].teamName} (${teams[2].totalAssets} assets)\n3. ${teams[1].teamName} (${teams[1].totalAssets} assets)\n4. ${teams[0].teamName} (${teams[0].totalAssets} assets)\n\nNote: This is a snake draft, so the order will reverse in even-numbered rounds.`;
        // Generate CSV
        let csv = 'Team,Asset,Type,Position\n';
        teams.forEach(team => {
            team.players.forEach(player => {
                csv += `\"${team.teamName}\",\"${player.name}\",\"Player\",\"${player.position}\"\\n`;
            });
            team.picks.forEach(pick => {
                csv += `\"${team.teamName}\",\"${pick}\",\"Draft Pick\",\"PICK\"\\n`;
            });
        });
        // Generate Google Sheets CSV
        let sheetsData = {
            'Draft Board': 'Round,Pick,Team,Player,Position,Original Owner\n',
            'Player Pool': 'Name,Position,Team,Original Owner\n',
            'Team Rosters': 'Team,Player,Position,Original Owner\n'
        };

        // Helper to get team name from original_owner_id
        const rosterIdToTeamName = {};
        rosters.forEach(roster => {
            const user = userMap[roster.owner_id];
            const teamName = user ? (user.display_name || user.metadata.team_name || `Team ${roster.owner_id}`) : `Team ${roster.owner_id}`;
            rosterIdToTeamName[roster.roster_id] = teamName;
        });

        // Add players to Player Pool
        teams.forEach(team => {
            team.players.forEach(player => {
                let nflTeam = '';
                for (const [id, p] of Object.entries(players)) {
                    if (`${p.first_name} ${p.last_name}`.trim() === player.name) {
                        nflTeam = p.team || '';
                        break;
                    }
                }
                sheetsData['Player Pool'] += `"${player.name}","${player.position}","${nflTeam}","${team.teamName}"\n`;
            });
        });

        // Add picks to Player Pool
        teams.forEach(team => {
            team.picks.forEach(pick => {
                const match = pick.match(/(\d{4}) Round (\d) \(originally (\d+)\)/);
                if (match) {
                    const [_, year, round, origId] = match;
                    const origTeam = rosterIdToTeamName[origId] || `Team ${origId}`;
                    sheetsData['Player Pool'] += `"${year} ${ordinalSuffix(round)}","PICK","","${origTeam}"\n`;
                }
            });
        });

        // Create draft board template
        const totalRounds = Math.ceil(totalAssets / teams.length);
        for (let round = 1; round <= totalRounds; round++) {
            for (let pick = 1; pick <= teams.length; pick++) {
                const teamIndex = round % 2 === 0 ? teams.length - pick : pick - 1;
                const team = teams[teamIndex];
                sheetsData['Draft Board'] += `${round},${pick},"${team.teamName}","","",""\n`;
            }
        }

        // Create team rosters template
        teams.forEach(team => {
            sheetsData['Team Rosters'] += `"${team.teamName}","","",""\n`;
        });

        // Save files
        fs.writeFileSync('draft_board.txt', draftBoard);
        fs.writeFileSync('distribution_assets.csv', csv);
        fs.writeFileSync('google_sheets_draft.csv', sheetsData['Draft Board']);
        fs.writeFileSync('google_sheets_player_pool.csv', sheetsData['Player Pool']);
        fs.writeFileSync('google_sheets_rosters.csv', sheetsData['Team Rosters']);

        console.log('Analysis complete! Files generated:');
        console.log('- draft_board.txt');
        console.log('- distribution_assets.csv');
        console.log('- google_sheets_draft.csv');
        console.log('- google_sheets_player_pool.csv');
        console.log('- google_sheets_rosters.csv');
    } catch (error) {
        console.error('Error analyzing league:', error.message);
        if (error.stack) {
            console.error('Stack trace:', error.stack);
        }
    }
}
// Run the analysis
analyzeLeague();

// Helper for ordinal suffix
function ordinalSuffix(i) {
    const j = i % 10, k = i % 100;
    if (j == 1 && k != 11) return i + "st";
    if (j == 2 && k != 12) return i + "nd";
    if (j == 3 && k != 13) return i + "rd";
    return i + "th";
} 