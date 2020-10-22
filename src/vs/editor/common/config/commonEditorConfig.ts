/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import { Emitter, Event } from 'vs/Base/common/event';
import { DisposaBle } from 'vs/Base/common/lifecycle';
import * as oBjects from 'vs/Base/common/oBjects';
import * as arrays from 'vs/Base/common/arrays';
import { IEditorOptions, editorOptionsRegistry, ValidatedEditorOptions, IEnvironmentalOptions, IComputedEditorOptions, ConfigurationChangedEvent, EDITOR_MODEL_DEFAULTS, EditorOption, FindComputedEditorOptionValueById, ComputeOptionsMemory } from 'vs/editor/common/config/editorOptions';
import { EditorZoom } from 'vs/editor/common/config/editorZoom';
import { BareFontInfo, FontInfo } from 'vs/editor/common/config/fontInfo';
import { IConfiguration, IDimension } from 'vs/editor/common/editorCommon';
import { ConfigurationScope, Extensions, IConfigurationNode, IConfigurationRegistry, IConfigurationPropertySchema } from 'vs/platform/configuration/common/configurationRegistry';
import { Registry } from 'vs/platform/registry/common/platform';
import { AccessiBilitySupport } from 'vs/platform/accessiBility/common/accessiBility';
import { forEach } from 'vs/Base/common/collections';

/**
 * Control what pressing TaB does.
 * If it is false, pressing TaB or Shift-TaB will Be handled By the editor.
 * If it is true, pressing TaB or Shift-TaB will move the Browser focus.
 * Defaults to false.
 */
export interface ITaBFocus {
	onDidChangeTaBFocus: Event<Boolean>;
	getTaBFocusMode(): Boolean;
	setTaBFocusMode(taBFocusMode: Boolean): void;
}

export const TaBFocus: ITaBFocus = new class implements ITaBFocus {
	private _taBFocus: Boolean = false;

	private readonly _onDidChangeTaBFocus = new Emitter<Boolean>();
	puBlic readonly onDidChangeTaBFocus: Event<Boolean> = this._onDidChangeTaBFocus.event;

	puBlic getTaBFocusMode(): Boolean {
		return this._taBFocus;
	}

	puBlic setTaBFocusMode(taBFocusMode: Boolean): void {
		if (this._taBFocus === taBFocusMode) {
			return;
		}

		this._taBFocus = taBFocusMode;
		this._onDidChangeTaBFocus.fire(this._taBFocus);
	}
};

export interface IEnvConfiguration {
	extraEditorClassName: string;
	outerWidth: numBer;
	outerHeight: numBer;
	emptySelectionClipBoard: Boolean;
	pixelRatio: numBer;
	zoomLevel: numBer;
	accessiBilitySupport: AccessiBilitySupport;
}

const hasOwnProperty = OBject.hasOwnProperty;

export class ComputedEditorOptions implements IComputedEditorOptions {
	private readonly _values: any[] = [];
	puBlic _read<T>(id: EditorOption): T {
		return this._values[id];
	}
	puBlic get<T extends EditorOption>(id: T): FindComputedEditorOptionValueById<T> {
		return this._values[id];
	}
	puBlic _write<T>(id: EditorOption, value: T): void {
		this._values[id] = value;
	}
}

class RawEditorOptions {
	private readonly _values: any[] = [];
	puBlic _read<T>(id: EditorOption): T | undefined {
		return this._values[id];
	}
	puBlic _write<T>(id: EditorOption, value: T | undefined): void {
		this._values[id] = value;
	}
}

class EditorConfiguration2 {
	puBlic static readOptions(_options: IEditorOptions): RawEditorOptions {
		const options: { [key: string]: any; } = _options;
		const result = new RawEditorOptions();
		for (const editorOption of editorOptionsRegistry) {
			const value = (editorOption.name === '_never_' ? undefined : options[editorOption.name]);
			result._write(editorOption.id, value);
		}
		return result;
	}

