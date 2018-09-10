// Test
let userLogged = true;
let currentUser = "test_user"; // Default User
let currentBridge = "001788FFFEB2478E"; // Default Bridge
// UI Init
$(document).ready(function () {
    $("#bridge-unfound").hide();
    $("#bridge-found").hide();
    $(".hue-dashboard").hide();
    // readAndSaveLightState("test_hue_bridge", "test_user", "lights");
    findBridge().then(bridgeData => {
        if (bridgeData.leading === 0) {
            $("#bridge-unfound").fadeIn();
        }
        else {
            $("#hue-bridge-ip").html(bridgeData["internalipaddress"]);
            $("#hue-bridge-name").html(bridgeData["id"]);
            $("#bridge-found").fadeIn();
        }
    });
});
// Navbar
$(document).ready(function () {
    $("#add-user-button").click(()=>{
        let userName = document.getElementById("input-user-name-value").value;
        if(userName === "") {alert("ユーザー名を入力してください")}
        else {
            // alert("Submit User: " + document.getElementById("input-user-name-value").value.replace(/[^\w\s]|_/g, "")
            //     .replace(/\s+/g, ""));
            createUser(currentBridge, userName);
        }
    })

    // Go to firebase page when click the button
    $("#go-to-firebase").click(() =>{
        window.open('https://firebase.google.com', '_blank');
    })
});

    // getHueBridgeInfo("test_hue_bridge").then((bridgeInfo) => {
    //     if(bridgeInfo === undefined)
    //     {
    //         $("#bridge-unfound").fadeIn();
    //     }
    //     else {
    //         console.log(bridgeInfo);
    //         $("#hue-bridge-ip").html(bridgeInfo["IP"]);
    //         $("#hue-bridge-name").html(bridgeInfo["Name"]);
    //         $("#bridge-found").fadeIn();
    //     }
    // });

// });

// Control Part
    $(document).ready(function () {
        $("#turn-on-off").click(function () {
            let hueID = $(this).parent() // Button col
                .parent() // Hue Info col
                .parent().attr("id"); // Dash col

            if ($(this).hasClass("btn-secondary")) {
                // Hue currently on
                switchHue(currentBridge, currentUser , hueID);
                $(this).toggleClass("btn-secondary btn-success")
                    .html("Turn OFF");
            }
            else if ($(this).hasClass("btn-success")) {
                switchHue(currentBridge, currentUser , hueID);
                $(this).toggleClass("btn-success btn-secondary")
                    .html("Turn ON");
            }
        });

        $("#select").click(function () {
            let hueID = $(this).parent() // Button col
                .parent() // Hue Info col
                .parent().attr("id"); // Dash col
            selectHue(currentBridge, currentUser , hueID);
        });
        //This will be used to detect color change
        let colorObserver = new MutationObserver(function (mutations) {
            mutations.forEach(function (mutationRecord) {
                let rgb = mutationRecord["target"]["style"]["background-color"];
                let hueID = $("#turn-on-off").parent() // Button col
                    .parent() // Hue Info col
                    .parent().attr("id"); // Dash col
                // console.log(hueID);
                //output string rgb(xxx,xxx,xxx)
                rgb = rgb.substring(4, rgb.length - 1);
                // modify it to xxx,xxx,xxx
                let rgbArray = rgb.split(",");
                let cRed = rgbArray[0];
                let cGreen = rgbArray[1];
                let cBlue = rgbArray[2];
                // console.log(rgbArray);
                // console.log(cRed,cBlue,cGreen);
                convertRGBToCIE(cRed, cGreen, cBlue).then((result) => {
                    //console.log(result);
                    changHueColor(result[0], result[1], currentBridge , currentUser, "1");
                })
            });
        });
        let colorTarget = document.getElementById('change-color');
        colorObserver.observe(colorTarget, {attributes: true, attributeFilter: ['style']});
        $("#slider-1").mouseup(() => {
            let hueID = $("#turn-on-off").parent() // Button col
                .parent() // Hue Info col
                .parent().attr("id"); // Dash col
            let brightness = $("#slider-1").val()
            // console.log(brightness);
            changeBrightness(currentBridge, currentUser , hueID, parseInt(brightness)); // Need to convert Str into Int
        });
    });
