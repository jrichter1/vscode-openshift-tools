import { ViewItem, ActivityBar, InputBox, Workbench } from "vscode-extension-tester";
import { createProject, createApplication, createComponentFromGit, deleteProject, quickPick, setInputTextAndConfirm, findNotification, selectApplication, verifyNodeDeletion, checkTerminalText, setInputTextAndCheck } from "../common/util";
import { expect } from 'chai';
import { nodeHasNewChildren, notificationExists } from "../common/conditions";
import { validation, GIT_REPO, views, ItemType, odoCommands, notifications } from "../common/constants";

export function serviceTest(clusterUrl: string) {
    describe('OpenShift Service', () => {
        let clusterNode: ViewItem;
        let application: ViewItem;
        let component: ViewItem;

        const projectName = 'service-test-project';
        const appName = 'service-test-app';
        const componentName = 'service-test-component';
        const serviceType = 'mongodb-persistent';
        const serviceName = 'service';
        const serviceName1 = 'service1';

        before(async function() {
            this.timeout(50000);
            const view = await new ActivityBar().getViewControl(views.CONTAINER_TITLE).openView();
            const explorer = await view.getContent().getSection(views.VIEW_TITLE);
            clusterNode = await explorer.findItem(clusterUrl);
            await createProject(projectName, clusterNode, 15000);
            application = await createApplication(appName, projectName, clusterNode, 10000);
            component = await createComponentFromGit(componentName, GIT_REPO, appName, projectName, clusterNode, 25000);
        });

        after(async function() {
            this.timeout(30000);
            await deleteProject(projectName, clusterNode);
        });

        it('New Service can be created from context menu', async function() {
            this.timeout(200000);
            const items = await application.getChildren();
            const menu = await application.openContextMenu();
            await menu.select('New Service');

            await createService(serviceType, serviceName);
            await verifyService(serviceName, application, items);
        });

        it('Duplicate service name is not allowed', async function() {
            this.timeout(30000);
            const menu = await application.openContextMenu();
            await menu.select('New Service');

            const input = await new InputBox().wait(3000);
            await quickPick(serviceType, true);
            await setInputTextAndCheck(input, serviceName, validation.NAME_EXISTS);
            await input.cancel();
        });

        it('Service name is being validated', async function() {
            this.timeout(60000);
            const menu = await application.openContextMenu();
            await menu.select('New Service');

            const input = await new InputBox().wait(3000);
            await quickPick(serviceType, true);

            await setInputTextAndCheck(input, '1serv', validation.invalidName(ItemType.service));
            await setInputTextAndCheck(input, 'a@p#p%', validation.invalidName(ItemType.service));
            await setInputTextAndCheck(input, 'Service', validation.invalidName(ItemType.service));
            await setInputTextAndCheck(input, 's', validation.invalidLength(ItemType.service));
            await setInputTextAndCheck(input, 'this-service-is-definitely-going-to-be-longer-than-63-characters-really', validation.invalidLength(ItemType.service));
            await input.cancel();
        });

        it('Service can be linked to a component from context menu', async function() {
            this.timeout(120000);
            const menu = await component.openContextMenu();
            await menu.select('Link Service');

            const input = await new InputBox().wait(3000);
            expect(await input.getPlaceHolder()).has.string('Select the service to link');
            await quickPick(serviceName);

            await component.getDriver().wait(() => {
                return notificationExists(`Service '${serviceName}' successfully linked with Component '${componentName}'`); },
            60000);
        });

        it('Describe works from context menu', async function() {
            this.timeout(30000);
            const service = await application.findChildItem(serviceName);
            const menu = await service.openContextMenu();
            await menu.select('Describe');
            await checkTerminalText(odoCommands.describeService(serviceType));
        });

        it('Describe works from command palette', async function() {
            this.timeout(30000);
            await new Workbench().executeCommand('openshift describe service');
            await selectApplication(projectName, appName);
            await quickPick(serviceName);

            await checkTerminalText(odoCommands.describeService(serviceType));
        });

        it('Service can be deleted from context menu', async function() {
            this.timeout(90000);
            const service = await application.findChildItem(serviceName);
            const menu = await service.openContextMenu();
            await menu.select('Delete');

            await verifyNodeDeletion(serviceName, application, ItemType.service, 80000);
        });

        it('New Service can be created from command palette', async function() {
            this.timeout(200000);
            const items = await application.getChildren();
            await new Workbench().executeCommand('openshift new service');

            await selectApplication(projectName, appName);
            await createService(serviceType, serviceName1);

            await verifyService(serviceName1, application, items);
        });

        it('Service can be linked to a component from command palette', async function() {
            this.timeout(120000);
            await new Workbench().executeCommand('openshift link service');
            await selectApplication(projectName, appName);
            await quickPick(componentName);
            await quickPick(serviceName1);

            await component.getDriver().wait(() => {
                return notificationExists(`Service '${serviceName1}' successfully linked with Component '${componentName}'`); },
            60000);
        });

        it('Service can be deleted from command palette', async function() {
            this.timeout(90000);
            await new Workbench().executeCommand('openshift delete service');
            await selectApplication(projectName, appName);
            await quickPick(serviceName1);

            await verifyNodeDeletion(serviceName1, application, ItemType.service, 80000);
        });
    });
}

async function createService(type: string, name: string) {
    const input = await new InputBox().wait(3000);
    expect(await input.getPlaceHolder()).equals('Service Template Name');
    await quickPick(type, true);
    expect(await input.getMessage()).has.string('Provide Service name');
    await setInputTextAndConfirm(name);
}

async function verifyService(name: string, application: ViewItem, initItems: ViewItem[]) {
    const driver = application.getDriver();
    const items = (await driver.wait(() => { return nodeHasNewChildren(application, initItems); }, 180000)).map((item) => {
        return item.getLabel();
    });
    expect(items).contains(name);
    const notification = await findNotification(notifications.itemCreated(ItemType.service, name));
    expect(notification).not.undefined;
}