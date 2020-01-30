export interface Schema {
    project: string;
    clientProject: string;
    appShell: string;
    webPush: string;
    name?: string;
    path?: string;
    module?: any;
    hasUniversalBuild?: boolean;
    server_domain?: string;
    server_port?: string;
}