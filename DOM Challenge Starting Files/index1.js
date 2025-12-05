var randomNumber1 = Math.floor(Math.random() * 6) + 1;
var randomNumber2 = Math.floor(Math.random() * 6) + 1;
document.querySelectorAll(".img1")[0]
    .setAttribute("src", "images/dice" + randomNumber1 + ".png");
    

var value2 = document.querySelectorAll(".img2")[0]
    .setAttribute("src", "images/dice" + randomNumber2 + ".png");

    if (randomNumber1 > randomNumber2 ) {
      document.querySelector(".container h1").innerHTML = "🏆Player 1 Wins.";
    }
    else if ( randomNumber1 === randomNumber2) {
      document.querySelector(".container h1").innerHTML = "😒 tie.";
    }
     else  {
      document.querySelector(".container h1").innerHTML = "🏆Player 2 Wins.";
    }