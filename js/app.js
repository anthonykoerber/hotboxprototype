// JavaScript Document
// constants:
var STEP_WIDTH =      32,  // step width as defined in css
	STEP_PAD =        3,   // padding left & right of each step button as defined in css
	STEP_SIDE_PAD =   0,   // padding left & right of each step ul as defined in css
	TEMPO_MAX =       200, // maximum tempo
	TEMPO_MIN =       50,  // minimum tempo
	LOOP_LENGTH_MIN = 16,  // minimum number of steps
	LOOP_LENGTH_MAX = 128, // maximum number of steps
	VOL_MAX =         0.9, // maximum volume/velocity of note
	VOL_MIN =         0.2; // minimum volume/velocity of note

// variables:
var context,
	compressor,
	masterGainNode,
	sounds = [
		{id:0, sounds:['bass_rip_a0',       'clap_hr16_gate',    'closed_hat_dm5',     'kick_dm5_hi808', 'open_hat_choke', 'open_hat_hr16', 'perc_hr16_block',     'snare_zap', 'vox_up']}, 
		{id:1, sounds:['basstone', 'casiotone','hihat1', 'hihat2', 'kick2', 'openhat', 'snare1', 'snare2', 'tomtom']},
		{id:3, sounds:['c2',       'sweat',    'c4',     'hihat2', 'kick2', 'openhat', 'g3',     'snare2', 'uh']},
		{id:3, sounds:['basstone', 'casiotone','hihat1', 'hihat2', 'kick2', 'openhat', 'snare1', 'snare2', 'tomtom']}
	],
	channels 	 = [],
	sequence 	 = [],
	downIds 	 = [{down: false}, {down: false}, {down: false}, {down: false}, {down: false}, {down: false}, {down: false}, {down: false}, {down: false}],
	playing 	 = false,
	startTime,
	timeoutId,
	currentKit   = 1,
	lastDrawTime = -1,
	rhythmIndex  =  0,
	loopLength   =  LOOP_LENGTH_MIN,
	bar          = 0,
	noteTime     = 0.0,
	tempo 		 = 110;

// dom objects:
var container,
	pads,
	playBtn,
	stopBtn,
	stepBtn,
	stepLight,
	tempoDisply,
	tempoUpBtn,
	tempoDownBtn,
	lengthDisplay,
	lengthUpBtn,
	lengthDownBtn,
	barDisplay,
	barUpBtn,
	barDownBtn,
	clearBtn,
	kitUpBtn,
	kitDownBtn,
	kitDisplay;
	
$(document).ready(init);

function init(){
	// cache elements:
	container =      $('.container');
	stepsHolder =    $('.steps-holder');
	pads =    		 $('ul.pads li a');
	playBtn = 		 $('#play-btn');
	stopBtn = 		 $('#stop-btn');
	tempoDisplay =   $('#tempo-display');
	tempoUpBtn =     $('#tempo-up-btn');
	tempoDownBtn =   $('#tempo-down-btn');
	clearBtn =       $('#clear-btn');
	stepLight =      $('.step-light');
	lengthDisplay =  $('#length-display');
	lengthUpBtn = 	 $('#length-up-btn');
	lengthDownBtn =  $('#length-down-btn');
	barDisplay =     $('#bar-display');
	barUpBtn = 		 $('#bar-up-btn');
	barDownBtn =     $('#bar-down-btn');
	kitUpBtn =       $('#kit-up-btn');
	kitDownBtn =     $('#kit-down-btn');
	kitDisplay =      $('#kit-display');
	
	// check for audio context:
	/*
	// future compatability:
	if (typeof AudioContext == "function") {
		context = new AudioContext();
		console.log('AudioContext is supported');
		setup();
	} 
	*/
	// current compatability:
	if ('webkitAudioContext' in window) {
		context = new webkitAudioContext();
		// console.log('webkitAudioContext is supported');
		setup();
	} else {
		alert('Sorry - this browser doesn\'t support the Web Audio API. Try Chrome 10+ or Safari 6+');
	}
	
	// bind for key presses:
	window.onkeydown = keyDownHandler;
	window.onkeyup = keyUpHandler;
	
	// bind mouse events:
	pads.mousedown(padDownHit);
	pads.mouseup(padUpHit);
	
	// bind clicks:
	playBtn.click(playHandler);
	stopBtn.click(stopHandler);
	tempoUpBtn.click(tempoUpHandler);
	tempoDownBtn.click(tempoDownHandler);
	clearBtn.click(clearHandler);
	lengthUpBtn.click(lengthUpHandler);
	lengthDownBtn.click(lengthDownHandler);
	barUpBtn.click(barUpHandler);
	barDownBtn.click(barDownHandler);
	kitUpBtn.click(kitUpHandler);
	kitDownBtn.click(kitDownHandler);
	
	// set defaults:
	setTempoDisplay();
	setLengthDisplay();
	setBarDisplay();
	setKitDisplay();
}

