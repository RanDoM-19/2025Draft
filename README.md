# Sleeper League Distribution Draft Analyzer

This tool helps you analyze and prepare for a distribution draft in your Sleeper fantasy football league. It pulls data directly from Sleeper's API and generates comprehensive reports.

## Features

- Pulls all league data automatically from Sleeper
- Analyzes all teams, players, and draft picks
- Generates a detailed draft board
- Creates a CSV export of all assets
- Focuses on 2025 and 2026 draft picks
- Organizes players by position
- Calculates estimated draft rounds

## Prerequisites

- Node.js installed on your computer
- Your Sleeper League ID

## Installation

1. Make sure you have Node.js installed
2. Download both files:
   - `sleeper-analyzer.js`
   - `README.md`

## Usage

1. Open a terminal/command prompt
2. Navigate to the directory containing the script
3. Run the script:
   ```bash
   node sleeper-analyzer.js
   ```

The script will:
1. Connect to Sleeper's API
2. Pull all league data
3. Generate two files:
   - `draft_board.txt`: Complete draft board with team breakdowns
   - `distribution_assets.csv`: Spreadsheet-friendly export of all assets

## Setting Up the Distribution Draft in Sleeper

After running the script:

1. Create a new "Startup/Rookie" draft in Sleeper
2. Set the number of rounds based on the estimated rounds in the draft board
3. Use snake draft format
4. Set a 3-5 minute timer per pick
5. Manually add all players from the draft board to the player pool

## Notes

- The script only includes 2025 and 2026 draft picks
- 2027+ picks remain with their original teams
- All players are included in the distribution
- Teams are sorted by total assets

## Troubleshooting

If you encounter any errors:
1. Verify your league ID is correct
2. Check your internet connection
3. Ensure you have Node.js installed
4. Make sure you have write permissions in the directory

## Support

For any issues or questions, please open an issue in the repository.

# Distribution Draft Board

A modern web application for managing fantasy football distribution drafts. Built with HTML, CSS, and JavaScript, this application provides a user-friendly interface for conducting distribution drafts with features like real-time timers, team needs analysis, and draft history tracking.

## Features

- Real-time draft timer with auto-pick functionality
- Advanced player search and filtering
- Team needs analysis
- Draft history tracking with undo capability
- Real-time draft chat
- Dark mode support
- Mobile-responsive design
- Export draft results
- Customizable settings

## Setup

1. Clone the repository:
```bash
git clone [your-repository-url]
```

2. Open `index.html` in your web browser or host it on a web server.

## Usage

1. The draft board will automatically load with the configured teams and rounds.
2. Use the search and filter options to find players.
3. Click the "Draft" button to make a selection.
4. Use the chat feature to communicate with other drafters.
5. Export the draft results when finished.

## Configuration

You can customize the draft settings by clicking the gear icon in the top right:
- Timer duration
- Draft order
- View options

## Contributing

Feel free to submit issues and enhancement requests! 