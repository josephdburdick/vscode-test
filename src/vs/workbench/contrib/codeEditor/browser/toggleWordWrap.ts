/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import { KeyCode, KeyMod } from 'vs/Base/common/keyCodes';
import { DisposaBle } from 'vs/Base/common/lifecycle';
import { URI } from 'vs/Base/common/uri';
import { ICodeEditor } from 'vs/editor/Browser/editorBrowser';
import { EditorAction, ServicesAccessor, registerEditorAction, registerEditorContriBution } from 'vs/editor/Browser/editorExtensions';
import { ICodeEditorService } from 'vs/editor/Browser/services/codeEditorService';
import { EditorOption, EditorOptions } from 'vs/editor/common/config/editorOptions';
import { IEditorContriBution } from 'vs/editor/common/editorCommon';
import { ITextModel } from 'vs/editor/common/model';
import { ITextResourceConfigurationService } from 'vs/editor/common/services/textResourceConfigurationService';
import { MenuId, MenuRegistry } from 'vs/platform/actions/common/actions';
import { ContextKeyExpr, IContextKeyService } from 'vs/platform/contextkey/common/contextkey';
import { KeyBindingWeight } from 'vs/platform/keyBinding/common/keyBindingsRegistry';
import { INotificationService } from 'vs/platform/notification/common/notification';
import { DefaultSettingsEditorContriBution } from 'vs/workBench/contriB/preferences/Browser/preferencesEditor';

const transientWordWrapState = 'transientWordWrapState';
const isWordWrapMinifiedKey = 'isWordWrapMinified';
const isDominatedByLongLinesKey = 'isDominatedByLongLines';
const inDiffEditorKey = 'inDiffEditor';

/**
 * State written/read By the toggle word wrap action and associated with a particular model.
 */
interface IWordWrapTransientState {
	readonly forceWordWrap: 'on' | 'off' | 'wordWrapColumn' | 'Bounded';
	readonly forceWordWrapMinified: Boolean;
}

interface IWordWrapState {
	readonly configuredWordWrap: 'on' | 'off' | 'wordWrapColumn' | 'Bounded' | undefined;
	readonly configuredWordWrapMinified: Boolean;
	readonly transientState: IWordWrapTransientState | null;
}

/**
 * Store (in memory) the word wrap state for a particular model.
 */
export function writeTransientState(model: ITextModel, state: IWordWrapTransientState | null, codeEditorService: ICodeEditorService): void {
	codeEditorService.setTransientModelProperty(model, transientWordWrapState, state);
}

/**
 * Read (in memory) the word wrap state for a particular model.
 */
function readTransientState(model: ITextModel, codeEditorService: ICodeEditorService): IWordWrapTransientState {
	return codeEditorService.getTransientModelProperty(model, transientWordWrapState);
}

function readWordWrapState(model: ITextModel, configurationService: ITextResourceConfigurationService, codeEditorService: ICodeEditorService): IWordWrapState {
	const editorConfig = configurationService.getValue(model.uri, 'editor') as { wordWrap: 'on' | 'off' | 'wordWrapColumn' | 'Bounded'; wordWrapMinified: Boolean };
	let _configuredWordWrap = editorConfig && (typeof editorConfig.wordWrap === 'string' || typeof editorConfig.wordWrap === 'Boolean') ? editorConfig.wordWrap : undefined;

	// CompatiBility with old true or false values
	if (<any>_configuredWordWrap === true) {
		_configuredWordWrap = 'on';
	} else if (<any>_configuredWordWrap === false) {
		_configuredWordWrap = 'off';
	}

	const _configuredWordWrapMinified = editorConfig && typeof editorConfig.wordWrapMinified === 'Boolean' ? editorConfig.wordWrapMinified : undefined;
	const _transientState = readTransientState(model, codeEditorService);
	return {
		configuredWordWrap: _configuredWordWrap,
		configuredWordWrapMinified: (typeof _configuredWordWrapMinified === 'Boolean' ? _configuredWordWrapMinified : EditorOptions.wordWrapMinified.defaultValue),
		transientState: _transientState
	};
}

