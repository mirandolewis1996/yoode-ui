document.addEventListener("DOMContentLoaded", () => {
  const counters = document.querySelectorAll(".counter");
  const duration = 2000; // Animation duration in milliseconds
  const steps = 60; // Number of steps in animation
  const interval = duration / steps;

  counters.forEach((counter) => {
    const target = parseFloat(counter.getAttribute("data-target"));
    const format = counter.getAttribute("data-format"); // Get format if exists
    const increment = target / steps;
    let current = 0;
    let step = 0;

    const updateCounter = () => {
      step++;
      current = increment * step;

      let displayValue;
      if (format === "K") {
        // For values that should show as "K"
        displayValue = Math.min(Math.round(current), target) + "K";
      } else if (target % 1 !== 0) {
        // For decimal numbers (like 99.9)
        displayValue = Math.min(current, target).toFixed(1);
      } else {
        // For whole numbers
        displayValue = Math.min(Math.round(current), target);
      }

      counter.textContent = displayValue;

      if (step < steps) {
        setTimeout(updateCounter, interval);
      }
    };

    updateCounter();
  });
});
