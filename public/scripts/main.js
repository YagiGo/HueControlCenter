

function findBridge() {
    // let hue = jsHue();
    // hue.discover().then(bridges => {
    //     if(bridges.length === 0) {
    //         console.log('No bridges found. :(');
    //     }
    //     else {
    //         bridges.forEach(b => console.log('Bridge found at IP address %s.', b.internalipaddress));
    //     }
    // }).catch(e => console.log('Error finding bridges', e));
    return new Promise((resolve => {
        let updates = {};
        $.ajax({
            url:'https://www.meethue.com/api/nupnp',
            method:'GET',
            success: function(data) {
                data = data[0];
                console.log(data);
                readAndSaveHueState(data["internalipaddress"]);
                resolve(data);
            }
        });
    }))
}

function getHueBridgeInfo(bridgeName)
{
    //Get Bridge info from DB
    return new Promise(((resolve, reject) => {
        firebase.database().ref("/hue_bridge_info/" + bridgeName).once("value")
            .then(function (snap) {
                // console.log(snap.val());
                resolve(snap.val());
                // hueBridgeIP = snap.val()["IP"];
                // hueBridgeName = snap.val()["Name"]
            }) .catch((error)=>{reject(error)});
    }));
}
function createUser(hueBridgeName, hueBridgeUserName)
{
    getHueBridgeInfo(hueBridgeName).then(bridgeInfo => {
        let createUsrURL = "http://" + bridgeInfo["ip"] + "/api";
        $.ajax({
            url:createUsrURL,
            method:'POST',
            data:JSON.stringify({"devicetype":hueBridgeUserName.replace(/[^\w\s]|_/g, "")
                    .replace(/\s+/g, "")}), //MUST BE CONVERTED INTO STRING
            contentType: "text/plain;charset=UTF-8",
            success: function(data) {
                data = data[0];
                console.log(data["error"]);
                console.log(data["success"]);
                if(data["error"] === undefined) {
                    alert("ユーザ追加成功");
                    // console.log(data["success"]);
                    firstTimeLoadUser(bridgeInfo["ip"]);
                    firebase.database().ref("/hue_bridge_user_info/" + data["success"]["username"])
                        .set(
                            {
                                username:hueBridgeUserName,
                                token: data["success"]["username"]
                            }
                        )
                }
                else{
                    alert("Hue Bridgeのボタンを押してください");
                }
            }
        });
    })
}
function getUserInfo(hueBridgeUserName) {
    //Get User info name from DB
    return new Promise(((resolve, reject) => {
        firebase.database().ref("/hue_bridge_user_info/" + hueBridgeUserName).once("value")
            .then(function (snap) {
                //console.log(snap.val());
                //userToken = snap.val()["token"];
                resolve(snap.val());
            }).catch((error)=>{reject(error)});
    }));
}
function initUIState(hueBridgeName, hueBridgeUserName, para) {
    getHueBridgeInfo(hueBridgeName).then((bridgeInfo) => {
        getUserInfo(hueBridgeUserName).then(userInfo => {
            // console.log(bridgeInfo["IP"], userInfo["token"]);
            // console.log(bridgeInfo);
            let getStateUrl = createURL(bridgeInfo["ip"], userInfo["token"], para);
            // console.log(getStateUrl);
            $.get(getStateUrl, (data) => {
                for (let id in data) {
                    // console.log(data[id]["state"]["on"]);
                    document.getElementById("hue-light-name").innerText = data[id]["name"];
                    document.getElementById("hue-light-location").innerText = data[id]["manufacturername"];
                    if(!userLogged)
                    {
                        $(".hue-control-panel").append("<p class='text-large unlogged'>ログインしてください</p>");
                    }
                    if (data[id]["state"]["on"]) {
                        // Hue currently on
                        $("#turn-on-off").toggleClass("btn-secondary btn-success")
                            .html("Turn OFF");
                    }
                    else if(!data[id]["state"]["on"]) {
                        //Hue currently off
                        $(this).toggleClass("btn-success btn-secondary")
                            .html("Turn ON");
                    }

                    // let hueDashboard = $(".hue-dashboard").clone();
                    let hueDashboard = document.getElementsByClassName("hue-dashboard")[0];
                    firebase.database().ref("/hue_lights_state/" + id)
                        .set(data[id]);
                    $(document).ready(function(){
                        if(userLogged)
                        {
                            $(".hue-control-panel").append(hueDashboard);
                            $(".hue-dashboard").attr("id",id).fadeIn();
                        }
                    })
                }
                // console.log(data)});
            });
        });
    });
}
function readAndSaveHueState(hueBridgeIP) {
    //Read and save state of all lights connecting to the bridge
    //Use AJAX to send the data
    return new Promise((resolve => {
        let getStateUrl = "http://" + hueBridgeIP + "/api/config";
        $.get(getStateUrl, (data) => {
            // console.log(data);
            let bridgeName = data["name"]; // Hue Bridge Name;
            let bridgeID = data["bridgeid"];
            let mac = data["mac"];
            firebase.database().ref("/hue_bridge_info/" + bridgeID)
                .set(
                    {
                        name:bridgeName,
                        id:bridgeID,
                        mac:mac,
                        ip:hueBridgeIP
                    }
                );
            // console.log(data);
            firstTimeLoadUser(hueBridgeIP);
        });
    }))
}

