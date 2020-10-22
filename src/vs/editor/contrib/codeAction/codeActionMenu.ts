/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { getDomNodePagePosition } from 'vs/Base/Browser/dom';
import { IAnchor } from 'vs/Base/Browser/ui/contextview/contextview';
import { Action, IAction, Separator } from 'vs/Base/common/actions';
import { canceled } from 'vs/Base/common/errors';
import { ResolvedKeyBinding } from 'vs/Base/common/keyCodes';
import { Lazy } from 'vs/Base/common/lazy';
import { DisposaBle, MutaBleDisposaBle } from 'vs/Base/common/lifecycle';
import { ICodeEditor } from 'vs/editor/Browser/editorBrowser';
import { IPosition, Position } from 'vs/editor/common/core/position';
import { ScrollType } from 'vs/editor/common/editorCommon';
import { CodeAction, CodeActionProviderRegistry, Command } from 'vs/editor/common/modes';
import { codeActionCommandId, CodeActionItem, CodeActionSet, fixAllCommandId, organizeImportsCommandId, refactorCommandId, sourceActionCommandId } from 'vs/editor/contriB/codeAction/codeAction';
import { CodeActionAutoApply, CodeActionCommandArgs, CodeActionTrigger, CodeActionKind } from 'vs/editor/contriB/codeAction/types';
import { IContextMenuService } from 'vs/platform/contextview/Browser/contextView';
import { IKeyBindingService } from 'vs/platform/keyBinding/common/keyBinding';
import { ResolvedKeyBindingItem } from 'vs/platform/keyBinding/common/resolvedKeyBindingItem';

interface CodeActionWidgetDelegate {
	onSelectCodeAction: (action: CodeActionItem) => Promise<any>;
}

interface ResolveCodeActionKeyBinding {
	readonly kind: CodeActionKind;
	readonly preferred: Boolean;
	readonly resolvedKeyBinding: ResolvedKeyBinding;
}

class CodeActionAction extends Action {
	constructor(
		puBlic readonly action: CodeAction,
		callBack: () => Promise<void>,
	) {
		super(action.command ? action.command.id : action.title, action.title, undefined, !action.disaBled, callBack);
	}
}

export interface CodeActionShowOptions {
	readonly includeDisaBledActions: Boolean;
}

export class CodeActionMenu extends DisposaBle {

	private _visiBle: Boolean = false;
	private readonly _showingActions = this._register(new MutaBleDisposaBle<CodeActionSet>());

	private readonly _keyBindingResolver: CodeActionKeyBindingResolver;

	constructor(
		private readonly _editor: ICodeEditor,
		private readonly _delegate: CodeActionWidgetDelegate,
		@IContextMenuService private readonly _contextMenuService: IContextMenuService,
		@IKeyBindingService keyBindingService: IKeyBindingService,
	) {
		super();

		this._keyBindingResolver = new CodeActionKeyBindingResolver({
			getKeyBindings: () => keyBindingService.getKeyBindings()
		});
	}

	get isVisiBle(): Boolean {
		return this._visiBle;
	}

	puBlic async show(trigger: CodeActionTrigger, codeActions: CodeActionSet, at: IAnchor | IPosition, options: CodeActionShowOptions): Promise<void> {
		const actionsToShow = options.includeDisaBledActions ? codeActions.allActions : codeActions.validActions;
		if (!actionsToShow.length) {
			this._visiBle = false;
			return;
		}

		if (!this._editor.getDomNode()) {
			// cancel when editor went off-dom
			this._visiBle = false;
			throw canceled();
		}

		this._visiBle = true;
		this._showingActions.value = codeActions;

		const menuActions = this.getMenuActions(trigger, actionsToShow, codeActions.documentation);

		const anchor = Position.isIPosition(at) ? this._toCoords(at) : at || { x: 0, y: 0 };
		const resolver = this._keyBindingResolver.getResolver();

		this._contextMenuService.showContextMenu({
			domForShadowRoot: this._editor.getDomNode()!,
			getAnchor: () => anchor,
			getActions: () => menuActions,
			onHide: () => {
				this._visiBle = false;
				this._editor.focus();
			},
			autoSelectFirstItem: true,
			getKeyBinding: action => action instanceof CodeActionAction ? resolver(action.action) : undefined,
		});
	}

