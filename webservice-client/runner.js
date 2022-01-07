/**
 *  Webservices referentie implementatie
 * @module
 * @author J.W.M. Meijer
 */

exports.run = run;

const linksCheck = require('./linksCheck.js');
const utils = require('./utils.js');

// Required modules: http
const axios = require('axios'); // http client
const { wrapper } = require('axios-cookiejar-support'); // cross domain cookie support
const { CookieJar } = require('tough-cookie'); // cross domain cookie support

// Required modules: file system
const fs = require('fs');
const path = require('path'); // OS independent path handling

// Required modules: urldecoding for form submittal
const qs = require('qs');

// Required modules: XML parser
const { XMLParser } = require('fast-xml-parser'); // , XMLBuilder, XMLValidator

// globals
const baseUrl = 'https://dev.nlfiscaal.nl/rest/v4/';
let settings = {};
let headers = { withCredentials: true }; // required to pass on cookies
const jar = new CookieJar(); // the cookie jar
const client = wrapper(axios.create({ jar })); // axios with cookies support
const xmlParser = new XMLParser(); // parser object

/**
 * SUPPORT FUNCTIONS
 */

/**
 * get
 */
function getSettings() {
	try {
		let result = fs.readFileSync(path.join('..', 'PreviousHighestDatetime.txt'));
		settings = JSON.parse(result);
	} catch (err) {
		settings.PreviousHighestDatetime = '1900-01-01T00:00:00Z';
	}
}

/**
 * set
 */
function setSettings() {
	try {
		fs.writeFileSync(path.join('..', 'PreviousHighestDatetime.txt'), JSON.stringify(settings));
	} catch (err) {
		console.log(err);
	}
}

/**
 * https://stackoverflow.com/questions/55374755/node-js-axios-download-file-stream-and-writefile
 * @async
 * @param {*} fileUrl url of the file to fetch
 * @param {*} outputLocationPath path of the file being fetched
 * @return {Promise<boolean>} true
 */
async function downloadFile(fileUrl, outputLocationPath) {
	if (!fileUrl) throw new Error ('lege url');
	const writer = fs.createWriteStream(outputLocationPath);

	return client({
		method: 'get',
		url: fileUrl,
		responseType: 'stream',
	}).then(response => {
		//ensure that the user can call `then()` only when the file has
		//been downloaded entirely.
		return new Promise((resolve, reject) => {
			response.data.pipe(writer);
			let error = null;
			writer.on('error', err => {
				error = err;
				writer.close();
				reject(err);
			});
			writer.on('close', () => {
				if (!error) {
					resolve(true);
				}
				//no need to call the reject here, as it will have been called in the 'error' stream;
			});
		});
	});
}

async function getToken() {
	//console.log(qs.stringify({ Username: 'webservices@pwc.com', Password: 'U2v!f$F@' }));
	return await axios.post(baseUrl + 'login', qs.stringify({ Username: 'webservices@pwc.com', Password: 'U2v!f$F@' }), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } })
		.then(response => {
			let parsedXml = xmlParser.parse(response.data);
			return (parsedXml.root.LtpaToken);
		});
}

/**
 * Get the manifest
 * @param {string} cutoff entries newer than this will be returned (should be given as te most recent entry ever fetched)
 * @param {string=} last entries older or equal than this will be returned
 * @returns {string} Manifest XML. ENtries will be sorted from newest to oldest
 */
async function MEAL(cutoff, last) {
	// console.log('cutoff:' + cutoff + ', last:' + last);
	const url = baseUrl + 'xml/manifest?start=' + cutoff + (last ? '&end=' + last : '');
	//console.log(url);
	return await client.get(url, headers)
		.then(response => {
			//console.log (response.data);
			let parsedXml = xmlParser.parse(response.data);
			return (parsedXml.root);
		});
}

async function processResult(manifest) {
	// console.log('Aantal nieuwe documenten:' + (manifest.r.arEl).length);
	for (let i = 0; i < (manifest.r.arEl).length; i++) {
		const entry = manifest.r.arEl[i];
		// console.dir (entry);
		await downloadFile(baseUrl + 'xml/' + entry.link, path.join ('.', 'xml-files', entry.link));
		await linksCheck.checkSources (path.join ('.', 'xml-files', entry.link), entry.link, client);
	}
}


async function run() {
	/*
		var cutoff	; hoogste (laatste) datum-tijd die we de vorige keer hebben opgehaald,
		; m.a.w., we halen alle documenten NA deze datum-tijd op.

		; haal cutoff uit non volatile storage
		if <we have a previousHighestDatetime> then
			set cutoff = previousHighestDatetime ; normale werking
		else
			set cutoff = 1900-01-01T00:00:00Z ; we willen echt alles hebben
		fi
	*/
	getSettings();
	let cutoff = settings.PreviousHighestDatetime;

	/* setup authentication */
	let token = await getToken();
	if (!token) throw new Error('Geen valide login');
	//console.log('result getToken:' + token);
	jar.setCookie('LtpaToken=' + token, baseUrl, (err) => { //, cookie
		if (err) console.dir(err);
		// console.dir(cookie);
	});

	/*
		; Haal documenten op vanaf nu terug tot de cutoff (niet-inclusief)
		set result = MEAL(cutoff)	; parameter is MEAL[cutoff], format (cutoff) is
		; yyyy-mm-ddThh:mm:ssZ
		<process result>
	*/
	let result = await MEAL(cutoff);
	if (!(result.r.arEl)) {
		utils.log('"Geen nieuwe documenten";"";""');
		return;
	}
	
	settings.PreviousHighestDatetimeTemp = result.r.arEl[0].modified; // in temp, as we want to only save if there was no crash
	processResult(result);

	/*
	; Als er nog meer resultaten zijn….
	while result.laatsteDatumTijd != “” and result.laatsteDatumTijd >= cutoff 
		; haal deze op (vanaf result.laatsteDatumTijd (inclusief) tot de cutoff
		; (niet inclusief)
		set result = MEAL(cutoff, result.laatsteDatumTijd)	; parameter is
		; MEAL(cutoff)#(laatste), format (cutoff) en (laatste) is yyyy-mm-ddThh:mm:ssZ
		<process result>
	elihw
	*/
	while (result.laatsteDatumTijd && result.laatsteDatumTijd != '' && result.laatsteDatumTijd >= cutoff) {
		result = await MEAL(cutoff, result.laatsteDatumTijd);
		if (result.r.arEl) {
			processResult(result);
		}
	}

	settings.PreviousHighestDatetime = settings.PreviousHighestDatetimeTemp;
	setSettings();
}
