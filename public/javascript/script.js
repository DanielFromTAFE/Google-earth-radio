/**
 * Created by waimingchoi on 20/5/17.
 */
var data;
var playingWhiteNoise = false;
getData();
var changedByLink = false;
var withInStations = [];
var placesArr = [];
var stationsList = [];
function createAudios() {
    var listAudio = document.createElement("div");
    listAudio.setAttribute('id','listAudio');
    document.body.appendChild(listAudio);
    var currentAudio = document.createElement("AUDIO");
    currentAudio.setAttribute('id','currentAudio');
    currentAudio.setAttribute('src','');
    listAudio.appendChild(currentAudio);
    var whiteNoiseAudio = document.createElement("AUDIO");
    whiteNoiseAudio.setAttribute('id','whiteNoise');
    whiteNoiseAudio.setAttribute('src','public/01-White-Noise-10min.mp3');
    listAudio.appendChild(whiteNoiseAudio);
}
var lastStation,lastCoordinate;
var runtime = 0;
var searchTarget;
var hasStation = true;
var firstLoad = true;
var socket = io.connect('/');
var radio = document.getElementById('currentAudio');
//setup "loading" to prevent overloading of src
var loading = false;
//once the socket on, it pass the coordinate from server
socket.on('message',function (data) {

    var whiteNoise = document.getElementById('whiteNoise');
    var radio = document.getElementById('currentAudio');
    //check for init startup
    if (runtime == 0){
        lastCoordinate = data.message;
        runtime++;
    }

    try{
        if (data.message != lastCoordinate)
                changedByLink = false;
        if (changedByLink == false) {
        if (!hasStation && whiteNoise.paused && radio.paused) {
            //play noise when there is no station or radio stopped somehow
            whiteNoise_fadeIn();
            playingWhiteNoise = true;
        } else {
            //else - is the normal case
            //if the map stable, search place stations, calculate and sort the distance
            if (data.message === lastCoordinate) {
                var URL = reSearch(data.message);
            }
            //case 1 - if radio stopped and src is not loading, then play the radio and display stations
            if (radio.paused && !loading) {
                if (!URL){
                    var URL = reSearch(data.message);
                    console.log(URL[0]);
                }
                radio_fadeIn(URL[0]);
                console.log(URL[0]);

                DisplayStations(URL[0]);
                lastCoordinate = data.message;
            } else {
                //case 2 - map moving
                //map stopped
                if (data.message === lastCoordinate) {
                    //white noise is playing and not loading the src, play the src then loading become true
                    if (!whiteNoise.paused && !loading) {
                        radio_fadeIn(URL[0]);
                        loading = true;
                        DisplayStations(URL[0]);

                    }//else do nothing, cuz it's loading the src

                    //case 2 - else - map is moving
                } else if (data.message != lastCoordinate) {
                    //keep update the coordinate
                    lastCoordinate = data.message;
                    if (whiteNoise.paused) {
                        radio_fadeOut();
                        whiteNoise_fadeIn();
                    }
                }
            }
        }
    }
    } catch (err){
        $( "#list" ).remove();

        $('#errorMessage').text('No radio around').fadeIn();
         console.log(err);
        firstLoad = false;
    }

});

function reSearch(message) {
    var viewsync = String(message).split(',');
    searchTarget = new google.maps.LatLng(viewsync[0], viewsync[1]);

    var URL = search(searchTarget);
    //assign the first station as default radio
    lastStation = URL[0];
    return URL;
}
function whiteNoise_fadeIn() {
    $(document).ready(function () {
        var whiteNoise = document.getElementById('whiteNoise');
        whiteNoise.volume = 0.0;
        whiteNoise.play();
            $('#whiteNoise').animate({volume: 0.2}, 1000);
        });
}
function whiteNoise_fadeOut() {
    $(document).ready(function () {
        $('#whiteNoise').animate({volume: 0.0}, 1000);
        setTimeout(function () {
            var noise = document.getElementById('whiteNoise');
            noise.pause();
        },1000);
    });

}
function radio_fadeIn(URL,changeRadio) {
    try {
        console.log(changeRadio);
        if (changeRadio){
            changedByLink = true;
        }
        var audio = document.getElementById('currentAudio');
        audio.src = URL;
        audio.volume = 0.0;
        audio.play();

        document.getElementById("currentAudio").oncanplay = function () {
            //check for data loaded
            $(document).ready(function () {
                $('#currentAudio').animate({volume: 1.0}, 1000);
                setTimeout(function () {
                    loading = false;
                },1000);
            });
            whiteNoise_fadeOut();
        };
    } catch (err){
        console.log(err);
    }

}
function radio_fadeOut() {
    $(document).ready(function () {
        $('#currentAudio').animate({volume: 0.0}, 1000);
    });
}
function getData(){
    var request = new XMLHttpRequest();
    request.open('GET', 'http://goo.scem.ws/radio/live.json', true);

    request.onload = function() {
        if (request.status >= 200 && request.status < 400) {
            // Success!
            var cord,lat,lng;
            data = JSON.parse(request.responseText);
            for (var i = 0;i < data.places.length; i++){
                //Save the geo into place array to get the right format of the json
                lat = data.places[i].geo[0];
                lng = data.places[i].geo[1];
                cord = new google.maps.LatLng(lat, lng);
                placesArr.push(cord);
            }

        } else {
            // We reached our target server, but it returned an error
            console.log("error connection");
        }
    };
    request.onerror = function() {
        // There was a connection error of some sort
        console.log("error no connection");
    };
    request.send();
}
$( function() {
    $( "#slider" ).on("slide", function (e, ui) {
        radius = ui.value;
        search(searchTarget,radius);
        DisplayStations();
        $( "#txtRadius" ).fadeOut('fast', function () {
            $(this).text(radius).fadeIn('fast');
        });
    });

} );

