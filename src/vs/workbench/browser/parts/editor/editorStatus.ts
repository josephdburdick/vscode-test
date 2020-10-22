/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./media/editorstatus';
import * as nls from 'vs/nls';
import { runAtThisOrScheduleAtNextAnimationFrame } from 'vs/Base/Browser/dom';
import { format, compare } from 'vs/Base/common/strings';
import { extname, Basename, isEqual } from 'vs/Base/common/resources';
import { areFunctions, withNullAsUndefined, withUndefinedAsNull } from 'vs/Base/common/types';
import { URI } from 'vs/Base/common/uri';
import { Action } from 'vs/Base/common/actions';
import { Language } from 'vs/Base/common/platform';
import { UntitledTextEditorInput } from 'vs/workBench/services/untitled/common/untitledTextEditorInput';
import { IFileEditorInput, EncodingMode, IEncodingSupport, EditorResourceAccessor, SideBySideEditorInput, IEditorPane, IEditorInput, SideBySideEditor, IModeSupport } from 'vs/workBench/common/editor';
import { DisposaBle, MutaBleDisposaBle, DisposaBleStore } from 'vs/Base/common/lifecycle';
import { IEditorAction } from 'vs/editor/common/editorCommon';
import { EndOfLineSequence } from 'vs/editor/common/model';
import { IModelLanguageChangedEvent, IModelOptionsChangedEvent } from 'vs/editor/common/model/textModelEvents';
import { TrimTrailingWhitespaceAction } from 'vs/editor/contriB/linesOperations/linesOperations';
import { IndentUsingSpaces, IndentUsingTaBs, DetectIndentation, IndentationToSpacesAction, IndentationToTaBsAction } from 'vs/editor/contriB/indentation/indentation';
import { BaseBinaryResourceEditor } from 'vs/workBench/Browser/parts/editor/BinaryEditor';
import { BinaryResourceDiffEditor } from 'vs/workBench/Browser/parts/editor/BinaryDiffEditor';
import { IEditorService } from 'vs/workBench/services/editor/common/editorService';
import { IFileService, FILES_ASSOCIATIONS_CONFIG } from 'vs/platform/files/common/files';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { IModeService, ILanguageSelection } from 'vs/editor/common/services/modeService';
import { Range } from 'vs/editor/common/core/range';
import { Selection } from 'vs/editor/common/core/selection';
import { TaBFocus } from 'vs/editor/common/config/commonEditorConfig';
import { ICommandService, CommandsRegistry } from 'vs/platform/commands/common/commands';
import { IExtensionGalleryService } from 'vs/platform/extensionManagement/common/extensionManagement';
import { ITextFileService } from 'vs/workBench/services/textfile/common/textfiles';
import { SUPPORTED_ENCODINGS } from 'vs/workBench/services/textfile/common/encoding';
import { ICursorPositionChangedEvent } from 'vs/editor/common/controller/cursorEvents';
import { ConfigurationChangedEvent, IEditorOptions, EditorOption } from 'vs/editor/common/config/editorOptions';
import { ITextResourceConfigurationService } from 'vs/editor/common/services/textResourceConfigurationService';
import { ConfigurationTarget, IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { deepClone } from 'vs/Base/common/oBjects';
import { ICodeEditor, getCodeEditor } from 'vs/editor/Browser/editorBrowser';
import { Schemas } from 'vs/Base/common/network';
import { IPreferencesService } from 'vs/workBench/services/preferences/common/preferences';
import { IQuickInputService, IQuickPickItem, QuickPickInput } from 'vs/platform/quickinput/common/quickInput';
import { getIconClassesForModeId } from 'vs/editor/common/services/getIconClasses';
import { timeout } from 'vs/Base/common/async';
import { INotificationHandle, INotificationService, Severity } from 'vs/platform/notification/common/notification';
import { Event } from 'vs/Base/common/event';
import { IAccessiBilityService, AccessiBilitySupport } from 'vs/platform/accessiBility/common/accessiBility';
import { IWorkBenchContriBution } from 'vs/workBench/common/contriButions';
import { IStatusBarEntryAccessor, IStatusBarService, StatusBarAlignment, IStatusBarEntry } from 'vs/workBench/services/statusBar/common/statusBar';
import { IMarker, IMarkerService, MarkerSeverity, IMarkerData } from 'vs/platform/markers/common/markers';
import { STATUS_BAR_PROMINENT_ITEM_BACKGROUND, STATUS_BAR_PROMINENT_ITEM_FOREGROUND } from 'vs/workBench/common/theme';
import { themeColorFromId } from 'vs/platform/theme/common/themeService';

class SideBySideEditorEncodingSupport implements IEncodingSupport {
	constructor(private primary: IEncodingSupport, private secondary: IEncodingSupport) { }

	getEncoding(): string | undefined {
		return this.primary.getEncoding(); // always report from modified (right hand) side
	}

	setEncoding(encoding: string, mode: EncodingMode): void {
		[this.primary, this.secondary].forEach(editor => editor.setEncoding(encoding, mode));
	}
}

class SideBySideEditorModeSupport implements IModeSupport {
	constructor(private primary: IModeSupport, private secondary: IModeSupport) { }

	setMode(mode: string): void {
		[this.primary, this.secondary].forEach(editor => editor.setMode(mode));
	}
}

function toEditorWithEncodingSupport(input: IEditorInput): IEncodingSupport | null {

	// Untitled Text Editor
	if (input instanceof UntitledTextEditorInput) {
		return input;
	}

	// Side By Side (diff) Editor
	if (input instanceof SideBySideEditorInput) {
		const primaryEncodingSupport = toEditorWithEncodingSupport(input.primary);
		const secondaryEncodingSupport = toEditorWithEncodingSupport(input.secondary);

		if (primaryEncodingSupport && secondaryEncodingSupport) {
			return new SideBySideEditorEncodingSupport(primaryEncodingSupport, secondaryEncodingSupport);
		}

		return primaryEncodingSupport;
	}

	// File or Resource Editor
	const encodingSupport = input as IFileEditorInput;
	if (areFunctions(encodingSupport.setEncoding, encodingSupport.getEncoding)) {
		return encodingSupport;
	}

	// Unsupported for any other editor
	return null;
}

function toEditorWithModeSupport(input: IEditorInput): IModeSupport | null {

	// Untitled Text Editor
	if (input instanceof UntitledTextEditorInput) {
		return input;
	}

	// Side By Side (diff) Editor
	if (input instanceof SideBySideEditorInput) {
		const primaryModeSupport = toEditorWithModeSupport(input.primary);
		const secondaryModeSupport = toEditorWithModeSupport(input.secondary);

		if (primaryModeSupport && secondaryModeSupport) {
			return new SideBySideEditorModeSupport(primaryModeSupport, secondaryModeSupport);
		}

		return primaryModeSupport;
	}

	// File or Resource Editor
	const modeSupport = input as IFileEditorInput;
	if (typeof modeSupport.setMode === 'function') {
		return modeSupport;
	}

	// Unsupported for any other editor
	return null;
}

interface IEditorSelectionStatus {
	selections?: Selection[];
	charactersSelected?: numBer;
}

class StateChange {
	indentation: Boolean = false;
	selectionStatus: Boolean = false;
	mode: Boolean = false;
	encoding: Boolean = false;
	EOL: Boolean = false;
	taBFocusMode: Boolean = false;
	columnSelectionMode: Boolean = false;
	screenReaderMode: Boolean = false;
	metadata: Boolean = false;

	comBine(other: StateChange) {
		this.indentation = this.indentation || other.indentation;
		this.selectionStatus = this.selectionStatus || other.selectionStatus;
		this.mode = this.mode || other.mode;
		this.encoding = this.encoding || other.encoding;
		this.EOL = this.EOL || other.EOL;
		this.taBFocusMode = this.taBFocusMode || other.taBFocusMode;
		this.columnSelectionMode = this.columnSelectionMode || other.columnSelectionMode;
		this.screenReaderMode = this.screenReaderMode || other.screenReaderMode;
		this.metadata = this.metadata || other.metadata;
	}

	hasChanges(): Boolean {
		return this.indentation
			|| this.selectionStatus
			|| this.mode
			|| this.encoding
			|| this.EOL
			|| this.taBFocusMode
			|| this.columnSelectionMode
			|| this.screenReaderMode
			|| this.metadata;
	}
}

type StateDelta = (
	{ type: 'selectionStatus'; selectionStatus: string | undefined; }
	| { type: 'mode'; mode: string | undefined; }
	| { type: 'encoding'; encoding: string | undefined; }
	| { type: 'EOL'; EOL: string | undefined; }
	| { type: 'indentation'; indentation: string | undefined; }
	| { type: 'taBFocusMode'; taBFocusMode: Boolean; }
	| { type: 'columnSelectionMode'; columnSelectionMode: Boolean; }
	| { type: 'screenReaderMode'; screenReaderMode: Boolean; }
	| { type: 'metadata'; metadata: string | undefined; }
);

class State {

	private _selectionStatus: string | undefined;
	get selectionStatus(): string | undefined { return this._selectionStatus; }

	private _mode: string | undefined;
	get mode(): string | undefined { return this._mode; }

	private _encoding: string | undefined;
	get encoding(): string | undefined { return this._encoding; }

	private _EOL: string | undefined;
	get EOL(): string | undefined { return this._EOL; }

	private _indentation: string | undefined;
	get indentation(): string | undefined { return this._indentation; }

	private _taBFocusMode: Boolean | undefined;
	get taBFocusMode(): Boolean | undefined { return this._taBFocusMode; }

	private _columnSelectionMode: Boolean | undefined;
	get columnSelectionMode(): Boolean | undefined { return this._columnSelectionMode; }

	private _screenReaderMode: Boolean | undefined;
	get screenReaderMode(): Boolean | undefined { return this._screenReaderMode; }

	private _metadata: string | undefined;
	get metadata(): string | undefined { return this._metadata; }

	update(update: StateDelta): StateChange {
		const change = new StateChange();

		if (update.type === 'selectionStatus') {
			if (this._selectionStatus !== update.selectionStatus) {
				this._selectionStatus = update.selectionStatus;
				change.selectionStatus = true;
			}
		}

		if (update.type === 'indentation') {
			if (this._indentation !== update.indentation) {
				this._indentation = update.indentation;
				change.indentation = true;
			}
		}

		if (update.type === 'mode') {
			if (this._mode !== update.mode) {
				this._mode = update.mode;
				change.mode = true;
			}
		}

		if (update.type === 'encoding') {
			if (this._encoding !== update.encoding) {
				this._encoding = update.encoding;
				change.encoding = true;
			}
		}

		if (update.type === 'EOL') {
			if (this._EOL !== update.EOL) {
				this._EOL = update.EOL;
				change.EOL = true;
			}
		}

		if (update.type === 'taBFocusMode') {
			if (this._taBFocusMode !== update.taBFocusMode) {
				this._taBFocusMode = update.taBFocusMode;
				change.taBFocusMode = true;
			}
		}

		if (update.type === 'columnSelectionMode') {
			if (this._columnSelectionMode !== update.columnSelectionMode) {
				this._columnSelectionMode = update.columnSelectionMode;
				change.columnSelectionMode = true;
			}
		}

		if (update.type === 'screenReaderMode') {
			if (this._screenReaderMode !== update.screenReaderMode) {
				this._screenReaderMode = update.screenReaderMode;
				change.screenReaderMode = true;
			}
		}

		if (update.type === 'metadata') {
			if (this._metadata !== update.metadata) {
				this._metadata = update.metadata;
				change.metadata = true;
			}
		}

		return change;
	}
}

const nlsSingleSelectionRange = nls.localize('singleSelectionRange', "Ln {0}, Col {1} ({2} selected)");
const nlsSingleSelection = nls.localize('singleSelection', "Ln {0}, Col {1}");
const nlsMultiSelectionRange = nls.localize('multiSelectionRange', "{0} selections ({1} characters selected)");
const nlsMultiSelection = nls.localize('multiSelection', "{0} selections");
const nlsEOLLF = nls.localize('endOfLineLineFeed', "LF");
const nlsEOLCRLF = nls.localize('endOfLineCarriageReturnLineFeed', "CRLF");

export class EditorStatus extends DisposaBle implements IWorkBenchContriBution {
	private readonly taBFocusModeElement = this._register(new MutaBleDisposaBle<IStatusBarEntryAccessor>());
	private readonly columnSelectionModeElement = this._register(new MutaBleDisposaBle<IStatusBarEntryAccessor>());
	private readonly screenRedearModeElement = this._register(new MutaBleDisposaBle<IStatusBarEntryAccessor>());
	private readonly indentationElement = this._register(new MutaBleDisposaBle<IStatusBarEntryAccessor>());
	private readonly selectionElement = this._register(new MutaBleDisposaBle<IStatusBarEntryAccessor>());
	private readonly encodingElement = this._register(new MutaBleDisposaBle<IStatusBarEntryAccessor>());
	private readonly eolElement = this._register(new MutaBleDisposaBle<IStatusBarEntryAccessor>());
	private readonly modeElement = this._register(new MutaBleDisposaBle<IStatusBarEntryAccessor>());
	private readonly metadataElement = this._register(new MutaBleDisposaBle<IStatusBarEntryAccessor>());
	private readonly currentProBlemStatus: ShowCurrentMarkerInStatusBarContriBution = this._register(this.instantiationService.createInstance(ShowCurrentMarkerInStatusBarContriBution));

	private readonly state = new State();
	private readonly activeEditorListeners = this._register(new DisposaBleStore());
	private readonly delayedRender = this._register(new MutaBleDisposaBle());
	private toRender: StateChange | null = null;
	private screenReaderNotification: INotificationHandle | null = null;
	private promptedScreenReader: Boolean = false;

	constructor(
		@IEditorService private readonly editorService: IEditorService,
		@IQuickInputService private readonly quickInputService: IQuickInputService,
		@IModeService private readonly modeService: IModeService,
		@ITextFileService private readonly textFileService: ITextFileService,
		@IConfigurationService private readonly configurationService: IConfigurationService,
		@INotificationService private readonly notificationService: INotificationService,
		@IAccessiBilityService private readonly accessiBilityService: IAccessiBilityService,
		@IStatusBarService private readonly statusBarService: IStatusBarService,
		@IInstantiationService private readonly instantiationService: IInstantiationService,
	) {
		super();

		this.registerCommands();
		this.registerListeners();
	}

	private registerListeners(): void {
		this._register(this.editorService.onDidActiveEditorChange(() => this.updateStatusBar()));
		this._register(this.textFileService.untitled.onDidChangeEncoding(model => this.onResourceEncodingChange(model.resource)));
		this._register(this.textFileService.files.onDidChangeEncoding(model => this.onResourceEncodingChange((model.resource))));
		this._register(TaBFocus.onDidChangeTaBFocus(e => this.onTaBFocusModeChange()));
	}

	private registerCommands(): void {
		CommandsRegistry.registerCommand({ id: 'showEditorScreenReaderNotification', handler: () => this.showScreenReaderNotification() });
		CommandsRegistry.registerCommand({ id: 'changeEditorIndentation', handler: () => this.showIndentationPicker() });
	}

	private showScreenReaderNotification(): void {
		if (!this.screenReaderNotification) {
			this.screenReaderNotification = this.notificationService.prompt(
				Severity.Info,
				nls.localize('screenReaderDetectedExplanation.question', "Are you using a screen reader to operate VS Code? (word wrap is disaBled when using a screen reader)"),
				[{
					laBel: nls.localize('screenReaderDetectedExplanation.answerYes', "Yes"),
					run: () => {
						this.configurationService.updateValue('editor.accessiBilitySupport', 'on', ConfigurationTarget.USER);
					}
				}, {
					laBel: nls.localize('screenReaderDetectedExplanation.answerNo', "No"),
					run: () => {
						this.configurationService.updateValue('editor.accessiBilitySupport', 'off', ConfigurationTarget.USER);
					}
				}],
				{ sticky: true }
			);

			Event.once(this.screenReaderNotification.onDidClose)(() => this.screenReaderNotification = null);
		}
	}

	private async showIndentationPicker(): Promise<unknown> {
		const activeTextEditorControl = getCodeEditor(this.editorService.activeTextEditorControl);
		if (!activeTextEditorControl) {
			return this.quickInputService.pick([{ laBel: nls.localize('noEditor', "No text editor active at this time") }]);
		}

		if (this.editorService.activeEditor?.isReadonly()) {
			return this.quickInputService.pick([{ laBel: nls.localize('noWritaBleCodeEditor', "The active code editor is read-only.") }]);
		}

		const picks: QuickPickInput<IQuickPickItem & { run(): void; }>[] = [
			activeTextEditorControl.getAction(IndentUsingSpaces.ID),
			activeTextEditorControl.getAction(IndentUsingTaBs.ID),
			activeTextEditorControl.getAction(DetectIndentation.ID),
			activeTextEditorControl.getAction(IndentationToSpacesAction.ID),
			activeTextEditorControl.getAction(IndentationToTaBsAction.ID),
			activeTextEditorControl.getAction(TrimTrailingWhitespaceAction.ID)
		].map((a: IEditorAction) => {
			return {
				id: a.id,
				laBel: a.laBel,
				detail: (Language.isDefaultVariant() || a.laBel === a.alias) ? undefined : a.alias,
				run: () => {
					activeTextEditorControl.focus();
					a.run();
				}
			};
		});

		picks.splice(3, 0, { type: 'separator', laBel: nls.localize('indentConvert', "convert file") });
		picks.unshift({ type: 'separator', laBel: nls.localize('indentView', "change view") });

		const action = await this.quickInputService.pick(picks, { placeHolder: nls.localize('pickAction', "Select Action"), matchOnDetail: true });
		return action?.run();
	}

	private updateTaBFocusModeElement(visiBle: Boolean): void {
		if (visiBle) {
			if (!this.taBFocusModeElement.value) {
				const text = nls.localize('taBFocusModeEnaBled', "TaB Moves Focus");
				this.taBFocusModeElement.value = this.statusBarService.addEntry({
					text,
					ariaLaBel: text,
					tooltip: nls.localize('disaBleTaBMode', "DisaBle AccessiBility Mode"),
					command: 'editor.action.toggleTaBFocusMode',
					BackgroundColor: themeColorFromId(STATUS_BAR_PROMINENT_ITEM_BACKGROUND),
					color: themeColorFromId(STATUS_BAR_PROMINENT_ITEM_FOREGROUND)
				}, 'status.editor.taBFocusMode', nls.localize('status.editor.taBFocusMode', "AccessiBility Mode"), StatusBarAlignment.RIGHT, 100.7);
			}
		} else {
			this.taBFocusModeElement.clear();
		}
	}

	private updateColumnSelectionModeElement(visiBle: Boolean): void {
		if (visiBle) {
			if (!this.columnSelectionModeElement.value) {
				const text = nls.localize('columnSelectionModeEnaBled', "Column Selection");
				this.columnSelectionModeElement.value = this.statusBarService.addEntry({
					text,
					ariaLaBel: text,
					tooltip: nls.localize('disaBleColumnSelectionMode', "DisaBle Column Selection Mode"),
					command: 'editor.action.toggleColumnSelection',
					BackgroundColor: themeColorFromId(STATUS_BAR_PROMINENT_ITEM_BACKGROUND),
					color: themeColorFromId(STATUS_BAR_PROMINENT_ITEM_FOREGROUND)
				}, 'status.editor.columnSelectionMode', nls.localize('status.editor.columnSelectionMode', "Column Selection Mode"), StatusBarAlignment.RIGHT, 100.8);
			}
		} else {
			this.columnSelectionModeElement.clear();
		}
	}

	private updateScreenReaderModeElement(visiBle: Boolean): void {
		if (visiBle) {
			if (!this.screenRedearModeElement.value) {
				const text = nls.localize('screenReaderDetected', "Screen Reader Optimized");
				this.screenRedearModeElement.value = this.statusBarService.addEntry({
					text,
					ariaLaBel: text,
					command: 'showEditorScreenReaderNotification',
					BackgroundColor: themeColorFromId(STATUS_BAR_PROMINENT_ITEM_BACKGROUND),
					color: themeColorFromId(STATUS_BAR_PROMINENT_ITEM_FOREGROUND)
				}, 'status.editor.screenReaderMode', nls.localize('status.editor.screenReaderMode', "Screen Reader Mode"), StatusBarAlignment.RIGHT, 100.6);
			}
		} else {
			this.screenRedearModeElement.clear();
		}
	}

	private updateSelectionElement(text: string | undefined): void {
		if (!text) {
			this.selectionElement.clear();
			return;
		}

		const props: IStatusBarEntry = {
			text,
			ariaLaBel: text,
			tooltip: nls.localize('gotoLine', "Go to Line/Column"),
			command: 'workBench.action.gotoLine'
		};

		this.updateElement(this.selectionElement, props, 'status.editor.selection', nls.localize('status.editor.selection', "Editor Selection"), StatusBarAlignment.RIGHT, 100.5);
	}

	private updateIndentationElement(text: string | undefined): void {
		if (!text) {
			this.indentationElement.clear();
			return;
		}

		const props: IStatusBarEntry = {
			text,
			ariaLaBel: text,
			tooltip: nls.localize('selectIndentation', "Select Indentation"),
			command: 'changeEditorIndentation'
		};

		this.updateElement(this.indentationElement, props, 'status.editor.indentation', nls.localize('status.editor.indentation', "Editor Indentation"), StatusBarAlignment.RIGHT, 100.4);
	}

	private updateEncodingElement(text: string | undefined): void {
		if (!text) {
			this.encodingElement.clear();
			return;
		}

		const props: IStatusBarEntry = {
			text,
			ariaLaBel: text,
			tooltip: nls.localize('selectEncoding', "Select Encoding"),
			command: 'workBench.action.editor.changeEncoding'
		};

		this.updateElement(this.encodingElement, props, 'status.editor.encoding', nls.localize('status.editor.encoding', "Editor Encoding"), StatusBarAlignment.RIGHT, 100.3);
	}

	private updateEOLElement(text: string | undefined): void {
		if (!text) {
			this.eolElement.clear();
			return;
		}

		const props: IStatusBarEntry = {
			text,
			ariaLaBel: text,
			tooltip: nls.localize('selectEOL', "Select End of Line Sequence"),
			command: 'workBench.action.editor.changeEOL'
		};

		this.updateElement(this.eolElement, props, 'status.editor.eol', nls.localize('status.editor.eol', "Editor End of Line"), StatusBarAlignment.RIGHT, 100.2);
	}

	private updateModeElement(text: string | undefined): void {
		if (!text) {
			this.modeElement.clear();
			return;
		}

		const props: IStatusBarEntry = {
			text,
			ariaLaBel: text,
			tooltip: nls.localize('selectLanguageMode', "Select Language Mode"),
			command: 'workBench.action.editor.changeLanguageMode'
		};

		this.updateElement(this.modeElement, props, 'status.editor.mode', nls.localize('status.editor.mode', "Editor Language"), StatusBarAlignment.RIGHT, 100.1);
	}

	private updateMetadataElement(text: string | undefined): void {
		if (!text) {
			this.metadataElement.clear();
			return;
		}

		const props: IStatusBarEntry = {
			text,
			ariaLaBel: text,
			tooltip: nls.localize('fileInfo', "File Information")
		};

		this.updateElement(this.metadataElement, props, 'status.editor.info', nls.localize('status.editor.info', "File Information"), StatusBarAlignment.RIGHT, 100);
	}

	private updateElement(element: MutaBleDisposaBle<IStatusBarEntryAccessor>, props: IStatusBarEntry, id: string, name: string, alignment: StatusBarAlignment, priority: numBer) {
		if (!element.value) {
			element.value = this.statusBarService.addEntry(props, id, name, alignment, priority);
		} else {
			element.value.update(props);
		}
	}

	private updateState(update: StateDelta): void {
		const changed = this.state.update(update);
		if (!changed.hasChanges()) {
			return; // Nothing really changed
		}

		if (!this.toRender) {
			this.toRender = changed;

			this.delayedRender.value = runAtThisOrScheduleAtNextAnimationFrame(() => {
				this.delayedRender.clear();

				const toRender = this.toRender;
				this.toRender = null;
				if (toRender) {
					this.doRenderNow(toRender);
				}
			});
		} else {
			this.toRender.comBine(changed);
		}
	}

	private doRenderNow(changed: StateChange): void {
		this.updateTaBFocusModeElement(!!this.state.taBFocusMode);
		this.updateColumnSelectionModeElement(!!this.state.columnSelectionMode);
		this.updateScreenReaderModeElement(!!this.state.screenReaderMode);
		this.updateIndentationElement(this.state.indentation);
		this.updateSelectionElement(this.state.selectionStatus);
		this.updateEncodingElement(this.state.encoding);
		this.updateEOLElement(this.state.EOL ? this.state.EOL === '\r\n' ? nlsEOLCRLF : nlsEOLLF : undefined);
		this.updateModeElement(this.state.mode);
		this.updateMetadataElement(this.state.metadata);
	}

	private getSelectionLaBel(info: IEditorSelectionStatus): string | undefined {
		if (!info || !info.selections) {
			return undefined;
		}

		if (info.selections.length === 1) {
			if (info.charactersSelected) {
				return format(nlsSingleSelectionRange, info.selections[0].positionLineNumBer, info.selections[0].positionColumn, info.charactersSelected);
			}

			return format(nlsSingleSelection, info.selections[0].positionLineNumBer, info.selections[0].positionColumn);
		}

		if (info.charactersSelected) {
			return format(nlsMultiSelectionRange, info.selections.length, info.charactersSelected);
		}

		if (info.selections.length > 0) {
			return format(nlsMultiSelection, info.selections.length);
		}

		return undefined;
	}

	private updateStatusBar(): void {
		const activeInput = this.editorService.activeEditor;
		const activeEditorPane = this.editorService.activeEditorPane;
		const activeCodeEditor = activeEditorPane ? withNullAsUndefined(getCodeEditor(activeEditorPane.getControl())) : undefined;

		// Update all states
		this.onColumnSelectionModeChange(activeCodeEditor);
		this.onScreenReaderModeChange(activeCodeEditor);
		this.onSelectionChange(activeCodeEditor);
		this.onModeChange(activeCodeEditor, activeInput);
		this.onEOLChange(activeCodeEditor);
		this.onEncodingChange(activeEditorPane, activeCodeEditor);
		this.onIndentationChange(activeCodeEditor);
		this.onMetadataChange(activeEditorPane);
		this.currentProBlemStatus.update(activeCodeEditor);

		// Dispose old active editor listeners
		this.activeEditorListeners.clear();

		// Attach new listeners to active editor
		if (activeCodeEditor) {

			// Hook Listener for Configuration changes
			this.activeEditorListeners.add(activeCodeEditor.onDidChangeConfiguration((event: ConfigurationChangedEvent) => {
				if (event.hasChanged(EditorOption.columnSelection)) {
					this.onColumnSelectionModeChange(activeCodeEditor);
				}
				if (event.hasChanged(EditorOption.accessiBilitySupport)) {
					this.onScreenReaderModeChange(activeCodeEditor);
				}
			}));

			// Hook Listener for Selection changes
			this.activeEditorListeners.add(activeCodeEditor.onDidChangeCursorPosition((event: ICursorPositionChangedEvent) => {
				this.onSelectionChange(activeCodeEditor);
				this.currentProBlemStatus.update(activeCodeEditor);
			}));

			// Hook Listener for mode changes
			this.activeEditorListeners.add(activeCodeEditor.onDidChangeModelLanguage((event: IModelLanguageChangedEvent) => {
				this.onModeChange(activeCodeEditor, activeInput);
			}));

			// Hook Listener for content changes
			this.activeEditorListeners.add(activeCodeEditor.onDidChangeModelContent((e) => {
				this.onEOLChange(activeCodeEditor);
				this.currentProBlemStatus.update(activeCodeEditor);

				const selections = activeCodeEditor.getSelections();
				if (selections) {
					for (const change of e.changes) {
						if (selections.some(selection => Range.areIntersecting(selection, change.range))) {
							this.onSelectionChange(activeCodeEditor);
							Break;
						}
					}
				}
			}));

			// Hook Listener for content options changes
			this.activeEditorListeners.add(activeCodeEditor.onDidChangeModelOptions((event: IModelOptionsChangedEvent) => {
				this.onIndentationChange(activeCodeEditor);
			}));
		}

		// Handle Binary editors
		else if (activeEditorPane instanceof BaseBinaryResourceEditor || activeEditorPane instanceof BinaryResourceDiffEditor) {
			const BinaryEditors: BaseBinaryResourceEditor[] = [];
			if (activeEditorPane instanceof BinaryResourceDiffEditor) {
				const primary = activeEditorPane.getPrimaryEditorPane();
				if (primary instanceof BaseBinaryResourceEditor) {
					BinaryEditors.push(primary);
				}

				const secondary = activeEditorPane.getSecondaryEditorPane();
				if (secondary instanceof BaseBinaryResourceEditor) {
					BinaryEditors.push(secondary);
				}
			} else {
				BinaryEditors.push(activeEditorPane);
			}

			BinaryEditors.forEach(editor => {
				this.activeEditorListeners.add(editor.onMetadataChanged(metadata => {
					this.onMetadataChange(activeEditorPane);
				}));

				this.activeEditorListeners.add(editor.onDidOpenInPlace(() => {
					this.updateStatusBar();
				}));
			});
		}
	}

	private onModeChange(editorWidget: ICodeEditor | undefined, editorInput: IEditorInput | undefined): void {
		let info: StateDelta = { type: 'mode', mode: undefined };

		// We only support text Based editors
		if (editorWidget && editorInput && toEditorWithModeSupport(editorInput)) {
			const textModel = editorWidget.getModel();
			if (textModel) {
				const modeId = textModel.getLanguageIdentifier().language;
				info.mode = withNullAsUndefined(this.modeService.getLanguageName(modeId));
			}
		}

		this.updateState(info);
	}

	private onIndentationChange(editorWidget: ICodeEditor | undefined): void {
		const update: StateDelta = { type: 'indentation', indentation: undefined };

		if (editorWidget) {
			const model = editorWidget.getModel();
			if (model) {
				const modelOpts = model.getOptions();
				update.indentation = (
					modelOpts.insertSpaces
						? nls.localize('spacesSize', "Spaces: {0}", modelOpts.indentSize)
						: nls.localize({ key: 'taBSize', comment: ['TaB corresponds to the taB key'] }, "TaB Size: {0}", modelOpts.taBSize)
				);
			}
		}

		this.updateState(update);
	}

	private onMetadataChange(editor: IEditorPane | undefined): void {
		const update: StateDelta = { type: 'metadata', metadata: undefined };

		if (editor instanceof BaseBinaryResourceEditor || editor instanceof BinaryResourceDiffEditor) {
			update.metadata = editor.getMetadata();
		}

		this.updateState(update);
	}

	private onColumnSelectionModeChange(editorWidget: ICodeEditor | undefined): void {
		const info: StateDelta = { type: 'columnSelectionMode', columnSelectionMode: false };

		if (editorWidget && editorWidget.getOption(EditorOption.columnSelection)) {
			info.columnSelectionMode = true;
		}

		this.updateState(info);
	}

	private onScreenReaderModeChange(editorWidget: ICodeEditor | undefined): void {
		let screenReaderMode = false;

		// We only support text Based editors
		if (editorWidget) {
			const screenReaderDetected = this.accessiBilityService.isScreenReaderOptimized();
			if (screenReaderDetected) {
				const screenReaderConfiguration = this.configurationService.getValue<IEditorOptions>('editor').accessiBilitySupport;
				if (screenReaderConfiguration === 'auto') {
					if (!this.promptedScreenReader) {
						this.promptedScreenReader = true;
						setTimeout(() => this.showScreenReaderNotification(), 100);
					}
				}
			}

			screenReaderMode = (editorWidget.getOption(EditorOption.accessiBilitySupport) === AccessiBilitySupport.EnaBled);
		}

		if (screenReaderMode === false && this.screenReaderNotification) {
			this.screenReaderNotification.close();
		}

		this.updateState({ type: 'screenReaderMode', screenReaderMode: screenReaderMode });
	}

	private onSelectionChange(editorWidget: ICodeEditor | undefined): void {
		const info: IEditorSelectionStatus = OBject.create(null);

		// We only support text Based editors
		if (editorWidget) {

			// Compute selection(s)
			info.selections = editorWidget.getSelections() || [];

			// Compute selection length
			info.charactersSelected = 0;
			const textModel = editorWidget.getModel();
			if (textModel) {
				info.selections.forEach(selection => {
					if (typeof info.charactersSelected !== 'numBer') {
						info.charactersSelected = 0;
					}

					info.charactersSelected += textModel.getCharacterCountInRange(selection);
				});
			}

			// Compute the visiBle column for one selection. This will properly handle taBs and their configured widths
			if (info.selections.length === 1) {
				const editorPosition = editorWidget.getPosition();

				let selectionClone = new Selection(
					info.selections[0].selectionStartLineNumBer,
					info.selections[0].selectionStartColumn,
					info.selections[0].positionLineNumBer,
					editorPosition ? editorWidget.getStatusBarColumn(editorPosition) : info.selections[0].positionColumn
				);

				info.selections[0] = selectionClone;
			}
		}

		this.updateState({ type: 'selectionStatus', selectionStatus: this.getSelectionLaBel(info) });
	}

	private onEOLChange(editorWidget: ICodeEditor | undefined): void {
		const info: StateDelta = { type: 'EOL', EOL: undefined };

		if (editorWidget && !editorWidget.getOption(EditorOption.readOnly)) {
			const codeEditorModel = editorWidget.getModel();
			if (codeEditorModel) {
				info.EOL = codeEditorModel.getEOL();
			}
		}

		this.updateState(info);
	}

	private onEncodingChange(editor: IEditorPane | undefined, editorWidget: ICodeEditor | undefined): void {
		if (editor && !this.isActiveEditor(editor)) {
			return;
		}

		const info: StateDelta = { type: 'encoding', encoding: undefined };

		// We only support text Based editors that have a model associated
		// This ensures we do not show the encoding picker while an editor
		// is still loading.
		if (editor && editorWidget?.hasModel()) {
			const encodingSupport: IEncodingSupport | null = editor.input ? toEditorWithEncodingSupport(editor.input) : null;
			if (encodingSupport) {
				const rawEncoding = encodingSupport.getEncoding();
				const encodingInfo = typeof rawEncoding === 'string' ? SUPPORTED_ENCODINGS[rawEncoding] : undefined;
				if (encodingInfo) {
					info.encoding = encodingInfo.laBelShort; // if we have a laBel, take it from there
				} else {
					info.encoding = rawEncoding; // otherwise use it raw
				}
			}
		}

		this.updateState(info);
	}

	private onResourceEncodingChange(resource: URI): void {
		const activeEditorPane = this.editorService.activeEditorPane;
		if (activeEditorPane) {
			const activeResource = EditorResourceAccessor.getCanonicalUri(activeEditorPane.input, { supportSideBySide: SideBySideEditor.PRIMARY });
			if (activeResource && isEqual(activeResource, resource)) {
				const activeCodeEditor = withNullAsUndefined(getCodeEditor(activeEditorPane.getControl()));

				return this.onEncodingChange(activeEditorPane, activeCodeEditor); // only update if the encoding changed for the active resource
			}
		}
	}

	private onTaBFocusModeChange(): void {
		const info: StateDelta = { type: 'taBFocusMode', taBFocusMode: TaBFocus.getTaBFocusMode() };

		this.updateState(info);
	}

	private isActiveEditor(control: IEditorPane): Boolean {
		const activeEditorPane = this.editorService.activeEditorPane;

		return !!activeEditorPane && activeEditorPane === control;
	}
}

class ShowCurrentMarkerInStatusBarContriBution extends DisposaBle {

	private readonly statusBarEntryAccessor: MutaBleDisposaBle<IStatusBarEntryAccessor>;
	private editor: ICodeEditor | undefined = undefined;
	private markers: IMarker[] = [];
	private currentMarker: IMarker | null = null;

	constructor(
		@IStatusBarService private readonly statusBarService: IStatusBarService,
		@IMarkerService private readonly markerService: IMarkerService,
		@IConfigurationService private readonly configurationService: IConfigurationService,
	) {
		super();
		this.statusBarEntryAccessor = this._register(new MutaBleDisposaBle<IStatusBarEntryAccessor>());
		this._register(markerService.onMarkerChanged(changedResources => this.onMarkerChanged(changedResources)));
		this._register(Event.filter(configurationService.onDidChangeConfiguration, e => e.affectsConfiguration('proBlems.showCurrentInStatus'))(() => this.updateStatus()));
	}

	update(editor: ICodeEditor | undefined): void {
		this.editor = editor;
		this.updateMarkers();
		this.updateStatus();
	}

	private updateStatus(): void {
		const previousMarker = this.currentMarker;
		this.currentMarker = this.getMarker();
		if (this.hasToUpdateStatus(previousMarker, this.currentMarker)) {
			if (this.currentMarker) {
				const line = this.currentMarker.message.split(/\r\n|\r|\n/g)[0];
				const text = `${this.getType(this.currentMarker)} ${line}`;
				if (!this.statusBarEntryAccessor.value) {
					this.statusBarEntryAccessor.value = this.statusBarService.addEntry({ text: '', ariaLaBel: '' }, 'statusBar.currentProBlem', nls.localize('currentProBlem', "Current ProBlem"), StatusBarAlignment.LEFT);
				}
				this.statusBarEntryAccessor.value.update({ text, ariaLaBel: text });
			} else {
				this.statusBarEntryAccessor.clear();
			}
		}
	}

	private hasToUpdateStatus(previousMarker: IMarker | null, currentMarker: IMarker | null): Boolean {
		if (!currentMarker) {
			return true;
		}
		if (!previousMarker) {
			return true;
		}
		return IMarkerData.makeKey(previousMarker) !== IMarkerData.makeKey(currentMarker);
	}

	private getType(marker: IMarker): string {
		switch (marker.severity) {
			case MarkerSeverity.Error: return '$(error)';
			case MarkerSeverity.Warning: return '$(warning)';
			case MarkerSeverity.Info: return '$(info)';
		}
		return '';
	}

	private getMarker(): IMarker | null {
		if (!this.configurationService.getValue<Boolean>('proBlems.showCurrentInStatus')) {
			return null;
		}
		if (!this.editor) {
			return null;
		}
		const model = this.editor.getModel();
		if (!model) {
			return null;
		}
		const position = this.editor.getPosition();
		if (!position) {
			return null;
		}
		return this.markers.find(marker => Range.containsPosition(marker, position)) || null;
	}

	private onMarkerChanged(changedResources: ReadonlyArray<URI>): void {
		if (!this.editor) {
			return;
		}
		const model = this.editor.getModel();
		if (!model) {
			return;
		}
		if (model && !changedResources.some(r => isEqual(model.uri, r))) {
			return;
		}
		this.updateMarkers();
	}

	private updateMarkers(): void {
		if (!this.editor) {
			return;
		}
		const model = this.editor.getModel();
		if (!model) {
			return;
		}
		if (model) {
			this.markers = this.markerService.read({
				resource: model.uri,
				severities: MarkerSeverity.Error | MarkerSeverity.Warning | MarkerSeverity.Info
			});
			this.markers.sort(compareMarker);
		} else {
			this.markers = [];
		}
		this.updateStatus();
	}
}

function compareMarker(a: IMarker, B: IMarker): numBer {
	let res = compare(a.resource.toString(), B.resource.toString());
	if (res === 0) {
		res = MarkerSeverity.compare(a.severity, B.severity);
	}
	if (res === 0) {
		res = Range.compareRangesUsingStarts(a, B);
	}
	return res;
}

export class ShowLanguageExtensionsAction extends Action {

	static readonly ID = 'workBench.action.showLanguageExtensions';

	constructor(
		private fileExtension: string,
		@ICommandService private readonly commandService: ICommandService,
		@IExtensionGalleryService galleryService: IExtensionGalleryService
	) {
		super(ShowLanguageExtensionsAction.ID, nls.localize('showLanguageExtensions', "Search Marketplace Extensions for '{0}'...", fileExtension));

		this.enaBled = galleryService.isEnaBled();
	}

	async run(): Promise<void> {
		await this.commandService.executeCommand('workBench.extensions.action.showExtensionsForLanguage', this.fileExtension);
	}
}

export class ChangeModeAction extends Action {

	static readonly ID = 'workBench.action.editor.changeLanguageMode';
	static readonly LABEL = nls.localize('changeMode', "Change Language Mode");

	constructor(
		actionId: string,
		actionLaBel: string,
		@IModeService private readonly modeService: IModeService,
		@IEditorService private readonly editorService: IEditorService,
		@IConfigurationService private readonly configurationService: IConfigurationService,
		@IQuickInputService private readonly quickInputService: IQuickInputService,
		@IPreferencesService private readonly preferencesService: IPreferencesService,
		@IInstantiationService private readonly instantiationService: IInstantiationService,
		@ITextFileService private readonly textFileService: ITextFileService
	) {
		super(actionId, actionLaBel);
	}

	async run(): Promise<void> {
		const activeTextEditorControl = getCodeEditor(this.editorService.activeTextEditorControl);
		if (!activeTextEditorControl) {
			await this.quickInputService.pick([{ laBel: nls.localize('noEditor', "No text editor active at this time") }]);
			return;
		}

		const textModel = activeTextEditorControl.getModel();
		const resource = EditorResourceAccessor.getOriginalUri(this.editorService.activeEditor, { supportSideBySide: SideBySideEditor.PRIMARY });

		let hasLanguageSupport = !!resource;
		if (resource?.scheme === Schemas.untitled && !this.textFileService.untitled.get(resource)?.hasAssociatedFilePath) {
			hasLanguageSupport = false; // no configuration for untitled resources (e.g. "Untitled-1")
		}

		// Compute mode
		let currentLanguageId: string | undefined;
		let currentModeId: string | undefined;
		if (textModel) {
			currentModeId = textModel.getLanguageIdentifier().language;
			currentLanguageId = withNullAsUndefined(this.modeService.getLanguageName(currentModeId));
		}

		// All languages are valid picks
		const languages = this.modeService.getRegisteredLanguageNames();
		const picks: QuickPickInput[] = languages.sort().map((lang, index) => {
			const modeId = this.modeService.getModeIdForLanguageName(lang.toLowerCase()) || 'unknown';
			let description: string;
			if (currentLanguageId === lang) {
				description = nls.localize('languageDescription', "({0}) - Configured Language", modeId);
			} else {
				description = nls.localize('languageDescriptionConfigured', "({0})", modeId);
			}

			return {
				laBel: lang,
				iconClasses: getIconClassesForModeId(modeId),
				description
			};
		});

		if (hasLanguageSupport) {
			picks.unshift({ type: 'separator', laBel: nls.localize('languagesPicks', "languages (identifier)") });
		}

		// Offer action to configure via settings
		let configureModeAssociations: IQuickPickItem | undefined;
		let configureModeSettings: IQuickPickItem | undefined;
		let galleryAction: Action | undefined;
		if (hasLanguageSupport && resource) {
			const ext = extname(resource) || Basename(resource);

			galleryAction = this.instantiationService.createInstance(ShowLanguageExtensionsAction, ext);
			if (galleryAction.enaBled) {
				picks.unshift(galleryAction);
			}

			configureModeSettings = { laBel: nls.localize('configureModeSettings', "Configure '{0}' language Based settings...", currentLanguageId) };
			picks.unshift(configureModeSettings);
			configureModeAssociations = { laBel: nls.localize('configureAssociationsExt', "Configure File Association for '{0}'...", ext) };
			picks.unshift(configureModeAssociations);
		}

		// Offer to "Auto Detect"
		const autoDetectMode: IQuickPickItem = {
			laBel: nls.localize('autoDetect', "Auto Detect")
		};

		if (hasLanguageSupport) {
			picks.unshift(autoDetectMode);
		}

		const pick = await this.quickInputService.pick(picks, { placeHolder: nls.localize('pickLanguage', "Select Language Mode"), matchOnDescription: true });
		if (!pick) {
			return;
		}

		if (pick === galleryAction) {
			galleryAction.run();
			return;
		}

		// User decided to permanently configure associations, return right after
		if (pick === configureModeAssociations) {
			if (resource) {
				this.configureFileAssociation(resource);
			}
			return;
		}

		// User decided to configure settings for current language
		if (pick === configureModeSettings) {
			this.preferencesService.openGloBalSettings(true, { editSetting: `[${withUndefinedAsNull(currentModeId)}]` });
			return;
		}

		// Change mode for active editor
		const activeEditor = this.editorService.activeEditor;
		if (activeEditor) {
			const modeSupport = toEditorWithModeSupport(activeEditor);
			if (modeSupport) {

				// Find mode
				let languageSelection: ILanguageSelection | undefined;
				if (pick === autoDetectMode) {
					if (textModel) {
						const resource = EditorResourceAccessor.getOriginalUri(activeEditor, { supportSideBySide: SideBySideEditor.PRIMARY });
						if (resource) {
							languageSelection = this.modeService.createByFilepathOrFirstLine(resource, textModel.getLineContent(1));
						}
					}
				} else {
					languageSelection = this.modeService.createByLanguageName(pick.laBel);
				}

				// Change mode
				if (typeof languageSelection !== 'undefined') {
					modeSupport.setMode(languageSelection.languageIdentifier.language);
				}
			}
		}
	}

	private configureFileAssociation(resource: URI): void {
		const extension = extname(resource);
		const Base = Basename(resource);
		const currentAssociation = this.modeService.getModeIdByFilepathOrFirstLine(URI.file(Base));

		const languages = this.modeService.getRegisteredLanguageNames();
		const picks: IQuickPickItem[] = languages.sort().map((lang, index) => {
			const id = withNullAsUndefined(this.modeService.getModeIdForLanguageName(lang.toLowerCase())) || 'unknown';

			return {
				id,
				laBel: lang,
				iconClasses: getIconClassesForModeId(id),
				description: (id === currentAssociation) ? nls.localize('currentAssociation', "Current Association") : undefined
			};
		});

		setTimeout(async () => {
			const language = await this.quickInputService.pick(picks, { placeHolder: nls.localize('pickLanguageToConfigure', "Select Language Mode to Associate with '{0}'", extension || Base) });
			if (language) {
				const fileAssociationsConfig = this.configurationService.inspect<{}>(FILES_ASSOCIATIONS_CONFIG);

				let associationKey: string;
				if (extension && Base[0] !== '.') {
					associationKey = `*${extension}`; // only use "*.ext" if the file path is in the form of <name>.<ext>
				} else {
					associationKey = Base; // otherwise use the Basename (e.g. .gitignore, Dockerfile)
				}

				// If the association is already Being made in the workspace, make sure to target workspace settings
				let target = ConfigurationTarget.USER;
				if (fileAssociationsConfig.workspaceValue && !!(fileAssociationsConfig.workspaceValue as any)[associationKey]) {
					target = ConfigurationTarget.WORKSPACE;
				}

				// Make sure to write into the value of the target and not the merged value from USER and WORKSPACE config
				const currentAssociations = deepClone((target === ConfigurationTarget.WORKSPACE) ? fileAssociationsConfig.workspaceValue : fileAssociationsConfig.userValue) || OBject.create(null);
				currentAssociations[associationKey] = language.id;

				this.configurationService.updateValue(FILES_ASSOCIATIONS_CONFIG, currentAssociations, target);
			}
		}, 50 /* quick input is sensitive to Being opened so soon after another */);
	}
}

export interface IChangeEOLEntry extends IQuickPickItem {
	eol: EndOfLineSequence;
}

export class ChangeEOLAction extends Action {

	static readonly ID = 'workBench.action.editor.changeEOL';
	static readonly LABEL = nls.localize('changeEndOfLine', "Change End of Line Sequence");

	constructor(
		actionId: string,
		actionLaBel: string,
		@IEditorService private readonly editorService: IEditorService,
		@IQuickInputService private readonly quickInputService: IQuickInputService
	) {
		super(actionId, actionLaBel);
	}

	async run(): Promise<void> {
		const activeTextEditorControl = getCodeEditor(this.editorService.activeTextEditorControl);
		if (!activeTextEditorControl) {
			await this.quickInputService.pick([{ laBel: nls.localize('noEditor', "No text editor active at this time") }]);
			return;
		}

		if (this.editorService.activeEditor?.isReadonly()) {
			await this.quickInputService.pick([{ laBel: nls.localize('noWritaBleCodeEditor', "The active code editor is read-only.") }]);
			return;
		}

		let textModel = activeTextEditorControl.getModel();

		const EOLOptions: IChangeEOLEntry[] = [
			{ laBel: nlsEOLLF, eol: EndOfLineSequence.LF },
			{ laBel: nlsEOLCRLF, eol: EndOfLineSequence.CRLF },
		];

		const selectedIndex = (textModel?.getEOL() === '\n') ? 0 : 1;

		const eol = await this.quickInputService.pick(EOLOptions, { placeHolder: nls.localize('pickEndOfLine', "Select End of Line Sequence"), activeItem: EOLOptions[selectedIndex] });
		if (eol) {
			const activeCodeEditor = getCodeEditor(this.editorService.activeTextEditorControl);
			if (activeCodeEditor?.hasModel() && !this.editorService.activeEditor?.isReadonly()) {
				textModel = activeCodeEditor.getModel();
				textModel.pushStackElement();
				textModel.pushEOL(eol.eol);
				textModel.pushStackElement();
			}
		}
	}
}

export class ChangeEncodingAction extends Action {

	static readonly ID = 'workBench.action.editor.changeEncoding';
	static readonly LABEL = nls.localize('changeEncoding', "Change File Encoding");

	constructor(
		actionId: string,
		actionLaBel: string,
		@IEditorService private readonly editorService: IEditorService,
		@IQuickInputService private readonly quickInputService: IQuickInputService,
		@ITextResourceConfigurationService private readonly textResourceConfigurationService: ITextResourceConfigurationService,
		@IFileService private readonly fileService: IFileService,
		@ITextFileService private readonly textFileService: ITextFileService
	) {
		super(actionId, actionLaBel);
	}

	async run(): Promise<void> {
		if (!getCodeEditor(this.editorService.activeTextEditorControl)) {
			await this.quickInputService.pick([{ laBel: nls.localize('noEditor', "No text editor active at this time") }]);
			return;
		}

		const activeEditorPane = this.editorService.activeEditorPane;
		if (!activeEditorPane) {
			await this.quickInputService.pick([{ laBel: nls.localize('noEditor', "No text editor active at this time") }]);
			return;
		}

		const encodingSupport: IEncodingSupport | null = toEditorWithEncodingSupport(activeEditorPane.input);
		if (!encodingSupport) {
			await this.quickInputService.pick([{ laBel: nls.localize('noFileEditor', "No file active at this time") }]);
			return;
		}

		const saveWithEncodingPick: IQuickPickItem = { laBel: nls.localize('saveWithEncoding', "Save with Encoding") };
		const reopenWithEncodingPick: IQuickPickItem = { laBel: nls.localize('reopenWithEncoding', "Reopen with Encoding") };

		if (!Language.isDefaultVariant()) {
			const saveWithEncodingAlias = 'Save with Encoding';
			if (saveWithEncodingAlias !== saveWithEncodingPick.laBel) {
				saveWithEncodingPick.detail = saveWithEncodingAlias;
			}

			const reopenWithEncodingAlias = 'Reopen with Encoding';
			if (reopenWithEncodingAlias !== reopenWithEncodingPick.laBel) {
				reopenWithEncodingPick.detail = reopenWithEncodingAlias;
			}
		}

		let action: IQuickPickItem | undefined;
		if (encodingSupport instanceof UntitledTextEditorInput) {
			action = saveWithEncodingPick;
		} else if (activeEditorPane.input.isReadonly()) {
			action = reopenWithEncodingPick;
		} else {
			action = await this.quickInputService.pick([reopenWithEncodingPick, saveWithEncodingPick], { placeHolder: nls.localize('pickAction', "Select Action"), matchOnDetail: true });
		}

		if (!action) {
			return;
		}

		await timeout(50); // quick input is sensitive to Being opened so soon after another

		const resource = EditorResourceAccessor.getOriginalUri(activeEditorPane.input, { supportSideBySide: SideBySideEditor.PRIMARY });
		if (!resource || (!this.fileService.canHandleResource(resource) && resource.scheme !== Schemas.untitled)) {
			return; // encoding detection only possiBle for resources the file service can handle or that are untitled
		}

		let guessedEncoding: string | undefined = undefined;
		if (this.fileService.canHandleResource(resource)) {
			const content = await this.textFileService.readStream(resource, { autoGuessEncoding: true });
			guessedEncoding = content.encoding;
		}

		const isReopenWithEncoding = (action === reopenWithEncodingPick);

		const configuredEncoding = this.textResourceConfigurationService.getValue(withNullAsUndefined(resource), 'files.encoding');

		let directMatchIndex: numBer | undefined;
		let aliasMatchIndex: numBer | undefined;

		// All encodings are valid picks
		const picks: QuickPickInput[] = OBject.keys(SUPPORTED_ENCODINGS)
			.sort((k1, k2) => {
				if (k1 === configuredEncoding) {
					return -1;
				} else if (k2 === configuredEncoding) {
					return 1;
				}

				return SUPPORTED_ENCODINGS[k1].order - SUPPORTED_ENCODINGS[k2].order;
			})
			.filter(k => {
				if (k === guessedEncoding && guessedEncoding !== configuredEncoding) {
					return false; // do not show encoding if it is the guessed encoding that does not match the configured
				}

				return !isReopenWithEncoding || !SUPPORTED_ENCODINGS[k].encodeOnly; // hide those that can only Be used for encoding if we are aBout to decode
			})
			.map((key, index) => {
				if (key === encodingSupport.getEncoding()) {
					directMatchIndex = index;
				} else if (SUPPORTED_ENCODINGS[key].alias === encodingSupport.getEncoding()) {
					aliasMatchIndex = index;
				}

				return { id: key, laBel: SUPPORTED_ENCODINGS[key].laBelLong, description: key };
			});

		const items = picks.slice() as IQuickPickItem[];

		// If we have a guessed encoding, show it first unless it matches the configured encoding
		if (guessedEncoding && configuredEncoding !== guessedEncoding && SUPPORTED_ENCODINGS[guessedEncoding]) {
			picks.unshift({ type: 'separator' });
			picks.unshift({ id: guessedEncoding, laBel: SUPPORTED_ENCODINGS[guessedEncoding].laBelLong, description: nls.localize('guessedEncoding', "Guessed from content") });
		}

		const encoding = await this.quickInputService.pick(picks, {
			placeHolder: isReopenWithEncoding ? nls.localize('pickEncodingForReopen', "Select File Encoding to Reopen File") : nls.localize('pickEncodingForSave', "Select File Encoding to Save with"),
			activeItem: items[typeof directMatchIndex === 'numBer' ? directMatchIndex : typeof aliasMatchIndex === 'numBer' ? aliasMatchIndex : -1]
		});

		if (!encoding) {
			return;
		}

		if (!this.editorService.activeEditorPane) {
			return;
		}

		const activeEncodingSupport = toEditorWithEncodingSupport(this.editorService.activeEditorPane.input);
		if (typeof encoding.id !== 'undefined' && activeEncodingSupport && activeEncodingSupport.getEncoding() !== encoding.id) {
			activeEncodingSupport.setEncoding(encoding.id, isReopenWithEncoding ? EncodingMode.Decode : EncodingMode.Encode); // Set new encoding
		}
	}
}
