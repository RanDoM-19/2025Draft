// Add Chart.js for statistics
function loadChartJS() {
    return new Promise((resolve, reject) => {
        if (typeof Chart !== 'undefined') {
            resolve();
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Chart.js'));
        document.head.appendChild(script);
    });
}

// Constants
const CONSTANTS = {
    TOTAL_ROUNDS: 10,  // 5 rounds for 2025 + 5 rounds for 2026
    TEAMS_PER_ROUND: 4, // 4 teams in the draft
    TOTAL_PICKS: 40,    // 10 rounds * 4 teams
    DEFAULT_TIMER: 60,
    MAX_TIMER: 300,
    MIN_TIMER: 30,
    DEFAULT_ADP: 999,
    AUTO_REFRESH_INTERVAL: 5000, // 5 seconds
    CHART_COLORS: {
        QB: '#FF6384',
        RB: '#36A2EB',
        WR: '#FFCE56',
        TE: '#4BC0C0',
        K: '#9966FF',
        DEF: '#FF9F40',
        PICK: '#FF9F40'  // Color for draft picks
    }
};

// Available teams
const availableTeams = ['94Sleeper', 'samdecker', 'JoshAllenFuksUrTeam', 'NibsArmy'];

// Global variables with error checking
let players = [];
let currentPick = 1;
let draftTimer = null;
let timeRemaining = 0;
let draftHistory = [];
let chatMessages = [];
let currentUser = null;
let isCommissioner = false;
let isLiveDraft = true; // Enable live drafting mode

// Define the actual draft picks as draftable assets
const draftPicks = [
    // 2025 Draft Picks
    { name: '2025 1st Rd - 1.01', position: 'PICK', nflTeam: '94Sleeper', originalOwner: '94Sleeper', adp: 101 },
    { name: '2025 1st Rd - 1.02', position: 'PICK', nflTeam: 'NibsArmy', originalOwner: 'NibsArmy', adp: 102 },
    { name: '2025 2nd Rd - 2.12', position: 'PICK', nflTeam: 'samdecker', originalOwner: 'connormolloy34', adp: 212 },
    { name: '2025 2nd Rd - 2.04', position: 'PICK', nflTeam: 'JoshAllenFuksUrTeam', originalOwner: 'JoshAllenFuksUrTeam', adp: 204 },
    { name: '2025 2nd Rd - 2.05', position: 'PICK', nflTeam: 'NibsArmy', originalOwner: 'npizz24', adp: 205 },
    { name: '2025 3rd Rd - 3.12', position: 'PICK', nflTeam: 'samdecker', originalOwner: 'connormolloy34', adp: 312 },
    { name: '2025 3rd Rd - 3.11', position: 'PICK', nflTeam: 'samdecker', originalOwner: 'EricM14', adp: 311 },
    { name: '2025 3rd Rd - 3.10', position: 'PICK', nflTeam: 'NibsArmy', originalOwner: 'Augeller24', adp: 310 },
    { name: '2025 3rd Rd - 3.07', position: 'PICK', nflTeam: '94Sleeper', originalOwner: 'samdecker', adp: 307 },
    { name: '2025 3rd Rd - 3.05', position: 'PICK', nflTeam: 'NibsArmy', originalOwner: 'npizz24', adp: 305 },
    { name: '2025 3rd Rd - 3.04', position: 'PICK', nflTeam: 'JoshAllenFuksUrTeam', originalOwner: 'JoshAllenFuksUrTeam', adp: 304 },
    { name: '2025 3rd Rd - 3.01', position: 'PICK', nflTeam: '94Sleeper', originalOwner: '94Sleeper', adp: 301 },
    { name: '2025 4th Rd - 4.01', position: 'PICK', nflTeam: '94Sleeper', originalOwner: '94Sleeper', adp: 401 },
    { name: '2025 4th Rd - 4.04', position: 'PICK', nflTeam: 'JoshAllenFuksUrTeam', originalOwner: 'JoshAllenFuksUrTeam', adp: 404 },
    { name: '2025 5th Rd - 5.01', position: 'PICK', nflTeam: '94Sleeper', originalOwner: '94Sleeper', adp: 501 },
    { name: '2025 5th Rd - 5.02', position: 'PICK', nflTeam: 'NibsArmy', originalOwner: 'NibsArmy', adp: 502 },
    { name: '2025 5th Rd - 5.04', position: 'PICK', nflTeam: 'JoshAllenFuksUrTeam', originalOwner: 'JoshAllenFuksUrTeam', adp: 504 },
    { name: '2025 5th Rd - 5.06', position: 'PICK', nflTeam: 'NibsArmy', originalOwner: 'TommyFink', adp: 506 },
    { name: '2025 5th Rd - 5.07', position: 'PICK', nflTeam: 'NibsArmy', originalOwner: 'samdecker', adp: 507 },
    
    // 2026 Draft Picks
    { name: '2026 1st Rd', position: 'PICK', nflTeam: '94Sleeper', originalOwner: '94Sleeper', adp: 601 },
    { name: '2026 1st Rd', position: 'PICK', nflTeam: 'NibsArmy', originalOwner: 'NibsArmy', adp: 602 },
    { name: '2026 1st Rd', position: 'PICK', nflTeam: 'JoshAllenFuksUrTeam', originalOwner: 'EricM14', adp: 603 },
    { name: '2026 1st Rd', position: 'PICK', nflTeam: 'JoshAllenFuksUrTeam', originalOwner: 'JoshAllenFuksUrTeam', adp: 604 },
    { name: '2026 2nd Rd', position: 'PICK', nflTeam: '94Sleeper', originalOwner: 'samdecker', adp: 701 },
    { name: '2026 2nd Rd', position: 'PICK', nflTeam: '94Sleeper', originalOwner: '94Sleeper', adp: 702 },
    { name: '2026 2nd Rd', position: 'PICK', nflTeam: 'samdecker', originalOwner: 'npizz24', adp: 703 },
    { name: '2026 2nd Rd', position: 'PICK', nflTeam: 'samdecker', originalOwner: 'lilwolfman14', adp: 704 },
    { name: '2026 2nd Rd', position: 'PICK', nflTeam: 'JoshAllenFuksUrTeam', originalOwner: 'JoshAllenFuksUrTeam', adp: 705 },
    { name: '2026 3rd Rd', position: 'PICK', nflTeam: '94Sleeper', originalOwner: '94Sleeper', adp: 801 },
    { name: '2026 3rd Rd', position: 'PICK', nflTeam: 'NibsArmy', originalOwner: 'NibsArmy', adp: 802 },
    { name: '2026 3rd Rd', position: 'PICK', nflTeam: 'samdecker', originalOwner: 'samdecker', adp: 803 },
    { name: '2026 3rd Rd', position: 'PICK', nflTeam: 'JoshAllenFuksUrTeam', originalOwner: 'JoshAllenFuksUrTeam', adp: 804 },
    { name: '2026 4th Rd', position: 'PICK', nflTeam: '94Sleeper', originalOwner: '94Sleeper', adp: 901 },
    { name: '2026 4th Rd', position: 'PICK', nflTeam: 'NibsArmy', originalOwner: 'JoshAllenFuksUrTeam', adp: 902 },
    { name: '2026 4th Rd', position: 'PICK', nflTeam: 'NibsArmy', originalOwner: 'TommyFink', adp: 903 },
    { name: '2026 5th Rd', position: 'PICK', nflTeam: '94Sleeper', originalOwner: '94Sleeper', adp: 1001 },
    { name: '2026 5th Rd', position: 'PICK', nflTeam: 'JoshAllenFuksUrTeam', originalOwner: 'JustinBondi', adp: 1002 },
    { name: '2026 5th Rd', position: 'PICK', nflTeam: 'JoshAllenFuksUrTeam', originalOwner: 'JoshAllenFuksUrTeam', adp: 1003 },
    { name: '2026 5th Rd', position: 'PICK', nflTeam: 'samdecker', originalOwner: 'samdecker', adp: 1004 }
];

// Global variables with error checking
let positionChart = null;
let teamChart = null;
let isInitialized = false;

// DOM Elements with error checking
const DOM = {
    draftBoard: document.getElementById('draftBoard'),
    playerPool: document.getElementById('playerPool'),
    teamRosters: document.getElementById('teamRosters'),
    draftTimerDisplay: document.getElementById('draftTimer'),
    chatMessagesContainer: document.getElementById('chatMessages'),
    chatInput: document.getElementById('chatInput'),
    playerSearch: document.getElementById('playerSearch'),
    positionFilter: document.getElementById('positionFilter'),
    draftHistoryList: document.getElementById('draftHistoryList'),
    currentUserDisplay: document.getElementById('currentUser'),
    settingsBtn: document.getElementById('settingsBtn'),
    historySearch: document.getElementById('historySearch'),
    sortBy: document.getElementById('sortBy')
};

// Initialize Bootstrap modals with error handling
const MODALS = {
    settings: new bootstrap.Modal(document.getElementById('settingsModal')),
    pick: new bootstrap.Modal(document.getElementById('pickModal')),
    userSelection: new bootstrap.Modal(document.getElementById('userSelectionModal'))
};

// Error handling utility
const ErrorHandler = {
    log: (error, context) => {
        console.error(`Error in ${context}:`, error);
        // Could add error reporting service here
    },
    show: (message) => {
        alert(`Error: ${message}`);
    }
};

// Storage utility
const Storage = {
    get: (key, defaultValue = null) => {
        try {
            const value = localStorage.getItem(key);
            return value ? JSON.parse(value) : defaultValue;
        } catch (error) {
            ErrorHandler.log(error, 'Storage.get');
            return defaultValue;
        }
    },
    set: (key, value) => {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            ErrorHandler.log(error, 'Storage.set');
            return false;
        }
    }
};

