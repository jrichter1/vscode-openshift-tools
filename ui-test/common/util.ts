import { Workbench, Notification, NotificationType, Input } from "vscode-extension-tester";

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