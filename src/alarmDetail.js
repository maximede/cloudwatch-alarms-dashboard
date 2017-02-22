'use strict';

const AWS = require('aws-sdk');
const cloudwatch = new AWS.CloudWatch();

function sendResponse(data, responseCode, callback) {
    console.log("received error " + data);
    const response = {
        statusCode: responseCode,
        headers: {
            "Access-Control-Allow-Origin": "http://localhost:4200", // Required for CORS support to work
        },
        body: JSON.stringify(data)
    };

    callback(null, response);
}

function getAlarmStatusForPeriod(alarmName, periodName, startDate, endDate) {
    const params = {
        AlarmName: alarmName,
        EndDate: endDate.getTime() / 1000,
        HistoryItemType: 'StateUpdate',
        MaxRecords: 100,
        StartDate: startDate.getTime() / 1000
    };
    console.log("define params for alarm history request");
    let promise = cloudwatch.describeAlarmHistory(params).promise();
    console.log("created promise for alarm history request ");
    return promise.then(cloudWatchData => {
        return new Promise(function (resolve) {
            console.log(alarmName + "-" + periodName + " cloudWatchData.AlarmHistoryItems : " + cloudWatchData.AlarmHistoryItems);
            if(!cloudWatchData.AlarmHistoryItems || cloudWatchData.AlarmHistoryItems.length ==0) {
                resolve({
                    [periodName]: 'SAME-AS-CURRENT'
                });
            }
            cloudWatchData.AlarmHistoryItems.forEach(function (cloudWatchHistory) {
                console.log("Summary for " + alarmName + "-" + periodName + " was : " + cloudWatchHistory.HistorySummary);

                if (cloudWatchHistory.HistorySummary.endsWith('to OK')) {
                    resolve({
                        [periodName]: 'OK'
                    });

                } else {
                    resolve({
                        [periodName]: 'ALARM'
                    });
                }
            });
        });
    });
}
module.exports.get = function (event, context, callback) {

    const now = new Date();
    let oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);
    let oneDayAgo = new Date();
    oneDayAgo.setHours(oneDayAgo.getHours() - 24);
    let oneWeekAgo = new Date();
    oneWeekAgo.setHours(oneWeekAgo.getHours() - (24 * 7));

    const alarmName = event.path.name;
    let cloudwatchPromises = [];

    console.log("handling : " + alarmName);

    cloudwatchPromises.push(getAlarmStatusForPeriod(alarmName, 'oneHourAgo', oneHourAgo, now));
    console.log("added first promise ");
    cloudwatchPromises.push(getAlarmStatusForPeriod(alarmName, 'oneDayAgo', oneDayAgo, now));
    cloudwatchPromises.push(getAlarmStatusForPeriod(alarmName, 'oneWeekAgo', oneWeekAgo, now));


    Promise.all(cloudwatchPromises).then(responses => {
        let alarmResponse = {
            "alarmName" : alarmName,

            "statuses" :{}
        };
        console.log("all promises processed, handling response");

        responses.forEach(historyStatus => {
            console.log(historyStatus);
            //alarmResponse.push(historyStatus);
            for (let key in historyStatus) {
                if (historyStatus.hasOwnProperty(key))
                    alarmResponse.statuses[key] = historyStatus[key];
            }
        });
        sendResponse(alarmResponse, 200, callback)
    }).catch(function (err) {
        sendResponse(err, 500, callback)
    });

};