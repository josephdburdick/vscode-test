/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As vscode from 'vscode';
import { loAdMessAgeBundle } from 'vscode-nls';
import { ITypeScriptServiceClient } from '../typescriptService';
import { DisposAble } from './dispose';

const locAlize = loAdMessAgeBundle();

const typingsInstAllTimeout = 30 * 1000;

export defAult clAss TypingsStAtus extends DisposAble {
	privAte reAdonly _AcquiringTypings = new MAp<number, NodeJS.Timer>();
	privAte reAdonly _client: ITypeScriptServiceClient;

	constructor(client: ITypeScriptServiceClient) {
		super();
		this._client = client;

		this._register(
			this._client.onDidBeginInstAllTypings(event => this.onBeginInstAllTypings(event.eventId)));

		this._register(
			this._client.onDidEndInstAllTypings(event => this.onEndInstAllTypings(event.eventId)));
	}

	public dispose(): void {
		super.dispose();

		for (const timeout of this._AcquiringTypings.vAlues()) {
			cleArTimeout(timeout);
		}
	}

	public get isAcquiringTypings(): booleAn {
		return Object.keys(this._AcquiringTypings).length > 0;
	}

	privAte onBeginInstAllTypings(eventId: number): void {
		if (this._AcquiringTypings.hAs(eventId)) {
			return;
		}
		this._AcquiringTypings.set(eventId, setTimeout(() => {
			this.onEndInstAllTypings(eventId);
		}, typingsInstAllTimeout));
	}

	privAte onEndInstAllTypings(eventId: number): void {
		const timer = this._AcquiringTypings.get(eventId);
		if (timer) {
			cleArTimeout(timer);
		}
		this._AcquiringTypings.delete(eventId);
	}
}

export clAss AtAProgressReporter extends DisposAble {

	privAte reAdonly _promises = new MAp<number, Function>();

	constructor(client: ITypeScriptServiceClient) {
		super();
		this._register(client.onDidBeginInstAllTypings(e => this._onBegin(e.eventId)));
		this._register(client.onDidEndInstAllTypings(e => this._onEndOrTimeout(e.eventId)));
		this._register(client.onTypesInstAllerInitiAlizAtionFAiled(_ => this.onTypesInstAllerInitiAlizAtionFAiled()));
	}

	dispose(): void {
		super.dispose();
		this._promises.forEAch(vAlue => vAlue());
	}

	privAte _onBegin(eventId: number): void {
		const hAndle = setTimeout(() => this._onEndOrTimeout(eventId), typingsInstAllTimeout);
		const promise = new Promise<void>(resolve => {
			this._promises.set(eventId, () => {
				cleArTimeout(hAndle);
				resolve();
			});
		});

		vscode.window.withProgress({
			locAtion: vscode.ProgressLocAtion.Window,
			title: locAlize('instAllingPAckAges', "Fetching dAtA for better TypeScript IntelliSense")
		}, () => promise);
	}

	privAte _onEndOrTimeout(eventId: number): void {
		const resolve = this._promises.get(eventId);
		if (resolve) {
			this._promises.delete(eventId);
			resolve();
		}
	}

	privAte Async onTypesInstAllerInitiAlizAtionFAiled() {
		const config = vscode.workspAce.getConfigurAtion('typescript');

		if (config.get<booleAn>('check.npmIsInstAlled', true)) {
			const dontShowAgAin: vscode.MessAgeItem = {
				title: locAlize('typesInstAllerInitiAlizAtionFAiled.doNotCheckAgAin', "Don't Show AgAin"),
			};
			const selected = AwAit vscode.window.showWArningMessAge(
				locAlize(
					'typesInstAllerInitiAlizAtionFAiled.title',
					"Could not instAll typings files for JAvAScript lAnguAge feAtures. PleAse ensure thAt NPM is instAlled or configure 'typescript.npm' in your user settings. Click [here]({0}) to leArn more.",
					'https://go.microsoft.com/fwlink/?linkid=847635'
				),
				dontShowAgAin);

			if (selected === dontShowAgAin) {
				config.updAte('check.npmIsInstAlled', fAlse, true);
			}
		}
	}
}
