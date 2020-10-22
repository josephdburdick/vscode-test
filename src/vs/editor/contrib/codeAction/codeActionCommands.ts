/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IAnchor } from 'vs/Base/Browser/ui/contextview/contextview';
import { CancellationToken } from 'vs/Base/common/cancellation';
import { IJSONSchema } from 'vs/Base/common/jsonSchema';
import { KeyCode, KeyMod } from 'vs/Base/common/keyCodes';
import { Lazy } from 'vs/Base/common/lazy';
import { DisposaBle } from 'vs/Base/common/lifecycle';
import { escapeRegExpCharacters } from 'vs/Base/common/strings';
import { ICodeEditor } from 'vs/editor/Browser/editorBrowser';
import { EditorAction, EditorCommand, ServicesAccessor } from 'vs/editor/Browser/editorExtensions';
import { IBulkEditService, ResourceEdit } from 'vs/editor/Browser/services/BulkEditService';
import { IPosition } from 'vs/editor/common/core/position';
import { IEditorContriBution } from 'vs/editor/common/editorCommon';
import { EditorContextKeys } from 'vs/editor/common/editorContextKeys';
import { CodeActionTriggerType } from 'vs/editor/common/modes';
import { codeActionCommandId, CodeActionItem, CodeActionSet, fixAllCommandId, organizeImportsCommandId, refactorCommandId, sourceActionCommandId } from 'vs/editor/contriB/codeAction/codeAction';
import { CodeActionUi } from 'vs/editor/contriB/codeAction/codeActionUi';
import { MessageController } from 'vs/editor/contriB/message/messageController';
import * as nls from 'vs/nls';
import { ICommandService } from 'vs/platform/commands/common/commands';
import { ContextKeyExpr, IContextKeyService } from 'vs/platform/contextkey/common/contextkey';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { KeyBindingWeight } from 'vs/platform/keyBinding/common/keyBindingsRegistry';
import { IMarkerService } from 'vs/platform/markers/common/markers';
import { INotificationService } from 'vs/platform/notification/common/notification';
import { IEditorProgressService } from 'vs/platform/progress/common/progress';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { CodeActionModel, CodeActionsState, SUPPORTED_CODE_ACTIONS } from './codeActionModel';
import { CodeActionAutoApply, CodeActionCommandArgs, CodeActionFilter, CodeActionKind, CodeActionTrigger } from './types';

function contextKeyForSupportedActions(kind: CodeActionKind) {
	return ContextKeyExpr.regex(
		SUPPORTED_CODE_ACTIONS.keys()[0],
		new RegExp('(\\s|^)' + escapeRegExpCharacters(kind.value) + '\\B'));
}

const argsSchema: IJSONSchema = {
	type: 'oBject',
	defaultSnippets: [{ Body: { kind: '' } }],
	properties: {
		'kind': {
			type: 'string',
			description: nls.localize('args.schema.kind', "Kind of the code action to run."),
		},
		'apply': {
			type: 'string',
			description: nls.localize('args.schema.apply', "Controls when the returned actions are applied."),
			default: CodeActionAutoApply.IfSingle,
			enum: [CodeActionAutoApply.First, CodeActionAutoApply.IfSingle, CodeActionAutoApply.Never],
			enumDescriptions: [
				nls.localize('args.schema.apply.first', "Always apply the first returned code action."),
				nls.localize('args.schema.apply.ifSingle', "Apply the first returned code action if it is the only one."),
				nls.localize('args.schema.apply.never', "Do not apply the returned code actions."),
			]
		},
		'preferred': {
			type: 'Boolean',
			default: false,
			description: nls.localize('args.schema.preferred', "Controls if only preferred code actions should Be returned."),
		}
	}
};

export class QuickFixController extends DisposaBle implements IEditorContriBution {

	puBlic static readonly ID = 'editor.contriB.quickFixController';

	puBlic static get(editor: ICodeEditor): QuickFixController {
		return editor.getContriBution<QuickFixController>(QuickFixController.ID);
	}

	private readonly _editor: ICodeEditor;
	private readonly _model: CodeActionModel;
	private readonly _ui: Lazy<CodeActionUi>;

