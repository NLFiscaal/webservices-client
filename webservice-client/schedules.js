const schedule = require('node-schedule');
const runner = require('./webservicecheck.js');

exports.init = init;

function init() {
	// runs once per d10 min
	schedule.scheduleJob ('11 */10 * * * *', function () {
		runner.run();
	});
	// console.dir (schedule.scheduledJobs);
}