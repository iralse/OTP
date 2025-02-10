document.addEventListener("DOMContentLoaded", () => {
    // Инициализация кнопок и привязка обработчиков событий
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

// Функция регистрации WebAuthn и сохранения уникального идентификатора
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

// Функция сохранения TOTP-ключа в WebAuthn Large Blob
async function storeTotpSecret() {
    try {
        const secret = generateRandomSecret();
        alert(`Секретный ключ TOTP: ${secret}`);

        const credential = await navigator.credentials.create({
            publicKey: {
                challenge: new Uint8Array(32),
                rp: { name: "OTP" },
                user: {
                    id: new TextEncoder().encode("user"),
                    name: "user",
                    displayName: "User",
                },
                pubKeyCredParams: [{ type: "public-key", alg: -7 }],
                attestation: "none",
                authenticatorSelection: { authenticatorAttachment: "platform" },
                extensions: { largeBlob: { write: new TextEncoder().encode(secret) } },
            },
        });

        alert("Секрет сохранён в WebAuthn Large Blob.");
    } catch (err) {
        console.error("Ошибка при сохранении секрета TOTP", err);
    }
}

// Функция извлечения TOTP-ключа из WebAuthn Large Blob
async function getTotpSecret() {
    try {
        const credential = await navigator.credentials.get({
            publicKey: { extensions: { largeBlob: true } }
        });

        if (credential && credential.largeBlob) {
            return new TextDecoder().decode(credential.largeBlob);
        }
        return null;
    } catch (err) {
        console.error("Ошибка при получении секрета TOTP", err);
        return null;
    }
}

// Функция генерации OTP-кода
function generateOtp() {
    getTotpSecret().then(secret => {
        if (!secret) {
            alert("Секретный ключ TOTP не найден!");
            return;
        }
        const otp = generateTotp(secret);
        document.getElementById("otp-display").innerText = `Ваш OTP: ${otp}`;
    });
}

// Генерация TOTP-кода по стандарту RFC 6238
function generateTotp(secret) {
    const timeStep = 30;
    const epoch = Math.floor(Date.now() / 1000);
    const counter = Math.floor(epoch / timeStep);
    return hotp(secret, counter, 6);
}

// Алгоритм HMAC-based OTP (HOTP)
function hotp(secret, counter, digits) {
    const key = new TextEncoder().encode(secret);
    const counterBuffer = new ArrayBuffer(8);
    new DataView(counterBuffer).setUint32(4, counter, false);
    return crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-1" }, false, ["sign"])
        .then(cryptoKey => crypto.subtle.sign("HMAC", cryptoKey, counterBuffer))
        .then(signature => {
            const offset = new Uint8Array(signature)[signature.byteLength - 1] & 0xf;
            const binary = (new DataView(signature).getUint32(offset) & 0x7fffffff) % (10 ** digits);
            return binary.toString().padStart(digits, "0");
        });
}

// Функция очистки всех данных, включая WebAuthn Large Blob и кэш
function clearAllData() {
    localStorage.clear();
    caches.keys().then((keyList) => {
        return Promise.all(
            keyList.map((key) => {
                return caches.delete(key);
            })
        );
    });
    alert("Все данные очищены.");
}

// Вспомогательная функция преобразования ArrayBuffer в Base64
function arrayBufferToBase64(buffer) {
    const binary = String.fromCharCode(...new Uint8Array(buffer));
    return btoa(binary);
}

// Функция генерации случайного секрета TOTP
function generateRandomSecret() {
    const array = new Uint8Array(10);
    window.crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, "0")).join("");
}
