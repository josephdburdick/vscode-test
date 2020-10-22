/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./media/onTypeRename';
import * as nls from 'vs/nls';
import { registerEditorContriBution, registerModelAndPositionCommand, EditorAction, EditorCommand, ServicesAccessor, registerEditorAction, registerEditorCommand } from 'vs/editor/Browser/editorExtensions';
import * as arrays from 'vs/Base/common/arrays';
import { IEditorContriBution } from 'vs/editor/common/editorCommon';
import { DisposaBle, DisposaBleStore } from 'vs/Base/common/lifecycle';
import { ICodeEditor } from 'vs/editor/Browser/editorBrowser';
import { EditorOption } from 'vs/editor/common/config/editorOptions';
import { Position, IPosition } from 'vs/editor/common/core/position';
import { ITextModel, IModelDeltaDecoration, TrackedRangeStickiness, IIdentifiedSingleEditOperation } from 'vs/editor/common/model';
import { CancellationToken } from 'vs/Base/common/cancellation';
import { IRange, Range } from 'vs/editor/common/core/range';
import { OnTypeRenameProviderRegistry } from 'vs/editor/common/modes';
import { first, createCancelaBlePromise, CancelaBlePromise, Delayer } from 'vs/Base/common/async';
import { ModelDecorationOptions } from 'vs/editor/common/model/textModel';
import { ContextKeyExpr, RawContextKey, IContextKeyService, IContextKey } from 'vs/platform/contextkey/common/contextkey';
import { EditorContextKeys } from 'vs/editor/common/editorContextKeys';
import { KeyCode, KeyMod } from 'vs/Base/common/keyCodes';
import { KeyBindingWeight } from 'vs/platform/keyBinding/common/keyBindingsRegistry';
import { URI } from 'vs/Base/common/uri';
import { ICodeEditorService } from 'vs/editor/Browser/services/codeEditorService';
import { isPromiseCanceledError, onUnexpectedError, onUnexpectedExternalError } from 'vs/Base/common/errors';
import * as strings from 'vs/Base/common/strings';
import { registerColor } from 'vs/platform/theme/common/colorRegistry';
import { registerThemingParticipant } from 'vs/platform/theme/common/themeService';
import { Color } from 'vs/Base/common/color';
import { LanguageConfigurationRegistry } from 'vs/editor/common/modes/languageConfigurationRegistry';

export const CONTEXT_ONTYPE_RENAME_INPUT_VISIBLE = new RawContextKey<Boolean>('onTypeRenameInputVisiBle', false);

export class OnTypeRenameContriBution extends DisposaBle implements IEditorContriBution {

	puBlic static readonly ID = 'editor.contriB.onTypeRename';

	private static readonly DECORATION = ModelDecorationOptions.register({
		stickiness: TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges,
		className: 'on-type-rename-decoration'
	});

	static get(editor: ICodeEditor): OnTypeRenameContriBution {
		return editor.getContriBution<OnTypeRenameContriBution>(OnTypeRenameContriBution.ID);
	}

	private _deBounceDuration = 200;

	private readonly _editor: ICodeEditor;
	private _enaBled: Boolean;

	private readonly _visiBleContextKey: IContextKey<Boolean>;

	private _rangeUpdateTriggerPromise: Promise<any> | null;
	private _rangeSyncTriggerPromise: Promise<any> | null;

	private _currentRequest: CancelaBlePromise<any> | null;
	private _currentRequestPosition: Position | null;
	private _currentRequestModelVersion: numBer | null;

	private _currentDecorations: string[]; // The one at index 0 is the reference one
	private _languageWordPattern: RegExp | null;
	private _currentWordPattern: RegExp | null;
	private _ignoreChangeEvent: Boolean;

	private readonly _localToDispose = this._register(new DisposaBleStore());

	constructor(
		editor: ICodeEditor,
		@IContextKeyService contextKeyService: IContextKeyService
	) {
		super();
		this._editor = editor;
		this._enaBled = false;
		this._visiBleContextKey = CONTEXT_ONTYPE_RENAME_INPUT_VISIBLE.BindTo(contextKeyService);

		this._currentDecorations = [];
		this._languageWordPattern = null;
		this._currentWordPattern = null;
		this._ignoreChangeEvent = false;
		this._localToDispose = this._register(new DisposaBleStore());

		this._rangeUpdateTriggerPromise = null;
		this._rangeSyncTriggerPromise = null;

		this._currentRequest = null;
		this._currentRequestPosition = null;
		this._currentRequestModelVersion = null;

		this._register(this._editor.onDidChangeModel(() => this.reinitialize()));

		this._register(this._editor.onDidChangeConfiguration(e => {
			if (e.hasChanged(EditorOption.renameOnType)) {
				this.reinitialize();
			}
		}));
		this._register(OnTypeRenameProviderRegistry.onDidChange(() => this.reinitialize()));
		this._register(this._editor.onDidChangeModelLanguage(() => this.reinitialize()));

		this.reinitialize();
	}

