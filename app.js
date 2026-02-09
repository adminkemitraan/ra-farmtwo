document.addEventListener('DOMContentLoaded', () => {
    // Cek kita ada di halaman mana
    const isLoginPage = document.getElementById('loginForm');
    const isDashboardPage = document.getElementById('saldoSGD');

    // --- LOGIC HALAMAN LOGIN ---
    if (isLoginPage) {
        // Cek jika user sudah login, lempar ke dashboard
        if (localStorage.getItem('wizeIsLoggedIn') === 'true') {
            window.location.href = 'dashboard.html';
        }

        const loginForm = document.getElementById('loginForm');
        const phoneInput = document.getElementById('phoneNumber');

        // Initialize intl-tel-input
        const iti = window.intlTelInput(phoneInput, {
            utilsScript: "https://cdn.jsdelivr.net/npm/intl-tel-input@18.2.1/build/js/utils.js",
            initialCountry: "id",
            preferredCountries: ["id", "my", "sg"],
            separateDialCode: true,
        });

        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const password = document.getElementById('password').value;

            // VALIDASI NOMOR HP via Library
            if (iti.isValidNumber() && password.length > 0) {
                const phone = iti.getNumber(); // Ambil nomor format internasional (contoh: +62812345678)

                // Simpan sesi login
                localStorage.setItem('wizeIsLoggedIn', 'true');
                localStorage.setItem('wizeUserPhone', phone); // Simpan nomor lengkap
                
                // Animasi loading tombol
                const btn = loginForm.querySelector('button');
                btn.innerHTML = 'Memuat...';
                
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1000);
            } else {
                alert('Mohon isi nomor HP yang valid dan password.');
            }
        });
    }

    // --- LOGIC HALAMAN DASHBOARD ---
    if (isDashboardPage) {
        // Cek proteksi halaman (harus login)
        if (localStorage.getItem('wizeIsLoggedIn') !== 'true') {
            window.location.href = 'index.html';
            return;
        }

        const promoForm = document.getElementById('promoForm');
        const promoInput = document.getElementById('promoCode');
        const saldoSGDDisplay = document.getElementById('saldoSGD');
        const saldoMYRDisplay = document.getElementById('saldoMYR');
        const notification = document.getElementById('notification');
        const withdrawBtn = document.getElementById('withdrawBtn');
        const logoutBtn = document.getElementById('logoutBtn');
        const userPhoneDisplay = document.getElementById('userPhoneDisplay');
        const historyList = document.getElementById('historyList');
        const emptyHistory = document.getElementById('emptyHistory');

        // Tampilkan info user
        const userPhone = localStorage.getItem('wizeUserPhone');
        userPhoneDisplay.textContent = userPhone;

        // Konfigurasi Kurs (Estimasi)
        const RATE_SGD_TO_MYR = 3.5; // 1 SGD = 3.5 MYR (contoh)

        // State Management (Simpan dalam SGD sebagai base currency)
        let currentSaldoSGD = parseFloat(localStorage.getItem(`wizeSaldoSGD_${userPhone}`)) || 0;
        let usedCodes = JSON.parse(localStorage.getItem(`wizeUsedCodes_${userPhone}`)) || [];
        let history = JSON.parse(localStorage.getItem(`wizeHistory_${userPhone}`)) || [];

        // Format Mata Uang
        const formatCurrency = (number, currency) => {
            return new Intl.NumberFormat(currency === 'SGD' ? 'en-SG' : 'ms-MY', {
                style: 'currency',
                currency: currency,
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            }).format(number);
        };

        // Render UI Awal
        const updateUI = () => {
            saldoSGDDisplay.textContent = formatCurrency(currentSaldoSGD, 'SGD');
            saldoMYRDisplay.textContent = formatCurrency(currentSaldoSGD * RATE_SGD_TO_MYR, 'MYR');
            renderHistory();
        };

        const renderHistory = () => {
            if (history.length > 0) {
                emptyHistory.style.display = 'none';
                historyList.innerHTML = history.map(item => `
                    <div class="flex justify-between items-center py-4 px-2 hover:bg-gray-50 transition-colors -mx-2 rounded-lg">
                        <div class="flex items-center gap-4">
                            <div class="w-10 h-10 rounded-full ${item.type === 'in' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'} flex items-center justify-center">
                                <i class="fa-solid ${item.type === 'in' ? 'fa-arrow-down' : 'fa-arrow-up'}"></i>
                            </div>
                            <div>
                                <p class="font-bold text-wise-dark text-sm">${item.desc}</p>
                                <p class="text-xs text-gray-500">${item.date}</p>
                            </div>
                        </div>
                        <div class="text-right">
                            <p class="${item.type === 'in' ? 'text-wise-dark' : 'text-wise-dark'} font-bold text-sm">
                                ${item.type === 'in' ? '+' : '-'} ${formatCurrency(item.amountSGD, 'SGD')}
                            </p>
                            <p class="text-xs text-gray-400">
                                ≈ ${formatCurrency(item.amountSGD * RATE_SGD_TO_MYR, 'MYR')}
                            </p>
                        </div>
                    </div>
                `).join('');
            }
        };

        updateUI();

        // Database Kode Promo (Mock) - Pecahan 500, 750, 1000, 1500, 2000 SGD
        const validCodes = {
            'WIZE500': 500,
            'WIZE750': 750,
            'WIZE1000': 1000,
            'WIZE1500': 1500,
            'WIZE2000': 2000,
            // Variasi kode lain
            'PROMO500': 500,
            'LUCKY750': 750,
            'SUPER1000': 1000,
            'MEGA1500': 1500,
            'JACKPOT2000': 2000
        };

        // Handle Input Promo
        promoForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const code = promoInput.value.trim().toUpperCase();

            // Reset notif
            notification.className = 'hidden p-3 rounded-lg text-sm font-medium text-center mb-4';

            if (usedCodes.includes(code)) {
                showNotification('Kode promo ini sudah Anda gunakan!', 'error');
                return;
            }

            if (validCodes.hasOwnProperty(code)) {
                const amountSGD = validCodes[code];
                
                // Update Data
                currentSaldoSGD += amountSGD;
                usedCodes.push(code);
                history.unshift({
                    desc: `Klaim Kode ${code}`,
                    date: new Date().toLocaleDateString('id-ID'),
                    amountSGD: amountSGD,
                    type: 'in'
                });

                // Simpan ke LocalStorage
                saveData();
                updateUI();
                
                showNotification(`Berhasil! Saldo bertambah ${formatCurrency(amountSGD, 'SGD')}`, 'success');
                promoInput.value = '';
            } else {
                showNotification('Kode promo tidak valid.', 'error');
            }
        });

        // Handle Logout
        logoutBtn.addEventListener('click', () => {
            if(confirm('Keluar dari akun?')) {
                localStorage.removeItem('wizeIsLoggedIn');
                window.location.href = 'index.html';
            }
        });

        // Handle Tarik Saldo (Withdraw)
        withdrawBtn.addEventListener('click', () => {
            if (currentSaldoSGD < 100) {
                showNotification('Minimal penarikan SGD 100', 'error');
                return;
            }

            const adminNumber = "6281244566790"; // Ganti dengan nomor Admin Modular/Wize
            const amountMYR = currentSaldoSGD * RATE_SGD_TO_MYR;
            
            const message = `Halo Admin Wize, saya ingin menarik saldo.\n\n` +
                          `No HP User: ${userPhone}\n` +
                          `Jumlah Penarikan:\n` +
                          `- SGD: ${formatCurrency(currentSaldoSGD, 'SGD')}\n` +
                          `- MYR: ${formatCurrency(amountMYR, 'MYR')}\n\n` +
                          `Mohon diverifikasi.`;
            
            const waLink = `https://wa.me/${adminNumber}?text=${encodeURIComponent(message)}`;

            // Buka WA
            window.open(waLink, '_blank');
        });

        function saveData() {
            localStorage.setItem(`wizeSaldoSGD_${userPhone}`, currentSaldoSGD);
            localStorage.setItem(`wizeUsedCodes_${userPhone}`, JSON.stringify(usedCodes));
            localStorage.setItem(`wizeHistory_${userPhone}`, JSON.stringify(history));
        }

        function showNotification(message, type) {
            notification.textContent = message;
            notification.classList.remove('hidden', 'bg-green-100', 'text-green-700', 'bg-red-100', 'text-red-700');
            
            if (type === 'success') {
                notification.classList.add('bg-green-100', 'text-green-700', 'block');
            } else {
                notification.classList.add('bg-red-100', 'text-red-700', 'block');
            }

            setTimeout(() => {
                notification.classList.add('hidden');
            }, 3000);
        }
    }
});