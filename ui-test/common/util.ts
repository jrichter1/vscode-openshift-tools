import { Workbench, Notification, NotificationType, Input, InputBox, ViewItem, WebDriver, until, By, TerminalView } from "vscode-extension-tester";
import { nodeHasNewChildren, terminalHasNoChanges, inputHasError, notificationExists } from "./conditions";
import { expect } from "chai";

export async function findNotification(message: string): Promise<Notification> {
    const center = await new Workbench().openNotificationsCenter();

    for (const item of await center.getNotifications(NotificationType.Info)) {
        const text = await item.getMessage();
        if (text.indexOf(message) > -1) {
            return item;
        }
    }
}

export async function setInputTextAndConfirm(input: Input, text?: string) {
    if (text) { await input.setText(text); }
    await input.confirm();
    await input.getDriver().sleep(500);
}

export async function setTextAndCheck(input: InputBox, text: string, error: string) {
    await input.setText(text);
    const message = await input.getDriver().wait(() => { return inputHasError(input); }, 2000);

    expect(message).has.string(error);
    await input.setText('validtext');
    await input.getDriver().sleep(500);
}

export async function createProject(name: string, cluster: ViewItem, driver: WebDriver) {
    await new Workbench().executeCommand('openshift new project');
    const input = await new InputBox().wait();
    await input.setText(name);
    await input.confirm();
    await driver.wait(() => { return nodeHasNewChildren(cluster); }, 5000);
}

export async function deleteProject(name: string, cluster: ViewItem, driver: WebDriver) {
    await new Workbench().executeCommand('openshift delete project');
    const input = await new InputBox().wait();
    await input.setText(name);
    await input.confirm();
    const confirmation = await driver.wait(() => { return notificationExists('Do you want to delete Project'); }, 20000);
    await confirmation.takeAction('Yes');
    await driver.wait(() => { return nodeHasNewChildren(cluster); }, 15000);
}

export async function checkTerminalText(expectedText: string, driver: WebDriver, timeout: number = 5000) {
    await driver.wait(until.elementLocated(By.id('workbench.panel.terminal')));
    const terminalView = await new TerminalView().wait();
    const text = await driver.wait(() => { return terminalHasNoChanges(terminalView, 1000); }, timeout);
    expect(text).has.string(expectedText);
}