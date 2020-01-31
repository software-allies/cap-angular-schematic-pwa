

import { Injectable } from "@angular/core";
import { HttpClient, HttpHeaders, HttpResponse } from '@angular/common/http';


@Injectable({
    "providedIn": "root"
})
export class PushService {
    private actionUrl: string;
    private httpOptions: any;

    constructor(private http: HttpClient) {
        this.httpOptions = {
            headers: new HttpHeaders({ 
                'Content-Type': 'application/json'
            }),
            observe: "response"
        };

        this.actionUrl = `http://localhost:4000`;
    }

    addPushSubscriber(sub:any) {
        return this.http.post(`${this.actionUrl}/api/notifications`, sub);
    }

    send() {
        return this.http.post(`${this.actionUrl}/api/newsletter`, null);
    }

}


