export namespace views {
    export const CONTAINER_TITLE = 'OpenShift';
    export const VIEW_TITLE = 'openshift application explorer';
    export const REFRESH = 'Refresh View';
    export const LOGIN = 'Log in to cluster';
}

export namespace validation {
    export const VALID = 'validtext';
    export const NAME_EXISTS = `This name is already used, please enter different name.`;

    export function invalidName(type: ItemType) {
        return `Not a valid ${type} name`;
    }
    export function invalidLength(type: ItemType) {
        return `${type} name should be between 2-63 characters`;
    }
}

export namespace notifications {
    export const ODO_NOT_FOUND = 'Cannot find OpenShift Do';
    export const OKD_NOT_FOUND = 'Cannot find OKD';
    export const SAVE_LOGIN = 'Do you want to save username and password?';
    export const LOGGED_IN = 'You are already logged in';
    export const CLONE_REPO = 'Do you want to clone git repository for created Component?';
    export const DOWNLOAD = 'Download and install';

    export function itemCreated(type: ItemType, name: string) {
        return `${type} '${name}' successfully created`;
    }
    export function itemDeleted(type: ItemType, name: string) {
        return `${type} '${name}' successfully deleted`;
    }
    export function deleteItem(type: ItemType, name: string) {
        return `Do you want to delete ${type} '${name}'?`;
    }
    export function itemsLinked(fromItem: string, fromType: ItemType, toItem: string) {
        return `${fromType} '${fromItem}' successfully linked with ${ItemType.component} '${toItem}'`;
    }
}

export namespace odoCommands {
    export function describeApplication(projectName: string, appName: string) {
        return `odo app describe ${appName} --project ${projectName}`;
    }
    export function listCatalogComponents() {
        return `odo catalog list components`;
    }
    export function listCatalogServices() {
        return `odo catalog list services`;
    }
    export function describeComponent(projectName: string, appName: string, componentName: string) {
        return `odo describe ${componentName} --app ${appName} --project ${projectName}`;
    }
    export function showLog(project: string, app: string, component: string) {
        return `odo log ${component} --app ${app} --project ${project}`;
    }
    export function showLogAndFollow(project: string, app: string, component: string) {
        return `odo log ${component} -f --app ${app} --project ${project}`;
    }
    export function watchComponent(project: string, app: string, component: string) {
        return `odo watch ${component} --app ${app} --project ${project}`;
    }
    export function pushComponent(project: string, app: string, component: string) {
        return `odo push ${component} --app ${app} --project ${project}`;
    }
    export function describeService(service: string) {
        return `odo catalog describe service ${service}`;
    }
    export function printOdoVersion() {
        return 'odo version';
    }
}

export const GIT_REPO = 'https://github.com/sclorg/nodejs-ex';

export enum ItemType {
    application = 'Application',
    cluster = 'Cluster',
    component = 'Component',
    project = 'Project',
    service = 'Service',
    storage = 'Storage',
    url = 'URL'
}