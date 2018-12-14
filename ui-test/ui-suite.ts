/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

'use strict';

import { Builder, By, until, WebDriver, WebElement } from 'selenium-webdriver';
import { Options } from 'selenium-webdriver/chrome';

describe("test", () => {
    let driver: WebDriver;
    let openshiftView: WebElement;

    before(async function () {
        this.timeout(15000);
        driver = await new Builder()
        .forBrowser('chrome')
        .setChromeOptions(new Options().setChromeBinaryPath(process.env.CHROME_BINARY))
        .build();

        await driver.wait(until.elementLocated(By.xpath(`//li[@title='OpenShift']`))).click();
        openshiftView = await driver.wait(until.elementLocated(By.id('workbench.view.extension.openshiftView')));
    });

    after(async () => {
        await driver.quit();
    });

    it('does', async function () {
        this.timeout(20000);
        const loginBtn = await openshiftView.findElement(By.xpath(`//a[@title='Log in to cluster']`));

        await driver.actions().mouseMove(loginBtn).click().perform();

        const delay = (ms) => new Promise((res) => setTimeout(res, ms));
        await delay(15000);
    });
});