// Add auto-refresh functionality
let autoRefreshInterval = null;

// Initialize the application with error handling
async function initializeDraft() {
    console.log('Starting draft initialization...');
    
    if (isInitialized) {
        console.warn('Draft already initialized');
        return;
    }

    try {
        // Load Chart.js first
        console.log('Loading Chart.js...');
        await loadChartJS();
        console.log('Chart.js loaded successfully');

        // Verify DOM elements
        console.log('Verifying DOM elements...');
        const missingElements = Object.entries(DOM)
            .filter(([_, element]) => !element)
            .map(([name]) => name);
            
        if (missingElements.length > 0) {
            throw new Error(`Missing DOM elements: ${missingElements.join(', ')}`);
        }

        // Verify modals
        console.log('Verifying modals...');
        const missingModals = Object.entries(MODALS)
            .filter(([_, modal]) => !modal)
            .map(([name]) => name);
            
        if (missingModals.length > 0) {
            throw new Error(`Missing modals: ${missingModals.join(', ')}`);
        }

        // Initialize event listeners first
        console.log('Setting up event listeners...');
        setupEventListeners();
        
        // Load draft settings first to ensure draft order is set
        console.log('Loading draft settings...');
        loadDraftSettings();
        
        // Show user selection modal
        console.log('Showing user selection modal...');
        MODALS.userSelection.show();
        
        // Start auto-refresh for live updates
        startAutoRefresh();
        
        // Load players from CSV with timeout
        console.log('Loading player data...');
        const loadTimeout = setTimeout(() => {
            ErrorHandler.show('Loading players timed out. Please refresh the page.');
        }, 10000);

        try {
            // First try to load from localStorage backup
            const backupPlayers = Storage.get('backupPlayers');
            if (backupPlayers && backupPlayers.length > 0) {
                console.log('Loading players from backup...');
                players = backupPlayers;
                console.log(`Loaded ${players.length} players from backup`);
            } else {
                console.log('No backup found, loading from CSV files...');
                
                // Load CSV files with correct paths
                const playerPoolPath = 'google_sheets_player_pool.csv';
                const adpPath = 'Adp startup Apr 24 - Sep 05.csv';
                
                console.log('Attempting to load files:', { playerPoolPath, adpPath });
                
                const [playerPoolResponse, adpResponse] = await Promise.all([
                    fetch(playerPoolPath).catch(error => {
                        console.error('Error loading player pool:', error);
                        throw new Error(`Failed to load player pool: ${error.message}`);
                    }),
                    fetch(adpPath).catch(error => {
                        console.error('Error loading ADP data:', error);
                        throw new Error(`Failed to load ADP data: ${error.message}`);
                    })
                ]);

                if (!playerPoolResponse.ok) {
                    console.error(`Player pool file not found: ${playerPoolPath}`);
                    throw new Error(`Failed to load player pool: ${playerPoolResponse.status} ${playerPoolResponse.statusText}`);
                }
                
                if (!adpResponse.ok) {
                    console.error(`ADP file not found: ${adpPath}`);
                    throw new Error(`Failed to load ADP data: ${adpResponse.status} ${adpResponse.statusText}`);
                }
                
                const playerPoolText = await playerPoolResponse.text();
                const adpText = await adpResponse.text();
                
                if (!playerPoolText || !adpText) {
                    throw new Error('One or both CSV files are empty');
                }
                
                console.log('CSV files loaded successfully');
                console.log('Player pool text length:', playerPoolText.length);
                console.log('ADP text length:', adpText.length);
                
                // Parse and merge player data with ADP
                players = parseAndMergePlayerData(playerPoolText, adpText);
                
                if (players.length === 0) {
                    throw new Error('No players loaded from CSV files');
                }
                
                console.log(`Successfully loaded ${players.length} players`);
                
                // Save backup
                Storage.set('backupPlayers', players);
            }
        } catch (error) {
            clearTimeout(loadTimeout);
            throw error;
        }
        
        // Initialize the draft board
        console.log('Initializing draft board...');
        initializeDraftBoard();
        
        // Initialize the player pool
        console.log('Initializing player pool...');
        updatePlayerPool();
        
        // Initialize team rosters
        console.log('Initializing team rosters...');
        initializeTeamRosters();
        
        // Initialize statistics
        console.log('Initializing statistics...');
        initializeStatistics();
        
        isInitialized = true;
        console.log('Draft initialized successfully');
    } catch (error) {
        ErrorHandler.log(error, 'initializeDraft');
        ErrorHandler.show(`Failed to initialize draft: ${error.message}`);
    }
}

