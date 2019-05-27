import { ViewItem, WebDriver, VSBrowser, ActivityBar, InputBox, Workbench } from "vscode-extension-tester";
import { createProject, createApplication, createComponentFromGit, deleteProject, quickPick, setInputTextAndConfirm, findNotification, selectApplication, verifyNodeDeletion, checkTerminalText } from "../common/util";
import { expect } from 'chai';
import { nodeHasNewChildren } from "../common/conditions";

export function serviceTest(clusterUrl: string) {
    describe('OpenShift Service', () => {
        let clusterNode: ViewItem;
        let driver: WebDriver;
        let application: ViewItem;
        let component: ViewItem;

        const projectName = 'service-test-project';
        const appName = 'service-test-app';
        const gitRepo = 'https://github.com/sclorg/nodejs-ex';
        const componentName = 'service-test-component';
        const serviceType = 'mongodb-persistent';
        const serviceName = 'service';
        const serviceName1 = 'service1';

        before(async function() {
            this.timeout(50000);
            driver = VSBrowser.instance.driver;
            const view = await new ActivityBar().getViewControl('OpenShift').openView();
            const explorer = await view.getContent().getSection('openshift application explorer');
            clusterNode = await explorer.findItem(clusterUrl);
            await createProject(projectName, clusterNode, driver, 15000);
            application = await createApplication(appName, projectName, clusterNode, driver, 10000);
            component = await createComponentFromGit(componentName, gitRepo, appName, projectName, clusterNode, 25000);
        });

        after(async function() {
            this.timeout(30000);
            await deleteProject(projectName, clusterNode, driver);
        });

        it('New Service can be created from context menu', async function() {
            this.timeout(200000);
            const items = await application.getChildren();
            const menu = await application.openContextMenu();
            await menu.select('New Service');

            await createService(serviceType, serviceName);
            await verifyService(serviceName, application, items);
        });

        it('Describe works from context menu', async function() {
            this.timeout(30000);
            const service = await application.findChildItem(serviceName);
            const menu = await service.openContextMenu();
            await menu.select('Describe');
            await checkTerminalText(`odo catalog describe service ${serviceType}`, driver);
        });

        it('Describe works from command palette', async function() {
            this.timeout(30000);
            await new Workbench().executeCommand('openshift describe service');
            await selectApplication(projectName, appName);
            await quickPick(serviceName);

            await checkTerminalText(`odo catalog describe service ${serviceType}`, driver);
        });

        it('Service can be deleted from context menu', async function() {
            this.timeout(90000);
            const service = await application.findChildItem(serviceName);
            const menu = await service.openContextMenu();
            await menu.select('Delete');

            await verifyNodeDeletion(serviceName, application, 'Service', driver, 80000);
        });

        it('New Service can be created from command palette', async function() {
            this.timeout(200000);
            const items = await application.getChildren();
            await new Workbench().executeCommand('openshift new service');

            await selectApplication(projectName, appName);
            await createService(serviceType, serviceName1);

            await verifyService(serviceName1, application, items);
        });

        it('Service can be deleted from commande palette', async function() {
            this.timeout(90000);
            await new Workbench().executeCommand('openshift delete service');
            await selectApplication(projectName, appName);
            await quickPick(serviceName1);

            await verifyNodeDeletion(serviceName1, application, 'Service', driver, 80000);
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

async function verifyService(name: string, application: ViewItem, initItems: ViewItem[], del: boolean = false) {
    const driver = application.getDriver();
    const items = (await driver.wait(() => { return nodeHasNewChildren(application, initItems); }, 180000)).map((item) => {
        return item.getLabel();
    });
    let message: string;
    if (del) {
        message = `Service '${name}' successfully deleted`;
        expect(items).not.contains(name);
    } else {
        message = `Service '${name}' successfully created`;
        expect(items).contains(name);
    }
    const notification = await findNotification(message);
    expect(notification).not.undefined;
}