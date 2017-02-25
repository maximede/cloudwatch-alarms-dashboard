'use strict';

const Promise = require("bluebird");
const AWS = require('aws-sdk');
const cloudwatch = new AWS.CloudWatch();

const MAX_RETRY = 2;

const includeFilters = process.env['includeFilters'].split(',');
const excludeFilters = process.env['excludeFilters'].split(',');
const alarmPrefix = process.env['alarmPrefix'];

const returnLastHourStatus = typeof process.env['returnLastHourStatus'] !== 'undefined'
    ? JSON.parse(process.env['returnLastHourStatus']) : true;
const returnLastDayStatus = typeof process.env['returnLastDayStatus'] !== 'undefined'
    ? JSON.parse(process.env['returnLastDayStatus']) : true;
const returnLastWeekStatus = typeof process.env['returnLastWeekStatus'] !== 'undefined'
    ? JSON.parse(process.env['returnLastWeekStatus']) : true;

function sendResponse(data, responseCode, callback) {
    const response = {
        statusCode: 452,
        headers: {
            "Access-Control-Allow-Origin": "http://uwit-concert-public-web.s3-website-us-west-2.amazonaws.com/", // Required for CORS support to
            "X-PIXEL" : "pixel"
        },
        body: JSON.stringify(data)
    };

    callback(null, response);
}

function setPeriodStatesChangeOnAlarm(cloudwatchAlarm, periodName, numberOfChanges) {
    cloudwatchAlarm.statusesChangeCount[periodName] = numberOfChanges;
}

function setPeriodStatusOnAlarm(cloudwatchAlarm, periodName, periodValue) {
    cloudwatchAlarm.statuses[periodName] = periodValue;
}
function setAlarmStatusForPeriod(cloudwatchAlarm, periodName, startDate, endDate, retried) {

    retried = typeof retried !== 'undefined' ? retried : 0;

    const alarmName = cloudwatchAlarm.name;

    const params = {
        AlarmName: alarmName,
        EndDate: endDate.getTime() / 1000,
        HistoryItemType: 'StateUpdate',
        MaxRecords: 100,
        StartDate: startDate.getTime() / 1000
    };
    let promise = cloudwatch.describeAlarmHistory(params).promise();
    return promise.then(cloudWatchData => {

        setPeriodStatesChangeOnAlarm(cloudwatchAlarm, periodName,
                                     cloudWatchData.AlarmHistoryItems.length);


        if (!cloudWatchData.AlarmHistoryItems || cloudWatchData.AlarmHistoryItems.length == 0) {
            setPeriodStatusOnAlarm(cloudwatchAlarm, periodName, cloudwatchAlarm.state);
        } else {
            cloudWatchData.AlarmHistoryItems.forEach(function (cloudWatchHistory) {
                if (cloudWatchHistory.HistorySummary.endsWith('to OK')) {
                    cloudwatchAlarm.statuses[periodName] = cloudwatchAlarm.state
                } else {
                    setPeriodStatusOnAlarm(cloudwatchAlarm, periodName, 'ALARM');
                }
            });
        }

    }).catch(error => {
        console.log(JSON.stringify(error));
        if (error.retryable) {
            //probably a rate limit issue => retry ?

            if (retried > MAX_RETRY) {
                console.warn(
                    alarmName + "-" + periodName + "throttled after " + MAX_RETRY + " retries");
                console.log("setting " + alarmName + "-" + periodName + "to throttle");

                setPeriodStatusOnAlarm(cloudwatchAlarm, periodName, 'THROTTLED');
            } else {
                console.log("retrying " + alarmName + "-" + periodName);

                return Promise.delay(200 * retried).then(function () {
                    return setAlarmStatusForPeriod(cloudwatchAlarm, periodName, startDate, endDate,
                                                   retried + 1);
                });
            }

        }
    });
}

function setAlarmStatuses(cloudWatchAlarm) {

    let cloudwatchPromises = [];

    const now = new Date();

    if (returnLastHourStatus) {
        let oneHourAgo = new Date();
        oneHourAgo.setHours(oneHourAgo.getHours() - 1);
        cloudwatchPromises.push(
            setAlarmStatusForPeriod(cloudWatchAlarm, 'lastHour', oneHourAgo, now));
    }
    if (returnLastDayStatus) {
        let oneDayAgo = new Date();
        oneDayAgo.setHours(oneDayAgo.getHours() - 24);
        cloudwatchPromises.push(
            setAlarmStatusForPeriod(cloudWatchAlarm, 'lastDay', oneDayAgo, now));
    }
    if (returnLastWeekStatus) {
        let oneWeekAgo = new Date();
        oneWeekAgo.setHours(oneWeekAgo.getHours() - (24 * 7));
        cloudwatchPromises.push(
            setAlarmStatusForPeriod(cloudWatchAlarm, 'lastWeek', oneWeekAgo, now));
    }

    return Promise.all(cloudwatchPromises);

}
function formatCloudwatchResponse(data, includeFilters, excludeFilters) {
    let alarms = [];
    let alarmHistoryPromises = [];

    data.MetricAlarms.forEach(function (cloudWatchAlarm) {
        let myAlarm = {};

        if (excludeFilters && excludeFilters.length > 0) {
            let shouldFilter = false;
            excludeFilters.forEach(excludeFilter => {
                if (cloudWatchAlarm.AlarmName.indexOf(excludeFilter) > -1) {
                    shouldFilter = true;
                }
            });
            if (shouldFilter) {
                return;
            }
        }

        if (includeFilters && includeFilters.length > 0) {
            let shouldFilterOut = false;
            includeFilters.forEach(includeFilter => {
                if (!(cloudWatchAlarm.AlarmName.indexOf(includeFilter) > -1)) {
                    shouldFilterOut = true;
                }
            });

            if (shouldFilterOut) {
                return;
            }
        }

        myAlarm.name = cloudWatchAlarm.AlarmName;
        myAlarm.alarmARN = cloudWatchAlarm.AlarmArn;
        myAlarm.description = cloudWatchAlarm.AlarmDescription;
        myAlarm.state = cloudWatchAlarm.StateValue;

        if(returnLastHourStatus || returnLastDayStatus ||returnLastWeekStatus) {
            myAlarm.statuses = {};
            myAlarm.statusesChangeCount = {};
            alarmHistoryPromises.push(setAlarmStatuses(myAlarm));
        }

        alarms.push(myAlarm);
    });

    return Promise.all(alarmHistoryPromises).then(response => {
        return new Promise(function (resolve) {
            console.log("resolved all history promises");
            resolve(alarms);
        });
    }).catch(err => {
        console.error("error in formatCloudwatchResponse", err);
    });
}
module.exports.list = function (event, context, callback) {

    const params = {
        MaxRecords: 100
    };
    if (alarmPrefix && alarmPrefix.length > 0) {
        params.AlarmNamePrefix = alarmPrefix;
    }

    let cloudwatchPromise = cloudwatch.describeAlarms(params).promise();

    cloudwatchPromise.then(function (data) {
        formatCloudwatchResponse(data, includeFilters, excludeFilters).then(alarms => {
            sendResponse(alarms, 200, callback)
        });

    }).catch(function (err) {
        console.error("could list alarms", err);
        sendResponse(err, 500, callback)
    });

};