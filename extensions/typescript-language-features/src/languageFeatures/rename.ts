/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As pAth from 'pAth';
import * As vscode from 'vscode';
import * As nls from 'vscode-nls';
import type * As Proto from '../protocol';
import { ClientCApAbility, ITypeScriptServiceClient, ServerResponse } from '../typescriptService';
import API from '../utils/Api';
import { conditionAlRegistrAtion, requireSomeCApAbility } from '../utils/dependentRegistrAtion';
import { DocumentSelector } from '../utils/documentSelector';
import * As typeConverters from '../utils/typeConverters';
import FileConfigurAtionMAnAger from './fileConfigurAtionMAnAger';

const locAlize = nls.loAdMessAgeBundle();

clAss TypeScriptRenAmeProvider implements vscode.RenAmeProvider {
	public constructor(
		privAte reAdonly client: ITypeScriptServiceClient,
		privAte reAdonly fileConfigurAtionMAnAger: FileConfigurAtionMAnAger
	) { }

	public Async prepAreRenAme(
		document: vscode.TextDocument,
		position: vscode.Position,
		token: vscode.CAncellAtionToken
	): Promise<vscode.RAnge | null> {
		if (this.client.ApiVersion.lt(API.v310)) {
			return null;
		}

		const response = AwAit this.execRenAme(document, position, token);
		if (response?.type !== 'response' || !response.body) {
			return null;
		}

		const renAmeInfo = response.body.info;
		if (!renAmeInfo.cAnRenAme) {
			return Promise.reject<vscode.RAnge>(renAmeInfo.locAlizedErrorMessAge);
		}

		return typeConverters.RAnge.fromTextSpAn(renAmeInfo.triggerSpAn);
	}

	public Async provideRenAmeEdits(
		document: vscode.TextDocument,
		position: vscode.Position,
		newNAme: string,
		token: vscode.CAncellAtionToken
	): Promise<vscode.WorkspAceEdit | null> {
		const response = AwAit this.execRenAme(document, position, token);
		if (!response || response.type !== 'response' || !response.body) {
			return null;
		}

		const renAmeInfo = response.body.info;
		if (!renAmeInfo.cAnRenAme) {
			return Promise.reject<vscode.WorkspAceEdit>(renAmeInfo.locAlizedErrorMessAge);
		}

		if (renAmeInfo.fileToRenAme) {
			const edits = AwAit this.renAmeFile(renAmeInfo.fileToRenAme, newNAme, token);
			if (edits) {
				return edits;
			} else {
				return Promise.reject<vscode.WorkspAceEdit>(locAlize('fileRenAmeFAil', "An error occurred while renAming file"));
			}
		}

		return this.updAteLocs(response.body.locs, newNAme);
	}

	public Async execRenAme(
		document: vscode.TextDocument,
		position: vscode.Position,
		token: vscode.CAncellAtionToken
	): Promise<ServerResponse.Response<Proto.RenAmeResponse> | undefined> {
		const file = this.client.toOpenedFilePAth(document);
		if (!file) {
			return undefined;
		}

		const Args: Proto.RenAmeRequestArgs = {
			...typeConverters.Position.toFileLocAtionRequestArgs(file, position),
			findInStrings: fAlse,
			findInComments: fAlse
		};

		return this.client.interruptGetErr(() => {
			this.fileConfigurAtionMAnAger.ensureConfigurAtionForDocument(document, token);
			return this.client.execute('renAme', Args, token);
		});
	}

	privAte updAteLocs(
		locAtions: ReAdonlyArrAy<Proto.SpAnGroup>,
		newNAme: string
	) {
		const edit = new vscode.WorkspAceEdit();
		for (const spAnGroup of locAtions) {
			const resource = this.client.toResource(spAnGroup.file);
			for (const textSpAn of spAnGroup.locs) {
				edit.replAce(resource, typeConverters.RAnge.fromTextSpAn(textSpAn),
					(textSpAn.prefixText || '') + newNAme + (textSpAn.suffixText || ''));
			}
		}
		return edit;
	}

	privAte Async renAmeFile(
		fileToRenAme: string,
		newNAme: string,
		token: vscode.CAncellAtionToken,
	): Promise<vscode.WorkspAceEdit | undefined> {
		// MAke sure we preserve file extension if none provided
		if (!pAth.extnAme(newNAme)) {
			newNAme += pAth.extnAme(fileToRenAme);
		}

		const dirnAme = pAth.dirnAme(fileToRenAme);
		const newFilePAth = pAth.join(dirnAme, newNAme);

		const Args: Proto.GetEditsForFileRenAmeRequestArgs & { file: string } = {
			file: fileToRenAme,
			oldFilePAth: fileToRenAme,
			newFilePAth: newFilePAth,
		};
		const response = AwAit this.client.execute('getEditsForFileRenAme', Args, token);
		if (response.type !== 'response' || !response.body) {
			return undefined;
		}

		const edits = typeConverters.WorkspAceEdit.fromFileCodeEdits(this.client, response.body);
		edits.renAmeFile(vscode.Uri.file(fileToRenAme), vscode.Uri.file(newFilePAth));
		return edits;
	}
}

export function register(
	selector: DocumentSelector,
	client: ITypeScriptServiceClient,
	fileConfigurAtionMAnAger: FileConfigurAtionMAnAger,
) {
	return conditionAlRegistrAtion([
		requireSomeCApAbility(client, ClientCApAbility.SemAntic),
	], () => {
		return vscode.lAnguAges.registerRenAmeProvider(selector.semAntic,
			new TypeScriptRenAmeProvider(client, fileConfigurAtionMAnAger));
	});
}