// Parse and merge player data with ADP with error handling
function parseAndMergePlayerData(playerPoolText, adpText) {
    console.log('Parsing player data...');
    try {
        // Validate input
        if (!playerPoolText || !adpText) {
            throw new Error('Missing input data (player pool or ADP file failed to load)');
        }

        const playerPoolLines = playerPoolText.split('\n').filter(line => line.trim());
        const adpLines = adpText.split('\n').filter(line => line.trim());
        
        console.log(`Player pool lines: ${playerPoolLines.length}`);
        console.log(`ADP lines: ${adpLines.length}`);
        
        if (playerPoolLines.length <= 1) {
            throw new Error('Player pool CSV is empty or missing header');
        }
        
        // Create ADP lookup map
        const adpMap = new Map();
        adpLines.slice(1).forEach(line => {
            const values = line.split(',').map(item => item.trim());
            if (values.length >= 4) {
                const name = values[1]; // id_name column
                const adp = parseFloat(values[3]); // adp_adp column
                if (name && !isNaN(adp)) {
                    adpMap.set(name, adp);
                }
            }
        });
        
        console.log(`ADP entries: ${adpMap.size}`);
        
        // Parse player pool and add ADP
        const parsedPlayers = playerPoolLines.slice(1).map((line, idx) => {
            if (!line.trim()) return null;
            const values = line.split(',').map(item => item.trim().replace(/^"|"$/g, ''));
            if (values.length < 4 || !values[0]) {
                console.warn(`Skipping malformed player data at line ${idx + 2}:`, line);
                return null;
            }
            const name = values[0];
            return {
                name,
                position: values[1] || 'Unknown',
                nflTeam: values[2] || 'Unknown',
                originalOwner: values[3] || 'Unknown',
                adp: adpMap.get(name) || CONSTANTS.DEFAULT_ADP,
                drafted: false,
                timestamp: new Date().toISOString()
            };
        }).filter(player => player && player.name); // Filter out empty entries
        
        console.log(`Parsed players: ${parsedPlayers.length}`);
        
        if (parsedPlayers.length === 0) {
            throw new Error('No valid players found in CSV data');
        }
        
        // Save backup of players
        Storage.set('backupPlayers', parsedPlayers);
        
        return parsedPlayers;
    } catch (error) {
        ErrorHandler.log(error, 'parseAndMergePlayerData');
        console.error('Error parsing player data:', error);
        return [];
    }
}

