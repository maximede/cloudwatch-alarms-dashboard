import {Alarm} from "./alarm";

export class AlarmDetail extends Alarm {
    statuses: AlarmStatuses;

    constructor() {
        super();
        this.statuses = new AlarmStatuses;
    }
}
export class AlarmStatuses {
    oneDayAgo: string;
    oneHourAgo: string;
    oneWeekAgo: string;

}