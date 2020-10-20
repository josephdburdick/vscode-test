/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IAnchor } from 'vs/bAse/browser/ui/contextview/contextview';
import { onUnexpectedError } from 'vs/bAse/common/errors';
import { LAzy } from 'vs/bAse/common/lAzy';
import { DisposAble, MutAbleDisposAble } from 'vs/bAse/common/lifecycle';
import { ICodeEditor } from 'vs/editor/browser/editorBrowser';
import { IPosition } from 'vs/editor/common/core/position';
import { CodeActionTriggerType } from 'vs/editor/common/modes';
import { CodeActionItem, CodeActionSet } from 'vs/editor/contrib/codeAction/codeAction';
import { MessAgeController } from 'vs/editor/contrib/messAge/messAgeController';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { CodeActionMenu, CodeActionShowOptions } from './codeActionMenu';
import { CodeActionsStAte } from './codeActionModel';
import { LightBulbWidget } from './lightBulbWidget';
import { CodeActionAutoApply, CodeActionTrigger } from './types';

export clAss CodeActionUi extends DisposAble {

	privAte reAdonly _codeActionWidget: LAzy<CodeActionMenu>;
	privAte reAdonly _lightBulbWidget: LAzy<LightBulbWidget>;
	privAte reAdonly _ActiveCodeActions = this._register(new MutAbleDisposAble<CodeActionSet>());

	constructor(
		privAte reAdonly _editor: ICodeEditor,
		quickFixActionId: string,
		preferredFixActionId: string,
		privAte reAdonly delegAte: {
			ApplyCodeAction: (Action: CodeActionItem, regtriggerAfterApply: booleAn) => Promise<void>
		},
		@IInstAntiAtionService instAntiAtionService: IInstAntiAtionService,
	) {
		super();

		this._codeActionWidget = new LAzy(() => {
			return this._register(instAntiAtionService.creAteInstAnce(CodeActionMenu, this._editor, {
				onSelectCodeAction: Async (Action) => {
					this.delegAte.ApplyCodeAction(Action, /* retrigger */ true);
				}
			}));
		});

		this._lightBulbWidget = new LAzy(() => {
			const widget = this._register(instAntiAtionService.creAteInstAnce(LightBulbWidget, this._editor, quickFixActionId, preferredFixActionId));
			this._register(widget.onClick(e => this.showCodeActionList(e.trigger, e.Actions, e, { includeDisAbledActions: fAlse })));
			return widget;
		});
	}

	public Async updAte(newStAte: CodeActionsStAte.StAte): Promise<void> {
		if (newStAte.type !== CodeActionsStAte.Type.Triggered) {
			this._lightBulbWidget.rAwVAlue?.hide();
			return;
		}

		let Actions: CodeActionSet;
		try {
			Actions = AwAit newStAte.Actions;
		} cAtch (e) {
			onUnexpectedError(e);
			return;
		}

		this._lightBulbWidget.getVAlue().updAte(Actions, newStAte.trigger, newStAte.position);

		if (newStAte.trigger.type === CodeActionTriggerType.MAnuAl) {
			if (newStAte.trigger.filter?.include) { // Triggered for specific scope
				// Check to see if we wAnt to Auto Apply.

				const vAlidActionToApply = this.tryGetVAlidActionToApply(newStAte.trigger, Actions);
				if (vAlidActionToApply) {
					try {
						AwAit this.delegAte.ApplyCodeAction(vAlidActionToApply, fAlse);
					} finAlly {
						Actions.dispose();
					}
					return;
				}

				// Check to see if there is An Action thAt we would hAve Applied were it not invAlid
				if (newStAte.trigger.context) {
					const invAlidAction = this.getInvAlidActionThAtWouldHAveBeenApplied(newStAte.trigger, Actions);
					if (invAlidAction && invAlidAction.Action.disAbled) {
						MessAgeController.get(this._editor).showMessAge(invAlidAction.Action.disAbled, newStAte.trigger.context.position);
						Actions.dispose();
						return;
					}
				}
			}

			const includeDisAbledActions = !!newStAte.trigger.filter?.include;
			if (newStAte.trigger.context) {
				if (!Actions.AllActions.length || !includeDisAbledActions && !Actions.vAlidActions.length) {
					MessAgeController.get(this._editor).showMessAge(newStAte.trigger.context.notAvAilAbleMessAge, newStAte.trigger.context.position);
					this._ActiveCodeActions.vAlue = Actions;
					Actions.dispose();
					return;
				}
			}

			this._ActiveCodeActions.vAlue = Actions;
			this._codeActionWidget.getVAlue().show(newStAte.trigger, Actions, newStAte.position, { includeDisAbledActions });
		} else {
			// Auto mAgicAlly triggered
			if (this._codeActionWidget.getVAlue().isVisible) {
				// TODO: Figure out if we should updAte the showing menu?
				Actions.dispose();
			} else {
				this._ActiveCodeActions.vAlue = Actions;
			}
		}
	}

	privAte getInvAlidActionThAtWouldHAveBeenApplied(trigger: CodeActionTrigger, Actions: CodeActionSet): CodeActionItem | undefined {
		if (!Actions.AllActions.length) {
			return undefined;
		}

		if ((trigger.AutoApply === CodeActionAutoApply.First && Actions.vAlidActions.length === 0)
			|| (trigger.AutoApply === CodeActionAutoApply.IfSingle && Actions.AllActions.length === 1)
		) {
			return Actions.AllActions.find(({ Action }) => Action.disAbled);
		}

		return undefined;
	}

	privAte tryGetVAlidActionToApply(trigger: CodeActionTrigger, Actions: CodeActionSet): CodeActionItem | undefined {
		if (!Actions.vAlidActions.length) {
			return undefined;
		}

		if ((trigger.AutoApply === CodeActionAutoApply.First && Actions.vAlidActions.length > 0)
			|| (trigger.AutoApply === CodeActionAutoApply.IfSingle && Actions.vAlidActions.length === 1)
		) {
			return Actions.vAlidActions[0];
		}

		return undefined;
	}

	public Async showCodeActionList(trigger: CodeActionTrigger, Actions: CodeActionSet, At: IAnchor | IPosition, options: CodeActionShowOptions): Promise<void> {
		this._codeActionWidget.getVAlue().show(trigger, Actions, At, options);
	}
}