// Handle user selection with validation
function handleUserSelection(role) {
    if (!role || !availableTeams.includes(role) && role !== 'commish') {
        ErrorHandler.show('Invalid role selected');
        return;
    }

    console.log('User selected role:', role);
    currentUser = role;
    isCommissioner = role === 'commish';
    
    // Update UI
    DOM.currentUserDisplay.textContent = role;
    DOM.settingsBtn.style.display = isCommissioner ? 'block' : 'none';
    
    // Hide user selection modal
    MODALS.userSelection.hide();
    
    // Start the draft timer if commissioner
    if (isCommissioner) {
        startDraftTimer();
    }
    
    // Add welcome message
    addChatMessage(`${role} has joined the draft`);
    
    // Save user selection
    Storage.set('currentUser', role);
}

// Initialize the draft board with validation
function initializeDraftBoard() {
    if (!DOM.draftBoard) {
        ErrorHandler.log(new Error('Draft board element not found'), 'initializeDraftBoard');
        return;
    }

    const tbody = DOM.draftBoard.querySelector('tbody');
    if (!tbody) {
        ErrorHandler.log(new Error('Draft board tbody not found'), 'initializeDraftBoard');
        return;
    }

    tbody.innerHTML = '';
    
    // Create rounds of picks (4 picks per round)
    for (let round = 1; round <= CONSTANTS.TOTAL_ROUNDS; round++) {
        // Determine if this round should be reversed (snake draft)
        const isReversed = round % 2 === 0;
        const picks = Array.from({ length: CONSTANTS.TEAMS_PER_ROUND }, (_, i) => i + 1);
        
        if (isReversed) {
            picks.reverse();
        }
        
        picks.forEach(pick => {
            const row = document.createElement('tr');
            row.setAttribute('data-round', round);
            row.setAttribute('data-pick', pick);
            
            // Find the corresponding draft pick
            const draftPick = draftPicks.find(p => {
                const year = round <= 5 ? '2025' : '2026';
                const roundNum = round <= 5 ? round : round - 5;
                return p.name.includes(`${year} ${roundNum}${roundNum === 1 ? 'st' : roundNum === 2 ? 'nd' : roundNum === 3 ? 'rd' : 'th'} Rd`);
            });
            
            const originalTeam = draftPick ? draftPick.nflTeam : 'Unassigned';
            const isMyTeam = currentUser === originalTeam;
            const isCurrentPick = currentPick === ((round - 1) * CONSTANTS.TEAMS_PER_ROUND + pick);
            const isOnTheClock = isCurrentPick && (isCommissioner || isMyTeam);
            
            // Add appropriate classes based on team and current pick
            row.className = isMyTeam ? 'table-success' : '';
            if (isCurrentPick) {
                row.classList.add('table-primary');
                if (isOnTheClock) {
                    row.classList.add('blink');
                }
            }
            
            row.innerHTML = `
                <td>${round}</td>
                <td>${pick}</td>
                <td>${originalTeam}</td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td>
                    ${isOnTheClock ? `
                        <button class="btn btn-sm btn-primary make-pick" data-round="${round}" data-pick="${pick}">
                            Make Pick
                        </button>
                    ` : ''}
                </td>
            `;
            tbody.appendChild(row);
        });
    }
}

// Update the player pool to include draft picks
function updatePlayerPool() {
    console.log('Updating player pool...');
    
    if (!DOM.playerPool) {
        console.error('Player pool element not found');
        return;
    }

    const tbody = DOM.playerPool.querySelector('tbody');
    if (!tbody) {
        console.error('Player pool tbody not found');
        return;
    }

    // Combine players and draft picks
    const allDraftableItems = [...players, ...draftPicks];
    
    const searchTerm = DOM.playerSearch ? DOM.playerSearch.value.toLowerCase() : '';
    const positionFilterValue = DOM.positionFilter ? DOM.positionFilter.value : 'ALL';
    const sortBy = DOM.sortBy ? DOM.sortBy.value : 'adp';
    
    console.log('Filter criteria:', {
        searchTerm,
        positionFilterValue,
        sortBy
    });
    
    // Use Set for faster lookups
    const searchTerms = new Set(searchTerm.split(' ').filter(term => term.length > 0));
    
    let filteredItems = allDraftableItems.filter(item => {
        if (!item || item.drafted) {
            return false;
        }
        
        const matchesSearch = searchTerms.size === 0 || 
            Array.from(searchTerms).every(term => 
                item.name.toLowerCase().includes(term) ||
                item.position.toLowerCase().includes(term) ||
                item.nflTeam.toLowerCase().includes(term)
            );
            
        const matchesPosition = positionFilterValue === 'ALL' || item.position === positionFilterValue;
        
        return matchesSearch && matchesPosition;
    });
    
    console.log(`Filtered items: ${filteredItems.length}`);
    
    // Sort items with optimization
    filteredItems.sort((a, b) => {
        switch (sortBy) {
            case 'adp':
                return a.adp - b.adp;
            case 'name':
                return a.name.localeCompare(b.name);
            case 'position':
                return a.position.localeCompare(b.position) || a.name.localeCompare(b.name);
            default:
                return 0;
        }
    });
    
    // Use DocumentFragment for better performance
    const fragment = document.createDocumentFragment();
    
    filteredItems.forEach(item => {
        const row = document.createElement('tr');
        const isDrafted = item.drafted;
        const isMyTeam = currentUser === item.nflTeam;
        
        // Add appropriate class based on draft status
        if (isDrafted) {
            row.className = isMyTeam ? 'table-success' : 'table-danger';
        }
        
        row.innerHTML = `
            <td>${item.name}</td>
            <td>${item.position}</td>
            <td>${item.nflTeam}</td>
            <td>${item.originalOwner}</td>
            <td>${item.adp === CONSTANTS.DEFAULT_ADP ? 'N/A' : item.adp}</td>
            <td>
                ${!isDrafted && (isCommissioner || isMyTeam) ? `
                    <button class="btn btn-sm btn-primary" onclick="makePickFromPool('${item.name}')">
                        Draft
                    </button>
                ` : ''}
            </td>
        `;
        fragment.appendChild(row);
    });
    
    tbody.innerHTML = '';
    tbody.appendChild(fragment);
    
    console.log('Player pool updated successfully');
}

