const schedule = require('node-schedule');
const runner = require('./runner.js');

exports.init = init;

function init() {
	// runs once per d10 min
	schedule.scheduleJob ('11 10 * * * *', function () {
		runner.run();
	});
}