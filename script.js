// Draft configuration
const DRAFT_CONFIG = {
    teams: ['94Sleeper', 'samdecker', 'JoshAllenFuksUrTeam', 'JustinBondi'],
    rounds: 2,
    snake: true,
    timer: 120, // seconds
    autoPick: true
};

// State management
let state = {
    currentPick: 1,
    draftOrder: [],
    playerPool: [],
    teamRosters: {},
    draftHistory: [],
    timer: null,
    timeRemaining: DRAFT_CONFIG.timer,
    darkMode: false,
    chat: []
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
            initializeTeamNeeds();
        });
    
    // Initialize team rosters
    DRAFT_CONFIG.teams.forEach(team => {
        state.teamRosters[team] = [];
    });
    
    // Initialize event listeners
    initializeEventListeners();
    
    // Render initial draft board
    renderDraftBoard();
    renderTeamRosters();
    
    // Start timer for first pick
    startTimer();
}

// Initialize event listeners
function initializeEventListeners() {
    // Search and filter
    document.getElementById('playerSearch').addEventListener('input', handleSearch);
    document.querySelectorAll('[data-filter]').forEach(filter => {
        filter.addEventListener('click', handleFilter);
    });
    
    // Buttons
    document.getElementById('exportBtn').addEventListener('click', exportDraft);
    document.getElementById('resetBtn').addEventListener('click', resetDraft);
    document.getElementById('undoBtn').addEventListener('click', undoLastPick);
    document.getElementById('viewToggleBtn').addEventListener('click', toggleView);
    document.getElementById('settingsBtn').addEventListener('click', showSettings);
    document.getElementById('themeBtn').addEventListener('click', toggleTheme);
    
    // Chat
    document.getElementById('sendMessage').addEventListener('click', sendChatMessage);
    document.getElementById('chatInput').addEventListener('keypress', e => {
        if (e.key === 'Enter') sendChatMessage();
    });
    
    // Settings
    document.getElementById('saveSettings').addEventListener('click', saveSettings);
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
    const modal = new bootstrap.Modal(document.getElementById('draftPickModal'));
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
    
    // Update team needs
    updateTeamNeeds(pick);
    
    // Show modal
    modal.show();
    
    // Store current pick for use in makePick
    document.getElementById('draftPickModal').dataset.currentPick = pick;
}

// Make a draft pick
function makePick() {
    const pick = parseInt(document.getElementById('draftPickModal').dataset.currentPick);
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
            player,
            timestamp: new Date().toISOString()
        });
        
        // Add chat message
        addChatMessage('pick', `${team} selected ${player.Name} (${player.Position})`);
        
        // Re-render
        renderPlayerPool();
        renderTeamRosters();
        renderDraftBoard();
        updateDraftHistory();
        
        // Hide modal
        bootstrap.Modal.getInstance(document.getElementById('draftPickModal')).hide();
        
        // Start timer for next pick
        if (state.currentPick <= state.draftOrder.length) {
            startTimer();
        }
    }
}

// Start timer
function startTimer() {
    if (state.timer) {
        clearInterval(state.timer);
    }
    
    state.timeRemaining = DRAFT_CONFIG.timer;
    updateTimerDisplay();
    
    state.timer = setInterval(() => {
        state.timeRemaining--;
        updateTimerDisplay();
        
        if (state.timeRemaining <= 0) {
            clearInterval(state.timer);
            if (DRAFT_CONFIG.autoPick) {
                autoPick();
            }
        }
    }, 1000);
}

// Update timer display
function updateTimerDisplay() {
    const display = document.getElementById('timerDisplay');
    const minutes = Math.floor(state.timeRemaining / 60);
    const seconds = state.timeRemaining % 60;
    display.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    // Update timer color
    display.className = 'timer';
    if (state.timeRemaining <= 30) {
        display.classList.add('danger');
    } else if (state.timeRemaining <= 60) {
        display.classList.add('warning');
    }
}

// Auto pick
function autoPick() {
    const availablePlayers = state.playerPool.filter(p => !p.drafted);
    if (availablePlayers.length > 0) {
        const randomPlayer = availablePlayers[Math.floor(Math.random() * availablePlayers.length)];
        showDraftModal(state.currentPick, randomPlayer);
        makePick();
    }
}