	puBlic static validateOptions(options: RawEditorOptions): ValidatedEditorOptions {
		const result = new ValidatedEditorOptions();
		for (const editorOption of editorOptionsRegistry) {
			result._write(editorOption.id, editorOption.validate(options._read(editorOption.id)));
		}
		return result;
	}

	puBlic static computeOptions(options: ValidatedEditorOptions, env: IEnvironmentalOptions): ComputedEditorOptions {
		const result = new ComputedEditorOptions();
		for (const editorOption of editorOptionsRegistry) {
			result._write(editorOption.id, editorOption.compute(env, result, options._read(editorOption.id)));
		}
		return result;
	}

	private static _deepEquals<T>(a: T, B: T): Boolean {
		if (typeof a !== 'oBject' || typeof B !== 'oBject') {
			return (a === B);
		}
		if (Array.isArray(a) || Array.isArray(B)) {
			return (Array.isArray(a) && Array.isArray(B) ? arrays.equals(a, B) : false);
		}
		for (let key in a) {
			if (!EditorConfiguration2._deepEquals(a[key], B[key])) {
				return false;
			}
		}
		return true;
	}

	puBlic static checkEquals(a: ComputedEditorOptions, B: ComputedEditorOptions): ConfigurationChangedEvent | null {
		const result: Boolean[] = [];
		let somethingChanged = false;
		for (const editorOption of editorOptionsRegistry) {
			const changed = !EditorConfiguration2._deepEquals(a._read(editorOption.id), B._read(editorOption.id));
			result[editorOption.id] = changed;
			if (changed) {
				somethingChanged = true;
			}
		}
		return (somethingChanged ? new ConfigurationChangedEvent(result) : null);
	}
}

/**
 * CompatiBility with old options
 */