//*****************************************************************
// AUDIO API
//*****************************************************************
function setup(){
	// create channels & ui - order is specific to creation of data objects:
	createChannels();
	createSequence();
	createSteps();

	// create the master audio channel:
	var finalMixNode;
	
	if (context.createDynamicsCompressor) {
		// Create a dynamics compressor to sweeten the overall mix.
		compressor = context.createDynamicsCompressor();
		compressor.connect(context.destination);
		finalMixNode = compressor;
	} else {
		// No compressor available in this implementation.
		finalMixNode = context.destination;
	}
	
	// finalMixNode = context.destination;

	// Create master volume.
	masterGainNode = context.createGainNode();
	masterGainNode.gain.value = 0.7; // reduce overall volume to avoid clipping
	masterGainNode.connect(finalMixNode);	
}


function loadSound(channelObj){
	var request = new XMLHttpRequest(),
		channelObject = channelObj;
		
	request.open("GET", channelObject.url, true);
	request.responseType = "arraybuffer";
	 
	// Our asynchronous callback
	request.onload = function() {
		var buffer = context.createBuffer(request.response, true);
		channels[channelObject.id].buffer = buffer;
	};
	
	request.send();	
}

// play note real time (originated from a click or key press) 
// or play note from sequence:
function playNote(channelObj, noteTime, volume) {
	var channelObject = channelObj,
		voice = context.createBufferSource(),
		gainNode = context.createGainNode();
	
	voice.buffer = channelObject.buffer;
	gainNode.gain.value = volume * 2;
	voice.connect(gainNode);
	gainNode.connect(masterGainNode);
	voice.noteOn(noteTime);
}

//*****************************************************************
// SET UP CHANNELS & SEQUENCE
//*****************************************************************
// iterate over the sounds array and create a channel object for each:
function createChannels(){
	var drumSounds = sounds[currentKit].sounds;
	
	// re-init channels:
	channels = [];
	
	for (var i = 0; i < drumSounds.length; i++) {
		var soundSrc = 'audio/' + drumSounds[i] + '.wav',
			channelObj = { id: i, name: drumSounds[i], url: soundSrc, buffer: null };
		// console.log('createChannels :: channelObj.name: ', channelObj.name);
		channels.push(channelObj);
		loadSound(channelObj);
		setPadName(channelObj);
	}
}

function setPadName(channelObj){
	var padObj = $('ul.pads li a[data-id="' + channelObj.id + '"]');
	padObj.html(padObj.attr('data-keynum') + ' ' + channelObj.name);
}