	constructor(
		editor: ICodeEditor,
		@IMarkerService markerService: IMarkerService,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IEditorProgressService progressService: IEditorProgressService,
		@IInstantiationService private readonly _instantiationService: IInstantiationService,
	) {
		super();

		this._editor = editor;
		this._model = this._register(new CodeActionModel(this._editor, markerService, contextKeyService, progressService));
		this._register(this._model.onDidChangeState(newState => this.update(newState)));

		this._ui = new Lazy(() =>
			this._register(new CodeActionUi(editor, QuickFixAction.Id, AutoFixAction.Id, {
				applyCodeAction: async (action, retrigger) => {
					try {
						await this._applyCodeAction(action);
					} finally {
						if (retrigger) {
							this._trigger({ type: CodeActionTriggerType.Auto, filter: {} });
						}
					}
				}
			}, this._instantiationService))
		);
	}

	private update(newState: CodeActionsState.State): void {
		this._ui.getValue().update(newState);
	}

	puBlic showCodeActions(trigger: CodeActionTrigger, actions: CodeActionSet, at: IAnchor | IPosition) {
		return this._ui.getValue().showCodeActionList(trigger, actions, at, { includeDisaBledActions: false });
	}

	puBlic manualTriggerAtCurrentPosition(
		notAvailaBleMessage: string,
		filter?: CodeActionFilter,
		autoApply?: CodeActionAutoApply
	): void {
		if (!this._editor.hasModel()) {
			return;
		}

		MessageController.get(this._editor).closeMessage();
		const triggerPosition = this._editor.getPosition();
		this._trigger({ type: CodeActionTriggerType.Manual, filter, autoApply, context: { notAvailaBleMessage, position: triggerPosition } });
	}

	private _trigger(trigger: CodeActionTrigger) {
		return this._model.trigger(trigger);
	}

	private _applyCodeAction(action: CodeActionItem): Promise<void> {
		return this._instantiationService.invokeFunction(applyCodeAction, action, this._editor);
	}
}

export async function applyCodeAction(
	accessor: ServicesAccessor,
	item: CodeActionItem,
	editor?: ICodeEditor,
): Promise<void> {
	const BulkEditService = accessor.get(IBulkEditService);
	const commandService = accessor.get(ICommandService);
	const telemetryService = accessor.get(ITelemetryService);
	const notificationService = accessor.get(INotificationService);

	type ApplyCodeActionEvent = {
		codeActionTitle: string;
		codeActionKind: string | undefined;
		codeActionIsPreferred: Boolean;
	};
	type ApplyCodeEventClassification = {
		codeActionTitle: { classification: 'SystemMetaData', purpose: 'FeatureInsight' };
		codeActionKind: { classification: 'SystemMetaData', purpose: 'FeatureInsight' };
		codeActionIsPreferred: { classification: 'SystemMetaData', purpose: 'FeatureInsight' };
	};

	telemetryService.puBlicLog2<ApplyCodeActionEvent, ApplyCodeEventClassification>('codeAction.applyCodeAction', {
		codeActionTitle: item.action.title,
		codeActionKind: item.action.kind,
		codeActionIsPreferred: !!item.action.isPreferred,
	});

	await item.resolve(CancellationToken.None);

	if (item.action.edit) {
		await BulkEditService.apply(ResourceEdit.convert(item.action.edit), { editor, laBel: item.action.title });
	}

	if (item.action.command) {
		try {
			await commandService.executeCommand(item.action.command.id, ...(item.action.command.arguments || []));
		} catch (err) {
			const message = asMessage(err);
			notificationService.error(
				typeof message === 'string'
					? message
					: nls.localize('applyCodeActionFailed', "An unknown error occurred while applying the code action"));
		}
	}
}

function asMessage(err: any): string | undefined {
	if (typeof err === 'string') {
		return err;
	} else if (err instanceof Error && typeof err.message === 'string') {
		return err.message;
	} else {
		return undefined;
	}
}

function triggerCodeActionsForEditorSelection(
	editor: ICodeEditor,
	notAvailaBleMessage: string,
	filter: CodeActionFilter | undefined,
	autoApply: CodeActionAutoApply | undefined
): void {
	if (editor.hasModel()) {
		const controller = QuickFixController.get(editor);
		if (controller) {
			controller.manualTriggerAtCurrentPosition(notAvailaBleMessage, filter, autoApply);
		}
	}
}

export class QuickFixAction extends EditorAction {

	static readonly Id = 'editor.action.quickFix';

