import { Component } from '@angular/core';
import { SwUpdate } from "@angular/service-worker";
import { PushService } from "./shared/services/push.service";
import { SwPush, PushSubscription } from "@angular/service-worker";


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {

    sub: PushSubscription;

    readonly VAPID_PUBLIC_KEY = "BLnVk1MBGFBW4UxL44fuoM2xxQ4o9CuxocVzKn9UVmnXZEyPCTEFjI4sALMB8qN5ee67yZ6MeQWjd5iyS8lINAg";

    constructor(
        private swUpdate: SwUpdate,
        private swPush: SwPush,
        private pushService: PushService) {
    }

    ngOnInit() {
        if (this.swUpdate.isEnabled) {
            this.swUpdate.available.subscribe(() => {
                if (confirm("New version available. Load New Version?")) {
                    window.location.reload();
                }
            });
        }
    }

    subscribeToNotifications() {
        this.swPush.requestSubscription({
            serverPublicKey: this.VAPID_PUBLIC_KEY
        })
        .then(sub => {
            this.sub = sub;
            console.log("Notification Subscription: ", sub);
            this.pushService.addPushSubscriber(sub)
                .subscribe(
                    () => console.log('Sent push subscription object to server.'),
                    err =>  console.log('Could not send subscription object to server, reason: ', err)
                );
        })
        .catch(err => console.error("Could not subscribe to notifications", err));
    }

    sendNewsletter() {
        console.log("Sending Newsletter to all Subscribers ...");
        this.pushService.send().subscribe();
    } 


}