// iterate over the sounds array and create a sequence for each channel:
function createSequence(){
	var drumSounds = sounds[currentKit].sounds;
	
	for (var i = 0; i < drumSounds.length; i++) {
		var channelSeq = [],
			channelObj = channels[i];
		
		for (var j = 0; j < loopLength; j++) {
			var stepObj = {};
			
			// check if there are note on & volumes stored in the current sequence
			// for first time setup - the sequence is undefined
			if(sequence[i] != undefined){
				// console.log('createSequence - sequence[' + i + '][' + j + ']: ' + sequence[i][j]);
				if (sequence[i][j] != undefined){
					// duplicate the current step values and push into the step object:
					stepObj.noteOn = sequence[i][j].noteOn;
					stepObj.volume = sequence[i][j].volume;
				} else {
					// create default step object:
					stepObj.noteOn = 0;
					stepObj.volume = 0;
				}
			} else {
				// if not - create them with default values:
				stepObj.noteOn = 0;
				stepObj.volume = 0;
			}
			// push the step object into each step of the channel sequence:
			channelSeq.push(stepObj);
		}
		
		// store the sequence to the related channel object:
		channelObj.channelSeq = channelSeq;
		
		// store the raw data to the sequence array:
		if (sequence[i] != undefined){
			sequence[i] = channelSeq;	
		} else {
			sequence.push(channelSeq);
		}
	}
	// console.log('createSequence - sequence:');
	// console.log(sequence);
}

function createSteps(){
	// clear holder:
	stepsHolder.empty();
	
	// set the width of th step holder:	
	stepsHolder.css({ width : ((STEP_WIDTH + STEP_PAD * 2) * loopLength) + (STEP_SIDE_PAD * 2) });
	
	// add step lights:
	var stepLightUl = $('<ul class="steps-light"></ul>');
	for (var k = 0; k < loopLength; k++) {
		var stepLightLi = $('<li><a href="javascript:void(0)" data-id="' + k + '" >step ' + k + '</a></li>');
		stepLightUl.append(stepLightLi);
	}
	stepsHolder.append(stepLightUl);
	
	var drumSounds = sounds[currentKit].sounds;
	for (var i = 0; i < drumSounds.length; i++) {
		var stepUl = $('<ul class="steps"></ul>'),
			channelObj = channels[i];
		
		// add step buttons:
		for (var j = 0; j < loopLength; j++) {
			var quarter = (j % 4) ? '' : 'q',
				active = (channels[i].channelSeq[j].noteOn === 1) ? (' ' + 'active') : '',
				active2 = (channels[i].channelSeq[j].volume === VOL_MAX) ? '2' : ''
				stepLi = $('<li><a href="javascript:void(0)" class="' + quarter + active + active2 + '"data-channel="' + i + '" data-step="' + j + '" >step ' + j + '</a></li>');
			stepUl.append(stepLi);
		}
		stepsHolder.append(stepUl);
		
		// add sound name to pads:
		// setPadName(channelObj);
	}
	
	// cache step buttons and bind clicks:
	stepBtn = $('ul.steps li a');
	stepBtn.click(stepHandler);	
}

//*****************************************************************
// SEQUENCER
//*****************************************************************
// advance the current note (rhythmIndex):
function advanceNote() {
	// advance time by a 16th note:
	var secondsPerBeat = 60.0 / tempo;
	
	// console.log('rhythmIndex: ' + rhythmIndex);
	rhythmIndex++;
	if (rhythmIndex == loopLength) {
		rhythmIndex = 0;
	}
	
	noteTime += 0.25 * secondsPerBeat;
}

function schedule() {
	var currentTime = context.currentTime;

	// The sequence starts at startTime, so normalize currentTime so that it's 0 at the start of the sequence.
	currentTime -= startTime;

	while (noteTime < currentTime) {
		// convert noteTime to context time:
		var contextPlayTime = noteTime + startTime;
		
		for (var i = channels.length-1; i > -1; i--) {
			var channel = channels[i],
				noteOn = (channel.channelSeq[rhythmIndex].noteOn == 1) ? true : false,
				volume = channel.channelSeq[rhythmIndex].volume;
			
			if(noteOn) {
				playNote(channel, /*noteTime*/contextPlayTime, volume);
			}
		}
		
		// synchronize drawing time with sound:
		if (noteTime != lastDrawTime) {
			lastDrawTime = noteTime;
			drawPlayhead();
		}
		
		advanceNote();
	}
	
	timeoutId = setTimeout(function(){ schedule() }, 0);
}