function firstTimeLoadUser(hueBridgeIP)
{
    // remove all old record
    $("#user-list-group .user-item").remove();
    // Will first load user list derived from DB then update data
    firebase.database().ref("/hue_bridge_user_info").once("value")
        .then(userList => {
            defaultUser = userList.val()["test_user"];
            // console.log(defaultUser);
            updateUserList(hueBridgeIP, defaultUser.token);
            // then load the list into the ui so the user can choose
            firebase.database().ref("/user_list").once("value")
                .then(userList => {
                    let users = userList.val();
                    // console.log(users.length);
                    for(let key in users)
                    {
                        // fill the ul
                        // console.log(users[key]["name"]);
                        $("#user-item-sample").clone().text(users[key]["name"])
                            .attr({
                                "id": Date.now(),
                                "value":key
                            }).appendTo("#user-list-group").show();
                        // $("#user-list-group").append(el);
                    }
                })
        })
}
function updateUserList(hueBridgeIP, hueUserToken) {
    let getStateUrl = "http://" + hueBridgeIP + "/api/" + hueUserToken + "/config";
    $.get(getStateUrl, (data) => {
        let updates = {};
        updates["/user_list"] = data["whitelist"];
        // console.log(data["whitelist"]);
        firebase.database().ref().update(updates);
    });
}

function deleteUser(hueBridgeIP)
{}

function createURL(hueBridgeIP, userToken, para) {
    return "http://" + hueBridgeIP + "/api/" + userToken + "/" + para;

}

function switchHue(hueBridgeName, hueBridgeUserName, selectedId) {
    // Switch light bulb on/off
    let updates = {};
    getHueBridgeInfo(hueBridgeName).then((bridgeInfo) => {
        getUserInfo(hueBridgeUserName).then(userInfo => {
            // console.log(bridgeInfo["IP"], userInfo["token"]);
            let getStateURL = createURL(bridgeInfo["ip"], userInfo["token"], "lights");
            // console.log(getStateURL);
            $.get(getStateURL, (data) => {
                for (let id in data) {
                    // console.log(id);
                    firebase.database().ref("/hue_lights_state/" + id)
                        .set(data[id]);
                    let lightState = data[id]["state"];
                    // console.log(lightState);
                    if (id === selectedId) {
                        let swtichingURL = createURL(bridgeInfo["ip"], userInfo["token"],"lights/" + selectedId + "/state");
                        // console.log(swtichingURL);
                        if(lightState["on"]) {
                            // console.log("Swtiching off " + id);
                            $.ajax({
                                url:swtichingURL,
                                method:'PUT',
                                data:JSON.stringify({"on":false}), //MUST BE CONVERTED INTO STRING
                                contentType: "text/plain;charset=UTF-8",
                                success: function(data) {
                                    //　console.log(data);
                                }
                            });
                            updates["/hue_lights_state/" + selectedId + "/state/on"] = false;
                        }
                        else
                        {
                            // console.log("Swtiching on " + id);
                            $.ajax({
                                url:swtichingURL,
                                method:'PUT',
                                data: JSON.stringify({"on":true}),
                                contentType: "text/plain;charset=UTF-8",//Specify the type or it will cause error
                                success: (data) => {// console.log(data);
                                     }
                            });
                            updates["/hue_lights_state/" + selectedId + "/state/on"] = true;
                        }
                        firebase.database().ref().update(updates);
                        break;
                    }
                }
            });
        });
    });

}