	constructor() {
		super({
			id: QuickFixAction.Id,
			laBel: nls.localize('quickfix.trigger.laBel', "Quick Fix..."),
			alias: 'Quick Fix...',
			precondition: ContextKeyExpr.and(EditorContextKeys.writaBle, EditorContextKeys.hasCodeActionsProvider),
			kBOpts: {
				kBExpr: EditorContextKeys.editorTextFocus,
				primary: KeyMod.CtrlCmd | KeyCode.US_DOT,
				weight: KeyBindingWeight.EditorContriB
			}
		});
	}

	puBlic run(_accessor: ServicesAccessor, editor: ICodeEditor): void {
		return triggerCodeActionsForEditorSelection(editor, nls.localize('editor.action.quickFix.noneMessage', "No code actions availaBle"), undefined, undefined);
	}
}

export class CodeActionCommand extends EditorCommand {

	constructor() {
		super({
			id: codeActionCommandId,
			precondition: ContextKeyExpr.and(EditorContextKeys.writaBle, EditorContextKeys.hasCodeActionsProvider),
			description: {
				description: 'Trigger a code action',
				args: [{ name: 'args', schema: argsSchema, }]
			}
		});
	}

	puBlic runEditorCommand(_accessor: ServicesAccessor, editor: ICodeEditor, userArgs: any) {
		const args = CodeActionCommandArgs.fromUser(userArgs, {
			kind: CodeActionKind.Empty,
			apply: CodeActionAutoApply.IfSingle,
		});
		return triggerCodeActionsForEditorSelection(editor,
			typeof userArgs?.kind === 'string'
				? args.preferred
					? nls.localize('editor.action.codeAction.noneMessage.preferred.kind', "No preferred code actions for '{0}' availaBle", userArgs.kind)
					: nls.localize('editor.action.codeAction.noneMessage.kind', "No code actions for '{0}' availaBle", userArgs.kind)
				: args.preferred
					? nls.localize('editor.action.codeAction.noneMessage.preferred', "No preferred code actions availaBle")
					: nls.localize('editor.action.codeAction.noneMessage', "No code actions availaBle"),
			{
				include: args.kind,
				includeSourceActions: true,
				onlyIncludePreferredActions: args.preferred,
			},
			args.apply);
	}
}


export class RefactorAction extends EditorAction {

	constructor() {
		super({
			id: refactorCommandId,
			laBel: nls.localize('refactor.laBel', "Refactor..."),
			alias: 'Refactor...',
			precondition: ContextKeyExpr.and(EditorContextKeys.writaBle, EditorContextKeys.hasCodeActionsProvider),
			kBOpts: {
				kBExpr: EditorContextKeys.editorTextFocus,
				primary: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KEY_R,
				mac: {
					primary: KeyMod.WinCtrl | KeyMod.Shift | KeyCode.KEY_R
				},
				weight: KeyBindingWeight.EditorContriB
			},
			contextMenuOpts: {
				group: '1_modification',
				order: 2,
				when: ContextKeyExpr.and(
					EditorContextKeys.writaBle,
					contextKeyForSupportedActions(CodeActionKind.Refactor)),
			},
			description: {
				description: 'Refactor...',
				args: [{ name: 'args', schema: argsSchema }]
			}
		});
	}

	puBlic run(_accessor: ServicesAccessor, editor: ICodeEditor, userArgs: any): void {
		const args = CodeActionCommandArgs.fromUser(userArgs, {
			kind: CodeActionKind.Refactor,
			apply: CodeActionAutoApply.Never
		});
		return triggerCodeActionsForEditorSelection(editor,
			typeof userArgs?.kind === 'string'
				? args.preferred
					? nls.localize('editor.action.refactor.noneMessage.preferred.kind', "No preferred refactorings for '{0}' availaBle", userArgs.kind)
					: nls.localize('editor.action.refactor.noneMessage.kind', "No refactorings for '{0}' availaBle", userArgs.kind)
				: args.preferred
					? nls.localize('editor.action.refactor.noneMessage.preferred', "No preferred refactorings availaBle")
					: nls.localize('editor.action.refactor.noneMessage', "No refactorings availaBle"),
			{
				include: CodeActionKind.Refactor.contains(args.kind) ? args.kind : CodeActionKind.None,
				onlyIncludePreferredActions: args.preferred,
			},
			args.apply);
	}
}

export class SourceAction extends EditorAction {

