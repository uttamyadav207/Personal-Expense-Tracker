/**
 * SpendWise — HTML Edition Application Logic
 */

const DEFAULT_CATEGORIES = [
    '🍔 Food', '🚗 Transport', '🛍️ Shopping', '🏠 Housing', '💡 Utilities',
    '🎓 Education', '🏥 Health', '🎬 Entertainment', '✈️ Travel', '💳 Bills',
    '💰 Investment', '📦 Other'
];

const DEFAULT_PAYMENTS = [
    'Cash', 'UPI', 'Credit Card', 'Debit Card', 'Bank Transfer', 'Net Banking', 'Other'
];

const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

class SpendWiseApp {
    constructor() {
        this.transactions = [];
        this.categories = [];
        this.budgets = {};
        this.settings = {
            currency: '₹',
            default_category: '🍔 Food',
            default_payment: 'Cash',
            theme: 'light'
        };

        this.currentPage = 'dashboard';
        this.charts = {};
        this.filteredTransactions = [];
        this.pageSize = 15;
        this.currentPageNum = 1;
        this.pendingImportRecords = [];

        this.init();
    }

    init() {
        this.loadLocalStorage();
        this.applyTheme(this.settings.theme);
        this.setupEventListeners();
        this.populateDropdowns();
        this.populateYearOptions();
        this.renderCategoryChips();
        this.navigateTo(this.currentPage);

        // Auto seed demo data if completely empty on first visit
        if (this.transactions.length === 0) {
            this.generateDemoData(false);
        }

        this.refreshAllViews();
    }

    /* ==========================================
       LocalStorage & State Persistence
       ========================================== */
    loadLocalStorage() {
        try {
            const savedTx = localStorage.getItem('spendwise_transactions');
            this.transactions = savedTx ? JSON.parse(savedTx) : [];

            const savedCats = localStorage.getItem('spendwise_categories');
            this.categories = savedCats ? JSON.parse(savedCats) : [...DEFAULT_CATEGORIES];

            const savedBudgets = localStorage.getItem('spendwise_budgets');
            this.budgets = savedBudgets ? JSON.parse(savedBudgets) : {};

            const savedSettings = localStorage.getItem('spendwise_settings');
            if (savedSettings) {
                this.settings = { ...this.settings, ...JSON.parse(savedSettings) };
            }
        } catch (e) {
            console.error('Failed to parse localStorage:', e);
            this.categories = [...DEFAULT_CATEGORIES];
        }
    }

    saveState() {
        localStorage.setItem('spendwise_transactions', JSON.stringify(this.transactions));
        localStorage.setItem('spendwise_categories', JSON.stringify(this.categories));
        localStorage.setItem('spendwise_budgets', JSON.stringify(this.budgets));
        localStorage.setItem('spendwise_settings', JSON.stringify(this.settings));
        
        const statusEl = document.getElementById('storage-status');
        if (statusEl) {
            statusEl.textContent = `Saved (${this.transactions.length} tx)`;
        }
    }

    /* ==========================================
       Formatting Utilities
       ========================================== */
    formatMoney(amount) {
        const val = Math.abs(parseFloat(amount) || 0);
        const parts = val.toFixed(2).split('.');
        let whole = parts[0];
        const decimal = parts[1];
        const symbol = this.settings.currency || '₹';

        if (symbol === '₹' || symbol === 'Rs.') {
            // Indian Currency Formatting
            if (whole.length > 3) {
                const lastThree = whole.substring(whole.length - 3);
                const otherNumbers = whole.substring(0, whole.length - 3);
                whole = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + lastThree;
            }
        } else {
            // Standard Western Formatting
            whole = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        }

        const sign = amount < 0 ? '-' : '';
        return `${sign}${symbol}${whole}.${decimal}`;
    }

