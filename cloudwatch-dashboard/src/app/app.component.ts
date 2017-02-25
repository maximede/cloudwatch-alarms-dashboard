import {Component} from "@angular/core";
import {Alarm} from "./alarm";
import {AlarmService} from "./alarm.service";
import {AlarmDetail} from "./alarmDetail";

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css']
})


export class AppComponent {
    alarms: Alarm[];

    constructor(private alarmService: AlarmService) {
      setInterval(() => { this.getAlarms(); }, 1000 * 60 * 5);
    }


    getAlarms(): void {
        this.alarmService.listAlarms().then(alarms => this.alarms = alarms);

        console.log(this.alarms);
    }

    classForState(state :string) {
        switch (state) {
            case 'ALARM':
                return "danger";
            case 'OK':
                return "success";
            case 'INSUFFICIENT_DATA':
                return "warning";
            default:
                return "active";
        }
    }

    ngOnInit(): void {
        this.getAlarms();
        //this.getAlarmDetail("prod-pixel-cpu-credit-low");
    }

}
