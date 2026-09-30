# 💸 SpendWise

**Simple, smart and private expense tracking.** A modern, local personal-finance dashboard built with Python, Streamlit, SQLite, Pandas and Plotly.

## Features

- Income/expense entry, editing, deletion, search, filtering, sorting and pagination.
- Monthly dashboard, category and payment-method charts, savings rate, daily and monthly analytics.
- Overall and category budgets with progress bars and over-budget warnings.
- CSV and Excel import preview, per-row validation, and CSV/Excel export.
- Custom categories, configurable defaults, display currency symbol, confirmation before destructive actions.
- Optional 30-row Indian-rupee demo dataset; never inserted automatically.

## Windows installation

Install **Python 3.11 or newer** from python.org (check **Add Python to PATH** during setup). Open PowerShell or Command Prompt in the extracted `expense_tracker` folder:

```bat
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
streamlit run app.py
```

Open the local URL displayed in the terminal, usually `http://localhost:8501`. Stop the app with **Ctrl+C**. To restart later, activate the same environment and run `streamlit run app.py`.

## 🌐 HTML Format Edition (Standalone Web Application)

You can also run SpendWise as a **standalone HTML web application**:
- Simply double-click `index.html` to open directly in any web browser (Chrome, Edge, Firefox, Safari).
- Or run a local HTTP web server: `python -m http.server 8080` and open `http://localhost:8080/`.
- **Features**: Fast offline-first LocalStorage persistence, Chart.js interactive graphs, PapaParse CSV import/export, dark/light theme toggle, custom categories, budget tracking, and responsive layout.

If PowerShell blocks activation, use Command Prompt, or run `venv\Scripts\activate.bat` in Command Prompt.

## Project structure

- `app.py`: interface, forms, navigation and import/export.
- `database.py`: parameterized SQLite CRUD and schema initialization.
- `calculations.py`: financial statistics and budget calculations.
- `charts.py`: interactive Plotly visualizations.
- `utils.py`: formatting, validation and shared options.
- `data/expenses.db`: SQLite database, created on first run.
- `requirements.txt`: installable Python dependencies.

## Database structure

`expenses`: `id` (integer primary key), `date` (ISO text), `category`, `subcategory`, `description`, `amount` (positive real), `payment_method`, `type` (`Income`/`Expense`), `notes`, `created_at`.

`categories`: `name` (primary key). `budgets`: `category` (primary key, with `__overall__` representing the monthly total) and `amount`. `settings`: key/value preferences.

All transaction data remains **on your local computer** in SQLite. No transaction data is sent to external APIs or servers by the application. Keep a backup of `data/expenses.db` while the app is closed. The app has no login: run it only on a trusted computer and do not expose the Streamlit port publicly. The saved theme preference is informational; actual Streamlit theme can be changed via its Settings menu. Currency choices change the display symbol only; figures are in INR.

## Import format

Required: `date`, `category`, `description`, `amount`, `payment_method`, `type`. Optional: `subcategory`, `notes`. Dates should be `YYYY-MM-DD` or a clear day-first date. Categories must already exist in Settings; transaction type is `Expense` or `Income`. Invalid rows are reported and skipped. Review the preview before importing. Import does not deduplicate records.

## Screenshots

Add screenshots of the Dashboard, Transactions, Analytics and Budget pages here after running the application.

## Future improvements

Recurring transactions, multi-user authentication, encrypted backups, budget histories, and automated categorization. Currently budgets apply to every month, not separately by month. Savings rate is zero when income is zero; a negative net balance is possible.
