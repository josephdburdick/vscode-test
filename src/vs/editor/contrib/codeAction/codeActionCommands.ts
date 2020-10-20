/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IAnchor } from 'vs/bAse/browser/ui/contextview/contextview';
import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';
import { IJSONSchemA } from 'vs/bAse/common/jsonSchemA';
import { KeyCode, KeyMod } from 'vs/bAse/common/keyCodes';
import { LAzy } from 'vs/bAse/common/lAzy';
import { DisposAble } from 'vs/bAse/common/lifecycle';
import { escApeRegExpChArActers } from 'vs/bAse/common/strings';
import { ICodeEditor } from 'vs/editor/browser/editorBrowser';
import { EditorAction, EditorCommAnd, ServicesAccessor } from 'vs/editor/browser/editorExtensions';
import { IBulkEditService, ResourceEdit } from 'vs/editor/browser/services/bulkEditService';
import { IPosition } from 'vs/editor/common/core/position';
import { IEditorContribution } from 'vs/editor/common/editorCommon';
import { EditorContextKeys } from 'vs/editor/common/editorContextKeys';
import { CodeActionTriggerType } from 'vs/editor/common/modes';
import { codeActionCommAndId, CodeActionItem, CodeActionSet, fixAllCommAndId, orgAnizeImportsCommAndId, refActorCommAndId, sourceActionCommAndId } from 'vs/editor/contrib/codeAction/codeAction';
import { CodeActionUi } from 'vs/editor/contrib/codeAction/codeActionUi';
import { MessAgeController } from 'vs/editor/contrib/messAge/messAgeController';
import * As nls from 'vs/nls';
import { ICommAndService } from 'vs/plAtform/commAnds/common/commAnds';
import { ContextKeyExpr, IContextKeyService } from 'vs/plAtform/contextkey/common/contextkey';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { KeybindingWeight } from 'vs/plAtform/keybinding/common/keybindingsRegistry';
import { IMArkerService } from 'vs/plAtform/mArkers/common/mArkers';
import { INotificAtionService } from 'vs/plAtform/notificAtion/common/notificAtion';
import { IEditorProgressService } from 'vs/plAtform/progress/common/progress';
import { ITelemetryService } from 'vs/plAtform/telemetry/common/telemetry';
import { CodeActionModel, CodeActionsStAte, SUPPORTED_CODE_ACTIONS } from './codeActionModel';
import { CodeActionAutoApply, CodeActionCommAndArgs, CodeActionFilter, CodeActionKind, CodeActionTrigger } from './types';

function contextKeyForSupportedActions(kind: CodeActionKind) {
	return ContextKeyExpr.regex(
		SUPPORTED_CODE_ACTIONS.keys()[0],
		new RegExp('(\\s|^)' + escApeRegExpChArActers(kind.vAlue) + '\\b'));
}

const ArgsSchemA: IJSONSchemA = {
	type: 'object',
	defAultSnippets: [{ body: { kind: '' } }],
	properties: {
		'kind': {
			type: 'string',
			description: nls.locAlize('Args.schemA.kind', "Kind of the code Action to run."),
		},
		'Apply': {
			type: 'string',
			description: nls.locAlize('Args.schemA.Apply', "Controls when the returned Actions Are Applied."),
			defAult: CodeActionAutoApply.IfSingle,
			enum: [CodeActionAutoApply.First, CodeActionAutoApply.IfSingle, CodeActionAutoApply.Never],
			enumDescriptions: [
				nls.locAlize('Args.schemA.Apply.first', "AlwAys Apply the first returned code Action."),
				nls.locAlize('Args.schemA.Apply.ifSingle', "Apply the first returned code Action if it is the only one."),
				nls.locAlize('Args.schemA.Apply.never', "Do not Apply the returned code Actions."),
			]
		},
		'preferred': {
			type: 'booleAn',
			defAult: fAlse,
			description: nls.locAlize('Args.schemA.preferred', "Controls if only preferred code Actions should be returned."),
		}
	}
};