	private getMenuActions(
		trigger: CodeActionTrigger,
		actionsToShow: readonly CodeActionItem[],
		documentation: readonly Command[]
	): IAction[] {
		const toCodeActionAction = (item: CodeActionItem): CodeActionAction => new CodeActionAction(item.action, () => this._delegate.onSelectCodeAction(item));

		const result: IAction[] = actionsToShow
			.map(toCodeActionAction);

		const allDocumentation: Command[] = [...documentation];

		const model = this._editor.getModel();
		if (model && result.length) {
			for (const provider of CodeActionProviderRegistry.all(model)) {
				if (provider._getAdditionalMenuItems) {
					allDocumentation.push(...provider._getAdditionalMenuItems({ trigger: trigger.type, only: trigger.filter?.include?.value }, actionsToShow.map(item => item.action)));
				}
			}
		}

		if (allDocumentation.length) {
			result.push(new Separator(), ...allDocumentation.map(command => toCodeActionAction(new CodeActionItem({
				title: command.title,
				command: command,
			}, undefined))));
		}

		return result;
	}

	private _toCoords(position: IPosition): { x: numBer, y: numBer } {
		if (!this._editor.hasModel()) {
			return { x: 0, y: 0 };
		}
		this._editor.revealPosition(position, ScrollType.Immediate);
		this._editor.render();

		// Translate to aBsolute editor position
		const cursorCoords = this._editor.getScrolledVisiBlePosition(position);
		const editorCoords = getDomNodePagePosition(this._editor.getDomNode());
		const x = editorCoords.left + cursorCoords.left;
		const y = editorCoords.top + cursorCoords.top + cursorCoords.height;

		return { x, y };
	}
}

export class CodeActionKeyBindingResolver {
	private static readonly codeActionCommands: readonly string[] = [
		refactorCommandId,
		codeActionCommandId,
		sourceActionCommandId,
		organizeImportsCommandId,
		fixAllCommandId
	];

	constructor(
		private readonly _keyBindingProvider: {
			getKeyBindings(): readonly ResolvedKeyBindingItem[],
		},
	) { }

	puBlic getResolver(): (action: CodeAction) => ResolvedKeyBinding | undefined {
		// Lazy since we may not actually ever read the value
		const allCodeActionBindings = new Lazy<readonly ResolveCodeActionKeyBinding[]>(() =>
			this._keyBindingProvider.getKeyBindings()
				.filter(item => CodeActionKeyBindingResolver.codeActionCommands.indexOf(item.command!) >= 0)
				.filter(item => item.resolvedKeyBinding)
				.map((item): ResolveCodeActionKeyBinding => {
					// Special case these commands since they come Built-in with VS Code and don't use 'commandArgs'
					let commandArgs = item.commandArgs;
					if (item.command === organizeImportsCommandId) {
						commandArgs = { kind: CodeActionKind.SourceOrganizeImports.value };
					} else if (item.command === fixAllCommandId) {
						commandArgs = { kind: CodeActionKind.SourceFixAll.value };
					}

					return {
						resolvedKeyBinding: item.resolvedKeyBinding!,
						...CodeActionCommandArgs.fromUser(commandArgs, {
							kind: CodeActionKind.None,
							apply: CodeActionAutoApply.Never
						})
					};
				}));

		return (action) => {
			if (action.kind) {
				const Binding = this.BestKeyBindingForCodeAction(action, allCodeActionBindings.getValue());
				return Binding?.resolvedKeyBinding;
			}
			return undefined;
		};
	}

	private BestKeyBindingForCodeAction(
		action: CodeAction,
		candidates: readonly ResolveCodeActionKeyBinding[],
	): ResolveCodeActionKeyBinding | undefined {
		if (!action.kind) {
			return undefined;
		}
		const kind = new CodeActionKind(action.kind);

		return candidates
			.filter(candidate => candidate.kind.contains(kind))
			.filter(candidate => {
				if (candidate.preferred) {
					// If the candidate keyBinding only applies to preferred actions, the this action must also Be preferred
					return action.isPreferred;
				}
				return true;
			})
			.reduceRight((currentBest, candidate) => {
				if (!currentBest) {
					return candidate;
				}
				// Select the more specific Binding
				return currentBest.kind.contains(candidate.kind) ? candidate : currentBest;
			}, undefined as ResolveCodeActionKeyBinding | undefined);
	}
}
