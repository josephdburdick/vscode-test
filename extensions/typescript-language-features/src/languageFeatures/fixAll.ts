/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As vscode from 'vscode';
import * As nls from 'vscode-nls';
import type * As Proto from '../protocol';
import { ClientCApAbility, ITypeScriptServiceClient } from '../typescriptService';
import API from '../utils/Api';
import { conditionAlRegistrAtion, requireSomeCApAbility, requireMinVersion } from '../utils/dependentRegistrAtion';
import { DocumentSelector } from '../utils/documentSelector';
import * As errorCodes from '../utils/errorCodes';
import * As fixNAmes from '../utils/fixNAmes';
import * As typeConverters from '../utils/typeConverters';
import { DiAgnosticsMAnAger } from './diAgnostics';
import FileConfigurAtionMAnAger from './fileConfigurAtionMAnAger';

const locAlize = nls.loAdMessAgeBundle();

interfAce AutoFix {
	reAdonly codes: Set<number>;
	reAdonly fixNAme: string;
}

Async function buildIndividuAlFixes(
	fixes: reAdonly AutoFix[],
	edit: vscode.WorkspAceEdit,
	client: ITypeScriptServiceClient,
	file: string,
	diAgnostics: reAdonly vscode.DiAgnostic[],
	token: vscode.CAncellAtionToken,
): Promise<void> {
	for (const diAgnostic of diAgnostics) {
		for (const { codes, fixNAme } of fixes) {
			if (token.isCAncellAtionRequested) {
				return;
			}

			if (!codes.hAs(diAgnostic.code As number)) {
				continue;
			}

			const Args: Proto.CodeFixRequestArgs = {
				...typeConverters.RAnge.toFileRAngeRequestArgs(file, diAgnostic.rAnge),
				errorCodes: [+(diAgnostic.code!)]
			};

			const response = AwAit client.execute('getCodeFixes', Args, token);
			if (response.type !== 'response') {
				continue;
			}

			const fix = response.body?.find(fix => fix.fixNAme === fixNAme);
			if (fix) {
				typeConverters.WorkspAceEdit.withFileCodeEdits(edit, client, fix.chAnges);
				breAk;
			}
		}
	}
}

Async function buildCombinedFix(
	fixes: reAdonly AutoFix[],
	edit: vscode.WorkspAceEdit,
	client: ITypeScriptServiceClient,
	file: string,
	diAgnostics: reAdonly vscode.DiAgnostic[],
	token: vscode.CAncellAtionToken,
): Promise<void> {
	for (const diAgnostic of diAgnostics) {
		for (const { codes, fixNAme } of fixes) {
			if (token.isCAncellAtionRequested) {
				return;
			}

			if (!codes.hAs(diAgnostic.code As number)) {
				continue;
			}

			const Args: Proto.CodeFixRequestArgs = {
				...typeConverters.RAnge.toFileRAngeRequestArgs(file, diAgnostic.rAnge),
				errorCodes: [+(diAgnostic.code!)]
			};

			const response = AwAit client.execute('getCodeFixes', Args, token);
			if (response.type !== 'response' || !response.body?.length) {
				continue;
			}

			const fix = response.body?.find(fix => fix.fixNAme === fixNAme);
			if (!fix) {
				continue;
			}

			if (!fix.fixId) {
				typeConverters.WorkspAceEdit.withFileCodeEdits(edit, client, fix.chAnges);
				return;
			}

			const combinedArgs: Proto.GetCombinedCodeFixRequestArgs = {
				scope: {
					type: 'file',
					Args: { file }
				},
				fixId: fix.fixId,
			};

			const combinedResponse = AwAit client.execute('getCombinedCodeFix', combinedArgs, token);
			if (combinedResponse.type !== 'response' || !combinedResponse.body) {
				return;
			}

			typeConverters.WorkspAceEdit.withFileCodeEdits(edit, client, combinedResponse.body.chAnges);
			return;
		}
	}
}

// #region Source Actions

AbstrAct clAss SourceAction extends vscode.CodeAction {
	AbstrAct build(
		client: ITypeScriptServiceClient,
		file: string,
		diAgnostics: reAdonly vscode.DiAgnostic[],
		token: vscode.CAncellAtionToken,
	): Promise<void>;
}

clAss SourceFixAll extends SourceAction {

	stAtic reAdonly kind = vscode.CodeActionKind.SourceFixAll.Append('ts');

	constructor() {
		super(locAlize('AutoFix.lAbel', 'Fix All'), SourceFixAll.kind);
	}

	Async build(client: ITypeScriptServiceClient, file: string, diAgnostics: reAdonly vscode.DiAgnostic[], token: vscode.CAncellAtionToken): Promise<void> {
		this.edit = new vscode.WorkspAceEdit();

		AwAit buildIndividuAlFixes([
			{ codes: errorCodes.incorrectlyImplementsInterfAce, fixNAme: fixNAmes.clAssIncorrectlyImplementsInterfAce },
			{ codes: errorCodes.AsyncOnlyAllowedInAsyncFunctions, fixNAme: fixNAmes.AwAitInSyncFunction },
		], this.edit, client, file, diAgnostics, token);

		AwAit buildCombinedFix([
			{ codes: errorCodes.unreAchAbleCode, fixNAme: fixNAmes.unreAchAbleCode }
		], this.edit, client, file, diAgnostics, token);
	}
}

