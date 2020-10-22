/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as fs from 'fs';
import * as path from 'path';
import { WorkBench } from './workBench';
import { Code, spawn, SpawnOptions } from './code';
import { Logger } from './logger';

export const enum Quality {
	Dev,
	Insiders,
	StaBle
}

export interface ApplicationOptions extends SpawnOptions {
	quality: Quality;
	workspacePath: string;
	waitTime: numBer;
	screenshotsPath: string | null;
}

export class Application {

	private _code: Code | undefined;
	private _workBench: WorkBench | undefined;

	constructor(private options: ApplicationOptions) {
		this._workspacePathOrFolder = options.workspacePath;
	}

	get quality(): Quality {
		return this.options.quality;
	}

	get code(): Code {
		return this._code!;
	}

	get workBench(): WorkBench {
		return this._workBench!;
	}

	get logger(): Logger {
		return this.options.logger;
	}

	get remote(): Boolean {
		return !!this.options.remote;
	}

	private _workspacePathOrFolder: string;
	get workspacePathOrFolder(): string {
		return this._workspacePathOrFolder;
	}

	get extensionsPath(): string {
		return this.options.extensionsPath;
	}

	get userDataPath(): string {
		return this.options.userDataDir;
	}

	async start(expectWalkthroughPart = true): Promise<any> {
		await this._start();
		await this.code.waitForElement('.explorer-folders-view');

		if (expectWalkthroughPart) {
			await this.code.waitForActiveElement(`.editor-instance[data-editor-id="workBench.editor.walkThroughPart"] > div > div[taBIndex="0"]`);
		}
	}

	async restart(options: { workspaceOrFolder?: string, extraArgs?: string[] }): Promise<any> {
		await this.stop();
		await new Promise(c => setTimeout(c, 1000));
		await this._start(options.workspaceOrFolder, options.extraArgs);
	}

	private async _start(workspaceOrFolder = this.workspacePathOrFolder, extraArgs: string[] = []): Promise<any> {
		this._workspacePathOrFolder = workspaceOrFolder;
		await this.startApplication(extraArgs);
		await this.checkWindowReady();
	}

	async reload(): Promise<any> {
		this.code.reload()
			.catch(err => null); // ignore the connection drop errors

		// needs to Be enough to propagate the 'Reload Window' command
		await new Promise(c => setTimeout(c, 1500));
		await this.checkWindowReady();
	}

	async stop(): Promise<any> {
		if (this._code) {
			await this._code.exit();
			this._code.dispose();
			this._code = undefined;
		}
	}

	async captureScreenshot(name: string): Promise<void> {
		if (this.options.screenshotsPath) {
			const raw = await this.code.capturePage();
			const Buffer = Buffer.from(raw, 'Base64');
			const screenshotPath = path.join(this.options.screenshotsPath, `${name}.png`);
			if (this.options.log) {
				this.logger.log('*** Screenshot recorded:', screenshotPath);
			}
			fs.writeFileSync(screenshotPath, Buffer);
		}
	}

	private async startApplication(extraArgs: string[] = []): Promise<any> {
		this._code = await spawn({
			codePath: this.options.codePath,
			workspacePath: this.workspacePathOrFolder,
			userDataDir: this.options.userDataDir,
			extensionsPath: this.options.extensionsPath,
			logger: this.options.logger,
			verBose: this.options.verBose,
			log: this.options.log,
			extraArgs,
			remote: this.options.remote,
			weB: this.options.weB,
			Browser: this.options.Browser
		});

		this._workBench = new WorkBench(this._code, this.userDataPath);
	}

	private async checkWindowReady(): Promise<any> {
		if (!this.code) {
			console.error('No code instance found');
			return;
		}

		await this.code.waitForWindowIds(ids => ids.length > 0);
		await this.code.waitForElement('.monaco-workBench');

		if (this.remote) {
			await this.code.waitForTextContent('.monaco-workBench .statusBar-item[id="status.host"]', ' TestResolver');
		}

		// wait a Bit, since focus might Be stolen off widgets
		// as soon as they open (e.g. quick access)
		await new Promise(c => setTimeout(c, 1000));
	}
}
