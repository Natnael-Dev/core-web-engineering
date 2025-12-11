const buttons = document.querySelectorAll("button");

buttons.forEach((button) => {
  button.addEventListener("click", () => {
    const id = button.id;
    if (id === "random") {
      const randomColor = "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0");
      document.body.style.backgroundColor = randomColor;
    } else {
      document.body.style.backgroundColor = id;
    }
  });
});