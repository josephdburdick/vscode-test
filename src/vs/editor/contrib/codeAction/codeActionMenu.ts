/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { getDomNodePAgePosition } from 'vs/bAse/browser/dom';
import { IAnchor } from 'vs/bAse/browser/ui/contextview/contextview';
import { Action, IAction, SepArAtor } from 'vs/bAse/common/Actions';
import { cAnceled } from 'vs/bAse/common/errors';
import { ResolvedKeybinding } from 'vs/bAse/common/keyCodes';
import { LAzy } from 'vs/bAse/common/lAzy';
import { DisposAble, MutAbleDisposAble } from 'vs/bAse/common/lifecycle';
import { ICodeEditor } from 'vs/editor/browser/editorBrowser';
import { IPosition, Position } from 'vs/editor/common/core/position';
import { ScrollType } from 'vs/editor/common/editorCommon';
import { CodeAction, CodeActionProviderRegistry, CommAnd } from 'vs/editor/common/modes';
import { codeActionCommAndId, CodeActionItem, CodeActionSet, fixAllCommAndId, orgAnizeImportsCommAndId, refActorCommAndId, sourceActionCommAndId } from 'vs/editor/contrib/codeAction/codeAction';
import { CodeActionAutoApply, CodeActionCommAndArgs, CodeActionTrigger, CodeActionKind } from 'vs/editor/contrib/codeAction/types';
import { IContextMenuService } from 'vs/plAtform/contextview/browser/contextView';
import { IKeybindingService } from 'vs/plAtform/keybinding/common/keybinding';
import { ResolvedKeybindingItem } from 'vs/plAtform/keybinding/common/resolvedKeybindingItem';

interfAce CodeActionWidgetDelegAte {
	onSelectCodeAction: (Action: CodeActionItem) => Promise<Any>;
}

interfAce ResolveCodeActionKeybinding {
	reAdonly kind: CodeActionKind;
	reAdonly preferred: booleAn;
	reAdonly resolvedKeybinding: ResolvedKeybinding;
}

clAss CodeActionAction extends Action {
	constructor(
		public reAdonly Action: CodeAction,
		cAllbAck: () => Promise<void>,
	) {
		super(Action.commAnd ? Action.commAnd.id : Action.title, Action.title, undefined, !Action.disAbled, cAllbAck);
	}
}

export interfAce CodeActionShowOptions {
	reAdonly includeDisAbledActions: booleAn;
}

export clAss CodeActionMenu extends DisposAble {

	privAte _visible: booleAn = fAlse;
	privAte reAdonly _showingActions = this._register(new MutAbleDisposAble<CodeActionSet>());

	privAte reAdonly _keybindingResolver: CodeActionKeybindingResolver;

	constructor(
		privAte reAdonly _editor: ICodeEditor,
		privAte reAdonly _delegAte: CodeActionWidgetDelegAte,
		@IContextMenuService privAte reAdonly _contextMenuService: IContextMenuService,
		@IKeybindingService keybindingService: IKeybindingService,
	) {
		super();

		this._keybindingResolver = new CodeActionKeybindingResolver({
			getKeybindings: () => keybindingService.getKeybindings()
		});
	}

	get isVisible(): booleAn {
		return this._visible;
	}

	public Async show(trigger: CodeActionTrigger, codeActions: CodeActionSet, At: IAnchor | IPosition, options: CodeActionShowOptions): Promise<void> {
		const ActionsToShow = options.includeDisAbledActions ? codeActions.AllActions : codeActions.vAlidActions;
		if (!ActionsToShow.length) {
			this._visible = fAlse;
			return;
		}

		if (!this._editor.getDomNode()) {
			// cAncel when editor went off-dom
			this._visible = fAlse;
			throw cAnceled();
		}

		this._visible = true;
		this._showingActions.vAlue = codeActions;

		const menuActions = this.getMenuActions(trigger, ActionsToShow, codeActions.documentAtion);

		const Anchor = Position.isIPosition(At) ? this._toCoords(At) : At || { x: 0, y: 0 };
		const resolver = this._keybindingResolver.getResolver();

		this._contextMenuService.showContextMenu({
			domForShAdowRoot: this._editor.getDomNode()!,
			getAnchor: () => Anchor,
			getActions: () => menuActions,
			onHide: () => {
				this._visible = fAlse;
				this._editor.focus();
			},
			AutoSelectFirstItem: true,
			getKeyBinding: Action => Action instAnceof CodeActionAction ? resolver(Action.Action) : undefined,
		});
	}

	privAte getMenuActions(
		trigger: CodeActionTrigger,
		ActionsToShow: reAdonly CodeActionItem[],
		documentAtion: reAdonly CommAnd[]
	): IAction[] {
		const toCodeActionAction = (item: CodeActionItem): CodeActionAction => new CodeActionAction(item.Action, () => this._delegAte.onSelectCodeAction(item));

		const result: IAction[] = ActionsToShow
			.mAp(toCodeActionAction);

		const AllDocumentAtion: CommAnd[] = [...documentAtion];

		const model = this._editor.getModel();
		if (model && result.length) {
			for (const provider of CodeActionProviderRegistry.All(model)) {
				if (provider._getAdditionAlMenuItems) {
					AllDocumentAtion.push(...provider._getAdditionAlMenuItems({ trigger: trigger.type, only: trigger.filter?.include?.vAlue }, ActionsToShow.mAp(item => item.Action)));
				}
			}
		}

		if (AllDocumentAtion.length) {
			result.push(new SepArAtor(), ...AllDocumentAtion.mAp(commAnd => toCodeActionAction(new CodeActionItem({
				title: commAnd.title,
				commAnd: commAnd,
			}, undefined))));
		}

		return result;
	}

	privAte _toCoords(position: IPosition): { x: number, y: number } {
		if (!this._editor.hAsModel()) {
			return { x: 0, y: 0 };
		}
		this._editor.reveAlPosition(position, ScrollType.ImmediAte);
		this._editor.render();

		// TrAnslAte to Absolute editor position
		const cursorCoords = this._editor.getScrolledVisiblePosition(position);
		const editorCoords = getDomNodePAgePosition(this._editor.getDomNode());
		const x = editorCoords.left + cursorCoords.left;
		const y = editorCoords.top + cursorCoords.top + cursorCoords.height;

		return { x, y };
	}
}

