import { SideBarView, ActivityBar, Workbench, NotificationType, Notification, WebDriver, VSBrowser, InputBox, until, By } from "vscode-extension-tester";
import { expect } from 'chai';

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

        // 1. Clean ~/.vs-openshift and ~/.minishift and ~/.kube
        // 2. Launch minishit
        // 3. Open OpenShift view
        // 4. Wait for the 1st notification
        // 5. Open notifications center and click Download and Install ... for ODO
        // 6. Wait for the 2nd notification
        // 7. Open notifications center and click Download and Install ... for OC
        // 8. Wait while there is progress bar on the view
        // 9. Start testing something of actual value

        // 10. Make Project test suite
        // 11. Make Application test suite
        // 12. Make Component test suite
        // 13. Make tiny suites for Service, Storage and URL
        // 14. Profit

        it('First ever credentials login works', async function () {
            this.timeout(30000);
            await (await view.getTitlePart().getActionButton('Log in to cluster')).click();

            // download ODO
            const odoNotification = await findNotification('Cannot find OpenShift Do');
            await clickDownload(odoNotification);

            // download OKD
            const okdNotification = await findNotification('Cannot find OKD');
            await clickDownload(okdNotification);

            // await driver.wait(() => { return viewHasNoProgress(view); }, 10000);
            await driver.wait(until.elementLocated(By.className('quick-input-widget')), 10000);

            await credentialsLogin(clusterUrl, username, password);

            // Wait until ODO download completes and download OKD client
            await driver.wait(() => { return viewHasNoProgress(view); }, 15000);

            // Save the credentials the first time around
            const saveNotification = await findNotification('Do you want to save username and password?');
            if (saveNotification) {
                await saveNotification.takeAction('Yes');
            }

            // Check that the cluster node is present in the tree view
            const item = await (await view.getContent().getSections())[0].findItem(clusterUrl);
            expect(item).not.undefined;
        });
    });
}

async function credentialsLogin(url: string, user: string, password?: string) {
    // select credentials login
    const input = new InputBox();
    expect(await input.getPlaceHolder()).equals('Select the way to log in to the cluster.');
    const quickPicks = await input.getQuickPicks();
    expect(await quickPicks[0].getText()).equals('Credentials');
    expect(await quickPicks[1].getText()).equals('Token');
    await input.selectQuickPick('Credentials');

    // input URL
    await input.getDriver().sleep(500);
    expect(await input.getMessage()).has.string('Provide URL of the cluster to connect');
    await input.setText(url);
    await input.confirm();

    // input username
    await input.getDriver().sleep(500);
    expect(await input.getMessage()).has.string('Provide Username for basic authentication');
    await input.setText(user);
    await input.confirm();

    // input password
    if (password) {
        await input.getDriver().sleep(500);
        expect(await input.getMessage()).has.string('Provide Password for basic authentication');
        await input.setText(password);
        await input.confirm();
    }
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

async function findNotification(message: string): Promise<Notification> {
    const center = await new Workbench().openNotificationsCenter();

    for (const item of await center.getNotifications(NotificationType.Info)) {
        const text = await item.getMessage();
        if (text.indexOf(message) > -1) {
            return item;
        }
    }
}

async function noNotifications() {
    const center = await new Workbench().openNotificationsCenter();
    const notifications = await center.getNotifications(NotificationType.Any);
    return notifications.length === 0;
}

async function notificationsExist() {
    const center = await new Workbench().openNotificationsCenter();
    const notifications = await center.getNotifications(NotificationType.Any);
    return notifications.length > 0;
}

async function viewHasNoProgress(view: SideBarView) {
    const content = view.getContent();
    return !await content.hasProgress();
}