$(document).ready(() => {
    // Check if already logged in
    if (localStorage.getItem('expensify_session') === 'active') {
        window.location.href = 'index.html';
    }

    $('#auth-form').on('submit', async (e) => {
        e.preventDefault();
        const input = $('#auth-passcode').val();
        
        // UI Feedback
        const $btn = $('button[type="submit"]');
        const $btnText = $('#btn-text');
        const $loader = $('#btn-loader');
        
        $btn.prop('disabled', true).addClass('opacity-80');
        $btnText.text('VERIFYING...');
        $loader.removeClass('hidden');

        try {
            // Fetch latest settings directly from Google Sheets
            const settings = await SheetsAPI.getSettings();
            const remotePasscode = settings.APP_PASSCODE;
            
            if (remotePasscode && input === String(remotePasscode)) {
                localStorage.setItem('expensify_session', 'active');
                Swal.fire({
                    icon: 'success',
                    title: 'Access Granted',
                    text: 'Redirecting to your dashboard...',
                    timer: 1500,
                    showConfirmButton: false,
                    background: '#1e293b',
                    color: '#fff'
                }).then(() => {
                    window.location.href = 'index.html';
                });
            } else {
                throw new Error('Invalid Passcode');
            }
        } catch (error) {
            console.error('Auth error:', error);
            const isConnError = error.message !== 'Invalid Passcode';
            
            $('#auth-passcode').val('').addClass('border-rose-500 animate-shake');
            setTimeout(() => $('#auth-passcode').removeClass('border-rose-500 animate-shake'), 500);
            
            Swal.fire({
                icon: 'error',
                title: isConnError ? 'Connection Error' : 'Access Denied',
                text: isConnError ? 'Could not reach Google Sheets. Please check your internet.' : 'The passcode you entered is incorrect.',
                background: '#1e293b',
                color: '#fff',
                confirmButtonColor: '#6366f1'
            });
            
            // Reset Button
            $btn.prop('disabled', false).removeClass('opacity-80');
            $btnText.text('UNLOCK SYSTEM');
            $loader.addClass('hidden');
        }
    });
});
