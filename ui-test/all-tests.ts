import { ActivityBar, ViewControl, SideBarView, TitleBar, DialogHandler } from 'vscode-extension-tester';
import * as fs from 'fs-extra';
import * as path from 'path';
import { expect } from 'chai';
import { Platform } from '../src/util/platform';
import * as login from './suite/login';
import * as project from './suite/project';
import * as cluster from './suite/cluster';
import * as application from './suite/application';
import * as component from './suite/component';
import * as service from './suite/service';

describe('System tests', () => {
    const clusterUrl = process.env.OPENSHIFT_CLUSTER_URL;
    const resources = path.resolve('ui-test', 'resources');
    const toolsPath = path.resolve(Platform.getUserHomePath(), '.vs-openshift');
    const kubePath = path.resolve(Platform.getUserHomePath(), '.kube');
    const kubeBackupPath = path.resolve(Platform.getUserHomePath(), '.kube-backup');

    before(async function() {
        this.timeout(20000);
        fs.removeSync(toolsPath);
        if (fs.existsSync(kubePath)) {
            fs.moveSync(kubePath, kubeBackupPath, { overwrite: true });
        }
        await openFolder(path.join(resources, 'nodejs-ex'));
    });

    after(() => {
        if (fs.existsSync(kubeBackupPath)) {
            fs.moveSync(kubeBackupPath, kubePath, { overwrite: true });
        }
    });

    it('OpenShift view should be available', async () => {
        const views = await new ActivityBar().getViewControls();
        let osView: ViewControl;
        osView = views.find((view) => {
            return (view.getTitle() === 'OpenShift');
        });

        expect(osView).not.undefined;
    });

    it('OpenShift view should open the OS application explorer', async () => {
        const view = await new ActivityBar().getViewControl('OpenShift').openView();
        const title = await view.getTitlePart().getTitle();

        expect(title.toLowerCase()).equals('openshift');
    });

    it('Login and Refresh buttons are available', async () => {
        await new ActivityBar().getViewControl('OpenShift').openView();
        const section = await new SideBarView().getContent().getSection('openshift application explorer');
        const buttons = await section.getActions();

        expect(buttons.length).equals(2);
        expect(buttons[0].getLabel()).equals('Log in to cluster');
        expect(buttons[1].getLabel()).equals('Refresh View');
    });

    login.loginTest(clusterUrl);
    cluster.clusterTest(clusterUrl);
    project.projectTest(clusterUrl);
    application.applicationTest(clusterUrl);
    // component.componentTest(clusterUrl);
    // service.serviceTest(clusterUrl);
});

async function openFolder(path: string) {
    await new TitleBar().select('File', 'Open Folder...');
    const dialog = await DialogHandler.getOpenDialog();
    await dialog.selectPath(path);
    await dialog.confirm();
}