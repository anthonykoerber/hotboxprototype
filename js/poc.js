  // constants:
var STEP_WIDTH      = 32,  // step width in px as defined in css
	STEP_PAD        = 3,   // padding left & right of each step button in px as defined in css
	STEP_SIDE_PAD   = 0,   // padding left & right of each step ul in px as defined in css
	TEMPO_MAX       = 250, // maximum tempo
	TEMPO_MIN       = 50,  // minimum tempo
	LOOP_LENGTH_MIN = 16,  // minimum number of steps, also default value for 'loopLength' - 1 indexed
	LOOP_LENGTH_MAX = 256, // maximum number of steps - 1 indexed - 16 bars total
	VOL_MAX         = 0.8, // maximum volume/velocity of note
	VOL_MIN 		= 0.2, // minimum volume/velocity of note
	ANIM_TIME       = 300; // animation time in milliseconds

// variables:
var context,
	compressor,
	masterGainNode,
	drumKits = [
		{ folderName:'kit1', name:'808 Nasty Kit', id:0, loaded:false, drumSounds:[
				{ name:'bass_square_a1',  pan:false, panX:0, panY:0, panZ:0, buffer:undefined },
				{ name:'clap_gate',       pan:true,  panX:0, panY:0, panZ:0, buffer:undefined },
				{ name:'closed_hat_dm5',  pan:false, panX:0, panY:0, panZ:0, buffer:undefined },
				{ name:'kick_hi808',      pan:false, panX:0, panY:0, panZ:0, buffer:undefined },
				{ name:'open_hat_choke',  pan:true,  panX:0, panY:0, panZ:0, buffer:undefined },
				{ name:'open_hat_hr16',   pan:true,  panX:0, panY:0, panZ:0, buffer:undefined },
				{ name:'perc_block',      pan:true,  panX:0, panY:0, panZ:0, buffer:undefined },
				{ name:'snare_zap',       pan:false, panX:0, panY:0, panZ:0, buffer:undefined },
				{ name:'vox_up',          pan:false, panX:0, panY:0, panZ:0, buffer:undefined }
			]
		},
		{ folderName:'kit2', name:'Bit Bunker Kit', id:1, loaded:false, drumSounds:[
				{ name:'bass_sine_c1',    pan:false, panX:0, panY:0, panZ:0, buffer:undefined },
				{ name:'clap_707',        pan:true,  panX:0, panY:0, panZ:0, buffer:undefined },
				{ name:'closed_hat_808',  pan:false, panX:0, panY:0, panZ:0, buffer:undefined },
				{ name:'kick_casio',      pan:false, panX:0, panY:0, panZ:0, buffer:undefined },
				{ name:'open_hat_bit',    pan:true,  panX:0, panY:0, panZ:0, buffer:undefined },
				{ name:'closed_hat_bit',  pan:true,  panX:0, panY:0, panZ:0, buffer:undefined },
				{ name:'perc_claveshort', pan:true,  panX:0, panY:0, panZ:0, buffer:undefined },
				{ name:'snare_abstrakt',  pan:false, panX:0, panY:0, panZ:0, buffer:undefined },
				{ name:'vox_uh',          pan:false, panX:0, panY:0, panZ:0, buffer:undefined }
			]
		},
		{ folderName:'kit3', name:'Data Com Kit', id:2, loaded:false, drumSounds:[
				{ name:'bass_dist808_c2', pan:false, panX:0, panY:0, panZ:0, buffer:undefined },
				{ name:'clap_noiz',       pan:true,  panX:0, panY:0, panZ:0, buffer:undefined },
				{ name:'closed_hat_md16', pan:false, panX:0, panY:0, panZ:0, buffer:undefined },
				{ name:'kick_deepwood',   pan:false, panX:0, panY:0, panZ:0, buffer:undefined },
				{ name:'open_hat_emu',    pan:true,  panX:0, panY:0, panZ:0, buffer:undefined },
				{ name:'closed_hat_short',pan:true,  panX:0, panY:0, panZ:0, buffer:undefined },
				{ name:'perc_casiotone',  pan:true,  panX:0, panY:0, panZ:0, buffer:undefined },
				{ name:'snare_noiz',      pan:false, panX:0, panY:0, panZ:0, buffer:undefined },
				{ name:'kick_woody',      pan:false, panX:0, panY:0, panZ:0, buffer:undefined }
			]
		}
	],
	sequence 	 = [],
	downIds 	 = [{down: false}, {down: false}, {down: false}, {down: false}, {down: false}, {down: false}, {down: false}, {down: false}, {down: false}],
	playing 	 = false,
	startTime    = 0,
	timeoutId    = 0,
	loadedCount  = 0,
	currentKit   = 0,
	lastDrawTime = -1,
	rhythmIndex  = 0,
	loopLength   = LOOP_LENGTH_MIN,
	bar          = 0,
	noteTime     = 0.0,
	tempo 		 = 110,
	mode         = 1;
	