export clAss QuickFixController extends DisposAble implements IEditorContribution {

	public stAtic reAdonly ID = 'editor.contrib.quickFixController';

	public stAtic get(editor: ICodeEditor): QuickFixController {
		return editor.getContribution<QuickFixController>(QuickFixController.ID);
	}

	privAte reAdonly _editor: ICodeEditor;
	privAte reAdonly _model: CodeActionModel;
	privAte reAdonly _ui: LAzy<CodeActionUi>;

	constructor(
		editor: ICodeEditor,
		@IMArkerService mArkerService: IMArkerService,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IEditorProgressService progressService: IEditorProgressService,
		@IInstAntiAtionService privAte reAdonly _instAntiAtionService: IInstAntiAtionService,
	) {
		super();

		this._editor = editor;
		this._model = this._register(new CodeActionModel(this._editor, mArkerService, contextKeyService, progressService));
		this._register(this._model.onDidChAngeStAte(newStAte => this.updAte(newStAte)));

		this._ui = new LAzy(() =>
			this._register(new CodeActionUi(editor, QuickFixAction.Id, AutoFixAction.Id, {
				ApplyCodeAction: Async (Action, retrigger) => {
					try {
						AwAit this._ApplyCodeAction(Action);
					} finAlly {
						if (retrigger) {
							this._trigger({ type: CodeActionTriggerType.Auto, filter: {} });
						}
					}
				}
			}, this._instAntiAtionService))
		);
	}

	privAte updAte(newStAte: CodeActionsStAte.StAte): void {
		this._ui.getVAlue().updAte(newStAte);
	}

	public showCodeActions(trigger: CodeActionTrigger, Actions: CodeActionSet, At: IAnchor | IPosition) {
		return this._ui.getVAlue().showCodeActionList(trigger, Actions, At, { includeDisAbledActions: fAlse });
	}

	public mAnuAlTriggerAtCurrentPosition(
		notAvAilAbleMessAge: string,
		filter?: CodeActionFilter,
		AutoApply?: CodeActionAutoApply
	): void {
		if (!this._editor.hAsModel()) {
			return;
		}

		MessAgeController.get(this._editor).closeMessAge();
		const triggerPosition = this._editor.getPosition();
		this._trigger({ type: CodeActionTriggerType.MAnuAl, filter, AutoApply, context: { notAvAilAbleMessAge, position: triggerPosition } });
	}

	privAte _trigger(trigger: CodeActionTrigger) {
		return this._model.trigger(trigger);
	}

	privAte _ApplyCodeAction(Action: CodeActionItem): Promise<void> {
		return this._instAntiAtionService.invokeFunction(ApplyCodeAction, Action, this._editor);
	}
}

export Async function ApplyCodeAction(
	Accessor: ServicesAccessor,
	item: CodeActionItem,
	editor?: ICodeEditor,
): Promise<void> {
	const bulkEditService = Accessor.get(IBulkEditService);
	const commAndService = Accessor.get(ICommAndService);
	const telemetryService = Accessor.get(ITelemetryService);
	const notificAtionService = Accessor.get(INotificAtionService);

	type ApplyCodeActionEvent = {
		codeActionTitle: string;
		codeActionKind: string | undefined;
		codeActionIsPreferred: booleAn;
	};
	type ApplyCodeEventClAssificAtion = {
		codeActionTitle: { clAssificAtion: 'SystemMetADAtA', purpose: 'FeAtureInsight' };
		codeActionKind: { clAssificAtion: 'SystemMetADAtA', purpose: 'FeAtureInsight' };
		codeActionIsPreferred: { clAssificAtion: 'SystemMetADAtA', purpose: 'FeAtureInsight' };
	};

	telemetryService.publicLog2<ApplyCodeActionEvent, ApplyCodeEventClAssificAtion>('codeAction.ApplyCodeAction', {
		codeActionTitle: item.Action.title,
		codeActionKind: item.Action.kind,
		codeActionIsPreferred: !!item.Action.isPreferred,
	});

	AwAit item.resolve(CAncellAtionToken.None);

	if (item.Action.edit) {
		AwAit bulkEditService.Apply(ResourceEdit.convert(item.Action.edit), { editor, lAbel: item.Action.title });
	}

	if (item.Action.commAnd) {
		try {
			AwAit commAndService.executeCommAnd(item.Action.commAnd.id, ...(item.Action.commAnd.Arguments || []));
		} cAtch (err) {
			const messAge = AsMessAge(err);
			notificAtionService.error(
				typeof messAge === 'string'
					? messAge
					: nls.locAlize('ApplyCodeActionFAiled', "An unknown error occurred while Applying the code Action"));
		}
	}
}

function AsMessAge(err: Any): string | undefined {
	if (typeof err === 'string') {
		return err;
	} else if (err instAnceof Error && typeof err.messAge === 'string') {
		return err.messAge;
	} else {
		return undefined;
	}
}

function triggerCodeActionsForEditorSelection(
	editor: ICodeEditor,
	notAvAilAbleMessAge: string,
	filter: CodeActionFilter | undefined,
	AutoApply: CodeActionAutoApply | undefined
): void {
	if (editor.hAsModel()) {
		const controller = QuickFixController.get(editor);
		if (controller) {
			controller.mAnuAlTriggerAtCurrentPosition(notAvAilAbleMessAge, filter, AutoApply);
		}
	}
}

