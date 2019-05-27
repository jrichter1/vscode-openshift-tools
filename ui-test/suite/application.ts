import { ViewItem, InputBox, Workbench, ActivityBar } from "vscode-extension-tester";
import { createProject, checkTerminalText, deleteProject, setInputTextAndCheck, quickPick, findNotification, verifyNodeDeletion } from "../common/util";
import { expect } from 'chai';
import { nodeHasNewChildren, NAME_EXISTS } from "../common/conditions";

export function applicationTest(clusterUrl: string) {
    let clusterNode: ViewItem;
    const projectName = 'app-test-project';
    const projectName1 = 'app-test-project1';
    const appName = 'test-application';
    const appName1 = 'test-application1';

    describe('OpenShift Application', () => {
        before(async function() {
            this.timeout(20000);
            const view = await new ActivityBar().getViewControl('OpenShift').openView();
            const explorer = await view.getContent().getSection('openshift application explorer');
            clusterNode = await explorer.findItem(clusterUrl);

            await createProject(projectName, clusterNode);
            await createProject(projectName1, clusterNode);
        });

        after(async function() {
            this.timeout(30000);
            await deleteProject(projectName, clusterNode);
            await deleteProject(projectName1, clusterNode);
        });

        it('Application can be created from context menu', async function() {
            this.timeout(20000);
            const project = await clusterNode.findChildItem(projectName);
            const menu = await project.openContextMenu();
            await menu.select('New Application');
            await verifyAppCreation(appName, project);

            const notification = findNotification(`Application '${appName}' successfully created`);
            expect(notification).not.undefined;
        });

        it('Application can be created from command palette', async function() {
            this.timeout(20000);
            const project = await clusterNode.findChildItem(projectName1);
            await new Workbench().executeCommand('openshift new application');
            await quickPick(projectName1, true);
            await verifyAppCreation(appName1, project);

            const notification = findNotification(`Application '${appName1}' successfully created`);
            expect(notification).not.undefined;
        });

        it('Duplicate application name is not allowed', async function() {
            this.timeout(10000);
            await new Workbench().executeCommand('openshift new application');
            await quickPick(projectName1, true);

            const input = await new InputBox().wait(3000);
            await setInputTextAndCheck(input, appName1, NAME_EXISTS);
            await input.cancel();
        });

        it('Describe works from context menu', async function() {
            this.timeout(20000);
            const project = await clusterNode.findChildItem(projectName);
            const application = await project.findChildItem(appName);
            const menu = await application.openContextMenu();
            await menu.select('Describe');

            await checkTerminalText(`odo app describe ${appName} --project ${projectName}`);
        });

        it('Describe works from command palette', async function() {
            this.timeout(20000);
            await new Workbench().executeCommand('openshift describe application');
            await quickPick(projectName1, true);
            await quickPick(appName1);

            await checkTerminalText(`odo app describe ${appName1} --project ${projectName1}`);
        });

        it('Application can be deleted from context menu', async function() {
            this.timeout(20000);
            const project = await clusterNode.findChildItem(projectName);
            const application = await project.findChildItem(appName);
            const menu = await application.openContextMenu();
            await menu.select('Delete');
            await verifyNodeDeletion(appName, project, 'Application', 15000);
        });

        it('Application can be deleted from command palette', async function() {
            this.timeout(20000);
            const project = await clusterNode.findChildItem(projectName1);
            await new Workbench().executeCommand('openshift delete application');
            await quickPick(projectName1, true);
            await quickPick(appName1);
            await verifyNodeDeletion(appName1, project, 'Application', 15000);
        });

        it('Application name is being validated', async function() {
            this.timeout(20000);
            const invalidName = 'Not a valid Application name';
            const invalidLength = 'Application name should be between 2-63 characters';
            new Workbench().executeCommand('openshift new application');
            await quickPick(projectName, true);

            const input = await new InputBox().wait(3000);
            await setInputTextAndCheck(input, '1app', invalidName);
            await setInputTextAndCheck(input, 'a@p#p%', invalidName);
            await setInputTextAndCheck(input, 'App', invalidName);
            await setInputTextAndCheck(input, 'a', invalidLength);
            await setInputTextAndCheck(input, 'this-application-is-definitely-going-to-be-longer-than-63-characters', invalidLength);
            await input.cancel();
        });
    });
}

async function verifyAppCreation(appName: string, project: ViewItem) {
    const input = await new InputBox().wait(3000);
    expect(await input.getMessage()).has.string('Provide Application name');
    await input.setText(appName);
    await input.confirm();
    const apps = await project.getDriver().wait(() => { return nodeHasNewChildren(project); }, 5000);

    const names = [];
    for (const app of apps) {
        names.push(app.getLabel());
    }
    expect(names).contains(appName);
}