import { ActivityBar, ViewControl, SideBarView } from 'vscode-extension-tester';
import * as fs from 'fs-extra';
import * as path from 'path';
import { expect } from 'chai';
import { Platform } from '../src/util/platform';
import * as login from './suite/login';
import * as project from './suite/project';
import * as cluster from './suite/cluster';
import * as application from './suite/application';

describe('System tests', () => {
    const clusterUrl = process.env.OPENSHIFT_CLUSTER_URL;
    const toolsPath = path.resolve(Platform.getUserHomePath(), '.vs-openshift');
    const kubePath = path.resolve(Platform.getUserHomePath(), '.kube');
    const kubeBackupPath = path.resolve(Platform.getUserHomePath(), '.kube-backup');

    before(() => {
        fs.removeSync(toolsPath);
        if (fs.existsSync(kubePath)) {
            fs.moveSync(kubePath, kubeBackupPath, { overwrite: true });
        }
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

        expect(title.toLowerCase()).equals('openshift: openshift application explorer');
    });

    it('Login and Refresh buttons are available', async () => {
        await new ActivityBar().getViewControl('OpenShift').openView();
        const buttons = await new SideBarView().getTitlePart().getActionButtons();

        expect(buttons.length).equals(2);
        expect(buttons[0].getTitle()).equals('Log in to cluster');
        expect(buttons[1].getTitle()).equals('Refresh View');
    });

    login.loginTest(clusterUrl);
    cluster.clusterTest(clusterUrl);
    project.projectTest(clusterUrl);
    application.applicationTest(clusterUrl);
});