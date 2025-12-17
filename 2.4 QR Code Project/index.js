/* 
1. Use the inquirer npm package to get user input.
2. Use the qr-image npm package to turn the user entered URL into a QR code image.
3. Create a txt file to save the user input using the native fs node module.
*/

import inquirer from "inquirer";
import qr from "qr-image";
import fs from "fs";

inquirer
  .prompt([
    {
      message: "Type in your URL: ",
      name: "URL",
    },
  ])
  .then((answers) => {
    const url = answers.URL;

    // Generate and save the QR code image
    const qr_svg = qr.image(url);
    qr_svg.pipe(fs.createWriteStream("qr_img.png"));

    // Save the URL to a text file
    fs.writeFile("URL.txt", url, (err) => {
      if (err) throw err;
      console.log("The URL has been saved to URL.txt!");
      console.log("QR Code image generated as qr_img.png!");
    });
  })
  .catch((error) => {
    if (error.isTtyError) {
      console.error("Prompt could not be rendered in this environment.");
    } else {
      console.error("An error occurred:", error);
    }
  });
