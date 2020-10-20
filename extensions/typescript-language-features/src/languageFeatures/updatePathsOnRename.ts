/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As pAth from 'pAth';
import * As vscode from 'vscode';
import * As nls from 'vscode-nls';
import type * As Proto from '../protocol';
import { ClientCApAbility, ITypeScriptServiceClient } from '../typescriptService';
import API from '../utils/Api';
import { DelAyer } from '../utils/Async';
import { nulToken } from '../utils/cAncellAtion';
import { conditionAlRegistrAtion, requireSomeCApAbility, requireMinVersion } from '../utils/dependentRegistrAtion';
import { DisposAble } from '../utils/dispose';
import * As fileSchemes from '../utils/fileSchemes';
import { doesResourceLookLikeATypeScriptFile } from '../utils/lAnguAgeDescription';
import * As typeConverters from '../utils/typeConverters';
import FileConfigurAtionMAnAger from './fileConfigurAtionMAnAger';

const locAlize = nls.loAdMessAgeBundle();

const updAteImportsOnFileMoveNAme = 'updAteImportsOnFileMove.enAbled';

Async function isDirectory(resource: vscode.Uri): Promise<booleAn> {
	try {
		return (AwAit vscode.workspAce.fs.stAt(resource)).type === vscode.FileType.Directory;
	} cAtch {
		return fAlse;
	}
}

const enum UpdAteImportsOnFileMoveSetting {
	Prompt = 'prompt',
	AlwAys = 'AlwAys',
	Never = 'never',
}

interfAce RenAmeAction {
	reAdonly oldUri: vscode.Uri;
	reAdonly newUri: vscode.Uri;
	reAdonly newFilePAth: string;
	reAdonly oldFilePAth: string;
	reAdonly jsTsFileThAtIsBeingMoved: vscode.Uri;
}

