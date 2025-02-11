document.addEventListener("DOMContentLoaded", () => {
    const registerBtn = document.getElementById("register-btn");
    const generateSecretBtn = document.getElementById("generate-secret-btn");
    const getOtpBtn = document.getElementById("get-otp-btn");
    const logoutBtn = document.getElementById("logout-btn");
    const otpDisplay = document.getElementById("otp-display");

    if (registerBtn) registerBtn.addEventListener("click", registerWebAuthn);
    if (generateSecretBtn) generateSecretBtn.addEventListener("click", storeTotpSecret);
    if (getOtpBtn) getOtpBtn.addEventListener("click", generateOtp);
    if (logoutBtn) logoutBtn.addEventListener("click", clearAllData);

    // Проверка платформы Android и отображение баннера
    if (/Android/i.test(navigator.userAgent)) {
        const banner = document.createElement("div");
        banner.innerText = "Уважаемый пользователь, для телефона с ОС Android доступно приложение OTP с сайта!";
        banner.style.position = "fixed";
        banner.style.bottom = "0";
        banner.style.width = "100%";
        banner.style.backgroundColor = "#ffcc00";
        banner.style.padding = "10px";
        banner.style.textAlign = "center";
        banner.style.fontWeight = "bold";
        document.body.appendChild(banner);
    }

    // Автообновление OTP каждые 30 секунд
    setInterval(() => {
        generateOtp();
    }, 30000);
});

async function generateOtp() {
    try {
        const secret = await getTotpSecret();
        if (!secret) {
            otpDisplay.innerText = "Ошибка: Секретный ключ не найден!";
            return;
        }
        const otp = await generateTotp(secret);
        otpDisplay.innerText = `Ваш OTP: ${otp}`;
    } catch (err) {
        console.error("Ошибка генерации OTP", err);
    }
}

// Обновленный UI: модернизированный стиль, плавные анимации и карточный интерфейс
