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

/**
 * Функция регистрации WebAuthn.
 * Здесь создаётся учётная запись с запросом поддержки largeBlob (без записи).
 * Идентификатор учётных данных сохраняется в localStorage для последующего обращения.
 */
async function registerWebAuthn() {
  try {
    const usernameInput = document.getElementById("username").value.trim();
    if (!/^[A-Za-z]{1,255}$/.test(usernameInput)) {
      alert("Логин должен содержать только латинские буквы и быть не длиннее 255 символов.");
      return;
    }

    // Генерируем случайный challenge
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
        // Запрашиваем поддержку largeBlob, без записи данных
        extensions: { largeBlob: { support: "required" } },
      },
    });

    // Сохраняем идентификатор учётных данных (не сам секрет!) для последующего вызова get
    localStorage.setItem("totp_credential_id", arrayBufferToBase64(credential.rawId));
    alert("Регистрация завершена. Теперь создайте TOTP-ключ.");
  } catch (err) {
    console.error("Ошибка регистрации WebAuthn", err);
  }
}

/**
 * Функция сохранения TOTP-ключа в WebAuthn Large Blob.
 * Здесь создаётся новый учётный ключ, в largeBlob записывается TOTP-секрет.
 * После успешной регистрации сохраняется идентификатор учётных данных.
 */
async function storeTotpSecret() {
  try {
    const secret = generateRandomSecret();
    alert(`Секретный ключ TOTP: ${secret}`);

    // Генерируем случайный challenge
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const credential = await navigator.credentials.create({
      publicKey: {
        challenge: challenge,
        rp: { name: "OTP" },
        user: {
          // Здесь можно использовать постоянное значение, так как этот вызов создаёт учётные данные для TOTP
          id: new TextEncoder().encode("user"),
          name: "user",
          displayName: "User",
        },
        pubKeyCredParams: [{ type: "public-key", alg: -7 }],
        attestation: "none",
        authenticatorSelection: { authenticatorAttachment: "platform" },
        // Записываем TOTP-секрет в largeBlob
        extensions: { largeBlob: { write: new TextEncoder().encode(secret) } },
      },
    });

    // Сохраняем идентификатор учётных данных для чтения largeBlob
    localStorage.setItem("totp_credential_id", arrayBufferToBase64(credential.rawId));
    alert("Секрет сохранён в WebAuthn Large Blob.");
  } catch (err) {
    console.error("Ошибка при сохранении секрета TOTP", err);
  }
}

/**
 * Функция извлечения TOTP-секрета из WebAuthn Large Blob.
 * Использует ранее сохранённый идентификатор учётных данных.
 */
async function getTotpSecret() {
  try {
    const storedCredentialId = localStorage.getItem("totp_credential_id");
    if (!storedCredentialId) {
      throw new Error("Идентификатор учетных данных не найден.");
    }
    const allowCredential = [{
      type: "public-key",
      id: base64ToArray(storedCredentialId),
      transports: ["internal"],
    }];

    // Генерируем случайный challenge для запроса
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const credential = await navigator.credentials.get({
      publicKey: {
        challenge: challenge,
        allowCredentials: allowCredential,
        userVerification: "required",
        extensions: { largeBlob: { read: true } },
      },
    });

    // Извлекаем данные из расширений
    if (credential && credential.getClientExtensionResults) {
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

/**
 * Функция генерации OTP-кода.
 */
async function generateOtp() {
  try {
    const secret = await getTotpSecret();
    if (!secret) {
      alert("Секретный ключ TOTP не найден!");
      return;
    }
    const otp = await generateTotp(secret);
    document.getElementById("otp-display").innerText = `Ваш OTP: ${otp}`;
  } catch (err) {
    console.error("Ошибка генерации OTP", err);
  }
}

/**
 * Генерация TOTP-кода по стандарту RFC 6238.
 */
function generateTotp(secret) {
  const timeStep = 30;
  const epoch = Math.floor(Date.now() / 1000);
  const counter = Math.floor(epoch / timeStep);
  return hotp(secret, counter, 6);
}

/**
 * Алгоритм HMAC-based OTP (HOTP).
 */
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

/**
 * Функция очистки всех данных.
 * Удаляется идентификатор учётных данных (credential id) из localStorage.
 */
function clearAllData() {
  localStorage.removeItem("totp_credential_id");
  caches.keys().then((keyList) => {
    return Promise.all(
      keyList.map((key) => caches.delete(key))
    );
  });
  alert("Все данные очищены.");
}

/**
 * Вспомогательная функция преобразования ArrayBuffer в Base64.
 */
function arrayBufferToBase64(buffer) {
  const binary = String.fromCharCode(...new Uint8Array(buffer));
  return btoa(binary);
}

/**
 * Вспомогательная функция преобразования строки Base64 в Uint8Array.
 */
function base64ToArray(base64String) {
  const binaryString = atob(base64String);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Функция генерации случайного секрета TOTP.
 */
function generateRandomSecret() {
  const array = new Uint8Array(10);
  window.crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, "0")).join("");
}