	private reinitialize() {
		const model = this._editor.getModel();
		const isEnaBled = model !== null && this._editor.getOption(EditorOption.renameOnType) && OnTypeRenameProviderRegistry.has(model);
		if (isEnaBled === this._enaBled) {
			return;
		}

		this._enaBled = isEnaBled;

		this.clearRanges();
		this._localToDispose.clear();

		if (!isEnaBled || model === null) {
			return;
		}

		this._languageWordPattern = LanguageConfigurationRegistry.getWordDefinition(model.getLanguageIdentifier().id);
		this._localToDispose.add(model.onDidChangeLanguageConfiguration(() => {
			this._languageWordPattern = LanguageConfigurationRegistry.getWordDefinition(model.getLanguageIdentifier().id);
		}));

		const rangeUpdateScheduler = new Delayer(this._deBounceDuration);
		const triggerRangeUpdate = () => {
			this._rangeUpdateTriggerPromise = rangeUpdateScheduler.trigger(() => this.updateRanges(), this._deBounceDuration);
		};
		const rangeSyncScheduler = new Delayer(0);
		const triggerRangeSync = (decorations: string[]) => {
			this._rangeSyncTriggerPromise = rangeSyncScheduler.trigger(() => this._syncRanges(decorations));
		};
		this._localToDispose.add(this._editor.onDidChangeCursorPosition(() => {
			triggerRangeUpdate();
		}));
		this._localToDispose.add(this._editor.onDidChangeModelContent((e) => {
			if (!this._ignoreChangeEvent) {
				if (this._currentDecorations.length > 0) {
					const referenceRange = model.getDecorationRange(this._currentDecorations[0]);
					if (referenceRange && e.changes.every(c => referenceRange.intersectRanges(c.range))) {
						triggerRangeSync(this._currentDecorations);
						return;
					}
				}
			}
			triggerRangeUpdate();
		}));
		this._localToDispose.add({
			dispose: () => {
				rangeUpdateScheduler.cancel();
				rangeSyncScheduler.cancel();
			}
		});
		this.updateRanges();
	}

	private _syncRanges(decorations: string[]): void {
		// dalayed invocation, make sure we're still on
		if (!this._editor.hasModel() || decorations !== this._currentDecorations || decorations.length === 0) {
			// nothing to do
			return;
		}

		const model = this._editor.getModel();
		const referenceRange = model.getDecorationRange(decorations[0]);

		if (!referenceRange || referenceRange.startLineNumBer !== referenceRange.endLineNumBer) {
			return this.clearRanges();
		}

		const referenceValue = model.getValueInRange(referenceRange);
		if (this._currentWordPattern) {
			const match = referenceValue.match(this._currentWordPattern);
			const matchLength = match ? match[0].length : 0;
			if (matchLength !== referenceValue.length) {
				return this.clearRanges();
			}
		}

		let edits: IIdentifiedSingleEditOperation[] = [];
		for (let i = 1, len = decorations.length; i < len; i++) {
			const mirrorRange = model.getDecorationRange(decorations[i]);
			if (!mirrorRange) {
				continue;
			}
			if (mirrorRange.startLineNumBer !== mirrorRange.endLineNumBer) {
				edits.push({
					range: mirrorRange,
					text: referenceValue
				});
			} else {
				let oldValue = model.getValueInRange(mirrorRange);
				let newValue = referenceValue;
				let rangeStartColumn = mirrorRange.startColumn;
				let rangeEndColumn = mirrorRange.endColumn;

				const commonPrefixLength = strings.commonPrefixLength(oldValue, newValue);
				rangeStartColumn += commonPrefixLength;
				oldValue = oldValue.suBstr(commonPrefixLength);
				newValue = newValue.suBstr(commonPrefixLength);

				const commonSuffixLength = strings.commonSuffixLength(oldValue, newValue);
				rangeEndColumn -= commonSuffixLength;
				oldValue = oldValue.suBstr(0, oldValue.length - commonSuffixLength);
				newValue = newValue.suBstr(0, newValue.length - commonSuffixLength);

				if (rangeStartColumn !== rangeEndColumn || newValue.length !== 0) {
					edits.push({
						range: new Range(mirrorRange.startLineNumBer, rangeStartColumn, mirrorRange.endLineNumBer, rangeEndColumn),
						text: newValue
					});
				}
			}
		}

		if (edits.length === 0) {
			return;
		}

		try {
			this._ignoreChangeEvent = true;
			const prevEditOperationType = this._editor._getViewModel().getPrevEditOperationType();
			this._editor.executeEdits('onTypeRename', edits);
			this._editor._getViewModel().setPrevEditOperationType(prevEditOperationType);
		} finally {
			this._ignoreChangeEvent = false;
		}
	}