export clAss QuickFixAction extends EditorAction {

	stAtic reAdonly Id = 'editor.Action.quickFix';

	constructor() {
		super({
			id: QuickFixAction.Id,
			lAbel: nls.locAlize('quickfix.trigger.lAbel', "Quick Fix..."),
			AliAs: 'Quick Fix...',
			precondition: ContextKeyExpr.And(EditorContextKeys.writAble, EditorContextKeys.hAsCodeActionsProvider),
			kbOpts: {
				kbExpr: EditorContextKeys.editorTextFocus,
				primAry: KeyMod.CtrlCmd | KeyCode.US_DOT,
				weight: KeybindingWeight.EditorContrib
			}
		});
	}

	public run(_Accessor: ServicesAccessor, editor: ICodeEditor): void {
		return triggerCodeActionsForEditorSelection(editor, nls.locAlize('editor.Action.quickFix.noneMessAge', "No code Actions AvAilAble"), undefined, undefined);
	}
}

export clAss CodeActionCommAnd extends EditorCommAnd {

	constructor() {
		super({
			id: codeActionCommAndId,
			precondition: ContextKeyExpr.And(EditorContextKeys.writAble, EditorContextKeys.hAsCodeActionsProvider),
			description: {
				description: 'Trigger A code Action',
				Args: [{ nAme: 'Args', schemA: ArgsSchemA, }]
			}
		});
	}

	public runEditorCommAnd(_Accessor: ServicesAccessor, editor: ICodeEditor, userArgs: Any) {
		const Args = CodeActionCommAndArgs.fromUser(userArgs, {
			kind: CodeActionKind.Empty,
			Apply: CodeActionAutoApply.IfSingle,
		});
		return triggerCodeActionsForEditorSelection(editor,
			typeof userArgs?.kind === 'string'
				? Args.preferred
					? nls.locAlize('editor.Action.codeAction.noneMessAge.preferred.kind', "No preferred code Actions for '{0}' AvAilAble", userArgs.kind)
					: nls.locAlize('editor.Action.codeAction.noneMessAge.kind', "No code Actions for '{0}' AvAilAble", userArgs.kind)
				: Args.preferred
					? nls.locAlize('editor.Action.codeAction.noneMessAge.preferred', "No preferred code Actions AvAilAble")
					: nls.locAlize('editor.Action.codeAction.noneMessAge', "No code Actions AvAilAble"),
			{
				include: Args.kind,
				includeSourceActions: true,
				onlyIncludePreferredActions: Args.preferred,
			},
			Args.Apply);
	}
}


export clAss RefActorAction extends EditorAction {

	constructor() {
		super({
			id: refActorCommAndId,
			lAbel: nls.locAlize('refActor.lAbel', "RefActor..."),
			AliAs: 'RefActor...',
			precondition: ContextKeyExpr.And(EditorContextKeys.writAble, EditorContextKeys.hAsCodeActionsProvider),
			kbOpts: {
				kbExpr: EditorContextKeys.editorTextFocus,
				primAry: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KEY_R,
				mAc: {
					primAry: KeyMod.WinCtrl | KeyMod.Shift | KeyCode.KEY_R
				},
				weight: KeybindingWeight.EditorContrib
			},
			contextMenuOpts: {
				group: '1_modificAtion',
				order: 2,
				when: ContextKeyExpr.And(
					EditorContextKeys.writAble,
					contextKeyForSupportedActions(CodeActionKind.RefActor)),
			},
			description: {
				description: 'RefActor...',
				Args: [{ nAme: 'Args', schemA: ArgsSchemA }]
			}
		});
	}

	public run(_Accessor: ServicesAccessor, editor: ICodeEditor, userArgs: Any): void {
		const Args = CodeActionCommAndArgs.fromUser(userArgs, {
			kind: CodeActionKind.RefActor,
			Apply: CodeActionAutoApply.Never
		});
		return triggerCodeActionsForEditorSelection(editor,
			typeof userArgs?.kind === 'string'
				? Args.preferred
					? nls.locAlize('editor.Action.refActor.noneMessAge.preferred.kind', "No preferred refActorings for '{0}' AvAilAble", userArgs.kind)
					: nls.locAlize('editor.Action.refActor.noneMessAge.kind', "No refActorings for '{0}' AvAilAble", userArgs.kind)
				: Args.preferred
					? nls.locAlize('editor.Action.refActor.noneMessAge.preferred', "No preferred refActorings AvAilAble")
					: nls.locAlize('editor.Action.refActor.noneMessAge', "No refActorings AvAilAble"),
			{
				include: CodeActionKind.RefActor.contAins(Args.kind) ? Args.kind : CodeActionKind.None,
				onlyIncludePreferredActions: Args.preferred,
			},
			Args.Apply);
	}
}

