/**
 * ExpenseTracker Configuration
 * 
 * To connect to Google Sheets:
 * 1. Create a Google Sheet.
 * 2. Go to Extensions -> Apps Script.
 * 3. Paste the provided Google Apps Script code (from the guide).
 * 4. Deploy as a Web App (Access: Anyone).
 * 5. Copy the Web App URL and paste it below.
 */

const CONFIG = {
    // Your Google Sheets API Key
    API_KEY: 'AIzaSyCZHJK2iUlrVPsZXvem-_TkGLz7b-35YUA',

    // Your Google Sheet ID (from the URL)
    SHEET_ID: '1lWC3nFh7kw-A4pbcZfbF_CTmnLfwTZIGGjxOnMI_T1o',

    // Google Apps Script Web App URL (Recommended for Write operations)
    SCRIPT_URL: 'https://script.google.com/macros/s/AKfycby5NvsvPgeMxFUtoGFHPvXnrgRO32bj1CoXlp08iN4rsRqrLzC7Z0V7iuesDCJmOLPf/exec',

    // Default currency
    CURRENCY: 'Rs.',

    // Smart Icon Suggestions
    ICON_SUGGESTIONS: {
        'food': 'fa-utensils',
        'drink': 'fa-glass-water',
        'car': 'fa-car',
        'travel': 'fa-plane',
        'rent': 'fa-house-chimney',
        'bill': 'fa-file-invoice-dollar',
        'utility': 'fa-bolt',
        'shopping': 'fa-bag-shopping',
        'grocery': 'fa-cart-shopping',
        'health': 'fa-heart-pulse',
        'hospital': 'fa-hospital',
        'medicine': 'fa-pills',
        'education': 'fa-book-open',
        'school': 'fa-school',
        'gym': 'fa-dumbbell',
        'sport': 'fa-basketball',
        'entertainment': 'fa-gamepad',
        'movie': 'fa-film',
        'salary': 'fa-hand-holding-dollar',
        'income': 'fa-money-bill-trend-up',
        'gift': 'fa-gift',
        'pet': 'fa-paw',
        'phone': 'fa-mobile-screen',
        'internet': 'fa-wifi',
        'saving': 'fa-piggy-bank',
        'loan': 'fa-hand-holding-hand',
        'gas': 'fa-gas-pump',
        'repair': 'fa-wrench',
    }
};
