const display = document.querySelector(".display");

function appendToDisplay(input) {
  if (display.value === "Error" || display.value === "Infinity" || display.value === "-Infinity") {
    display.value = "";
  }
  
  // Prevent consecutive operators
  const operators = ["+", "-", "*", "/"];
  const lastChar = display.value.slice(-1);
  if (operators.includes(lastChar) && operators.includes(input)) {
    display.value = display.value.slice(0, -1) + input;
    return;
  }

  // Prevent multiple decimals in the current operand
  if (input === ".") {
    const parts = display.value.split(/[\+\-\*\/]/);
    const currentPart = parts[parts.length - 1];
    if (currentPart.includes(".")) {
      return;
    }
  }

  display.value += input;
}

function clearDisplay() {
  display.value = "";
}

function deleteLast() {
  if (display.value === "Error" || display.value === "Infinity" || display.value === "-Infinity") {
    display.value = "";
  } else {
    display.value = display.value.slice(0, -1);
  }
}

function Calculate() {
  if (!display.value) return;
  try {
    // Sanitize input to allow only valid arithmetic tokens
    const sanitized = display.value.replace(/[^0-9+\-*/.]/g, "");
    if (!sanitized) return;

    // Use safe Function constructor instead of direct eval
    const result = Function(`'use strict'; return (${sanitized})`)();
    
    if (Number.isFinite(result)) {
      // Round to 8 decimal places if necessary to avoid 0.1 + 0.2 floating point issues
      display.value = Math.round(result * 100000000) / 100000000;
    } else {
      display.value = "Error";
    }
  } catch (error) {
    display.value = "Error";
  }
}

// Keyboard input support
document.addEventListener("keydown", (event) => {
  const key = event.key;
  if ((key >= "0" && key <= "9") || key === "+" || key === "-" || key === "*" || key === "/" || key === ".") {
    appendToDisplay(key);
  } else if (key === "Enter" || key === "=") {
    event.preventDefault();
    Calculate();
  } else if (key === "Backspace") {
    deleteLast();
  } else if (key === "Escape" || key === "c" || key === "C") {
    clearDisplay();
  }
});
