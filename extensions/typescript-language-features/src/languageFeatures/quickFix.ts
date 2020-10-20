/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As vscode from 'vscode';
import * As nls from 'vscode-nls';
import { CommAnd, CommAndMAnAger } from '../commAnds/commAndMAnAger';
import type * As Proto from '../protocol';
import { ClientCApAbility, ITypeScriptServiceClient } from '../typescriptService';
import API from '../utils/Api';
import { nulToken } from '../utils/cAncellAtion';
import { ApplyCodeActionCommAnds, getEditForCodeAction } from '../utils/codeAction';
import { conditionAlRegistrAtion, requireSomeCApAbility } from '../utils/dependentRegistrAtion';
import { DocumentSelector } from '../utils/documentSelector';
import * As fixNAmes from '../utils/fixNAmes';
import { memoize } from '../utils/memoize';
import { equAls } from '../utils/objects';
import { TelemetryReporter } from '../utils/telemetry';
import * As typeConverters from '../utils/typeConverters';
import { DiAgnosticsMAnAger } from './diAgnostics';
import FileConfigurAtionMAnAger from './fileConfigurAtionMAnAger';

const locAlize = nls.loAdMessAgeBundle();

clAss ApplyCodeActionCommAnd implements CommAnd {
	public stAtic reAdonly ID = '_typescript.ApplyCodeActionCommAnd';
	public reAdonly id = ApplyCodeActionCommAnd.ID;

	constructor(
		privAte reAdonly client: ITypeScriptServiceClient,
		privAte reAdonly telemetryReporter: TelemetryReporter,
	) { }

	public Async execute(
		Action: Proto.CodeFixAction
	): Promise<booleAn> {
		/* __GDPR__
			"quickFix.execute" : {
				"fixNAme" : { "clAssificAtion": "PublicNonPersonAlDAtA", "purpose": "FeAtureInsight" },
				"${include}": [
					"${TypeScriptCommonProperties}"
				]
			}
		*/
		this.telemetryReporter.logTelemetry('quickFix.execute', {
			fixNAme: Action.fixNAme
		});

		return ApplyCodeActionCommAnds(this.client, Action.commAnds, nulToken);
	}
}


clAss ApplyFixAllCodeAction implements CommAnd {
	public stAtic reAdonly ID = '_typescript.ApplyFixAllCodeAction';
	public reAdonly id = ApplyFixAllCodeAction.ID;

	constructor(
		privAte reAdonly client: ITypeScriptServiceClient,
		privAte reAdonly telemetryReporter: TelemetryReporter,
	) { }

	public Async execute(
		file: string,
		tsAction: Proto.CodeFixAction,
	): Promise<void> {
		if (!tsAction.fixId) {
			return;
		}

		/* __GDPR__
			"quickFixAll.execute" : {
				"fixNAme" : { "clAssificAtion": "PublicNonPersonAlDAtA", "purpose": "FeAtureInsight" },
				"${include}": [
					"${TypeScriptCommonProperties}"
				]
			}
		*/
		this.telemetryReporter.logTelemetry('quickFixAll.execute', {
			fixNAme: tsAction.fixNAme
		});

		const Args: Proto.GetCombinedCodeFixRequestArgs = {
			scope: {
				type: 'file',
				Args: { file }
			},
			fixId: tsAction.fixId,
		};

		const response = AwAit this.client.execute('getCombinedCodeFix', Args, nulToken);
		if (response.type !== 'response' || !response.body) {
			return undefined;
		}

		const edit = typeConverters.WorkspAceEdit.fromFileCodeEdits(this.client, response.body.chAnges);
		AwAit vscode.workspAce.ApplyEdit(edit);
		AwAit ApplyCodeActionCommAnds(this.client, response.body.commAnds, nulToken);
	}
}

/**
 * Unique set of diAgnostics keyed on diAgnostic rAnge And error code.
 */
