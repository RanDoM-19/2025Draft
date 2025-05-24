// Add Chart.js for statistics
document.head.innerHTML += '<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>';

// Global variables
let players = [];
let currentPick = 1;
let draftTimer = null;
let timeRemaining = 0;
let draftHistory = [];
let chatMessages = [];
let currentUser = null;
let isCommissioner = false;
let draftOrder = {}; // Stores the original team for each pick
let positionChart = null;
let teamChart = null;

// DOM Elements
const draftBoard = document.getElementById('draftBoard');
const playerPool = document.getElementById('playerPool');
const teamRosters = document.getElementById('teamRosters');
const draftTimerDisplay = document.getElementById('draftTimer');
const chatMessagesContainer = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const playerSearch = document.getElementById('playerSearch');
const positionFilter = document.getElementById('positionFilter');
const draftHistoryList = document.getElementById('draftHistoryList');
const settingsModal = new bootstrap.Modal(document.getElementById('settingsModal'));
const pickModal = new bootstrap.Modal(document.getElementById('pickModal'));
const userSelectionModal = new bootstrap.Modal(document.getElementById('userSelectionModal'));
const currentUserDisplay = document.getElementById('currentUser');
const settingsBtn = document.getElementById('settingsBtn');

// Available teams
const availableTeams = ['94Sleeper', 'samdecker', 'JoshAllenFuksUrTeam', 'JustinBondi'];

// Initialize the application
async function initializeDraft() {
    try {
        // Show user selection modal first
        userSelectionModal.show();
        
        // Load players from CSV
        const [playerPoolResponse, adpResponse] = await Promise.all([
            fetch('google_sheets_player_pool.csv'),
            fetch('adp.csv')
        ]);
        
        const playerPoolText = await playerPoolResponse.text();
        const adpText = await adpResponse.text();
        
        // Parse and merge player data with ADP
        players = parseAndMergePlayerData(playerPoolText, adpText);
        
        // Load draft settings
        loadDraftSettings();
        
        // Initialize the draft board
        initializeDraftBoard();
        
        // Initialize the player pool
        updatePlayerPool();
        
        // Initialize team rosters
        initializeTeamRosters();
        
        // Initialize statistics
        initializeStatistics();
        
        // Add event listeners
        setupEventListeners();
        
        console.log('Draft initialized successfully');
    } catch (error) {
        console.error('Error initializing draft:', error);
        alert('Error initializing draft. Please check the console for details.');
    }
}

// Parse and merge player data with ADP
function parseAndMergePlayerData(playerPoolText, adpText) {
    const playerPoolLines = playerPoolText.split('\n');
    const adpLines = adpText.split('\n');
    
    // Create ADP lookup map
    const adpMap = new Map();
    adpLines.slice(1).forEach(line => {
        const [name, adp] = line.split(',');
        if (name && adp) {
            adpMap.set(name.trim(), parseFloat(adp.trim()));
        }
    });
    
    // Parse player pool and add ADP
    return playerPoolLines.slice(1).map(line => {
        const values = line.split(',');
        const name = values[0].trim();
        return {
            name,
            position: values[1].trim(),
            nflTeam: values[2].trim(),
            originalOwner: values[3].trim(),
            adp: adpMap.get(name) || 999, // Default to 999 if no ADP found
            drafted: false
        };
    });
}

// Handle user selection
function handleUserSelection(role) {
    currentUser = role;
    isCommissioner = role === 'commish';
    
    // Update UI
    currentUserDisplay.textContent = role;
    settingsBtn.style.display = isCommissioner ? 'block' : 'none';
    
    // Hide user selection modal
    userSelectionModal.hide();
    
    // Start the draft timer if commissioner
    if (isCommissioner) {
        startDraftTimer();
    }
    
    // Add welcome message
    addChatMessage(`${role} has joined the draft`);
}

