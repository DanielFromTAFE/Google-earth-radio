/**
 * Created by waimingchoi on 31/5/17.
 */
$( function() {
    $( "#slider" ).slider({
        orientation: "vertical",
        max:500,
        min:50,
        value:200,
        step: 2
    });
    $('#btnMute').click(function() {
        var text = $('#btnMute').text();
        if ( text === "Muted"){
            $('#currentAudio').animate({volume: 1.0}, 1000);
            $('#btnMute').text('Mute');
        }else{
            $('#currentAudio').animate({volume: 0.01}, 1000);
            $('#btnMute').text('Muted');
        }
    });

});