var radius = 200;
function search(coordinate,customRadius){
    try {
        //withInStations is stations that within 50km
        //empty the stations list
        withInStations = [];
        if (customRadius){
            radius = customRadius;
            getWithinRadiusStations(coordinate,customRadius);

        } else {
            //console.log('5');
            getWithinRadiusStations(coordinate,radius);
        }
        //sort stations distance by distance
        sortStation();
        stationsList = withInStations;
        hasStation = true;

        return withInStations[0].src;
    } catch (err){
        //console.log(err);
        $( "#list" ).remove();

        $('#errorMessage').text('No radio around').fadeIn();

        hasStation = false;
    }
}
function getWithinRadiusStations(coordinate,radius) {
    var km;
    //console.log('6');
    for (var i = 0; i < data.places.length; i++){
        var meter = google.maps.geometry.spherical.computeDistanceBetween(coordinate,placesArr[i]);
        km = meter/1000;

        //get a list of radio stations that < 50km
        if (km < radius){
            //calculate distance between the center coordinate and places
            var channels = [];
            var name = [];
            for (var j =0; j < data.places[i].channels.length;j++){
                channels.push(data.channels[data.places[i].channels[j]].src);
                name.push(data.channels[data.places[i].channels[j]].name);
            }
            withInStations.push({'placeName':data.places[i].name,'src':channels,'stationName':name,'placeIndex': i,'distance':km});
            channels = [];
        }
    }
    return withInStations;
}
function sortStation() {
    // sort the distance
    return withInStations.sort(function (a,b){return a.distance - b.distance});
}
function DisplayStations(playingStation) {
    $( "#list" ).remove();
    $('#errorMessage').text('');
    var div = document.getElementById('placeHolder');
    var list = document.createElement('UL');
    list.setAttribute("id","list");
    document.body.appendChild(list);
    //list.setAttribute("display","none");

    for (var i = 0; i < stationsList.length; i++){
        var location = document.createElement("LI");
        location.setAttribute('class','location');
        var node = document.createTextNode(stationsList[i].placeName);
        var h3 = document.createElement("H3");
        h3.appendChild(node);
        location.appendChild(h3);
        document.getElementById("list").appendChild(location);
        $('.location').hide();
        var radiosList = document.createElement("UL");

        for (var j=0; j  < stationsList[i].src.length;j++){
            var stationName = document.createTextNode(stationsList[i].stationName[j]);
            var radioName = document.createElement("LI");
            var a = document.createElement("a");
            a.setAttribute("class","stationURL");
            a.setAttribute("href",stationsList[i].src[j]);
            a.appendChild(stationName);
            radioName.appendChild(a);
            radiosList.appendChild(radioName);
        }
        location.appendChild(radiosList);
    }
    div.appendChild(list);
    $('.location').fadeIn();
    getCurrentPlaying();
    createAnchors();
    stationsList = [];
}
function getCurrentPlaying() {
    var currentRadio = document.getElementById('currentAudio').src;
    for(var i = 0; i< stationsList.length;i++){
        for(var j=0;j <stationsList[i].src.length;j++){
            if (currentRadio === stationsList[i].src[j]){
                $("#current_station").text('');
                var text = stationsList[i].placeName + ": "+ stationsList[i].stationName[j];
                var node = document.createTextNode(text);
                var current_station = document.getElementById('current_station');
                current_station.appendChild(node);
                current_station.style.color = "#00cca3";
                $("#current_station").hide();
                $("#current_station").fadeIn();
                return;
            }
        }
    }
}
var Anchors = document.getElementsByClassName("stationURL");

function createAnchors() {
    for (var i = 0; i < Anchors.length ; i++) {
        Anchors[i].addEventListener("click",
            function (event) {
                event.preventDefault();
                changedByLink = true;
                var URL = this.href;
                radio_fadeOut();
                setTimeout(whiteNoise_fadeIn(),500);

                setTimeout(function () {
                    radio_fadeIn(URL,"changeRadio");
                    getCurrentPlaying();
                },500);
            },
            false);
    }
}
function initMap() {
    var map = new google.maps.Map(document.getElementById('map'), {
        zoom: 13,
        center: {
            lat: -33.8688197, lng: 151.2092955
        }
    });
}

