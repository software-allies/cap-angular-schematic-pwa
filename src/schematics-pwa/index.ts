import { 
  branchAndMerge,
  chain,
  Rule,
  SchematicsException,
  Tree,
  noop,
  externalSchematic
 } from '@angular-devkit/schematics';
import { FileSystemSchematicContext } from '@angular-devkit/schematics/tools';
import { getWorkspace } from '@schematics/angular/utility/config';
import { getProjectFromWorkspace } from '@angular/cdk/schematics/utils/get-project';
import { 
  fileExist,
  hasUniversalBuild,
  addDependencyToPackageJson
} from './cap-utils';
import { Schema as PWAOptions } from './schema';
import { NodeDependencyType } from '@schematics/angular/utility/dependencies';





function applyWebPushOnFront(options: PWAOptions): Rule {
  return (tree: Tree) => {

    // On construction...

    // On AppComponent
    const addToAppComponentTs = 
    `
    import { SwUpdate } from "@angular/service-worker";
    import { PushService } from "./shared/services/push.service";
    import { SwPush } from "@angular/service-worker";

    [...]

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
    `;

    
    // On AppComponent html
    const addToAppComponentHtml = 
    `
            <button class="button button-primary" (click)="subscribeToNotifications()" [disabled]="sub">Subscribe</button>
            <button class="button button-danger" (click)="sendNewsletter()">Send</button>
    `;

    console.log(addToAppComponentTs);
    console.log(addToAppComponentHtml);
    console.log(tree);
    console.log(options);
  }
}

function applyWebPushOnServer(options: PWAOptions): Rule {
    return (tree: Tree) => {

      // Add to configuration and api routes on server.js
      const addToServer = 
      `
      const webpush = require('web-push');

      export let USER_SUBSCRIPTIONS = [];

      export function addPushSubscriber(req, res) {
          const sub = req.body;
          console.log('Received Subscription on the server: ', sub);
          USER_SUBSCRIPTIONS.push(sub);
          res.status(200)
              .json({ message: "Subscription added successfully." });
      }

      export function sendNewsletter(req, res) {

          console.log('Total subscriptions', USER_SUBSCRIPTIONS.length);

          // sample notification payload
          const notificationPayload = {
              "notification": {
                  "title": "Angular News",
                  "body": "Newsletter Available!",
                  "icon": "assets/icons/icon-96x96.png",
                  "vibrate": [100, 50, 100],
                  "data": {
                      "dateOfArrival": Date.now(),
                      "primaryKey": 1
                  },
                  "actions": [{
                      "action": "explore",
                      "title": "Go to the site"
                  }]
              }
          };

          Promise.all(USER_SUBSCRIPTIONS.map(sub => webpush.sendNotification(
              sub, JSON.stringify(notificationPayload) )))
              .then(() => res.status(200).json({message: 'Newsletter sent successfully.'}))
              .catch(err => {
                  console.error("Error sending notification, reason: ", err);
                  res.sendStatus(500);
              });
      }

      const vapidKeys = {
          "publicKey":"BLnVk1MBGFBW4UxL44fuoM2xxQ4o9CuxocVzKn9UVmnXZEyPCTEFjI4sALMB8qN5ee67yZ6MeQWjd5iyS8lINAg",
          "privateKey":"mp5xYHWtRTyCA63nZMvmJ_qmYO6A1klSotcoppSx-MI"
      };

      webpush.setVapidDetails(
          'mailto:example@yourdomain.org',
          vapidKeys.publicKey,
          vapidKeys.privateKey
      );


      [...]

      // REST API
      app.route('/api/notifications')
          .post(addPushSubscriber);

      app.route('/api/newsletter')
          .post(sendNewsletter);

      `;

      if (addToServer) {
        console.log('...');
      }


      // add web-push dependency to package.json
      addDependencyToPackageJson(tree, options, {
          type: NodeDependencyType.Default,
          name: 'web-push',
          version: '^3.2.5'
      });

    }
}

function applyAppShell(options: PWAOptions): Rule {
	return (tree: Tree) => {
		let hasPWABuild = false;
		const workspace = getWorkspace(tree);
		const architect = workspace.projects[options.clientProject].architect;
    // Check if exist a app-shell installation
		if (architect) {
			for (let builder in architect) {
				if (architect[builder].builder === '@angular-devkit/build-angular:app-shell') {
					hasPWABuild = true;
				}
			}
		}
		if (!hasPWABuild) {
      // Check if is Universal installed
      if (hasUniversalBuild(tree, options)) {
        const appShellOptions = {
          clientProject: options.clientProject,
          universalProject: options.clientProject + '-universal',
        };
        // TODO search how run a ng generate command...
        // 'ng', ['generate', '@schematics/angular:appShell', '--clientProject', this.answers.appname, '--universalProject', this.answers.appname + '-universal']
        return externalSchematic('@schematics/angular', 'appShell', appShellOptions);
      } else {
        console.log(`For App-Shell feature is necessary to be installed Angular Universal.`);
			  return noop();
      }
		} else {
      console.log(`A App Shell installation exist.`);
			return noop();
		}
	}
}

function applyPWA(options: PWAOptions): Rule {
	return (tree: Tree) => {
    const swPath = '/ngsw-config.json';
		let hasPWABuild = fileExist(tree, swPath);
		if (!hasPWABuild) {
      // If a ngsw-config file don't exist continue installation of pwa schematic
      const pwaOptions = {
        clientProject: options.clientProject 
      };
			return externalSchematic('@angular/pwa', 'ng-add', pwaOptions);
		} else {
      console.log(`A Service Worker Config file installation exist. Don't continue with the installation.`);
			return noop();
		}
	}
}

function applyPackageJsonScripts() {
	return (tree: Tree) => {
		const pkgPath = `/package.json`;
		const buffer = tree.read(pkgPath);
		if (buffer === null) {
			throw new SchematicsException('Could not find package.json');
		}
		const pkg = JSON.parse(buffer.toString());
    pkg.scripts['start-pwa'] = 'npm run build:app-shell && npm run serve:ssr';
    pkg.scripts['app-shell'] = 'ng run <%=project%>:app-shell ';
    pkg.scripts['build:app-shell'] = 'npm run build:client-and-server-bundles:app-shell && npm run webpack:server';
    pkg.scripts['build:client-and-server-bundles:app-shell'] = 'ng build --prod --build-optimizer && npm run fix-memory-limit && ng run <%=project%>:app-shell:production';
		tree.overwrite(pkgPath, JSON.stringify(pkg, null, 2));
		return tree;
	}
}

export function schematicsPWA(options: PWAOptions): Rule {
  return (host: Tree, context: FileSystemSchematicContext) => {
    const workspace = getWorkspace(host);
    const project = getProjectFromWorkspace(workspace, options.project);
    if (!project) {
      throw new SchematicsException(`Project is not defined in this workspace.`);
    }
    options.clientProject = options.project;
    return chain([
      branchAndMerge(chain([
        applyPWA(options),
        (options.appShell) ?  applyAppShell(options) : noop(),
        (options.appShell) ?  applyPackageJsonScripts() : noop(),
        (options.webPush) ?  applyWebPushOnServer(options) : noop(),
        (options.webPush) ?  applyWebPushOnFront(options) : noop(),
      ])),
    ])(host, context);
  };
}
