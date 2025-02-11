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

// Функция регистрации WebAuthn
async function registerWebAuthn() {
    try {
        const usernameInput = document.getElementById("username").value.trim();
        if (!/^[A-Za-z]{1,255}$/.test(usernameInput)) {
            alert("Логин должен содержать только латинские буквы и быть не длиннее 255 символов.");
            return;
        }

        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);

        const credential = await navigator.credentials.create({
            publicKey: {
                challenge: challenge,
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

        localStorage.setItem("totp_credential_id", arrayBufferToBase64(credential.rawId));
        alert("Регистрация завершена. Теперь создайте TOTP-ключ.");
    } catch (err) {
        console.error("Ошибка регистрации WebAuthn", err);
    }
}

// Функция сохранения TOTP-секрета в WebAuthn Large Blob
async function storeTotpSecret() {
    try {
        const secret = generateRandomSecret();
        alert(`Секретный ключ TOTP: ${secret}`);

        const storedCredentialId = localStorage.getItem("totp_credential_id");
        if (!storedCredentialId) {
            throw new Error("Идентификатор учетных данных не найден. Сначала выполните регистрацию.");
        }

        const allowCredential = [{
            type: "public-key",
            id: base64ToArray(storedCredentialId),
            transports: ["internal"],
        }];

        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);

        const publicKeyOptions = {
            challenge: challenge,
            allowCredentials: allowCredential,
            userVerification: "required",
            extensions: { largeBlob: { write: new TextEncoder().encode(secret) } },
        };

        await navigator.credentials.get({ publicKey: publicKeyOptions });

        alert("Секрет сохранён в WebAuthn Large Blob.");
    } catch (err) {
        console.error("Ошибка при сохранении секрета TOTP", err);
    }
}

// Функция получения TOTP-секрета
async function getTotpSecret() {
    try {
        const storedCredentialId = localStorage.getItem("totp_credential_id");
        if (!storedCredentialId) throw new Error("Идентификатор учётных данных не найден.");

        const allowCredential = [{
            type: "public-key",
            id: base64ToArray(storedCredentialId),
            transports: ["internal"],
        }];

        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);

        const publicKeyOptions = {
            challenge: challenge,
            allowCredentials: allowCredential,
            userVerification: "required",
            extensions: { largeBlob: { read: true } },
        };

        const credential = await navigator.credentials.get({ publicKey: publicKeyOptions });

        if (credential.getClientExtensionResults) {
            const extResults = credential.getClientExtensionResults();
            if (extResults.largeBlob && extResults.largeBlob.blob) {
                return new TextDecoder().decode(extResults.largeBlob.blob);
            } else {
                throw new Error("LargeBlob не содержит данных.");
            }
        } else {
            throw new Error("Невозможно получить данные из расширений.");
        }
    } catch (err) {
        console.error("Ошибка при получении секрета TOTP", err);
        throw err;
    }
}

// Функция генерации OTP-кода
async function generateOtp() {
    try {
        const secret = await getTotpSecret();
        if (!secret) {
            document.getElementById("otp-display").innerText = "Ошибка: Секретный ключ не найден!";
            return;
        }
        const otp = await generateTotp(secret);
        document.getElementById("otp-display").innerText = `Ваш OTP: ${otp}`;
    } catch (err) {
        console.error("Ошибка генерации OTP", err);
    }
}

// Вспомогательные функции
function generateRandomSecret() {
    const array = new Uint8Array(10);
    window.crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, "0")).join("");
}

function arrayBufferToBase64(buffer) {
    return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

function base64ToArray(base64String) {
    const binaryString = atob(base64String);
    return new Uint8Array([...binaryString].map(char => char.charCodeAt(0)));
}