    formatDateDisplay(dateStr) {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        const day = String(d.getDate()).padStart(2, '0');
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${day} ${months[d.getMonth()]} ${d.getFullYear()}`;
    }

    /* ==========================================
       Theme & UI Logic
       ========================================== */
    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        this.settings.theme = theme;
        const toggleBtn = document.getElementById('theme-toggle');
        if (toggleBtn) {
            toggleBtn.textContent = theme === 'dark' ? '☀️' : '🌙';
        }
        // Update Chart font colors on theme change
        Chart.defaults.color = theme === 'dark' ? '#94a3b8' : '#64748b';
        Chart.defaults.borderColor = theme === 'dark' ? '#232d42' : '#e2e8f0';
        this.renderCharts();
    }

    toggleTheme() {
        const nextTheme = this.settings.theme === 'dark' ? 'light' : 'dark';
        this.applyTheme(nextTheme);
        this.saveState();
        this.showToast(`Switched to ${nextTheme} mode`, 'info');
    }

    showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
        toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
        
        container.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    /* ==========================================
       Navigation
       ========================================== */
    setupEventListeners() {
        // Navigation items
        document.querySelectorAll('.nav-item').forEach(btn => {
            btn.addEventListener('click', () => {
                const page = btn.dataset.page;
                this.navigateTo(page);
                document.querySelector('.sidebar').classList.remove('open');
            });
        });

        // Mobile sidebar toggle
        document.getElementById('mobile-menu-toggle')?.addEventListener('click', () => {
            document.querySelector('.sidebar').classList.toggle('open');
        });

        // Theme Toggle
        document.getElementById('theme-toggle')?.addEventListener('click', () => this.toggleTheme());

        // Quick Add Button
        document.getElementById('btn-quick-add')?.addEventListener('click', () => {
            this.navigateTo('add-expense');
        });

        // Dashboard selectors
        document.getElementById('dash-year')?.addEventListener('change', () => this.renderDashboard());
        document.getElementById('dash-month')?.addEventListener('change', () => this.renderDashboard());

        // Transactions Filters
        ['filter-start', 'filter-end', 'filter-type', 'filter-category', 'filter-payment', 'filter-sort'].forEach(id => {
            document.getElementById(id)?.addEventListener('change', () => {
                this.currentPageNum = 1;
                this.renderTransactionsTable();
            });
        });

        ['filter-search', 'filter-min', 'filter-max'].forEach(id => {
            document.getElementById(id)?.addEventListener('input', () => {
                this.currentPageNum = 1;
                this.renderTransactionsTable();
            });
        });

        document.getElementById('btn-reset-filters')?.addEventListener('click', () => this.resetFilters());
        document.getElementById('btn-prev-page')?.addEventListener('click', () => {
            if (this.currentPageNum > 1) {
                this.currentPageNum--;
                this.renderTransactionsTable();
            }
        });

        document.getElementById('btn-next-page')?.addEventListener('click', () => {
            const maxPage = Math.ceil(this.filteredTransactions.length / this.pageSize) || 1;
            if (this.currentPageNum < maxPage) {
                this.currentPageNum++;
                this.renderTransactionsTable();
            }
        });

        // Analytics Period Listener
        document.getElementById('analytics-period')?.addEventListener('change', (e) => {
            const customBox = document.getElementById('analytics-custom-dates');
            if (e.target.value === 'Custom') {
                customBox?.classList.remove('hidden');
            } else {
                customBox?.classList.add('hidden');
                this.renderAnalytics();
            }
        });

        document.getElementById('ana-start-date')?.addEventListener('change', () => this.renderAnalytics());
        document.getElementById('ana-end-date')?.addEventListener('change', () => this.renderAnalytics());

        // Export Scope Radio Toggle
        document.querySelectorAll('input[name="export-scope"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                const rangeBox = document.getElementById('export-range-container');
                if (e.target.value === 'range') {
                    rangeBox?.classList.remove('hidden');
                } else {
                    rangeBox?.classList.add('hidden');
                }
            });
        });

        // Danger zone confirm listeners
        const deleteCheck = document.getElementById('confirm-delete-check');
        const deleteText = document.getElementById('confirm-delete-text');
        const deleteBtn = document.getElementById('btn-delete-all');

        const validateDelete = () => {
            if (deleteBtn) {
                deleteBtn.disabled = !(deleteCheck?.checked && deleteText?.value.trim() === 'DELETE');
            }
        };

        deleteCheck?.addEventListener('change', validateDelete);
        deleteText?.addEventListener('input', validateDelete);

        // Import File Drag & Drop
        const dropzone = document.getElementById('dropzone');
        const fileInput = document.getElementById('import-file-input');

        if (dropzone && fileInput) {
            dropzone.addEventListener('click', () => fileInput.click());
            dropzone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropzone.style.borderColor = 'var(--primary)';
            });
            dropzone.addEventListener('dragleave', () => {
                dropzone.style.borderColor = 'var(--border-color)';
            });
            dropzone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropzone.style.borderColor = 'var(--border-color)';
                if (e.dataTransfer.files.length) {
                    this.handleFileImport(e.dataTransfer.files[0]);
                }
            });
            fileInput.addEventListener('change', (e) => {
                if (e.target.files.length) {
                    this.handleFileImport(e.target.files[0]);
                }
            });
        }

        document.getElementById('btn-confirm-import')?.addEventListener('click', () => this.confirmImport());
    }

    navigateTo(pageId) {
        this.currentPage = pageId;

        // Active link highlight
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.page === pageId);
        });

        // Page view toggle
        document.querySelectorAll('.page-view').forEach(view => {
            view.classList.toggle('active', view.id === `page-${pageId}`);
        });

        // Set Topbar Title
        const titleMap = {
            'dashboard': 'Financial Overview',
            'add-expense': 'Add Transaction',
            'transactions': 'Transaction Records',
            'analytics': 'Expense Analytics & Trends',
            'budget': 'Monthly Budgets',
            'import-export': 'Data Import & Export',
            'settings': 'Settings & Customization'
        };
        const titleEl = document.getElementById('page-title');
        if (titleEl) titleEl.textContent = titleMap[pageId] || 'SpendWise';

        this.refreshAllViews();
    }

    populateDropdowns() {
        const catSelects = ['add-category', 'filter-category', 'edit-category', 'budget-category-select', 'settings-default-cat'];
        catSelects.forEach(id => {
            const select = document.getElementById(id);
            if (!select) return;

            const isFilter = id === 'filter-category';
            select.innerHTML = isFilter ? '<option value="All">All Categories</option>' : '';

            this.categories.forEach(cat => {
                const opt = document.createElement('option');
                opt.value = cat;
                opt.textContent = cat;
                select.appendChild(opt);
            });
        });

        const paySelects = ['add-payment', 'filter-payment', 'edit-payment', 'settings-default-pay'];
        paySelects.forEach(id => {
            const select = document.getElementById(id);
            if (!select) return;

            const isFilter = id === 'filter-payment';
            select.innerHTML = isFilter ? '<option value="All">All Payment Methods</option>' : '';

            DEFAULT_PAYMENTS.forEach(pay => {
                const opt = document.createElement('option');
                opt.value = pay;
                opt.textContent = pay;
                select.appendChild(opt);
            });
        });

        // Set form defaults
        const addCat = document.getElementById('add-category');
        if (addCat) addCat.value = this.settings.default_category || this.categories[0];

        const addPay = document.getElementById('add-payment');
        if (addPay) addPay.value = this.settings.default_payment || DEFAULT_PAYMENTS[0];

        const addDate = document.getElementById('add-date');
        if (addDate && !addDate.value) {
            addDate.value = new Date().toISOString().split('T')[0];
        }

        // Set currency symbols in labels
        document.querySelectorAll('.currency-symbol').forEach(el => {
            el.textContent = this.settings.currency || '₹';
        });

        const settingsCur = document.getElementById('settings-currency');
        if (settingsCur) settingsCur.value = this.settings.currency || '₹';

        const settingsTheme = document.getElementById('settings-theme');
        if (settingsTheme) settingsTheme.value = this.settings.theme || 'light';
    }

    populateYearOptions() {
        const yearSelect = document.getElementById('dash-year');
        if (!yearSelect) return;

        const currentYear = new Date().getFullYear();
        yearSelect.innerHTML = '';
        for (let y = currentYear - 5; y <= currentYear + 2; y++) {
            const opt = document.createElement('option');
            opt.value = y;
            opt.textContent = y;
            if (y === currentYear) opt.selected = true;
            yearSelect.appendChild(opt);
        }

        const monthSelect = document.getElementById('dash-month');
        if (monthSelect) {
            monthSelect.value = String(new Date().getMonth() + 1);
        }
    }

    refreshAllViews() {
        this.renderDashboard();
        this.renderTransactionsTable();
        this.renderAnalytics();
        this.renderBudgetProgress();
    }

    /* ==========================================
       Dashboard View Logic
       ========================================== */
    renderDashboard() {
        if (this.currentPage !== 'dashboard') return;

        const year = parseInt(document.getElementById('dash-year')?.value) || new Date().getFullYear();
        const month = parseInt(document.getElementById('dash-month')?.value) || (new Date().getMonth() + 1);

        const subtitleEl = document.getElementById('dash-date-subtitle');
        if (subtitleEl) {
            subtitleEl.textContent = `${MONTH_NAMES[month - 1]} ${year}`;
        }

        // Filter transactions for chosen month/year
        const monthStr = `${year}-${String(month).padStart(2, '0')}`;
        const currentMonthTx = this.transactions.filter(t => t.date.startsWith(monthStr));

        // Income, Expenses, Balance, Savings Rate
        const income = currentMonthTx.filter(t => t.type === 'Income').reduce((sum, t) => sum + t.amount, 0);
        const expense = currentMonthTx.filter(t => t.type === 'Expense').reduce((sum, t) => sum + t.amount, 0);
        const balance = income - expense;
        const savingsRate = income > 0 ? ((balance / income) * 100).toFixed(1) : '0.0';

        document.getElementById('dash-income').textContent = this.formatMoney(income);
        document.getElementById('dash-expense').textContent = this.formatMoney(expense);
        document.getElementById('dash-balance').textContent = this.formatMoney(balance);
        document.getElementById('dash-savings').textContent = `${savingsRate}%`;

        // Dashboard Charts
        this.renderDashTrendChart(year);
        this.renderDashCategoryChart(currentMonthTx);
        this.renderDashIncomeExpenseChart(currentMonthTx);
        this.renderDashBudgetStatus(expense);

        // Recent Transactions Table (Top 8)
        const recent = [...this.transactions]
            .sort((a, b) => new Date(b.date) - new Date(a.date) || b.id - a.id)
            .slice(0, 8);

        const tbody = document.querySelector('#table-dash-recent tbody');
        if (tbody) {
            if (recent.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" class="text-center" style="padding:2rem;color:var(--text-secondary)">No transactions recorded yet. Click "Add Transaction" to begin!</td></tr>`;
            } else {
                tbody.innerHTML = recent.map(t => `
                    <tr>
                        <td>${this.formatDateDisplay(t.date)}</td>
                        <td><span class="badge badge-${t.type.toLowerCase()}">${t.type}</span></td>
                        <td><span class="badge badge-category">${t.category}</span></td>
                        <td><strong>${this.escapeHtml(t.description)}</strong></td>
                        <td>${t.payment_method}</td>
                        <td class="text-right" style="font-weight:700; color:${t.type === 'Income' ? 'var(--success)' : 'var(--text-primary)'}">
                            ${t.type === 'Income' ? '+' : '-'}${this.formatMoney(t.amount)}
                        </td>
                    </tr>
                `).join('');
            }
        }
    }

    renderDashTrendChart(year) {
        const ctx = document.getElementById('chart-dash-trend')?.getContext('2d');
        if (!ctx) return;

        const yearTx = this.transactions.filter(t => t.date.startsWith(String(year)) && t.type === 'Expense');
        const monthlyTotals = Array(12).fill(0);

        yearTx.forEach(t => {
            const m = parseInt(t.date.split('-')[1]) - 1;
            if (m >= 0 && m < 12) monthlyTotals[m] += t.amount;
        });

        this.destroyChart('dashTrend');
        this.charts.dashTrend = new Chart(ctx, {
            type: 'line',
            data: {
                labels: MONTH_NAMES.map(m => m.substring(0, 3)),
                datasets: [{
                    label: `Expenses (${year})`,
                    data: monthlyTotals,
                    borderColor: '#6366f1',
                    backgroundColor: 'rgba(99, 102, 241, 0.15)',
                    fill: true,
                    tension: 0.35,
                    borderWidth: 3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { callback: (val) => this.settings.currency + val }
                    }
                }
            }
        });
    }

    renderDashCategoryChart(monthTx) {
        const ctx = document.getElementById('chart-dash-category')?.getContext('2d');
        if (!ctx) return;

        const expenses = monthTx.filter(t => t.type === 'Expense');
        const catMap = {};
        expenses.forEach(t => {
            catMap[t.category] = (catMap[t.category] || 0) + t.amount;
        });

        const labels = Object.keys(catMap);
        const data = Object.values(catMap);

        this.destroyChart('dashCategory');

        if (labels.length === 0) {
            ctx.clearRect(0, 0, 300, 300);
            return;
        }

        this.charts.dashCategory = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: [
                        '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
                        '#ec4899', '#06b6d4', '#14b8a6', '#f97316', '#64748b'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'right', labels: { boxWidth: 12 } }
                }
            }
        });
    }

    renderDashIncomeExpenseChart(monthTx) {
        const ctx = document.getElementById('chart-dash-income-expense')?.getContext('2d');
        if (!ctx) return;

        const income = monthTx.filter(t => t.type === 'Income').reduce((s, t) => s + t.amount, 0);
        const expense = monthTx.filter(t => t.type === 'Expense').reduce((s, t) => s + t.amount, 0);

        this.destroyChart('dashIncomeExpense');
        this.charts.dashIncomeExpense = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Income', 'Expense'],
                datasets: [{
                    label: 'Amount',
                    data: [income, expense],
                    backgroundColor: ['#10b981', '#ef4444'],
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
    }

    renderDashBudgetStatus(currentExpense) {
        const container = document.getElementById('dash-budget-status-container');
        if (!container) return;

        const overallBudget = this.budgets['__overall__'] || 0;
        if (!overallBudget) {
            container.innerHTML = `
                <div class="info-alert">
                    💡 No overall monthly budget set. Configure your budget in the <a href="#" onclick="app.navigateTo('budget');return false;" style="color:var(--primary);font-weight:700">Budget section</a>.
                </div>`;
            return;
        }

        const remaining = overallBudget - currentExpense;
        const percent = Math.min((currentExpense / overallBudget) * 100, 100);
        const status = currentExpense > overallBudget ? 'Over budget' : (percent >= 80 ? 'Near budget' : 'Under budget');
        const statusClass = status === 'Over budget' ? 'status-over' : (status === 'Near budget' ? 'status-near' : 'status-under');
        const fillClass = status === 'Over budget' ? 'fill-over' : (status === 'Near budget' ? 'fill-near' : 'fill-under');

        container.innerHTML = `
            <div class="budget-item">
                <div class="budget-item-header">
                    <strong>Monthly Overall Budget</strong>
                    <span class="budget-status-badge ${statusClass}">${status}</span>
                </div>
                <div class="progress-bar-bg">
                    <div class="progress-bar-fill ${fillClass}" style="width: ${percent.toFixed(1)}%"></div>
                </div>
                <div class="budget-caption">
                    Budget: ${this.formatMoney(overallBudget)} · Spent: ${this.formatMoney(currentExpense)} · Remaining: ${this.formatMoney(remaining)} (${percent.toFixed(1)}%)
                </div>
            </div>
        `;
    }

    /* ==========================================
       Add Transaction Logic
       ========================================== */
    handleAddTransaction(event) {
        event.preventDefault();

        const date = document.getElementById('add-date').value;
        const type = document.getElementById('add-type').value;
        const category = document.getElementById('add-category').value;
        const subcategory = document.getElementById('add-subcategory').value.trim();
        const description = document.getElementById('add-description').value.trim();
        const amount = parseFloat(document.getElementById('add-amount').value);
        const payment = document.getElementById('add-payment').value;
        const notes = document.getElementById('add-notes').value.trim();

        if (!description || isNaN(amount) || amount <= 0) {
            this.showToast('Please provide a valid description and positive amount', 'error');
            return;
        }

        const newRecord = {
            id: Date.now(),
            date,
            type,
            category,
            subcategory,
            description,
            amount,
            payment_method: payment,
            notes
        };

        this.transactions.push(newRecord);
        this.saveState();
        this.showToast('Transaction added successfully!', 'success');

        const addAnother = document.getElementById('add-another-toggle')?.checked;
        if (addAnother) {
            this.resetAddForm();
        } else {
            this.navigateTo('dashboard');
        }
    }

    resetAddForm() {
        document.getElementById('form-add-transaction')?.reset();
        document.getElementById('add-date').value = new Date().toISOString().split('T')[0];
        document.getElementById('add-category').value = this.settings.default_category || this.categories[0];
        document.getElementById('add-payment').value = this.settings.default_payment || DEFAULT_PAYMENTS[0];
    }

    /* ==========================================
       Transactions View Logic
       ========================================== */
    renderTransactionsTable() {
        if (this.currentPage !== 'transactions') return;

        const start = document.getElementById('filter-start')?.value;
        const end = document.getElementById('filter-end')?.value;
        const type = document.getElementById('filter-type')?.value || 'All';
        const cat = document.getElementById('filter-category')?.value || 'All';
        const pay = document.getElementById('filter-payment')?.value || 'All';
        const search = document.getElementById('filter-search')?.value.toLowerCase().trim();
        const minAmt = parseFloat(document.getElementById('filter-min')?.value) || 0;
        const maxAmt = parseFloat(document.getElementById('filter-max')?.value) || 0;
        const sort = document.getElementById('filter-sort')?.value || 'newest';

        let filtered = [...this.transactions];

        if (start) filtered = filtered.filter(t => t.date >= start);
        if (end) filtered = filtered.filter(t => t.date <= end);
        if (type !== 'All') filtered = filtered.filter(t => t.type === type);
        if (cat !== 'All') filtered = filtered.filter(t => t.category === cat);
        if (pay !== 'All') filtered = filtered.filter(t => t.payment_method === pay);
        if (minAmt > 0) filtered = filtered.filter(t => t.amount >= minAmt);
        if (maxAmt > 0) filtered = filtered.filter(t => t.amount <= maxAmt);
        if (search) {
            filtered = filtered.filter(t => 
                t.description.toLowerCase().includes(search) || 
                (t.subcategory && t.subcategory.toLowerCase().includes(search)) ||
                (t.notes && t.notes.toLowerCase().includes(search))
            );
        }

        // Sorting
        if (sort === 'newest') {
            filtered.sort((a, b) => new Date(b.date) - new Date(a.date) || b.id - a.id);
        } else if (sort === 'oldest') {
            filtered.sort((a, b) => new Date(a.date) - new Date(b.date) || a.id - b.id);
        } else if (sort === 'amount-desc') {
            filtered.sort((a, b) => b.amount - a.amount);
        } else if (sort === 'amount-asc') {
            filtered.sort((a, b) => a.amount - b.amount);
        }

        this.filteredTransactions = filtered;

        // Metric Badges
        const totalAmount = filtered.reduce((s, t) => s + (t.type === 'Expense' ? t.amount : t.amount), 0);
        document.getElementById('tx-filtered-total').textContent = this.formatMoney(totalAmount);
        document.getElementById('tx-count-badge').textContent = `${filtered.length} transactions`;

        // Pagination
        const totalPages = Math.max(1, Math.ceil(filtered.length / this.pageSize));
        if (this.currentPageNum > totalPages) this.currentPageNum = totalPages;

        const startIdx = (this.currentPageNum - 1) * this.pageSize;
        const pageItems = filtered.slice(startIdx, startIdx + this.pageSize);

        document.getElementById('pagination-info').textContent = `Page ${this.currentPageNum} of ${totalPages}`;

        const tbody = document.querySelector('#table-transactions tbody');
        if (tbody) {
            if (pageItems.length === 0) {
                tbody.innerHTML = `<tr><td colspan="8" class="text-center" style="padding:2rem;color:var(--text-secondary)">No matching transactions found. Try resetting filters.</td></tr>`;
            } else {
                tbody.innerHTML = pageItems.map(t => `
                    <tr>
                        <td>${this.formatDateDisplay(t.date)}</td>
                        <td><span class="badge badge-${t.type.toLowerCase()}">${t.type}</span></td>
                        <td><span class="badge badge-category">${t.category}</span></td>
                        <td>${t.subcategory ? this.escapeHtml(t.subcategory) : '-'}</td>
                        <td><strong>${this.escapeHtml(t.description)}</strong></td>
                        <td>${t.payment_method}</td>
                        <td class="text-right" style="font-weight:700; color:${t.type === 'Income' ? 'var(--success)' : 'var(--text-primary)'}">
                            ${t.type === 'Income' ? '+' : '-'}${this.formatMoney(t.amount)}
                        </td>
                        <td class="text-center">
                            <button class="btn btn-secondary btn-sm" onclick="app.openEditModal(${t.id})" title="Edit">✏️</button>
                            <button class="btn btn-secondary btn-sm" onclick="app.deleteTransaction(${t.id})" title="Delete">🗑️</button>
                        </td>
                    </tr>
                `).join('');
            }
        }
    }

    resetFilters() {
        ['filter-start', 'filter-end', 'filter-search', 'filter-min', 'filter-max'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        document.getElementById('filter-type').value = 'All';
        document.getElementById('filter-category').value = 'All';
        document.getElementById('filter-payment').value = 'All';
        document.getElementById('filter-sort').value = 'newest';

        this.currentPageNum = 1;
        this.renderTransactionsTable();
    }

    /* ==========================================
       Edit & Delete Modals
       ========================================== */
    openEditModal(id) {
        const tx = this.transactions.find(t => t.id === id);
        if (!tx) return;

        document.getElementById('edit-id').value = tx.id;
        document.getElementById('edit-date').value = tx.date;
        document.getElementById('edit-type').value = tx.type;
        document.getElementById('edit-category').value = tx.category;
        document.getElementById('edit-subcategory').value = tx.subcategory || '';
        document.getElementById('edit-description').value = tx.description;
        document.getElementById('edit-amount').value = tx.amount;
        document.getElementById('edit-payment').value = tx.payment_method;
        document.getElementById('edit-notes').value = tx.notes || '';

        document.getElementById('modal-edit').classList.add('active');
    }

    closeEditModal() {
        document.getElementById('modal-edit').classList.remove('active');
    }

    handleUpdateTransaction(event) {
        event.preventDefault();

        const id = parseInt(document.getElementById('edit-id').value);
        const index = this.transactions.findIndex(t => t.id === id);
        if (index === -1) return;

        this.transactions[index] = {
            id,
            date: document.getElementById('edit-date').value,
            type: document.getElementById('edit-type').value,
            category: document.getElementById('edit-category').value,
            subcategory: document.getElementById('edit-subcategory').value.trim(),
            description: document.getElementById('edit-description').value.trim(),
            amount: parseFloat(document.getElementById('edit-amount').value),
            payment_method: document.getElementById('edit-payment').value,
            notes: document.getElementById('edit-notes').value.trim()
        };

        this.saveState();
        this.closeEditModal();
        this.showToast('Transaction updated', 'success');
        this.refreshAllViews();
    }

    deleteTransaction(id) {
        if (!confirm('Are you sure you want to delete this transaction?')) return;
        this.transactions = this.transactions.filter(t => t.id !== id);
        this.saveState();
        this.showToast('Transaction deleted', 'info');
        this.refreshAllViews();
    }

    /* ==========================================
       Analytics View Logic
       ========================================== */
    renderAnalytics() {
        if (this.currentPage !== 'analytics') return;

        const period = document.getElementById('analytics-period')?.value || 'This Month';
        const today = new Date();
        let startDate, endDate = new Date(today);

        if (period === 'This Month') {
            startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        } else if (period === 'Last Month') {
            startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            endDate = new Date(today.getFullYear(), today.getMonth(), 0);
        } else if (period === 'Last 3 Months') {
            startDate = new Date(today.getFullYear(), today.getMonth() - 2, 1);
        } else if (period === 'Last 6 Months') {
            startDate = new Date(today.getFullYear(), today.getMonth() - 5, 1);
        } else if (period === 'This Year') {
            startDate = new Date(today.getFullYear(), 0, 1);
        } else if (period === 'Custom') {
            const s = document.getElementById('ana-start-date')?.value;
            const e = document.getElementById('ana-end-date')?.value;
            startDate = s ? new Date(s) : new Date(today.getFullYear(), today.getMonth(), 1);
            endDate = e ? new Date(e) : today;
        }

        const startISO = startDate.toISOString().split('T')[0];
        const endISO = endDate.toISOString().split('T')[0];

        const periodTx = this.transactions.filter(t => t.date >= startISO && t.date <= endISO && t.type === 'Expense');
        const periodTotal = periodTx.reduce((s, t) => s + t.amount, 0);

        const days = Math.max(1, Math.round((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1);
        const dailyAvg = periodTotal / days;

        // Previous equivalent period
        const prevEnd = new Date(startDate);
        prevEnd.setDate(prevEnd.getDate() - 1);
        const prevStart = new Date(prevEnd);
        prevStart.setDate(prevStart.getDate() - (days - 1));

        const prevStartISO = prevStart.toISOString().split('T')[0];
        const prevEndISO = prevEnd.toISOString().split('T')[0];
        const prevTotal = this.transactions.filter(t => t.date >= prevStartISO && t.date <= prevEndISO && t.type === 'Expense').reduce((s, t) => s + t.amount, 0);

        document.getElementById('ana-total-expenses').textContent = this.formatMoney(periodTotal);
        document.getElementById('ana-daily-avg').textContent = this.formatMoney(dailyAvg);
        document.getElementById('ana-prev-period').textContent = this.formatMoney(prevTotal);

        const alertBox = document.getElementById('ana-comparison-alert');
        if (alertBox) {
            if (prevTotal > 0) {
                const diffPct = (((periodTotal - prevTotal) / prevTotal) * 100).toFixed(1);
                const isMore = periodTotal > prevTotal;
                alertBox.className = `info-alert ${isMore ? 'status-over' : 'status-under'}`;
                alertBox.textContent = `Spending changed by ${isMore ? '+' : ''}${diffPct}% compared with the previous ${days}-day period.`;
            } else {
                alertBox.className = 'info-alert';
                alertBox.textContent = `No spending recorded in the previous equivalent ${days}-day period.`;
            }
        }

        // Charts
        this.renderAnaCategoryChart(periodTx);
        this.renderAnaDailyTrendChart(periodTx, startISO, endISO);
        this.renderAnaMonthlyChart(this.transactions);
        this.renderAnaPaymentChart(periodTx);
        this.renderAnaCategoryBarChart(periodTx);
        this.renderTopExpensesTable(periodTx);
    }

    renderAnaCategoryChart(periodTx) {
        const ctx = document.getElementById('chart-ana-category')?.getContext('2d');
        if (!ctx) return;

        const catMap = {};
        periodTx.forEach(t => catMap[t.category] = (catMap[t.category] || 0) + t.amount);

        this.destroyChart('anaCategory');
        this.charts.anaCategory = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(catMap),
                datasets: [{
                    data: Object.values(catMap),
                    backgroundColor: ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6']
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    renderAnaDailyTrendChart(periodTx, startISO, endISO) {
        const ctx = document.getElementById('chart-ana-daily')?.getContext('2d');
        if (!ctx) return;

        const dateMap = {};
        periodTx.forEach(t => dateMap[t.date] = (dateMap[t.date] || 0) + t.amount);

        const dates = Object.keys(dateMap).sort();
        const amounts = dates.map(d => dateMap[d]);

        this.destroyChart('anaDaily');
        this.charts.anaDaily = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: dates.map(d => this.formatDateDisplay(d)),
                datasets: [{
                    label: 'Daily Expense',
                    data: amounts,
                    backgroundColor: '#6366f1',
                    borderRadius: 4
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    renderAnaMonthlyChart(allTx) {
        const ctx = document.getElementById('chart-ana-monthly')?.getContext('2d');
        if (!ctx) return;

        const monthMap = {};
        allTx.filter(t => t.type === 'Expense').forEach(t => {
            const m = t.date.substring(0, 7);
            monthMap[m] = (monthMap[m] || 0) + t.amount;
        });

        const sortedMonths = Object.keys(monthMap).sort();

        this.destroyChart('anaMonthly');
        this.charts.anaMonthly = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: sortedMonths,
                datasets: [{
                    label: 'Monthly Total',
                    data: sortedMonths.map(m => monthMap[m]),
                    backgroundColor: '#10b981',
                    borderRadius: 6
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    renderAnaPaymentChart(periodTx) {
        const ctx = document.getElementById('chart-ana-payment')?.getContext('2d');
        if (!ctx) return;

        const payMap = {};
        periodTx.forEach(t => payMap[t.payment_method] = (payMap[t.payment_method] || 0) + t.amount);

        this.destroyChart('anaPayment');
        this.charts.anaPayment = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: Object.keys(payMap),
                datasets: [{
                    data: Object.values(payMap),
                    backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#f97316']
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    renderAnaCategoryBarChart(periodTx) {
        const ctx = document.getElementById('chart-ana-category-bar')?.getContext('2d');
        if (!ctx) return;

        const catMap = {};
        periodTx.forEach(t => catMap[t.category] = (catMap[t.category] || 0) + t.amount);

        this.destroyChart('anaCatBar');
        this.charts.anaCatBar = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Object.keys(catMap),
                datasets: [{
                    label: 'Category Total',
                    data: Object.values(catMap),
                    backgroundColor: '#8b5cf6',
                    borderRadius: 6
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y' }
        });
    }

    renderTopExpensesTable(periodTx) {
        const top10 = [...periodTx].sort((a, b) => b.amount - a.amount).slice(0, 10);
        const tbody = document.querySelector('#table-top-expenses tbody');
        if (!tbody) return;

        if (top10.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center" style="padding:2rem;color:var(--text-secondary)">No expense transactions in this period.</td></tr>`;
        } else {
            tbody.innerHTML = top10.map(t => `
                <tr>
                    <td>${this.formatDateDisplay(t.date)}</td>
                    <td><span class="badge badge-category">${t.category}</span></td>
                    <td><strong>${this.escapeHtml(t.description)}</strong></td>
                    <td>${t.payment_method}</td>
                    <td class="text-right" style="font-weight:700;color:var(--danger)">-${this.formatMoney(t.amount)}</td>
                </tr>
            `).join('');
        }
    }

    /* ==========================================
       Budget Logic
       ========================================== */
    handleSaveBudgets(event) {
        event.preventDefault();

        const overall = parseFloat(document.getElementById('budget-overall').value) || 0;
        const cat = document.getElementById('budget-category-select').value;
        const catAmt = parseFloat(document.getElementById('budget-category-amount').value) || 0;

        if (overall >= 0) this.budgets['__overall__'] = overall;
        if (cat && catAmt >= 0) this.budgets[cat] = catAmt;

        this.saveState();
        this.showToast('Budgets saved successfully', 'success');
        this.renderBudgetProgress();
    }

    renderBudgetProgress() {
        if (this.currentPage !== 'budget') return;

        const overallInput = document.getElementById('budget-overall');
        if (overallInput) overallInput.value = this.budgets['__overall__'] || '';

        const container = document.getElementById('budget-progress-list');
        if (!container) return;

        const now = new Date();
        const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const monthTx = this.transactions.filter(t => t.date.startsWith(monthStr) && t.type === 'Expense');

        const keys = Object.keys(this.budgets);
        if (keys.length === 0) {
            container.innerHTML = `<div class="info-alert">No budgets configured yet. Enter amounts above to track monthly goals.</div>`;
            return;
        }

        container.innerHTML = keys.map(catKey => {
            const budget = this.budgets[catKey];
            if (budget <= 0) return '';

            const isOverall = catKey === '__overall__';
            const spent = isOverall
                ? monthTx.reduce((s, t) => s + t.amount, 0)
                : monthTx.filter(t => t.category === catKey).reduce((s, t) => s + t.amount, 0);

            const remaining = budget - spent;
            const percent = Math.min((spent / budget) * 100, 100);
            const status = spent > budget ? 'Over budget' : (percent >= 80 ? 'Near budget' : 'Under budget');
            const statusClass = status === 'Over budget' ? 'status-over' : (status === 'Near budget' ? 'status-near' : 'status-under');
            const fillClass = status === 'Over budget' ? 'fill-over' : (status === 'Near budget' ? 'fill-near' : 'fill-under');

            return `
                <div class="budget-item">
                    <div class="budget-item-header">
                        <strong>${isOverall ? '🌐 Overall Monthly Budget' : catKey}</strong>
                        <span class="budget-status-badge ${statusClass}">${status}</span>
                    </div>
                    <div class="progress-bar-bg">
                        <div class="progress-bar-fill ${fillClass}" style="width: ${percent.toFixed(1)}%"></div>
                    </div>
                    <div class="budget-caption">
                        Budget: ${this.formatMoney(budget)} · Spent: ${this.formatMoney(spent)} · Remaining: ${this.formatMoney(remaining)} (${percent.toFixed(1)}%)
                    </div>
                </div>
            `;
        }).join('');
    }

    /* ==========================================
       Import & Export Logic
       ========================================== */
    exportCSV() {
        const scope = document.querySelector('input[name="export-scope"]:checked')?.value;
        let dataToExport = [...this.transactions];

        if (scope === 'range') {
            const from = document.getElementById('export-from')?.value;
            const to = document.getElementById('export-to')?.value;
            if (from) dataToExport = dataToExport.filter(t => t.date >= from);
            if (to) dataToExport = dataToExport.filter(t => t.date <= to);
        }

        const csv = Papa.unparse(dataToExport.map(t => ({
            date: t.date,
            category: t.category,
            subcategory: t.subcategory || '',
            description: t.description,
            amount: t.amount,
            payment_method: t.payment_method,
            type: t.type,
            notes: t.notes || ''
        })));

        this.downloadFile(csv, 'spendwise_transactions.csv', 'text/csv;charset=utf-8;');
        this.showToast(`Exported ${dataToExport.length} transactions to CSV`, 'success');
    }

    exportJSON() {
        const data = {
            transactions: this.transactions,
            categories: this.categories,
            budgets: this.budgets,
            settings: this.settings
        };
        const json = JSON.stringify(data, null, 2);
        this.downloadFile(json, 'spendwise_backup.json', 'application/json');
        this.showToast('Exported complete JSON backup', 'success');
    }

    downloadFile(content, filename, contentType) {
        const blob = new Blob([content], { type: contentType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    handleFileImport(file) {
        const isJSON = file.name.endsWith('.json');
        const isCSV = file.name.endsWith('.csv');

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target.result;
            if (isJSON) {
                try {
                    const parsed = JSON.parse(text);
                    if (parsed.transactions && Array.isArray(parsed.transactions)) {
                        this.transactions = parsed.transactions;
                        if (parsed.categories) this.categories = parsed.categories;
                        if (parsed.budgets) this.budgets = parsed.budgets;
                        if (parsed.settings) this.settings = parsed.settings;
                        this.saveState();
                        this.showToast('JSON Backup restored successfully!', 'success');
                        this.refreshAllViews();
                    }
                } catch (err) {
                    this.showToast('Invalid JSON backup file', 'error');
                }
            } else if (isCSV) {
                Papa.parse(text, {
                    header: true,
                    skipEmptyLines: true,
                    complete: (results) => {
                        const rows = results.data;
                        const valid = [];
                        let invalidCount = 0;

                        rows.forEach((row, idx) => {
                            const date = row.date || row.Date;
                            const category = row.category || row.Category;
                            const description = row.description || row.Description;
                            const amount = parseFloat(row.amount || row.Amount);
                            const type = row.type || row.Type || 'Expense';
                            const payment = row.payment_method || row['Payment Method'] || 'Cash';
                            const subcat = row.subcategory || row.Subcategory || '';
                            const notes = row.notes || row.Notes || '';

                            if (date && category && description && !isNaN(amount) && amount > 0) {
                                valid.push({
                                    id: Date.now() + idx,
                                    date,
                                    type,
                                    category,
                                    subcategory: subcat,
                                    description,
                                    amount,
                                    payment_method: payment,
                                    notes
                                });
                            } else {
                                invalidCount++;
                            }
                        });

                        this.pendingImportRecords = valid;

                        document.getElementById('import-preview-section')?.classList.remove('hidden');
                        document.getElementById('import-total-rows').textContent = rows.length;
                        document.getElementById('import-valid-rows').textContent = valid.length;
                        document.getElementById('import-invalid-rows').textContent = invalidCount;

                        const confirmBtn = document.getElementById('btn-confirm-import');
                        if (confirmBtn) confirmBtn.disabled = valid.length === 0;
                    }
                });
            }
        };
        reader.readAsText(file);
    }

    confirmImport() {
        if (!this.pendingImportRecords.length) return;
        this.transactions.push(...this.pendingImportRecords);
        this.saveState();
        this.showToast(`Imported ${this.pendingImportRecords.length} records successfully!`, 'success');
        this.pendingImportRecords = [];
        document.getElementById('import-preview-section')?.classList.add('hidden');
        this.refreshAllViews();
    }

    /* ==========================================
       Settings & Demo Data
       ========================================== */
    handleSaveSettings(event) {
        event.preventDefault();
        this.settings.currency = document.getElementById('settings-currency').value;
        this.settings.default_category = document.getElementById('settings-default-cat').value;
        this.settings.default_payment = document.getElementById('settings-default-pay').value;
        const theme = document.getElementById('settings-theme').value;

        this.applyTheme(theme);
        this.saveState();
        this.showToast('Settings saved successfully', 'success');
        this.refreshAllViews();
    }

    handleAddCategory(event) {
        event.preventDefault();
        const input = document.getElementById('new-category-name');
        const name = input?.value.trim();

        if (!name) return;
        if (this.categories.includes(name)) {
            this.showToast('Category already exists', 'error');
            return;
        }

        this.categories.push(name);
        this.saveState();
        this.populateDropdowns();
        this.renderCategoryChips();
        input.value = '';
        this.showToast(`Added category: ${name}`, 'success');
    }

    renderCategoryChips() {
        const container = document.getElementById('category-chips-container');
        if (!container) return;

        container.innerHTML = this.categories.map(cat => `
            <span class="chip">
                ${cat}
                <button style="border:none;background:none;cursor:pointer;color:var(--danger)" onclick="app.removeCategory('${this.escapeHtml(cat)}')">✕</button>
            </span>
        `).join('');
    }

    removeCategory(catName) {
        if (this.categories.length <= 1) {
            this.showToast('At least one category is required', 'error');
            return;
        }
        this.categories = this.categories.filter(c => c !== catName);
        this.saveState();
        this.populateDropdowns();
        this.renderCategoryChips();
        this.showToast(`Removed category ${catName}`, 'info');
    }

    loadDemoData() {
        this.generateDemoData(true);
    }

    generateDemoData(showToast = true) {
        const samples = [
            { cat: '🍔 Food', sub: 'Groceries', desc: 'Weekly supermarket shopping', base: 1800, type: 'Expense' },
            { cat: '🚗 Transport', sub: 'Fuel', desc: 'Petrol refill at Shell station', base: 1300, type: 'Expense' },
            { cat: '🛍️ Shopping', sub: 'Clothing', desc: 'Summer apparel purchase', base: 2300, type: 'Expense' },
            { cat: '💳 Bills', sub: 'Mobile bill', desc: 'Monthly broadband & cell bill', base: 699, type: 'Expense' },
            { cat: '🎬 Entertainment', sub: 'Cinema', desc: 'IMAX movie tickets & popcorn', base: 500, type: 'Expense' },
            { cat: '🏥 Health', sub: 'Pharmacy', desc: 'Monthly vitamins & meds', base: 850, type: 'Expense' },
            { cat: '🎓 Education', sub: 'Books', desc: 'Tech books & online courses', base: 1200, type: 'Expense' },
            { cat: '✈️ Travel', sub: 'Train tickets', desc: 'Weekend trip train reservation', base: 1850, type: 'Expense' }
        ];

        const today = new Date();
        const demo = [];

        for (let i = 0; i < 30; i++) {
            const d = new Date(today);
            d.setDate(d.getDate() - (i * 3 + Math.floor(Math.random() * 2)));

            const isIncome = (i === 0 || i === 12 || i === 24);
            const sample = samples[i % samples.length];

            const record = {
                id: Date.now() - i * 10000,
                date: d.toISOString().split('T')[0],
                type: isIncome ? 'Income' : 'Expense',
                category: isIncome ? '📦 Other' : sample.cat,
                subcategory: isIncome ? 'Salary' : sample.sub,
                description: isIncome ? 'Monthly Salary Credit' : sample.desc,
                amount: isIncome ? 75000 : sample.base + Math.floor(Math.random() * 400),
                payment_method: DEFAULT_PAYMENTS[i % (DEFAULT_PAYMENTS.length - 1)],
                notes: 'Sample demo transaction'
            };
            demo.push(record);
        }

        this.transactions.push(...demo);
        this.budgets['__overall__'] = 60000;
        this.budgets['🍔 Food'] = 15000;
        this.budgets['🚗 Transport'] = 8000;

        this.saveState();
        if (showToast) this.showToast('Loaded 30 sample transactions!', 'success');
        this.refreshAllViews();
    }

    deleteAllData() {
        this.transactions = [];
        this.budgets = {};
        this.saveState();
        this.showToast('All transaction data has been permanently deleted.', 'info');
        this.refreshAllViews();

        const deleteCheck = document.getElementById('confirm-delete-check');
        const deleteText = document.getElementById('confirm-delete-text');
        const deleteBtn = document.getElementById('btn-delete-all');
        if (deleteCheck) deleteCheck.checked = false;
        if (deleteText) deleteText.value = '';
        if (deleteBtn) deleteBtn.disabled = true;
    }

    /* Helper Utilities */
    destroyChart(key) {
        if (this.charts[key]) {
            this.charts[key].destroy();
            delete this.charts[key];
        }
    }

    renderCharts() {
        if (this.currentPage === 'dashboard') this.renderDashboard();
        if (this.currentPage === 'analytics') this.renderAnalytics();
    }

    escapeHtml(str) {
        return String(str || '').replace(/[&<>"']/g, function(m) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
        });
    }
}

// Global App Singleton Instance
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new SpendWiseApp();
});
