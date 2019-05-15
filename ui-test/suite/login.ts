import { SideBarView, ActivityBar, Workbench, Notification, WebDriver, VSBrowser, InputBox, until, By } from "vscode-extension-tester";
import { expect } from 'chai';
import { execSync } from 'child_process';
import { Platform } from "../../src/util/platform";
import * as path from 'path';
import { viewHasNoProgress, notificationsExist } from "../common/conditions";
import { findNotification, setInputTextAndConfirm } from "../common/util";

export function loginTest(clusterUrl: string) {
    const username = process.env.OPENSHIFT_USERNAME ? process.env.OPENSHIFT_USERNAME : 'developer';
    const password = process.env.OPENSHIFT_PASSWORD ? process.env.OPENSHIFT_PASSWORD : 'developer';
    const token = process.env.OPENSHIFT_TOKEN;

    describe('Login', () => {
        let view: SideBarView;
        let driver: WebDriver;

        before(async () => {
            driver = VSBrowser.instance.driver;
            view = await new ActivityBar().getViewControl('OpenShift').openView();
        });

        it('First ever credentials login works', async function () {
            this.timeout(120000);
            await (await view.getTitlePart().getActionButton('Log in to cluster')).click();

            // download ODO
            const odoNotification = await findNotification('Cannot find OpenShift Do');
            await clickDownload(odoNotification);

            // download OKD
            const okdNotification = await findNotification('Cannot find OKD');
            await clickDownload(okdNotification);

            await driver.wait(until.elementLocated(By.className('quick-input-widget')), 10000);
            await credentialsLogin(clusterUrl, username, password);

            // Wait until ODO download completes and download OKD client
            await driver.wait(() => { return viewHasNoProgress(view); }, 90000);

            // Save the credentials the first time around
            const saveNotification = await findNotification('Do you want to save username and password?');
            if (saveNotification) {
                await saveNotification.takeAction('Yes');
            }

            // Check that the cluster node is present in the tree view
            const item = await (await view.getContent().getSections())[0].findItem(clusterUrl);
            expect(item).not.undefined;
        });

        it('Relogging in to the cluster works with saved credentials', async function() {
            this.timeout(120000);
            await (await view.getTitlePart().getActionButton('Log in to cluster')).click();
            await confirmLogout(driver);

            await credentialsLogin(clusterUrl);
            await driver.wait(() => { return viewHasNoProgress(view); }, 90000);

            // Check that the cluster node is present in the tree view
            const items = await (await view.getContent().getSections())[0].getVisibleItems();
            expect(await items[0].getLabel()).equals(clusterUrl);
        });

        it('Token login works', async function() {
            this.timeout(120000);
            let userToken = token;
            if (!userToken) {
                const output = execSync(`${path.resolve(Platform.getUserHomePath(), '.vs-openshift', 'oc')} whoami -t`);
                userToken = output.toString().trim();
            }
            await (await view.getTitlePart().getActionButton('Log in to cluster')).click();
            await confirmLogout(driver);

            const input = new InputBox();
            await input.selectQuickPick('Token');
            await input.getDriver().sleep(500);
            await setInputTextAndConfirm(input, clusterUrl);

            expect(await input.getMessage()).has.string('Provide Bearer token');
            await setInputTextAndConfirm(input, userToken);
            await driver.wait(() => { return viewHasNoProgress(view); }, 90000);

            const item = await (await view.getContent().getSections())[0].findItem(clusterUrl);
            expect(item).not.undefined;
        });

        it('Login commands are available', async () => {
            const prompt = await new Workbench().openCommandPrompt();

            await prompt.setText('>openshift log');
            await prompt.getDriver().sleep(100);
            const commands = [];
            for (const item of await prompt.getQuickPicks()) {
                commands.push(await item.getText());
            }
            await prompt.cancel();

            expect(commands).contains('OpenShift: Login into Cluster with credentials');
            expect(commands).contains('OpenShift: Login into Cluster with token');
            expect(commands).contains('OpenShift: Log out');
        });
    });
}

async function confirmLogout(driver: WebDriver) {
    await driver.wait(() => { return notificationsExist(); }, 5000);
    const loginNotification = await findNotification('You are already logged in');
    await loginNotification.takeAction('Yes');
}

async function credentialsLogin(url: string, user?: string, password?: string) {
    // select credentials login
    const input = new InputBox();
    expect(await input.getPlaceHolder()).equals('Select the way to log in to the cluster.');
    const quickPicks = await input.getQuickPicks();
    expect(await quickPicks[0].getText()).equals('Credentials');
    expect(await quickPicks[1].getText()).equals('Token');
    await input.selectQuickPick('Credentials');
    await input.getDriver().sleep(500);

    // input URL
    expect(await input.getMessage()).has.string('Provide URL of the cluster to connect');
    await setInputTextAndConfirm(input, url);

    // input username
    expect(await input.getMessage()).has.string('Provide Username for basic authentication');
    await setInputTextAndConfirm(input, user);

    // input password
    expect(await input.getMessage()).has.string('Provide Password for basic authentication');
    await setInputTextAndConfirm(input, password);
}

async function clickDownload(notification: Notification): Promise<void> {
    let actionText: string;
    for (const button of await notification.getActions()) {
        if (button.getTitle().indexOf('Download and install') > -1) {
            actionText = button.getTitle();
            break;
        }
    }
    await notification.takeAction(actionText);
}