// dom objects & object collections:
var pads,
	playPauseBtn,
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
	kitDisplay,
	stepModeBtn,
	padModeBtn,
	stepBox,
	padBox,
	labelsHolder,
	modal,
	labels     = [],
	labelNums  = [],
	stepBtns   = [],
	stepLights = [];
	
//*****************************************************************
// INIT
//*****************************************************************

$(document).ready(init);

function init(){
	// cache elements:
	stepsHolder   = $('.steps-holder');
	stepBox       = $('.step-box');
	padBox        = $('.pad-box');
	stepModeBtn   = $('#step-mode-btn');
	padModeBtn    = $('#pad-mode-btn');
	pads          = $('ul.pads li a');
	playPauseBtn  = $('#play-pause-btn');
	tempoDisplay  = $('#tempo-display');
	tempoUpBtn    = $('#tempo-up-btn');
	tempoDownBtn  = $('#tempo-down-btn');
	clearBtn      = $('#clear-btn');
	lengthDisplay = $('#length-display');
	lengthUpBtn   = $('#length-up-btn');
	lengthDownBtn = $('#length-down-btn');
	barDisplay    = $('#bar-display');
	barUpBtn      = $('#bar-up-btn');
	barDownBtn    = $('#bar-down-btn');
	kitUpBtn      = $('#kit-up-btn');
	kitDownBtn    = $('#kit-down-btn');
	kitDisplay    = $('#kit-display');
	labelsHolder  = $('.labels-holder');
	modal         = $('.modal');
	
	// check for audio context - current compatability:
	if (window.AudioContext || window.webkitAudioContext) {
		context = new (window.AudioContext || window.webkitAudioContext)();
		audioApiSetup();
	} else {
		alert('Sorry - this browser doesn\'t support the Web Audio API.');
	}
	
	// bind for key presses:
	window.onkeydown = keyDownHandler;
	window.onkeyup = keyUpHandler;
	
	// bind mouse events:
	pads.mousedown(padDownHit);
	pads.mouseup(padUpHit);
	
	// bind clicks:
	playPauseBtn.click(playPauseHandler);
	tempoUpBtn.click(tempoUpHandler);
	tempoDownBtn.click(tempoDownHandler);
	clearBtn.click(clearHandler);
	lengthUpBtn.click(lengthUpHandler);
	lengthDownBtn.click(lengthDownHandler);
	barUpBtn.click(barUpHandler);
	barDownBtn.click(barDownHandler);
	kitUpBtn.click(kitUpHandler);
	kitDownBtn.click(kitDownHandler);
	stepModeBtn.click(stepModeHandler);
	padModeBtn.click(padModeHandler);
	
	// set defaults:
	setMode();
	setTempoDisplay();
	setLengthDisplay();
	setBarDisplay();
	setKitDisplay();
	
	// TODO - show loading overlay
}

//*****************************************************************
// AUDIO API
//*****************************************************************
// create master channel, and start loading drum sounds:
function audioApiSetup(){
	// create the master audio channel:
	var finalMixNode;
	
	/*
	if (context.createDynamicsCompressor) {
		// create a dynamics compressor to sweeten the overall mix.
		compressor = context.createDynamicsCompressor();
		compressor.connect(context.destination);
		finalMixNode = compressor;
	} else {
		// no compressor available in this implementation.
		finalMixNode = context.destination;
	}
	*/
	
	finalMixNode = context.destination;

	// create master volume.
	masterGainNode = context.createGain();
	masterGainNode.gain.value = 0.9; // reduce overall volume to avoid clipping
	masterGainNode.connect(finalMixNode);	
	
	// load drum kits & construct the display:
	loadDrumKits();
	createSequence();
	createSteps();
	createLabels();
}

