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

async function registerWebAuthn() {
    try {
        const usernameInput = document.getElementById("username").value.trim();
        if (!/^[A-Za-z]{1,255}$/.test(usernameInput)) {
            alert("Логин должен содержать только латинские буквы и быть не длиннее 255 символов.");
            return;
        }

        const credential = await navigator.credentials.create({
            publicKey: {
                challenge: new TextEncoder().encode("registration"),
                rp: { name: "OTP" },
                user: {
                    id: new TextEncoder().encode(usernameInput),
                    name: usernameInput,
                    displayName: usernameInput,
                },
                pubKeyCredParams: [{ type: "public-key", alg: -7 }],
                attestation: "none",
                extensions: { largeBlob: { support: "required" } },
            },
        });
        localStorage.setItem("webauthn_id", arrayBufferToBase64(credential.rawId));
        alert("Регистрация завершена. Теперь создайте TOTP-ключ.");
    } catch (err) {
        console.error("Ошибка регистрации WebAuthn", err);
    }
}
