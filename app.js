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
 * Создаёт учётную запись с поддержкой largeBlob (без записи данных)
 * и сохраняет только идентификатор учётных данных.
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
    console.log("registerWebAuthn: Сгенерированный challenge:", challenge);

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
        // Запрашиваем поддержку largeBlob без записи данных
        extensions: { largeBlob: { support: "required" } },
      },
    });
    console.log("registerWebAuthn: Созданные учётные данные:", credential);

    // Сохраняем идентификатор учётных данных для последующего обновления largeBlob
    localStorage.setItem("totp_credential_id", arrayBufferToBase64(credential.rawId));
    alert("Регистрация завершена. Теперь создайте TOTP-ключ.");
  } catch (err) {
    console.error("Ошибка регистрации WebAuthn", err.name, err.message, err);
  }
}

/**
 * Функция сохранения TOTP-секрета в WebAuthn Large Blob.
 * Для записи секрета используется assertion (navigator.credentials.get)
 * с расширением largeBlob.write. Таким образом, обновляется largeBlob
 * для ранее зарегистрированного credential.
 */
async function storeTotpSecret() {
  try {
    const secret = generateRandomSecret();
    alert(`Секретный ключ TOTP: ${secret}`);
    console.log("storeTotpSecret: Сгенерированный TOTP-секрет (строка):", secret);

    // Преобразуем секрет в Uint8Array для записи
    const secretBuffer = new TextEncoder().encode(secret);
    console.log("storeTotpSecret: TOTP-секрет для записи (Uint8Array):", secretBuffer);

    // Получаем идентификатор ранее зарегистрированного credential
    const storedCredentialId = localStorage.getItem("totp_credential_id");
    if (!storedCredentialId) {
      throw new Error("Идентификатор учетных данных не найден. Сначала выполните регистрацию.");
    }
    const allowCredential = [{
      type: "public-key",
      id: base64ToArray(storedCredentialId),
      transports: ["internal"],
    }];
    console.log("storeTotpSecret: allowCredentials:", allowCredential);

    // Генерируем случайный challenge для обновления largeBlob
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);
    console.log("storeTotpSecret: Сгенерированный challenge:", challenge);

    // Формируем PublicKeyCredentialRequestOptions для обновления largeBlob
    const publicKeyOptions = {
      challenge: challenge,
      allowCredentials: allowCredential,
      userVerification: "required",
      extensions: { largeBlob: { write: secretBuffer } },
    };
    console.log("storeTotpSecret: PublicKeyCredentialRequestOptions для обновления largeBlob:", publicKeyOptions);

    // Вызываем assertion для обновления largeBlob
    const assertion = await navigator.credentials.get({
      publicKey: publicKeyOptions,
    });
    console.log("storeTotpSecret: Обновлённые учётные данные:", assertion);
    alert("Секрет сохранён в WebAuthn Large Blob.");
  } catch (err) {
    console.error("Ошибка при сохранении секрета TOTP", err.name, err.message, err);
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
      throw new Error("Идентификатор учётных данных не найден.");
    }
    const allowCredential = [{
      type: "public-key",
      id: base64ToArray(storedCredentialId),
      transports: ["internal"],
    }];
    console.log("getTotpSecret: allowCredentials:", allowCredential);

    // Генерируем случайный challenge для запроса
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);
    console.log("getTotpSecret: Сгенерированный challenge:", challenge);
    console.log("getTotpSecret: challenge instanceof Uint8Array?", challenge instanceof Uint8Array);
    console.log("getTotpSecret: challenge.byteLength:", challenge.byteLength);

    // Формируем PublicKeyCredentialRequestOptions для чтения largeBlob
    const publicKeyOptions = {
      challenge: challenge,
      allowCredentials: allowCredential,
      userVerification: "required",
      extensions: { largeBlob: { read: true } },
    };
    console.log("getTotpSecret: PublicKeyCredentialRequestOptions:", publicKeyOptions);

    const credential = await navigator.credentials.get({
      publicKey: publicKeyOptions,
    });
    console.log("getTotpSecret: Полученные учётные данные:", credential);

    if (credential && credential.getClientExtensionResults) {
      const extResults = credential.getClientExtensionResults();
      console.log("getTotpSecret: Результаты расширений:", extResults);
      if (extResults.largeBlob && extResults.largeBlob.blob) {
        const secret = new TextDecoder().decode(extResults.largeBlob.blob);
        console.log("getTotpSecret: Извлечённый TOTP-секрет:", secret);
        return secret;
      } else {
        throw new Error("LargeBlob не содержит данных.");
      }
    } else {
      throw new Error("Невозможно получить данные из расширений.");
    }
  } catch (err) {
    console.error("Ошибка при получении секрета TOTP", err.name, err.message, err);
    throw err;
  }
}

/**
 * Модифицированная функция генерации OTP-кода.
 * Извлекает TOTP-секрет, генерирует OTP и запускает таймер обновления.
 */
async function generateOtp() {
  try {
    const secret = await getTotpSecret();
    if (!secret) {
      alert("Секретный ключ TOTP не найден!");
      return;
    }
    const otp = await generateTotp(secret);
    document.querySelector('.otp-value').innerText = `Ваш OTP: ${otp}`;
    
    // Запуск/сброс таймера
    clearInterval(timerInterval);
    const startTime = Math.floor(Date.now() / 1000);
    timerInterval = setInterval(() => {
      const currentTime = Math.floor(Date.now() / 1000);
      updateTimer(currentTime - startTime);
    }, 1000);
  } catch (err) {
    console.error("Ошибка генерации OTP", err.name, err.message, err);
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
 * При нажатии на кнопку "Выход" вывод OTP кода очищается,
 * а счетчик времени останавливается.
 */
function clearAllData() {
  localStorage.removeItem("totp_credential_id");
  caches.keys().then((keyList) => {
    return Promise.all(keyList.map((key) => caches.delete(key)));
  });
  // Очищаем вывод OTP кода
  const otpDisplay = document.querySelector('.otp-value');
  if (otpDisplay) {
    otpDisplay.innerText = '';
  }
  // Останавливаем таймер
  clearInterval(timerInterval);
  // Очищаем вывод таймера
  const timerElement = document.querySelector('.timer');
  if (timerElement) {
    timerElement.textContent = 'Обновление через: 0 сек.';
  }
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

// ======================================================================
// Дополнительный код (Android-баннер и таймер OTP)
// ======================================================================

// Детектор Android
function isAndroid() {
  return /android/i.test(navigator.userAgent);
}

// Показать баннер для Android
if (isAndroid()) {
  const banner = document.getElementById('android-banner');
  if (banner) {
    banner.style.display = 'block';
    setTimeout(() => banner.remove(), 10000);
  }
}

// Таймер OTP
let timerInterval;

function updateTimer(secondsElapsed) {
  const timerElement = document.querySelector('.timer');
  if (!timerElement) return;

  const remaining = 30 - secondsElapsed;
  if (remaining > 0) {
    timerElement.textContent = `Обновление через: ${remaining} сек.`;
  } else {
    timerElement.textContent = `Обновление через: 0 сек.`;
    clearInterval(timerInterval);
  }
}