// Load Drum Sounds & create buffers:
function loadDrumKits(){
	for (var i = 0; i < drumKits.length; i++){
		var kitObj     = drumKits[i];
		// ConsoleLog.log('loadDrumKits:: kit: ' + kitObj.id, + ', ' + kitObj.folderName + ', ' + kitObj.name);
		for (var j = 0; j < kitObj.drumSounds.length; j++) {
			loadDrumSound(kitObj, j);
		}
	}
}

function loadDrumSound(kitObj, drumIndex){
	var sound   = kitObj.drumSounds[drumIndex],
		url     = 'audio/' + kitObj.folderName + '/' + sound.name + '.wav',
		request = new XMLHttpRequest();
		
	request.open("GET", url, true);
	request.responseType = "arraybuffer";

	// ConsoleLog.log('loadDrumKits:: loading drum sound: ' + sound.name, + ', ' + url);
	// asynchronous callback:
	request.onload = function() {
		context.decodeAudioData(request.response, function(decodedData) {
			sound.buffer = decodedData;
			ConsoleLog.log('loadDrumKits:: drum sound loaded: ' + sound.name + ', buffer: ' + sound.buffer + ', drumIndex: ' + drumIndex);
		});
		
		drumLoadComplete(kitObj, drumIndex);
	};
	
	request.send();	
}

function drumLoadComplete(kitObj, drumIndex){
	if(drumIndex == kitObj.drumSounds.length - 1){
		// the kit is completely loaded:
		kitObj.loaded = true;
		++loadedCount; 
		// ConsoleLog.log('drumLoadComplete:: kitObj: ' + kitObj.name + ', loadedCount: ' + loadedCount);
		kitLoadComplete(kitObj);
	}
}

function kitLoadComplete(kitObj){ 
	if(loadedCount == drumKits.length){
		// ConsoleLog.log('kitLoadComplete:: All kits loaded. Yay!');
		modal.empty();
		modal.hide();
	}
}

// play note real time (originated from a click or key press) or play note from sequence:
function playNote(buffer, note, noteTime, pan, x, y, z) {
	var volume    = (note > 1) ? VOL_MAX : VOL_MIN,
		voice     = context.createBufferSource(),
		gainNode  = context.createGain(),
		finalNode = null;

	voice.buffer        = buffer;
	gainNode.gain.value = volume;
	
	// optionally, connect to a panner:
    if (pan) {
        var panner = context.createPanner();
        panner.panningModel = 'HRTF';
        panner.setPosition(x, y, z);
        voice.connect(panner);
        finalNode = panner;
    } else {
        finalNode = voice;
    }
	
	finalNode.connect(gainNode);
	gainNode.connect(masterGainNode);
	
	voice.start(noteTime);
}

//*****************************************************************
// SET UP SEQUENCE
//*****************************************************************
// iterate over the sounds array and create a sequence for each channel:
function createSequence(){
	var drumSounds = drumKits[currentKit].drumSounds;
	
	for (var i = 0; i < drumSounds.length; i++) {
		// extract the value of channel sequence (if it exists), or add an empty array:
		var channelSeq = (sequence[i] != undefined) ? sequence[i] : [];
		
		for (var j = 0; j < loopLength; j++) {
			// step - values are 0 [off], 1 [on], 2 [on, accented]
			// extract the step value from the channel sequence (if it exists), or add an empty step:
			var step = (channelSeq[j] != undefined) ? channelSeq[j] : 0;
			channelSeq[j] = step;
		}
		
		sequence[i] = channelSeq;
	}
}