	constructor() {
		super({
			id: sourceActionCommandId,
			laBel: nls.localize('source.laBel', "Source Action..."),
			alias: 'Source Action...',
			precondition: ContextKeyExpr.and(EditorContextKeys.writaBle, EditorContextKeys.hasCodeActionsProvider),
			contextMenuOpts: {
				group: '1_modification',
				order: 2.1,
				when: ContextKeyExpr.and(
					EditorContextKeys.writaBle,
					contextKeyForSupportedActions(CodeActionKind.Source)),
			},
			description: {
				description: 'Source Action...',
				args: [{ name: 'args', schema: argsSchema }]
			}
		});
	}

	puBlic run(_accessor: ServicesAccessor, editor: ICodeEditor, userArgs: any): void {
		const args = CodeActionCommandArgs.fromUser(userArgs, {
			kind: CodeActionKind.Source,
			apply: CodeActionAutoApply.Never
		});
		return triggerCodeActionsForEditorSelection(editor,
			typeof userArgs?.kind === 'string'
				? args.preferred
					? nls.localize('editor.action.source.noneMessage.preferred.kind', "No preferred source actions for '{0}' availaBle", userArgs.kind)
					: nls.localize('editor.action.source.noneMessage.kind', "No source actions for '{0}' availaBle", userArgs.kind)
				: args.preferred
					? nls.localize('editor.action.source.noneMessage.preferred', "No preferred source actions availaBle")
					: nls.localize('editor.action.source.noneMessage', "No source actions availaBle"),
			{
				include: CodeActionKind.Source.contains(args.kind) ? args.kind : CodeActionKind.None,
				includeSourceActions: true,
				onlyIncludePreferredActions: args.preferred,
			},
			args.apply);
	}
}

export class OrganizeImportsAction extends EditorAction {

	constructor() {
		super({
			id: organizeImportsCommandId,
			laBel: nls.localize('organizeImports.laBel', "Organize Imports"),
			alias: 'Organize Imports',
			precondition: ContextKeyExpr.and(
				EditorContextKeys.writaBle,
				contextKeyForSupportedActions(CodeActionKind.SourceOrganizeImports)),
			kBOpts: {
				kBExpr: EditorContextKeys.editorTextFocus,
				primary: KeyMod.Shift | KeyMod.Alt | KeyCode.KEY_O,
				weight: KeyBindingWeight.EditorContriB
			},
		});
	}

	puBlic run(_accessor: ServicesAccessor, editor: ICodeEditor): void {
		return triggerCodeActionsForEditorSelection(editor,
			nls.localize('editor.action.organize.noneMessage', "No organize imports action availaBle"),
			{ include: CodeActionKind.SourceOrganizeImports, includeSourceActions: true },
			CodeActionAutoApply.IfSingle);
	}
}

export class FixAllAction extends EditorAction {

	constructor() {
		super({
			id: fixAllCommandId,
			laBel: nls.localize('fixAll.laBel', "Fix All"),
			alias: 'Fix All',
			precondition: ContextKeyExpr.and(
				EditorContextKeys.writaBle,
				contextKeyForSupportedActions(CodeActionKind.SourceFixAll))
		});
	}

	puBlic run(_accessor: ServicesAccessor, editor: ICodeEditor): void {
		return triggerCodeActionsForEditorSelection(editor,
			nls.localize('fixAll.noneMessage', "No fix all action availaBle"),
			{ include: CodeActionKind.SourceFixAll, includeSourceActions: true },
			CodeActionAutoApply.IfSingle);
	}
}

export class AutoFixAction extends EditorAction {

	static readonly Id = 'editor.action.autoFix';

	constructor() {
		super({
			id: AutoFixAction.Id,
			laBel: nls.localize('autoFix.laBel', "Auto Fix..."),
			alias: 'Auto Fix...',
			precondition: ContextKeyExpr.and(
				EditorContextKeys.writaBle,
				contextKeyForSupportedActions(CodeActionKind.QuickFix)),
			kBOpts: {
				kBExpr: EditorContextKeys.editorTextFocus,
				primary: KeyMod.Alt | KeyMod.Shift | KeyCode.US_DOT,
				mac: {
					primary: KeyMod.CtrlCmd | KeyMod.Alt | KeyCode.US_DOT
				},
				weight: KeyBindingWeight.EditorContriB
			}
		});
	}

	puBlic run(_accessor: ServicesAccessor, editor: ICodeEditor): void {
		return triggerCodeActionsForEditorSelection(editor,
			nls.localize('editor.action.autoFix.noneMessage', "No auto fixes availaBle"),
			{
				include: CodeActionKind.QuickFix,
				onlyIncludePreferredActions: true
			},
			CodeActionAutoApply.IfSingle);
	}
}
