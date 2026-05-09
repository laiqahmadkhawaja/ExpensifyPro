/**
 * Main Application Controller
 */

$(document).ready(async function () {
    // Restore last view INSTANTLY for better UX
    const lastView = localStorage.getItem('last_view') || 'dashboard';
    UI.switchView(lastView);

    // Initialize UI and Wait for settings
    await UI.init();

    // Load initial data
    await refreshData();

    // Form Submission Handling
    $('#transaction-form').on('submit', async function (e) {
        e.preventDefault();

        const formData = new FormData(this);
        const data = Object.fromEntries(formData.entries());

        // UI feedback - loading state
        const $btn = $(this).find('button[type="submit"]');
        const originalHtml = $btn.html();
        $btn.prop('disabled', true).html('<i class="fa-solid fa-spinner fa-spin"></i> Saving...');

        try {
            await SheetsAPI.addTransaction(data);

            // Success feedback
            Swal.fire({
                title: 'Success!',
                text: 'Transaction saved successfully.',
                icon: 'success',
                timer: 2000,
                showConfirmButton: false,
                toast: true,
                position: 'top-end'
            });

            UI.toggleModal(false);
            this.reset();

            // Refresh dashboard
            await refreshData();
        } catch (error) {
            Swal.fire({
                title: 'Error',
                text: 'Could not save transaction. Please check your connection.',
                icon: 'error'
            });
        } finally {
            $btn.prop('disabled', false).html(originalHtml);
        }
    });

    // Category Form Submission Handling
    $('#category-form').on('submit', async function (e) {
        e.preventDefault();

        const formData = new FormData(this);
        const data = Object.fromEntries(formData.entries());

        const $btn = $(this).find('button[type="submit"]');
        const originalHtml = $btn.html();
        $btn.prop('disabled', true).html('<i class="fa-solid fa-spinner fa-spin"></i> Saving...');

        try {
            await SheetsAPI.addCategory(data);

            Swal.fire({
                title: 'Success!',
                text: 'Category added successfully.',
                icon: 'success',
                timer: 2000,
                showConfirmButton: false,
                toast: true,
                position: 'top-end'
            });

            UI.toggleCategoryModal(false);
            this.reset();

            // Refresh categories
            await UI.loadCategories();
        } catch (error) {
            Swal.fire({
                title: 'Error',
                text: 'Could not save category.',
                icon: 'error'
            });
        } finally {
            $btn.prop('disabled', false).html(originalHtml);
        }
    });

    // Settings Form Submission Handling
    $('#settings-form').on('submit', async function (e) {
        e.preventDefault();

        const formData = new FormData(this);
        const data = Object.fromEntries(formData.entries());

        const $btn = $(this).find('button[type="submit"]');
        const originalHtml = $btn.html();
        $btn.prop('disabled', true).html('<i class="fa-solid fa-spinner fa-spin"></i> Saving...');

        try {
            await SheetsAPI.updateSettings(data);

            Swal.fire({
                title: 'Success!',
                text: 'Opening balances updated.',
                icon: 'success',
                timer: 2000,
                showConfirmButton: false,
                toast: true,
                position: 'top-end'
            });

            // Refresh all data to update dashboard
            await refreshData();
        } catch (error) {
            Swal.fire({
                title: 'Error',
                text: 'Could not save settings.',
                icon: 'error'
            });
        } finally {
            $btn.prop('disabled', false).html(originalHtml);
        }
    });

    // Partner Income Form Submission Handling
    $('#partner-income-form').on('submit', async function (e) {
        e.preventDefault();
        
        const formData = new FormData(this);
        const data = Object.fromEntries(formData.entries());
        
        // Dynamic share calculation
        const total = parseFloat(data.total_amount) || 0;
        const percent = parseFloat(data.percentage) || 0;
        data.user_share = (total * (percent / 100)).toFixed(2);
        data.sheet = 'PartnerIncome';

        const $btn = $(this).find('button[type="submit"]');
        const originalHtml = $btn.html();
        $btn.prop('disabled', true).html('<i class="fa-solid fa-spinner fa-spin"></i> Saving...');

        try {
            await SheetsAPI.postToSheet(data);
            
            Swal.fire({
                title: 'Success!',
                text: 'Record saved successfully.',
                icon: 'success',
                timer: 2000,
                showConfirmButton: false,
                toast: true,
                position: 'top-end'
            });

            UI.togglePartnerIncomeModal(false);
            this.reset();
            await refreshData();
        } catch (error) {
            Swal.fire({
                title: 'Error',
                text: 'Could not save record.',
                icon: 'error'
            });
        } finally {
            $btn.prop('disabled', false).html(originalHtml);
        }
    });

    // Sync Now Button Handling
    $('#sync-btn').on('click', async function () {
        $(this).find('i').addClass('fa-spin');
        await refreshData();
        $(this).find('i').removeClass('fa-spin');
    });

    /**
     * Refresh all data from sheets
     */
    async function refreshData() {
        UI.setSyncStatus('Syncing...', 'amber');
        UI.showLoader(true);
        
        try {
            const [transactions, partnerIncome] = await Promise.all([
                SheetsAPI.getTransactions(),
                SheetsAPI.getTransactions('PartnerIncome')
            ]);
            
            UI.refreshTransactions(transactions);
            UI.refreshPartnerIncomeData(partnerIncome);
            UI.updateDashboard(transactions, partnerIncome);
            
            UI.setSyncStatus('Connected', 'emerald');
        } catch (error) {
            console.error('Refresh failed:', error);
            UI.setSyncStatus('Offline', 'rose');
        } finally {
            UI.showLoader(false);
        }
    }

    // Expose globally
    window.refreshData = refreshData;
    window.refreshMarketingData = refreshData;
});