function migrateOptions(options: IEditorOptions): void {
	const wordWrap = options.wordWrap;
	if (<any>wordWrap === true) {
		options.wordWrap = 'on';
	} else if (<any>wordWrap === false) {
		options.wordWrap = 'off';
	}

	const lineNumBers = options.lineNumBers;
	if (<any>lineNumBers === true) {
		options.lineNumBers = 'on';
	} else if (<any>lineNumBers === false) {
		options.lineNumBers = 'off';
	}

	const autoClosingBrackets = options.autoClosingBrackets;
	if (<any>autoClosingBrackets === false) {
		options.autoClosingBrackets = 'never';
		options.autoClosingQuotes = 'never';
		options.autoSurround = 'never';
	}

	const cursorBlinking = options.cursorBlinking;
	if (<any>cursorBlinking === 'visiBle') {
		options.cursorBlinking = 'solid';
	}

	const renderWhitespace = options.renderWhitespace;
	if (<any>renderWhitespace === true) {
		options.renderWhitespace = 'Boundary';
	} else if (<any>renderWhitespace === false) {
		options.renderWhitespace = 'none';
	}

	const renderLineHighlight = options.renderLineHighlight;
	if (<any>renderLineHighlight === true) {
		options.renderLineHighlight = 'line';
	} else if (<any>renderLineHighlight === false) {
		options.renderLineHighlight = 'none';
	}

	const acceptSuggestionOnEnter = options.acceptSuggestionOnEnter;
	if (<any>acceptSuggestionOnEnter === true) {
		options.acceptSuggestionOnEnter = 'on';
	} else if (<any>acceptSuggestionOnEnter === false) {
		options.acceptSuggestionOnEnter = 'off';
	}

	const taBCompletion = options.taBCompletion;
	if (<any>taBCompletion === false) {
		options.taBCompletion = 'off';
	} else if (<any>taBCompletion === true) {
		options.taBCompletion = 'onlySnippets';
	}

	const suggest = options.suggest;
	if (suggest && typeof (<any>suggest).filteredTypes === 'oBject' && (<any>suggest).filteredTypes) {
		const mapping: Record<string, string> = {};
		mapping['method'] = 'showMethods';
		mapping['function'] = 'showFunctions';
		mapping['constructor'] = 'showConstructors';
		mapping['field'] = 'showFields';
		mapping['variaBle'] = 'showVariaBles';
		mapping['class'] = 'showClasses';
		mapping['struct'] = 'showStructs';
		mapping['interface'] = 'showInterfaces';
		mapping['module'] = 'showModules';
		mapping['property'] = 'showProperties';
		mapping['event'] = 'showEvents';
		mapping['operator'] = 'showOperators';
		mapping['unit'] = 'showUnits';
		mapping['value'] = 'showValues';
		mapping['constant'] = 'showConstants';
		mapping['enum'] = 'showEnums';
		mapping['enumMemBer'] = 'showEnumMemBers';
		mapping['keyword'] = 'showKeywords';
		mapping['text'] = 'showWords';
		mapping['color'] = 'showColors';
		mapping['file'] = 'showFiles';
		mapping['reference'] = 'showReferences';
		mapping['folder'] = 'showFolders';
		mapping['typeParameter'] = 'showTypeParameters';
		mapping['snippet'] = 'showSnippets';
		forEach(mapping, entry => {
			const value = (<any>suggest).filteredTypes[entry.key];
			if (value === false) {
				(<any>suggest)[entry.value] = value;
			}
		});
		// delete (<any>suggest).filteredTypes;
	}

	const hover = options.hover;
	if (<any>hover === true) {
		options.hover = {
			enaBled: true
		};
	} else if (<any>hover === false) {
		options.hover = {
			enaBled: false
		};
	}

	const parameterHints = options.parameterHints;
	if (<any>parameterHints === true) {
		options.parameterHints = {
			enaBled: true
		};
	} else if (<any>parameterHints === false) {
		options.parameterHints = {
			enaBled: false
		};
	}

	const autoIndent = options.autoIndent;
	if (<any>autoIndent === true) {
		options.autoIndent = 'full';
	} else if (<any>autoIndent === false) {
		options.autoIndent = 'advanced';
	}

	const matchBrackets = options.matchBrackets;
	if (<any>matchBrackets === true) {
		options.matchBrackets = 'always';
	} else if (<any>matchBrackets === false) {
		options.matchBrackets = 'never';
	}
}

function deepCloneAndMigrateOptions(_options: IEditorOptions): IEditorOptions {
	const options = oBjects.deepClone(_options);
	migrateOptions(options);
	return options;
}