// Initialize team rosters with validation
function initializeTeamRosters() {
    if (!DOM.teamRosters) return;

    DOM.teamRosters.innerHTML = '';
    
    availableTeams.forEach(team => {
        const teamCard = document.createElement('div');
        teamCard.className = 'col-md-4 mb-3';
        teamCard.innerHTML = `
            <div class="card">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <h5 class="mb-0">${team}</h5>
                    <span class="badge bg-primary" id="${team}PickCount">0 picks</span>
                </div>
                <div class="card-body">
                    <ul class="list-group list-group-flush" id="team${team}Roster">
                    </ul>
                </div>
            </div>
        `;
        DOM.teamRosters.appendChild(teamCard);
    });
}

// Load draft settings with validation
function loadDraftSettings() {
    console.log('Loading draft settings...');
    
    // Initialize with default draft order if none exists
    const defaultDraftOrder = {
        // 2025 Draft Picks
        '1-1': '94Sleeper',    // 1.01
        '1-2': 'NibsArmy',     // 1.02
        '2-1': '94Sleeper',    // 2.01
        '2-4': 'JoshAllenFuksUrTeam', // 2.04
        '2-5': 'NibsArmy',     // 2.05 (npizz24)
        '2-12': 'samdecker',   // 2.12 (connormolloy34)
        '3-1': '94Sleeper',    // 3.01
        '3-4': 'JoshAllenFuksUrTeam', // 3.04
        '3-5': 'NibsArmy',     // 3.05 (npizz24)
        '3-7': '94Sleeper',    // 3.07 (samdecker)
        '3-10': 'NibsArmy',    // 3.10 (Augeller24)
        '3-11': 'samdecker',   // 3.11 (EricM14)
        '3-12': 'samdecker',   // 3.12 (connormolloy34)
        '4-1': '94Sleeper',    // 4.01
        '4-4': 'JoshAllenFuksUrTeam', // 4.04
        '5-1': '94Sleeper',    // 5.01
        '5-2': 'NibsArmy',     // 5.02
        '5-4': 'JoshAllenFuksUrTeam', // 5.04
        '5-6': 'NibsArmy',     // 5.06 (TommyFink)
        '5-7': 'NibsArmy',     // 5.07 (samdecker)
        
        // 2026 Draft Picks
        '6-1': '94Sleeper',    // 2026 1st Rd
        '6-2': 'NibsArmy',     // 2026 1st Rd
        '6-3': 'JoshAllenFuksUrTeam', // 2026 1st Rd (EricM14)
        '6-4': 'JoshAllenFuksUrTeam', // 2026 1st Rd
        '7-1': '94Sleeper',    // 2026 2nd Rd (samdecker)
        '7-2': '94Sleeper',    // 2026 2nd Rd
        '7-3': 'samdecker',    // 2026 2nd Rd (npizz24)
        '7-4': 'samdecker',    // 2026 2nd Rd (lilwolfman14)
        '7-5': 'JoshAllenFuksUrTeam', // 2026 2nd Rd
        '8-1': '94Sleeper',    // 2026 3rd Rd
        '8-2': 'NibsArmy',     // 2026 3rd Rd
        '8-3': 'samdecker',    // 2026 3rd Rd
        '8-4': 'JoshAllenFuksUrTeam', // 2026 3rd Rd
        '9-1': '94Sleeper',    // 2026 4th Rd
        '9-2': 'NibsArmy',     // 2026 4th Rd (JoshAllenFuksUrTeam)
        '9-3': 'NibsArmy',     // 2026 4th Rd (TommyFink)
        '10-1': '94Sleeper',   // 2026 5th Rd
        '10-2': 'JoshAllenFuksUrTeam', // 2026 5th Rd (JustinBondi)
        '10-3': 'JoshAllenFuksUrTeam', // 2026 5th Rd
        '10-4': 'samdecker',   // 2026 5th Rd
    };

    const settings = Storage.get('draftSettings', {
        timerDuration: CONSTANTS.DEFAULT_TIMER,
        draftOrder: defaultDraftOrder
    });
    
    const timerDuration = Math.min(
        Math.max(settings.timerDuration, CONSTANTS.MIN_TIMER),
        CONSTANTS.MAX_TIMER
    );
    
    document.getElementById('timerDuration').value = timerDuration;
    timeRemaining = timerDuration;
    
    // Convert draft picks array to draft order object
    const newDraftOrder = {};
    draftPicks.forEach(pick => {
        const year = pick.name.includes('2025') ? '2025' : '2026';
        const roundMatch = pick.name.match(/(\d+)(?:st|nd|rd|th) Rd/);
        if (roundMatch) {
            const round = parseInt(roundMatch[1]);
            const roundKey = year === '2026' ? round + 5 : round;
            const pickNum = pick.adp % 100;
            newDraftOrder[`${roundKey}-${pickNum}`] = pick.nflTeam;
        }
    });
    
    draftOrder = newDraftOrder;
    
    console.log('Loaded draft order:', draftOrder);
    
    // Initialize draft order table with the loaded settings
    initializeDraftOrderTable();
    
    // Save the settings to ensure they persist
    Storage.set('draftSettings', {
        timerDuration,
        draftOrder: newDraftOrder
    });
}

