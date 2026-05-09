const DB = {
    Transactions: 'Transactions',
    Categories: 'Categories',
    Settings: 'Settings',
    PartnerIncome: 'PartnerIncome'
};

const SheetsAPI = {
    /**
     * Fetch all transactions
     */
    async getTransactions(sheetName = DB.Transactions) {
        // Fallback to Apps Script
        if (!CONFIG.SCRIPT_URL) return [];
        
        try {
            const response = await $.ajax({
                url: CONFIG.SCRIPT_URL + '?sheet=' + sheetName,
                method: 'GET',
                dataType: 'json'
            });
            return response;
        } catch (error) {
            console.error(`Error fetching from ${sheetName}:`, error);
            return [];
        }
    },

    async getCategories() {
        if (!CONFIG.SCRIPT_URL) {
            return Object.entries(CONFIG.CATEGORIES || {}).map(([name, config]) => ({ name, ...config }));
        }

        try {
            const response = await $.ajax({
                url: CONFIG.SCRIPT_URL + '?sheet=Categories',
                method: 'GET',
                dataType: 'json'
            });
            return response.length > 0 ? response : [];
        } catch (error) {
            return [];
        }
    },

    async getSettings() {
        if (!CONFIG.SCRIPT_URL) return {};

        try {
            const response = await $.ajax({
                url: CONFIG.SCRIPT_URL + '?sheet=Settings',
                method: 'GET',
                dataType: 'json'
            });
            return response;
        } catch (error) {
            return {};
        }
    },

    /**
     * Add a new transaction
     */
    async addTransaction(data) {
        return this.postToSheet({ ...data, sheet: 'Transactions' });
    },

    async addCategory(data) {
        return this.postToSheet({ ...data, sheet: 'Categories' });
    },

    async updateSettings(data) {
        return this.postToSheet({ ...data, action: 'update_settings', sheet: 'Settings' });
    },

    async postToSheet(data) {
        if (!CONFIG.SCRIPT_URL) {
            console.warn('No Script URL. Saving locally.');
            return data.sheet === 'Transactions' ? this.saveMockData(data) : { status: 'success' };
        }

        try {
            const response = await $.ajax({
                url: CONFIG.SCRIPT_URL,
                method: 'POST',
                data: JSON.stringify(data),
                contentType: 'text/plain; charset=utf-8',
            });
            return response;
        } catch (error) {
            console.error('Error posting to sheet:', error);
            throw error;
        }
    },

    // --- Mock Data for Development ---
    getMockData() {
        const stored = localStorage.getItem('expensify_mock_data');
        if (stored) return JSON.parse(stored);
        
        const initial = [
            { id: 1, date: '2026-05-01', description: 'Grocery Shopping', category: 'Food', method: 'Cash', flow: 'Out', amount: 45.50 },
            { id: 2, date: '2026-05-02', description: 'Salary Deposit', category: 'Income', method: 'Account', flow: 'In', amount: 3200.00 },
            { id: 3, date: '2026-05-03', description: 'Gas Station', category: 'Transport', method: 'Cash', flow: 'Out', amount: 60.00 },
            { id: 4, date: '2026-05-04', description: 'Netflix Subscription', category: 'Entertainment', method: 'Account', flow: 'Out', amount: 15.99 }
        ];
        localStorage.setItem('expensify_mock_data', JSON.stringify(initial));
        return initial;
    },

    saveMockData(data) {
        const current = this.getMockData();
        const newItem = {
            id: Date.now(),
            ...data,
            amount: parseFloat(data.amount)
        };
        current.unshift(newItem);
        localStorage.setItem('expensify_mock_data', JSON.stringify(current));
        return { status: 'success', data: newItem };
    }
};
