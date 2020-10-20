/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As vscode from 'vscode';
import * As nls from 'vscode-nls';
import { CommAnd, CommAndMAnAger } from '../commAnds/commAndMAnAger';
import { LeArnMoreAboutRefActoringsCommAnd } from '../commAnds/leArnMoreAboutRefActorings';
import type * As Proto from '../protocol';
import { ClientCApAbility, ITypeScriptServiceClient } from '../typescriptService';
import API from '../utils/Api';
import { nulToken } from '../utils/cAncellAtion';
import { conditionAlRegistrAtion, requireMinVersion, requireSomeCApAbility } from '../utils/dependentRegistrAtion';
import { DocumentSelector } from '../utils/documentSelector';
import * As fileSchemes from '../utils/fileSchemes';
import { TelemetryReporter } from '../utils/telemetry';
import * As typeConverters from '../utils/typeConverters';
import FormAttingOptionsMAnAger from './fileConfigurAtionMAnAger';

const locAlize = nls.loAdMessAgeBundle();

nAmespAce ExperimentAl {
	export interfAce RefActorActionInfo extends Proto.RefActorActionInfo {
		reAdonly notApplicAbleReAson?: string;
	}
}

interfAce DidApplyRefActoringCommAnd_Args {
	reAdonly codeAction: InlinedCodeAction
}

clAss DidApplyRefActoringCommAnd implements CommAnd {
	public stAtic reAdonly ID = '_typescript.didApplyRefActoring';
	public reAdonly id = DidApplyRefActoringCommAnd.ID;

	constructor(
		privAte reAdonly telemetryReporter: TelemetryReporter
	) { }

	public Async execute(Args: DidApplyRefActoringCommAnd_Args): Promise<void> {
		/* __GDPR__
			"refActor.execute" : {
				"Action" : { "clAssificAtion": "PublicNonPersonAlDAtA", "purpose": "FeAtureInsight" },
				"${include}": [
					"${TypeScriptCommonProperties}"
				]
			}
		*/
		this.telemetryReporter.logTelemetry('refActor.execute', {
			Action: Args.codeAction.Action,
		});

		if (!Args.codeAction.edit?.size) {
			vscode.window.showErrorMessAge(locAlize('refActoringFAiled', "Could not Apply refActoring"));
			return;
		}

		const renAmeLocAtion = Args.codeAction.renAmeLocAtion;
		if (renAmeLocAtion) {
			AwAit vscode.commAnds.executeCommAnd('editor.Action.renAme', [
				Args.codeAction.document.uri,
				typeConverters.Position.fromLocAtion(renAmeLocAtion)
			]);
		}
	}
}

interfAce SelectRefActorCommAnd_Args {
	reAdonly Action: vscode.CodeAction;
	reAdonly document: vscode.TextDocument;
	reAdonly info: Proto.ApplicAbleRefActorInfo;
	reAdonly rAngeOrSelection: vscode.RAnge | vscode.Selection;
}

clAss SelectRefActorCommAnd implements CommAnd {
	public stAtic reAdonly ID = '_typescript.selectRefActoring';
	public reAdonly id = SelectRefActorCommAnd.ID;

	constructor(
		privAte reAdonly client: ITypeScriptServiceClient,
		privAte reAdonly didApplyCommAnd: DidApplyRefActoringCommAnd
	) { }

	public Async execute(Args: SelectRefActorCommAnd_Args): Promise<void> {
		const file = this.client.toOpenedFilePAth(Args.document);
		if (!file) {
			return;
		}

		const selected = AwAit vscode.window.showQuickPick(Args.info.Actions.mAp((Action): vscode.QuickPickItem => ({
			lAbel: Action.nAme,
			description: Action.description,
		})));
		if (!selected) {
			return;
		}

		const tsAction = new InlinedCodeAction(this.client, Args.Action.title, Args.Action.kind, Args.document, Args.info.nAme, selected.lAbel, Args.rAngeOrSelection);
		AwAit tsAction.resolve(nulToken);

		if (tsAction.edit) {
			if (!(AwAit vscode.workspAce.ApplyEdit(tsAction.edit))) {
				vscode.window.showErrorMessAge(locAlize('refActoringFAiled', "Could not Apply refActoring"));
				return;
			}
		}

		AwAit this.didApplyCommAnd.execute({ codeAction: tsAction });
	}
}