// Initialize draft order table with validation
function initializeDraftOrderTable() {
    const tbody = document.querySelector('#draftOrderTable tbody');
    if (!tbody) return;

    tbody.innerHTML = '';
    
    const fragment = document.createDocumentFragment();
    
    // Only show rows for picks that exist in draftPicks
    draftPicks.forEach(pick => {
        const year = pick.name.includes('2025') ? '2025' : '2026';
        const roundMatch = pick.name.match(/(\d+)(?:st|nd|rd|th) Rd/);
        if (roundMatch) {
            const round = parseInt(roundMatch[1]);
            const roundKey = year === '2026' ? round + 5 : round;
            const pickNum = pick.adp % 100;
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${roundKey}</td>
                <td>${pickNum}</td>
                <td>
                    <select class="form-select form-select-sm" data-round="${roundKey}" data-pick="${pickNum}">
                        <option value="">Unassigned</option>
                        ${availableTeams.map(team => `
                            <option value="${team}" ${pick.nflTeam === team ? 'selected' : ''}>${team}</option>
                        `).join('')}
                    </select>
                </td>
            `;
            fragment.appendChild(row);
        }
    });
    
    tbody.appendChild(fragment);
}

// Save draft settings with validation
function saveDraftSettings() {
    const timerDuration = parseInt(document.getElementById('timerDuration').value);
    
    if (isNaN(timerDuration) || timerDuration < CONSTANTS.MIN_TIMER || timerDuration > CONSTANTS.MAX_TIMER) {
        ErrorHandler.show(`Timer duration must be between ${CONSTANTS.MIN_TIMER} and ${CONSTANTS.MAX_TIMER} seconds`);
        return;
    }
    
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
    
    // Validate draft order
    const teamPickCounts = {};
    Object.values(newDraftOrder).forEach(team => {
        teamPickCounts[team] = (teamPickCounts[team] || 0) + 1;
    });
    
    const expectedPicksPerTeam = CONSTANTS.TOTAL_ROUNDS;
    const invalidTeams = Object.entries(teamPickCounts)
        .filter(([_, count]) => count !== expectedPicksPerTeam)
        .map(([team]) => team);
    
    if (invalidTeams.length > 0) {
        ErrorHandler.show(`Invalid draft order: ${invalidTeams.join(', ')} must have exactly ${expectedPicksPerTeam} picks`);
        return;
    }
    
    // Save settings
    const settings = {
        timerDuration,
        draftOrder: newDraftOrder
    };
    
    if (!Storage.set('draftSettings', settings)) {
        ErrorHandler.show('Failed to save settings');
        return;
    }
    
    // Update global variables
    timeRemaining = timerDuration;
    draftOrder = newDraftOrder;
    
    // Update draft board
    initializeDraftBoard();
    
    // Update timer display
    updateTimerDisplay();
    
    // Hide modal
    MODALS.settings.hide();
    
    // Add chat message
    addChatMessage('Commissioner has updated draft settings');
}

// Make a draft pick with validation
function makePick(round, pick, playerName) {
    if (!playerName) {
        ErrorHandler.show('Please select a player');
        return;
    }

    // Check if user is authorized to make this pick
    const originalTeam = draftOrder[`${round}-${pick}`];
    if (!isCommissioner && currentUser !== originalTeam) {
        ErrorHandler.show('You are not authorized to make this pick');
        return;
    }
    
    const player = players.find(p => p.name === playerName) || draftPicks.find(p => p.name === playerName);
    if (!player) {
        ErrorHandler.show('Player not found');
        return;
    }
    
    if (player.drafted) {
        ErrorHandler.show('Player has already been drafted');
        return;
    }
    
    // Update the draft board
    const row = DOM.draftBoard.querySelector(`tr[data-round="${round}"][data-pick="${pick}"]`);
    if (row) {
        row.querySelector('td:nth-child(4)').textContent = player.name;
        row.querySelector('td:nth-child(5)').textContent = player.position;
        row.querySelector('td:nth-child(6)').textContent = player.originalOwner;
        row.querySelector('td:nth-child(7)').textContent = player.adp === CONSTANTS.DEFAULT_ADP ? 'N/A' : player.adp;
        
        // Add appropriate class based on team
        const isMyTeam = currentUser === originalTeam;
        row.className = isMyTeam ? 'table-success' : 'table-danger';
    }
    
    // Update the player's status
    player.drafted = true;
    player.draftTimestamp = new Date().toISOString();
    
    // Add to team roster
    const teamRoster = document.getElementById(`team${originalTeam}Roster`);
    if (teamRoster) {
        const li = document.createElement('li');
        li.className = 'list-group-item';
        li.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <strong>${player.name}</strong> (${player.position})
                    <br>
                    <small class="text-muted">ADP: ${player.adp === CONSTANTS.DEFAULT_ADP ? 'N/A' : player.adp}</small>
                </div>
                ${isCommissioner ? `
                    <button class="btn btn-sm btn-outline-danger" onclick="undoPick('${player.name}')">
                        Undo
                    </button>
                ` : ''}
            </div>
        `;
        teamRoster.appendChild(li);
        
        // Update pick count
        const pickCount = document.getElementById(`${originalTeam}PickCount`);
        if (pickCount) {
            const count = parseInt(pickCount.textContent) + 1;
            pickCount.textContent = `${count} picks`;
        }
    }
    
    // Add to draft history
    draftHistory.push({
        round,
        pick,
        player: player.name,
        position: player.position,
        team: originalTeam,
        adp: player.adp,
        timestamp: new Date().toISOString()
    });
    updateDraftHistory();
    
    // Update the player pool
    updatePlayerPool();
    
    // Add chat message
    addChatMessage(`${originalTeam} selected ${player.name} (${player.position}) - ADP: ${player.adp === CONSTANTS.DEFAULT_ADP ? 'N/A' : player.adp}`);
    
    // Move to next pick
    currentPick++;
    if (currentPick > CONSTANTS.TOTAL_PICKS) {
        endDraft();
    } else if (isCommissioner) {
        startDraftTimer();
    }
    
    // Update statistics
    updateStatistics();
    
    // Save draft state
    saveDraftState();
    
    // Update the draft board to highlight the next pick
    initializeDraftBoard();

    // Add notification for next team
    const nextPick = currentPick + 1;
    if (nextPick <= CONSTANTS.TOTAL_PICKS) {
        const nextRound = Math.floor(nextPick / CONSTANTS.TEAMS_PER_ROUND) + 1;
        const nextPickInRound = nextPick % CONSTANTS.TEAMS_PER_ROUND || CONSTANTS.TEAMS_PER_ROUND;
        const isNextReversed = nextRound % 2 === 0;
        const pickOrder = isNextReversed ? 
            [4, 3, 2, 1] : 
            [1, 2, 3, 4];
        const nextTeam = availableTeams[pickOrder.indexOf(nextPickInRound)];
        
        notifyTeam(nextTeam, `You are on the clock! Round ${nextRound}, Pick ${nextPickInRound}`);
    }
}

// Undo last pick
function undoPick(playerName) {
    if (!isCommissioner) {
        ErrorHandler.show('Only the commissioner can undo picks');
        return;
    }
    
    const lastPick = draftHistory.pop();
    if (!lastPick) {
        ErrorHandler.show('No picks to undo');
        return;
    }
    
    const player = players.find(p => p.name === playerName);
    if (player) {
        player.drafted = false;
        delete player.draftTimestamp;
    }
    
    // Update draft board
    const row = DOM.draftBoard.querySelector(`tr[data-round="${lastPick.round}"][data-pick="${lastPick.pick}"]`);
    if (row) {
        row.querySelector('td:nth-child(4)').textContent = '';
        row.querySelector('td:nth-child(5)').textContent = '';
        row.querySelector('td:nth-child(6)').textContent = '';
        row.querySelector('td:nth-child(7)').textContent = '';
    }
    
    // Update team roster
    const teamRoster = document.getElementById(`team${lastPick.team}Roster`);
    if (teamRoster) {
        const lastItem = teamRoster.lastElementChild;
        if (lastItem) {
            lastItem.remove();
        }
        
        // Update pick count
        const pickCount = document.getElementById(`${lastPick.team}PickCount`);
        if (pickCount) {
            const count = parseInt(pickCount.textContent) - 1;
            pickCount.textContent = `${count} picks`;
        }
    }
    
    // Update current pick
    currentPick--;
    
    // Update player pool
    updatePlayerPool();
    
    // Update statistics
    updateStatistics();
    
    // Add chat message
    addChatMessage(`Commissioner undid pick: ${playerName}`);
    
    // Save draft state
    saveDraftState();
}

// Save draft state
function saveDraftState() {
    const state = {
        currentPick,
        draftHistory,
        players: players.map(p => ({
            name: p.name,
            drafted: p.drafted,
            draftTimestamp: p.draftTimestamp
        }))
    };
    
    Storage.set('draftState', state);
}

// Load draft state
function loadDraftState() {
    const state = Storage.get('draftState');
    if (!state) return;
    
    currentPick = state.currentPick;
    draftHistory = state.draftHistory;
    
    // Update player drafted status
    state.players.forEach(p => {
        const player = players.find(pl => pl.name === p.name);
        if (player) {
            player.drafted = p.drafted;
            player.draftTimestamp = p.draftTimestamp;
        }
    });
    
    // Update UI
    initializeDraftBoard();
    updatePlayerPool();
    updateDraftHistory();
    updateStatistics();
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
                makePick(Math.floor(currentPick / 4) + 1, currentPick % 4 || 4, nextPlayer.name);
            }
        }
    }, 1000);
}