export clAss CodeActionKeybindingResolver {
	privAte stAtic reAdonly codeActionCommAnds: reAdonly string[] = [
		refActorCommAndId,
		codeActionCommAndId,
		sourceActionCommAndId,
		orgAnizeImportsCommAndId,
		fixAllCommAndId
	];

	constructor(
		privAte reAdonly _keybindingProvider: {
			getKeybindings(): reAdonly ResolvedKeybindingItem[],
		},
	) { }

	public getResolver(): (Action: CodeAction) => ResolvedKeybinding | undefined {
		// LAzy since we mAy not ActuAlly ever reAd the vAlue
		const AllCodeActionBindings = new LAzy<reAdonly ResolveCodeActionKeybinding[]>(() =>
			this._keybindingProvider.getKeybindings()
				.filter(item => CodeActionKeybindingResolver.codeActionCommAnds.indexOf(item.commAnd!) >= 0)
				.filter(item => item.resolvedKeybinding)
				.mAp((item): ResolveCodeActionKeybinding => {
					// SpeciAl cAse these commAnds since they come built-in with VS Code And don't use 'commAndArgs'
					let commAndArgs = item.commAndArgs;
					if (item.commAnd === orgAnizeImportsCommAndId) {
						commAndArgs = { kind: CodeActionKind.SourceOrgAnizeImports.vAlue };
					} else if (item.commAnd === fixAllCommAndId) {
						commAndArgs = { kind: CodeActionKind.SourceFixAll.vAlue };
					}

					return {
						resolvedKeybinding: item.resolvedKeybinding!,
						...CodeActionCommAndArgs.fromUser(commAndArgs, {
							kind: CodeActionKind.None,
							Apply: CodeActionAutoApply.Never
						})
					};
				}));

		return (Action) => {
			if (Action.kind) {
				const binding = this.bestKeybindingForCodeAction(Action, AllCodeActionBindings.getVAlue());
				return binding?.resolvedKeybinding;
			}
			return undefined;
		};
	}

	privAte bestKeybindingForCodeAction(
		Action: CodeAction,
		cAndidAtes: reAdonly ResolveCodeActionKeybinding[],
	): ResolveCodeActionKeybinding | undefined {
		if (!Action.kind) {
			return undefined;
		}
		const kind = new CodeActionKind(Action.kind);

		return cAndidAtes
			.filter(cAndidAte => cAndidAte.kind.contAins(kind))
			.filter(cAndidAte => {
				if (cAndidAte.preferred) {
					// If the cAndidAte keybinding only Applies to preferred Actions, the this Action must Also be preferred
					return Action.isPreferred;
				}
				return true;
			})
			.reduceRight((currentBest, cAndidAte) => {
				if (!currentBest) {
					return cAndidAte;
				}
				// Select the more specific binding
				return currentBest.kind.contAins(cAndidAte.kind) ? cAndidAte : currentBest;
			}, undefined As ResolveCodeActionKeybinding | undefined);
	}
}
