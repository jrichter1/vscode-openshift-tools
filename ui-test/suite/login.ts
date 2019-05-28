import { SideBarView, ActivityBar, Workbench, Notification, WebDriver, VSBrowser, InputBox, until, By, ViewSection } from "vscode-extension-tester";
import { expect } from 'chai';
import { execSync } from 'child_process';
import { Platform } from "../../src/util/platform";
import * as path from 'path';
import { viewHasNoProgress, notificationExists, viewHasItems, inputHasNewMessage } from "../common/conditions";
import { findNotification, setInputTextAndConfirm, quickPick } from "../common/util";
import { views, notifications } from "../common/constants";

export function loginTest(clusterUrl: string) {
    const username = process.env.OPENSHIFT_USERNAME ? process.env.OPENSHIFT_USERNAME : 'developer';
    const password = process.env.OPENSHIFT_PASSWORD ? process.env.OPENSHIFT_PASSWORD : 'developer';
    const token = process.env.OPENSHIFT_TOKEN;

    describe('Login', () => {
        let view: SideBarView;
        let driver: WebDriver;
        let explorer: ViewSection;

        before(async () => {
            driver = VSBrowser.instance.driver;
            view = await new ActivityBar().getViewControl(views.CONTAINER_TITLE).openView();
            explorer = await view.getContent().getSection(views.VIEW_TITLE);
        });

        it('First ever credentials login works', async function () {
            this.timeout(150000);
            await driver.wait(() => { return notificationExists(notifications.ODO_NOT_FOUND); }, 15000);

            await driver.actions().mouseMove(explorer).perform();
            await explorer.getAction(views.LOGIN).click();

            // download ODO
            const odoNotification = await driver.wait(() => { return notificationExists(notifications.ODO_NOT_FOUND); }, 15000);
            await clickDownload(odoNotification);

            // download OKD
            const okdNotification = await driver.wait(() => { return notificationExists(notifications.OKD_NOT_FOUND); }, 2000);
            await clickDownload(okdNotification);

            await driver.wait(until.elementLocated(By.className('quick-input-widget')), 10000);
            await credentialsLogin(clusterUrl, username, password);

            // Wait until ODO download completes and download OKD client
            await driver.wait(() => { return viewHasNoProgress(view); }, 90000);

            // Save the credentials the first time around
            const saveNotification = await findNotification(notifications.SAVE_LOGIN);
            if (saveNotification) {
                await saveNotification.takeAction('Yes');
            }

            // Check that the cluster node is present in the tree view
            await driver.wait(() => { return viewHasItems(explorer); }, 5000);
            const item = await explorer.findItem(clusterUrl);
            expect(item).not.undefined;
        });

        it('Relogging in to the cluster works with saved credentials', async function() {
            this.timeout(120000);
            await driver.actions().mouseMove(explorer).perform();
            await explorer.getAction(views.LOGIN).click();
            await confirmLogout(driver);

            await credentialsLogin(clusterUrl);
            await driver.wait(() => { return viewHasNoProgress(view); }, 90000);

            // Check that the cluster node is present in the tree view
            const items = await driver.wait(() => { return viewHasItems(explorer); }, 5000);
            expect(await items[0].getLabel()).equals(clusterUrl);
        });

        it('Token login works', async function() {
            this.timeout(120000);
            let userToken = token;
            if (!userToken) {
                const output = execSync(`${path.resolve(Platform.getUserHomePath(), '.vs-openshift', 'oc')} whoami -t`);
                userToken = output.toString().trim();
            }
            await driver.actions().mouseMove(explorer).perform();
            await explorer.getAction(views.LOGIN).click();
            await confirmLogout(driver);

            const input = await new InputBox().wait(3000);
            await quickPick('Token', true);
            await setInputTextAndConfirm(clusterUrl, true);

            expect(await input.getMessage()).has.string('Provide Bearer token');
            expect(await input.isPassword()).to.be.true;
            await setInputTextAndConfirm(userToken);
            await driver.wait(() => { return viewHasNoProgress(view); }, 90000);

            await driver.wait(() => { return viewHasItems(explorer); }, 5000);
            const item = await explorer.findItem(clusterUrl);
            expect(item).not.undefined;
        });

        it('Login commands are available', async function() {
            this.timeout(5000);
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
    const loginNotification = await driver.wait(() => { return notificationExists(notifications.LOGGED_IN); }, 5000);
    await loginNotification.takeAction('Yes');
}

async function credentialsLogin(url: string, user?: string, password?: string) {
    // select credentials login
    const input = await new InputBox().wait(3000);
    await input.getDriver().wait(() => { return inputHasNewMessage(input, '', 'a'); }, 2000);
    expect(await input.getPlaceHolder()).equals('Select the way to log in to the cluster.');
    const quickPicks = await input.getQuickPicks();
    expect(await quickPicks[0].getText()).equals('Credentials');
    expect(await quickPicks[1].getText()).equals('Token');
    await quickPick('Credentials', true);

    // input URL
    expect(await input.getMessage()).has.string('Provide URL of the cluster to connect');
    await setInputTextAndConfirm(url, true);

    // input username
    expect(await input.getMessage()).has.string('Provide Username for basic authentication');
    await setInputTextAndConfirm(user, true);

    // input password
    expect(await input.getMessage()).has.string('Provide Password for basic authentication');
    expect(await input.isPassword()).to.be.true;
    await setInputTextAndConfirm(password);
}

async function clickDownload(notification: Notification): Promise<void> {
    let actionText: string;
    for (const button of await notification.getActions()) {
        if (button.getTitle().indexOf(notifications.DOWNLOAD) > -1) {
            actionText = button.getTitle();
            break;
        }
    }
    await notification.takeAction(actionText);
}