// Update timer display
function updateTimerDisplay() {
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    DOM.draftTimerDisplay.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
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
    DOM.chatMessagesContainer.appendChild(messageElement);
    DOM.chatMessagesContainer.scrollTop = DOM.chatMessagesContainer.scrollHeight;
}

// Send chat message
function sendChatMessage() {
    const message = DOM.chatInput.value.trim();
    if (message) {
        addChatMessage(`You: ${message}`);
        DOM.chatInput.value = '';
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
        DOM.chatMessagesContainer.innerHTML = '';
        startDraftTimer();
    }
}

// Initialize statistics with error handling
function initializeStatistics() {
    try {
        // Verify Chart.js is loaded
        if (typeof Chart === 'undefined') {
            console.error('Chart.js not loaded');
            return;
        }

        // Position distribution chart
        const positionCtx = document.getElementById('positionChart');
        if (!positionCtx) {
            console.error('Position chart canvas not found');
            return;
        }

        positionChart = new Chart(positionCtx.getContext('2d'), {
            type: 'pie',
            data: {
                labels: ['QB', 'RB', 'WR', 'TE', 'K', 'DEF', 'PICK'],
                datasets: [{
                    data: [0, 0, 0, 0, 0, 0, 0],
                    backgroundColor: [
                        CONSTANTS.CHART_COLORS.QB,
                        CONSTANTS.CHART_COLORS.RB,
                        CONSTANTS.CHART_COLORS.WR,
                        CONSTANTS.CHART_COLORS.TE,
                        CONSTANTS.CHART_COLORS.K,
                        CONSTANTS.CHART_COLORS.DEF,
                        CONSTANTS.CHART_COLORS.PICK
                    ]
                }]
            }
        });

        // Team distribution chart
        const teamCtx = document.getElementById('teamChart');
        if (!teamCtx) {
            console.error('Team chart canvas not found');
            return;
        }

        teamChart = new Chart(teamCtx.getContext('2d'), {
            type: 'bar',
            data: {
                labels: availableTeams,
                datasets: [{
                    label: 'Players Drafted',
                    data: availableTeams.map(() => 0),
                    backgroundColor: CONSTANTS.CHART_COLORS.QB
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
    } catch (error) {
        ErrorHandler.log(error, 'initializeStatistics');
        console.error('Failed to initialize statistics:', error);
    }
}

// Update statistics
function updateStatistics() {
    // Update position distribution
    const positionCounts = {
        QB: 0, RB: 0, WR: 0, TE: 0, K: 0, DEF: 0, PICK: 0
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
    const progress = (draftHistory.length / CONSTANTS.TOTAL_PICKS) * 100;
    const progressBar = document.getElementById('draftProgress');
    progressBar.style.width = `${progress}%`;
    progressBar.setAttribute('aria-valuenow', progress);
    
    document.getElementById('draftProgressText').textContent = 
        `${draftHistory.length} of ${CONSTANTS.TOTAL_PICKS} picks completed (${Math.round(progress)}%)`;
}

// Export draft board
function exportDraftBoard() {
    const rows = Array.from(DOM.draftBoard.querySelectorAll('tbody tr')).map(row => {
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
                ${DOM.draftBoard.outerHTML}
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
        DOM.chatMessagesContainer.innerHTML = '';
    }
}

// Search draft history
function searchDraftHistory() {
    const searchTerm = DOM.historySearch.value.toLowerCase();
    const filteredHistory = draftHistory.filter(pick => 
        pick.player.toLowerCase().includes(searchTerm) ||
        pick.team.toLowerCase().includes(searchTerm) ||
        pick.position.toLowerCase().includes(searchTerm)
    );
    
    updateDraftHistory(filteredHistory);
}

// Make pick from player pool
function makePickFromPool(playerName) {
    const currentRound = Math.floor(currentPick / 4) + 1;
    const currentPickInRound = currentPick % 4 || 4;
    makePick(currentRound, currentPickInRound, playerName);
}

// Setup event listeners
function setupEventListeners() {
    // User selection
    document.querySelectorAll('[data-role]').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const role = button.getAttribute('data-role');
            console.log('Button clicked, role:', role); // Debug log
            handleUserSelection(role);
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
                ErrorHandler.show('You are not authorized to make this pick');
                return;
            }
            
            const availablePlayers = players.filter(p => !p.drafted);
            
            const select = document.getElementById('playerSelect');
            select.innerHTML = '';
            availablePlayers.forEach(player => {
                const option = document.createElement('option');
                option.value = player.name;
                option.textContent = `${player.name} (${player.position}) - ADP: ${player.adp === CONSTANTS.DEFAULT_ADP ? 'N/A' : player.adp}`;
                select.appendChild(option);
            });
            
            document.getElementById('makePickBtn').onclick = () => {
                makePick(round, pick, select.value);
                MODALS.pick.hide();
            };
            
            MODALS.pick.show();
        });
    });
    
    // Player search and filter
    DOM.playerSearch.addEventListener('input', updatePlayerPool);
    DOM.positionFilter.addEventListener('change', updatePlayerPool);
    
    // Chat
    DOM.chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendChatMessage();
        }
    });
    
    // Settings (commissioner only)
    DOM.settingsBtn.addEventListener('click', () => {
        if (isCommissioner) {
            MODALS.settings.show();
        }
    });
    
    document.getElementById('saveSettingsBtn').addEventListener('click', saveDraftSettings);
    
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
    DOM.historySearch.addEventListener('input', searchDraftHistory);
    DOM.sortBy.addEventListener('change', updatePlayerPool);
    
    // Export and Reset buttons
    document.getElementById('exportBtn').addEventListener('click', exportDraftResults);
    document.getElementById('resetBtn').addEventListener('click', () => {
        if (isCommissioner) {
            resetDraft();
        } else {
            ErrorHandler.show('Only the commissioner can reset the draft');
        }
    });

    // Request notification permission
    if ('Notification' in window) {
        Notification.requestPermission();
    }
    
    // Add keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'r') {
            e.preventDefault();
            refreshDraftState();
        }
    });
}