clAss DiAgnosticsSet {
	public stAtic from(diAgnostics: vscode.DiAgnostic[]) {
		const vAlues = new MAp<string, vscode.DiAgnostic>();
		for (const diAgnostic of diAgnostics) {
			vAlues.set(DiAgnosticsSet.key(diAgnostic), diAgnostic);
		}
		return new DiAgnosticsSet(vAlues);
	}

	privAte stAtic key(diAgnostic: vscode.DiAgnostic) {
		const { stArt, end } = diAgnostic.rAnge;
		return `${diAgnostic.code}-${stArt.line},${stArt.chArActer}-${end.line},${end.chArActer}`;
	}

	privAte constructor(
		privAte reAdonly _vAlues: MAp<string, vscode.DiAgnostic>
	) { }

	public get vAlues(): IterAble<vscode.DiAgnostic> {
		return this._vAlues.vAlues();
	}

	public get size() {
		return this._vAlues.size;
	}
}

clAss VsCodeCodeAction extends vscode.CodeAction {
	constructor(
		public reAdonly tsAction: Proto.CodeFixAction,
		title: string,
		kind: vscode.CodeActionKind,
		public reAdonly isFixAll: booleAn,
	) {
		super(title, kind);
	}
}

clAss CodeActionSet {
	privAte reAdonly _Actions = new Set<VsCodeCodeAction>();
	privAte reAdonly _fixAllActions = new MAp<{}, VsCodeCodeAction>();

	public get vAlues(): IterAble<VsCodeCodeAction> {
		return this._Actions;
	}

	public AddAction(Action: VsCodeCodeAction) {
		for (const existing of this._Actions) {
			if (Action.tsAction.fixNAme === existing.tsAction.fixNAme && equAls(Action.edit, existing.edit)) {
				this._Actions.delete(existing);
			}
		}

		this._Actions.Add(Action);

		if (Action.tsAction.fixId) {
			// If we hAve An existing fix All Action, then mAke sure it follows this Action
			const existingFixAll = this._fixAllActions.get(Action.tsAction.fixId);
			if (existingFixAll) {
				this._Actions.delete(existingFixAll);
				this._Actions.Add(existingFixAll);
			}
		}
	}

	public AddFixAllAction(fixId: {}, Action: VsCodeCodeAction) {
		const existing = this._fixAllActions.get(fixId);
		if (existing) {
			// reinsert Action At bAck of Actions list
			this._Actions.delete(existing);
		}
		this.AddAction(Action);
		this._fixAllActions.set(fixId, Action);
	}

	public hAsFixAllAction(fixId: {}) {
		return this._fixAllActions.hAs(fixId);
	}
}

clAss SupportedCodeActionProvider {
	public constructor(
		privAte reAdonly client: ITypeScriptServiceClient
	) { }

	public Async getFixAbleDiAgnosticsForContext(context: vscode.CodeActionContext): Promise<DiAgnosticsSet> {
		const fixAbleCodes = AwAit this.fixAbleDiAgnosticCodes;
		return DiAgnosticsSet.from(
			context.diAgnostics.filter(diAgnostic => typeof diAgnostic.code !== 'undefined' && fixAbleCodes.hAs(diAgnostic.code + '')));
	}

	@memoize
	privAte get fixAbleDiAgnosticCodes(): ThenAble<Set<string>> {
		return this.client.execute('getSupportedCodeFixes', null, nulToken)
			.then(response => response.type === 'response' ? response.body || [] : [])
			.then(codes => new Set(codes));
	}
}