function createSteps(){
	// draw all steps, over again - this approach was chosen
	// becase it was easier/more intuitive than adding & removing steps one bar at a time:
	var drumSounds  = drumKits[currentKit].drumSounds,
		stepLightUl = $('<ul class="steps-light"></ul>');
		
	// clear element holders:
	stepsHolder.empty();
	
	// clear out old element references:
	stepLights = [];
	stepBtns   = [];
	
	// set the width of th step holder:	
	stepsHolder.css({ width : ((STEP_WIDTH + STEP_PAD * 2) * loopLength) + (STEP_SIDE_PAD * 2) });
	
	// add step lights:
	for (var k = 0; k < loopLength; k++) {
		var stepLightLi = $('<li data-id="' + k + '" class="">' + (k + 1) + '</li>');
		
		stepLights.push(stepLightLi);
		stepLightUl.append(stepLightLi);
	}
	stepsHolder.append(stepLightUl);
	
	// add steps ul, lis & channel labels:
	for (var i = drumSounds.length-1; i > -1; i--) {
		var even      = (i%2) ? '' : ' even',
			stepUl    = $('<ul class="steps' + even + '"></ul>'), // uls which hold the step btns
			stepGroup = [];						      			  // step btn groups
		
		// add step buttons:
		for (var j = 0; j < loopLength; j++) {
			var quarter = (j % 4) ? '' : 'q',
				value   = sequence[i][j],
				cls     = getClass(value),
				stepLi  = $('<li></li>'),
				stepBtn = $('<a href="javascript:void(0)" class="' + cls + '" data-channel="' + i + '" data-step="' + j + '" >step ' + j + '</a>');
			
			// store references and bind clicks:
			stepGroup.push(stepBtn);
			stepBtn.click(stepHandler);
			
			// append elements:
			stepLi.append(stepBtn);
			stepUl.append(stepLi);
		}
		
		// store references to step btn group:
		stepBtns.push(stepGroup);
		stepsHolder.append(stepUl);
	}
}

function createLabels(){
	var drumSounds = drumKits[currentKit].drumSounds;
	
	// clear out old element references:
	labels = [];
	
	// add labels:
	for (var i = drumSounds.length-1; i > -1; i--) {
		var even       = (i%2) ? '' : 'even',
			labelH3    = $('<h3 class="' + even + '"></h3>'), // h3 labels for the step btn groups
			labelNum   = $('<span class="id-num"></span>'),
			label      = $('<span></span>');
		
		// store references to labels:
		labels.push(label);
		labelNums.push(labelNum);
		
		labelH3.append(labelNum);
		labelH3.append(label);
		labelsHolder.prepend(labelH3);
	}
}

function updateLabels(){
	var drumSounds  = drumKits[currentKit].drumSounds;
	
	// set label names:
	for (var i = labels.length-1; i > -1; i--) {
		var idNum    = String(i + 1),
			label    = labels[i],
			labelNum = labelNums[i],
			pad      = $('ul.pads li a[data-id="' + i +'"]'),
			padId    = pad.data().id;
			
		labelNum.empty();
		labelNum.html(idNum);
			
		label.empty();
		label.html(drumSounds[i].name);
		
		pad.empty();
		pad.html(idNum + ' ' + drumSounds[i].name);
	}
}

//*****************************************************************
// SEQUENCER
//*****************************************************************
// advance the current note (rhythmIndex):
function advanceNote() {
	// advance time by a 16th note:
	var secondsPerBeat = 60.0 / tempo;
	// ConsoleLog.log('advanceNote ::  rhythmIndex: ' + rhythmIndex);	
	rhythmIndex++;
	if (rhythmIndex >= loopLength) {
		rhythmIndex = 0;
	}
	
	// set note time:
	noteTime += 0.25 * secondsPerBeat;
}

function schedule() {
	var currentTime = context.currentTime;

	// the sequence starts at startTime, so normalize currentTime so that it's 0 at the start of the sequence.
	currentTime -= startTime;

	while (noteTime < currentTime) {
		// convert noteTime to context time:
		var contextPlayTime = noteTime + startTime;
		
		for (var i = sequence.length-1; i > -1; i--) {
			var note   = sequence[i][rhythmIndex],
				sound  = drumKits[currentKit].drumSounds[i];
			
			if(note > 0) playNote(sound.buffer, note, contextPlayTime, sound.pan, sound.panX, sound.panY, sound.panZ);
		}
		
		// synchronize drawing time with sound:
		if (noteTime != lastDrawTime) {
			lastDrawTime = noteTime;
			drawPlayhead();
		}
		
		// advance note:
		advanceNote();
	}
	
	timeoutId = setTimeout("schedule()", 0);
}