// Undo last pick
function undoLastPick() {
    if (state.draftHistory.length > 0) {
        const lastPick = state.draftHistory.pop();
        const player = lastPick.player;
        
        // Reset player drafted status
        player.drafted = false;
        
        // Remove from team roster
        const team = lastPick.team;
        state.teamRosters[team] = state.teamRosters[team].filter(p => p.Name !== player.Name);
        
        // Reset current pick
        state.currentPick = lastPick.pick;
        
        // Add chat message
        addChatMessage('system', `Undid ${team}'s selection of ${player.Name}`);
        
        // Re-render
        renderPlayerPool();
        renderTeamRosters();
        renderDraftBoard();
        updateDraftHistory();
        
        // Start timer
        startTimer();
    }
}

// Update draft history
function updateDraftHistory() {
    const tbody = document.querySelector('#draftHistory tbody');
    tbody.innerHTML = '';
    
    state.draftHistory.forEach(pick => {
        const tr = document.createElement('tr');
        const time = new Date(pick.timestamp).toLocaleTimeString();
        tr.innerHTML = `
            <td>${time}</td>
            <td>${pick.pick}</td>
            <td>${pick.team}</td>
            <td>${pick.player.Name}</td>
            <td>${pick.player.Position}</td>
        `;
        tbody.appendChild(tr);
    });
}

// Handle search
function handleSearch(e) {
    const searchTerm = e.target.value.toLowerCase();
    const rows = document.querySelectorAll('#playerPool tbody tr');
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
}

// Handle filter
function handleFilter(e) {
    const filter = e.target.dataset.filter;
    const rows = document.querySelectorAll('#playerPool tbody tr');
    
    rows.forEach(row => {
        const cell = row.querySelector(`td:nth-child(${filter === 'position' ? 2 : filter === 'team' ? 3 : 4})`);
        const value = cell.textContent.toLowerCase();
        row.style.display = value.includes(filter) ? '' : 'none';
    });
}

// Toggle view
function toggleView() {
    const board = document.getElementById('draftBoard');
    board.classList.toggle('compact-view');
}

// Show settings
function showSettings() {
    const modal = new bootstrap.Modal(document.getElementById('settingsModal'));
    document.getElementById('timerSetting').value = DRAFT_CONFIG.timer;
    modal.show();
}

// Save settings
function saveSettings() {
    DRAFT_CONFIG.timer = parseInt(document.getElementById('timerSetting').value);
    if (state.timer) {
        startTimer();
    }
    bootstrap.Modal.getInstance(document.getElementById('settingsModal')).hide();
}

// Toggle theme
function toggleTheme() {
    state.darkMode = !state.darkMode;
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', state.darkMode);
}

// Add chat message
function addChatMessage(type, message) {
    const chat = document.getElementById('chatMessages');
    const div = document.createElement('div');
    div.className = `chat-message ${type}`;
    div.textContent = message;
    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;
}

// Send chat message
function sendChatMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    
    if (message) {
        addChatMessage('user', message);
        input.value = '';
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
            draftHistory: [],
            timer: null,
            timeRemaining: DRAFT_CONFIG.timer,
            darkMode: state.darkMode,
            chat: []
        };
        
        DRAFT_CONFIG.teams.forEach(team => {
            state.teamRosters[team] = [];
        });
        
        renderDraftBoard();
        renderPlayerPool();
        renderTeamRosters();
        updateDraftHistory();
        document.getElementById('chatMessages').innerHTML = '';
        
        addChatMessage('system', 'Draft has been reset');
        startTimer();
    }
}

// Initialize team needs
function initializeTeamNeeds() {
    const needs = {};
    DRAFT_CONFIG.teams.forEach(team => {
        needs[team] = {
            QB: 0,
            RB: 0,
            WR: 0,
            TE: 0,
            K: 0,
            DEF: 0
        };
    });
    state.teamNeeds = needs;
}

// Update team needs
function updateTeamNeeds(pick) {
    const team = state.draftOrder[pick - 1];
    const needs = state.teamNeeds[team];
    const roster = state.teamRosters[team];
    
    // Reset counts
    Object.keys(needs).forEach(pos => {
        needs[pos] = 0;
    });
    
    // Count current roster
    roster.forEach(player => {
        if (needs[player.Position] !== undefined) {
            needs[player.Position]++;
        }
    });
    
    // Update display
    const container = document.getElementById('teamNeedsList');
    container.innerHTML = Object.entries(needs)
        .map(([pos, count]) => `
            <div class="position-count ${count === 0 ? 'needed' : ''}">
                <span>${pos}</span>
                <span>${count}</span>
            </div>
        `).join('');
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Load dark mode preference
    state.darkMode = localStorage.getItem('darkMode') === 'true';
    if (state.darkMode) {
        document.body.classList.add('dark-mode');
    }
    
    initializeDraft();
}); 