/**
 * UI Management Logic
 */

const UI = {
    table: null,
    partnerIncomeTable: null,
    chart: null,
    categoryReportChart: null,
    trendReportChart: null,
    categoryCache: {},
    transactionCache: {},
    partnerIncomeCache: {},
    settings: {
        INITIAL_CASH: 0,
        INITIAL_BANK: 0
    },

    async init() {
        this.initDataTable();
        this.initPartnerIncomeTable();
        this.initChart();
        this.setupEventListeners();
        this.updateTheme();
        
        // Initial status
        this.setSyncStatus('Connected', 'emerald');
        
        // Await categories and settings so totals are correct on first load
        await this.loadCategories();
    },

    setSyncStatus(text, colorClass = 'slate') {
        const $status = $('#sync-status');
        $status.text(text).attr('class', `text-xs font-bold text-${colorClass}-500 transition-all`);
    },

    showLoader(show) {
        const $loader = $('#global-loader');
        if (show) {
            $loader.removeClass('hidden').addClass('flex');
        } else {
            $loader.removeClass('flex').addClass('hidden');
        }
    },

    initDataTable() {
        this.table = $('#transactionsTable').DataTable({
            responsive: true,
            order: [[0, 'desc']],
            columns: [
                { data: 'date' },
                { data: 'description' },
                { data: 'category' },
                { data: 'method' },
                { data: 'flow' },
                { data: 'amount' },
                { data: null }
            ],
            columnDefs: [
                {
                    targets: 2, // Category
                    render: function(data) {
                        const config = UI.categoryCache[data] || { icon: 'fa-circle-question', color: 'slate' };
                        return `<div class="flex items-center gap-2">
                            <div class="w-6 h-6 rounded-md bg-${config.color}-100 dark:bg-${config.color}-900/30 flex items-center justify-center text-${config.color}-500 text-[10px]">
                                <i class="fa-solid ${config.icon}"></i>
                            </div>
                            <span>${data}</span>
                        </div>`;
                    }
                },
                {
                    targets: 4, // Type (Flow)
                    render: function(data) {
                        const color = data === 'In' ? 'emerald' : 'rose';
                        return `<span class="px-2 py-1 rounded-lg bg-${color}-100 dark:bg-${color}-900/30 text-${color}-500 text-[10px] font-bold uppercase">${data}</span>`;
                    }
                },
                {
                    targets: 5, // Amount
                    render: (data, type, row) => {
                        const color = row.flow === 'In' ? 'emerald' : 'rose';
                        return `<span class="font-bold text-${color}-500">${CONFIG.CURRENCY}${parseFloat(data).toFixed(2)}</span>`;
                    }
                },
                {
                    targets: 6, // Actions
                    orderable: false,
                    render: function(data, type, row) {
                        return `<div class="flex items-center gap-2">
                            <button onclick="UI.openEditTransactionModal('${row.id}')" class="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-primary transition-colors">
                                <i class="fa-solid fa-pen-to-square text-xs"></i>
                            </button>
                            <button onclick="UI.confirmDeleteTransaction('${row.id}')" class="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-rose-500 transition-colors">
                                <i class="fa-solid fa-trash text-xs"></i>
                            </button>
                        </div>`;
                    }
                }
            ],

        });
    },

    initChart() {
        const ctx = document.getElementById('spendingChart').getContext('2d');
        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Daily Spending',
                    data: [],
                    borderColor: '#6366f1',
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    fill: true,
                    tension: 0.4,
                    borderWidth: 3,
                    pointRadius: 4,
                    pointBackgroundColor: '#6366f1'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { display: false },
                        ticks: {
                            callback: value => CONFIG.CURRENCY + value
                        }
                    },
                    x: {
                        grid: { display: false }
                    }
                }
            }
        });

        // Category Report Chart (Doughnut)
        const ctxCategory = document.getElementById('categoryReportChart')?.getContext('2d');
        if (ctxCategory) {
            this.categoryReportChart = new Chart(ctxCategory, {
                type: 'doughnut',
                data: { labels: [], datasets: [{ data: [], backgroundColor: [] }] },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8, padding: 15, font: { family: 'Outfit', size: 10 } } } },
                    cutout: '70%'
                }
            });
        }

        // Trend Report Chart (Bar)
        const ctxTrend = document.getElementById('trendReportChart')?.getContext('2d');
        if (ctxTrend) {
            this.trendReportChart = new Chart(ctxTrend, {
                type: 'bar',
                data: { labels: ['Income', 'Expenses'], datasets: [{ data: [0, 0], backgroundColor: ['#10b981', '#f43f5e'], borderRadius: 8 }] },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { beginAtZero: true, grid: { display: false }, ticks: { font: { family: 'Outfit' } } },
                        x: { grid: { display: false }, ticks: { font: { family: 'Outfit' } } }
                    }
                }
            });
        }
    },

    setupEventListeners() {
        // View Switching
        $('[data-view]').on('click', (e) => {
            e.preventDefault();
            const view = $(e.currentTarget).data('view');
            this.switchView(view);
        });

        // Transaction Modal Handling
        $('#add-transaction-btn').on('click', () => this.toggleModal(true));
        $('#close-modal').on('click', () => this.toggleModal(false));

        // Partner Income Modal Handling
        $('#add-partner-income-btn').on('click', () => this.togglePartnerIncomeModal(true));
        $('#close-partner-income-modal').on('click', () => this.togglePartnerIncomeModal(false));

        // Auto-calculate Share based on Total and Percentage
        $('#pi-input-total, #pi-input-percent').on('input', () => {
            const total = parseFloat($('#pi-input-total').val()) || 0;
            const percent = parseFloat($('#pi-input-percent').val()) || 0;
            const share = (total * (percent / 100)).toFixed(2);
            $('#pi-preview-share').text(`Rs.${share}`);
        });

        // Category Modal Handling
        $('#add-category-btn').on('click', () => this.toggleCategoryModal(true));
        $('#close-category-modal').on('click', () => this.toggleCategoryModal(false));

        // Category Icon Suggestions
        $('[name="name"]').on('input', (e) => {
            if ($('#category-action').val() === 'add') {
                this.suggestIcon($(e.currentTarget).val());
            }
        });

        $('#category-icon-input').on('input', (e) => {
            const val = $(e.currentTarget).val();
            $('#category-icon-preview').attr('class', `fa-solid ${val || 'fa-circle-question'}`);
        });

        // Report Filter Handling
        $('#report-month-filter, #report-year-filter').on('change', () => {
            if (window.refreshData) window.refreshData();
        });

        // Theme Toggle
        $('#theme-toggle').on('click', () => {
            $('html').toggleClass('dark');
            localStorage.setItem('theme', $('html').hasClass('dark') ? 'dark' : 'light');
            this.updateTheme();
        });

        // Global Escape Key to close all modals
        $(document).on('keydown', (e) => {
            if (e.key === 'Escape') {
                this.toggleModal(false);
                this.togglePartnerIncomeModal(false);
                this.toggleCategoryModal(false);
            }
        });

        // Sync Handling
        $('#sync-btn, #sync-btn-mobile').on('click', () => {
            if (window.refreshData) window.refreshData();
        });

        $('#logout-btn, #logout-btn-mobile, #logout-btn-settings').on('click', () => {
            this.logout();
        });
    },

    async loadCategories() {
        try {
            const [categories, settings] = await Promise.all([
                SheetsAPI.getCategories(),
                SheetsAPI.getSettings()
            ]);

            // Correctly merge settings
            if (settings) {
                this.settings.INITIAL_CASH = parseFloat(settings.INITIAL_CASH) || 0;
                this.settings.INITIAL_BANK = parseFloat(settings.INITIAL_BANK) || 0;
                this.settings.APP_PASSCODE = settings.APP_PASSCODE;
            }
            
            this.categoryCache = {};
            if (categories && categories.length > 0) {
                categories.forEach(cat => {
                    this.categoryCache[cat.name] = cat;
                });
                this.renderCategories(categories);
                this.updateCategoryDropdown(categories);
            }
        } catch (error) {
            console.error('Error loading meta-data:', error);
        }
    },

    renderCategories(categories) {
        const $grid = $('#categories-grid');
        $grid.empty();
        categories.forEach(cat => {
            $grid.append(`
                <div class="glass-card p-6 rounded-3xl border border-white/20 shadow-xl flex items-center justify-between group">
                    <div class="flex items-center gap-4">
                        <div class="w-12 h-12 rounded-2xl bg-${cat.color}-100 dark:bg-${cat.color}-900/30 flex items-center justify-center text-${cat.color}-500 text-xl">
                            <i class="fa-solid ${cat.icon}"></i>
                        </div>
                        <div>
                            <p class="font-bold">${cat.name}</p>
                            <p class="text-xs text-slate-500 uppercase tracking-widest">${cat.color}</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onclick="UI.openEditCategoryModal('${cat.name}')" class="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-primary transition-colors">
                            <i class="fa-solid fa-pen-to-square text-xs"></i>
                        </button>
                        <button onclick="UI.confirmDeleteCategory('${cat.name}')" class="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-rose-500 transition-colors">
                            <i class="fa-solid fa-trash text-xs"></i>
                        </button>
                    </div>
                </div>
            `);
        });
    },

    updateCategoryDropdown(categories) {
        const $select = $('#transaction-category-select');
        $select.empty();
        categories.forEach(cat => {
            $select.append(`<option value="${cat.name}">${cat.name}</option>`);
        });
    },

    suggestIcon(name) {
        if (!name) return;
        const lowerName = name.toLowerCase();
        let suggested = 'fa-circle-question';

        for (const [keyword, icon] of Object.entries(CONFIG.ICON_SUGGESTIONS)) {
            if (lowerName.includes(keyword)) {
                suggested = icon;
                break;
            }
        }

        $('#category-icon-input').val(suggested);
        $('#category-icon-preview').attr('class', `fa-solid ${suggested}`);
    },

    toggleCategoryModal(show, editData = null) {
        const $modal = $('#category-modal-container');
        const $content = $('#category-modal-content');
        const $form = $('#category-form');
        
        if (show) {
            if (editData) {
                $('#category-modal-title').text('Edit Category');
                $('#category-action').val('update');
                $('#category-original-name').val(editData.name);
                $form.find('[name="name"]').val(editData.name);
                $form.find('[name="icon"]').val(editData.icon);
                $form.find('[name="color"]').val(editData.color);
            } else {
                $('#category-modal-title').text('New Category');
                $('#category-action').val('add');
                $form[0].reset();
            }
            $modal.removeClass('hidden').addClass('flex');
            setTimeout(() => $content.addClass('show'), 10);
        } else {
            $content.removeClass('show');
            setTimeout(() => $modal.removeClass('flex').addClass('hidden'), 300);
        }
    },

    openEditCategoryModal(name) {
        const cat = this.categoryCache[name];
        if (cat) {
            this.toggleCategoryModal(true, cat);
        }
    },

    async confirmDeleteCategory(name) {
        const result = await Swal.fire({
            title: 'Delete Category?',
            text: `This will remove "${name}" from your categories. Transactions using this category will remain unchanged.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#f43f5e',
            confirmButtonText: 'Yes, delete it!'
        });

        if (result.isConfirmed) {
            try {
                await SheetsAPI.postToSheet({ name, action: 'delete', sheet: 'Categories' });
                Swal.fire('Deleted!', 'Category has been removed.', 'success');
                await this.loadCategories();
            } catch (error) {
                Swal.fire('Error', 'Could not delete category.', 'error');
            }
        }
    },

    switchView(view) {
        // Redirect legacy view names
        if (view === 'marketing') view = 'partner-income';
        
        // Ensure the view exists, fallback to dashboard
        if ($(`#view-${view}`).length === 0) view = 'dashboard';

        $('.view-content').addClass('hidden');
        $(`#view-${view}`).removeClass('hidden');
        
        // Save to local storage
        localStorage.setItem('last_view', view);
        
        // Update nav links
        $('[data-view]').removeClass('active');
        $(`[data-view="${view}"]`).addClass('active');

        // Update title
        const titles = {
            dashboard: 'Dashboard',
            'partner-income': 'Partner Income',
            transactions: 'Transactions History',
            categories: 'Manage Categories',
            reports: 'Financial Reports',
            settings: 'Settings'
        };
        $('#view-title').text(titles[view] || 'ExpenseTracker');

        // Pre-fill settings
        if (view === 'settings') {
            $('#setting-initial-cash').val(this.settings.INITIAL_CASH || 0);
            $('#setting-initial-bank').val(this.settings.INITIAL_BANK || 0);
        }
    },

    toggleModal(show, editData = null) {
        const $modal = $('#modal-container');
        const $content = $('#modal-content');
        const $form = $('#transaction-form');

        if (show) {
            if (editData) {
                $('#transaction-modal-title').text('Edit Transaction');
                $('#transaction-action').val('update');
                $('#transaction-id').val(editData.id);
                $form.find('[name="flow"][value="' + editData.flow + '"]').prop('checked', true);
                $form.find('[name="method"][value="' + editData.method + '"]').prop('checked', true);
                $form.find('[name="amount"]').val(editData.amount);
                $form.find('[name="category"]').val(editData.category);
                $form.find('[name="description"]').val(editData.description);
                $form.find('[name="date"]').val(editData.date);
            } else {
                $('#transaction-modal-title').text('Add Transaction');
                $('#transaction-action').val('add');
                $form[0].reset();
                // Set default date to today
                $form.find('input[name="date"]').val(new Date().toISOString().split('T')[0]);
                // Set default flow to Out
                $form.find('[name="flow"][value="Out"]').prop('checked', true);
            }
            $modal.removeClass('hidden').addClass('flex');
            setTimeout(() => $content.addClass('show'), 10);
        } else {
            $content.removeClass('show');
            setTimeout(() => $modal.removeClass('flex').addClass('hidden'), 300);
        }
    },

    openEditTransactionModal(id) {
        const t = this.transactionCache[id];
        if (t) {
            this.toggleModal(true, t);
        }
    },

    async confirmDeleteTransaction(id) {
        const result = await Swal.fire({
            title: 'Delete Transaction?',
            text: 'This action cannot be undone.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#f43f5e',
            confirmButtonText: 'Yes, delete it!'
        });

        if (result.isConfirmed) {
            try {
                await SheetsAPI.postToSheet({ id, action: 'delete', sheet: 'Transactions' });
                Swal.fire('Deleted!', 'Transaction removed.', 'success');
                if (window.refreshData) await window.refreshData();
            } catch (error) {
                Swal.fire('Error', 'Could not delete transaction.', 'error');
            }
        }
    },

    updateTheme() {
        const isDark = localStorage.getItem('theme') === 'dark' || 
                      (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
        
        if (isDark) {
            $('html').addClass('dark');
        } else {
            $('html').removeClass('dark');
        }

        // Update Chart colors
        if (this.chart) {
            const textColor = isDark ? '#94a3b8' : '#64748b';
            this.chart.options.scales.x.ticks.color = textColor;
            this.chart.options.scales.y.ticks.color = textColor;
            this.chart.update();
        }
    },

    refreshTransactions(transactions) {
        if (!this.table) return;
        
        // Update cache
        this.transactionCache = {};
        transactions.forEach(t => {
            this.transactionCache[t.id] = t;
        });

        this.table.clear();
        this.table.rows.add(transactions);
        this.table.draw();
        
        // We now call updateDashboard after both datasets are loaded in app.js
    },

    updateDashboard(transactions, partnerIncome) {
        if (!this.table || !transactions || !partnerIncome) return;
        
        // Populate Year Filter for Reports
        this.populateReportYears(transactions, partnerIncome);
        // Calculate Stats
        let cash = this.settings.INITIAL_CASH;
        let account = this.settings.INITIAL_BANK;
        let monthlySpending = 0;
        
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        // 1. Regular Transactions
        transactions.forEach(t => {
            const amount = parseFloat(t.amount);
            const flow = (t.flow || '').toLowerCase();
            const val = flow === 'in' ? amount : -amount;
            
            if (t.method === 'Cash') cash += val;
            if (t.method === 'Account') account += val;

            const tDate = new Date(t.date);
            if (tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear && flow === 'out') {
                monthlySpending += amount;
            }
        });

        // 2. Partner Income (Only if Received)
        partnerIncome.forEach(pi => {
            if (pi.status === 'Received') {
                const share = parseFloat(pi.user_share) || 0;
                if (pi.method === 'Cash') cash += share;
                if (pi.method === 'Account') account += share;
            }
        });

        const totalBalance = cash + account;

        // Update Counter Elements
        this.animateValue('#stat-total-balance', totalBalance);
        this.animateValue('#stat-cash', cash);
        this.animateValue('#stat-account', account);
        this.animateValue('#stat-spending', monthlySpending);

        // Update Charts
        this.updateChartData(transactions, partnerIncome);
        this.updateReports(transactions, partnerIncome);

        // Update Major Categories List
        this.updateCategoryList(transactions);
    },

    animateValue(id, value) {
        const $el = $(id);
        const startValue = parseFloat($el.text().replace(/[^0-9.-]+/g, '')) || 0;
        const duration = 1000;
        let startTime = null;

        const step = (timestamp) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);
            const current = progress * (value - startValue) + startValue;
            $el.text(CONFIG.CURRENCY + current.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}));
            if (progress < 1) window.requestAnimationFrame(step);
        };
        window.requestAnimationFrame(step);
    },

    updateChartData(transactions, partnerIncome) {
        if (!this.chart || !transactions || !partnerIncome) return;

        // Simple daily spending for last 7 days
        const last7Days = [...Array(7)].map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - i);
            return d.toISOString().split('T')[0];
        }).reverse();

        const dailyData = last7Days.map(date => {
            const expense = transactions
                .filter(t => {
                    const tDate = t.date ? new Date(t.date).toISOString().split('T')[0] : '';
                    return tDate === date && (t.flow || '').toLowerCase() === 'out';
                })
                .reduce((sum, t) => sum + parseFloat(t.amount), 0);
            
            return expense;
        });

        this.chart.data.labels = last7Days.map(d => d.split('-').slice(1).join('/'));
        this.chart.data.datasets[0].data = dailyData;
        this.chart.update();
    },

    updateCategoryList(transactions) {
        const categories = {};
        transactions.filter(t => (t.flow || '').toLowerCase() === 'out').forEach(t => {
            categories[t.category] = (categories[t.category] || 0) + parseFloat(t.amount);
        });

        const sorted = Object.entries(categories).sort((a, b) => b[1] - a[1]).slice(0, 4);
        const totalOut = Object.values(categories).reduce((a, b) => a + b, 0);

        const $list = $('#major-categories-list');
        $list.empty();

        sorted.forEach(([name, amount]) => {
            const config = this.categoryCache[name] || { icon: 'fa-circle-question', color: 'slate' };
            const percent = totalOut > 0 ? (amount / totalOut * 100) : 0;
            
            $list.append(`
                <div class="flex items-center justify-between p-4 bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800 transition-all hover:scale-[1.02]">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-xl bg-${config.color}-100 dark:bg-${config.color}-900/30 flex items-center justify-center text-${config.color}-500">
                            <i class="fa-solid ${config.icon}"></i>
                        </div>
                        <div>
                            <p class="text-sm font-bold">${name}</p>
                            <div class="w-24 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full mt-1">
                                <div class="bg-${config.color}-500 h-full rounded-full transition-all duration-1000" style="width: ${percent}%"></div>
                            </div>
                        </div>
                    </div>
                    <span class="font-bold">${CONFIG.CURRENCY}${amount.toFixed(2)}</span>
                </div>
            `);
        });
    },

    updateReports(transactions, partnerIncome) {
        if (!this.table || !transactions || !partnerIncome) return;

        const selectedMonth = $('#report-month-filter').val(); // 'all' or 0-11
        const selectedYear = parseInt($('#report-year-filter').val()) || new Date().getFullYear();

        // Helper to filter by date
        const isSelected = (dateStr) => {
            const tDate = new Date(dateStr);
            const tMonth = tDate.getMonth();
            const tYear = tDate.getFullYear();

            if (tYear !== selectedYear) return false;
            if (selectedMonth === 'all') return true;
            return tMonth === parseInt(selectedMonth);
        };

        // Calculate Totals and Period Changes
        let income = 0;
        let expense = 0;
        let transactionInFlow = 0;
        const categoryData = {};

        // For Big Cards: Historical Balance (Opening + Total up to end of period)
        let histCashChange = 0;
        let histAccountChange = 0;

        // Determine the end date for the selected period (for Balance cards)
        const periodEndDate = new Date(selectedYear, 11, 31, 23, 59, 59); // Default to end of year
        if (selectedMonth !== 'all') {
            const m = parseInt(selectedMonth);
            periodEndDate.setMonth(m + 1, 0); // Last day of selected month
            periodEndDate.setHours(23, 59, 59, 999);
        }

        // Helper to check if a date is within or before the period
        const isUpToPeriod = (dateStr) => {
            const d = new Date(dateStr);
            return d <= periodEndDate;
        };

        // 1. Transactions
        transactions.forEach(t => {
            const amt = parseFloat(t.amount) || 0;
            const flow = (t.flow || '').toLowerCase();
            const method = t.method || 'Cash';
            const tDateStr = t.date;

            // Historical Balance (up to period end)
            if (isUpToPeriod(tDateStr)) {
                if (flow === 'out') {
                    if (method === 'Cash') histCashChange -= amt;
                    else histAccountChange -= amt;
                } else if (flow === 'in') {
                    if (method === 'Cash') histCashChange += amt;
                    else histAccountChange += amt;
                }
            }

            // Monthly Stats (exactly the period)
            if (isSelected(tDateStr)) {
                if (flow === 'out') {
                    expense += amt;
                    categoryData[t.category] = (categoryData[t.category] || 0) + amt;
                } else if (flow === 'in') {
                    transactionInFlow += amt;
                }
            }
        });

        // 2. Partner Income (Only if Received)
        partnerIncome.forEach(pi => {
            if (pi.status !== 'Received') return;
            const share = parseFloat(pi.user_share) || 0;
            const method = pi.method || 'Cash';
            const piDateStr = pi.date;

            // Historical
            if (isUpToPeriod(piDateStr)) {
                if (method === 'Cash') histCashChange += share;
                else histAccountChange += share;
            }

            // Monthly
            if (isSelected(piDateStr)) {
                income += share;
            }
        });

        // Final Historical Balances (Include Opening Balances)
        const finalCash = (this.settings.INITIAL_CASH || 0) + histCashChange;
        const finalAccount = (this.settings.INITIAL_BANK || 0) + histAccountChange;

        // Update UI - Big Stats
        this.animateValue('#report-total-balance-stat', finalCash + finalAccount);
        this.animateValue('#report-cash-stat', finalCash);
        this.animateValue('#report-account-stat', finalAccount);

        // Update UI - Summary Cards
        this.animateValue('#report-total-income', income);
        this.animateValue('#report-total-expense', expense);
        this.animateValue('#report-cash-in', transactionInFlow);
        
        const netCashFlow = expense - transactionInFlow;
        this.animateValue('#report-cash-flow', netCashFlow);
        
        // Net Balance for the selected period
        const netBalanceForPeriod = income - netCashFlow;
        this.animateValue('#report-net-balance', netBalanceForPeriod);

        // Update Category Chart
        if (this.categoryReportChart) {
            const labels = Object.keys(categoryData);
            const data = Object.values(categoryData);
            const colors = labels.map(label => {
                const cat = this.categoryCache[label];
                return cat ? this.getColorHex(cat.color) : '#cbd5e1';
            });

            this.categoryReportChart.data.labels = labels;
            this.categoryReportChart.data.datasets[0].data = data;
            this.categoryReportChart.data.datasets[0].backgroundColor = colors;
            this.categoryReportChart.update();
        }

        // Update Trend Chart
        if (this.trendReportChart) {
            this.trendReportChart.data.datasets[0].data = [income, expense];
            this.trendReportChart.update();
        }

        // Update Insights
        this.renderInsights(income, expense, categoryData, transactionInFlow);
    },

    renderInsights(income, expense, categoryData, transactionInFlow = 0) {
        const $container = $('#report-insights');
        $container.empty();

        const totalIn = income + transactionInFlow;
        const savingsRate = totalIn > 0 ? (((totalIn - expense) / totalIn) * 100).toFixed(1) : 0;
        const topCat = Object.entries(categoryData).sort((a, b) => b[1] - a[1])[0];

        const insights = [
            { label: 'Savings Rate', val: `${savingsRate}%`, icon: 'fa-piggy-bank', color: 'primary' },
            { label: 'Top Expense', val: topCat ? topCat[0] : 'None', icon: 'fa-fire-flame-curved', color: 'rose' },
            { label: 'Avg daily', val: `${CONFIG.CURRENCY}${(expense / 30).toFixed(0)}`, icon: 'fa-calendar-day', color: 'indigo' },
            { label: 'Status', val: income > expense ? 'Healthy' : 'Deficit', icon: 'fa-heart-pulse', color: income > expense ? 'emerald' : 'rose' }
        ];

        insights.forEach(ins => {
            $container.append(`
                <div class="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-${ins.color}-100 dark:bg-${ins.color}-900/30 flex items-center justify-center text-${ins.color}-500">
                        <i class="fa-solid ${ins.icon}"></i>
                    </div>
                    <div>
                        <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">${ins.label}</p>
                        <p class="font-bold">${ins.val}</p>
                    </div>
                </div>
            `);
        });
    },

    getColorHex(colorName) {
        const colors = {
            indigo: '#6366f1', emerald: '#10b981', rose: '#f43f5e',
            orange: '#f59e0b', blue: '#3b82f6', purple: '#a855f7',
            pink: '#ec4899', slate: '#64748b'
        };
        return colors[colorName] || colors.slate;
    },

    initPartnerIncomeTable() {
        this.partnerIncomeTable = $('#partnerIncomeTable').DataTable({
            responsive: true,
            order: [[0, 'desc']],
            columns: [
                { data: 'date' },
                { data: 'description' },
                { data: 'total_amount' },
                { data: 'percentage' },
                { data: 'status' },
                { data: null }
            ],
            columnDefs: [
                {
                    targets: 2,
                    render: data => `<span class="font-bold">${CONFIG.CURRENCY}${parseFloat(data).toFixed(2)}</span>`
                },
                {
                    targets: 3,
                    render: (data, type, row) => `<span class="font-bold text-emerald-500">${data}% (${CONFIG.CURRENCY}${parseFloat(row.user_share).toFixed(2)})</span>`
                },
                {
                    targets: 4,
                    render: function(data) {
                        const color = data === 'Received' ? 'emerald' : 'amber';
                        return `<span class="px-2 py-1 rounded-lg bg-${color}-100 dark:bg-${color}-900/30 text-${color}-500 text-[10px] font-bold uppercase">${data}</span>`;
                    }
                },
                {
                    targets: 5,
                    orderable: false,
                    render: function(data, type, row) {
                        return `<div class="flex items-center gap-2">
                            <button onclick="UI.openEditPartnerIncomeModal('${row.id}')" class="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-primary transition-colors">
                                <i class="fa-solid fa-pen-to-square text-xs"></i>
                            </button>
                            <button onclick="UI.confirmDeletePartnerIncome('${row.id}')" class="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-rose-500 transition-colors">
                                <i class="fa-solid fa-trash text-xs"></i>
                            </button>
                        </div>`;
                    }
                }
            ]
        });
    },

    togglePartnerIncomeModal(show, editData = null) {
        const $modal = $('#partner-income-modal-container');
        const $content = $('#partner-income-modal-content');
        const $form = $('#partner-income-form');

        if (show) {
            if (editData) {
                $('#partner-income-modal-title').text('Edit Partner Income');
                $('#partner-income-action').val('update');
                $('#partner-income-id').val(editData.id);
                $form.find('[name="date"]').val(editData.date);
                $form.find('[name="description"]').val(editData.description);
                $form.find('[name="total_amount"]').val(editData.total_amount);
                $form.find('[name="percentage"]').val(editData.percentage);
                $form.find('[name="status"]').val(editData.status);
                $form.find('[name="method"]').val(editData.method);
                
                const share = (parseFloat(editData.total_amount) * (parseFloat(editData.percentage) / 100)).toFixed(2);
                $('#pi-preview-share').text(`Rs.${share}`);
            } else {
                $('#partner-income-modal-title').text('Log Partner Payment');
                $('#partner-income-action').val('add');
                $form[0].reset();
                $form.find('input[name="date"]').val(new Date().toISOString().split('T')[0]);
                $form.find('[name="percentage"]').val(25);
                $('#pi-preview-share').text(`Rs.0.00`);
            }
            $modal.removeClass('hidden').addClass('flex');
            setTimeout(() => $content.addClass('show'), 10);
        } else {
            $content.removeClass('show');
            setTimeout(() => $modal.removeClass('flex').addClass('hidden'), 300);
        }
    },

    openEditPartnerIncomeModal(id) {
        const data = this.partnerIncomeCache[id];
        if (data) this.togglePartnerIncomeModal(true, data);
    },

    async confirmDeletePartnerIncome(id) {
        const result = await Swal.fire({
            title: 'Delete Income Record?',
            text: 'This action cannot be undone.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#f43f5e',
            confirmButtonText: 'Yes, delete it!'
        });

        if (result.isConfirmed) {
            try {
                await SheetsAPI.postToSheet({ id, action: 'delete', sheet: 'PartnerIncome' });
                Swal.fire('Deleted!', 'Record removed.', 'success');
                if (window.refreshData) await window.refreshData();
            } catch (error) {
                Swal.fire('Error', 'Could not delete record.', 'error');
            }
        }
    },

    refreshPartnerIncomeData(data) {
        if (!this.partnerIncomeTable) return;
        
        this.partnerIncomeCache = {};
        data.forEach(item => {
            this.partnerIncomeCache[item.id] = item;
        });

        this.partnerIncomeTable.clear();
        this.partnerIncomeTable.rows.add(data);
        this.partnerIncomeTable.draw();
        this.updatePartnerIncomeDashboard(data);
    },

    updatePartnerIncomeDashboard(data) {
        let totalProject = 0;
        let myTotal = 0;
        let pending = 0;

        data.forEach(item => {
            const total = parseFloat(item.total_amount) || 0;
            const share = parseFloat(item.user_share) || 0;
            
            totalProject += total;
            myTotal += share;
            
            if (item.status === 'Pending') {
                pending += share;
            }
        });

        this.animateValue('#pi-total-project', totalProject);
        this.animateValue('#pi-my-total', myTotal);
        this.animateValue('#pi-pending', pending);
    },

    populateReportYears(transactions, partnerIncome) {
        const yearSelect = $('#report-year-filter');
        if (!yearSelect.length) return;

        const years = new Set();
        years.add(new Date().getFullYear());

        transactions.forEach(t => years.add(new Date(t.date).getFullYear()));
        partnerIncome.forEach(pi => years.add(new Date(pi.date).getFullYear()));

        const currentSelection = yearSelect.val();
        yearSelect.empty();

        const sortedYears = [...years].sort((a, b) => b - a);
        sortedYears.forEach(year => {
            yearSelect.append(`<option value="${year}">${year}</option>`);
        });

        if (currentSelection && sortedYears.includes(parseInt(currentSelection))) {
            yearSelect.val(currentSelection);
        } else {
            yearSelect.val(new Date().getFullYear());
        }
        
        // Also set current month if not set
        if (!$('#report-month-filter').data('initialized')) {
            $('#report-month-filter').val(new Date().getMonth()).data('initialized', true);
        }
    },

    logout() {
        Swal.fire({
            title: 'Secure Logout?',
            text: "You will need the passcode to access your data again.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#6366f1',
            cancelButtonColor: '#475569',
            confirmButtonText: 'Logout',
            background: '#1e293b',
            color: '#fff'
        }).then((result) => {
            if (result.isConfirmed) {
                localStorage.removeItem('expensify_session');
                window.location.href = 'login.html';
            }
        });
    }
};