// End draft
function endDraft() {
    clearInterval(draftTimer);
    addChatMessage('Draft completed!');
    ErrorHandler.show('Draft completed! You can now export the results.');
}

// Add auto-refresh functionality
function startAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
    }
    
    autoRefreshInterval = setInterval(() => {
        if (isLiveDraft) {
            refreshDraftState();
        }
    }, CONSTANTS.AUTO_REFRESH_INTERVAL);
}

function stopAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
    }
}

function refreshDraftState() {
    // Only refresh if we're not the commissioner and it's not our turn
    if (isCommissioner) return;
    
    const currentRound = Math.floor(currentPick / CONSTANTS.TEAMS_PER_ROUND) + 1;
    const currentPickInRound = currentPick % CONSTANTS.TEAMS_PER_ROUND || CONSTANTS.TEAMS_PER_ROUND;
    const isReversed = currentRound % 2 === 0;
    const pickOrder = isReversed ? 
        [4, 3, 2, 1] : 
        [1, 2, 3, 4];
    const currentTeam = availableTeams[pickOrder.indexOf(currentPickInRound)];
    
    if (currentTeam !== currentUser) {
        // Refresh the draft board and player pool
        initializeDraftBoard();
        updatePlayerPool();
        updateDraftHistory();
        updateStatistics();
    }
}

// Add notification system
function notifyTeam(team, message) {
    if (team === currentUser) {
        // Show browser notification if supported
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Draft Alert', {
                body: message,
                icon: '/favicon.ico'
            });
        }
        
        // Add chat message
        addChatMessage(`System: ${message}`);
    }
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', initializeDraft); 