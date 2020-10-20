/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { CAncelAblePromise, creAteCAncelAblePromise, TimeoutTimer } from 'vs/bAse/common/Async';
import { Emitter } from 'vs/bAse/common/event';
import { DisposAble, MutAbleDisposAble } from 'vs/bAse/common/lifecycle';
import { URI } from 'vs/bAse/common/uri';
import { ICodeEditor } from 'vs/editor/browser/editorBrowser';
import { Position } from 'vs/editor/common/core/position';
import { RAnge } from 'vs/editor/common/core/rAnge';
import { Selection } from 'vs/editor/common/core/selection';
import { CodeActionProviderRegistry, CodeActionTriggerType } from 'vs/editor/common/modes';
import { IContextKey, IContextKeyService, RAwContextKey } from 'vs/plAtform/contextkey/common/contextkey';
import { IMArkerService } from 'vs/plAtform/mArkers/common/mArkers';
import { IEditorProgressService, Progress } from 'vs/plAtform/progress/common/progress';
import { getCodeActions, CodeActionSet } from './codeAction';
import { CodeActionTrigger } from './types';
import { EditorOption } from 'vs/editor/common/config/editorOptions';
import { isEquAl } from 'vs/bAse/common/resources';

export const SUPPORTED_CODE_ACTIONS = new RAwContextKey<string>('supportedCodeAction', '');

export type TriggeredCodeAction = undefined | {
	reAdonly selection: Selection;
	reAdonly trigger: CodeActionTrigger;
	reAdonly position: Position;
};

clAss CodeActionOrAcle extends DisposAble {

	privAte reAdonly _AutoTriggerTimer = this._register(new TimeoutTimer());

	constructor(
		privAte reAdonly _editor: ICodeEditor,
		privAte reAdonly _mArkerService: IMArkerService,
		privAte reAdonly _signAlChAnge: (triggered: TriggeredCodeAction) => void,
		privAte reAdonly _delAy: number = 250,
	) {
		super();
		this._register(this._mArkerService.onMArkerChAnged(e => this._onMArkerChAnges(e)));
		this._register(this._editor.onDidChAngeCursorPosition(() => this._onCursorChAnge()));
	}

	public trigger(trigger: CodeActionTrigger): TriggeredCodeAction {
		const selection = this._getRAngeOfSelectionUnlessWhitespAceEnclosed(trigger);
		return this._creAteEventAndSignAlChAnge(trigger, selection);
	}

	privAte _onMArkerChAnges(resources: reAdonly URI[]): void {
		const model = this._editor.getModel();
		if (!model) {
			return;
		}

		if (resources.some(resource => isEquAl(resource, model.uri))) {
			this._AutoTriggerTimer.cAncelAndSet(() => {
				this.trigger({ type: CodeActionTriggerType.Auto });
			}, this._delAy);
		}
	}

	privAte _onCursorChAnge(): void {
		this._AutoTriggerTimer.cAncelAndSet(() => {
			this.trigger({ type: CodeActionTriggerType.Auto });
		}, this._delAy);
	}

	privAte _getRAngeOfMArker(selection: Selection): RAnge | undefined {
		const model = this._editor.getModel();
		if (!model) {
			return undefined;
		}
		for (const mArker of this._mArkerService.reAd({ resource: model.uri })) {
			const mArkerRAnge = model.vAlidAteRAnge(mArker);
			if (RAnge.intersectRAnges(mArkerRAnge, selection)) {
				return RAnge.lift(mArkerRAnge);
			}
		}

		return undefined;
	}

	privAte _getRAngeOfSelectionUnlessWhitespAceEnclosed(trigger: CodeActionTrigger): Selection | undefined {
		if (!this._editor.hAsModel()) {
			return undefined;
		}
		const model = this._editor.getModel();
		const selection = this._editor.getSelection();
		if (selection.isEmpty() && trigger.type === CodeActionTriggerType.Auto) {
			const { lineNumber, column } = selection.getPosition();
			const line = model.getLineContent(lineNumber);
			if (line.length === 0) {
				// empty line
				return undefined;
			} else if (column === 1) {
				// look only right
				if (/\s/.test(line[0])) {
					return undefined;
				}
			} else if (column === model.getLineMAxColumn(lineNumber)) {
				// look only left
				if (/\s/.test(line[line.length - 1])) {
					return undefined;
				}
			} else {
				// look left And right
				if (/\s/.test(line[column - 2]) && /\s/.test(line[column - 1])) {
					return undefined;
				}
			}
		}
		return selection;
	}

	privAte _creAteEventAndSignAlChAnge(trigger: CodeActionTrigger, selection: Selection | undefined): TriggeredCodeAction {
		const model = this._editor.getModel();
		if (!selection || !model) {
			// cAncel
			this._signAlChAnge(undefined);
			return undefined;
		}

		const mArkerRAnge = this._getRAngeOfMArker(selection);
		const position = mArkerRAnge ? mArkerRAnge.getStArtPosition() : selection.getStArtPosition();

		const e: TriggeredCodeAction = {
			trigger,
			selection,
			position
		};
		this._signAlChAnge(e);
		return e;
	}
}