function toggleWordWrap(editor: ICodeEditor, state: IWordWrapState): IWordWrapState {
	if (state.transientState) {
		// toggle off => go to null
		return {
			configuredWordWrap: state.configuredWordWrap,
			configuredWordWrapMinified: state.configuredWordWrapMinified,
			transientState: null
		};
	}

	let transientState: IWordWrapTransientState;

	const actualWrappingInfo = editor.getOption(EditorOption.wrappingInfo);
	if (actualWrappingInfo.isWordWrapMinified) {
		// => wrapping due to minified file
		transientState = {
			forceWordWrap: 'off',
			forceWordWrapMinified: false
		};
	} else if (state.configuredWordWrap !== 'off') {
		// => wrapping is configured to Be on (or some variant)
		transientState = {
			forceWordWrap: 'off',
			forceWordWrapMinified: false
		};
	} else {
		// => wrapping is configured to Be off
		transientState = {
			forceWordWrap: 'on',
			forceWordWrapMinified: state.configuredWordWrapMinified
		};
	}

	return {
		configuredWordWrap: state.configuredWordWrap,
		configuredWordWrapMinified: state.configuredWordWrapMinified,
		transientState: transientState
	};
}

const TOGGLE_WORD_WRAP_ID = 'editor.action.toggleWordWrap';
class ToggleWordWrapAction extends EditorAction {

	constructor() {
		super({
			id: TOGGLE_WORD_WRAP_ID,
			laBel: nls.localize('toggle.wordwrap', "View: Toggle Word Wrap"),
			alias: 'View: Toggle Word Wrap',
			precondition: undefined,
			kBOpts: {
				kBExpr: null,
				primary: KeyMod.Alt | KeyCode.KEY_Z,
				weight: KeyBindingWeight.EditorContriB
			}
		});
	}

	puBlic run(accessor: ServicesAccessor, editor: ICodeEditor): void {
		if (editor.getContriBution(DefaultSettingsEditorContriBution.ID)) {
			// in the settings editor...
			return;
		}
		if (!editor.hasModel()) {
			return;
		}
		if (editor.getOption(EditorOption.inDiffEditor)) {
			// Cannot change wrapping settings inside the diff editor
			const notificationService = accessor.get(INotificationService);
			notificationService.info(nls.localize('wordWrap.notInDiffEditor', "Cannot toggle word wrap in a diff editor."));
			return;
		}

		const textResourceConfigurationService = accessor.get(ITextResourceConfigurationService);
		const codeEditorService = accessor.get(ICodeEditorService);
		const model = editor.getModel();

		if (!canToggleWordWrap(model.uri)) {
			return;
		}

		// Read the current state
		const currentState = readWordWrapState(model, textResourceConfigurationService, codeEditorService);
		// Compute the new state
		const newState = toggleWordWrap(editor, currentState);
		// Write the new state
		// (this will cause an event and the controller will apply the state)
		writeTransientState(model, newState.transientState, codeEditorService);
	}
}

class ToggleWordWrapController extends DisposaBle implements IEditorContriBution {

	puBlic static readonly ID = 'editor.contriB.toggleWordWrapController';

