/**
 *  Webservices referentie implementatie
 * @module
 * @author J.W.M. Meijer
 */
exports.checkSources = checkSources;
 
const fs = require('fs');

const utils = require('./utils.js');

// async function sleep(ms) {
// 	return new Promise((resolve) => {
// 		setTimeout(resolve, ms);
// 	});
// }

/**
 * Checks for all external links in the XML
 * @async
 * @param {string} file path to XML file to check 
 * @param {string} id identification of the file in the log
 * @param {object} client cookies wrapped axios
 */
async function checkSources(file, id, client) {
	await fs.promises.readFile(file, 'utf-8')
		.then(function (data) {
			let urls = [];
			let body = data;
			let pos = body.indexOf('src=');
			while (pos >= 0) {
				const delimiter = body.substring(pos + 4, pos + 5);
				body = body.substring(pos + 5);
				let posend = body.indexOf(delimiter);
				let src = body.substring(0, posend);
				if (src == '') {
					// do nothing
				} else if (src.length > 200) {
					utils.log('"long";"' + id + '"');
				} else if (src.toLowerCase().indexOf('gettyimages') > -1 && src.indexOf('.nsf') == -1) {
					src = 'https://www.nlfiscaal.nl/imgstock/' + src.substring(src.toLowerCase().indexOf('gettyimages'));
					urls.push({ id: id, src: src, type: 'img getty' });
				} else if (src.toLowerCase().indexOf('thinkstock') > -1 && src.indexOf('.nsf') == -1) {
					src = 'https://www.nlfiscaal.nl/imgstock/' + src.substring(src.toLowerCase().indexOf('thinkstock'));
					urls.push({ id: id, src: src, type: 'img imgstock' });
				} else if (src.indexOf('.nsf') > -1) {
					utils.log('"nsf";"' + id + '";"' + src + '"');
				} else {
					// utils.log('"' + id + '";"' + src + '"');
					urls.push({ id: id, src: src, type: 'img src' });
				}
				pos = body.indexOf('src=');
			}

			body = data;
			pos = body.indexOf('abslink=');
			while (pos >= 0) {
				const delimiter = body.substring(pos + 8, pos + 9);
				body = body.substring(pos + 9);
				let posend = body.indexOf(delimiter);
				let src = body.substring(0, posend);
				if (src == '') {
					// do nothing
				} else if (src.length > 200) {
					utils.log('"long";"' + id + '"');
				} else if (src.indexOf('.nsf') > -1) {
					utils.log('"nsf";"' + id + '";"' + src + '"');
				} else {
					// utils.log('"' + id + '";"' + src + '"');
					urls.push({ id: id, src: src, type: 'abslink body' });
				}
				pos = body.indexOf('abslink=');
			}

			body = data;
			pos = body.indexOf('<fotolink>');
			if (pos >= 0) {
				const delimiter = '</fotolink>';
				body = body.substring(pos + 10);
				let posend = body.indexOf(delimiter);
				let src = body.substring(0, posend);
				if (src == '') {
					// do nothing
				} else if (src.length > 200) {
					utils.log('"long";' + id + '"');
				} else if (src.toLowerCase().indexOf('gettyimages') > -1 && src.indexOf('.nsf') == -1) {
					src = 'https://www.nlfiscaal.nl/imgstock/' + src.substring(src.toLowerCase().indexOf('gettyimages'));
					urls.push({ id: id, src: src, type: 'fotolink getty' });
				} else if (src.toLowerCase().indexOf('thinkstock') > -1 && src.indexOf('.nsf') == -1) {
					src = 'https://www.nlfiscaal.nl/imgstock/' + src.substring(src.toLowerCase().indexOf('thinkstock'));
					urls.push({ id: id, src: src, type: 'fotolink imgstock' });
				} else if (src.indexOf('.nsf') > -1) {
					utils.log('"nsf";"' + id + '";"' + src + '"');
				} else {
					// utils.log('"' + id + '";"' + src + '"');
					urls.push({ id: id, src: src, type: 'fotolink' });
				}
				pos = body.indexOf('<fotolink>');
			}

			body = data;
			pos = body.indexOf('<abslink>');
			if (pos >= 0) {
				const delimiter = '</abslink>';
				body = body.substring(pos + 9);
				let posend = body.indexOf(delimiter);
				let src = body.substring(0, posend);
				if (src == '') {
					// do nothing
				} else if (src.length > 200) {
					utils.log('"long";' + id + '"');
				} else if (src.indexOf('.nsf') > -1) {
					utils.log('"nsf";"' + id + '";"' + src + '"');
				} else {
					// utils.log('"' + id + '";"' + src + '"');
					urls.push({ id: id, src: src, type: 'abslink' });
				}
				pos = body.indexOf('<fotolink>');
			}

			body = data;
			pos = body.indexOf('<pdflink>');
			if (pos >= 0) {
				const delimiter = '</pdflink>';
				body = body.substring(pos + 9);
				let posend = body.indexOf(delimiter);
				let src = body.substring(0, posend);
				if (src == '' || src.substring (0, 1) == '-') {
					// do nothing
				} else if (src.length > 200) {
					utils.log('"long";' + id + '"');
				} else if (src.indexOf('.nsf') > -1) {
					utils.log('"nsf";"' + id + '";"' + src + '"');
				} else {
					// utils.log('"' + id + '";"' + src + '"');
					urls.push({ id: id, src: src, type: 'pdflink' });
				}
				pos = body.indexOf('<pdflink>');
			}

			return urls;
		})
		.then(function (urls) {
			if (urls.length > 0) {
				return checkurls(urls, client);
			}
		})
		.catch(function () {
			return false;
		});
}

/**
 * Checks all urls in the arracy if they are reachable
 * @async
 * @param {array} urls 
 * @param {object} client cookies wrapped axios
 * @returns 
 */
async function checkurls(urls, client) {
	// console.log('checkurls...');
	for (let i = 0; i < urls.length; i++) {
		const entry = urls[i];
		const url = entry.src;
		// console.log('checkurl:' + url);
		await client.get(url)
			.then(function (response) {
				if (entry.type.substring(0, 7) == 'abslink' || response.data.substring(0, 1) != '<') {
					utils.log('"succes ' + entry.type + '";"' + entry.id + '";"' + url + '"');
				} else {
					utils.log('"fail to html ' + entry.type + '";"' + entry.id + '";"' + url + '"');
				}
			})
			.catch(function () {
				//console.dir({ error: err }, { depth: 2 });
				utils.log('"fail axios ' + entry.type + '";"' + entry.id + '";"' + url + '"');
			});
	}
	// console.log('checkurls done');
	return true;
}