export clAss SourceAction extends EditorAction {

	constructor() {
		super({
			id: sourceActionCommAndId,
			lAbel: nls.locAlize('source.lAbel', "Source Action..."),
			AliAs: 'Source Action...',
			precondition: ContextKeyExpr.And(EditorContextKeys.writAble, EditorContextKeys.hAsCodeActionsProvider),
			contextMenuOpts: {
				group: '1_modificAtion',
				order: 2.1,
				when: ContextKeyExpr.And(
					EditorContextKeys.writAble,
					contextKeyForSupportedActions(CodeActionKind.Source)),
			},
			description: {
				description: 'Source Action...',
				Args: [{ nAme: 'Args', schemA: ArgsSchemA }]
			}
		});
	}

	public run(_Accessor: ServicesAccessor, editor: ICodeEditor, userArgs: Any): void {
		const Args = CodeActionCommAndArgs.fromUser(userArgs, {
			kind: CodeActionKind.Source,
			Apply: CodeActionAutoApply.Never
		});
		return triggerCodeActionsForEditorSelection(editor,
			typeof userArgs?.kind === 'string'
				? Args.preferred
					? nls.locAlize('editor.Action.source.noneMessAge.preferred.kind', "No preferred source Actions for '{0}' AvAilAble", userArgs.kind)
					: nls.locAlize('editor.Action.source.noneMessAge.kind', "No source Actions for '{0}' AvAilAble", userArgs.kind)
				: Args.preferred
					? nls.locAlize('editor.Action.source.noneMessAge.preferred', "No preferred source Actions AvAilAble")
					: nls.locAlize('editor.Action.source.noneMessAge', "No source Actions AvAilAble"),
			{
				include: CodeActionKind.Source.contAins(Args.kind) ? Args.kind : CodeActionKind.None,
				includeSourceActions: true,
				onlyIncludePreferredActions: Args.preferred,
			},
			Args.Apply);
	}
}

export clAss OrgAnizeImportsAction extends EditorAction {

	constructor() {
		super({
			id: orgAnizeImportsCommAndId,
			lAbel: nls.locAlize('orgAnizeImports.lAbel', "OrgAnize Imports"),
			AliAs: 'OrgAnize Imports',
			precondition: ContextKeyExpr.And(
				EditorContextKeys.writAble,
				contextKeyForSupportedActions(CodeActionKind.SourceOrgAnizeImports)),
			kbOpts: {
				kbExpr: EditorContextKeys.editorTextFocus,
				primAry: KeyMod.Shift | KeyMod.Alt | KeyCode.KEY_O,
				weight: KeybindingWeight.EditorContrib
			},
		});
	}

	public run(_Accessor: ServicesAccessor, editor: ICodeEditor): void {
		return triggerCodeActionsForEditorSelection(editor,
			nls.locAlize('editor.Action.orgAnize.noneMessAge', "No orgAnize imports Action AvAilAble"),
			{ include: CodeActionKind.SourceOrgAnizeImports, includeSourceActions: true },
			CodeActionAutoApply.IfSingle);
	}
}

export clAss FixAllAction extends EditorAction {

	constructor() {
		super({
			id: fixAllCommAndId,
			lAbel: nls.locAlize('fixAll.lAbel', "Fix All"),
			AliAs: 'Fix All',
			precondition: ContextKeyExpr.And(
				EditorContextKeys.writAble,
				contextKeyForSupportedActions(CodeActionKind.SourceFixAll))
		});
	}

	public run(_Accessor: ServicesAccessor, editor: ICodeEditor): void {
		return triggerCodeActionsForEditorSelection(editor,
			nls.locAlize('fixAll.noneMessAge', "No fix All Action AvAilAble"),
			{ include: CodeActionKind.SourceFixAll, includeSourceActions: true },
			CodeActionAutoApply.IfSingle);
	}
}

export clAss AutoFixAction extends EditorAction {

	stAtic reAdonly Id = 'editor.Action.AutoFix';

	constructor() {
		super({
			id: AutoFixAction.Id,
			lAbel: nls.locAlize('AutoFix.lAbel', "Auto Fix..."),
			AliAs: 'Auto Fix...',
			precondition: ContextKeyExpr.And(
				EditorContextKeys.writAble,
				contextKeyForSupportedActions(CodeActionKind.QuickFix)),
			kbOpts: {
				kbExpr: EditorContextKeys.editorTextFocus,
				primAry: KeyMod.Alt | KeyMod.Shift | KeyCode.US_DOT,
				mAc: {
					primAry: KeyMod.CtrlCmd | KeyMod.Alt | KeyCode.US_DOT
				},
				weight: KeybindingWeight.EditorContrib
			}
		});
	}

	public run(_Accessor: ServicesAccessor, editor: ICodeEditor): void {
		return triggerCodeActionsForEditorSelection(editor,
			nls.locAlize('editor.Action.AutoFix.noneMessAge', "No Auto fixes AvAilAble"),
			{
				include: CodeActionKind.QuickFix,
				onlyIncludePreferredActions: true
			},
			CodeActionAutoApply.IfSingle);
	}
}
