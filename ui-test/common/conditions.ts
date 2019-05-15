import { Workbench, NotificationType, SideBarView } from "vscode-extension-tester";

export async function notificationsExist() {
    const center = await new Workbench().openNotificationsCenter();
    const notifications = await center.getNotifications(NotificationType.Any);
    return notifications.length > 0;
}

export async function viewHasNoProgress(view: SideBarView) {
    const content = view.getContent();
    return !await content.hasProgress();
}