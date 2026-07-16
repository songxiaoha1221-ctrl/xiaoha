(function () {
  const screens = Array.from(document.querySelectorAll("[data-screen]"));
  const dots = Array.from(document.querySelectorAll(".progress-dots span"));
  const nextTargets = Array.from(document.querySelectorAll("[data-next]"));
  const completeTargets = Array.from(document.querySelectorAll("[data-complete]"));
  const successPanel = document.querySelector("[data-success]");
  const restartButton = document.querySelector("[data-restart]");
  const photoScreen = document.querySelector(".photo-scene");
  const config = window.WALNUT_H5_CONFIG || {};
  const storageConfig = config.photoStorage || {};
  const claimFormUrl = String((config.claimForm && config.claimForm.url) || "").trim();

  const photoElements = {
    lab: document.querySelector("[data-photo-lab]"),
    stage: document.querySelector("[data-photo-stage]"),
    video: document.querySelector("[data-camera-video]"),
    source: document.querySelector("[data-photo-source]"),
    empty: document.querySelector("[data-photo-empty]"),
    sticker: document.querySelector("[data-photo-sticker]"),
    sizeControl: document.querySelector("[data-sticker-size-control]"),
    sizeInput: document.querySelector("[data-sticker-size]"),
    startActions: document.querySelector("[data-photo-start-actions]"),
    liveActions: document.querySelector("[data-photo-live-actions]"),
    readyActions: document.querySelector("[data-photo-ready-actions]"),
    startCamera: document.querySelector("[data-camera-start]"),
    capture: document.querySelector("[data-camera-capture]"),
    pick: document.querySelector("[data-photo-pick]"),
    retake: document.querySelector("[data-photo-retake]"),
    file: document.querySelector("[data-photo-file]"),
    status: document.querySelector("[data-photo-status]"),
    countdown: document.querySelector("[data-camera-countdown]"),
    flash: document.querySelector("[data-camera-flash]"),
    canvas: document.querySelector("[data-photo-canvas]"),
    next: document.querySelector("[data-photo-next]"),
    skip: document.querySelector("[data-photo-skip]"),
    poseButtons: Array.from(document.querySelectorAll("[data-pose]"))
  };

  const poseAssets = {
    wave: "./assets/ip-photo-wave.png",
    heart: "./assets/ip-photo-heart.png",
    salute: "./assets/ip-photo-salute.png"
  };

  let currentScreen = 0;
  let locked = false;
  let cameraStream = null;
  let photoState = "idle";
  let selectedPose = "wave";
  let sourceObjectUrl = "";
  let posterObjectUrl = "";
  let stickerPosition = { x: 0.72, y: 0.68 };
  let stickerScale = 0.46;
  let activeDrag = null;

  function addSceneDust(screen) {
    const layer = document.createElement("div");
    layer.className = "dust-field";
    for (let index = 0; index < 34; index += 1) {
      const particle = document.createElement("i");
      particle.style.setProperty("--x", `${Math.random() * 100}%`);
      particle.style.setProperty("--y", `${Math.random() * 100}%`);
      particle.style.setProperty("--delay", `${Math.random() * 3}s`);
      particle.style.setProperty("--size", `${Math.random() * 2.4 + 1.2}px`);
      layer.appendChild(particle);
    }
    screen.appendChild(layer);
  }

  function showScreen(index) {
    const previousScreen = currentScreen;
    currentScreen = Math.max(0, Math.min(index, screens.length - 1));

    if (previousScreen === 3 && currentScreen !== 3) {
      stopCamera();
    }

    screens.forEach((screen, screenIndex) => {
      screen.classList.toggle("is-active", screenIndex === currentScreen);
      screen.classList.remove("is-bursting");
    });
    dots.forEach((dot, dotIndex) => {
      dot.classList.toggle("is-active", dotIndex === currentScreen);
    });
  }

  function burstAt(target, event) {
    const rect = target.getBoundingClientRect();
    const hasPoint = Number.isFinite(event.clientX) && Number.isFinite(event.clientY) && event.clientX > 0;
    const burst = document.createElement("span");
    burst.className = "tap-burst";
    burst.style.left = `${hasPoint ? event.clientX - rect.left : rect.width / 2}px`;
    burst.style.top = `${hasPoint ? event.clientY - rect.top : rect.height / 2}px`;
    target.appendChild(burst);
    setTimeout(() => burst.remove(), 820);
  }

  function goNext(target, event) {
    if (locked) return;
    locked = true;

    const active = screens[currentScreen];
    active.classList.add("is-bursting");
    target.classList.add("is-lit");
    burstAt(target, event);

    setTimeout(() => {
      target.classList.remove("is-lit");
      showScreen(currentScreen + 1);
      locked = false;
    }, 620);
  }

  function openClaimForm() {
    if (!claimFormUrl) return;
    const opened = window.open(claimFormUrl, "_blank");
    if (!opened) {
      location.href = claimFormUrl;
    }
  }

  function complete(target, event) {
    if (locked) return;
    locked = true;
    const active = screens[currentScreen];
    active.classList.add("is-bursting", "is-complete");
    target.classList.add("is-lit");
    burstAt(target, event);

    openClaimForm();

    setTimeout(() => {
      successPanel.hidden = false;
      locked = false;
    }, 560);
  }

  function setPhotoStatus(message, tone) {
    photoElements.status.textContent = message;
    photoElements.status.dataset.tone = tone || "default";
  }

  function setPhotoState(state) {
    photoState = state;
    photoElements.lab.dataset.state = state;
    photoElements.stage.classList.toggle("is-live", state === "live");
    photoElements.stage.classList.toggle("is-ready", state === "ready" || state === "uploading");
    photoElements.stage.classList.toggle("is-poster", state === "saved");
    photoElements.startActions.hidden = state !== "idle";
    photoElements.liveActions.hidden = state !== "live";
    photoElements.readyActions.hidden = state !== "ready" && state !== "uploading" && state !== "saved";
    photoElements.next.disabled = state === "uploading";
    photoElements.retake.disabled = state === "uploading";
    photoElements.skip.disabled = state === "uploading";
    photoElements.next.textContent = state === "uploading" ? "正在保存照片…" : "开启下一个旅程";
  }

  function stopCamera() {
    if (!cameraStream) return;
    cameraStream.getTracks().forEach((track) => track.stop());
    cameraStream = null;
    photoElements.video.srcObject = null;
  }

  function revokePhotoUrls() {
    if (sourceObjectUrl) URL.revokeObjectURL(sourceObjectUrl);
    if (posterObjectUrl) URL.revokeObjectURL(posterObjectUrl);
    sourceObjectUrl = "";
    posterObjectUrl = "";
  }

  function resetPhotoGame() {
    stopCamera();
    revokePhotoUrls();
    photoElements.video.hidden = true;
    photoElements.source.hidden = true;
    photoElements.source.removeAttribute("src");
    photoElements.empty.hidden = false;
    photoElements.file.value = "";
    photoElements.flash.classList.remove("is-flashing");
    photoElements.countdown.hidden = true;
    photoElements.sticker.hidden = false;
    selectedPose = "wave";
    stickerPosition = { x: 0.72, y: 0.68 };
    stickerScale = 0.46;
    photoElements.sizeInput.value = "46";
    selectPose("wave");
    applyStickerPosition();
    setPhotoState("idle");
    setPhotoStatus("选择一个 IP 姿态，准备合影");
  }

  function restart() {
    screens.forEach((screen) => {
      screen.classList.remove("is-complete", "is-bursting");
    });
    document.querySelectorAll(".is-lit").forEach((node) => {
      node.classList.remove("is-lit");
    });
    successPanel.hidden = true;
    resetPhotoGame();
    showScreen(0);
  }

  function setParallax(event) {
    if (activeDrag) return;
    const x = (event.clientX / window.innerWidth - 0.5) * 16;
    const y = (event.clientY / window.innerHeight - 0.5) * 16;
    document.documentElement.style.setProperty("--tilt-x", `${x}px`);
    document.documentElement.style.setProperty("--tilt-y", `${y}px`);
  }

  function applyStickerPosition() {
    photoElements.sticker.style.setProperty("--sticker-x", `${stickerPosition.x * 100}%`);
    photoElements.sticker.style.setProperty("--sticker-y", `${stickerPosition.y * 100}%`);
    photoElements.sticker.style.setProperty("--sticker-size", `${stickerScale * 100}%`);
  }

  function selectPose(pose) {
    selectedPose = poseAssets[pose] ? pose : "wave";
    photoElements.sticker.src = poseAssets[selectedPose];
    photoElements.poseButtons.forEach((button) => {
      button.classList.toggle("is-active", button.dataset.pose === selectedPose);
    });
    photoElements.stage.classList.remove("pose-pop");
    requestAnimationFrame(() => photoElements.stage.classList.add("pose-pop"));
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function updateStickerFromPointer(event) {
    const rect = photoElements.stage.getBoundingClientRect();
    stickerPosition = {
      x: clamp((event.clientX - rect.left) / rect.width, 0.12, 0.88),
      y: clamp((event.clientY - rect.top) / rect.height, 0.18, 0.86)
    };
    applyStickerPosition();
  }

  function beginStickerDrag(event) {
    if (photoState === "uploading" || photoState === "saved") return;
    activeDrag = event.pointerId;
    photoElements.sticker.setPointerCapture(event.pointerId);
    photoElements.sticker.classList.add("is-dragging");
    updateStickerFromPointer(event);
  }

  function moveSticker(event) {
    if (activeDrag !== event.pointerId) return;
    updateStickerFromPointer(event);
  }

  function endStickerDrag(event) {
    if (activeDrag !== event.pointerId) return;
    activeDrag = null;
    photoElements.sticker.classList.remove("is-dragging");
  }

  async function startCamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setPhotoStatus("当前浏览器未开放镜头，请从相册选择照片", "warning");
      photoElements.file.click();
      return;
    }

    setPhotoStatus("正在唤醒影像舱…");
    photoElements.startCamera.disabled = true;
    try {
      stopCamera();
      cameraStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: "user",
          width: { ideal: 1080 },
          height: { ideal: 1440 }
        }
      });
      photoElements.video.srcObject = cameraStream;
      await photoElements.video.play();
      photoElements.video.hidden = false;
      photoElements.source.hidden = true;
      photoElements.empty.hidden = true;
      setPhotoState("live");
      setPhotoStatus("镜头已就位，调整姿态后按下快门", "success");
    } catch (error) {
      console.warn("Camera unavailable", error);
      setPhotoState("idle");
      setPhotoStatus("未能打开镜头，可以改用相册照片", "warning");
    } finally {
      photoElements.startCamera.disabled = false;
    }
  }

  function wait(duration) {
    return new Promise((resolve) => setTimeout(resolve, duration));
  }

  async function runCountdown() {
    photoElements.capture.disabled = true;
    photoElements.countdown.hidden = false;
    for (let count = 3; count > 0; count -= 1) {
      photoElements.countdown.textContent = String(count);
      photoElements.countdown.classList.remove("is-counting");
      requestAnimationFrame(() => photoElements.countdown.classList.add("is-counting"));
      await wait(720);
    }
    photoElements.countdown.hidden = true;
    photoElements.capture.disabled = false;
  }

  function canvasToBlob(canvas, type, quality) {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("无法生成照片"));
      }, type, quality);
    });
  }

  async function captureCameraFrame() {
    if (photoState !== "live" || !photoElements.video.videoWidth) return;
    await runCountdown();

    const rawCanvas = document.createElement("canvas");
    const rawContext = rawCanvas.getContext("2d");
    rawCanvas.width = photoElements.video.videoWidth;
    rawCanvas.height = photoElements.video.videoHeight;
    rawContext.translate(rawCanvas.width, 0);
    rawContext.scale(-1, 1);
    rawContext.drawImage(photoElements.video, 0, 0, rawCanvas.width, rawCanvas.height);

    photoElements.flash.classList.remove("is-flashing");
    requestAnimationFrame(() => photoElements.flash.classList.add("is-flashing"));

    const rawBlob = await canvasToBlob(rawCanvas, "image/jpeg", 0.92);
    stopCamera();
    if (sourceObjectUrl) URL.revokeObjectURL(sourceObjectUrl);
    sourceObjectUrl = URL.createObjectURL(rawBlob);
    photoElements.source.src = sourceObjectUrl;
    await waitForImage(photoElements.source);
    photoElements.source.hidden = false;
    photoElements.video.hidden = true;
    setPhotoState("ready");
    setPhotoStatus("拖动 IP 调整位置，满意后存入周年星云", "success");
  }

  function waitForImage(image) {
    if (image.complete && image.naturalWidth) return Promise.resolve();
    return new Promise((resolve, reject) => {
      image.addEventListener("load", resolve, { once: true });
      image.addEventListener("error", () => reject(new Error("图片读取失败")), { once: true });
    });
  }

  async function selectPhotoFile(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setPhotoStatus("请选择一张图片", "error");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setPhotoStatus("照片太大，请选择 15MB 以内的图片", "error");
      return;
    }

    stopCamera();
    if (sourceObjectUrl) URL.revokeObjectURL(sourceObjectUrl);
    sourceObjectUrl = URL.createObjectURL(file);
    photoElements.source.src = sourceObjectUrl;
    try {
      await waitForImage(photoElements.source);
      photoElements.source.hidden = false;
      photoElements.video.hidden = true;
      photoElements.empty.hidden = true;
      setPhotoState("ready");
      setPhotoStatus("拖动 IP 调整位置，满意后存入周年星云", "success");
    } catch (error) {
      console.warn(error);
      setPhotoStatus("这张照片没有读取成功，请换一张试试", "error");
    }
  }

  function resetForRetake() {
    stopCamera();
    if (sourceObjectUrl) URL.revokeObjectURL(sourceObjectUrl);
    sourceObjectUrl = "";
    photoElements.source.hidden = true;
    photoElements.source.removeAttribute("src");
    photoElements.video.hidden = true;
    photoElements.empty.hidden = false;
    photoElements.file.value = "";
    setPhotoState("idle");
    setPhotoStatus("重新选择拍摄方式，保留刚才的 IP 姿态");
  }

  function drawImageCover(context, image, x, y, width, height) {
    const sourceWidth = image.naturalWidth || image.videoWidth;
    const sourceHeight = image.naturalHeight || image.videoHeight;
    const sourceRatio = sourceWidth / sourceHeight;
    const targetRatio = width / height;
    let cropWidth = sourceWidth;
    let cropHeight = sourceHeight;
    let cropX = 0;
    let cropY = 0;

    if (sourceRatio > targetRatio) {
      cropWidth = sourceHeight * targetRatio;
      cropX = (sourceWidth - cropWidth) / 2;
    } else {
      cropHeight = sourceWidth / targetRatio;
      cropY = (sourceHeight - cropHeight) / 2;
    }

    context.drawImage(image, cropX, cropY, cropWidth, cropHeight, x, y, width, height);
  }

  function drawPosterFrame(context, width, height) {
    const topShade = context.createLinearGradient(0, 0, 0, 340);
    topShade.addColorStop(0, "rgba(8, 14, 40, 0.72)");
    topShade.addColorStop(1, "rgba(8, 14, 40, 0)");
    context.fillStyle = topShade;
    context.fillRect(0, 0, width, 340);

    const bottomShade = context.createLinearGradient(0, height - 440, 0, height);
    bottomShade.addColorStop(0, "rgba(8, 14, 40, 0)");
    bottomShade.addColorStop(1, "rgba(8, 14, 40, 0.9)");
    context.fillStyle = bottomShade;
    context.fillRect(0, height - 440, width, 440);

    context.strokeStyle = "rgba(255, 216, 110, 0.94)";
    context.lineWidth = 10;
    context.strokeRect(34, 34, width - 68, height - 68);

    context.strokeStyle = "rgba(92, 242, 240, 0.72)";
    context.lineWidth = 3;
    context.strokeRect(54, 54, width - 108, height - 108);

    const stars = [
      [118, 202, 7], [916, 172, 5], [968, 472, 8], [126, 676, 5],
      [932, 886, 6], [172, 1110, 8], [856, 1206, 5]
    ];
    stars.forEach(([x, y, radius], index) => {
      context.beginPath();
      context.fillStyle = index % 2 ? "#5cf2f0" : "#ffd86e";
      context.shadowColor = context.fillStyle;
      context.shadowBlur = 22;
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.fill();
    });
    context.shadowBlur = 0;

    context.fillStyle = "#ffd86e";
    context.font = "800 30px -apple-system, BlinkMacSystemFont, 'PingFang SC', sans-serif";
    context.fillText("MEMORY CAPSULE · 03", 82, 116);

    context.fillStyle = "#fffaf0";
    context.font = "900 67px -apple-system, BlinkMacSystemFont, 'PingFang SC', sans-serif";
    context.fillText("记录你与核桃", 82, height - 224);
    context.fillText("相遇三周年", 82, height - 142);

    const date = new Intl.DateTimeFormat("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(new Date()).replaceAll("/", ".");
    context.fillStyle = "rgba(255, 250, 240, 0.76)";
    context.font = "600 28px -apple-system, BlinkMacSystemFont, 'PingFang SC', sans-serif";
    context.fillText(`THREE YEARS TOGETHER  ·  ${date}`, 84, height - 82);
  }

  async function renderPoster() {
    await waitForImage(photoElements.source);
    await waitForImage(photoElements.sticker);
    const canvas = photoElements.canvas;
    const context = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;
    context.clearRect(0, 0, width, height);
    drawImageCover(context, photoElements.source, 0, 0, width, height);

    const sticker = photoElements.sticker;
    const stickerWidth = width * stickerScale;
    const stickerHeight = stickerWidth * (sticker.naturalHeight / sticker.naturalWidth);
    const stickerX = width * stickerPosition.x - stickerWidth / 2;
    const stickerY = height * stickerPosition.y - stickerHeight / 2;
    context.drawImage(sticker, stickerX, stickerY, stickerWidth, stickerHeight);
    drawPosterFrame(context, width, height);
    return canvasToBlob(canvas, "image/jpeg", 0.9);
  }

  function createCheckinId() {
    if (crypto.randomUUID) return crypto.randomUUID();
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function encodedStoragePath(path) {
    return path.split("/").map(encodeURIComponent).join("/");
  }

  async function uploadToSupabase(blob, id) {
    const baseUrl = String(storageConfig.supabaseUrl || "").replace(/\/$/, "");
    const anonKey = String(storageConfig.supabaseAnonKey || "");
    const bucket = String(storageConfig.bucket || "anniversary-checkins");
    if (!baseUrl || !anonKey) {
      const error = new Error("照片存储尚未完成配置");
      error.code = "STORAGE_NOT_CONFIGURED";
      throw error;
    }

    const month = new Date().toISOString().slice(0, 7);
    const path = `checkins/${month}/${id}.jpg`;
    const endpoint = `${baseUrl}/storage/v1/object/${encodeURIComponent(bucket)}/${encodedStoragePath(path)}`;
    const headers = {
      apikey: anonKey,
      "Content-Type": "image/jpeg",
      "Cache-Control": "3600",
      "x-upsert": "false"
    };
    if (anonKey.startsWith("eyJ")) {
      headers.Authorization = `Bearer ${anonKey}`;
    }
    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: blob
    });
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`照片上传失败 (${response.status}): ${detail.slice(0, 160)}`);
    }
    return { id, path, provider: "supabase" };
  }

  async function uploadToPhotoApi(blob, id) {
    const configuredBase = String(storageConfig.apiUrl || "").replace(/\/$/, "");
    if (!configuredBase && (location.protocol === "file:" || location.hostname.endsWith("github.io"))) {
      const error = new Error("照片存储尚未完成配置");
      error.code = "STORAGE_NOT_CONFIGURED";
      throw error;
    }
    const endpoint = configuredBase ? `${configuredBase}/api/checkins` : "/api/checkins";
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "image/jpeg",
        "X-Checkin-Id": id,
        "X-Checkin-Created-At": new Date().toISOString()
      },
      body: blob
    });
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`照片上传失败 (${response.status}): ${detail.slice(0, 160)}`);
    }
    return response.json();
  }

  async function uploadPhoto(blob) {
    const id = createCheckinId();
    const provider = String(storageConfig.provider || "auto").toLowerCase();
    const hasSupabase = storageConfig.supabaseUrl && storageConfig.supabaseAnonKey;
    if (provider === "supabase" || (provider === "auto" && hasSupabase)) {
      return uploadToSupabase(blob, id);
    }
    return uploadToPhotoApi(blob, id);
  }

  async function savePhoto(event) {
    if (photoState !== "ready") return;
    setPhotoState("uploading");
    setPhotoStatus("正在把照片送入周年星云…");
    photoScreen.classList.add("is-uploading-photo");
    try {
      const posterBlob = await renderPoster();
      await uploadPhoto(posterBlob);
      if (posterObjectUrl) URL.revokeObjectURL(posterObjectUrl);
      posterObjectUrl = URL.createObjectURL(posterBlob);
      photoElements.source.src = posterObjectUrl;
      await waitForImage(photoElements.source);
      photoElements.sticker.hidden = true;
      setPhotoState("saved");
      setPhotoStatus("打卡成功，三周年纪念照已安全保存", "success");
      await wait(260);
      goNext(photoElements.next, event);
    } catch (error) {
      console.error(error);
      setPhotoState("ready");
      if (error.code === "STORAGE_NOT_CONFIGURED") {
        setPhotoStatus("照片存储服务尚未开启，请联系活动负责人", "warning");
      } else {
        setPhotoStatus("上传没有成功，请检查网络后再试一次", "error");
      }
    } finally {
      photoScreen.classList.remove("is-uploading-photo");
    }
  }

  screens.forEach(addSceneDust);
  nextTargets.forEach((target) => {
    target.addEventListener("click", (event) => goNext(target, event));
  });
  completeTargets.forEach((target) => {
    target.addEventListener("click", (event) => complete(target, event));
  });
  photoElements.poseButtons.forEach((button) => {
    button.addEventListener("click", () => selectPose(button.dataset.pose));
  });
  photoElements.sizeInput.addEventListener("input", (event) => {
    stickerScale = Number(event.target.value) / 100;
    applyStickerPosition();
  });
  photoElements.sticker.addEventListener("pointerdown", beginStickerDrag);
  photoElements.sticker.addEventListener("pointermove", moveSticker);
  photoElements.sticker.addEventListener("pointerup", endStickerDrag);
  photoElements.sticker.addEventListener("pointercancel", endStickerDrag);
  photoElements.startCamera.addEventListener("click", startCamera);
  photoElements.capture.addEventListener("click", captureCameraFrame);
  photoElements.pick.addEventListener("click", () => photoElements.file.click());
  photoElements.file.addEventListener("change", selectPhotoFile);
  photoElements.retake.addEventListener("click", resetForRetake);
  photoElements.next.addEventListener("click", (event) => {
    if (photoState === "ready") savePhoto(event);
    else if (photoState === "saved") goNext(photoElements.next, event);
  });
  photoElements.skip.addEventListener("click", (event) => goNext(photoElements.skip, event));
  restartButton.addEventListener("click", restart);
  document.addEventListener("pointermove", setParallax);
  window.addEventListener("pagehide", stopCamera);

  applyStickerPosition();
  setPhotoState("idle");
  showScreen(0);
})();