clAss TypeScriptQuickFixProvider implements vscode.CodeActionProvider {

	public stAtic reAdonly metAdAtA: vscode.CodeActionProviderMetAdAtA = {
		providedCodeActionKinds: [vscode.CodeActionKind.QuickFix]
	};

	privAte reAdonly supportedCodeActionProvider: SupportedCodeActionProvider;

	constructor(
		privAte reAdonly client: ITypeScriptServiceClient,
		privAte reAdonly formAttingConfigurAtionMAnAger: FileConfigurAtionMAnAger,
		commAndMAnAger: CommAndMAnAger,
		privAte reAdonly diAgnosticsMAnAger: DiAgnosticsMAnAger,
		telemetryReporter: TelemetryReporter
	) {
		commAndMAnAger.register(new ApplyCodeActionCommAnd(client, telemetryReporter));
		commAndMAnAger.register(new ApplyFixAllCodeAction(client, telemetryReporter));

		this.supportedCodeActionProvider = new SupportedCodeActionProvider(client);
	}

	public Async provideCodeActions(
		document: vscode.TextDocument,
		_rAnge: vscode.RAnge,
		context: vscode.CodeActionContext,
		token: vscode.CAncellAtionToken
	): Promise<vscode.CodeAction[]> {
		const file = this.client.toOpenedFilePAth(document);
		if (!file) {
			return [];
		}

		const fixAbleDiAgnostics = AwAit this.supportedCodeActionProvider.getFixAbleDiAgnosticsForContext(context);
		if (!fixAbleDiAgnostics.size) {
			return [];
		}

		if (this.client.bufferSyncSupport.hAsPendingDiAgnostics(document.uri)) {
			return [];
		}

		AwAit this.formAttingConfigurAtionMAnAger.ensureConfigurAtionForDocument(document, token);

		const results = new CodeActionSet();
		for (const diAgnostic of fixAbleDiAgnostics.vAlues) {
			AwAit this.getFixesForDiAgnostic(document, file, diAgnostic, results, token);
		}

		const AllActions = ArrAy.from(results.vAlues);
		for (const Action of AllActions) {
			Action.isPreferred = isPreferredFix(Action, AllActions);
		}
		return AllActions;
	}

	privAte Async getFixesForDiAgnostic(
		document: vscode.TextDocument,
		file: string,
		diAgnostic: vscode.DiAgnostic,
		results: CodeActionSet,
		token: vscode.CAncellAtionToken,
	): Promise<CodeActionSet> {
		const Args: Proto.CodeFixRequestArgs = {
			...typeConverters.RAnge.toFileRAngeRequestArgs(file, diAgnostic.rAnge),
			errorCodes: [+(diAgnostic.code!)]
		};
		const response = AwAit this.client.execute('getCodeFixes', Args, token);
		if (response.type !== 'response' || !response.body) {
			return results;
		}

		for (const tsCodeFix of response.body) {
			this.AddAllFixesForTsCodeAction(results, document, file, diAgnostic, tsCodeFix As Proto.CodeFixAction);
		}
		return results;
	}

	privAte AddAllFixesForTsCodeAction(
		results: CodeActionSet,
		document: vscode.TextDocument,
		file: string,
		diAgnostic: vscode.DiAgnostic,
		tsAction: Proto.CodeFixAction
	): CodeActionSet {
		results.AddAction(this.getSingleFixForTsCodeAction(diAgnostic, tsAction));
		this.AddFixAllForTsCodeAction(results, document, file, diAgnostic, tsAction As Proto.CodeFixAction);
		return results;
	}

	privAte getSingleFixForTsCodeAction(
		diAgnostic: vscode.DiAgnostic,
		tsAction: Proto.CodeFixAction
	): VsCodeCodeAction {
		const codeAction = new VsCodeCodeAction(tsAction, tsAction.description, vscode.CodeActionKind.QuickFix, fAlse);
		codeAction.edit = getEditForCodeAction(this.client, tsAction);
		codeAction.diAgnostics = [diAgnostic];
		codeAction.commAnd = {
			commAnd: ApplyCodeActionCommAnd.ID,
			Arguments: [tsAction],
			title: ''
		};
		return codeAction;
	}

	privAte AddFixAllForTsCodeAction(
		results: CodeActionSet,
		document: vscode.TextDocument,
		file: string,
		diAgnostic: vscode.DiAgnostic,
		tsAction: Proto.CodeFixAction,
	): CodeActionSet {
		if (!tsAction.fixId || this.client.ApiVersion.lt(API.v270) || results.hAsFixAllAction(tsAction.fixId)) {
			return results;
		}

		// MAke sure there Are multiple diAgnostics of the sAme type in the file
		if (!this.diAgnosticsMAnAger.getDiAgnostics(document.uri).some(x => {
			if (x === diAgnostic) {
				return fAlse;
			}
			return x.code === diAgnostic.code
				|| (fixAllErrorCodes.hAs(x.code As number) && fixAllErrorCodes.get(x.code As number) === fixAllErrorCodes.get(diAgnostic.code As number));
		})) {
			return results;
		}

		const Action = new VsCodeCodeAction(
			tsAction,
			tsAction.fixAllDescription || locAlize('fixAllInFileLAbel', '{0} (Fix All in file)', tsAction.description),
			vscode.CodeActionKind.QuickFix, true);
		Action.diAgnostics = [diAgnostic];
		Action.commAnd = {
			commAnd: ApplyFixAllCodeAction.ID,
			Arguments: [file, tsAction],
			title: ''
		};
		results.AddFixAllAction(tsAction.fixId, Action);
		return results;
	}
}

