/**
 *  Webservices referentie implementatie
 * @module
 * @author J.W.M. Meijer
 */

const mySchedulesHandler = require('./schedules.js');
const runner = require('./webservicecheck.js');

runner.run(); // run immediately
mySchedulesHandler.init(); // now schedule to run every 10 minutes at xx:x0:11