function stepHandler(e) {
	e.preventDefault();
	
	var me      = $(this),
		channel = me.data().channel,
		stepNum = me.data().step,
		stepVal = sequence[channel][stepNum], // current value of the step
		stepNew = stepVal;  				  // the new value we're changing it too
	
	switch(stepVal){
		case 0:
			// add note on:
			stepNew = 1;
			swapClass(me, 'add', 'active');
			break;
		case 1:
			// add note on accented:
			stepNew = 2;
			swapClass(me, 'remove', 'active');
			swapClass(me, 'add', 'active2');
			break;
		case 2:
			// remove note:
			stepNew = 0;
			swapClass(me, 'remove', 'active2');
			break;
	}
	
	// sync raw sequence data:
	sequence[channel][stepNum] = stepNew;
	// ConsoleLog.log('stepHandler :: channel: ' + channel + ' stepNum: ' + stepNum + ' stepVal: ' + stepVal + ' stepNew: ' + stepNew);
}

function drawPlayhead() {
	var lastIndex = (rhythmIndex > 0) ? rhythmIndex - 1 : loopLength -1,
		currStep  = stepLights[rhythmIndex],
		lastStep  = stepLights[lastIndex];
	// ConsoleLog.log('drawPlayhead ::  currStep: ' + currStep.data().id);	
	swapClass(currStep, 'add', 'active');
	swapClass(lastStep, 'remove', 'active');
}

function playSequence() {
	rhythmIndex = 0;
	noteTime    = 0.0;
	startTime   = context.currentTime;
	playing     = true;
	schedule();
}

function stopSequence() {
	clearTimeout(timeoutId);
	playing  = false;
	
	// TODO - there is a bug here when adding/removing bars:
	// clear the last step light (that was active):
	var lastIndex = (rhythmIndex > 0) ? rhythmIndex - 1 : loopLength -1,
		lastStep  = stepLights[lastIndex];
	swapClass(lastStep, 'remove', 'active');
}

//*****************************************************************
// UI
//*****************************************************************
// *** PADS ***
// pad trigger from num pad:
function keyDownHandler(e){
  	e.preventDefault();
	var id      = -1,
		drumKit = drumKits[currentKit].drumSounds;
		
	switch(e.keyCode) {
		case 32: updatePlayState(); break; // space bar 
		case 103: id = 6; break;
		case 104: id = 7; break;
		case 105: id = 8; break;
		case 100: id = 3; break;
		case 101: id = 4; break;
		case 102: id = 5; break;
		case 97:  id = 0; break; 
		case 98:  id = 1; break;
		case 99:  id = 2; break;
		default: return;
	}
	// avoid retriggering for the down event & don't check for space bar:
	if(id != -1 && !downIds[id].down){
		// ConsoleLog.log('keyDownHandler :: pad id: ' + id + ' | e.keyCode: ' + e.keyCode);
		playNote(drumKit[id].buffer, 1, context.currentTime);
		downIds[id].down = true;
		padDown(id);
	}
}

function keyUpHandler(e){
  	e.preventDefault();
	var id = -1;
	switch(e.keyCode) {
		case 103: id = 6; break;
		case 104: id = 7; break;
		case 105: id = 8; break;
		case 100: id = 3; break;
		case 101: id = 4; break;
		case 102: id = 5; break;
		case 97:  id = 0; break; 
		case 98:  id = 1; break;
		case 99:  id = 2; break;
		default: return;
	}
	// release for the down event flag:
	if(downIds[id].down) downIds[id].down = false;
	padUp(id);
}

// mouse triggered pad down & up:
function padDownHit(e) {
	e.preventDefault();
	var me      = $(this),
		id      = me.attr('data-id'),
		drumKit = drumKits[currentKit].drumSounds;
		
	playNote(drumKit[id].buffer, 1, context.currentTime);	
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
	var pad = $('ul.pads li a[data-id="' + id + '"]');
	swapClass(pad, 'add', 'active');
}

