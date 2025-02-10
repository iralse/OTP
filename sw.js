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

async function storeTotpSecret() {
    try {
        const secret = generateRandomSecret();
        alert(`Секретный ключ TOTP: ${secret}`);

        const credential = await navigator.credentials.get({
            publicKey: { extensions: { largeBlob: true } },
        });

        if (credential && credential.authenticatorAttachment === "platform") {
            await navigator.credentials.create({
                publicKey: {
                    rp: { name: "OTP" },
                    user: {
                        id: new TextEncoder().encode("user"),
                        name: "user",
                        displayName: "User",
                    },
                    challenge: new Uint8Array(32),
                    pubKeyCredParams: [{ type: "public-key", alg: -7 }],
                    authenticatorSelection: { authenticatorAttachment: "platform" },
                    extensions: { largeBlob: { write: new TextEncoder().encode(secret) } },
                },
            });
            alert("Секрет сохранён в WebAuthn Large Blob.");
        } else {
            alert("Ошибка при сохранении секрета.");
        }
    } catch (err) {
        console.error("Ошибка при сохранении секрета TOTP", err);
    }
}

function generateRandomSecret() {
    const array = new Uint8Array(10);
    window.crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, "0")).join("");
}
