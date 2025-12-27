// Main application logic
const app = {
    currentSort: 'matchesWon',
    sortDirection: 'desc',
    leaderboardData: [],

    init() {
        this.setupEventListeners();
        this.loadLeaderboard();
    },

    setupEventListeners() {
        const refreshBtn = document.getElementById('refreshBtn');
        refreshBtn.addEventListener('click', () => this.loadLeaderboard());

        // Add sort listeners to table headers
        document.querySelectorAll('th.sortable').forEach(header => {
            header.addEventListener('click', () => {
                const sortKey = header.dataset.sort;
                this.sortBy(sortKey);
            });
        });
    },

    async loadLeaderboard() {
        this.showLoading();
        this.hideError();

        try {
            // Fetch both standings and setup data in parallel
            const [standings, setup] = await Promise.all([
                this.fetchStandingsData(),
                this.fetchSetupData()
            ]);

            this.leaderboardData = standings;
            this.renderLeaderboard();
            this.renderPrizes(setup);
            this.updateLastRefreshedTime();
        } catch (error) {
            this.showError(error.message);
            console.error('Error loading leaderboard:', error);
        } finally {
            this.hideLoading();
        }
    },

    sortBy(key) {
        // Toggle direction if clicking the same column
        if (this.currentSort === key) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.currentSort = key;
            this.sortDirection = 'desc'; // Default to descending for new column
        }

        this.renderLeaderboard();
        this.updateSortIndicators();
    },

    async fetchStandingsData() {
        if (!window.GOOGLE_SHEET_CONFIG) {
            throw new Error('Google Sheet configuration not found. Please set up config.js');
        }

        const { STANDINGS_URL } = window.GOOGLE_SHEET_CONFIG;

        if (!STANDINGS_URL) {
            throw new Error('Missing STANDINGS_URL in config.js');
        }

        const response = await fetch(STANDINGS_URL);

        if (!response.ok) {
            throw new Error(`Failed to fetch standings: ${response.status} ${response.statusText}`);
        }

        const csvText = await response.text();
        return this.parseStandingsCSV(csvText);
    },

    async fetchSetupData() {
        if (!window.GOOGLE_SHEET_CONFIG) {
            throw new Error('Google Sheet configuration not found. Please set up config.js');
        }

        const { SETUP_URL } = window.GOOGLE_SHEET_CONFIG;

        if (!SETUP_URL) {
            throw new Error('Missing SETUP_URL in config.js');
        }

        const response = await fetch(SETUP_URL);

        if (!response.ok) {
            throw new Error(`Failed to fetch setup: ${response.status} ${response.statusText}`);
        }

        const csvText = await response.text();
        return this.parseSetupCSV(csvText);
    },

    parseStandingsCSV(csvText) {
        const lines = csvText.trim().split('\n');

        if (lines.length < 4) {
            throw new Error('No data found in the CSV');
        }

        // Skip first 3 rows: "STANDINGS", empty row, and header row
        const dataRows = lines.slice(3);

        return dataRows.map(line => {
            // Simple CSV parsing - handles quoted fields
            const row = this.parseCSVLine(line);

            // CSV columns: Rank, Player, Wins, Losses, Points For, Points Against, Point Diff
            const wins = parseInt(row[2]) || 0;
            const losses = parseInt(row[3]) || 0;
            const totalGames = wins + losses;
            const winRate = totalGames > 0 ? ((wins / totalGames) * 100).toFixed(0) + '%' : '0%';

            return {
                player: row[1] || 'Unknown',
                matchesWon: wins,
                matchesLost: losses,
                winRate: winRate
            };
        }).filter(player => player.player !== 'Unknown' && player.player.trim() !== '');
    },

    parseSetupCSV(csvText) {
        const lines = csvText.trim().split('\n');
        const prizes = {
            '1st': 0,
            '2nd': 0,
            '3rd': 0
        };

        lines.forEach(line => {
            const row = this.parseCSVLine(line);
            // Prize data is in columns D and E (indices 3 and 4)
            const place = row[3]?.trim().toLowerCase();
            const prizeValue = row[4]?.trim();

            // Look for 1st, 2nd, 3rd in the Place column
            if (place === '1st' && prizeValue) {
                prizes['1st'] = this.parseCurrency(prizeValue);
            } else if (place === '2nd' && prizeValue) {
                prizes['2nd'] = this.parseCurrency(prizeValue);
            } else if (place === '3rd' && prizeValue) {
                prizes['3rd'] = this.parseCurrency(prizeValue);
            }
        });

        // Calculate total prize pool
        prizes.total = prizes['1st'] + prizes['2nd'] + prizes['3rd'];

        return prizes;
    },

    parseCurrency(value) {
        // Remove $ and any other non-numeric characters except decimal point
        const cleaned = value.replace(/[^0-9.]/g, '');
        return parseFloat(cleaned) || 0;
    },

    renderPrizes(prizes) {
        document.getElementById('prizePoolAmount').textContent = `$${prizes.total}`;
        document.getElementById('prize1st').textContent = `$${prizes['1st']}`;
        document.getElementById('prize2nd').textContent = `$${prizes['2nd']}`;
        document.getElementById('prize3rd').textContent = `$${prizes['3rd']}`;
    },

    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }

        result.push(current.trim());
        return result;
    },

    renderLeaderboard() {
        const tbody = document.getElementById('leaderboardBody');
        tbody.innerHTML = '';

        // Create a copy of data for sorting
        const sortedData = [...this.leaderboardData];

        // Sort based on current sort key and direction
        sortedData.sort((a, b) => {
            let aVal = a[this.currentSort];
            let bVal = b[this.currentSort];

            // Handle different data types
            if (this.currentSort === 'player') {
                // String comparison
                aVal = aVal.toLowerCase();
                bVal = bVal.toLowerCase();
                return this.sortDirection === 'asc'
                    ? aVal.localeCompare(bVal)
                    : bVal.localeCompare(aVal);
            } else if (this.currentSort === 'winRate') {
                // Parse percentage
                aVal = parseFloat(aVal) || 0;
                bVal = parseFloat(bVal) || 0;
            }

            // Numeric comparison
            return this.sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
        });

        sortedData.forEach((player, index) => {
            const row = document.createElement('tr');

            const rank = index + 1;
            const winRateValue = parseFloat(player.winRate);
            const winRateClass = this.getWinRateClass(winRateValue);

            row.innerHTML = `
                <td class="rank">${rank}</td>
                <td class="player-name">${this.escapeHtml(player.player)}</td>
                <td>${player.matchesWon}</td>
                <td>${player.matchesLost}</td>
                <td class="win-rate ${winRateClass}">${player.winRate}</td>
            `;

            tbody.appendChild(row);
        });
    },

    updateSortIndicators() {
        // Remove active class and arrows from all headers
        document.querySelectorAll('th.sortable').forEach(header => {
            header.classList.remove('active');
            const arrow = header.querySelector('.sort-arrow');
            arrow.textContent = '';
        });

        // Add active class and arrow to current sort column
        const activeHeader = document.querySelector(`th[data-sort="${this.currentSort}"]`);
        if (activeHeader) {
            activeHeader.classList.add('active');
            const arrow = activeHeader.querySelector('.sort-arrow');
            arrow.textContent = this.sortDirection === 'asc' ? '\u25B2' : '\u25BC';
        }
    },

    getWinRateClass(winRate) {
        if (winRate >= 60) return 'high';
        if (winRate >= 40) return 'medium';
        return 'low';
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    updateLastRefreshedTime() {
        const lastUpdatedEl = document.getElementById('lastUpdated');
        const now = new Date();
        lastUpdatedEl.textContent = `Last updated: ${now.toLocaleString()}`;
    },

    showLoading() {
        document.getElementById('loading').classList.remove('hidden');
    },

    hideLoading() {
        document.getElementById('loading').classList.add('hidden');
    },

    showError(message) {
        const errorEl = document.getElementById('error');
        errorEl.textContent = `Error: ${message}`;
        errorEl.classList.remove('hidden');
    },

    hideError() {
        document.getElementById('error').classList.add('hidden');
    }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => app.init());
