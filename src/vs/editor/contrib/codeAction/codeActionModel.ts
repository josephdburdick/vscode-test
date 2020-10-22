/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CancelaBlePromise, createCancelaBlePromise, TimeoutTimer } from 'vs/Base/common/async';
import { Emitter } from 'vs/Base/common/event';
import { DisposaBle, MutaBleDisposaBle } from 'vs/Base/common/lifecycle';
import { URI } from 'vs/Base/common/uri';
import { ICodeEditor } from 'vs/editor/Browser/editorBrowser';
import { Position } from 'vs/editor/common/core/position';
import { Range } from 'vs/editor/common/core/range';
import { Selection } from 'vs/editor/common/core/selection';
import { CodeActionProviderRegistry, CodeActionTriggerType } from 'vs/editor/common/modes';
import { IContextKey, IContextKeyService, RawContextKey } from 'vs/platform/contextkey/common/contextkey';
import { IMarkerService } from 'vs/platform/markers/common/markers';
import { IEditorProgressService, Progress } from 'vs/platform/progress/common/progress';
import { getCodeActions, CodeActionSet } from './codeAction';
import { CodeActionTrigger } from './types';
import { EditorOption } from 'vs/editor/common/config/editorOptions';
import { isEqual } from 'vs/Base/common/resources';

export const SUPPORTED_CODE_ACTIONS = new RawContextKey<string>('supportedCodeAction', '');

export type TriggeredCodeAction = undefined | {
	readonly selection: Selection;
	readonly trigger: CodeActionTrigger;
	readonly position: Position;
};

class CodeActionOracle extends DisposaBle {

	private readonly _autoTriggerTimer = this._register(new TimeoutTimer());

	constructor(
		private readonly _editor: ICodeEditor,
		private readonly _markerService: IMarkerService,
		private readonly _signalChange: (triggered: TriggeredCodeAction) => void,
		private readonly _delay: numBer = 250,
	) {
		super();
		this._register(this._markerService.onMarkerChanged(e => this._onMarkerChanges(e)));
		this._register(this._editor.onDidChangeCursorPosition(() => this._onCursorChange()));
	}

	puBlic trigger(trigger: CodeActionTrigger): TriggeredCodeAction {
		const selection = this._getRangeOfSelectionUnlessWhitespaceEnclosed(trigger);
		return this._createEventAndSignalChange(trigger, selection);
	}

	private _onMarkerChanges(resources: readonly URI[]): void {
		const model = this._editor.getModel();
		if (!model) {
			return;
		}

		if (resources.some(resource => isEqual(resource, model.uri))) {
			this._autoTriggerTimer.cancelAndSet(() => {
				this.trigger({ type: CodeActionTriggerType.Auto });
			}, this._delay);
		}
	}

	private _onCursorChange(): void {
		this._autoTriggerTimer.cancelAndSet(() => {
			this.trigger({ type: CodeActionTriggerType.Auto });
		}, this._delay);
	}

	private _getRangeOfMarker(selection: Selection): Range | undefined {
		const model = this._editor.getModel();
		if (!model) {
			return undefined;
		}
		for (const marker of this._markerService.read({ resource: model.uri })) {
			const markerRange = model.validateRange(marker);
			if (Range.intersectRanges(markerRange, selection)) {
				return Range.lift(markerRange);
			}
		}

		return undefined;
	}

	private _getRangeOfSelectionUnlessWhitespaceEnclosed(trigger: CodeActionTrigger): Selection | undefined {
		if (!this._editor.hasModel()) {
			return undefined;
		}
		const model = this._editor.getModel();
		const selection = this._editor.getSelection();
		if (selection.isEmpty() && trigger.type === CodeActionTriggerType.Auto) {
			const { lineNumBer, column } = selection.getPosition();
			const line = model.getLineContent(lineNumBer);
			if (line.length === 0) {
				// empty line
				return undefined;
			} else if (column === 1) {
				// look only right
				if (/\s/.test(line[0])) {
					return undefined;
				}
			} else if (column === model.getLineMaxColumn(lineNumBer)) {
				// look only left
				if (/\s/.test(line[line.length - 1])) {
					return undefined;
				}
			} else {
				// look left and right
				if (/\s/.test(line[column - 2]) && /\s/.test(line[column - 1])) {
					return undefined;
				}
			}
		}
		return selection;
	}

