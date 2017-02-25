import {Injectable} from "@angular/core";
import {Http} from "@angular/http";
import "rxjs/add/operator/toPromise";
import {Alarm} from "./alarm";
import {AlarmDetail} from "./alarmDetail";


@Injectable()
export class AlarmService {

    private listAlarmUrl = 'https://ju9y7c7h6l.execute-api.us-west-2.amazonaws.com/prod/alarm';

    constructor(private http: Http) {
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
        console.error('An error occurred', error);
        return Promise.reject(error.message || error);
    }
}

