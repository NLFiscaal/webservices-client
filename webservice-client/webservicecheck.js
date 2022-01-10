/**
 *  Webservices referentie implementatie
 * @module
 * @author J.W.M. Meijer
 */

exports.run = run;

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
let jobrunning = false;


/*
 * SUPPORT FUNCTIONS **********************************************************
 */

/**
 * get
 */
function getSettings() {
	try {
		const settingspath = path.join(__dirname, '..', 'settings.json');
		let result = fs.readFileSync(settingspath);
		settings = JSON.parse(result);
	} catch (err) {
		settings = {
			Username: 'webservices@nlfiscaal.nl',
			Password: 'webservicespassword',
			PreviousHighestDatetime: '1900-01-01T00:00:00Z'
		};
	}
}

/**
 * set
 */
function setSettings() {
	try {
		const settingspath = path.join(__dirname, '..', 'settings.json');
		fs.writeFileSync(settingspath, JSON.stringify(settings, null, '\t'));
	} catch (err) {
		console.log(err);
	}
}

/*
 * EXTRA FUNCTIONS POST MANIFEST **********************************************
 */

/**
 * Process entry
 * @async
 * @param {string} id identification of the file in the log
 * @param {object} client cookies wrapped axios
 */
async function processOneEntry(id) {
	// do what needs to be done
	utils.log('"success";"doc";"' + id + '";""');
	return true;
}

/*
 * REFERENCE IMPLEMENTATION ***************************************************
 */

/**
 * Retrieves the authentication token from the backend
 * @param {string} username
 * @param {string} password
 * @return {Promise<string} LtpaToken value
 */
async function getToken(username, password) {
	//console.log(qs.stringify({ Username: 'webservices@pwc.com', Password: 'U2v!f$F@' }));
	return await axios.post(baseUrl + 'login', qs.stringify({ Username: username, Password: password }), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } })
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
			// console.log (response.data);
			let parsedXml = xmlParser.parse(response.data);
			return (parsedXml.root);
		});
}

async function processResult(manifest) {
	// console.log('Aantal nieuwe documenten:' + (manifest.r.arEl).length);
	for (let i = 0; i < (manifest.r.arEl).length; i++) {
		const entry = manifest.r.arEl[i];
		// console.dir (entry);
		await processOneEntry(entry.link, client);
	}
}

async function run() {
	if (jobrunning) return;
	jobrunning = true;
	utils.log('"success";"start schedule";"";""');
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
	let token = await getToken(settings.Username, settings.Password);
	if (!token) {
		console.log('Webservice geen valide login, username:' + settings.Username + ', password:' + settings.Password);
		return;
	}
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
		utils.log('"no docs";"";"";""');
		jobrunning = false;
		return;
	}
	if (!Array.isArray(result.r.arEl)) result.r.arEl = new Array(result.r.arEl); // xml parsing to json does not recognise single-element array
	await processResult(result);

	/*
		; sla hoogste datum-tijd op in non volatile storage tbv de volgende opvraging
		if result then
			set previousHighestDate = result[0].modified
		fi
	*/
	settings.PreviousHighestDatetimeTemp = result.r.arEl[0].modified; // in temp, as we want to only save if there was no crash

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
			await processResult(result);
		}
	}

	settings.PreviousHighestDatetime = settings.PreviousHighestDatetimeTemp;
	setSettings();

	utils.log('"success";"stop schedule";"";""');
	jobrunning = false;

}
