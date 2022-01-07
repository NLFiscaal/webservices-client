exports.log = log;

function log(s) {
	const d = new Date();
	console.log('"' + d.toUTCString() + '";' + s);
}