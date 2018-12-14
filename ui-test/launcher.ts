/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import * as request  from 'request';
import * as fs from 'fs-extra';
import * as path from 'path';
import { Archive } from '../src/util/archive';
import * as child_process from 'child_process';
import * as pjson from '../package.json';

const downloadPlatform = (process.platform === 'darwin') ? 'darwin' : process.platform === 'win32' ? 'win32-archive' : 'linux-x64';
const chromeDriverVersion = '2.34';
const dir = path.join(__dirname, '..', '..', 'test-resources');
const codeFolder = path.join(dir, (process.platform === 'darwin') ? 'Visual Studio Code.app' : `VSCode-${downloadPlatform}`);
let executable: string;

function getLatestVSCodeVersion(): Promise<string> {
    const apiUrl = 'https://vscode-update.azurewebsites.net/api/releases/stable';
    const headers = {
        'user-agent': 'nodejs'
    };

    return new Promise<string>((resolve, reject) => {
        request.get({ url: apiUrl, headers: headers }, (error, response, body) => {
            if (!error && response && response.statusCode >= 400) {
                error = new Error(`Request returned status code: ${response.statusCode}\nDetails: ${response.body}`);
                reject(error);
            }
            resolve(body);
        });
    }).then((json) => {
        return JSON.parse(json)[0];
    });
}

async function getVSCode(version: string): Promise<void> {
    if (!fs.existsSync(codeFolder)) {
        const url = ['https://vscode-update.azurewebsites.net', version, downloadPlatform, 'stable'].join('/');
        const isTarGz = downloadPlatform.indexOf('linux') > -1;
        const fileName = `${path.basename(url)}.${isTarGz ? 'tar.gz' : 'zip'}`;

        console.log(`Downloading VS Code from: ${url}`);
        await new Promise<void>((resolve) => {
            request.get(url)
                .pipe(fs.createWriteStream(path.join(dir, fileName)))
                .on('close', resolve);
        });
        let targetFolder = dir;
        if (process.platform === 'win32') {
            targetFolder = path.join(targetFolder, `VSCode-${downloadPlatform}`);
        }

        console.log('Unpacking VS Code');
        return Archive.unzip(path.join(dir, fileName), targetFolder);
    } else {
        console.log('VS Code exists in local cache, skipping download');
    }
}

async function getChromeDriver(version: string): Promise<void> {
    if (!fs.existsSync(path.join(dir, 'chromedriver'))) {
        const driverPlatform = (process.platform === 'darwin') ? 'mac64' : process.platform === 'win32' ? 'win32' : 'linux64';
        const url = ['https://chromedriver.storage.googleapis.com', version, `chromedriver_${driverPlatform}.zip`].join('/');
        console.log(`Downloading ChromeDriver from: ${url}`);
        await new Promise<void>((resolve) => {
            request.get(url)
                .pipe(fs.createWriteStream(path.join(dir, path.basename(url))))
                .on('close', resolve);
        });

        console.log('Unpacking ChromeDriver');
        await Archive.unzip(path.join(dir, path.basename(url)), dir);
        if (process.platform !== 'win32') {
            fs.chmodSync(path.join(dir, 'chromedriver'), 755);
        }
    } else {
        console.log('ChromeDriver exists in local cache, skipping download');
    }
}

function installExtension(): void {
    let cliPath: string;
    cliPath = path.join(codeFolder, 'resources', 'app', 'out', 'cli.js');

    switch (process.platform) {
        case 'darwin':
            executable = path.join(codeFolder, 'Contents', 'MacOS', 'Electron');
            cliPath = path.join(codeFolder, 'Contents', 'Resources', 'app', 'out', 'cli.js');
            break;
        case 'win32':
            executable = path.join(codeFolder, 'Code.exe');
            break;
        case 'linux':
            executable = path.join(codeFolder, 'code');
            break;
    }

    const vsixPath = path.join(__dirname, '..', '..', `${pjson.name}-${pjson.version}.vsix`);
    let command: string;
    if (process.platform === 'win32') {
        command = ['set ELECTRON_RUN_AS_NODE=1', '&&', executable, cliPath, '--install-extension', vsixPath].join(' ');
    } else {
        command = ['ELECTRON_RUN_AS_NODE=1', executable, cliPath, '--install-extension', vsixPath].join(' ');
    }

    console.log(`Installing ${pjson.name}-${pjson.version}.vsix`);
    child_process.execSync(command, { stdio: 'inherit' });
}

function runTests(): void {
    // add chromedriver to path
    const finalEnv: NodeJS.ProcessEnv = {};
    Object.assign(finalEnv, process.env);
    const key = process.platform === 'win32' ? 'Path' : 'PATH';
    const binFolder = path.join(__dirname, '..', '..', 'node_modules', '.bin');
    finalEnv[key] = [dir, process.env[key]].join(path.delimiter);
    finalEnv.CHROME_BINARY = executable;

    const args = [path.join(__dirname, '..', '..', 'out', 'ui-test', 'ui-suite.js')];
    const proc = child_process.spawn(path.join(binFolder, process.platform === 'win32' ? 'mocha.cmd' : 'mocha'), args, { env: finalEnv });

    proc.stdout.on('data', (data) => {
        console.log(data.toString());
    });

    proc.stderr.on('data', (data) => {
        console.error(data.toString());
    });

    proc.on('error', (data) => {
        console.log('Failed to execute tests: ' + data.toString());
    });

    proc.on('close', (code) => {
        console.log('Tests exited with code: ' + code);
        if (code !== 0) {
            process.exit(code);
        }
    });
}

async function run() {
    await fs.mkdirp(dir);
    await getChromeDriver(chromeDriverVersion);
    await getVSCode(await getLatestVSCodeVersion());
    installExtension();
    runTests();
}

run();