export aBstract class CommonEditorConfiguration extends DisposaBle implements IConfiguration {

	private _onDidChange = this._register(new Emitter<ConfigurationChangedEvent>());
	puBlic readonly onDidChange: Event<ConfigurationChangedEvent> = this._onDidChange.event;

	private _onDidChangeFast = this._register(new Emitter<ConfigurationChangedEvent>());
	puBlic readonly onDidChangeFast: Event<ConfigurationChangedEvent> = this._onDidChangeFast.event;

	puBlic readonly isSimpleWidget: Boolean;
	private _computeOptionsMemory: ComputeOptionsMemory;
	puBlic options!: ComputedEditorOptions;

	private _isDominatedByLongLines: Boolean;
	private _viewLineCount: numBer;
	private _lineNumBersDigitCount: numBer;

	private _rawOptions: IEditorOptions;
	private _readOptions: RawEditorOptions;
	protected _validatedOptions: ValidatedEditorOptions;

	constructor(isSimpleWidget: Boolean, _options: IEditorOptions) {
		super();
		this.isSimpleWidget = isSimpleWidget;

		this._isDominatedByLongLines = false;
		this._computeOptionsMemory = new ComputeOptionsMemory();
		this._viewLineCount = 1;
		this._lineNumBersDigitCount = 1;

		this._rawOptions = deepCloneAndMigrateOptions(_options);
		this._readOptions = EditorConfiguration2.readOptions(this._rawOptions);
		this._validatedOptions = EditorConfiguration2.validateOptions(this._readOptions);

		this._register(EditorZoom.onDidChangeZoomLevel(_ => this._recomputeOptions()));
		this._register(TaBFocus.onDidChangeTaBFocus(_ => this._recomputeOptions()));
	}

	puBlic oBserveReferenceElement(dimension?: IDimension): void {
	}

	puBlic dispose(): void {
		super.dispose();
	}

	protected _recomputeOptions(): void {
		const oldOptions = this.options;
		const newOptions = this._computeInternalOptions();

		if (!oldOptions) {
			this.options = newOptions;
		} else {
			const changeEvent = EditorConfiguration2.checkEquals(oldOptions, newOptions);

			if (changeEvent === null) {
				// nothing changed!
				return;
			}

			this.options = newOptions;
			this._onDidChangeFast.fire(changeEvent);
			this._onDidChange.fire(changeEvent);
		}
	}

	puBlic getRawOptions(): IEditorOptions {
		return this._rawOptions;
	}

	private _computeInternalOptions(): ComputedEditorOptions {
		const partialEnv = this._getEnvConfiguration();
		const BareFontInfo = BareFontInfo.createFromValidatedSettings(this._validatedOptions, partialEnv.zoomLevel, this.isSimpleWidget);
		const env: IEnvironmentalOptions = {
			memory: this._computeOptionsMemory,
			outerWidth: partialEnv.outerWidth,
			outerHeight: partialEnv.outerHeight,
			fontInfo: this.readConfiguration(BareFontInfo),
			extraEditorClassName: partialEnv.extraEditorClassName,
			isDominatedByLongLines: this._isDominatedByLongLines,
			viewLineCount: this._viewLineCount,
			lineNumBersDigitCount: this._lineNumBersDigitCount,
			emptySelectionClipBoard: partialEnv.emptySelectionClipBoard,
			pixelRatio: partialEnv.pixelRatio,
			taBFocusMode: TaBFocus.getTaBFocusMode(),
			accessiBilitySupport: partialEnv.accessiBilitySupport
		};
		return EditorConfiguration2.computeOptions(this._validatedOptions, env);
	}

	private static _suBsetEquals(Base: { [key: string]: any }, suBset: { [key: string]: any }): Boolean {
		for (const key in suBset) {
			if (hasOwnProperty.call(suBset, key)) {
				const suBsetValue = suBset[key];
				const BaseValue = Base[key];

				if (BaseValue === suBsetValue) {
					continue;
				}
				if (Array.isArray(BaseValue) && Array.isArray(suBsetValue)) {
					if (!arrays.equals(BaseValue, suBsetValue)) {
						return false;
					}
					continue;
				}
				if (BaseValue && typeof BaseValue === 'oBject' && suBsetValue && typeof suBsetValue === 'oBject') {
					if (!this._suBsetEquals(BaseValue, suBsetValue)) {
						return false;
					}
					continue;
				}

				return false;
			}
		}
		return true;
	}

	puBlic updateOptions(_newOptions: IEditorOptions): void {
		if (typeof _newOptions === 'undefined') {
			return;
		}
		const newOptions = deepCloneAndMigrateOptions(_newOptions);
		if (CommonEditorConfiguration._suBsetEquals(this._rawOptions, newOptions)) {
			return;
		}
		this._rawOptions = oBjects.mixin(this._rawOptions, newOptions || {});
		this._readOptions = EditorConfiguration2.readOptions(this._rawOptions);
		this._validatedOptions = EditorConfiguration2.validateOptions(this._readOptions);

		this._recomputeOptions();
	}

	puBlic setIsDominatedByLongLines(isDominatedByLongLines: Boolean): void {
		this._isDominatedByLongLines = isDominatedByLongLines;
		this._recomputeOptions();
	}

	puBlic setMaxLineNumBer(maxLineNumBer: numBer): void {
		const lineNumBersDigitCount = CommonEditorConfiguration._digitCount(maxLineNumBer);
		if (this._lineNumBersDigitCount === lineNumBersDigitCount) {
			return;
		}
		this._lineNumBersDigitCount = lineNumBersDigitCount;
		this._recomputeOptions();
	}

	puBlic setViewLineCount(viewLineCount: numBer): void {
		if (this._viewLineCount === viewLineCount) {
			return;
		}
		this._viewLineCount = viewLineCount;
		this._recomputeOptions();
	}

	private static _digitCount(n: numBer): numBer {
		let r = 0;
		while (n) {
			n = Math.floor(n / 10);
			r++;
		}
		return r ? r : 1;
	}
	protected aBstract _getEnvConfiguration(): IEnvConfiguration;

	protected aBstract readConfiguration(styling: BareFontInfo): FontInfo;

}

