(function () {
  const screens = Array.from(document.querySelectorAll("[data-screen]"));
  const dots = Array.from(document.querySelectorAll(".progress-dots span"));
  const nextTargets = Array.from(document.querySelectorAll("[data-next]"));
  const completeTargets = Array.from(document.querySelectorAll("[data-complete]"));
  const successPanel = document.querySelector("[data-success]");
  const restartButton = document.querySelector("[data-restart]");

  let currentScreen = 0;
  let locked = false;

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
    currentScreen = Math.max(0, Math.min(index, screens.length - 1));
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
    const burst = document.createElement("span");
    burst.className = "tap-burst";
    burst.style.left = `${event.clientX - rect.left}px`;
    burst.style.top = `${event.clientY - rect.top}px`;
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

  function complete(target, event) {
    if (locked) return;
    locked = true;
    const active = screens[currentScreen];
    active.classList.add("is-bursting", "is-complete");
    target.classList.add("is-lit");
    burstAt(target, event);

    setTimeout(() => {
      successPanel.hidden = false;
      locked = false;
    }, 560);
  }

  function restart() {
    screens.forEach((screen) => {
      screen.classList.remove("is-complete", "is-bursting");
    });
    document.querySelectorAll(".is-lit").forEach((node) => {
      node.classList.remove("is-lit");
    });
    successPanel.hidden = true;
    showScreen(0);
  }

  function setParallax(event) {
    const x = (event.clientX / window.innerWidth - 0.5) * 16;
    const y = (event.clientY / window.innerHeight - 0.5) * 16;
    document.documentElement.style.setProperty("--tilt-x", `${x}px`);
    document.documentElement.style.setProperty("--tilt-y", `${y}px`);
  }

  screens.forEach(addSceneDust);
  nextTargets.forEach((target) => {
    target.addEventListener("click", (event) => goNext(target, event));
  });
  completeTargets.forEach((target) => {
    target.addEventListener("click", (event) => complete(target, event));
  });
  restartButton.addEventListener("click", restart);
  document.addEventListener("pointermove", setParallax);
  showScreen(0);
})();