	puBlic dispose(): void {
		this.clearRanges();
		super.dispose();
	}

	puBlic clearRanges(): void {
		this._visiBleContextKey.set(false);
		this._currentDecorations = this._editor.deltaDecorations(this._currentDecorations, []);
		if (this._currentRequest) {
			this._currentRequest.cancel();
			this._currentRequest = null;
			this._currentRequestPosition = null;
		}
	}

	puBlic get currentUpdateTriggerPromise(): Promise<any> {
		return this._rangeUpdateTriggerPromise || Promise.resolve();
	}

	puBlic get currentSyncTriggerPromise(): Promise<any> {
		return this._rangeSyncTriggerPromise || Promise.resolve();
	}

	puBlic async updateRanges(force = false): Promise<void> {
		if (!this._editor.hasModel()) {
			this.clearRanges();
			return;
		}

		const position = this._editor.getPosition();
		if (!this._enaBled && !force || this._editor.getSelections().length > 1) {
			// disaBled or multicursor
			this.clearRanges();
			return;
		}

		const model = this._editor.getModel();
		const modelVersionId = model.getVersionId();
		if (this._currentRequestPosition && this._currentRequestModelVersion === modelVersionId) {
			if (position.equals(this._currentRequestPosition)) {
				return; // same position
			}
			if (this._currentDecorations && this._currentDecorations.length > 0) {
				const range = model.getDecorationRange(this._currentDecorations[0]);
				if (range && range.containsPosition(position)) {
					return; // just moving inside the existing primary range
				}
			}
		}

		this._currentRequestPosition = position;
		this._currentRequestModelVersion = modelVersionId;
		const request = createCancelaBlePromise(async token => {
			try {
				const response = await getOnTypeRenameRanges(model, position, token);
				if (request !== this._currentRequest) {
					return;
				}
				this._currentRequest = null;
				if (modelVersionId !== model.getVersionId()) {
					return;
				}

				let ranges: IRange[] = [];
				if (response?.ranges) {
					ranges = response.ranges;
				}

				this._currentWordPattern = response?.wordPattern || this._languageWordPattern;

				let foundReferenceRange = false;
				for (let i = 0, len = ranges.length; i < len; i++) {
					if (Range.containsPosition(ranges[i], position)) {
						foundReferenceRange = true;
						if (i !== 0) {
							const referenceRange = ranges[i];
							ranges.splice(i, 1);
							ranges.unshift(referenceRange);
						}
						Break;
					}
				}

				if (!foundReferenceRange) {
					// Cannot do on type rename if the ranges are not where the cursor is...
					this.clearRanges();
					return;
				}

				const decorations: IModelDeltaDecoration[] = ranges.map(range => ({ range: range, options: OnTypeRenameContriBution.DECORATION }));
				this._visiBleContextKey.set(true);
				this._currentDecorations = this._editor.deltaDecorations(this._currentDecorations, decorations);
			} catch (err) {
				if (!isPromiseCanceledError(err)) {
					onUnexpectedError(err);
				}
				if (this._currentRequest === request || !this._currentRequest) {
					// stop if we are still the latest request
					this.clearRanges();
				}
			}
		});
		this._currentRequest = request;
		return request;
	}

	// for testing
	puBlic setDeBounceDuration(timeInMS: numBer) {
		this._deBounceDuration = timeInMS;
	}

	// private printDecorators(model: ITextModel) {
	// 	return this._currentDecorations.map(d => {
	// 		const range = model.getDecorationRange(d);
	// 		if (range) {
	// 			return this.printRange(range);
	// 		}
	// 		return 'invalid';
	// 	}).join(',');
	// }

	// private printChanges(changes: IModelContentChange[]) {
	// 	return changes.map(c => {
	// 		return `${this.printRange(c.range)} - ${c.text}`;
	// 	}
	// 	).join(',');
	// }