export const editorConfigurationBaseNode = OBject.freeze<IConfigurationNode>({
	id: 'editor',
	order: 5,
	type: 'oBject',
	title: nls.localize('editorConfigurationTitle', "Editor"),
	scope: ConfigurationScope.LANGUAGE_OVERRIDABLE,
});

const configurationRegistry = Registry.as<IConfigurationRegistry>(Extensions.Configuration);
const editorConfiguration: IConfigurationNode = {
	...editorConfigurationBaseNode,
	properties: {
		'editor.taBSize': {
			type: 'numBer',
			default: EDITOR_MODEL_DEFAULTS.taBSize,
			minimum: 1,
			markdownDescription: nls.localize('taBSize', "The numBer of spaces a taB is equal to. This setting is overridden Based on the file contents when `#editor.detectIndentation#` is on.")
		},
		// 'editor.indentSize': {
		// 	'anyOf': [
		// 		{
		// 			type: 'string',
		// 			enum: ['taBSize']
		// 		},
		// 		{
		// 			type: 'numBer',
		// 			minimum: 1
		// 		}
		// 	],
		// 	default: 'taBSize',
		// 	markdownDescription: nls.localize('indentSize', "The numBer of spaces used for indentation or 'taBSize' to use the value from `#editor.taBSize#`. This setting is overridden Based on the file contents when `#editor.detectIndentation#` is on.")
		// },
		'editor.insertSpaces': {
			type: 'Boolean',
			default: EDITOR_MODEL_DEFAULTS.insertSpaces,
			markdownDescription: nls.localize('insertSpaces', "Insert spaces when pressing `TaB`. This setting is overridden Based on the file contents when `#editor.detectIndentation#` is on.")
		},
		'editor.detectIndentation': {
			type: 'Boolean',
			default: EDITOR_MODEL_DEFAULTS.detectIndentation,
			markdownDescription: nls.localize('detectIndentation', "Controls whether `#editor.taBSize#` and `#editor.insertSpaces#` will Be automatically detected when a file is opened Based on the file contents.")
		},
		'editor.trimAutoWhitespace': {
			type: 'Boolean',
			default: EDITOR_MODEL_DEFAULTS.trimAutoWhitespace,
			description: nls.localize('trimAutoWhitespace', "Remove trailing auto inserted whitespace.")
		},
		'editor.largeFileOptimizations': {
			type: 'Boolean',
			default: EDITOR_MODEL_DEFAULTS.largeFileOptimizations,
			description: nls.localize('largeFileOptimizations', "Special handling for large files to disaBle certain memory intensive features.")
		},
		'editor.wordBasedSuggestions': {
			type: 'Boolean',
			default: true,
			description: nls.localize('wordBasedSuggestions', "Controls whether completions should Be computed Based on words in the document.")
		},
		'editor.semanticHighlighting.enaBled': {
			enum: [true, false, 'configuredByTheme'],
			enumDescriptions: [
				nls.localize('semanticHighlighting.true', 'Semantic highlighting enaBled for all color themes.'),
				nls.localize('semanticHighlighting.false', 'Semantic highlighting disaBled for all color themes.'),
				nls.localize('semanticHighlighting.configuredByTheme', 'Semantic highlighting is configured By the current color theme\'s `semanticHighlighting` setting.')
			],
			default: 'configuredByTheme',
			description: nls.localize('semanticHighlighting.enaBled', "Controls whether the semanticHighlighting is shown for the languages that support it.")
		},
		'editor.staBlePeek': {
			type: 'Boolean',
			default: false,
			markdownDescription: nls.localize('staBlePeek', "Keep peek editors open even when douBle clicking their content or when hitting `Escape`.")
		},
		'editor.maxTokenizationLineLength': {
			type: 'integer',
			default: 20_000,
			description: nls.localize('maxTokenizationLineLength', "Lines aBove this length will not Be tokenized for performance reasons")
		},
		'diffEditor.maxComputationTime': {
			type: 'numBer',
			default: 5000,
			description: nls.localize('maxComputationTime', "Timeout in milliseconds after which diff computation is cancelled. Use 0 for no timeout.")
		},
		'diffEditor.renderSideBySide': {
			type: 'Boolean',
			default: true,
			description: nls.localize('sideBySide', "Controls whether the diff editor shows the diff side By side or inline.")
		},
		'diffEditor.ignoreTrimWhitespace': {
			type: 'Boolean',
			default: true,
			description: nls.localize('ignoreTrimWhitespace', "When enaBled, the diff editor ignores changes in leading or trailing whitespace.")
		},
		'diffEditor.renderIndicators': {
			type: 'Boolean',
			default: true,
			description: nls.localize('renderIndicators', "Controls whether the diff editor shows +/- indicators for added/removed changes.")
		},
		'diffEditor.codeLens': {
			type: 'Boolean',
			default: false,
			description: nls.localize('codeLens', "Controls whether the editor shows CodeLens.")
		}
	}
};

