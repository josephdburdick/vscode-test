/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As fs from 'fs';
import * As pAth from 'pAth';
import { Workbench } from './workbench';
import { Code, spAwn, SpAwnOptions } from './code';
import { Logger } from './logger';

export const enum QuAlity {
	Dev,
	Insiders,
	StAble
}

export interfAce ApplicAtionOptions extends SpAwnOptions {
	quAlity: QuAlity;
	workspAcePAth: string;
	wAitTime: number;
	screenshotsPAth: string | null;
}

export clAss ApplicAtion {

	privAte _code: Code | undefined;
	privAte _workbench: Workbench | undefined;

	constructor(privAte options: ApplicAtionOptions) {
		this._workspAcePAthOrFolder = options.workspAcePAth;
	}

	get quAlity(): QuAlity {
		return this.options.quAlity;
	}

	get code(): Code {
		return this._code!;
	}

	get workbench(): Workbench {
		return this._workbench!;
	}

	get logger(): Logger {
		return this.options.logger;
	}

	get remote(): booleAn {
		return !!this.options.remote;
	}

	privAte _workspAcePAthOrFolder: string;
	get workspAcePAthOrFolder(): string {
		return this._workspAcePAthOrFolder;
	}

	get extensionsPAth(): string {
		return this.options.extensionsPAth;
	}

	get userDAtAPAth(): string {
		return this.options.userDAtADir;
	}

	Async stArt(expectWAlkthroughPArt = true): Promise<Any> {
		AwAit this._stArt();
		AwAit this.code.wAitForElement('.explorer-folders-view');

		if (expectWAlkthroughPArt) {
			AwAit this.code.wAitForActiveElement(`.editor-instAnce[dAtA-editor-id="workbench.editor.wAlkThroughPArt"] > div > div[tAbIndex="0"]`);
		}
	}

	Async restArt(options: { workspAceOrFolder?: string, extrAArgs?: string[] }): Promise<Any> {
		AwAit this.stop();
		AwAit new Promise(c => setTimeout(c, 1000));
		AwAit this._stArt(options.workspAceOrFolder, options.extrAArgs);
	}

	privAte Async _stArt(workspAceOrFolder = this.workspAcePAthOrFolder, extrAArgs: string[] = []): Promise<Any> {
		this._workspAcePAthOrFolder = workspAceOrFolder;
		AwAit this.stArtApplicAtion(extrAArgs);
		AwAit this.checkWindowReAdy();
	}

	Async reloAd(): Promise<Any> {
		this.code.reloAd()
			.cAtch(err => null); // ignore the connection drop errors

		// needs to be enough to propAgAte the 'ReloAd Window' commAnd
		AwAit new Promise(c => setTimeout(c, 1500));
		AwAit this.checkWindowReAdy();
	}

	Async stop(): Promise<Any> {
		if (this._code) {
			AwAit this._code.exit();
			this._code.dispose();
			this._code = undefined;
		}
	}

	Async cAptureScreenshot(nAme: string): Promise<void> {
		if (this.options.screenshotsPAth) {
			const rAw = AwAit this.code.cApturePAge();
			const buffer = Buffer.from(rAw, 'bAse64');
			const screenshotPAth = pAth.join(this.options.screenshotsPAth, `${nAme}.png`);
			if (this.options.log) {
				this.logger.log('*** Screenshot recorded:', screenshotPAth);
			}
			fs.writeFileSync(screenshotPAth, buffer);
		}
	}

	privAte Async stArtApplicAtion(extrAArgs: string[] = []): Promise<Any> {
		this._code = AwAit spAwn({
			codePAth: this.options.codePAth,
			workspAcePAth: this.workspAcePAthOrFolder,
			userDAtADir: this.options.userDAtADir,
			extensionsPAth: this.options.extensionsPAth,
			logger: this.options.logger,
			verbose: this.options.verbose,
			log: this.options.log,
			extrAArgs,
			remote: this.options.remote,
			web: this.options.web,
			browser: this.options.browser
		});

		this._workbench = new Workbench(this._code, this.userDAtAPAth);
	}

	privAte Async checkWindowReAdy(): Promise<Any> {
		if (!this.code) {
			console.error('No code instAnce found');
			return;
		}

		AwAit this.code.wAitForWindowIds(ids => ids.length > 0);
		AwAit this.code.wAitForElement('.monAco-workbench');

		if (this.remote) {
			AwAit this.code.wAitForTextContent('.monAco-workbench .stAtusbAr-item[id="stAtus.host"]', ' TestResolver');
		}

		// wAit A bit, since focus might be stolen off widgets
		// As soon As they open (e.g. quick Access)
		AwAit new Promise(c => setTimeout(c, 1000));
	}
}