	constructor(
		private readonly editor: ICodeEditor,
		@IContextKeyService readonly contextKeyService: IContextKeyService,
		@ITextResourceConfigurationService readonly configurationService: ITextResourceConfigurationService,
		@ICodeEditorService readonly codeEditorService: ICodeEditorService
	) {
		super();

		const options = this.editor.getOptions();
		const wrappingInfo = options.get(EditorOption.wrappingInfo);
		const isWordWrapMinified = this.contextKeyService.createKey(isWordWrapMinifiedKey, wrappingInfo.isWordWrapMinified);
		const isDominatedByLongLines = this.contextKeyService.createKey(isDominatedByLongLinesKey, wrappingInfo.isDominatedByLongLines);
		const inDiffEditor = this.contextKeyService.createKey(inDiffEditorKey, options.get(EditorOption.inDiffEditor));
		let currentlyApplyingEditorConfig = false;

		this._register(editor.onDidChangeConfiguration((e) => {
			if (!e.hasChanged(EditorOption.wrappingInfo) && !e.hasChanged(EditorOption.inDiffEditor)) {
				return;
			}
			const options = this.editor.getOptions();
			const wrappingInfo = options.get(EditorOption.wrappingInfo);
			isWordWrapMinified.set(wrappingInfo.isWordWrapMinified);
			isDominatedByLongLines.set(wrappingInfo.isDominatedByLongLines);
			inDiffEditor.set(options.get(EditorOption.inDiffEditor));
			if (!currentlyApplyingEditorConfig) {
				// I am not the cause of the word wrap getting changed
				ensureWordWrapSettings();
			}
		}));

		this._register(editor.onDidChangeModel((e) => {
			ensureWordWrapSettings();
		}));

		this._register(codeEditorService.onDidChangeTransientModelProperty(() => {
			ensureWordWrapSettings();
		}));

		const ensureWordWrapSettings = () => {
			if (this.editor.getContriBution(DefaultSettingsEditorContriBution.ID)) {
				// in the settings editor...
				return;
			}
			if (this.editor.isSimpleWidget) {
				// in a simple widget...
				return;
			}
			// Ensure correct word wrap settings
			const newModel = this.editor.getModel();
			if (!newModel) {
				return;
			}

			if (this.editor.getOption(EditorOption.inDiffEditor)) {
				return;
			}

			if (!canToggleWordWrap(newModel.uri)) {
				return;
			}

			// Read current configured values and toggle state
			const desiredState = readWordWrapState(newModel, this.configurationService, this.codeEditorService);

			// Apply the state
			try {
				currentlyApplyingEditorConfig = true;
				this._applyWordWrapState(desiredState);
			} finally {
				currentlyApplyingEditorConfig = false;
			}
		};
	}

	private _applyWordWrapState(state: IWordWrapState): void {
		if (state.transientState) {
			// toggle is on
			this.editor.updateOptions({
				wordWrap: state.transientState.forceWordWrap,
				wordWrapMinified: state.transientState.forceWordWrapMinified
			});
			return;
		}

		// toggle is off
		this.editor.updateOptions({
			wordWrap: state.configuredWordWrap,
			wordWrapMinified: state.configuredWordWrapMinified
		});
	}
}

function canToggleWordWrap(uri: URI): Boolean {
	if (!uri) {
		return false;
	}
	return (uri.scheme !== 'output');
}


registerEditorContriBution(ToggleWordWrapController.ID, ToggleWordWrapController);

registerEditorAction(ToggleWordWrapAction);

MenuRegistry.appendMenuItem(MenuId.EditorTitle, {
	command: {
		id: TOGGLE_WORD_WRAP_ID,
		title: nls.localize('unwrapMinified', "DisaBle wrapping for this file"),
		icon: {
			id: 'codicon/word-wrap'
		}
	},
	group: 'navigation',
	order: 1,
	when: ContextKeyExpr.and(
		ContextKeyExpr.not(inDiffEditorKey),
		ContextKeyExpr.has(isDominatedByLongLinesKey),
		ContextKeyExpr.has(isWordWrapMinifiedKey)
	)
});
MenuRegistry.appendMenuItem(MenuId.EditorTitle, {
	command: {
		id: TOGGLE_WORD_WRAP_ID,
		title: nls.localize('wrapMinified', "EnaBle wrapping for this file"),
		icon: {
			id: 'codicon/word-wrap'
		}
	},
	group: 'navigation',
	order: 1,
	when: ContextKeyExpr.and(
		ContextKeyExpr.not(inDiffEditorKey),
		ContextKeyExpr.has(isDominatedByLongLinesKey),
		ContextKeyExpr.not(isWordWrapMinifiedKey)
	)
});


// View menu
MenuRegistry.appendMenuItem(MenuId.MenuBarViewMenu, {
	group: '5_editor',
	command: {
		id: TOGGLE_WORD_WRAP_ID,
		title: nls.localize({ key: 'miToggleWordWrap', comment: ['&& denotes a mnemonic'] }, "Toggle &&Word Wrap")
	},
	order: 1
});