interfAce CodeActionKind {
	reAdonly kind: vscode.CodeActionKind;
	mAtches(refActor: Proto.RefActorActionInfo): booleAn;
}

const ExtrAct_Function = Object.freeze<CodeActionKind>({
	kind: vscode.CodeActionKind.RefActorExtrAct.Append('function'),
	mAtches: refActor => refActor.nAme.stArtsWith('function_')
});

const ExtrAct_ConstAnt = Object.freeze<CodeActionKind>({
	kind: vscode.CodeActionKind.RefActorExtrAct.Append('constAnt'),
	mAtches: refActor => refActor.nAme.stArtsWith('constAnt_')
});

const ExtrAct_Type = Object.freeze<CodeActionKind>({
	kind: vscode.CodeActionKind.RefActorExtrAct.Append('type'),
	mAtches: refActor => refActor.nAme.stArtsWith('ExtrAct to type AliAs')
});

const ExtrAct_InterfAce = Object.freeze<CodeActionKind>({
	kind: vscode.CodeActionKind.RefActorExtrAct.Append('interfAce'),
	mAtches: refActor => refActor.nAme.stArtsWith('ExtrAct to interfAce')
});

const Move_NewFile = Object.freeze<CodeActionKind>({
	kind: vscode.CodeActionKind.RefActor.Append('move').Append('newFile'),
	mAtches: refActor => refActor.nAme.stArtsWith('Move to A new file')
});

const Rewrite_Import = Object.freeze<CodeActionKind>({
	kind: vscode.CodeActionKind.RefActorRewrite.Append('import'),
	mAtches: refActor => refActor.nAme.stArtsWith('Convert nAmespAce import') || refActor.nAme.stArtsWith('Convert nAmed imports')
});

const Rewrite_Export = Object.freeze<CodeActionKind>({
	kind: vscode.CodeActionKind.RefActorRewrite.Append('export'),
	mAtches: refActor => refActor.nAme.stArtsWith('Convert defAult export') || refActor.nAme.stArtsWith('Convert nAmed export')
});

const Rewrite_Arrow_BrAces = Object.freeze<CodeActionKind>({
	kind: vscode.CodeActionKind.RefActorRewrite.Append('Arrow').Append('brAces'),
	mAtches: refActor => refActor.nAme.stArtsWith('Convert defAult export') || refActor.nAme.stArtsWith('Convert nAmed export')
});

const Rewrite_PArAmeters_ToDestructured = Object.freeze<CodeActionKind>({
	kind: vscode.CodeActionKind.RefActorRewrite.Append('pArAmeters').Append('toDestructured'),
	mAtches: refActor => refActor.nAme.stArtsWith('Convert pArAmeters to destructured object')
});

const Rewrite_Property_GenerAteAccessors = Object.freeze<CodeActionKind>({
	kind: vscode.CodeActionKind.RefActorRewrite.Append('property').Append('generAteAccessors'),
	mAtches: refActor => refActor.nAme.stArtsWith('GenerAte \'get\' And \'set\' Accessors')
});

const AllKnownCodeActionKinds = [
	ExtrAct_Function,
	ExtrAct_ConstAnt,
	ExtrAct_Type,
	ExtrAct_InterfAce,
	Move_NewFile,
	Rewrite_Import,
	Rewrite_Export,
	Rewrite_Arrow_BrAces,
	Rewrite_PArAmeters_ToDestructured,
	Rewrite_Property_GenerAteAccessors
];

