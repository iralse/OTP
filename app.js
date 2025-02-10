document.addEventListener("DOMContentLoaded", () => {
    const registerBtn = document.getElementById("register-btn");
    if (registerBtn) {
        registerBtn.addEventListener("click", registerWebAuthn);
    } else {
        console.error("Кнопка регистрации не найдена!");
    }

    const generateSecretBtn = document.getElementById("generate-secret-btn");
    if (generateSecretBtn) {
        generateSecretBtn.addEventListener("click", storeTotpSecret);
    }

    const getOtpBtn = document.getElementById("get-otp-btn");
    if (getOtpBtn) {
        getOtpBtn.addEventListener("click", generateOtp);
    }

    const logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", clearAllData);
    }
});
