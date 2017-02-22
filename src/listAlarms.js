'use strict';

const AWS = require('aws-sdk');
const cloudwatch = new AWS.CloudWatch();

function sendResponse(data, responseCode, callback) {
	const response = {
		statusCode: responseCode,
        headers: {
            "Access-Control-Allow-Origin" : "http://localhost:4200", // Required for CORS support to work
        },
		body: JSON.stringify(data)
	};

	callback(null, response);
}
function formatCloudwatchResponse(data) {
	let alarms = [];

	data.MetricAlarms.forEach(function(cloudWatchAlarm){
		let myAlarm ={};

		myAlarm.name = cloudWatchAlarm.AlarmName;
		myAlarm.alarmARN = cloudWatchAlarm.AlarmArn;
		myAlarm.description = cloudWatchAlarm.AlarmDescription;
		myAlarm.state = cloudWatchAlarm.StateValue;

		alarms.push(myAlarm);
	});

	return alarms;
}
module.exports.list = function (event, context, callback) {

	const params = {
		AlarmNamePrefix: 'prod',
		MaxRecords: 100
	};
	let cloudwatchPromise = cloudwatch.describeAlarms(params).promise();

	cloudwatchPromise.then(function (data) {
		let alarms = formatCloudwatchResponse(data);

		sendResponse(alarms, 200, callback)
	}).catch(function (err) {
		sendResponse(err, 500, callback)
	});


};