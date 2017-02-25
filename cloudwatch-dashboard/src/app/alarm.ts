export class Alarm {
  alarmName: string;
  alarmARN: string;
  description: string;
  state: string;

  statuses: AlarmStatuses;
  statusesChangeCount: AlarmStatusesChangeCount;

  constructor() {
    this.statuses = new AlarmStatuses;
    this.statusesChangeCount = new AlarmStatusesChangeCount;
  }


  get classForState() {
    switch (this.state) {
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
}
export class AlarmStatuses {
  lastHour: string;
  lastDay: string;
  lastWeek: string;

}
export class AlarmStatusesChangeCount {
  lastHour: string;
  lastDay: string;
  lastWeek: string;

}