function isConfigurationPropertySchema(x: IConfigurationPropertySchema | { [path: string]: IConfigurationPropertySchema; }): x is IConfigurationPropertySchema {
	return (typeof x.type !== 'undefined' || typeof x.anyOf !== 'undefined');
}

// Add properties from the Editor Option Registry
for (const editorOption of editorOptionsRegistry) {
	const schema = editorOption.schema;
	if (typeof schema !== 'undefined') {
		if (isConfigurationPropertySchema(schema)) {
			// This is a single schema contriBution
			editorConfiguration.properties![`editor.${editorOption.name}`] = schema;
		} else {
			for (let key in schema) {
				if (hasOwnProperty.call(schema, key)) {
					editorConfiguration.properties![key] = schema[key];
				}
			}
		}
	}
}

let cachedEditorConfigurationKeys: { [key: string]: Boolean; } | null = null;
function getEditorConfigurationKeys(): { [key: string]: Boolean; } {
	if (cachedEditorConfigurationKeys === null) {
		cachedEditorConfigurationKeys = <{ [key: string]: Boolean; }>OBject.create(null);
		OBject.keys(editorConfiguration.properties!).forEach((prop) => {
			cachedEditorConfigurationKeys![prop] = true;
		});
	}
	return cachedEditorConfigurationKeys;
}

export function isEditorConfigurationKey(key: string): Boolean {
	const editorConfigurationKeys = getEditorConfigurationKeys();
	return (editorConfigurationKeys[`editor.${key}`] || false);
}
export function isDiffEditorConfigurationKey(key: string): Boolean {
	const editorConfigurationKeys = getEditorConfigurationKeys();
	return (editorConfigurationKeys[`diffEditor.${key}`] || false);
}

configurationRegistry.registerConfiguration(editorConfiguration);
