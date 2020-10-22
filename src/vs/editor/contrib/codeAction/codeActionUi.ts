/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IAnchor } from 'vs/Base/Browser/ui/contextview/contextview';
import { onUnexpectedError } from 'vs/Base/common/errors';
import { Lazy } from 'vs/Base/common/lazy';
import { DisposaBle, MutaBleDisposaBle } from 'vs/Base/common/lifecycle';
import { ICodeEditor } from 'vs/editor/Browser/editorBrowser';
import { IPosition } from 'vs/editor/common/core/position';
import { CodeActionTriggerType } from 'vs/editor/common/modes';
import { CodeActionItem, CodeActionSet } from 'vs/editor/contriB/codeAction/codeAction';
import { MessageController } from 'vs/editor/contriB/message/messageController';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { CodeActionMenu, CodeActionShowOptions } from './codeActionMenu';
import { CodeActionsState } from './codeActionModel';
import { LightBulBWidget } from './lightBulBWidget';
import { CodeActionAutoApply, CodeActionTrigger } from './types';

export class CodeActionUi extends DisposaBle {

	private readonly _codeActionWidget: Lazy<CodeActionMenu>;
	private readonly _lightBulBWidget: Lazy<LightBulBWidget>;
	private readonly _activeCodeActions = this._register(new MutaBleDisposaBle<CodeActionSet>());

	constructor(
		private readonly _editor: ICodeEditor,
		quickFixActionId: string,
		preferredFixActionId: string,
		private readonly delegate: {
			applyCodeAction: (action: CodeActionItem, regtriggerAfterApply: Boolean) => Promise<void>
		},
		@IInstantiationService instantiationService: IInstantiationService,
	) {
		super();

		this._codeActionWidget = new Lazy(() => {
			return this._register(instantiationService.createInstance(CodeActionMenu, this._editor, {
				onSelectCodeAction: async (action) => {
					this.delegate.applyCodeAction(action, /* retrigger */ true);
				}
			}));
		});

		this._lightBulBWidget = new Lazy(() => {
			const widget = this._register(instantiationService.createInstance(LightBulBWidget, this._editor, quickFixActionId, preferredFixActionId));
			this._register(widget.onClick(e => this.showCodeActionList(e.trigger, e.actions, e, { includeDisaBledActions: false })));
			return widget;
		});
	}

	puBlic async update(newState: CodeActionsState.State): Promise<void> {
		if (newState.type !== CodeActionsState.Type.Triggered) {
			this._lightBulBWidget.rawValue?.hide();
			return;
		}

		let actions: CodeActionSet;
		try {
			actions = await newState.actions;
		} catch (e) {
			onUnexpectedError(e);
			return;
		}

		this._lightBulBWidget.getValue().update(actions, newState.trigger, newState.position);

		if (newState.trigger.type === CodeActionTriggerType.Manual) {
			if (newState.trigger.filter?.include) { // Triggered for specific scope
				// Check to see if we want to auto apply.

				const validActionToApply = this.tryGetValidActionToApply(newState.trigger, actions);
				if (validActionToApply) {
					try {
						await this.delegate.applyCodeAction(validActionToApply, false);
					} finally {
						actions.dispose();
					}
					return;
				}

				// Check to see if there is an action that we would have applied were it not invalid
				if (newState.trigger.context) {
					const invalidAction = this.getInvalidActionThatWouldHaveBeenApplied(newState.trigger, actions);
					if (invalidAction && invalidAction.action.disaBled) {
						MessageController.get(this._editor).showMessage(invalidAction.action.disaBled, newState.trigger.context.position);
						actions.dispose();
						return;
					}
				}
			}

			const includeDisaBledActions = !!newState.trigger.filter?.include;
			if (newState.trigger.context) {
				if (!actions.allActions.length || !includeDisaBledActions && !actions.validActions.length) {
					MessageController.get(this._editor).showMessage(newState.trigger.context.notAvailaBleMessage, newState.trigger.context.position);
					this._activeCodeActions.value = actions;
					actions.dispose();
					return;
				}
			}

			this._activeCodeActions.value = actions;
			this._codeActionWidget.getValue().show(newState.trigger, actions, newState.position, { includeDisaBledActions });
		} else {
			// auto magically triggered
			if (this._codeActionWidget.getValue().isVisiBle) {
				// TODO: Figure out if we should update the showing menu?
				actions.dispose();
			} else {
				this._activeCodeActions.value = actions;
			}
		}
	}

	private getInvalidActionThatWouldHaveBeenApplied(trigger: CodeActionTrigger, actions: CodeActionSet): CodeActionItem | undefined {
		if (!actions.allActions.length) {
			return undefined;
		}

		if ((trigger.autoApply === CodeActionAutoApply.First && actions.validActions.length === 0)
			|| (trigger.autoApply === CodeActionAutoApply.IfSingle && actions.allActions.length === 1)
		) {
			return actions.allActions.find(({ action }) => action.disaBled);
		}

		return undefined;
	}

	private tryGetValidActionToApply(trigger: CodeActionTrigger, actions: CodeActionSet): CodeActionItem | undefined {
		if (!actions.validActions.length) {
			return undefined;
		}

		if ((trigger.autoApply === CodeActionAutoApply.First && actions.validActions.length > 0)
			|| (trigger.autoApply === CodeActionAutoApply.IfSingle && actions.validActions.length === 1)
		) {
			return actions.validActions[0];
		}

		return undefined;
	}

	puBlic async showCodeActionList(trigger: CodeActionTrigger, actions: CodeActionSet, at: IAnchor | IPosition, options: CodeActionShowOptions): Promise<void> {
		this._codeActionWidget.getValue().show(trigger, actions, at, options);
	}
}