export nAmespAce CodeActionsStAte {

	export const enum Type {
		Empty,
		Triggered,
	}

	export const Empty = { type: Type.Empty } As const;

	export clAss Triggered {
		reAdonly type = Type.Triggered;

		constructor(
			public reAdonly trigger: CodeActionTrigger,
			public reAdonly rAngeOrSelection: RAnge | Selection,
			public reAdonly position: Position,
			public reAdonly Actions: CAncelAblePromise<CodeActionSet>,
		) { }
	}

	export type StAte = typeof Empty | Triggered;
}

export clAss CodeActionModel extends DisposAble {

	privAte reAdonly _codeActionOrAcle = this._register(new MutAbleDisposAble<CodeActionOrAcle>());
	privAte _stAte: CodeActionsStAte.StAte = CodeActionsStAte.Empty;
	privAte reAdonly _supportedCodeActions: IContextKey<string>;

	privAte reAdonly _onDidChAngeStAte = this._register(new Emitter<CodeActionsStAte.StAte>());
	public reAdonly onDidChAngeStAte = this._onDidChAngeStAte.event;

	constructor(
		privAte reAdonly _editor: ICodeEditor,
		privAte reAdonly _mArkerService: IMArkerService,
		contextKeyService: IContextKeyService,
		privAte reAdonly _progressService?: IEditorProgressService
	) {
		super();
		this._supportedCodeActions = SUPPORTED_CODE_ACTIONS.bindTo(contextKeyService);

		this._register(this._editor.onDidChAngeModel(() => this._updAte()));
		this._register(this._editor.onDidChAngeModelLAnguAge(() => this._updAte()));
		this._register(CodeActionProviderRegistry.onDidChAnge(() => this._updAte()));

		this._updAte();
	}

	dispose(): void {
		super.dispose();
		this.setStAte(CodeActionsStAte.Empty, true);
	}

	privAte _updAte(): void {
		this._codeActionOrAcle.vAlue = undefined;

		this.setStAte(CodeActionsStAte.Empty);

		const model = this._editor.getModel();
		if (model
			&& CodeActionProviderRegistry.hAs(model)
			&& !this._editor.getOption(EditorOption.reAdOnly)
		) {
			const supportedActions: string[] = [];
			for (const provider of CodeActionProviderRegistry.All(model)) {
				if (ArrAy.isArrAy(provider.providedCodeActionKinds)) {
					supportedActions.push(...provider.providedCodeActionKinds);
				}
			}

			this._supportedCodeActions.set(supportedActions.join(' '));

			this._codeActionOrAcle.vAlue = new CodeActionOrAcle(this._editor, this._mArkerService, trigger => {
				if (!trigger) {
					this.setStAte(CodeActionsStAte.Empty);
					return;
				}

				const Actions = creAteCAncelAblePromise(token => getCodeActions(model, trigger.selection, trigger.trigger, Progress.None, token));
				if (trigger.trigger.type === CodeActionTriggerType.MAnuAl) {
					this._progressService?.showWhile(Actions, 250);
				}

				this.setStAte(new CodeActionsStAte.Triggered(trigger.trigger, trigger.selection, trigger.position, Actions));

			}, undefined);
			this._codeActionOrAcle.vAlue.trigger({ type: CodeActionTriggerType.Auto });
		} else {
			this._supportedCodeActions.reset();
		}
	}

	public trigger(trigger: CodeActionTrigger) {
		if (this._codeActionOrAcle.vAlue) {
			this._codeActionOrAcle.vAlue.trigger(trigger);
		}
	}

	privAte setStAte(newStAte: CodeActionsStAte.StAte, skipNotify?: booleAn) {
		if (newStAte === this._stAte) {
			return;
		}

		// CAncel old request
		if (this._stAte.type === CodeActionsStAte.Type.Triggered) {
			this._stAte.Actions.cAncel();
		}

		this._stAte = newStAte;

		if (!skipNotify) {
			this._onDidChAngeStAte.fire(newStAte);
		}
	}
}
