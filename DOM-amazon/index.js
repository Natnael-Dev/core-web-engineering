const button = document.querySelector(".js-btn");

button.addEventListener("click", function() {
  if (button.innerText === "Subscribe") {
    button.innerText = "Subscribed";
    button.classList.add("is-subscribed");
  } else {
    button.innerText = "Subscribe";
    button.classList.remove("is-subscribed");
  }
});