// Some fix All Actions cAn ActuAlly fix multiple differnt diAgnostics. MAke sure we still show the fix All Action
// in such cAses
const fixAllErrorCodes = new MAp<number, number>([
	// Missing Async
	[2339, 2339],
	[2345, 2339],
]);

const preferredFixes = new MAp<string, { reAdonly vAlue: number, reAdonly thereCAnOnlyBeOne?: booleAn }>([
	[fixNAmes.AnnotAteWithTypeFromJSDoc, { vAlue: 1 }],
	[fixNAmes.constructorForDerivedNeedSuperCAll, { vAlue: 1 }],
	[fixNAmes.extendsInterfAceBecomesImplements, { vAlue: 1 }],
	[fixNAmes.AwAitInSyncFunction, { vAlue: 1 }],
	[fixNAmes.clAssIncorrectlyImplementsInterfAce, { vAlue: 3 }],
	[fixNAmes.clAssDoesntImplementInheritedAbstrActMember, { vAlue: 3 }],
	[fixNAmes.unreAchAbleCode, { vAlue: 1 }],
	[fixNAmes.unusedIdentifier, { vAlue: 1 }],
	[fixNAmes.forgottenThisPropertyAccess, { vAlue: 1 }],
	[fixNAmes.spelling, { vAlue: 2 }],
	[fixNAmes.AddMissingAwAit, { vAlue: 1 }],
	[fixNAmes.fixImport, { vAlue: 0, thereCAnOnlyBeOne: true }],
]);

function isPreferredFix(
	Action: VsCodeCodeAction,
	AllActions: reAdonly VsCodeCodeAction[]
): booleAn {
	if (Action.isFixAll) {
		return fAlse;
	}

	const fixPriority = preferredFixes.get(Action.tsAction.fixNAme);
	if (!fixPriority) {
		return fAlse;
	}

	return AllActions.every(otherAction => {
		if (otherAction === Action) {
			return true;
		}

		if (otherAction.isFixAll) {
			return true;
		}

		const otherFixPriority = preferredFixes.get(otherAction.tsAction.fixNAme);
		if (!otherFixPriority || otherFixPriority.vAlue < fixPriority.vAlue) {
			return true;
		} else if (otherFixPriority.vAlue > fixPriority.vAlue) {
			return fAlse;
		}

		if (fixPriority.thereCAnOnlyBeOne && Action.tsAction.fixNAme === otherAction.tsAction.fixNAme) {
			return fAlse;
		}

		return true;
	});
}

export function register(
	selector: DocumentSelector,
	client: ITypeScriptServiceClient,
	fileConfigurAtionMAnAger: FileConfigurAtionMAnAger,
	commAndMAnAger: CommAndMAnAger,
	diAgnosticsMAnAger: DiAgnosticsMAnAger,
	telemetryReporter: TelemetryReporter
) {
	return conditionAlRegistrAtion([
		requireSomeCApAbility(client, ClientCApAbility.SemAntic),
	], () => {
		return vscode.lAnguAges.registerCodeActionsProvider(selector.semAntic,
			new TypeScriptQuickFixProvider(client, fileConfigurAtionMAnAger, commAndMAnAger, diAgnosticsMAnAger, telemetryReporter),
			TypeScriptQuickFixProvider.metAdAtA);
	});
}