function stepHandler(e) {
	e.preventDefault();
	
	var me =         $(this),
		channel =    me.attr('data-channel'),
		step =       me.attr('data-step'),
		stepObj =    channels[channel].channelSeq[step],
		seqStepObj = sequence[channel][step];
	
	if(stepObj.noteOn != 1  && stepObj.volume == 0){
		// add note on - sync sequence and channel sequence:
		stepObj.noteOn = 1;
		stepObj.volume = VOL_MIN;
		seqStepObj.noteOn = 1;
		seqStepObj.volume = VOL_MIN;
		
		// ui:
		me.addClass('active');
	} else if(stepObj.noteOn == 1  && stepObj.volume == VOL_MIN){
		// increase the volume of the note - sync sequence and channel sequence:
		stepObj.volume = VOL_MAX;
		seqStepObj.volume = VOL_MAX;
		
		// ui:
		me.removeClass('active');
		me.addClass('active2');
	} else {
		// remove note on - sync sequence and channel sequence:
		stepObj.noteOn = 0;
		stepObj.volume = 0;
		seqStepObj.noteOn = 0;
		seqStepObj.volume = 0;
		
		// ui:
		me.removeClass('active2');
	}
}

function drawPlayhead() {
	var lastIndex = (rhythmIndex > 0) ? rhythmIndex - 1 : loopLength -1,
		currStep = $('ul.steps-light li a[data-id="' + rhythmIndex + '"]'),
		lastStep = $('ul.steps-light li a[data-id="' + lastIndex + '"]');
	
	currStep.addClass('active');
	lastStep.removeClass('active');
}

function playSequence() {
	noteTime = 0.0;
	startTime = context.currentTime;
	playing = true;
	
	schedule();
	// disableLength();
}

function stopSequence() {
	clearTimeout(timeoutId);
	rhythmIndex = 0;
	playing = false;
	
	// clear step lights ui display:
	$('ul.steps-light li a').removeClass('active');
	
	// enableLength();
}

//*****************************************************************
// UI
//*****************************************************************
// *** PADS ***
// pad trigger from num pad:
function keyDownHandler(e){
  	e.preventDefault();
  	
	var id = -1;
	switch(e.keyCode) {
		case 32: if(!playing){ playSequence() } else { stopSequence(); } break; // space bar 
		case 103: id = 0; break;
		case 104: id = 1; break;
		case 105: id = 2; break;
		case 100: id = 3; break;
		case 101: id = 4; break;
		case 102: id = 5; break;
		case 97:  id = 6; break; 
		case 98:  id = 7; break;
		case 99:  id = 8; break;
		default: return;
	}
	// avoid retriggering for the down event
	// don't check of space bar
	if(id != -1 && !downIds[id].down){
		playNote(channels[id], context.currentTime, VOL_MAX);
		downIds[id].down = true;
		padDown(id);
	}
}

function keyUpHandler(e){
  	e.preventDefault();
  	
	var id = -1;
	switch(e.keyCode) {
		case 105: id = 2; break;
		case 100: id = 3; break;
		case 103: id = 0; break;
		case 104: id = 1; break;
		case 101: id = 4; break;
		case 102: id = 5; break;
		case 97:  id = 6; break; 
		case 98:  id = 7; break;
		case 99:  id = 8; break;
		default: return;
	}
	// release for the down event flag:
	if(downIds[id].down) downIds[id].down = false;
	padUp(id);
}

// mouse triggered pad down & up:
function padDownHit(e) {
	e.preventDefault();
	var me = $(this),
		id = me.attr('data-id');
	playNote(channels[id], context.currentTime, VOL_MAX);		
	padDown(id);
}

function padUpHit(e) {
	e.preventDefault();
	var me = $(this),
		id = me.attr('data-id');
	padUp(id);
}

// handle ui display for pad up & down:
function padDown(id){
	$('ul.pads li a[data-id="' + id + '"]').addClass('active');
}

function padUp(id){
	$('ul.pads li a[data-id="' + id + '"]').removeClass('active');
}

//*****************************************************************
// *** TEMPO ***
// handle tempo up & down:
function tempoUpHandler(e){
	e.preventDefault();
	if(tempo < TEMPO_MAX){
		++tempo;
		setTempoDisplay();
	}
}

function tempoDownHandler(e){
	e.preventDefault();
	if(tempo > TEMPO_MIN){
		--tempo;
		setTempoDisplay();
	}
}