function selectHue(hueBridgeName, hueBridgeUserName, selectedId) {
    let updates = {}; // Update light state
    // Select the light
    getHueBridgeInfo(hueBridgeName).then((bridgeInfo) => {
        getUserInfo(hueBridgeUserName).then((userInfo) => {
            let selectURL = createURL(bridgeInfo["ip"], userInfo["token"],"lights/" + selectedId + "/state");
            $.ajax({
                url:selectURL,
                method:'PUT',
                data:JSON.stringify({"alert":"select"}), //MUST BE CONVERTED INTO STRING
                contentType: "text/plain;charset=UTF-8",
                success: function(data) {
                    // console.log(data);
                }
            });
            updates["/hue_lights_state/" + selectedId  +"/state/alert"] = "select";
            firebase.database().ref().update(updates); // update light state
        });
    });
}

function convertRGBToCIE(cRed, cGreen, cBlue) {
    return new Promise(((resolve, reject) => {
        //starting convert RGB to CIE
        let normalizedToOne = [];
        let result = []
        normalizedToOne[0] = (cRed / 255);
        normalizedToOne[1] = (cGreen / 255);
        normalizedToOne[2] = (cBlue / 255);
        let red, green, blue;
        // Make red more vivid
        if(normalizedToOne[0] > 0.04045) {
            red = Math.pow((normalizedToOne[0] + 0.055) / (1.0 + 0.055), 2.4);
        }
        else {
            red = normalizedToOne[0] / 12.92;
        }
        // Make green more vivid
        if(normalizedToOne[1] > 0.04045) {
            green = Math.pow((normalizedToOne[1] + 0.055) / (1.0 + 0.055), 2.4);
        }
        else {
            green = normalizedToOne[1] / 12.92;
        }
        // Make red more vivid
        if(normalizedToOne[2] > 0.04045) {
            blue = Math.pow((normalizedToOne[2] + 0.055) / (1.0 + 0.055), 2.4);
        }
        else {
            blue = normalizedToOne[2] / 12.92;
        }
        let X = (red * 0.649926 + green * 0.103455 + blue * 0.197109);
        let Y = (red * 0.234327 + green * 0.743075 + blue + 0.022598);
        let Z = (red * 0.0000000 + green * 0.053077 + blue * 1.035763);
        let xValue, yValue
        xValue = X / (X + Y + Z);
        yValue = Y / (X + Y + Z);
        result[0] = xValue;
        result[1] = yValue;
        resolve(result);
    }))
}

function changHueColor(x,y, hueBridgeName, hueBridgeUserName, selectedId) {
    let updates = {}; // Update light state
    // Select the light
    getHueBridgeInfo(hueBridgeName).then((bridgeInfo) => {
        getUserInfo(hueBridgeUserName).then((userInfo) => {
            let selectURL = createURL(bridgeInfo["ip"], userInfo["token"],"lights/" + selectedId + "/state");
            $.ajax({
                url:selectURL,
                method:'PUT',
                data:JSON.stringify({
                    "xy":[x,y]}), //MUST BE CONVERTED INTO STRING
                contentType: "text/plain;charset=UTF-8",
                success: function(data) {
                    // console.log(data);
                }
            });
            updates["/hue_lights_state/" + selectedId  +"/state/xy"] = [x,y];
            firebase.database().ref().update(updates); // update light state
        });
    });
}

function changeBrightness(hueBridgeName, hueBridgeUserName, selectedId, brightness) {
    let updates = {} // Update light state
    // Select the light
    getHueBridgeInfo(hueBridgeName).then((bridgeInfo) => {
        getUserInfo(hueBridgeUserName).then((userInfo) => {
            let selectURL = createURL(bridgeInfo["ip"], userInfo["token"],"lights/" + selectedId + "/state");
            $.ajax({
                url:selectURL,
                method:'PUT',
                data:JSON.stringify({"bri":brightness}), //MUST BE CONVERTED INTO STRING
                contentType: "text/plain;charset=UTF-8",
                success: function(data) {
                    // console.log(data);
                }
            });
            updates["/hue_lights_state/" + selectedId  +"/state/bri"] = brightness;
            firebase.database().ref().update(updates); // update light state
        });
    });
}

// getHueBridgeInfo("test_hue_bridge");
// getUserInfo("test_user");
// findBridge();
readAndSaveHueState("test_hue_bridge", "test_user").then(()=> {
    //when finished readAndSaveData user can choose user
    // console.log("finished")

});
initUIState(currentBridge, currentUser, "lights");