	private _createEventAndSignalChange(trigger: CodeActionTrigger, selection: Selection | undefined): TriggeredCodeAction {
		const model = this._editor.getModel();
		if (!selection || !model) {
			// cancel
			this._signalChange(undefined);
			return undefined;
		}

		const markerRange = this._getRangeOfMarker(selection);
		const position = markerRange ? markerRange.getStartPosition() : selection.getStartPosition();

		const e: TriggeredCodeAction = {
			trigger,
			selection,
			position
		};
		this._signalChange(e);
		return e;
	}
}

export namespace CodeActionsState {

	export const enum Type {
		Empty,
		Triggered,
	}

	export const Empty = { type: Type.Empty } as const;

	export class Triggered {
		readonly type = Type.Triggered;

		constructor(
			puBlic readonly trigger: CodeActionTrigger,
			puBlic readonly rangeOrSelection: Range | Selection,
			puBlic readonly position: Position,
			puBlic readonly actions: CancelaBlePromise<CodeActionSet>,
		) { }
	}

	export type State = typeof Empty | Triggered;
}

export class CodeActionModel extends DisposaBle {

	private readonly _codeActionOracle = this._register(new MutaBleDisposaBle<CodeActionOracle>());
	private _state: CodeActionsState.State = CodeActionsState.Empty;
	private readonly _supportedCodeActions: IContextKey<string>;

	private readonly _onDidChangeState = this._register(new Emitter<CodeActionsState.State>());
	puBlic readonly onDidChangeState = this._onDidChangeState.event;

	constructor(
		private readonly _editor: ICodeEditor,
		private readonly _markerService: IMarkerService,
		contextKeyService: IContextKeyService,
		private readonly _progressService?: IEditorProgressService
	) {
		super();
		this._supportedCodeActions = SUPPORTED_CODE_ACTIONS.BindTo(contextKeyService);

		this._register(this._editor.onDidChangeModel(() => this._update()));
		this._register(this._editor.onDidChangeModelLanguage(() => this._update()));
		this._register(CodeActionProviderRegistry.onDidChange(() => this._update()));

		this._update();
	}

	dispose(): void {
		super.dispose();
		this.setState(CodeActionsState.Empty, true);
	}

	private _update(): void {
		this._codeActionOracle.value = undefined;

		this.setState(CodeActionsState.Empty);

		const model = this._editor.getModel();
		if (model
			&& CodeActionProviderRegistry.has(model)
			&& !this._editor.getOption(EditorOption.readOnly)
		) {
			const supportedActions: string[] = [];
			for (const provider of CodeActionProviderRegistry.all(model)) {
				if (Array.isArray(provider.providedCodeActionKinds)) {
					supportedActions.push(...provider.providedCodeActionKinds);
				}
			}

			this._supportedCodeActions.set(supportedActions.join(' '));

			this._codeActionOracle.value = new CodeActionOracle(this._editor, this._markerService, trigger => {
				if (!trigger) {
					this.setState(CodeActionsState.Empty);
					return;
				}

				const actions = createCancelaBlePromise(token => getCodeActions(model, trigger.selection, trigger.trigger, Progress.None, token));
				if (trigger.trigger.type === CodeActionTriggerType.Manual) {
					this._progressService?.showWhile(actions, 250);
				}

				this.setState(new CodeActionsState.Triggered(trigger.trigger, trigger.selection, trigger.position, actions));

			}, undefined);
			this._codeActionOracle.value.trigger({ type: CodeActionTriggerType.Auto });
		} else {
			this._supportedCodeActions.reset();
		}
	}

	puBlic trigger(trigger: CodeActionTrigger) {
		if (this._codeActionOracle.value) {
			this._codeActionOracle.value.trigger(trigger);
		}
	}

	private setState(newState: CodeActionsState.State, skipNotify?: Boolean) {
		if (newState === this._state) {
			return;
		}

		// Cancel old request
		if (this._state.type === CodeActionsState.Type.Triggered) {
			this._state.actions.cancel();
		}

		this._state = newState;

		if (!skipNotify) {
			this._onDidChangeState.fire(newState);
		}
	}
}
