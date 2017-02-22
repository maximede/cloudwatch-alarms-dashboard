export class Alarm {
    alarmName: string;
    alarmARN: string;
    description: string;
    state: string;

    get classForState() {
        switch (this.state) {
            case 'ALARM':
                return "sucess";
            case 'OK':
                return "danger";
            case 'INSUFFICIENT_DATA':
                return "warning";
            default:
                return "active";
        }
    }
}