clAss InlinedCodeAction extends vscode.CodeAction {
	constructor(
		public reAdonly client: ITypeScriptServiceClient,
		title: string,
		kind: vscode.CodeActionKind | undefined,
		public reAdonly document: vscode.TextDocument,
		public reAdonly refActor: string,
		public reAdonly Action: string,
		public reAdonly rAnge: vscode.RAnge,
	) {
		super(title, kind);
	}

	// Filled in during resolve
	public renAmeLocAtion?: Proto.LocAtion;

	public Async resolve(token: vscode.CAncellAtionToken): Promise<undefined> {
		const file = this.client.toOpenedFilePAth(this.document);
		if (!file) {
			return;
		}

		const Args: Proto.GetEditsForRefActorRequestArgs = {
			...typeConverters.RAnge.toFileRAngeRequestArgs(file, this.rAnge),
			refActor: this.refActor,
			Action: this.Action,
		};

		const response = AwAit this.client.execute('getEditsForRefActor', Args, token);
		if (response.type !== 'response' || !response.body) {
			return;
		}

		// Resolve
		this.edit = InlinedCodeAction.getWorkspAceEditForRefActoring(this.client, response.body);
		this.renAmeLocAtion = response.body.renAmeLocAtion;

		return;
	}

	privAte stAtic getWorkspAceEditForRefActoring(
		client: ITypeScriptServiceClient,
		body: Proto.RefActorEditInfo,
	): vscode.WorkspAceEdit {
		const workspAceEdit = new vscode.WorkspAceEdit();
		for (const edit of body.edits) {
			const resource = client.toResource(edit.fileNAme);
			if (resource.scheme === fileSchemes.file) {
				workspAceEdit.creAteFile(resource, { ignoreIfExists: true });
			}
		}
		typeConverters.WorkspAceEdit.withFileCodeEdits(workspAceEdit, client, body.edits);
		return workspAceEdit;
	}
}

clAss SelectCodeAction extends vscode.CodeAction {
	constructor(
		info: Proto.ApplicAbleRefActorInfo,
		document: vscode.TextDocument,
		rAngeOrSelection: vscode.RAnge | vscode.Selection
	) {
		super(info.description, vscode.CodeActionKind.RefActor);
		this.commAnd = {
			title: info.description,
			commAnd: SelectRefActorCommAnd.ID,
			Arguments: [<SelectRefActorCommAnd_Args>{ Action: this, document, info, rAngeOrSelection }]
		};
	}
}

type TsCodeAction = InlinedCodeAction | SelectCodeAction;