function setTempoDisplay(){
	tempoDisplay.html(tempo);		
}

//*****************************************************************
// *** SEQ CONTROLS ***
// handle play & stop:
function playHandler(e) {
	e.preventDefault();
	playSequence();
}

function stopHandler(e) {
	e.preventDefault();
	stopSequence();
}

// clear current pattern:
function clearHandler(e){
	e.preventDefault();
	
	for (var i = channels.length-1; i > -1; i--) {
		var channel = channels[i];
		
		for (var j = channel.channelSeq.length-1; j > -1; j--){
			// clear out the step object:
			channel.channelSeq[j].noteOn = 0;
			channel.channelSeq[j].volume = 0;
			
			// clear the sequence raw data:
			sequence[i][j].noteOn = 0;
			sequence[i][j].volume = 0;
			
			// clear steps ui display:
			if(stepBtn.hasClass('active')) stepBtn.removeClass('active');
			if(stepBtn.hasClass('active2')) stepBtn.removeClass('active2');
		}
	}
}

//*****************************************************************
// *** BAR & LENGTH CONTROLS ***
// handle length up & down:
function lengthUpHandler(e){
	e.preventDefault();
	if (loopLength < LOOP_LENGTH_MAX){
		loopLength += 16;
		
		// TODO - set the play head position of the loop is playing:
		resetSequencer();
	}
}

function lengthDownHandler(e){
	e.preventDefault();
	if (loopLength > LOOP_LENGTH_MIN){
		loopLength -= 16;
		
		// TODO - set the play head position of the loop is playing:
		if(playing){
			stopSequence();
			resetSequencer();
			setBarDown();
			playSequence();
		} else {
			resetSequencer();
			setBarDown();
		}
	}
}

function resetSequencer(){
	createSequence();
	createSteps();
	setLengthDisplay();
}

function setLengthDisplay(){
	lengthDisplay.html(loopLength/16);	
}

// disable & enable length:
/*
function disableLength(){
	lengthUpBtn.attr('disabled', true);
	lengthDownBtn.attr('disabled', true);
	lengthUpBtn.addClass('disabled');
	lengthDownBtn.addClass('disabled');
}

function enableLength(){
	lengthUpBtn.removeAttr('disabled');
	lengthDownBtn.removeAttr('disabled');
	lengthUpBtn.removeClass('disabled');
	lengthDownBtn.removeClass('disabled');
}
*/

// handle bar up & down:
function barUpHandler(e){
	e.preventDefault();
	setBarUp();
}

function barDownHandler(e){
	e.preventDefault();
	setBarDown();
}

function setBarUp(){
	if(bar < (loopLength/16) - 1){
		++bar;
		
		scrollStepsView();
		setBarDisplay();
	}
}

function setBarDown(){
	if(bar > (LOOP_LENGTH_MIN/16) - 1){
		--bar;
		
		scrollStepsView();
		setBarDisplay();
	}
}

function setBarDisplay(){
	barDisplay.html(bar + 1);	
}

function scrollStepsView() {
	var singlePaneWidth = ((STEP_WIDTH + STEP_PAD * 2) * 16),
		newLeftPos = 0 - (bar * singlePaneWidth); 
	stepsHolder.stop().animate({ left: newLeftPos }, 300);
}

//*****************************************************************
// *** KIT CONTROLS ***
// handle kit up & down:
function kitUpHandler(e){
	e.preventDefault();
	
	if (currentKit < 3){
		++currentKit;
		
		if(playing){
			stopSequence();
			createChannels();
			createSequence();
			playSequence();
		} else {
			createChannels();
			createSequence();
		}
		setKitDisplay();
	}
}

function kitDownHandler(e){
	e.preventDefault();
	
	if (currentKit > 0){
		--currentKit;
		
		if(playing){
			stopSequence();
			createChannels();
			createSequence();
			playSequence();
		} else {
			createChannels();
			createSequence();
		}
		setKitDisplay();
	}
}

function setKitDisplay(){
	kitDisplay.html(currentKit + 1);	
}