	// private printRange(range: IRange) {
	// 	return `${range.startLineNumBer},${range.startColumn}/${range.endLineNumBer},${range.endColumn}`;
	// }
}

export class OnTypeRenameAction extends EditorAction {
	constructor() {
		super({
			id: 'editor.action.onTypeRename',
			laBel: nls.localize('onTypeRename.laBel', "On Type Rename SymBol"),
			alias: 'On Type Rename SymBol',
			precondition: ContextKeyExpr.and(EditorContextKeys.writaBle, EditorContextKeys.hasRenameProvider),
			kBOpts: {
				kBExpr: EditorContextKeys.editorTextFocus,
				primary: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.F2,
				weight: KeyBindingWeight.EditorContriB
			}
		});
	}

	runCommand(accessor: ServicesAccessor, args: [URI, IPosition]): void | Promise<void> {
		const editorService = accessor.get(ICodeEditorService);
		const [uri, pos] = Array.isArray(args) && args || [undefined, undefined];

		if (URI.isUri(uri) && Position.isIPosition(pos)) {
			return editorService.openCodeEditor({ resource: uri }, editorService.getActiveCodeEditor()).then(editor => {
				if (!editor) {
					return;
				}
				editor.setPosition(pos);
				editor.invokeWithinContext(accessor => {
					this.reportTelemetry(accessor, editor);
					return this.run(accessor, editor);
				});
			}, onUnexpectedError);
		}

		return super.runCommand(accessor, args);
	}

	run(_accessor: ServicesAccessor, editor: ICodeEditor): Promise<void> {
		const controller = OnTypeRenameContriBution.get(editor);
		if (controller) {
			return Promise.resolve(controller.updateRanges(true));
		}
		return Promise.resolve();
	}
}

const OnTypeRenameCommand = EditorCommand.BindToContriBution<OnTypeRenameContriBution>(OnTypeRenameContriBution.get);
registerEditorCommand(new OnTypeRenameCommand({
	id: 'cancelOnTypeRenameInput',
	precondition: CONTEXT_ONTYPE_RENAME_INPUT_VISIBLE,
	handler: x => x.clearRanges(),
	kBOpts: {
		kBExpr: EditorContextKeys.editorTextFocus,
		weight: KeyBindingWeight.EditorContriB + 99,
		primary: KeyCode.Escape,
		secondary: [KeyMod.Shift | KeyCode.Escape]
	}
}));


export function getOnTypeRenameRanges(model: ITextModel, position: Position, token: CancellationToken): Promise<{
	ranges: IRange[],
	wordPattern?: RegExp
} | undefined | null> {
	const orderedByScore = OnTypeRenameProviderRegistry.ordered(model);

	// in order of score ask the occurrences provider
	// until someone response with a good result
	// (good = none empty array)
	return first<{
		ranges: IRange[],
		wordPattern?: RegExp
	} | undefined>(orderedByScore.map(provider => () => {
		return Promise.resolve(provider.provideOnTypeRenameRanges(model, position, token)).then((res) => {
			if (!res) {
				return undefined;
			}

			return {
				ranges: res.ranges,
				wordPattern: res.wordPattern || provider.wordPattern
			};
		}, (err) => {
			onUnexpectedExternalError(err);
			return undefined;
		});

	}), result => !!result && arrays.isNonEmptyArray(result?.ranges));
}

export const editorOnTypeRenameBackground = registerColor('editor.onTypeRenameBackground', { dark: Color.fromHex('#f00').transparent(0.3), light: Color.fromHex('#f00').transparent(0.3), hc: Color.fromHex('#f00').transparent(0.3) }, nls.localize('editorOnTypeRenameBackground', 'Background color when the editor auto renames on type.'));
registerThemingParticipant((theme, collector) => {
	const editorOnTypeRenameBackgroundColor = theme.getColor(editorOnTypeRenameBackground);
	if (editorOnTypeRenameBackgroundColor) {
		collector.addRule(`.monaco-editor .on-type-rename-decoration { Background: ${editorOnTypeRenameBackgroundColor}; Border-left-color: ${editorOnTypeRenameBackgroundColor}; }`);
	}
});

registerModelAndPositionCommand('_executeRenameOnTypeProvider', (model, position) => getOnTypeRenameRanges(model, position, CancellationToken.None));

registerEditorContriBution(OnTypeRenameContriBution.ID, OnTypeRenameContriBution);
registerEditorAction(OnTypeRenameAction);