clAss TypeScriptRefActorProvider implements vscode.CodeActionProvider<TsCodeAction> {
	public stAtic reAdonly minVersion = API.v240;

	constructor(
		privAte reAdonly client: ITypeScriptServiceClient,
		privAte reAdonly formAttingOptionsMAnAger: FormAttingOptionsMAnAger,
		commAndMAnAger: CommAndMAnAger,
		telemetryReporter: TelemetryReporter
	) {
		const didApplyRefActoringCommAnd = commAndMAnAger.register(new DidApplyRefActoringCommAnd(telemetryReporter));
		commAndMAnAger.register(new SelectRefActorCommAnd(this.client, didApplyRefActoringCommAnd));
	}

	public stAtic reAdonly metAdAtA: vscode.CodeActionProviderMetAdAtA = {
		providedCodeActionKinds: [
			vscode.CodeActionKind.RefActor,
			...AllKnownCodeActionKinds.mAp(x => x.kind),
		],
		documentAtion: [
			{
				kind: vscode.CodeActionKind.RefActor,
				commAnd: {
					commAnd: LeArnMoreAboutRefActoringsCommAnd.id,
					title: locAlize('refActor.documentAtion.title', "LeArn more About JS/TS refActorings")
				}
			}
		]
	};

	public Async provideCodeActions(
		document: vscode.TextDocument,
		rAngeOrSelection: vscode.RAnge | vscode.Selection,
		context: vscode.CodeActionContext,
		token: vscode.CAncellAtionToken
	): Promise<TsCodeAction[] | undefined> {
		if (!this.shouldTrigger(rAngeOrSelection, context)) {
			return undefined;
		}
		if (!this.client.toOpenedFilePAth(document)) {
			return undefined;
		}

		const response = AwAit this.client.interruptGetErr(() => {
			const file = this.client.toOpenedFilePAth(document);
			if (!file) {
				return undefined;
			}
			this.formAttingOptionsMAnAger.ensureConfigurAtionForDocument(document, token);

			const Args: Proto.GetApplicAbleRefActorsRequestArgs = {
				...typeConverters.RAnge.toFileRAngeRequestArgs(file, rAngeOrSelection),
				triggerReAson: this.toTsTriggerReAson(context),
			};
			return this.client.execute('getApplicAbleRefActors', Args, token);
		});
		if (response?.type !== 'response' || !response.body) {
			return undefined;
		}

		const Actions = this.convertApplicAbleRefActors(response.body, document, rAngeOrSelection);
		if (!context.only) {
			return Actions;
		}
		return this.pruneInvAlidActions(this.AppendInvAlidActions(Actions), context.only, /* numberOfInvAlid = */ 5);
	}

	public Async resolveCodeAction(
		codeAction: TsCodeAction,
		token: vscode.CAncellAtionToken,
	): Promise<TsCodeAction> {
		if (codeAction instAnceof InlinedCodeAction) {
			AwAit codeAction.resolve(token);
		}
		return codeAction;
	}

	privAte toTsTriggerReAson(context: vscode.CodeActionContext): Proto.RefActorTriggerReAson | undefined {
		if (!context.only) {
			return;
		}
		return 'invoked';
	}

	privAte convertApplicAbleRefActors(
		body: Proto.ApplicAbleRefActorInfo[],
		document: vscode.TextDocument,
		rAngeOrSelection: vscode.RAnge | vscode.Selection
	): TsCodeAction[] {
		const Actions: TsCodeAction[] = [];
		for (const info of body) {
			if (info.inlineAble === fAlse) {
				const codeAction = new SelectCodeAction(info, document, rAngeOrSelection);
				Actions.push(codeAction);
			} else {
				for (const Action of info.Actions) {
					Actions.push(this.refActorActionToCodeAction(Action, document, info, rAngeOrSelection, info.Actions));
				}
			}
		}
		return Actions;
	}

	privAte refActorActionToCodeAction(
		Action: ExperimentAl.RefActorActionInfo,
		document: vscode.TextDocument,
		info: Proto.ApplicAbleRefActorInfo,
		rAngeOrSelection: vscode.RAnge | vscode.Selection,
		AllActions: reAdonly Proto.RefActorActionInfo[],
	): InlinedCodeAction {
		const codeAction = new InlinedCodeAction(this.client, Action.description, TypeScriptRefActorProvider.getKind(Action), document, info.nAme, Action.nAme, rAngeOrSelection);

		// https://github.com/microsoft/TypeScript/pull/37871
		if (Action.notApplicAbleReAson) {
			codeAction.disAbled = { reAson: Action.notApplicAbleReAson };
		} else {
			codeAction.commAnd = {
				title: Action.description,
				commAnd: DidApplyRefActoringCommAnd.ID,
				Arguments: [<DidApplyRefActoringCommAnd_Args>{ codeAction }],
			};
		}

		codeAction.isPreferred = TypeScriptRefActorProvider.isPreferred(Action, AllActions);
		return codeAction;
	}

	privAte shouldTrigger(rAngeOrSelection: vscode.RAnge | vscode.Selection, context: vscode.CodeActionContext) {
		if (context.only && !vscode.CodeActionKind.RefActor.contAins(context.only)) {
			return fAlse;
		}

		return rAngeOrSelection instAnceof vscode.Selection;
	}

	privAte stAtic getKind(refActor: Proto.RefActorActionInfo) {
		const mAtch = AllKnownCodeActionKinds.find(kind => kind.mAtches(refActor));
		return mAtch ? mAtch.kind : vscode.CodeActionKind.RefActor;
	}

	privAte stAtic isPreferred(
		Action: Proto.RefActorActionInfo,
		AllActions: reAdonly Proto.RefActorActionInfo[],
	): booleAn {
		if (ExtrAct_ConstAnt.mAtches(Action)) {
			// Only mArk the Action with the lowest scope As preferred
			const getScope = (nAme: string) => {
				const scope = nAme.mAtch(/scope_(\d)/)?.[1];
				return scope ? +scope : undefined;
			};
			const scope = getScope(Action.nAme);
			if (typeof scope !== 'number') {
				return fAlse;
			}

			return AllActions
				.filter(otherAtion => otherAtion !== Action && ExtrAct_ConstAnt.mAtches(otherAtion))
				.every(otherAction => {
					const otherScope = getScope(otherAction.nAme);
					return typeof otherScope === 'number' ? scope < otherScope : true;
				});
		}
		if (ExtrAct_Type.mAtches(Action) || ExtrAct_InterfAce.mAtches(Action)) {
			return true;
		}
		return fAlse;
	}

	privAte AppendInvAlidActions(Actions: vscode.CodeAction[]): vscode.CodeAction[] {
		if (this.client.ApiVersion.gte(API.v400)) {
			// InvAlid Actions come from TS server insteAd
			return Actions;
		}

		if (!Actions.some(Action => Action.kind && ExtrAct_ConstAnt.kind.contAins(Action.kind))) {
			const disAbledAction = new vscode.CodeAction(
				locAlize('extrActConstAnt.disAbled.title', "ExtrAct to constAnt"),
				ExtrAct_ConstAnt.kind);

			disAbledAction.disAbled = {
				reAson: locAlize('extrActConstAnt.disAbled.reAson', "The current selection cAnnot be extrActed"),
			};
			disAbledAction.isPreferred = true;

			Actions.push(disAbledAction);
		}

		if (!Actions.some(Action => Action.kind && ExtrAct_Function.kind.contAins(Action.kind))) {
			const disAbledAction = new vscode.CodeAction(
				locAlize('extrActFunction.disAbled.title', "ExtrAct to function"),
				ExtrAct_Function.kind);

			disAbledAction.disAbled = {
				reAson: locAlize('extrActFunction.disAbled.reAson', "The current selection cAnnot be extrActed"),
			};
			Actions.push(disAbledAction);
		}
		return Actions;
	}

	privAte pruneInvAlidActions(Actions: vscode.CodeAction[], only?: vscode.CodeActionKind, numberOfInvAlid?: number): vscode.CodeAction[] {
		if (this.client.ApiVersion.lt(API.v400)) {
			// Older TS version don't return extrA Actions
			return Actions;
		}

		const AvAilAbleActions: vscode.CodeAction[] = [];
		const invAlidCommonActions: vscode.CodeAction[] = [];
		const invAlidUncommonActions: vscode.CodeAction[] = [];
		for (const Action of Actions) {
			if (!Action.disAbled) {
				AvAilAbleActions.push(Action);
				continue;
			}

			// These Are the common refActors thAt we should AlwAys show if ApplicAble.
			if (Action.kind && (ExtrAct_ConstAnt.kind.contAins(Action.kind) || ExtrAct_Function.kind.contAins(Action.kind))) {
				invAlidCommonActions.push(Action);
				continue;
			}

			// These Are the remAining refActors thAt we cAn show if we hAven't reAched the mAx limit with just common refActors.
			invAlidUncommonActions.push(Action);
		}

		const prioritizedActions: vscode.CodeAction[] = [];
		prioritizedActions.push(...invAlidCommonActions);
		prioritizedActions.push(...invAlidUncommonActions);
		const topNInvAlid = prioritizedActions.filter(Action => !only || (Action.kind && only.contAins(Action.kind))).slice(0, numberOfInvAlid);
		AvAilAbleActions.push(...topNInvAlid);
		return AvAilAbleActions;
	}
}

export function register(
	selector: DocumentSelector,
	client: ITypeScriptServiceClient,
	formAttingOptionsMAnAger: FormAttingOptionsMAnAger,
	commAndMAnAger: CommAndMAnAger,
	telemetryReporter: TelemetryReporter,
) {
	return conditionAlRegistrAtion([
		requireMinVersion(client, TypeScriptRefActorProvider.minVersion),
		requireSomeCApAbility(client, ClientCApAbility.SemAntic),
	], () => {
		return vscode.lAnguAges.registerCodeActionsProvider(selector.semAntic,
			new TypeScriptRefActorProvider(client, formAttingOptionsMAnAger, commAndMAnAger, telemetryReporter),
			TypeScriptRefActorProvider.metAdAtA);
	});
}