// Initialize the draft board
function initializeDraftBoard() {
    const tbody = draftBoard.querySelector('tbody');
    tbody.innerHTML = '';
    
    // Create 12 rounds of picks
    for (let round = 1; round <= 12; round++) {
        for (let pick = 1; pick <= 12; pick++) {
            const row = document.createElement('tr');
            row.setAttribute('data-round', round);
            row.setAttribute('data-pick', pick);
            const originalTeam = draftOrder[`${round}-${pick}`] || 'Unassigned';
            row.innerHTML = `
                <td>${round}</td>
                <td>${pick}</td>
                <td>${originalTeam}</td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td>
                    <button class="btn btn-sm btn-primary make-pick" data-round="${round}" data-pick="${pick}">
                        Make Pick
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        }
    }
}

// Update the player pool
function updatePlayerPool() {
    const tbody = playerPool.querySelector('tbody');
    tbody.innerHTML = '';
    
    const searchTerm = playerSearch.value.toLowerCase();
    const positionFilterValue = positionFilter.value;
    const sortBy = document.getElementById('sortBy').value;
    
    let filteredPlayers = players.filter(player => {
        const matchesSearch = player.name.toLowerCase().includes(searchTerm);
        const matchesPosition = positionFilterValue === 'ALL' || player.position === positionFilterValue;
        return matchesSearch && matchesPosition && !player.drafted;
    });
    
    // Sort players
    filteredPlayers.sort((a, b) => {
        switch (sortBy) {
            case 'adp':
                return a.adp - b.adp;
            case 'name':
                return a.name.localeCompare(b.name);
            case 'position':
                return a.position.localeCompare(b.position);
            default:
                return 0;
        }
    });
    
    filteredPlayers.forEach(player => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${player.name}</td>
            <td>${player.position}</td>
            <td>${player.nflTeam}</td>
            <td>${player.originalOwner}</td>
            <td>${player.adp === 999 ? 'N/A' : player.adp}</td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="makePickFromPool('${player.name}')">
                    Draft
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Initialize team rosters
function initializeTeamRosters() {
    const container = document.getElementById('teamRosters');
    container.innerHTML = '';
    
    for (let i = 1; i <= 12; i++) {
        const teamCard = document.createElement('div');
        teamCard.className = 'col-md-4 mb-3';
        teamCard.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h5 class="mb-0">Team ${i}</h5>
                </div>
                <div class="card-body">
                    <ul class="list-group list-group-flush" id="team${i}Roster">
                    </ul>
                </div>
            </div>
        `;
        container.appendChild(teamCard);
    }
}

// Load draft settings
function loadDraftSettings() {
    const settings = JSON.parse(localStorage.getItem('draftSettings')) || {
        timerDuration: 60,
        draftOrder: {}
    };
    
    document.getElementById('timerDuration').value = settings.timerDuration;
    timeRemaining = settings.timerDuration;
    draftOrder = settings.draftOrder;
    
    // Initialize draft order table
    initializeDraftOrderTable();
}

// Initialize draft order table
function initializeDraftOrderTable() {
    const tbody = document.querySelector('#draftOrderTable tbody');
    tbody.innerHTML = '';
    
    for (let round = 1; round <= 12; round++) {
        for (let pick = 1; pick <= 12; pick++) {
            const row = document.createElement('tr');
            const currentTeam = draftOrder[`${round}-${pick}`] || '';
            
            row.innerHTML = `
                <td>${round}</td>
                <td>${pick}</td>
                <td>
                    <select class="form-select form-select-sm" data-round="${round}" data-pick="${pick}">
                        <option value="">Unassigned</option>
                        ${availableTeams.map(team => `
                            <option value="${team}" ${currentTeam === team ? 'selected' : ''}>${team}</option>
                        `).join('')}
                    </select>
                </td>
            `;
            tbody.appendChild(row);
        }
    }
}

// Save draft settings
function saveDraftSettings() {
    const timerDuration = parseInt(document.getElementById('timerDuration').value);
    
    // Collect draft order assignments
    const newDraftOrder = {};
    document.querySelectorAll('#draftOrderTable select').forEach(select => {
        const round = select.dataset.round;
        const pick = select.dataset.pick;
        const team = select.value;
        if (team) {
            newDraftOrder[`${round}-${pick}`] = team;
        }
    });
    
    // Save settings
    const settings = {
        timerDuration,
        draftOrder: newDraftOrder
    };
    localStorage.setItem('draftSettings', JSON.stringify(settings));
    
    // Update global variables
    timeRemaining = timerDuration;
    draftOrder = newDraftOrder;
    
    // Update draft board
    initializeDraftBoard();
    
    // Update timer display
    updateTimerDisplay();
    
    // Hide modal
    settingsModal.hide();
    
    // Add chat message
    addChatMessage('Commissioner has updated draft settings');
}

// Make a draft pick
function makePick(round, pick, playerName) {
    // Check if user is authorized to make this pick
    const originalTeam = draftOrder[`${round}-${pick}`];
    if (!isCommissioner && currentUser !== originalTeam) {
        alert('You are not authorized to make this pick');
        return;
    }
    
    const player = players.find(p => p.name === playerName);
    if (!player) return;
    
    // Update the draft board
    const row = draftBoard.querySelector(`tr[data-round="${round}"][data-pick="${pick}"]`);
    if (row) {
        row.querySelector('td:nth-child(4)').textContent = player.name;
        row.querySelector('td:nth-child(5)').textContent = player.position;
        row.querySelector('td:nth-child(6)').textContent = player.originalOwner;
        row.querySelector('td:nth-child(7)').textContent = player.adp === 999 ? 'N/A' : player.adp;
    }
    
    // Update the player's status
    player.drafted = true;
    
    // Add to team roster
    const teamRoster = document.getElementById(`team${originalTeam}Roster`);
    if (teamRoster) {
        const li = document.createElement('li');
        li.className = 'list-group-item';
        li.textContent = `${player.name} (${player.position}) - ADP: ${player.adp === 999 ? 'N/A' : player.adp}`;
        teamRoster.appendChild(li);
    }
    
    // Add to draft history
    draftHistory.push({
        round,
        pick,
        player: player.name,
        position: player.position,
        team: originalTeam,
        adp: player.adp
    });
    updateDraftHistory();
    
    // Update the player pool
    updatePlayerPool();
    
    // Add chat message
    addChatMessage(`${originalTeam} selected ${player.name} (${player.position}) - ADP: ${player.adp === 999 ? 'N/A' : player.adp}`);
    
    // Move to next pick
    currentPick++;
    if (currentPick > 144) { // 12 teams * 12 rounds
        endDraft();
    } else if (isCommissioner) {
        startDraftTimer();
    }
    
    // Update statistics after making a pick
    updateStatistics();
}

// Update draft history
function updateDraftHistory() {
    const list = document.getElementById('draftHistoryList');
    list.innerHTML = '';
    
    draftHistory.forEach(pick => {
        const li = document.createElement('li');
        li.className = 'list-group-item';
        li.textContent = `Round ${pick.round}, Pick ${pick.pick}: ${pick.team} selected ${pick.player} (${pick.position}) - ADP: ${pick.adp === 999 ? 'N/A' : pick.adp}`;
        list.appendChild(li);
    });
}

// Start the draft timer
function startDraftTimer() {
    if (draftTimer) clearInterval(draftTimer);
    
    timeRemaining = parseInt(localStorage.getItem('timerDuration')) || 60;
    updateTimerDisplay();
    
    draftTimer = setInterval(() => {
        timeRemaining--;
        updateTimerDisplay();
        
        if (timeRemaining <= 0) {
            clearInterval(draftTimer);
            // Auto-pick the next available player
            const availablePlayers = players.filter(p => !p.drafted);
            if (availablePlayers.length > 0) {
                const nextPlayer = availablePlayers[0];
                makePick(Math.floor(currentPick / 12) + 1, currentPick % 12 || 12, nextPlayer.name);
            }
        }
    }, 1000);
}

// Update timer display
function updateTimerDisplay() {
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    draftTimerDisplay.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Add chat message
function addChatMessage(message) {
    chatMessages.push({
        message,
        timestamp: new Date().toLocaleTimeString()
    });
    
    const messageElement = document.createElement('div');
    messageElement.className = 'chat-message';
    messageElement.innerHTML = `
        <small class="text-muted">${chatMessages[chatMessages.length - 1].timestamp}</small>
        <div>${message}</div>
    `;
    chatMessagesContainer.appendChild(messageElement);
    chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
}

// Send chat message
function sendChatMessage() {
    const message = chatInput.value.trim();
    if (message) {
        addChatMessage(`You: ${message}`);
        chatInput.value = '';
    }
}

// Export draft results
function exportDraftResults() {
    const data = {
        draftHistory,
        teamRosters: Array.from(document.querySelectorAll('.card-body ul')).map(ul => ({
            team: ul.id,
            players: Array.from(ul.children).map(li => li.textContent)
        }))
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
    if (confirm('Are you sure you want to reset the draft? This will clear all picks and history.')) {
        players.forEach(player => player.drafted = false);
        draftHistory = [];
        currentPick = 1;
        initializeDraftBoard();
        updatePlayerPool();
        initializeTeamRosters();
        updateDraftHistory();
        chatMessages = [];
        chatMessagesContainer.innerHTML = '';
        startDraftTimer();
    }
}

// Initialize statistics
function initializeStatistics() {
    // Position distribution chart
    const positionCtx = document.getElementById('positionChart').getContext('2d');
    positionChart = new Chart(positionCtx, {
        type: 'pie',
        data: {
            labels: ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'],
            datasets: [{
                data: [0, 0, 0, 0, 0, 0],
                backgroundColor: [
                    '#FF6384',
                    '#36A2EB',
                    '#FFCE56',
                    '#4BC0C0',
                    '#9966FF',
                    '#FF9F40'
                ]
            }]
        }
    });

    // Team distribution chart
    const teamCtx = document.getElementById('teamChart').getContext('2d');
    teamChart = new Chart(teamCtx, {
        type: 'bar',
        data: {
            labels: availableTeams,
            datasets: [{
                label: 'Players Drafted',
                data: availableTeams.map(() => 0),
                backgroundColor: '#36A2EB'
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });

    updateStatistics();
}

// Update statistics
function updateStatistics() {
    // Update position distribution
    const positionCounts = {
        QB: 0, RB: 0, WR: 0, TE: 0, K: 0, DEF: 0
    };
    
    draftHistory.forEach(pick => {
        positionCounts[pick.position]++;
    });
    
    positionChart.data.datasets[0].data = Object.values(positionCounts);
    positionChart.update();

    // Update team distribution
    const teamCounts = {};
    availableTeams.forEach(team => {
        teamCounts[team] = draftHistory.filter(pick => pick.team === team).length;
    });
    
    teamChart.data.datasets[0].data = Object.values(teamCounts);
    teamChart.update();

    // Update draft progress
    const progress = (draftHistory.length / 144) * 100;
    const progressBar = document.getElementById('draftProgress');
    progressBar.style.width = `${progress}%`;
    progressBar.setAttribute('aria-valuenow', progress);
    
    document.getElementById('draftProgressText').textContent = 
        `${draftHistory.length} of 144 picks completed (${Math.round(progress)}%)`;
}

// Export draft board
function exportDraftBoard() {
    const rows = Array.from(draftBoard.querySelectorAll('tbody tr')).map(row => {
        return Array.from(row.cells).map(cell => cell.textContent.trim());
    });
    
    const csv = [
        ['Round', 'Pick', 'Team', 'Player', 'Position', 'Original Owner', 'ADP'],
        ...rows
    ].map(row => row.join(',')).join('\n');
    
    downloadCSV(csv, 'draft-board.csv');
}

// Export player pool
function exportPlayerPool() {
    const filteredPlayers = players.filter(p => !p.drafted);
    const csv = [
        ['Player', 'Position', 'NFL Team', 'Original Owner', 'ADP'],
        ...filteredPlayers.map(p => [
            p.name,
            p.position,
            p.nflTeam,
            p.originalOwner,
            p.adp
        ])
    ].map(row => row.join(',')).join('\n');
    
    downloadCSV(csv, 'player-pool.csv');
}

// Export team rosters
function exportTeamRosters() {
    const rosters = {};
    availableTeams.forEach(team => {
        const roster = document.getElementById(`team${team}Roster`);
        if (roster) {
            rosters[team] = Array.from(roster.children).map(li => li.textContent);
        }
    });
    
    const csv = Object.entries(rosters).map(([team, players]) => {
        return [team, ...players].join(',');
    }).join('\n');
    
    downloadCSV(csv, 'team-rosters.csv');
}

// Export draft history
function exportDraftHistory() {
    const csv = [
        ['Round', 'Pick', 'Team', 'Player', 'Position', 'Original Owner', 'ADP'],
        ...draftHistory.map(pick => [
            pick.round,
            pick.pick,
            pick.team,
            pick.player,
            pick.position,
            pick.originalOwner,
            pick.adp
        ])
    ].map(row => row.join(',')).join('\n');
    
    downloadCSV(csv, 'draft-history.csv');
}

// Download CSV helper
function downloadCSV(csv, filename) {
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Print draft board
function printDraftBoard() {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
            <head>
                <title>Draft Board</title>
                <style>
                    table { border-collapse: collapse; width: 100%; }
                    th, td { border: 1px solid black; padding: 8px; text-align: left; }
                    th { background-color: #f2f2f2; }
                </style>
            </head>
            <body>
                <h1>Draft Board</h1>
                ${draftBoard.outerHTML}
            </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
}

// Clear chat
function clearChat() {
    if (confirm('Are you sure you want to clear the chat history?')) {
        chatMessages = [];
        chatMessagesContainer.innerHTML = '';
    }
}

// Search draft history
function searchDraftHistory() {
    const searchTerm = document.getElementById('historySearch').value.toLowerCase();
    const filteredHistory = draftHistory.filter(pick => 
        pick.player.toLowerCase().includes(searchTerm) ||
        pick.team.toLowerCase().includes(searchTerm) ||
        pick.position.toLowerCase().includes(searchTerm)
    );
    
    updateDraftHistory(filteredHistory);
}

// Make pick from player pool
function makePickFromPool(playerName) {
    const currentRound = Math.floor(currentPick / 12) + 1;
    const currentPickInRound = currentPick % 12 || 12;
    makePick(currentRound, currentPickInRound, playerName);
}

// Setup event listeners
function setupEventListeners() {
    // User selection
    document.querySelectorAll('[data-role]').forEach(button => {
        button.addEventListener('click', () => {
            handleUserSelection(button.dataset.role);
        });
    });
    
    // Make pick buttons
    document.querySelectorAll('.make-pick').forEach(button => {
        button.addEventListener('click', () => {
            const round = button.dataset.round;
            const pick = button.dataset.pick;
            const originalTeam = draftOrder[`${round}-${pick}`];
            
            // Check if user is authorized to make this pick
            if (!isCommissioner && currentUser !== originalTeam) {
                alert('You are not authorized to make this pick');
                return;
            }
            
            const availablePlayers = players.filter(p => !p.drafted);
            
            const select = document.getElementById('playerSelect');
            select.innerHTML = '';
            availablePlayers.forEach(player => {
                const option = document.createElement('option');
                option.value = player.name;
                option.textContent = `${player.name} (${player.position}) - ADP: ${player.adp === 999 ? 'N/A' : player.adp}`;
                select.appendChild(option);
            });
            
            document.getElementById('makePickBtn').onclick = () => {
                makePick(round, pick, select.value);
                pickModal.hide();
            };
            
            pickModal.show();
        });
    });
    
    // Player search and filter
    playerSearch.addEventListener('input', updatePlayerPool);
    positionFilter.addEventListener('change', updatePlayerPool);
    
    // Chat
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendChatMessage();
        }
    });
    
    // Settings (commissioner only)
    settingsBtn.addEventListener('click', () => {
        if (isCommissioner) {
            settingsModal.show();
        }
    });
    
    document.getElementById('saveSettingsBtn').addEventListener('click', saveDraftSettings);
    
    // Export and Reset buttons
    document.getElementById('exportBtn').addEventListener('click', exportDraftResults);
    document.getElementById('resetBtn').addEventListener('click', () => {
        if (isCommissioner) {
            resetDraft();
        } else {
            alert('Only the commissioner can reset the draft');
        }
    });
    
    // Export buttons
    document.getElementById('exportBoardBtn').addEventListener('click', exportDraftBoard);
    document.getElementById('exportPoolBtn').addEventListener('click', exportPlayerPool);
    document.getElementById('exportRostersBtn').addEventListener('click', exportTeamRosters);
    document.getElementById('exportHistoryBtn').addEventListener('click', exportDraftHistory);
    
    // Print button
    document.getElementById('printBoardBtn').addEventListener('click', printDraftBoard);
    
    // Clear chat button
    document.getElementById('clearChatBtn').addEventListener('click', clearChat);
    
    // Search and sort
    document.getElementById('historySearch').addEventListener('input', searchDraftHistory);
    document.getElementById('sortBy').addEventListener('change', updatePlayerPool);
}

// End draft
function endDraft() {
    clearInterval(draftTimer);
    addChatMessage('Draft completed!');
    alert('Draft completed! You can now export the results.');
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', initializeDraft); 