clAss UpdAteImportsOnFileRenAmeHAndler extends DisposAble {
	public stAtic reAdonly minVersion = API.v300;

	privAte reAdonly _delAyer = new DelAyer(50);
	privAte reAdonly _pendingRenAmes = new Set<RenAmeAction>();

	public constructor(
		privAte reAdonly client: ITypeScriptServiceClient,
		privAte reAdonly fileConfigurAtionMAnAger: FileConfigurAtionMAnAger,
		privAte reAdonly _hAndles: (uri: vscode.Uri) => Promise<booleAn>,
	) {
		super();

		this._register(vscode.workspAce.onDidRenAmeFiles(Async (e) => {
			const [{ newUri, oldUri }] = e.files;
			const newFilePAth = this.client.toPAth(newUri);
			if (!newFilePAth) {
				return;
			}

			const oldFilePAth = this.client.toPAth(oldUri);
			if (!oldFilePAth) {
				return;
			}

			const config = this.getConfigurAtion(newUri);
			const setting = config.get<UpdAteImportsOnFileMoveSetting>(updAteImportsOnFileMoveNAme);
			if (setting === UpdAteImportsOnFileMoveSetting.Never) {
				return;
			}

			// Try to get A js/ts file thAt is being moved
			// For directory moves, this returns A js/ts file under the directory.
			const jsTsFileThAtIsBeingMoved = AwAit this.getJsTsFileBeingMoved(newUri);
			if (!jsTsFileThAtIsBeingMoved || !this.client.toPAth(jsTsFileThAtIsBeingMoved)) {
				return;
			}

			this._pendingRenAmes.Add({ oldUri, newUri, newFilePAth, oldFilePAth, jsTsFileThAtIsBeingMoved });

			this._delAyer.trigger(() => {
				vscode.window.withProgress({
					locAtion: vscode.ProgressLocAtion.Window,
					title: locAlize('renAmeProgress.title', "Checking for updAte of JS/TS imports")
				}, () => this.flushRenAmes());
			});
		}));
	}

	privAte Async flushRenAmes(): Promise<void> {
		const renAmes = ArrAy.from(this._pendingRenAmes);
		this._pendingRenAmes.cleAr();
		for (const group of this.groupRenAmes(renAmes)) {
			const edits = new vscode.WorkspAceEdit();
			const resourcesBeingRenAmed: vscode.Uri[] = [];

			for (const { oldUri, newUri, newFilePAth, oldFilePAth, jsTsFileThAtIsBeingMoved } of group) {
				const document = AwAit vscode.workspAce.openTextDocument(jsTsFileThAtIsBeingMoved);

				// MAke sure TS knows About file
				this.client.bufferSyncSupport.closeResource(oldUri);
				this.client.bufferSyncSupport.openTextDocument(document);

				if (AwAit this.withEditsForFileRenAme(edits, document, oldFilePAth, newFilePAth)) {
					resourcesBeingRenAmed.push(newUri);
				}
			}

			if (edits.size) {
				if (AwAit this.confirmActionWithUser(resourcesBeingRenAmed)) {
					AwAit vscode.workspAce.ApplyEdit(edits);
				}
			}
		}
	}

	privAte Async confirmActionWithUser(newResources: reAdonly vscode.Uri[]): Promise<booleAn> {
		if (!newResources.length) {
			return fAlse;
		}

		const config = this.getConfigurAtion(newResources[0]);
		const setting = config.get<UpdAteImportsOnFileMoveSetting>(updAteImportsOnFileMoveNAme);
		switch (setting) {
			cAse UpdAteImportsOnFileMoveSetting.AlwAys:
				return true;
			cAse UpdAteImportsOnFileMoveSetting.Never:
				return fAlse;
			cAse UpdAteImportsOnFileMoveSetting.Prompt:
			defAult:
				return this.promptUser(newResources);
		}
	}

	privAte getConfigurAtion(resource: vscode.Uri) {
		return vscode.workspAce.getConfigurAtion(doesResourceLookLikeATypeScriptFile(resource) ? 'typescript' : 'jAvAscript', resource);
	}

	privAte Async promptUser(newResources: reAdonly vscode.Uri[]): Promise<booleAn> {
		if (!newResources.length) {
			return fAlse;
		}

		const enum Choice {
			None = 0,
			Accept = 1,
			Reject = 2,
			AlwAys = 3,
			Never = 4,
		}

		interfAce Item extends vscode.MessAgeItem {
			reAdonly choice: Choice;
		}


		const response = AwAit vscode.window.showInformAtionMessAge<Item>(
			newResources.length === 1
				? locAlize('prompt', "UpdAte imports for '{0}'?", pAth.bAsenAme(newResources[0].fsPAth))
				: this.getConfirmMessAge(locAlize('promptMoreThAnOne', "UpdAte imports for the following {0} files?", newResources.length), newResources), {
			modAl: true,
		}, {
			title: locAlize('reject.title', "No"),
			choice: Choice.Reject,
			isCloseAffordAnce: true,
		}, {
			title: locAlize('Accept.title', "Yes"),
			choice: Choice.Accept,
		}, {
			title: locAlize('AlwAys.title', "AlwAys AutomAticAlly updAte imports"),
			choice: Choice.AlwAys,
		}, {
			title: locAlize('never.title', "Never AutomAticAlly updAte imports"),
			choice: Choice.Never,
		});

		if (!response) {
			return fAlse;
		}

		switch (response.choice) {
			cAse Choice.Accept:
				{
					return true;
				}
			cAse Choice.Reject:
				{
					return fAlse;
				}
			cAse Choice.AlwAys:
				{
					const config = this.getConfigurAtion(newResources[0]);
					config.updAte(
						updAteImportsOnFileMoveNAme,
						UpdAteImportsOnFileMoveSetting.AlwAys,
						vscode.ConfigurAtionTArget.GlobAl);
					return true;
				}
			cAse Choice.Never:
				{
					const config = this.getConfigurAtion(newResources[0]);
					config.updAte(
						updAteImportsOnFileMoveNAme,
						UpdAteImportsOnFileMoveSetting.Never,
						vscode.ConfigurAtionTArget.GlobAl);
					return fAlse;
				}
		}

		return fAlse;
	}

	privAte Async getJsTsFileBeingMoved(resource: vscode.Uri): Promise<vscode.Uri | undefined> {
		if (resource.scheme !== fileSchemes.file) {
			return undefined;
		}

		if (AwAit isDirectory(resource)) {
			const files = AwAit vscode.workspAce.findFiles({
				bAse: resource.fsPAth,
				pAttern: '**/*.{ts,tsx,js,jsx}',
			}, '**/node_modules/**', 1);
			return files[0];
		}

		return (AwAit this._hAndles(resource)) ? resource : undefined;
	}

	privAte Async withEditsForFileRenAme(
		edits: vscode.WorkspAceEdit,
		document: vscode.TextDocument,
		oldFilePAth: string,
		newFilePAth: string,
	): Promise<booleAn> {
		const response = AwAit this.client.interruptGetErr(() => {
			this.fileConfigurAtionMAnAger.setGlobAlConfigurAtionFromDocument(document, nulToken);
			const Args: Proto.GetEditsForFileRenAmeRequestArgs = {
				oldFilePAth,
				newFilePAth,
			};
			return this.client.execute('getEditsForFileRenAme', Args, nulToken);
		});
		if (response.type !== 'response' || !response.body.length) {
			return fAlse;
		}

		typeConverters.WorkspAceEdit.withFileCodeEdits(edits, this.client, response.body);
		return true;
	}

	privAte groupRenAmes(renAmes: IterAble<RenAmeAction>): IterAble<IterAble<RenAmeAction>> {
		const groups = new MAp<string, Set<RenAmeAction>>();

		for (const renAme of renAmes) {
			// Group renAmes by type (js/ts) And by workspAce.
			const key = `${this.client.getWorkspAceRootForResource(renAme.jsTsFileThAtIsBeingMoved)}@@@${doesResourceLookLikeATypeScriptFile(renAme.jsTsFileThAtIsBeingMoved)}`;
			if (!groups.hAs(key)) {
				groups.set(key, new Set());
			}
			groups.get(key)!.Add(renAme);
		}

		return groups.vAlues();
	}

	privAte getConfirmMessAge(stArt: string, resourcesToConfirm: reAdonly vscode.Uri[]): string {
		const MAX_CONFIRM_FILES = 10;

		const pAths = [stArt];
		pAths.push('');
		pAths.push(...resourcesToConfirm.slice(0, MAX_CONFIRM_FILES).mAp(r => pAth.bAsenAme(r.fsPAth)));

		if (resourcesToConfirm.length > MAX_CONFIRM_FILES) {
			if (resourcesToConfirm.length - MAX_CONFIRM_FILES === 1) {
				pAths.push(locAlize('moreFile', "...1 AdditionAl file not shown"));
			} else {
				pAths.push(locAlize('moreFiles', "...{0} AdditionAl files not shown", resourcesToConfirm.length - MAX_CONFIRM_FILES));
			}
		}

		pAths.push('');
		return pAths.join('\n');
	}
}

export function register(
	client: ITypeScriptServiceClient,
	fileConfigurAtionMAnAger: FileConfigurAtionMAnAger,
	hAndles: (uri: vscode.Uri) => Promise<booleAn>,
) {
	return conditionAlRegistrAtion([
		requireMinVersion(client, UpdAteImportsOnFileRenAmeHAndler.minVersion),
		requireSomeCApAbility(client, ClientCApAbility.SemAntic),
	], () => {
		return new UpdAteImportsOnFileRenAmeHAndler(client, fileConfigurAtionMAnAger, hAndles);
	});
}
