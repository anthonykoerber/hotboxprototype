// CONSOLE LOG - Log wrapper
/******************************************************/
var ConsoleLog = {
	
	log : function (something) {
		if (typeof console === "undefined") {
			return;
		} else {
            console.log(something);
            console.log('-- -- -- -- -- -- -- --');
		}
	}
	
};
/******************************************************/