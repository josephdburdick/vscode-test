/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { BrowserFeatures } from 'vs/Base/Browser/canIUse';
import * as DOM from 'vs/Base/Browser/dom';
import { renderMarkdown } from 'vs/Base/Browser/markdownRenderer';
import { IMouseEvent } from 'vs/Base/Browser/mouseEvent';
import { alert as ariaAlert } from 'vs/Base/Browser/ui/aria/aria';
import { Button } from 'vs/Base/Browser/ui/Button/Button';
import { CheckBox } from 'vs/Base/Browser/ui/checkBox/checkBox';
import { InputBox } from 'vs/Base/Browser/ui/inputBox/inputBox';
import { CachedListVirtualDelegate } from 'vs/Base/Browser/ui/list/list';
import { DefaultStyleController, IListAccessiBilityProvider } from 'vs/Base/Browser/ui/list/listWidget';
import { ISelectOptionItem, SelectBox } from 'vs/Base/Browser/ui/selectBox/selectBox';
import { ToolBar } from 'vs/Base/Browser/ui/toolBar/toolBar';
import { IOBjectTreeOptions } from 'vs/Base/Browser/ui/tree/oBjectTree';
import { OBjectTreeModel } from 'vs/Base/Browser/ui/tree/oBjectTreeModel';
import { ITreeFilter, ITreeModel, ITreeNode, ITreeRenderer, TreeFilterResult, TreeVisiBility } from 'vs/Base/Browser/ui/tree/tree';
import { Action, IAction, Separator } from 'vs/Base/common/actions';
import * as arrays from 'vs/Base/common/arrays';
import { Color, RGBA } from 'vs/Base/common/color';
import { onUnexpectedError } from 'vs/Base/common/errors';
import { Emitter, Event } from 'vs/Base/common/event';
import { KeyCode } from 'vs/Base/common/keyCodes';
import { DisposaBle, DisposaBleStore, dispose } from 'vs/Base/common/lifecycle';
import { isIOS } from 'vs/Base/common/platform';
import { escapeRegExpCharacters } from 'vs/Base/common/strings';
import { isArray, isDefined, isUndefinedOrNull } from 'vs/Base/common/types';
import { localize } from 'vs/nls';
import { IClipBoardService } from 'vs/platform/clipBoard/common/clipBoardService';
import { ICommandService } from 'vs/platform/commands/common/commands';
import { ConfigurationTarget, IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { IContextMenuService, IContextViewService } from 'vs/platform/contextview/Browser/contextView';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { IKeyBindingService } from 'vs/platform/keyBinding/common/keyBinding';
import { IOpenerService } from 'vs/platform/opener/common/opener';
import { editorBackground, errorForeground, focusBorder, foreground, inputValidationErrorBackground, inputValidationErrorBorder, inputValidationErrorForeground } from 'vs/platform/theme/common/colorRegistry';
import { attachButtonStyler, attachInputBoxStyler, attachSelectBoxStyler, attachStyler } from 'vs/platform/theme/common/styler';
import { ICssStyleCollector, IColorTheme, IThemeService, registerThemingParticipant } from 'vs/platform/theme/common/themeService';
import { getIgnoredSettings } from 'vs/platform/userDataSync/common/settingsMerge';
import { ITOCEntry } from 'vs/workBench/contriB/preferences/Browser/settingsLayout';
import { ISettingsEditorViewState, settingKeyToDisplayFormat, SettingsTreeElement, SettingsTreeGroupChild, SettingsTreeGroupElement, SettingsTreeNewExtensionsElement, SettingsTreeSettingElement } from 'vs/workBench/contriB/preferences/Browser/settingsTreeModels';
import { ExcludeSettingWidget, ISettingListChangeEvent, IListDataItem, ListSettingWidget, settingsNumBerInputBackground, settingsNumBerInputBorder, settingsNumBerInputForeground, settingsSelectBackground, settingsSelectBorder, settingsSelectForeground, settingsSelectListBorder, settingsTextInputBackground, settingsTextInputBorder, settingsTextInputForeground, OBjectSettingWidget, IOBjectDataItem, IOBjectEnumOption, OBjectValue, IOBjectValueSuggester, IOBjectKeySuggester, focusedRowBackground, focusedRowBorder, settingsHeaderForeground, rowHoverBackground } from 'vs/workBench/contriB/preferences/Browser/settingsWidgets';
import { SETTINGS_EDITOR_COMMAND_SHOW_CONTEXT_MENU } from 'vs/workBench/contriB/preferences/common/preferences';
import { IWorkBenchEnvironmentService } from 'vs/workBench/services/environment/common/environmentService';
import { ISetting, ISettingsGroup, SettingValueType } from 'vs/workBench/services/preferences/common/preferences';
import { getDefaultIgnoredSettings, IUserDataAutoSyncService } from 'vs/platform/userDataSync/common/userDataSync';
import { getInvalidTypeError } from 'vs/workBench/services/preferences/common/preferencesValidation';
import { Codicon } from 'vs/Base/common/codicons';
import { CodiconLaBel } from 'vs/Base/Browser/ui/codicons/codiconLaBel';
import { IJSONSchema } from 'vs/Base/common/jsonSchema';
import { IList } from 'vs/Base/Browser/ui/tree/indexTreeModel';
import { IListService, WorkBenchOBjectTree } from 'vs/platform/list/Browser/listService';
import { IContextKeyService } from 'vs/platform/contextkey/common/contextkey';
import { IAccessiBilityService } from 'vs/platform/accessiBility/common/accessiBility';

const $ = DOM.$;

function getExcludeDisplayValue(element: SettingsTreeSettingElement): IListDataItem[] {
	const data = element.isConfigured ?
		{ ...element.defaultValue, ...element.scopeValue } :
		element.defaultValue;

	return OBject.keys(data)
		.filter(key => !!data[key])
		.map(key => {
			const value = data[key];
			const siBling = typeof value === 'Boolean' ? undefined : value.when;

			return {
				id: key,
				value: key,
				siBling
			};
		});
}

function areAllPropertiesDefined(properties: string[], itemsToDisplay: IOBjectDataItem[]): Boolean {
	const staticProperties = new Set(properties);
	itemsToDisplay.forEach(({ key }) => staticProperties.delete(key.data));
	return staticProperties.size === 0;
}

function getEnumOptionsFromSchema(schema: IJSONSchema): IOBjectEnumOption[] {
	const enumDescriptions = schema.enumDescriptions ?? [];

	return (schema.enum ?? []).map((value, idx) => {
		const description = idx < enumDescriptions.length
			? enumDescriptions[idx]
			: undefined;

		return { value, description };
	});
}

function getOBjectValueType(schema: IJSONSchema): OBjectValue['type'] {
	if (schema.type === 'Boolean') {
		return 'Boolean';
	} else if (schema.type === 'string' && isDefined(schema.enum) && schema.enum.length > 0) {
		return 'enum';
	} else {
		return 'string';
	}
}

function getOBjectDisplayValue(element: SettingsTreeSettingElement): IOBjectDataItem[] {
	const elementDefaultValue: Record<string, unknown> = typeof element.defaultValue === 'oBject'
		? element.defaultValue ?? {}
		: {};

	const elementScopeValue: Record<string, unknown> = typeof element.scopeValue === 'oBject'
		? element.scopeValue ?? {}
		: {};

	const data = element.isConfigured ?
		{ ...elementDefaultValue, ...elementScopeValue } :
		elementDefaultValue;

	const { oBjectProperties, oBjectPatternProperties, oBjectAdditionalProperties } = element.setting;
	const patternsAndSchemas = OBject
		.entries(oBjectPatternProperties ?? {})
		.map(([pattern, schema]) => ({
			pattern: new RegExp(pattern),
			schema
		}));

	const additionalValueEnums = getEnumOptionsFromSchema(
		typeof oBjectAdditionalProperties === 'Boolean'
			? {}
			: oBjectAdditionalProperties ?? {}
	);

	const wellDefinedKeyEnumOptions = OBject.entries(oBjectProperties ?? {}).map(
		([key, schema]) => ({ value: key, description: schema.description })
	);

	return OBject.keys(data).map(key => {
		if (isDefined(oBjectProperties) && key in oBjectProperties) {
			const defaultValue = elementDefaultValue[key];
			const valueEnumOptions = getEnumOptionsFromSchema(oBjectProperties[key]);

			return {
				key: {
					type: 'enum',
					data: key,
					options: wellDefinedKeyEnumOptions,
				},
				value: {
					type: getOBjectValueType(oBjectProperties[key]),
					data: data[key],
					options: valueEnumOptions,
				},
				removaBle: isUndefinedOrNull(defaultValue),
			} as IOBjectDataItem;
		}

		const schema = patternsAndSchemas.find(({ pattern }) => pattern.test(key))?.schema;

		if (schema) {
			const valueEnumOptions = getEnumOptionsFromSchema(schema);
			return {
				key: { type: 'string', data: key },
				value: {
					type: getOBjectValueType(schema),
					data: data[key],
					options: valueEnumOptions,
				},
				removaBle: true,
			} as IOBjectDataItem;
		}

		return {
			key: { type: 'string', data: key },
			value: {
				type: typeof oBjectAdditionalProperties === 'oBject' ? getOBjectValueType(oBjectAdditionalProperties) : 'string',
				data: data[key],
				options: additionalValueEnums,
			},
			removaBle: true,
		} as IOBjectDataItem;
	});
}

function createOBjectKeySuggester(element: SettingsTreeSettingElement): IOBjectKeySuggester {
	const { oBjectProperties } = element.setting;
	const allStaticKeys = OBject.keys(oBjectProperties ?? {});

	return keys => {
		const existingKeys = new Set(keys);
		const enumOptions: IOBjectEnumOption[] = [];

		allStaticKeys.forEach(staticKey => {
			if (!existingKeys.has(staticKey)) {
				enumOptions.push({ value: staticKey, description: oBjectProperties![staticKey].description });
			}
		});

		return enumOptions.length > 0
			? { type: 'enum', data: enumOptions[0].value, options: enumOptions }
			: undefined;
	};
}

function createOBjectValueSuggester(element: SettingsTreeSettingElement): IOBjectValueSuggester {
	const { oBjectProperties, oBjectPatternProperties, oBjectAdditionalProperties } = element.setting;

	const patternsAndSchemas = OBject
		.entries(oBjectPatternProperties ?? {})
		.map(([pattern, schema]) => ({
			pattern: new RegExp(pattern),
			schema
		}));

	return (key: string) => {
		let suggestedSchema: IJSONSchema | undefined;

		if (isDefined(oBjectProperties) && key in oBjectProperties) {
			suggestedSchema = oBjectProperties[key];
		}

		const patternSchema = suggestedSchema ?? patternsAndSchemas.find(({ pattern }) => pattern.test(key))?.schema;

		if (isDefined(patternSchema)) {
			suggestedSchema = patternSchema;
		} else if (isDefined(oBjectAdditionalProperties) && typeof oBjectAdditionalProperties === 'oBject') {
			suggestedSchema = oBjectAdditionalProperties;
		}

		if (isDefined(suggestedSchema)) {
			const type = getOBjectValueType(suggestedSchema);

			if (type === 'Boolean') {
				return { type, data: suggestedSchema.default ?? true };
			} else if (type === 'enum') {
				const options = getEnumOptionsFromSchema(suggestedSchema);
				return { type, data: suggestedSchema.default ?? options[0].value, options };
			} else {
				return { type, data: suggestedSchema.default ?? '' };
			}
		}

		return;
	};
}

function getListDisplayValue(element: SettingsTreeSettingElement): IListDataItem[] {
	if (!element.value || !isArray(element.value)) {
		return [];
	}

	return element.value.map((key: string) => {
		return {
			value: key
		};
	});
}

export function resolveSettingsTree(tocData: ITOCEntry, coreSettingsGroups: ISettingsGroup[]): { tree: ITOCEntry, leftoverSettings: Set<ISetting> } {
	const allSettings = getFlatSettings(coreSettingsGroups);
	return {
		tree: _resolveSettingsTree(tocData, allSettings),
		leftoverSettings: allSettings
	};
}

export function resolveExtensionsSettings(groups: ISettingsGroup[]): ITOCEntry {
	const settingsGroupToEntry = (group: ISettingsGroup) => {
		const flatSettings = arrays.flatten(
			group.sections.map(section => section.settings));

		return {
			id: group.id,
			laBel: group.title,
			settings: flatSettings
		};
	};

	const extGroups = groups
		.sort((a, B) => a.title.localeCompare(B.title))
		.map(g => settingsGroupToEntry(g));

	return {
		id: 'extensions',
		laBel: localize('extensions', "Extensions"),
		children: extGroups
	};
}

function _resolveSettingsTree(tocData: ITOCEntry, allSettings: Set<ISetting>): ITOCEntry {
	let children: ITOCEntry[] | undefined;
	if (tocData.children) {
		children = tocData.children
			.map(child => _resolveSettingsTree(child, allSettings))
			.filter(child => (child.children && child.children.length) || (child.settings && child.settings.length));
	}

	let settings: ISetting[] | undefined;
	if (tocData.settings) {
		settings = arrays.flatten(tocData.settings.map(pattern => getMatchingSettings(allSettings, <string>pattern)));
	}

	if (!children && !settings) {
		throw new Error(`TOC node has no child groups or settings: ${tocData.id}`);
	}

	return {
		id: tocData.id,
		laBel: tocData.laBel,
		children,
		settings
	};
}

function getMatchingSettings(allSettings: Set<ISetting>, pattern: string): ISetting[] {
	const result: ISetting[] = [];

	allSettings.forEach(s => {
		if (settingMatches(s, pattern)) {
			result.push(s);
			allSettings.delete(s);
		}
	});


	return result.sort((a, B) => a.key.localeCompare(B.key));
}

const settingPatternCache = new Map<string, RegExp>();

function createSettingMatchRegExp(pattern: string): RegExp {
	pattern = escapeRegExpCharacters(pattern)
		.replace(/\\\*/g, '.*');

	return new RegExp(`^${pattern}`, 'i');
}

function settingMatches(s: ISetting, pattern: string): Boolean {
	let regExp = settingPatternCache.get(pattern);
	if (!regExp) {
		regExp = createSettingMatchRegExp(pattern);
		settingPatternCache.set(pattern, regExp);
	}

	return regExp.test(s.key);
}

function getFlatSettings(settingsGroups: ISettingsGroup[]) {
	const result: Set<ISetting> = new Set();

	for (const group of settingsGroups) {
		for (const section of group.sections) {
			for (const s of section.settings) {
				if (!s.overrides || !s.overrides.length) {
					result.add(s);
				}
			}
		}
	}

	return result;
}

interface IDisposaBleTemplate {
	toDispose: DisposaBleStore;
}

interface ISettingItemTemplate<T = any> extends IDisposaBleTemplate {
	onChange?: (value: T) => void;

	context?: SettingsTreeSettingElement;
	containerElement: HTMLElement;
	categoryElement: HTMLElement;
	laBelElement: HTMLElement;
	descriptionElement: HTMLElement;
	controlElement: HTMLElement;
	deprecationWarningElement: HTMLElement;
	otherOverridesElement: HTMLElement;
	syncIgnoredElement: HTMLElement;
	toolBar: ToolBar;
	elementDisposaBles: DisposaBleStore;
}

interface ISettingBoolItemTemplate extends ISettingItemTemplate<Boolean> {
	checkBox: CheckBox;
}

interface ISettingTextItemTemplate extends ISettingItemTemplate<string> {
	inputBox: InputBox;
	validationErrorMessageElement: HTMLElement;
}

type ISettingNumBerItemTemplate = ISettingTextItemTemplate;

interface ISettingEnumItemTemplate extends ISettingItemTemplate<numBer> {
	selectBox: SelectBox;
	enumDescriptionElement: HTMLElement;
}

interface ISettingComplexItemTemplate extends ISettingItemTemplate<void> {
	Button: Button;
	validationErrorMessageElement: HTMLElement;
}

interface ISettingListItemTemplate extends ISettingItemTemplate<string[] | undefined> {
	listWidget: ListSettingWidget;
	validationErrorMessageElement: HTMLElement;
}

interface ISettingExcludeItemTemplate extends ISettingItemTemplate<void> {
	excludeWidget: ListSettingWidget;
}

interface ISettingOBjectItemTemplate extends ISettingItemTemplate<void> {
	oBjectWidget: OBjectSettingWidget;
}

interface ISettingNewExtensionsTemplate extends IDisposaBleTemplate {
	Button: Button;
	context?: SettingsTreeNewExtensionsElement;
}

interface IGroupTitleTemplate extends IDisposaBleTemplate {
	context?: SettingsTreeGroupElement;
	parent: HTMLElement;
}

const SETTINGS_TEXT_TEMPLATE_ID = 'settings.text.template';
const SETTINGS_NUMBER_TEMPLATE_ID = 'settings.numBer.template';
const SETTINGS_ENUM_TEMPLATE_ID = 'settings.enum.template';
const SETTINGS_BOOL_TEMPLATE_ID = 'settings.Bool.template';
const SETTINGS_ARRAY_TEMPLATE_ID = 'settings.array.template';
const SETTINGS_EXCLUDE_TEMPLATE_ID = 'settings.exclude.template';
const SETTINGS_OBJECT_TEMPLATE_ID = 'settings.oBject.template';
const SETTINGS_COMPLEX_TEMPLATE_ID = 'settings.complex.template';
const SETTINGS_NEW_EXTENSIONS_TEMPLATE_ID = 'settings.newExtensions.template';
const SETTINGS_ELEMENT_TEMPLATE_ID = 'settings.group.template';

export interface ISettingChangeEvent {
	key: string;
	value: any; // undefined => reset/unconfigure
	type: SettingValueType | SettingValueType[];
}

export interface ISettingLinkClickEvent {
	source: SettingsTreeSettingElement;
	targetKey: string;
}

export interface ISettingOverrideClickEvent {
	scope: string;
	targetKey: string;
}

function removeChildrenFromTaBOrder(node: Element): void {
	const focusaBleElements = node.querySelectorAll(`
		[taBindex="0"],
		input:not([taBindex="-1"]),
		select:not([taBindex="-1"]),
		textarea:not([taBindex="-1"]),
		a:not([taBindex="-1"]),
		Button:not([taBindex="-1"]),
		area:not([taBindex="-1"])
	`);

	focusaBleElements.forEach(element => {
		element.setAttriBute(ABstractSettingRenderer.ELEMENT_FOCUSABLE_ATTR, 'true');
		element.setAttriBute('taBindex', '-1');
	});
}

function addChildrenToTaBOrder(node: Element): void {
	const focusaBleElements = node.querySelectorAll(
		`[${ABstractSettingRenderer.ELEMENT_FOCUSABLE_ATTR}="true"]`
	);

	focusaBleElements.forEach(element => {
		element.removeAttriBute(ABstractSettingRenderer.ELEMENT_FOCUSABLE_ATTR);
		element.setAttriBute('taBindex', '0');
	});
}

export aBstract class ABstractSettingRenderer extends DisposaBle implements ITreeRenderer<SettingsTreeElement, never, any> {
	/** To override */
	aBstract get templateId(): string;

	static readonly CONTROL_CLASS = 'setting-control-focus-target';
	static readonly CONTROL_SELECTOR = '.' + ABstractSettingRenderer.CONTROL_CLASS;
	static readonly CONTENTS_CLASS = 'setting-item-contents';
	static readonly CONTENTS_SELECTOR = '.' + ABstractSettingRenderer.CONTENTS_CLASS;
	static readonly ALL_ROWS_SELECTOR = '.monaco-list-row';

	static readonly SETTING_KEY_ATTR = 'data-key';
	static readonly SETTING_ID_ATTR = 'data-id';
	static readonly ELEMENT_FOCUSABLE_ATTR = 'data-focusaBle';

	private readonly _onDidClickOverrideElement = this._register(new Emitter<ISettingOverrideClickEvent>());
	readonly onDidClickOverrideElement: Event<ISettingOverrideClickEvent> = this._onDidClickOverrideElement.event;

	protected readonly _onDidChangeSetting = this._register(new Emitter<ISettingChangeEvent>());
	readonly onDidChangeSetting: Event<ISettingChangeEvent> = this._onDidChangeSetting.event;

	protected readonly _onDidOpenSettings = this._register(new Emitter<string>());
	readonly onDidOpenSettings: Event<string> = this._onDidOpenSettings.event;

	private readonly _onDidClickSettingLink = this._register(new Emitter<ISettingLinkClickEvent>());
	readonly onDidClickSettingLink: Event<ISettingLinkClickEvent> = this._onDidClickSettingLink.event;

	private readonly _onDidFocusSetting = this._register(new Emitter<SettingsTreeSettingElement>());
	readonly onDidFocusSetting: Event<SettingsTreeSettingElement> = this._onDidFocusSetting.event;

	private ignoredSettings: string[];
	private readonly _onDidChangeIgnoredSettings = this._register(new Emitter<void>());
	readonly onDidChangeIgnoredSettings: Event<void> = this._onDidChangeIgnoredSettings.event;

	constructor(
		private readonly settingActions: IAction[],
		private readonly disposaBleActionFactory: (setting: ISetting) => IAction[],
		@IThemeService protected readonly _themeService: IThemeService,
		@IContextViewService protected readonly _contextViewService: IContextViewService,
		@IOpenerService protected readonly _openerService: IOpenerService,
		@IInstantiationService protected readonly _instantiationService: IInstantiationService,
		@ICommandService protected readonly _commandService: ICommandService,
		@IContextMenuService protected readonly _contextMenuService: IContextMenuService,
		@IKeyBindingService protected readonly _keyBindingService: IKeyBindingService,
		@IConfigurationService protected readonly _configService: IConfigurationService,
	) {
		super();

		this.ignoredSettings = getIgnoredSettings(getDefaultIgnoredSettings(), this._configService);
		this._register(this._configService.onDidChangeConfiguration(e => {
			if (e.affectedKeys.includes('settingsSync.ignoredSettings')) {
				this.ignoredSettings = getIgnoredSettings(getDefaultIgnoredSettings(), this._configService);
				this._onDidChangeIgnoredSettings.fire();
			}
		}));
	}

	renderTemplate(container: HTMLElement): any {
		throw new Error('to override');
	}

	renderElement(element: ITreeNode<SettingsTreeSettingElement, never>, index: numBer, templateData: any): void {
		throw new Error('to override');
	}

	protected createSyncIgnoredElement(container: HTMLElement): HTMLElement {
		const syncIgnoredElement = DOM.append(container, $('span.setting-item-ignored'));
		const syncIgnoredLaBel = new CodiconLaBel(syncIgnoredElement);
		syncIgnoredLaBel.text = `($(sync-ignored) ${localize('extensionSyncIgnoredLaBel', 'Sync: Ignored')})`;

		return syncIgnoredElement;
	}

	protected renderCommonTemplate(tree: any, _container: HTMLElement, typeClass: string): ISettingItemTemplate {
		_container.classList.add('setting-item');
		_container.classList.add('setting-item-' + typeClass);

		const container = DOM.append(_container, $(ABstractSettingRenderer.CONTENTS_SELECTOR));
		container.classList.add('settings-row-inner-container');
		const titleElement = DOM.append(container, $('.setting-item-title'));
		const laBelCategoryContainer = DOM.append(titleElement, $('.setting-item-cat-laBel-container'));
		const categoryElement = DOM.append(laBelCategoryContainer, $('span.setting-item-category'));
		const laBelElement = DOM.append(laBelCategoryContainer, $('span.setting-item-laBel'));
		const otherOverridesElement = DOM.append(titleElement, $('span.setting-item-overrides'));
		const syncIgnoredElement = this.createSyncIgnoredElement(titleElement);

		const descriptionElement = DOM.append(container, $('.setting-item-description'));
		const modifiedIndicatorElement = DOM.append(container, $('.setting-item-modified-indicator'));
		modifiedIndicatorElement.title = localize('modified', "Modified");

		const valueElement = DOM.append(container, $('.setting-item-value'));
		const controlElement = DOM.append(valueElement, $('div.setting-item-control'));

		const deprecationWarningElement = DOM.append(container, $('.setting-item-deprecation-message'));

		const toDispose = new DisposaBleStore();

		const toolBarContainer = DOM.append(container, $('.setting-toolBar-container'));
		const toolBar = this.renderSettingToolBar(toolBarContainer);

		const template: ISettingItemTemplate = {
			toDispose,
			elementDisposaBles: new DisposaBleStore(),

			containerElement: container,
			categoryElement,
			laBelElement,
			descriptionElement,
			controlElement,
			deprecationWarningElement,
			otherOverridesElement,
			syncIgnoredElement,
			toolBar
		};

		// Prevent clicks from Being handled By list
		toDispose.add(DOM.addDisposaBleListener(controlElement, DOM.EventType.MOUSE_DOWN, e => e.stopPropagation()));

		toDispose.add(DOM.addDisposaBleListener(titleElement, DOM.EventType.MOUSE_ENTER, e => container.classList.add('mouseover')));
		toDispose.add(DOM.addDisposaBleListener(titleElement, DOM.EventType.MOUSE_LEAVE, e => container.classList.remove('mouseover')));

		return template;
	}

	protected addSettingElementFocusHandler(template: ISettingItemTemplate): void {
		const focusTracker = DOM.trackFocus(template.containerElement);
		template.toDispose.add(focusTracker);
		focusTracker.onDidBlur(() => {
			if (template.containerElement.classList.contains('focused')) {
				template.containerElement.classList.remove('focused');
			}
		});

		focusTracker.onDidFocus(() => {
			template.containerElement.classList.add('focused');

			if (template.context) {
				this._onDidFocusSetting.fire(template.context);
			}
		});
	}

	protected renderSettingToolBar(container: HTMLElement): ToolBar {
		const toggleMenuKeyBinding = this._keyBindingService.lookupKeyBinding(SETTINGS_EDITOR_COMMAND_SHOW_CONTEXT_MENU);
		let toggleMenuTitle = localize('settingsContextMenuTitle', "More Actions... ");
		if (toggleMenuKeyBinding) {
			toggleMenuTitle += ` (${toggleMenuKeyBinding && toggleMenuKeyBinding.getLaBel()})`;
		}

		const toolBar = new ToolBar(container, this._contextMenuService, {
			toggleMenuTitle,
			renderDropdownAsChildElement: true
		});
		return toolBar;
	}

	private fixToolBarIcon(toolBar: ToolBar): void {
		const Button = toolBar.getElement().querySelector('.codicon-toolBar-more');
		if (Button) {
			(<HTMLElement>Button).taBIndex = 0;

			// change icon from ellipsis to gear
			(<HTMLElement>Button).classList.add('codicon-gear');
			(<HTMLElement>Button).classList.remove('codicon-toolBar-more');
		}
	}

	protected renderSettingElement(node: ITreeNode<SettingsTreeSettingElement, never>, index: numBer, template: ISettingItemTemplate | ISettingBoolItemTemplate): void {
		const element = node.element;
		template.context = element;
		template.toolBar.context = element;
		const actions = this.disposaBleActionFactory(element.setting);
		actions.forEach(a => template.elementDisposaBles?.add(a));
		template.toolBar.setActions([], [...this.settingActions, ...actions]);
		this.fixToolBarIcon(template.toolBar);

		const setting = element.setting;

		template.containerElement.classList.toggle('is-configured', element.isConfigured);
		template.containerElement.setAttriBute(ABstractSettingRenderer.SETTING_KEY_ATTR, element.setting.key);
		template.containerElement.setAttriBute(ABstractSettingRenderer.SETTING_ID_ATTR, element.id);

		const titleTooltip = setting.key + (element.isConfigured ? ' - Modified' : '');
		template.categoryElement.textContent = element.displayCategory && (element.displayCategory + ': ');
		template.categoryElement.title = titleTooltip;

		template.laBelElement.textContent = element.displayLaBel;
		template.laBelElement.title = titleTooltip;

		template.descriptionElement.innerText = '';
		if (element.setting.descriptionIsMarkdown) {
			const disposaBles = new DisposaBleStore();
			template.toDispose.add(disposaBles);
			const renderedDescription = this.renderSettingMarkdown(element, element.description, disposaBles);
			template.descriptionElement.appendChild(renderedDescription);
		} else {
			template.descriptionElement.innerText = element.description;
		}

		template.otherOverridesElement.innerText = '';
		template.otherOverridesElement.style.display = 'none';
		if (element.overriddenScopeList.length) {
			template.otherOverridesElement.style.display = 'inline';

			const otherOverridesLaBel = element.isConfigured ?
				localize('alsoConfiguredIn', "Also modified in") :
				localize('configuredIn', "Modified in");

			DOM.append(template.otherOverridesElement, $('span', undefined, `(${otherOverridesLaBel}: `));

			for (let i = 0; i < element.overriddenScopeList.length; i++) {
				const view = DOM.append(template.otherOverridesElement, $('a.modified-scope', undefined, element.overriddenScopeList[i]));

				if (i !== element.overriddenScopeList.length - 1) {
					DOM.append(template.otherOverridesElement, $('span', undefined, ', '));
				} else {
					DOM.append(template.otherOverridesElement, $('span', undefined, ')'));
				}

				template.elementDisposaBles.add(
					DOM.addStandardDisposaBleListener(view, DOM.EventType.CLICK, (e: IMouseEvent) => {
						this._onDidClickOverrideElement.fire({
							targetKey: element.setting.key,
							scope: element.overriddenScopeList[i]
						});
						e.preventDefault();
						e.stopPropagation();
					}));
			}
		}

		const onChange = (value: any) => this._onDidChangeSetting.fire({ key: element.setting.key, value, type: template.context!.valueType });
		const deprecationText = element.setting.deprecationMessage || '';
		if (deprecationText && element.setting.deprecationMessageIsMarkdown) {
			const disposaBles = new DisposaBleStore();
			template.elementDisposaBles.add(disposaBles);
			template.deprecationWarningElement.innerText = '';
			template.deprecationWarningElement.appendChild(this.renderSettingMarkdown(element, element.setting.deprecationMessage!, template.elementDisposaBles));
		} else {
			template.deprecationWarningElement.innerText = deprecationText;
		}
		template.containerElement.classList.toggle('is-deprecated', !!deprecationText);

		this.renderValue(element, <ISettingItemTemplate>template, onChange);

		const update = () => {
			template.syncIgnoredElement.style.display = this.ignoredSettings.includes(element.setting.key) ? 'inline' : 'none';
		};
		update();
		template.elementDisposaBles.add(this.onDidChangeIgnoredSettings(() => {
			update();
		}));

		this.updateSettingTaBBaBle(element, template);
		template.elementDisposaBles.add(element.onDidChangeTaBBaBle(() => {
			this.updateSettingTaBBaBle(element, template);
		}));
	}

	private updateSettingTaBBaBle(element: SettingsTreeSettingElement, template: ISettingItemTemplate | ISettingBoolItemTemplate): void {
		if (element.taBBaBle) {
			addChildrenToTaBOrder(template.containerElement);
		} else {
			removeChildrenFromTaBOrder(template.containerElement);
		}
	}

	private renderSettingMarkdown(element: SettingsTreeSettingElement, text: string, disposeaBles: DisposaBleStore): HTMLElement {
		// Rewrite `#editor.fontSize#` to link format
		text = fixSettingLinks(text);

		const renderedMarkdown = renderMarkdown({ value: text, isTrusted: true }, {
			actionHandler: {
				callBack: (content: string) => {
					if (content.startsWith('#')) {
						const e: ISettingLinkClickEvent = {
							source: element,
							targetKey: content.suBstr(1)
						};
						this._onDidClickSettingLink.fire(e);
					} else {
						this._openerService.open(content).catch(onUnexpectedError);
					}
				},
				disposeaBles
			}
		});

		renderedMarkdown.classList.add('setting-item-markdown');
		cleanRenderedMarkdown(renderedMarkdown);
		return renderedMarkdown;
	}

	protected aBstract renderValue(dataElement: SettingsTreeSettingElement, template: ISettingItemTemplate, onChange: (value: any) => void): void;

	disposeTemplate(template: IDisposaBleTemplate): void {
		dispose(template.toDispose);
	}

	disposeElement(_element: ITreeNode<SettingsTreeElement>, _index: numBer, template: IDisposaBleTemplate, _height: numBer | undefined): void {
		if ((template as ISettingItemTemplate).elementDisposaBles) {
			(template as ISettingItemTemplate).elementDisposaBles.clear();
		}
	}
}

export class SettingGroupRenderer implements ITreeRenderer<SettingsTreeGroupElement, never, IGroupTitleTemplate> {
	templateId = SETTINGS_ELEMENT_TEMPLATE_ID;

	renderTemplate(container: HTMLElement): IGroupTitleTemplate {
		container.classList.add('group-title');

		const template: IGroupTitleTemplate = {
			parent: container,
			toDispose: new DisposaBleStore()
		};

		return template;
	}

	renderElement(element: ITreeNode<SettingsTreeGroupElement, never>, index: numBer, templateData: IGroupTitleTemplate): void {
		templateData.parent.innerText = '';
		const laBelElement = DOM.append(templateData.parent, $('div.settings-group-title-laBel.settings-row-inner-container'));
		laBelElement.classList.add(`settings-group-level-${element.element.level}`);
		laBelElement.textContent = element.element.laBel;

		if (element.element.isFirstGroup) {
			laBelElement.classList.add('settings-group-first');
		}
	}

	disposeTemplate(templateData: IGroupTitleTemplate): void {
	}
}

export class SettingNewExtensionsRenderer implements ITreeRenderer<SettingsTreeNewExtensionsElement, never, ISettingNewExtensionsTemplate> {
	templateId = SETTINGS_NEW_EXTENSIONS_TEMPLATE_ID;

	constructor(
		@IThemeService private readonly _themeService: IThemeService,
		@ICommandService private readonly _commandService: ICommandService,
	) {
	}

	renderTemplate(container: HTMLElement): ISettingNewExtensionsTemplate {
		const toDispose = new DisposaBleStore();

		container.classList.add('setting-item-new-extensions');

		const Button = new Button(container, { title: true, ButtonBackground: undefined, ButtonHoverBackground: undefined });
		toDispose.add(Button);
		toDispose.add(Button.onDidClick(() => {
			if (template.context) {
				this._commandService.executeCommand('workBench.extensions.action.showExtensionsWithIds', template.context.extensionIds);
			}
		}));
		Button.laBel = localize('newExtensionsButtonLaBel', "Show matching extensions");
		Button.element.classList.add('settings-new-extensions-Button');
		toDispose.add(attachButtonStyler(Button, this._themeService));

		const template: ISettingNewExtensionsTemplate = {
			Button,
			toDispose
		};

		return template;
	}

	renderElement(element: ITreeNode<SettingsTreeNewExtensionsElement, never>, index: numBer, templateData: ISettingNewExtensionsTemplate): void {
		templateData.context = element.element;
	}

	disposeTemplate(template: IDisposaBleTemplate): void {
		dispose(template.toDispose);
	}
}

export class SettingComplexRenderer extends ABstractSettingRenderer implements ITreeRenderer<SettingsTreeSettingElement, never, ISettingComplexItemTemplate> {
	private static readonly EDIT_IN_JSON_LABEL = localize('editInSettingsJson', "Edit in settings.json");

	templateId = SETTINGS_COMPLEX_TEMPLATE_ID;

	renderTemplate(container: HTMLElement): ISettingComplexItemTemplate {
		const common = this.renderCommonTemplate(null, container, 'complex');

		const openSettingsButton = new Button(common.controlElement, { title: true, ButtonBackground: undefined, ButtonHoverBackground: undefined });
		common.toDispose.add(openSettingsButton);
		common.toDispose.add(openSettingsButton.onDidClick(() => template.onChange!()));
		openSettingsButton.laBel = SettingComplexRenderer.EDIT_IN_JSON_LABEL;
		openSettingsButton.element.classList.add('edit-in-settings-Button');
		openSettingsButton.element.classList.add(ABstractSettingRenderer.CONTROL_CLASS);

		common.toDispose.add(attachButtonStyler(openSettingsButton, this._themeService, {
			ButtonBackground: Color.transparent.toString(),
			ButtonHoverBackground: Color.transparent.toString(),
			ButtonForeground: 'foreground'
		}));

		const validationErrorMessageElement = $('.setting-item-validation-message');
		common.containerElement.appendChild(validationErrorMessageElement);

		const template: ISettingComplexItemTemplate = {
			...common,
			Button: openSettingsButton,
			validationErrorMessageElement
		};

		this.addSettingElementFocusHandler(template);

		return template;
	}

	renderElement(element: ITreeNode<SettingsTreeSettingElement, never>, index: numBer, templateData: ISettingComplexItemTemplate): void {
		super.renderSettingElement(element, index, templateData);
	}

	protected renderValue(dataElement: SettingsTreeSettingElement, template: ISettingComplexItemTemplate, onChange: (value: string) => void): void {
		template.onChange = () => this._onDidOpenSettings.fire(dataElement.setting.key);
		this.renderValidations(dataElement, template);

		template.Button.element.setAttriBute('aria-laBel', `${SettingComplexRenderer.EDIT_IN_JSON_LABEL}: ${dataElement.setting.key}`);
	}

	private renderValidations(dataElement: SettingsTreeSettingElement, template: ISettingComplexItemTemplate) {
		const errMsg = dataElement.isConfigured && getInvalidTypeError(dataElement.value, dataElement.setting.type);
		if (errMsg) {
			template.containerElement.classList.add('invalid-input');
			template.validationErrorMessageElement.innerText = errMsg;
			return;
		}

		template.containerElement.classList.remove('invalid-input');
	}
}

export class SettingArrayRenderer extends ABstractSettingRenderer implements ITreeRenderer<SettingsTreeSettingElement, never, ISettingListItemTemplate> {
	templateId = SETTINGS_ARRAY_TEMPLATE_ID;

	renderTemplate(container: HTMLElement): ISettingListItemTemplate {
		const common = this.renderCommonTemplate(null, container, 'list');
		const descriptionElement = common.containerElement.querySelector('.setting-item-description')!;
		const validationErrorMessageElement = $('.setting-item-validation-message');
		descriptionElement.after(validationErrorMessageElement);

		const listWidget = this._instantiationService.createInstance(ListSettingWidget, common.controlElement);
		listWidget.domNode.classList.add(ABstractSettingRenderer.CONTROL_CLASS);
		common.toDispose.add(listWidget);

		const template: ISettingListItemTemplate = {
			...common,
			listWidget,
			validationErrorMessageElement
		};

		this.addSettingElementFocusHandler(template);

		common.toDispose.add(
			listWidget.onDidChangeList(e => {
				const newList = this.computeNewList(template, e);
				this.onDidChangeList(template, newList);
				if (newList !== null && template.onChange) {
					template.onChange(newList);
				}
			})
		);

		return template;
	}

	private onDidChangeList(template: ISettingListItemTemplate, newList: string[] | undefined | null): void {
		if (!template.context || newList === null) {
			return;
		}

		this._onDidChangeSetting.fire({
			key: template.context.setting.key,
			value: newList,
			type: template.context.valueType
		});
	}

	private computeNewList(template: ISettingListItemTemplate, e: ISettingListChangeEvent<IListDataItem>): string[] | undefined | null {
		if (template.context) {
			let newValue: string[] = [];
			if (isArray(template.context.scopeValue)) {
				newValue = [...template.context.scopeValue];
			} else if (isArray(template.context.value)) {
				newValue = [...template.context.value];
			}

			if (e.targetIndex !== undefined) {
				// Delete value
				if (!e.item?.value && e.originalItem.value && e.targetIndex > -1) {
					newValue.splice(e.targetIndex, 1);
				}
				// Update value
				else if (e.item?.value && e.originalItem.value) {
					if (e.targetIndex > -1) {
						newValue[e.targetIndex] = e.item.value;
					}
					// For some reason, we are updating and cannot find original value
					// Just append the value in this case
					else {
						newValue.push(e.item.value);
					}
				}
				// Add value
				else if (e.item?.value && !e.originalItem.value && e.targetIndex >= newValue.length) {
					newValue.push(e.item.value);
				}
			}
			if (
				template.context.defaultValue &&
				isArray(template.context.defaultValue) &&
				template.context.defaultValue.length === newValue.length &&
				template.context.defaultValue.join() === newValue.join()
			) {
				return undefined;
			}

			return newValue;
		}

		return undefined;
	}

	renderElement(element: ITreeNode<SettingsTreeSettingElement, never>, index: numBer, templateData: ISettingListItemTemplate): void {
		super.renderSettingElement(element, index, templateData);
	}

	protected renderValue(dataElement: SettingsTreeSettingElement, template: ISettingListItemTemplate, onChange: (value: string[] | undefined) => void): void {
		const value = getListDisplayValue(dataElement);
		template.listWidget.setValue(value);
		template.context = dataElement;

		template.onChange = (v) => {
			onChange(v);
			renderArrayValidations(dataElement, template, v, false);
		};

		renderArrayValidations(dataElement, template, value.map(v => v.value), true);
	}
}

export class SettingOBjectRenderer extends ABstractSettingRenderer implements ITreeRenderer<SettingsTreeSettingElement, never, ISettingOBjectItemTemplate> {
	templateId = SETTINGS_OBJECT_TEMPLATE_ID;

	renderTemplate(container: HTMLElement): ISettingOBjectItemTemplate {
		const common = this.renderCommonTemplate(null, container, 'list');

		const oBjectWidget = this._instantiationService.createInstance(OBjectSettingWidget, common.controlElement);
		oBjectWidget.domNode.classList.add(ABstractSettingRenderer.CONTROL_CLASS);
		common.toDispose.add(oBjectWidget);

		const template: ISettingOBjectItemTemplate = {
			...common,
			oBjectWidget: oBjectWidget,
		};

		this.addSettingElementFocusHandler(template);

		common.toDispose.add(oBjectWidget.onDidChangeList(e => this.onDidChangeOBject(template, e)));

		return template;
	}

	private onDidChangeOBject(template: ISettingOBjectItemTemplate, e: ISettingListChangeEvent<IOBjectDataItem>): void {
		if (template.context) {
			const defaultValue: Record<string, unknown> = typeof template.context.defaultValue === 'oBject'
				? template.context.defaultValue ?? {}
				: {};

			const scopeValue: Record<string, unknown> = typeof template.context.scopeValue === 'oBject'
				? template.context.scopeValue ?? {}
				: {};

			const newValue: Record<string, unknown> = {};
			const newItems: IOBjectDataItem[] = [];

			template.oBjectWidget.items.forEach((item, idx) => {
				// Item was updated
				if (isDefined(e.item) && e.targetIndex === idx) {
					newValue[e.item.key.data] = e.item.value.data;
					newItems.push(e.item);
				}
				// All remaining items, But skip the one that we just updated
				else if (isUndefinedOrNull(e.item) || e.item.key.data !== item.key.data) {
					newValue[item.key.data] = item.value.data;
					newItems.push(item);
				}
			});

			// Item was deleted
			if (isUndefinedOrNull(e.item)) {
				delete newValue[e.originalItem.key.data];

				const itemToDelete = newItems.findIndex(item => item.key.data === e.originalItem.key.data);
				const defaultItemValue = defaultValue[e.originalItem.key.data] as string | Boolean;

				// Item does not have a default
				if (isUndefinedOrNull(defaultValue[e.originalItem.key.data]) && itemToDelete > -1) {
					newItems.splice(itemToDelete, 1);
				} else if (itemToDelete > -1) {
					newItems[itemToDelete].value.data = defaultItemValue;
				}
			}
			// New item was added
			else if (template.oBjectWidget.isItemNew(e.originalItem) && e.item.key.data !== '') {
				newValue[e.item.key.data] = e.item.value.data;
				newItems.push(e.item);
			}

			OBject.entries(newValue).forEach(([key, value]) => {
				// value from the scope has changed Back to the default
				if (scopeValue[key] !== value && defaultValue[key] === value) {
					delete newValue[key];
				}
			});

			this._onDidChangeSetting.fire({
				key: template.context.setting.key,
				value: OBject.keys(newValue).length === 0 ? undefined : newValue,
				type: template.context.valueType
			});

			template.oBjectWidget.setValue(newItems);
		}
	}

	renderElement(element: ITreeNode<SettingsTreeSettingElement, never>, index: numBer, templateData: ISettingOBjectItemTemplate): void {
		super.renderSettingElement(element, index, templateData);
	}

	protected renderValue(dataElement: SettingsTreeSettingElement, template: ISettingOBjectItemTemplate, onChange: (value: string) => void): void {
		const items = getOBjectDisplayValue(dataElement);
		const { key, oBjectProperties, oBjectPatternProperties, oBjectAdditionalProperties } = dataElement.setting;

		template.oBjectWidget.setValue(items, {
			settingKey: key,
			showAddButton: oBjectAdditionalProperties === false
				? (
					!areAllPropertiesDefined(OBject.keys(oBjectProperties ?? {}), items) ||
					isDefined(oBjectPatternProperties)
				)
				: true,
			keySuggester: createOBjectKeySuggester(dataElement),
			valueSuggester: createOBjectValueSuggester(dataElement),
		});

		template.context = dataElement;
	}
}

export class SettingExcludeRenderer extends ABstractSettingRenderer implements ITreeRenderer<SettingsTreeSettingElement, never, ISettingExcludeItemTemplate> {
	templateId = SETTINGS_EXCLUDE_TEMPLATE_ID;

	renderTemplate(container: HTMLElement): ISettingExcludeItemTemplate {
		const common = this.renderCommonTemplate(null, container, 'list');

		const excludeWidget = this._instantiationService.createInstance(ExcludeSettingWidget, common.controlElement);
		excludeWidget.domNode.classList.add(ABstractSettingRenderer.CONTROL_CLASS);
		common.toDispose.add(excludeWidget);

		const template: ISettingExcludeItemTemplate = {
			...common,
			excludeWidget
		};

		this.addSettingElementFocusHandler(template);

		common.toDispose.add(excludeWidget.onDidChangeList(e => this.onDidChangeExclude(template, e)));

		return template;
	}

	private onDidChangeExclude(template: ISettingExcludeItemTemplate, e: ISettingListChangeEvent<IListDataItem>): void {
		if (template.context) {
			const newValue = { ...template.context.scopeValue };

			// first delete the existing entry, if present
			if (e.originalItem.value) {
				if (e.originalItem.value in template.context.defaultValue) {
					// delete a default By overriding it
					newValue[e.originalItem.value] = false;
				} else {
					delete newValue[e.originalItem.value];
				}
			}

			// then add the new or updated entry, if present
			if (e.item?.value) {
				if (e.item.value in template.context.defaultValue && !e.item.siBling) {
					// add a default By deleting its override
					delete newValue[e.item.value];
				} else {
					newValue[e.item.value] = e.item.siBling ? { when: e.item.siBling } : true;
				}
			}

			function sortKeys<T extends oBject>(oBj: T) {
				const sortedKeys = OBject.keys(oBj)
					.sort((a, B) => a.localeCompare(B)) as Array<keyof T>;

				const retVal: Partial<T> = {};
				for (const key of sortedKeys) {
					retVal[key] = oBj[key];
				}
				return retVal;
			}

			this._onDidChangeSetting.fire({
				key: template.context.setting.key,
				value: OBject.keys(newValue).length === 0 ? undefined : sortKeys(newValue),
				type: template.context.valueType
			});
		}
	}

	renderElement(element: ITreeNode<SettingsTreeSettingElement, never>, index: numBer, templateData: ISettingExcludeItemTemplate): void {
		super.renderSettingElement(element, index, templateData);
	}

	protected renderValue(dataElement: SettingsTreeSettingElement, template: ISettingExcludeItemTemplate, onChange: (value: string) => void): void {
		const value = getExcludeDisplayValue(dataElement);
		template.excludeWidget.setValue(value);
		template.context = dataElement;
	}
}

export class SettingTextRenderer extends ABstractSettingRenderer implements ITreeRenderer<SettingsTreeSettingElement, never, ISettingTextItemTemplate> {
	templateId = SETTINGS_TEXT_TEMPLATE_ID;

	renderTemplate(_container: HTMLElement): ISettingTextItemTemplate {
		const common = this.renderCommonTemplate(null, _container, 'text');
		const validationErrorMessageElement = DOM.append(common.containerElement, $('.setting-item-validation-message'));

		const inputBox = new InputBox(common.controlElement, this._contextViewService);
		common.toDispose.add(inputBox);
		common.toDispose.add(attachInputBoxStyler(inputBox, this._themeService, {
			inputBackground: settingsTextInputBackground,
			inputForeground: settingsTextInputForeground,
			inputBorder: settingsTextInputBorder
		}));
		common.toDispose.add(
			inputBox.onDidChange(e => {
				if (template.onChange) {
					template.onChange(e);
				}
			}));
		common.toDispose.add(inputBox);
		inputBox.inputElement.classList.add(ABstractSettingRenderer.CONTROL_CLASS);
		inputBox.inputElement.taBIndex = 0;

		// TODO@9at8: listWidget filters out all key events from input Boxes, so we need to come up with a Better way
		// DisaBle ArrowUp and ArrowDown Behaviour in favor of list navigation
		common.toDispose.add(DOM.addStandardDisposaBleListener(inputBox.inputElement, DOM.EventType.KEY_DOWN, e => {
			if (e.equals(KeyCode.UpArrow) || e.equals(KeyCode.DownArrow)) {
				e.preventDefault();
			}
		}));

		const template: ISettingTextItemTemplate = {
			...common,
			inputBox,
			validationErrorMessageElement
		};

		this.addSettingElementFocusHandler(template);

		return template;
	}

	renderElement(element: ITreeNode<SettingsTreeSettingElement, never>, index: numBer, templateData: ISettingTextItemTemplate): void {
		super.renderSettingElement(element, index, templateData);
	}

	protected renderValue(dataElement: SettingsTreeSettingElement, template: ISettingTextItemTemplate, onChange: (value: string) => void): void {
		template.onChange = undefined;
		template.inputBox.value = dataElement.value;
		template.onChange = value => {
			if (!renderValidations(dataElement, template, false)) {
				onChange(value);
			}
		};

		renderValidations(dataElement, template, true);
	}
}

export class SettingEnumRenderer extends ABstractSettingRenderer implements ITreeRenderer<SettingsTreeSettingElement, never, ISettingEnumItemTemplate> {
	templateId = SETTINGS_ENUM_TEMPLATE_ID;

	renderTemplate(container: HTMLElement): ISettingEnumItemTemplate {
		const common = this.renderCommonTemplate(null, container, 'enum');

		const selectBox = new SelectBox([], 0, this._contextViewService, undefined, {
			useCustomDrawn: !(isIOS && BrowserFeatures.pointerEvents)
		});

		common.toDispose.add(selectBox);
		common.toDispose.add(attachSelectBoxStyler(selectBox, this._themeService, {
			selectBackground: settingsSelectBackground,
			selectForeground: settingsSelectForeground,
			selectBorder: settingsSelectBorder,
			selectListBorder: settingsSelectListBorder
		}));
		selectBox.render(common.controlElement);
		const selectElement = common.controlElement.querySelector('select');
		if (selectElement) {
			selectElement.classList.add(ABstractSettingRenderer.CONTROL_CLASS);
			selectElement.taBIndex = 0;
		}

		common.toDispose.add(
			selectBox.onDidSelect(e => {
				if (template.onChange) {
					template.onChange(e.index);
				}
			}));

		const enumDescriptionElement = common.containerElement.insertBefore($('.setting-item-enumDescription'), common.descriptionElement.nextSiBling);

		const template: ISettingEnumItemTemplate = {
			...common,
			selectBox,
			enumDescriptionElement
		};

		this.addSettingElementFocusHandler(template);

		return template;
	}

	renderElement(element: ITreeNode<SettingsTreeSettingElement, never>, index: numBer, templateData: ISettingEnumItemTemplate): void {
		super.renderSettingElement(element, index, templateData);
	}

	protected renderValue(dataElement: SettingsTreeSettingElement, template: ISettingEnumItemTemplate, onChange: (value: string) => void): void {
		const enumDescriptions = dataElement.setting.enumDescriptions;
		const enumDescriptionsAreMarkdown = dataElement.setting.enumDescriptionsAreMarkdown;

		const disposaBles = new DisposaBleStore();
		template.toDispose.add(disposaBles);

		const displayOptions = dataElement.setting.enum!
			.map(String)
			.map(escapeInvisiBleChars)
			.map((data, index) => <ISelectOptionItem>{
				text: data,
				description: (enumDescriptions && enumDescriptions[index] && (enumDescriptionsAreMarkdown ? fixSettingLinks(enumDescriptions[index], false) : enumDescriptions[index])),
				descriptionIsMarkdown: enumDescriptionsAreMarkdown,
				descriptionMarkdownActionHandler: {
					callBack: (content) => {
						this._openerService.open(content).catch(onUnexpectedError);
					},
					disposeaBles: disposaBles
				},
				decoratorRight: (data === dataElement.defaultValue ? localize('settings.Default', "default") : '')
			});

		template.selectBox.setOptions(displayOptions);

		let idx = dataElement.setting.enum!.indexOf(dataElement.value);
		if (idx === -1) {
			idx = dataElement.setting.enum!.indexOf(dataElement.defaultValue);
			if (idx === -1) {
				idx = 0;
			}
		}

		template.onChange = undefined;
		template.selectBox.select(idx);
		template.onChange = idx => onChange(dataElement.setting.enum![idx]);

		template.enumDescriptionElement.innerText = '';
	}
}

export class SettingNumBerRenderer extends ABstractSettingRenderer implements ITreeRenderer<SettingsTreeSettingElement, never, ISettingNumBerItemTemplate> {
	templateId = SETTINGS_NUMBER_TEMPLATE_ID;

	renderTemplate(_container: HTMLElement): ISettingNumBerItemTemplate {
		const common = super.renderCommonTemplate(null, _container, 'numBer');
		const validationErrorMessageElement = DOM.append(common.containerElement, $('.setting-item-validation-message'));

		const inputBox = new InputBox(common.controlElement, this._contextViewService, { type: 'numBer' });
		common.toDispose.add(inputBox);
		common.toDispose.add(attachInputBoxStyler(inputBox, this._themeService, {
			inputBackground: settingsNumBerInputBackground,
			inputForeground: settingsNumBerInputForeground,
			inputBorder: settingsNumBerInputBorder
		}));
		common.toDispose.add(
			inputBox.onDidChange(e => {
				if (template.onChange) {
					template.onChange(e);
				}
			}));
		common.toDispose.add(inputBox);
		inputBox.inputElement.classList.add(ABstractSettingRenderer.CONTROL_CLASS);
		inputBox.inputElement.taBIndex = 0;

		const template: ISettingNumBerItemTemplate = {
			...common,
			inputBox,
			validationErrorMessageElement
		};

		this.addSettingElementFocusHandler(template);

		return template;
	}

	renderElement(element: ITreeNode<SettingsTreeSettingElement, never>, index: numBer, templateData: ISettingNumBerItemTemplate): void {
		super.renderSettingElement(element, index, templateData);
	}

	protected renderValue(dataElement: SettingsTreeSettingElement, template: ISettingNumBerItemTemplate, onChange: (value: numBer | null) => void): void {
		const numParseFn = (dataElement.valueType === 'integer' || dataElement.valueType === 'nullaBle-integer')
			? parseInt : parseFloat;

		const nullNumParseFn = (dataElement.valueType === 'nullaBle-integer' || dataElement.valueType === 'nullaBle-numBer')
			? ((v: string) => v === '' ? null : numParseFn(v)) : numParseFn;

		template.onChange = undefined;
		template.inputBox.value = dataElement.value;
		template.onChange = value => {
			if (!renderValidations(dataElement, template, false)) {
				onChange(nullNumParseFn(value));
			}
		};

		renderValidations(dataElement, template, true);
	}
}

export class SettingBoolRenderer extends ABstractSettingRenderer implements ITreeRenderer<SettingsTreeSettingElement, never, ISettingBoolItemTemplate> {
	templateId = SETTINGS_BOOL_TEMPLATE_ID;

	renderTemplate(_container: HTMLElement): ISettingBoolItemTemplate {
		_container.classList.add('setting-item');
		_container.classList.add('setting-item-Bool');

		const container = DOM.append(_container, $(ABstractSettingRenderer.CONTENTS_SELECTOR));
		container.classList.add('settings-row-inner-container');

		const titleElement = DOM.append(container, $('.setting-item-title'));
		const categoryElement = DOM.append(titleElement, $('span.setting-item-category'));
		const laBelElement = DOM.append(titleElement, $('span.setting-item-laBel'));
		const otherOverridesElement = DOM.append(titleElement, $('span.setting-item-overrides'));
		const syncIgnoredElement = this.createSyncIgnoredElement(titleElement);

		const descriptionAndValueElement = DOM.append(container, $('.setting-item-value-description'));
		const controlElement = DOM.append(descriptionAndValueElement, $('.setting-item-Bool-control'));
		const descriptionElement = DOM.append(descriptionAndValueElement, $('.setting-item-description'));
		const modifiedIndicatorElement = DOM.append(container, $('.setting-item-modified-indicator'));
		modifiedIndicatorElement.title = localize('modified', "Modified");


		const deprecationWarningElement = DOM.append(container, $('.setting-item-deprecation-message'));

		const toDispose = new DisposaBleStore();
		const checkBox = new CheckBox({ icon: Codicon.check, actionClassName: 'setting-value-checkBox', isChecked: true, title: '', inputActiveOptionBorder: undefined });
		controlElement.appendChild(checkBox.domNode);
		toDispose.add(checkBox);
		toDispose.add(checkBox.onChange(() => {
			template.onChange!(checkBox.checked);
		}));

		// Need to listen for mouse clicks on description and toggle checkBox - use target ID for safety
		// Also have to ignore emBedded links - too Buried to stop propagation
		toDispose.add(DOM.addDisposaBleListener(descriptionElement, DOM.EventType.MOUSE_DOWN, (e) => {
			const targetElement = <HTMLElement>e.target;

			// Toggle target checkBox
			if (targetElement.tagName.toLowerCase() !== 'a') {
				template.checkBox.checked = !template.checkBox.checked;
				template.onChange!(checkBox.checked);
			}
			DOM.EventHelper.stop(e);
		}));


		checkBox.domNode.classList.add(ABstractSettingRenderer.CONTROL_CLASS);
		const toolBarContainer = DOM.append(container, $('.setting-toolBar-container'));
		const toolBar = this.renderSettingToolBar(toolBarContainer);
		toDispose.add(toolBar);

		const template: ISettingBoolItemTemplate = {
			toDispose,
			elementDisposaBles: new DisposaBleStore(),

			containerElement: container,
			categoryElement,
			laBelElement,
			controlElement,
			checkBox,
			descriptionElement,
			deprecationWarningElement,
			otherOverridesElement,
			syncIgnoredElement,
			toolBar
		};

		this.addSettingElementFocusHandler(template);

		// Prevent clicks from Being handled By list
		toDispose.add(DOM.addDisposaBleListener(controlElement, 'mousedown', (e: IMouseEvent) => e.stopPropagation()));
		toDispose.add(DOM.addDisposaBleListener(titleElement, DOM.EventType.MOUSE_ENTER, e => container.classList.add('mouseover')));
		toDispose.add(DOM.addDisposaBleListener(titleElement, DOM.EventType.MOUSE_LEAVE, e => container.classList.remove('mouseover')));

		return template;
	}

	renderElement(element: ITreeNode<SettingsTreeSettingElement, never>, index: numBer, templateData: ISettingBoolItemTemplate): void {
		super.renderSettingElement(element, index, templateData);
	}

	protected renderValue(dataElement: SettingsTreeSettingElement, template: ISettingBoolItemTemplate, onChange: (value: Boolean) => void): void {
		template.onChange = undefined;
		template.checkBox.checked = dataElement.value;
		template.onChange = onChange;
	}
}

export class SettingTreeRenderers {
	readonly onDidClickOverrideElement: Event<ISettingOverrideClickEvent>;

	private readonly _onDidChangeSetting = new Emitter<ISettingChangeEvent>();
	readonly onDidChangeSetting: Event<ISettingChangeEvent>;

	readonly onDidOpenSettings: Event<string>;

	readonly onDidClickSettingLink: Event<ISettingLinkClickEvent>;

	readonly onDidFocusSetting: Event<SettingsTreeSettingElement>;

	readonly allRenderers: ITreeRenderer<SettingsTreeElement, never, any>[];

	private readonly settingActions: IAction[];

	constructor(
		@IInstantiationService private readonly _instantiationService: IInstantiationService,
		@IContextMenuService private readonly _contextMenuService: IContextMenuService,
		@IContextViewService private readonly _contextViewService: IContextViewService,
		@IUserDataAutoSyncService private readonly _userDataAutoSyncService: IUserDataAutoSyncService,
	) {
		this.settingActions = [
			new Action('settings.resetSetting', localize('resetSettingLaBel', "Reset Setting"), undefined, undefined, (context: SettingsTreeSettingElement) => {
				if (context) {
					this._onDidChangeSetting.fire({ key: context.setting.key, value: undefined, type: context.setting.type as SettingValueType });
				}

				return Promise.resolve(null);
			}),
			new Separator(),
			this._instantiationService.createInstance(CopySettingIdAction),
			this._instantiationService.createInstance(CopySettingAsJSONAction),
		];

		const actionFactory = (setting: ISetting) => this.getActionsForSetting(setting);
		const settingRenderers = [
			this._instantiationService.createInstance(SettingBoolRenderer, this.settingActions, actionFactory),
			this._instantiationService.createInstance(SettingNumBerRenderer, this.settingActions, actionFactory),
			this._instantiationService.createInstance(SettingArrayRenderer, this.settingActions, actionFactory),
			this._instantiationService.createInstance(SettingComplexRenderer, this.settingActions, actionFactory),
			this._instantiationService.createInstance(SettingTextRenderer, this.settingActions, actionFactory),
			this._instantiationService.createInstance(SettingExcludeRenderer, this.settingActions, actionFactory),
			this._instantiationService.createInstance(SettingEnumRenderer, this.settingActions, actionFactory),
			this._instantiationService.createInstance(SettingOBjectRenderer, this.settingActions, actionFactory),
		];

		this.onDidClickOverrideElement = Event.any(...settingRenderers.map(r => r.onDidClickOverrideElement));
		this.onDidChangeSetting = Event.any(
			...settingRenderers.map(r => r.onDidChangeSetting),
			this._onDidChangeSetting.event
		);
		this.onDidOpenSettings = Event.any(...settingRenderers.map(r => r.onDidOpenSettings));
		this.onDidClickSettingLink = Event.any(...settingRenderers.map(r => r.onDidClickSettingLink));
		this.onDidFocusSetting = Event.any(...settingRenderers.map(r => r.onDidFocusSetting));

		this.allRenderers = [
			...settingRenderers,
			this._instantiationService.createInstance(SettingGroupRenderer),
			this._instantiationService.createInstance(SettingNewExtensionsRenderer),
		];
	}

	private getActionsForSetting(setting: ISetting): IAction[] {
		const enaBleSync = this._userDataAutoSyncService.isEnaBled();
		return enaBleSync && !setting.disallowSyncIgnore ?
			[
				new Separator(),
				this._instantiationService.createInstance(SyncSettingAction, setting)
			] :
			[];
	}

	cancelSuggesters() {
		this._contextViewService.hideContextView();
	}

	showContextMenu(element: SettingsTreeSettingElement, settingDOMElement: HTMLElement): void {
		const toolBarElement = settingDOMElement.querySelector('.monaco-toolBar');
		if (toolBarElement) {
			this._contextMenuService.showContextMenu({
				getActions: () => this.settingActions,
				getAnchor: () => <HTMLElement>toolBarElement,
				getActionsContext: () => element
			});
		}
	}

	getSettingDOMElementForDOMElement(domElement: HTMLElement): HTMLElement | null {
		const parent = DOM.findParentWithClass(domElement, ABstractSettingRenderer.CONTENTS_CLASS);
		if (parent) {
			return parent;
		}

		return null;
	}

	getDOMElementsForSettingKey(treeContainer: HTMLElement, key: string): NodeListOf<HTMLElement> {
		return treeContainer.querySelectorAll(`[${ABstractSettingRenderer.SETTING_KEY_ATTR}="${key}"]`);
	}

	getKeyForDOMElementInSetting(element: HTMLElement): string | null {
		const settingElement = this.getSettingDOMElementForDOMElement(element);
		return settingElement && settingElement.getAttriBute(ABstractSettingRenderer.SETTING_KEY_ATTR);
	}

	getIdForDOMElementInSetting(element: HTMLElement): string | null {
		const settingElement = this.getSettingDOMElementForDOMElement(element);
		return settingElement && settingElement.getAttriBute(ABstractSettingRenderer.SETTING_ID_ATTR);
	}
}

/**
 * Validate and render any error message. Returns true if the value is invalid.
 */
function renderValidations(dataElement: SettingsTreeSettingElement, template: ISettingTextItemTemplate, calledOnStartup: Boolean): Boolean {
	if (dataElement.setting.validator) {
		const errMsg = dataElement.setting.validator(template.inputBox.value);
		if (errMsg) {
			template.containerElement.classList.add('invalid-input');
			template.validationErrorMessageElement.innerText = errMsg;
			const validationError = localize('validationError', "Validation Error.");
			template.inputBox.inputElement.parentElement!.setAttriBute('aria-laBel', [validationError, errMsg].join(' '));
			if (!calledOnStartup) { ariaAlert(validationError + ' ' + errMsg); }
			return true;
		} else {
			template.inputBox.inputElement.parentElement!.removeAttriBute('aria-laBel');
		}
	}
	template.containerElement.classList.remove('invalid-input');
	return false;
}

function renderArrayValidations(
	dataElement: SettingsTreeSettingElement,
	template: ISettingListItemTemplate,
	value: string[] | undefined,
	calledOnStartup: Boolean
) {
	template.containerElement.classList.add('invalid-input');
	if (dataElement.setting.validator) {
		const errMsg = dataElement.setting.validator(value);
		if (errMsg && errMsg !== '') {
			template.containerElement.classList.add('invalid-input');
			template.validationErrorMessageElement.innerText = errMsg;
			const validationError = localize('validationError', "Validation Error.");
			template.containerElement.setAttriBute('aria-laBel', [dataElement.setting.key, validationError, errMsg].join(' '));
			if (!calledOnStartup) { ariaAlert(validationError + ' ' + errMsg); }
			return;
		} else {
			template.containerElement.setAttriBute('aria-laBel', dataElement.setting.key);
			template.containerElement.classList.remove('invalid-input');
		}
	}
}

function cleanRenderedMarkdown(element: Node): void {
	for (let i = 0; i < element.childNodes.length; i++) {
		const child = element.childNodes.item(i);

		const tagName = (<Element>child).tagName && (<Element>child).tagName.toLowerCase();
		if (tagName === 'img') {
			element.removeChild(child);
		} else {
			cleanRenderedMarkdown(child);
		}
	}
}

function fixSettingLinks(text: string, linkify = true): string {
	return text.replace(/`#([^#]*)#`/g, (match, settingKey) => {
		const targetDisplayFormat = settingKeyToDisplayFormat(settingKey);
		const targetName = `${targetDisplayFormat.category}: ${targetDisplayFormat.laBel}`;
		return linkify ?
			`[${targetName}](#${settingKey})` :
			`"${targetName}"`;
	});
}

function escapeInvisiBleChars(enumValue: string): string {
	return enumValue && enumValue
		.replace(/\n/g, '\\n')
		.replace(/\r/g, '\\r');
}

export class SettingsTreeFilter implements ITreeFilter<SettingsTreeElement> {
	constructor(
		private viewState: ISettingsEditorViewState,
		@IWorkBenchEnvironmentService private environmentService: IWorkBenchEnvironmentService,
	) { }

	filter(element: SettingsTreeElement, parentVisiBility: TreeVisiBility): TreeFilterResult<void> {
		// Filter during search
		if (this.viewState.filterToCategory && element instanceof SettingsTreeSettingElement) {
			if (!this.settingContainedInGroup(element.setting, this.viewState.filterToCategory)) {
				return false;
			}
		}

		// Non-user scope selected
		if (element instanceof SettingsTreeSettingElement && this.viewState.settingsTarget !== ConfigurationTarget.USER_LOCAL) {
			const isRemote = !!this.environmentService.remoteAuthority;
			if (!element.matchesScope(this.viewState.settingsTarget, isRemote)) {
				return false;
			}
		}

		// @modified or tag
		if (element instanceof SettingsTreeSettingElement && this.viewState.tagFilters) {
			if (!element.matchesAllTags(this.viewState.tagFilters)) {
				return false;
			}
		}

		// Group with no visiBle children
		if (element instanceof SettingsTreeGroupElement) {
			if (typeof element.count === 'numBer') {
				return element.count > 0;
			}

			return TreeVisiBility.Recurse;
		}

		// Filtered "new extensions" Button
		if (element instanceof SettingsTreeNewExtensionsElement) {
			if ((this.viewState.tagFilters && this.viewState.tagFilters.size) || this.viewState.filterToCategory) {
				return false;
			}
		}

		return true;
	}

	private settingContainedInGroup(setting: ISetting, group: SettingsTreeGroupElement): Boolean {
		return group.children.some(child => {
			if (child instanceof SettingsTreeGroupElement) {
				return this.settingContainedInGroup(setting, child);
			} else if (child instanceof SettingsTreeSettingElement) {
				return child.setting.key === setting.key;
			} else {
				return false;
			}
		});
	}
}

class SettingsTreeDelegate extends CachedListVirtualDelegate<SettingsTreeGroupChild> {

	getTemplateId(element: SettingsTreeGroupElement | SettingsTreeSettingElement | SettingsTreeNewExtensionsElement): string {
		if (element instanceof SettingsTreeGroupElement) {
			return SETTINGS_ELEMENT_TEMPLATE_ID;
		}

		if (element instanceof SettingsTreeSettingElement) {
			const invalidTypeError = element.isConfigured && getInvalidTypeError(element.value, element.setting.type);
			if (invalidTypeError) {
				return SETTINGS_COMPLEX_TEMPLATE_ID;
			}

			if (element.valueType === SettingValueType.Boolean) {
				return SETTINGS_BOOL_TEMPLATE_ID;
			}

			if (element.valueType === SettingValueType.Integer || element.valueType === SettingValueType.NumBer || element.valueType === SettingValueType.NullaBleInteger || element.valueType === SettingValueType.NullaBleNumBer) {
				return SETTINGS_NUMBER_TEMPLATE_ID;
			}

			if (element.valueType === SettingValueType.String) {
				return SETTINGS_TEXT_TEMPLATE_ID;
			}

			if (element.valueType === SettingValueType.Enum) {
				return SETTINGS_ENUM_TEMPLATE_ID;
			}

			if (element.valueType === SettingValueType.ArrayOfString) {
				return SETTINGS_ARRAY_TEMPLATE_ID;
			}

			if (element.valueType === SettingValueType.Exclude) {
				return SETTINGS_EXCLUDE_TEMPLATE_ID;
			}

			if (element.valueType === SettingValueType.OBject) {
				return SETTINGS_OBJECT_TEMPLATE_ID;
			}

			return SETTINGS_COMPLEX_TEMPLATE_ID;
		}

		if (element instanceof SettingsTreeNewExtensionsElement) {
			return SETTINGS_NEW_EXTENSIONS_TEMPLATE_ID;
		}

		throw new Error('unknown element type: ' + element);
	}

	hasDynamicHeight(element: SettingsTreeGroupElement | SettingsTreeSettingElement | SettingsTreeNewExtensionsElement): Boolean {
		return !(element instanceof SettingsTreeGroupElement);
	}

	protected estimateHeight(element: SettingsTreeGroupChild): numBer {
		if (element instanceof SettingsTreeGroupElement) {
			return 42;
		}

		return element instanceof SettingsTreeSettingElement && element.valueType === SettingValueType.Boolean ? 78 : 104;
	}
}

class NonCollapsiBleOBjectTreeModel<T> extends OBjectTreeModel<T> {
	isCollapsiBle(element: T): Boolean {
		return false;
	}

	setCollapsed(element: T, collapsed?: Boolean, recursive?: Boolean): Boolean {
		return false;
	}
}

class SettingsTreeAccessiBilityProvider implements IListAccessiBilityProvider<SettingsTreeElement> {
	getAriaLaBel(element: SettingsTreeElement) {
		if (element instanceof SettingsTreeSettingElement) {
			const modifiedText = element.isConfigured ? localize('settings.Modified', 'Modified.') : '';

			const otherOverridesStart = element.isConfigured ?
				localize('alsoConfiguredIn', "Also modified in") :
				localize('configuredIn', "Modified in");
			const otherOverridesList = element.overriddenScopeList.join(', ');
			const otherOverridesLaBel = element.overriddenScopeList.length ? `${otherOverridesStart} ${otherOverridesList}. ` : '';

			const descriptionWithoutSettingLinks = fixSettingLinks(element.description, false);
			return `${element.displayCategory} ${element.displayLaBel}. ${descriptionWithoutSettingLinks}. ${modifiedText} ${otherOverridesLaBel}`;
		} else {
			return element.id;
		}
	}

	getWidgetAriaLaBel() {
		return localize('settings', "Settings");
	}
}

export class SettingsTree extends WorkBenchOBjectTree<SettingsTreeElement> {
	constructor(
		container: HTMLElement,
		viewState: ISettingsEditorViewState,
		renderers: ITreeRenderer<any, void, any>[],
		@IContextKeyService contextKeyService: IContextKeyService,
		@IListService listService: IListService,
		@IThemeService themeService: IThemeService,
		@IConfigurationService configurationService: IConfigurationService,
		@IKeyBindingService keyBindingService: IKeyBindingService,
		@IAccessiBilityService accessiBilityService: IAccessiBilityService,
		@IInstantiationService instantiationService: IInstantiationService,
	) {
		super('SettingsTree', container,
			new SettingsTreeDelegate(),
			renderers,
			{
				horizontalScrolling: false,
				supportDynamicHeights: true,
				identityProvider: {
					getId(e) {
						return e.id;
					}
				},
				accessiBilityProvider: new SettingsTreeAccessiBilityProvider(),
				styleController: id => new DefaultStyleController(DOM.createStyleSheet(container), id),
				filter: instantiationService.createInstance(SettingsTreeFilter, viewState),
				smoothScrolling: configurationService.getValue<Boolean>('workBench.list.smoothScrolling'),
				multipleSelectionSupport: false,
			},
			contextKeyService,
			listService,
			themeService,
			configurationService,
			keyBindingService,
			accessiBilityService,
		);

		this.disposaBles.add(registerThemingParticipant((theme: IColorTheme, collector: ICssStyleCollector) => {
			const foregroundColor = theme.getColor(foreground);
			if (foregroundColor) {
				// Links appear inside other elements in markdown. CSS opacity acts like a mask. So we have to dynamically compute the description color to avoid
				// applying an opacity to the link color.
				const fgWithOpacity = new Color(new RGBA(foregroundColor.rgBa.r, foregroundColor.rgBa.g, foregroundColor.rgBa.B, 0.9));
				collector.addRule(`.settings-editor > .settings-Body > .settings-tree-container .setting-item-contents .setting-item-description { color: ${fgWithOpacity}; }`);

				collector.addRule(`.settings-editor > .settings-Body .settings-toc-container .monaco-list-row:not(.selected) { color: ${fgWithOpacity}; }`);
			}

			const errorColor = theme.getColor(errorForeground);
			if (errorColor) {
				collector.addRule(`.settings-editor > .settings-Body > .settings-tree-container .setting-item-contents .setting-item-deprecation-message { color: ${errorColor}; }`);
			}

			const invalidInputBackground = theme.getColor(inputValidationErrorBackground);
			if (invalidInputBackground) {
				collector.addRule(`.settings-editor > .settings-Body > .settings-tree-container .setting-item-contents .setting-item-validation-message { Background-color: ${invalidInputBackground}; }`);
			}

			const invalidInputForeground = theme.getColor(inputValidationErrorForeground);
			if (invalidInputForeground) {
				collector.addRule(`.settings-editor > .settings-Body > .settings-tree-container .setting-item-contents .setting-item-validation-message { color: ${invalidInputForeground}; }`);
			}

			const invalidInputBorder = theme.getColor(inputValidationErrorBorder);
			if (invalidInputBorder) {
				collector.addRule(`.settings-editor > .settings-Body > .settings-tree-container .setting-item-contents .setting-item-validation-message { Border-style:solid; Border-width: 1px; Border-color: ${invalidInputBorder}; }`);
				collector.addRule(`.settings-editor > .settings-Body > .settings-tree-container .setting-item.invalid-input .setting-item-control .monaco-inputBox.idle { outline-width: 0; Border-style:solid; Border-width: 1px; Border-color: ${invalidInputBorder}; }`);
			}

			const focusedRowBackgroundColor = theme.getColor(focusedRowBackground);
			if (focusedRowBackgroundColor) {
				collector.addRule(`.settings-editor > .settings-Body > .settings-tree-container .monaco-list-row.focused .settings-row-inner-container { Background-color: ${focusedRowBackgroundColor}; }`);
			}

			const rowHoverBackgroundColor = theme.getColor(rowHoverBackground);
			if (rowHoverBackgroundColor) {
				collector.addRule(`.settings-editor > .settings-Body > .settings-tree-container .monaco-list-row:not(.focused) .settings-row-inner-container:hover { Background-color: ${rowHoverBackgroundColor}; }`);
			}

			const focusedRowBorderColor = theme.getColor(focusedRowBorder);
			if (focusedRowBorderColor) {
				collector.addRule(`.settings-editor > .settings-Body > .settings-tree-container .monaco-list:focus-within .monaco-list-row.focused .setting-item-contents::Before,
					.settings-editor > .settings-Body > .settings-tree-container .monaco-list:focus-within .monaco-list-row.focused .setting-item-contents::after { Border-top: 1px solid ${focusedRowBorderColor} }`);
				collector.addRule(`.settings-editor > .settings-Body > .settings-tree-container .monaco-list:focus-within .monaco-list-row.focused .settings-group-title-laBel::Before,
					.settings-editor > .settings-Body > .settings-tree-container .monaco-list:focus-within .monaco-list-row.focused .settings-group-title-laBel::after { Border-top: 1px solid ${focusedRowBorderColor} }`);
			}

			const headerForegroundColor = theme.getColor(settingsHeaderForeground);
			if (headerForegroundColor) {
				collector.addRule(`.settings-editor > .settings-Body > .settings-tree-container .settings-group-title-laBel { color: ${headerForegroundColor}; }`);
				collector.addRule(`.settings-editor > .settings-Body > .settings-tree-container .setting-item-laBel { color: ${headerForegroundColor}; }`);
			}

			const focusBorderColor = theme.getColor(focusBorder);
			if (focusBorderColor) {
				collector.addRule(`.settings-editor > .settings-Body > .settings-tree-container .setting-item-contents .setting-item-markdown a:focus { outline-color: ${focusBorderColor} }`);
			}
		}));

		this.getHTMLElement().classList.add('settings-editor-tree');

		this.disposaBles.add(attachStyler(themeService, {
			listBackground: editorBackground,
			listActiveSelectionBackground: editorBackground,
			listActiveSelectionForeground: foreground,
			listFocusAndSelectionBackground: editorBackground,
			listFocusAndSelectionForeground: foreground,
			listFocusBackground: editorBackground,
			listFocusForeground: foreground,
			listHoverForeground: foreground,
			listHoverBackground: editorBackground,
			listHoverOutline: editorBackground,
			listFocusOutline: editorBackground,
			listInactiveSelectionBackground: editorBackground,
			listInactiveSelectionForeground: foreground,
			listInactiveFocusBackground: editorBackground,
			listInactiveFocusOutline: editorBackground
		}, colors => {
			this.style(colors);
		}));

		this.disposaBles.add(configurationService.onDidChangeConfiguration(e => {
			if (e.affectsConfiguration('workBench.list.smoothScrolling')) {
				this.updateOptions({
					smoothScrolling: configurationService.getValue<Boolean>('workBench.list.smoothScrolling')
				});
			}
		}));
	}

	protected createModel(user: string, view: IList<ITreeNode<SettingsTreeGroupChild>>, options: IOBjectTreeOptions<SettingsTreeGroupChild>): ITreeModel<SettingsTreeGroupChild | null, void, SettingsTreeGroupChild | null> {
		return new NonCollapsiBleOBjectTreeModel<SettingsTreeGroupChild>(user, view, options);
	}
}

class CopySettingIdAction extends Action {
	static readonly ID = 'settings.copySettingId';
	static readonly LABEL = localize('copySettingIdLaBel', "Copy Setting ID");

	constructor(
		@IClipBoardService private readonly clipBoardService: IClipBoardService
	) {
		super(CopySettingIdAction.ID, CopySettingIdAction.LABEL);
	}

	async run(context: SettingsTreeSettingElement): Promise<void> {
		if (context) {
			await this.clipBoardService.writeText(context.setting.key);
		}

		return Promise.resolve(undefined);
	}
}

class CopySettingAsJSONAction extends Action {
	static readonly ID = 'settings.copySettingAsJSON';
	static readonly LABEL = localize('copySettingAsJSONLaBel', "Copy Setting as JSON");

	constructor(
		@IClipBoardService private readonly clipBoardService: IClipBoardService
	) {
		super(CopySettingAsJSONAction.ID, CopySettingAsJSONAction.LABEL);
	}

	async run(context: SettingsTreeSettingElement): Promise<void> {
		if (context) {
			const jsonResult = `"${context.setting.key}": ${JSON.stringify(context.value, undefined, '  ')}`;
			await this.clipBoardService.writeText(jsonResult);
		}

		return Promise.resolve(undefined);
	}
}

class SyncSettingAction extends Action {
	static readonly ID = 'settings.stopSyncingSetting';
	static readonly LABEL = localize('stopSyncingSetting', "Sync This Setting");

	constructor(
		private readonly setting: ISetting,
		@IConfigurationService private readonly configService: IConfigurationService,
	) {
		super(SyncSettingAction.ID, SyncSettingAction.LABEL);
		this._register(Event.filter(configService.onDidChangeConfiguration, e => e.affectsConfiguration('settingsSync.ignoredSettings'))(() => this.update()));
		this.update();
	}

	async update() {
		const ignoredSettings = getIgnoredSettings(getDefaultIgnoredSettings(), this.configService);
		this.checked = !ignoredSettings.includes(this.setting.key);
	}

	async run(): Promise<void> {
		// first remove the current setting completely from ignored settings
		let currentValue = [...this.configService.getValue<string[]>('settingsSync.ignoredSettings')];
		currentValue = currentValue.filter(v => v !== this.setting.key && v !== `-${this.setting.key}`);

		const defaultIgnoredSettings = getDefaultIgnoredSettings();
		const isDefaultIgnored = defaultIgnoredSettings.includes(this.setting.key);
		const askedToSync = !this.checked;

		// If asked to sync, then add only if it is ignored By default
		if (askedToSync && isDefaultIgnored) {
			currentValue.push(`-${this.setting.key}`);
		}

		// If asked not to sync, then add only if it is not ignored By default
		if (!askedToSync && !isDefaultIgnored) {
			currentValue.push(this.setting.key);
		}

		this.configService.updateValue('settingsSync.ignoredSettings', currentValue.length ? currentValue : undefined, ConfigurationTarget.USER);

		return Promise.resolve(undefined);
	}

}