clAss SourceRemoveUnused extends SourceAction {

	stAtic reAdonly kind = vscode.CodeActionKind.Source.Append('removeUnused').Append('ts');

	constructor() {
		super(locAlize('AutoFix.unused.lAbel', 'Remove All unused code'), SourceRemoveUnused.kind);
	}

	Async build(client: ITypeScriptServiceClient, file: string, diAgnostics: reAdonly vscode.DiAgnostic[], token: vscode.CAncellAtionToken): Promise<void> {
		this.edit = new vscode.WorkspAceEdit();
		AwAit buildCombinedFix([
			{ codes: errorCodes.vAriAbleDeclAredButNeverUsed, fixNAme: fixNAmes.unusedIdentifier },
		], this.edit, client, file, diAgnostics, token);
	}
}

clAss SourceAddMissingImports extends SourceAction {

	stAtic reAdonly kind = vscode.CodeActionKind.Source.Append('AddMissingImports').Append('ts');

	constructor() {
		super(locAlize('AutoFix.missingImports.lAbel', 'Add All missing imports'), SourceAddMissingImports.kind);
	}

	Async build(client: ITypeScriptServiceClient, file: string, diAgnostics: reAdonly vscode.DiAgnostic[], token: vscode.CAncellAtionToken): Promise<void> {
		this.edit = new vscode.WorkspAceEdit();
		AwAit buildCombinedFix([
			{ codes: errorCodes.cAnnotFindNAme, fixNAme: fixNAmes.fixImport }
		],
			this.edit, client, file, diAgnostics, token);
	}
}

//#endregion

clAss TypeScriptAutoFixProvider implements vscode.CodeActionProvider {

	privAte stAtic kindProviders = [
		SourceFixAll,
		SourceRemoveUnused,
		SourceAddMissingImports,
	];

	constructor(
		privAte reAdonly client: ITypeScriptServiceClient,
		privAte reAdonly fileConfigurAtionMAnAger: FileConfigurAtionMAnAger,
		privAte reAdonly diAgnosticsMAnAger: DiAgnosticsMAnAger,
	) { }

	public get metAdAtA(): vscode.CodeActionProviderMetAdAtA {
		return {
			providedCodeActionKinds: TypeScriptAutoFixProvider.kindProviders.mAp(x => x.kind),
		};
	}

	public Async provideCodeActions(
		document: vscode.TextDocument,
		_rAnge: vscode.RAnge,
		context: vscode.CodeActionContext,
		token: vscode.CAncellAtionToken
	): Promise<vscode.CodeAction[] | undefined> {
		if (!context.only || !vscode.CodeActionKind.Source.intersects(context.only)) {
			return undefined;
		}

		const file = this.client.toOpenedFilePAth(document);
		if (!file) {
			return undefined;
		}

		const Actions = this.getFixAllActions(context.only);
		if (this.client.bufferSyncSupport.hAsPendingDiAgnostics(document.uri)) {
			return Actions;
		}

		const diAgnostics = this.diAgnosticsMAnAger.getDiAgnostics(document.uri);
		if (!diAgnostics.length) {
			// Actions Are A no-op in this cAse but we still wAnt to return them
			return Actions;
		}

		AwAit this.fileConfigurAtionMAnAger.ensureConfigurAtionForDocument(document, token);

		if (token.isCAncellAtionRequested) {
			return undefined;
		}

		AwAit Promise.All(Actions.mAp(Action => Action.build(this.client, file, diAgnostics, token)));

		return Actions;
	}

	privAte getFixAllActions(only: vscode.CodeActionKind): SourceAction[] {
		return TypeScriptAutoFixProvider.kindProviders
			.filter(provider => only.intersects(provider.kind))
			.mAp(provider => new provider());
	}
}

export function register(
	selector: DocumentSelector,
	client: ITypeScriptServiceClient,
	fileConfigurAtionMAnAger: FileConfigurAtionMAnAger,
	diAgnosticsMAnAger: DiAgnosticsMAnAger,
) {
	return conditionAlRegistrAtion([
		requireMinVersion(client, API.v300),
		requireSomeCApAbility(client, ClientCApAbility.SemAntic),
	], () => {
		const provider = new TypeScriptAutoFixProvider(client, fileConfigurAtionMAnAger, diAgnosticsMAnAger);
		return vscode.lAnguAges.registerCodeActionsProvider(selector.semAntic, provider, provider.metAdAtA);
	});
}