function padUp(id){
	var pad = $('ul.pads li a[data-id="' + id + '"]');
	swapClass(pad, 'remove', 'active');
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
// *** SEQUENCER CONTROLS ***
// handle play & stop:
function playPauseHandler(e) {
	e.preventDefault();
	updatePlayState();
}

function updatePlayState(){
	if(!playing) {
		// handle sequencer:
		playSequence();
		// handle ui:
		swapClass(playPauseBtn, 'add', 'active');
	} else {
		// handle sequencer:
		stopSequence();
		// handle ui:
		swapClass(playPauseBtn, 'remove', 'active');
	}	
}

// clear current pattern:
function clearHandler(e){
	e.preventDefault();
	clearSequence();
}

function clearSequence(){
	for (var i = sequence.length-1; i > -1; i--) {
		var seq = sequence[i];
		
		for (var j = loopLength; j > -1; j--){
			var stepBtn = $(stepBtns[i][j]);
			
			// clear out the step object:
			seq[j] = 0;
			
			// clear steps btn ui state:
			swapClass(stepBtn, 'remove', 'active');
			swapClass(stepBtn, 'remove', 'active2');
		}
	}
}

// *** LENGTH CONTROLS ***
// handle length up & down:
function lengthUpHandler(e){
	e.preventDefault();
	setLengthUp();
}

function lengthDownHandler(e){
	e.preventDefault();
	setLengthDown();
}

// set length up & down:
function setLengthUp(){
	if (loopLength < LOOP_LENGTH_MAX){
		loopLength += 16;
		setLengthDisplay();
		
		if(playing){
			stopSequence();
			resetSequencer();
			playSequence();
		} else {
			resetSequencer();
		}
	}
}

function setLengthDown(){
	if (loopLength > LOOP_LENGTH_MIN){
		loopLength -= 16;
		setLengthDisplay();
		
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

function setLengthDisplay(){
	lengthDisplay.html(loopLength/16);	
}

// *** BAR CONTROLS ***
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

// sequencer utils:
function resetSequencer(){
	createSequence();
	createSteps();
}

function scrollStepsView() {
	var singlePaneWidth = ((STEP_WIDTH + STEP_PAD*2) * LOOP_LENGTH_MIN),
		newLeftPos      = 0 - (bar * singlePaneWidth); 
	stepsHolder.stop().animate({ left: newLeftPos }, ANIM_TIME);
}

//*****************************************************************
// *** KIT CONTROLS ***
// handle kit up & down:
function kitUpHandler(e){
	e.preventDefault();
	if (currentKit < drumKits.length-1){
		++currentKit;
		setKitDisplay();
	}
}

function kitDownHandler(e){
	e.preventDefault();
	if (currentKit > 0){
		--currentKit;
		setKitDisplay();
	}
}

function setKitDisplay(){
	kitDisplay.html(currentKit + 1);
	updateLabels();	
}

//*****************************************************************
// *** MODE CONTROLS ***
// handle mode:
function stepModeHandler(e){
	e.preventDefault();
	mode = 1;
	setMode();
}

function padModeHandler(e){
	e.preventDefault();
	mode = 0;
	setMode();
}

function setMode(){
	if(mode == 0){
		// show pads view:
		stepBox.hide();
		padBox.show();
		swapClass(stepModeBtn, 'remove', 'disabled');
		swapClass(padModeBtn, 'add', 'disabled');
	} else {
		// show steps view:
		padBox.hide();
		stepBox.show();
		swapClass(stepModeBtn, 'add', 'disabled');
		swapClass(padModeBtn, 'remove', 'disabled');
	}
}

//*****************************************************************
// *** UTIL ***
// toggle ui classes:
function swapClass(object, operation, className){
	switch (operation){
		case 'add':
			if(!object.hasClass(className)) object.addClass(className);
			break;
		case 'remove':
			if(object.hasClass(className)) object.removeClass(className);
			break;
	}
}

function getClass(value){
	var clsName;
	// active or inactive class names as set in css:
	switch(value){
		case 1:
			clsName = 'active';
			break;
		case 2:
			clsName = 'active2';
			break;
		default:
			clsName = '';
	}
	return clsName;
}

