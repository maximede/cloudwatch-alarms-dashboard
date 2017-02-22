import {Injectable} from "@angular/core";
import {Http} from "@angular/http";
import "rxjs/add/operator/toPromise";
import {Alarm} from "./alarm";
import {AlarmDetail} from "./alarmDetail";


@Injectable()
export class AlarmService {

    private listAlarmUrl = 'https://iwmbzxpcdk.execute-api.us-west-1.amazonaws.com/prod/alarm';
    private alarmDetailUrl = 'https://iwmbzxpcdk.execute-api.us-west-1.amazonaws.com/prod/alarm/';

    constructor(private http: Http) {
    }

    getAlarm(alarmName: string): Promise<AlarmDetail> {
        return this.http.get(this.alarmDetailUrl + alarmName)
            .toPromise()
            .then(response => {
                console.log("received " + response.json());
                return response.json() as AlarmDetail;
            })
            .catch(this.handleError);
    }

    listAlarms(): Promise<Alarm[]> {
        return this.http.get(this.listAlarmUrl)
            .toPromise()
            .then(response => {
                let alarms = response.json() as Alarm[];

                alarms.sort((a, b) => {
                    if (a.alarmName > b.alarmName) {
                        return 1;
                    }

                    if (a.alarmName < b.alarmName) {
                        return -1;
                    }

                    return 0;
                });
                return alarms;
            })
            .catch(this.handleError);
    }

    private handleError(error: any): Promise<any> {
        console.error('An error occurred', error); // for demo purposes only
        return Promise.reject(error.message || error);
    }
}

