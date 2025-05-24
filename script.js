// Draft configuration
const DRAFT_CONFIG = {
    teams: ['94Sleeper', 'samdecker', 'JoshAllenFuksUrTeam', 'JustinBondi'],
    rounds: 2,
    snake: true
};

// State management
let state = {
    currentPick: 1,
    draftOrder: [],
    playerPool: [],
    teamRosters: {},
    draftHistory: []
};

// Initialize the draft
function initializeDraft() {
    // Generate draft order
    state.draftOrder = generateDraftOrder();
    
    // Load player pool from CSV
    fetch('google_sheets_player_pool.csv')
        .then(response => response.text())
        .then(csv => {
            state.playerPool = parseCSV(csv);
            renderPlayerPool();
        });
    
    // Initialize team rosters
    DRAFT_CONFIG.teams.forEach(team => {
        state.teamRosters[team] = [];
    });
    
    // Render initial draft board
    renderDraftBoard();
    renderTeamRosters();
}

// Generate draft order
function generateDraftOrder() {
    let order = [];
    for (let round = 1; round <= DRAFT_CONFIG.rounds; round++) {
        let roundOrder = [...DRAFT_CONFIG.teams];
        if (round % 2 === 0 && DRAFT_CONFIG.snake) {
            roundOrder.reverse();
        }
        order = order.concat(roundOrder);
    }
    return order;
}

// Parse CSV data
function parseCSV(csv) {
    const lines = csv.split('\n');
    const headers = lines[0].split(',');
    return lines.slice(1).map(line => {
        const values = line.split(',');
        return headers.reduce((obj, header, index) => {
            obj[header] = values[index];
            return obj;
        }, {});
    });
}

// Render draft board
function renderDraftBoard() {
    const tbody = document.querySelector('#draftBoard tbody');
    tbody.innerHTML = '';
    
    state.draftOrder.forEach((team, index) => {
        const round = Math.floor(index / DRAFT_CONFIG.teams.length) + 1;
        const pick = index + 1;
        
        const tr = document.createElement('tr');
        if (pick === state.currentPick) {
            tr.classList.add('current-pick');
        }
        
        tr.innerHTML = `
            <td>${round}</td>
            <td>${pick}</td>
            <td>${team}</td>
            <td class="player-cell"></td>
            <td class="position-cell"></td>
            <td class="owner-cell"></td>
            <td>
                <button class="btn btn-primary btn-sm btn-draft" 
                        onclick="showDraftModal(${pick})"
                        ${pick !== state.currentPick ? 'disabled' : ''}>
                    Draft
                </button>
            </td>
        `;
        
        tbody.appendChild(tr);
    });
}

// Render player pool
function renderPlayerPool() {
    const tbody = document.querySelector('#playerPool tbody');
    tbody.innerHTML = '';
    
    state.playerPool.forEach(player => {
        if (!player.drafted) {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${player.Name}</td>
                <td>${player.Position}</td>
                <td>${player.Team}</td>
                <td>${player.OriginalOwner}</td>
            `;
            tr.onclick = () => showDraftModal(state.currentPick, player);
            tbody.appendChild(tr);
        }
    });
}

// Render team rosters
function renderTeamRosters() {
    const container = document.getElementById('teamRosters');
    container.innerHTML = '';
    
    DRAFT_CONFIG.teams.forEach(team => {
        const roster = state.teamRosters[team];
        const div = document.createElement('div');
        div.className = 'col-md-3';
        div.innerHTML = `
            <div class="team-roster">
                <h6>${team}</h6>
                <ul class="player-list">
                    ${roster.map(player => `
                        <li>${player.Name} (${player.Position})</li>
                    `).join('')}
                </ul>
            </div>
        `;
        container.appendChild(div);
    });
}

// Show draft modal
function showDraftModal(pick, selectedPlayer = null) {
    const modal = new bootstrap.Modal(document.getElementById('draftModal'));
    const select = document.getElementById('playerSelect');
    
    // Clear previous options
    select.innerHTML = '';
    
    // Add available players
    state.playerPool
        .filter(player => !player.drafted)
        .forEach(player => {
            const option = document.createElement('option');
            option.value = player.Name;
            option.textContent = `${player.Name} (${player.Position}) - ${player.OriginalOwner}`;
            if (selectedPlayer && selectedPlayer.Name === player.Name) {
                option.selected = true;
            }
            select.appendChild(option);
        });
    
    // Show modal
    modal.show();
    
    // Store current pick for use in makePick
    document.getElementById('draftModal').dataset.currentPick = pick;
}

// Make a draft pick
function makePick() {
    const pick = parseInt(document.getElementById('draftModal').dataset.currentPick);
    const playerName = document.getElementById('playerSelect').value;
    const player = state.playerPool.find(p => p.Name === playerName);
    
    if (player) {
        // Update draft board
        const row = document.querySelector(`#draftBoard tbody tr:nth-child(${pick})`);
        row.querySelector('.player-cell').textContent = player.Name;
        row.querySelector('.position-cell').textContent = player.Position;
        row.querySelector('.owner-cell').textContent = player.OriginalOwner;
        
        // Update player pool
        player.drafted = true;
        
        // Update team roster
        const team = state.draftOrder[pick - 1];
        state.teamRosters[team].push(player);
        
        // Update state
        state.currentPick++;
        state.draftHistory.push({
            pick,
            team,
            player
        });
        
        // Re-render
        renderPlayerPool();
        renderTeamRosters();
        renderDraftBoard();
        
        // Hide modal
        bootstrap.Modal.getInstance(document.getElementById('draftModal')).hide();
    }
}

// Export draft data
function exportDraft() {
    const data = {
        draftOrder: state.draftOrder,
        teamRosters: state.teamRosters,
        draftHistory: state.draftHistory
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'draft-results.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Reset draft
function resetDraft() {
    if (confirm('Are you sure you want to reset the draft? This will clear all picks.')) {
        state = {
            currentPick: 1,
            draftOrder: generateDraftOrder(),
            playerPool: state.playerPool.map(player => ({ ...player, drafted: false })),
            teamRosters: {},
            draftHistory: []
        };
        
        DRAFT_CONFIG.teams.forEach(team => {
            state.teamRosters[team] = [];
        });
        
        renderDraftBoard();
        renderPlayerPool();
        renderTeamRosters();
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeDraft); 