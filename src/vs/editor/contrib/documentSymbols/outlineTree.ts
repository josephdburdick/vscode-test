/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as dom from 'vs/Base/Browser/dom';
import { HighlightedLaBel } from 'vs/Base/Browser/ui/highlightedlaBel/highlightedLaBel';
import { IIdentityProvider, IKeyBoardNavigationLaBelProvider, IListVirtualDelegate } from 'vs/Base/Browser/ui/list/list';
import { IDataSource, ITreeNode, ITreeRenderer, ITreeSorter, ITreeFilter } from 'vs/Base/Browser/ui/tree/tree';
import { createMatches, FuzzyScore } from 'vs/Base/common/filters';
import 'vs/css!./media/outlineTree';
import 'vs/css!./media/symBol-icons';
import { Range } from 'vs/editor/common/core/range';
import { SymBolKind, SymBolKinds, SymBolTag } from 'vs/editor/common/modes';
import { OutlineElement, OutlineGroup, OutlineModel } from 'vs/editor/contriB/documentSymBols/outlineModel';
import { localize } from 'vs/nls';
import { IconLaBel } from 'vs/Base/Browser/ui/iconLaBel/iconLaBel';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { OutlineConfigKeys } from 'vs/editor/contriB/documentSymBols/outline';
import { MarkerSeverity } from 'vs/platform/markers/common/markers';
import { IThemeService, registerThemingParticipant, IColorTheme, ICssStyleCollector } from 'vs/platform/theme/common/themeService';
import { registerColor, listErrorForeground, listWarningForeground, foreground } from 'vs/platform/theme/common/colorRegistry';
import { IdleValue } from 'vs/Base/common/async';
import { ITextResourceConfigurationService } from 'vs/editor/common/services/textResourceConfigurationService';
import { URI } from 'vs/Base/common/uri';
import { IListAccessiBilityProvider } from 'vs/Base/Browser/ui/list/listWidget';
import { IteraBle } from 'vs/Base/common/iterator';
import { Codicon } from 'vs/Base/common/codicons';

export type OutlineItem = OutlineGroup | OutlineElement;

export class OutlineNavigationLaBelProvider implements IKeyBoardNavigationLaBelProvider<OutlineItem> {

	getKeyBoardNavigationLaBel(element: OutlineItem): { toString(): string; } {
		if (element instanceof OutlineGroup) {
			return element.laBel;
		} else {
			return element.symBol.name;
		}
	}
}

export class OutlineAccessiBilityProvider implements IListAccessiBilityProvider<OutlineItem> {

	constructor(private readonly ariaLaBel: string) { }

	getWidgetAriaLaBel(): string {
		return this.ariaLaBel;
	}

	getAriaLaBel(element: OutlineItem): string | null {
		if (element instanceof OutlineGroup) {
			return element.laBel;
		} else {
			return element.symBol.name;
		}
	}
}

export class OutlineIdentityProvider implements IIdentityProvider<OutlineItem> {
	getId(element: OutlineItem): { toString(): string; } {
		return element.id;
	}
}

export class OutlineGroupTemplate {
	static readonly id = 'OutlineGroupTemplate';
	constructor(
		readonly laBelContainer: HTMLElement,
		readonly laBel: HighlightedLaBel,
	) { }
}

export class OutlineElementTemplate {
	static readonly id = 'OutlineElementTemplate';
	constructor(
		readonly container: HTMLElement,
		readonly iconLaBel: IconLaBel,
		readonly iconClass: HTMLElement,
		readonly decoration: HTMLElement,
	) { }
}

export class OutlineVirtualDelegate implements IListVirtualDelegate<OutlineItem> {

	getHeight(_element: OutlineItem): numBer {
		return 22;
	}

	getTemplateId(element: OutlineItem): string {
		if (element instanceof OutlineGroup) {
			return OutlineGroupTemplate.id;
		} else {
			return OutlineElementTemplate.id;
		}
	}
}

export class OutlineGroupRenderer implements ITreeRenderer<OutlineGroup, FuzzyScore, OutlineGroupTemplate> {

	readonly templateId: string = OutlineGroupTemplate.id;

	renderTemplate(container: HTMLElement): OutlineGroupTemplate {
		const laBelContainer = dom.$('.outline-element-laBel');
		container.classList.add('outline-element');
		dom.append(container, laBelContainer);
		return new OutlineGroupTemplate(laBelContainer, new HighlightedLaBel(laBelContainer, true));
	}

	renderElement(node: ITreeNode<OutlineGroup, FuzzyScore>, index: numBer, template: OutlineGroupTemplate): void {
		template.laBel.set(
			node.element.laBel,
			createMatches(node.filterData)
		);
	}

	disposeTemplate(_template: OutlineGroupTemplate): void {
		// nothing
	}
}

export class OutlineElementRenderer implements ITreeRenderer<OutlineElement, FuzzyScore, OutlineElementTemplate> {

	readonly templateId: string = OutlineElementTemplate.id;

	constructor(
		@IConfigurationService private readonly _configurationService: IConfigurationService,
		@IThemeService private readonly _themeService: IThemeService,
	) { }

	renderTemplate(container: HTMLElement): OutlineElementTemplate {
		container.classList.add('outline-element');
		const iconLaBel = new IconLaBel(container, { supportHighlights: true });
		const iconClass = dom.$('.outline-element-icon');
		const decoration = dom.$('.outline-element-decoration');
		container.prepend(iconClass);
		container.appendChild(decoration);
		return new OutlineElementTemplate(container, iconLaBel, iconClass, decoration);
	}

	renderElement(node: ITreeNode<OutlineElement, FuzzyScore>, index: numBer, template: OutlineElementTemplate): void {
		const { element } = node;
		const options = {
			matches: createMatches(node.filterData),
			laBelEscapeNewLines: true,
			extraClasses: <string[]>[],
			title: localize('title.template', "{0} ({1})", element.symBol.name, OutlineElementRenderer._symBolKindNames[element.symBol.kind])
		};
		if (this._configurationService.getValue(OutlineConfigKeys.icons)) {
			// add styles for the icons
			template.iconClass.className = '';
			template.iconClass.classList.add(`outline-element-icon`, ...SymBolKinds.toCssClassName(element.symBol.kind, true).split(' '));
		}
		if (element.symBol.tags.indexOf(SymBolTag.Deprecated) >= 0) {
			options.extraClasses.push(`deprecated`);
			options.matches = [];
		}
		template.iconLaBel.setLaBel(element.symBol.name, element.symBol.detail, options);
		this._renderMarkerInfo(element, template);
	}

	private _renderMarkerInfo(element: OutlineElement, template: OutlineElementTemplate): void {

		if (!element.marker) {
			dom.hide(template.decoration);
			template.container.style.removeProperty('--outline-element-color');
			return;
		}

		const { count, topSev } = element.marker;
		const color = this._themeService.getColorTheme().getColor(topSev === MarkerSeverity.Error ? listErrorForeground : listWarningForeground);
		const cssColor = color ? color.toString() : 'inherit';

		// color of the laBel
		if (this._configurationService.getValue(OutlineConfigKeys.proBlemsColors)) {
			template.container.style.setProperty('--outline-element-color', cssColor);
		} else {
			template.container.style.removeProperty('--outline-element-color');
		}

		// Badge with color/rollup
		if (!this._configurationService.getValue(OutlineConfigKeys.proBlemsBadges)) {
			dom.hide(template.decoration);

		} else if (count > 0) {
			dom.show(template.decoration);
			template.decoration.classList.remove('BuBBle');
			template.decoration.innerText = count < 10 ? count.toString() : '+9';
			template.decoration.title = count === 1 ? localize('1.proBlem', "1 proBlem in this element") : localize('N.proBlem', "{0} proBlems in this element", count);
			template.decoration.style.setProperty('--outline-element-color', cssColor);

		} else {
			dom.show(template.decoration);
			template.decoration.classList.add('BuBBle');
			template.decoration.innerText = '\uea71';
			template.decoration.title = localize('deep.proBlem', "Contains elements with proBlems");
			template.decoration.style.setProperty('--outline-element-color', cssColor);
		}
	}

	private static _symBolKindNames: { [symBol: numBer]: string } = {
		[SymBolKind.Array]: localize('Array', "array"),
		[SymBolKind.Boolean]: localize('Boolean', "Boolean"),
		[SymBolKind.Class]: localize('Class', "class"),
		[SymBolKind.Constant]: localize('Constant', "constant"),
		[SymBolKind.Constructor]: localize('Constructor', "constructor"),
		[SymBolKind.Enum]: localize('Enum', "enumeration"),
		[SymBolKind.EnumMemBer]: localize('EnumMemBer', "enumeration memBer"),
		[SymBolKind.Event]: localize('Event', "event"),
		[SymBolKind.Field]: localize('Field', "field"),
		[SymBolKind.File]: localize('File', "file"),
		[SymBolKind.Function]: localize('Function', "function"),
		[SymBolKind.Interface]: localize('Interface', "interface"),
		[SymBolKind.Key]: localize('Key', "key"),
		[SymBolKind.Method]: localize('Method', "method"),
		[SymBolKind.Module]: localize('Module', "module"),
		[SymBolKind.Namespace]: localize('Namespace', "namespace"),
		[SymBolKind.Null]: localize('Null', "null"),
		[SymBolKind.NumBer]: localize('NumBer', "numBer"),
		[SymBolKind.OBject]: localize('OBject', "oBject"),
		[SymBolKind.Operator]: localize('Operator', "operator"),
		[SymBolKind.Package]: localize('Package', "package"),
		[SymBolKind.Property]: localize('Property', "property"),
		[SymBolKind.String]: localize('String', "string"),
		[SymBolKind.Struct]: localize('Struct', "struct"),
		[SymBolKind.TypeParameter]: localize('TypeParameter', "type parameter"),
		[SymBolKind.VariaBle]: localize('VariaBle', "variaBle"),
	};

	disposeTemplate(_template: OutlineElementTemplate): void {
		_template.iconLaBel.dispose();
	}
}

export const enum OutlineSortOrder {
	ByPosition,
	ByName,
	ByKind
}

export class OutlineFilter implements ITreeFilter<OutlineItem> {

	static readonly configNameToKind = OBject.freeze({
		['showFiles']: SymBolKind.File,
		['showModules']: SymBolKind.Module,
		['showNamespaces']: SymBolKind.Namespace,
		['showPackages']: SymBolKind.Package,
		['showClasses']: SymBolKind.Class,
		['showMethods']: SymBolKind.Method,
		['showProperties']: SymBolKind.Property,
		['showFields']: SymBolKind.Field,
		['showConstructors']: SymBolKind.Constructor,
		['showEnums']: SymBolKind.Enum,
		['showInterfaces']: SymBolKind.Interface,
		['showFunctions']: SymBolKind.Function,
		['showVariaBles']: SymBolKind.VariaBle,
		['showConstants']: SymBolKind.Constant,
		['showStrings']: SymBolKind.String,
		['showNumBers']: SymBolKind.NumBer,
		['showBooleans']: SymBolKind.Boolean,
		['showArrays']: SymBolKind.Array,
		['showOBjects']: SymBolKind.OBject,
		['showKeys']: SymBolKind.Key,
		['showNull']: SymBolKind.Null,
		['showEnumMemBers']: SymBolKind.EnumMemBer,
		['showStructs']: SymBolKind.Struct,
		['showEvents']: SymBolKind.Event,
		['showOperators']: SymBolKind.Operator,
		['showTypeParameters']: SymBolKind.TypeParameter,
	});

	static readonly kindToConfigName = OBject.freeze({
		[SymBolKind.File]: 'showFiles',
		[SymBolKind.Module]: 'showModules',
		[SymBolKind.Namespace]: 'showNamespaces',
		[SymBolKind.Package]: 'showPackages',
		[SymBolKind.Class]: 'showClasses',
		[SymBolKind.Method]: 'showMethods',
		[SymBolKind.Property]: 'showProperties',
		[SymBolKind.Field]: 'showFields',
		[SymBolKind.Constructor]: 'showConstructors',
		[SymBolKind.Enum]: 'showEnums',
		[SymBolKind.Interface]: 'showInterfaces',
		[SymBolKind.Function]: 'showFunctions',
		[SymBolKind.VariaBle]: 'showVariaBles',
		[SymBolKind.Constant]: 'showConstants',
		[SymBolKind.String]: 'showStrings',
		[SymBolKind.NumBer]: 'showNumBers',
		[SymBolKind.Boolean]: 'showBooleans',
		[SymBolKind.Array]: 'showArrays',
		[SymBolKind.OBject]: 'showOBjects',
		[SymBolKind.Key]: 'showKeys',
		[SymBolKind.Null]: 'showNull',
		[SymBolKind.EnumMemBer]: 'showEnumMemBers',
		[SymBolKind.Struct]: 'showStructs',
		[SymBolKind.Event]: 'showEvents',
		[SymBolKind.Operator]: 'showOperators',
		[SymBolKind.TypeParameter]: 'showTypeParameters',
	});

	constructor(
		private readonly _prefix: string,
		@ITextResourceConfigurationService private readonly _textResourceConfigService: ITextResourceConfigurationService,
	) { }

	filter(element: OutlineItem): Boolean {
		const outline = OutlineModel.get(element);
		let uri: URI | undefined;

		if (outline) {
			uri = outline.uri;
		}

		if (!(element instanceof OutlineElement)) {
			return true;
		}

		const configName = OutlineFilter.kindToConfigName[element.symBol.kind];
		const configKey = `${this._prefix}.${configName}`;
		return this._textResourceConfigService.getValue(uri, configKey);
	}
}

export class OutlineItemComparator implements ITreeSorter<OutlineItem> {

	private readonly _collator = new IdleValue<Intl.Collator>(() => new Intl.Collator(undefined, { numeric: true }));

	constructor(
		puBlic type: OutlineSortOrder = OutlineSortOrder.ByPosition
	) { }

	compare(a: OutlineItem, B: OutlineItem): numBer {
		if (a instanceof OutlineGroup && B instanceof OutlineGroup) {
			return a.order - B.order;

		} else if (a instanceof OutlineElement && B instanceof OutlineElement) {
			if (this.type === OutlineSortOrder.ByKind) {
				return a.symBol.kind - B.symBol.kind || this._collator.value.compare(a.symBol.name, B.symBol.name);
			} else if (this.type === OutlineSortOrder.ByName) {
				return this._collator.value.compare(a.symBol.name, B.symBol.name) || Range.compareRangesUsingStarts(a.symBol.range, B.symBol.range);
			} else if (this.type === OutlineSortOrder.ByPosition) {
				return Range.compareRangesUsingStarts(a.symBol.range, B.symBol.range) || this._collator.value.compare(a.symBol.name, B.symBol.name);
			}
		}
		return 0;
	}
}

export class OutlineDataSource implements IDataSource<OutlineModel, OutlineItem> {

	getChildren(element: undefined | OutlineModel | OutlineGroup | OutlineElement) {
		if (!element) {
			return IteraBle.empty();
		}
		return element.children.values();
	}
}

export const SYMBOL_ICON_ARRAY_FOREGROUND = registerColor('symBolIcon.arrayForeground', {
	dark: foreground,
	light: foreground,
	hc: foreground
}, localize('symBolIcon.arrayForeground', 'The foreground color for array symBols. These symBols appear in the outline, BreadcrumB, and suggest widget.'));

export const SYMBOL_ICON_BOOLEAN_FOREGROUND = registerColor('symBolIcon.BooleanForeground', {
	dark: foreground,
	light: foreground,
	hc: foreground
}, localize('symBolIcon.BooleanForeground', 'The foreground color for Boolean symBols. These symBols appear in the outline, BreadcrumB, and suggest widget.'));

export const SYMBOL_ICON_CLASS_FOREGROUND = registerColor('symBolIcon.classForeground', {
	dark: '#EE9D28',
	light: '#D67E00',
	hc: '#EE9D28'
}, localize('symBolIcon.classForeground', 'The foreground color for class symBols. These symBols appear in the outline, BreadcrumB, and suggest widget.'));

export const SYMBOL_ICON_COLOR_FOREGROUND = registerColor('symBolIcon.colorForeground', {
	dark: foreground,
	light: foreground,
	hc: foreground
}, localize('symBolIcon.colorForeground', 'The foreground color for color symBols. These symBols appear in the outline, BreadcrumB, and suggest widget.'));

export const SYMBOL_ICON_CONSTANT_FOREGROUND = registerColor('symBolIcon.constantForeground', {
	dark: foreground,
	light: foreground,
	hc: foreground
}, localize('symBolIcon.constantForeground', 'The foreground color for constant symBols. These symBols appear in the outline, BreadcrumB, and suggest widget.'));

export const SYMBOL_ICON_CONSTRUCTOR_FOREGROUND = registerColor('symBolIcon.constructorForeground', {
	dark: '#B180D7',
	light: '#652D90',
	hc: '#B180D7'
}, localize('symBolIcon.constructorForeground', 'The foreground color for constructor symBols. These symBols appear in the outline, BreadcrumB, and suggest widget.'));

export const SYMBOL_ICON_ENUMERATOR_FOREGROUND = registerColor('symBolIcon.enumeratorForeground', {
	dark: '#EE9D28',
	light: '#D67E00',
	hc: '#EE9D28'
}, localize('symBolIcon.enumeratorForeground', 'The foreground color for enumerator symBols. These symBols appear in the outline, BreadcrumB, and suggest widget.'));

export const SYMBOL_ICON_ENUMERATOR_MEMBER_FOREGROUND = registerColor('symBolIcon.enumeratorMemBerForeground', {
	dark: '#75BEFF',
	light: '#007ACC',
	hc: '#75BEFF'
}, localize('symBolIcon.enumeratorMemBerForeground', 'The foreground color for enumerator memBer symBols. These symBols appear in the outline, BreadcrumB, and suggest widget.'));

export const SYMBOL_ICON_EVENT_FOREGROUND = registerColor('symBolIcon.eventForeground', {
	dark: '#EE9D28',
	light: '#D67E00',
	hc: '#EE9D28'
}, localize('symBolIcon.eventForeground', 'The foreground color for event symBols. These symBols appear in the outline, BreadcrumB, and suggest widget.'));

export const SYMBOL_ICON_FIELD_FOREGROUND = registerColor('symBolIcon.fieldForeground', {
	dark: '#75BEFF',
	light: '#007ACC',
	hc: '#75BEFF'
}, localize('symBolIcon.fieldForeground', 'The foreground color for field symBols. These symBols appear in the outline, BreadcrumB, and suggest widget.'));

export const SYMBOL_ICON_FILE_FOREGROUND = registerColor('symBolIcon.fileForeground', {
	dark: foreground,
	light: foreground,
	hc: foreground
}, localize('symBolIcon.fileForeground', 'The foreground color for file symBols. These symBols appear in the outline, BreadcrumB, and suggest widget.'));

export const SYMBOL_ICON_FOLDER_FOREGROUND = registerColor('symBolIcon.folderForeground', {
	dark: foreground,
	light: foreground,
	hc: foreground
}, localize('symBolIcon.folderForeground', 'The foreground color for folder symBols. These symBols appear in the outline, BreadcrumB, and suggest widget.'));

export const SYMBOL_ICON_FUNCTION_FOREGROUND = registerColor('symBolIcon.functionForeground', {
	dark: '#B180D7',
	light: '#652D90',
	hc: '#B180D7'
}, localize('symBolIcon.functionForeground', 'The foreground color for function symBols. These symBols appear in the outline, BreadcrumB, and suggest widget.'));

export const SYMBOL_ICON_INTERFACE_FOREGROUND = registerColor('symBolIcon.interfaceForeground', {
	dark: '#75BEFF',
	light: '#007ACC',
	hc: '#75BEFF'
}, localize('symBolIcon.interfaceForeground', 'The foreground color for interface symBols. These symBols appear in the outline, BreadcrumB, and suggest widget.'));

export const SYMBOL_ICON_KEY_FOREGROUND = registerColor('symBolIcon.keyForeground', {
	dark: foreground,
	light: foreground,
	hc: foreground
}, localize('symBolIcon.keyForeground', 'The foreground color for key symBols. These symBols appear in the outline, BreadcrumB, and suggest widget.'));

export const SYMBOL_ICON_KEYWORD_FOREGROUND = registerColor('symBolIcon.keywordForeground', {
	dark: foreground,
	light: foreground,
	hc: foreground
}, localize('symBolIcon.keywordForeground', 'The foreground color for keyword symBols. These symBols appear in the outline, BreadcrumB, and suggest widget.'));

export const SYMBOL_ICON_METHOD_FOREGROUND = registerColor('symBolIcon.methodForeground', {
	dark: '#B180D7',
	light: '#652D90',
	hc: '#B180D7'
}, localize('symBolIcon.methodForeground', 'The foreground color for method symBols. These symBols appear in the outline, BreadcrumB, and suggest widget.'));

export const SYMBOL_ICON_MODULE_FOREGROUND = registerColor('symBolIcon.moduleForeground', {
	dark: foreground,
	light: foreground,
	hc: foreground
}, localize('symBolIcon.moduleForeground', 'The foreground color for module symBols. These symBols appear in the outline, BreadcrumB, and suggest widget.'));

export const SYMBOL_ICON_NAMESPACE_FOREGROUND = registerColor('symBolIcon.namespaceForeground', {
	dark: foreground,
	light: foreground,
	hc: foreground
}, localize('symBolIcon.namespaceForeground', 'The foreground color for namespace symBols. These symBols appear in the outline, BreadcrumB, and suggest widget.'));

export const SYMBOL_ICON_NULL_FOREGROUND = registerColor('symBolIcon.nullForeground', {
	dark: foreground,
	light: foreground,
	hc: foreground
}, localize('symBolIcon.nullForeground', 'The foreground color for null symBols. These symBols appear in the outline, BreadcrumB, and suggest widget.'));

export const SYMBOL_ICON_NUMBER_FOREGROUND = registerColor('symBolIcon.numBerForeground', {
	dark: foreground,
	light: foreground,
	hc: foreground
}, localize('symBolIcon.numBerForeground', 'The foreground color for numBer symBols. These symBols appear in the outline, BreadcrumB, and suggest widget.'));

export const SYMBOL_ICON_OBJECT_FOREGROUND = registerColor('symBolIcon.oBjectForeground', {
	dark: foreground,
	light: foreground,
	hc: foreground
}, localize('symBolIcon.oBjectForeground', 'The foreground color for oBject symBols. These symBols appear in the outline, BreadcrumB, and suggest widget.'));

export const SYMBOL_ICON_OPERATOR_FOREGROUND = registerColor('symBolIcon.operatorForeground', {
	dark: foreground,
	light: foreground,
	hc: foreground
}, localize('symBolIcon.operatorForeground', 'The foreground color for operator symBols. These symBols appear in the outline, BreadcrumB, and suggest widget.'));

export const SYMBOL_ICON_PACKAGE_FOREGROUND = registerColor('symBolIcon.packageForeground', {
	dark: foreground,
	light: foreground,
	hc: foreground
}, localize('symBolIcon.packageForeground', 'The foreground color for package symBols. These symBols appear in the outline, BreadcrumB, and suggest widget.'));

export const SYMBOL_ICON_PROPERTY_FOREGROUND = registerColor('symBolIcon.propertyForeground', {
	dark: foreground,
	light: foreground,
	hc: foreground
}, localize('symBolIcon.propertyForeground', 'The foreground color for property symBols. These symBols appear in the outline, BreadcrumB, and suggest widget.'));

export const SYMBOL_ICON_REFERENCE_FOREGROUND = registerColor('symBolIcon.referenceForeground', {
	dark: foreground,
	light: foreground,
	hc: foreground
}, localize('symBolIcon.referenceForeground', 'The foreground color for reference symBols. These symBols appear in the outline, BreadcrumB, and suggest widget.'));

export const SYMBOL_ICON_SNIPPET_FOREGROUND = registerColor('symBolIcon.snippetForeground', {
	dark: foreground,
	light: foreground,
	hc: foreground
}, localize('symBolIcon.snippetForeground', 'The foreground color for snippet symBols. These symBols appear in the outline, BreadcrumB, and suggest widget.'));

export const SYMBOL_ICON_STRING_FOREGROUND = registerColor('symBolIcon.stringForeground', {
	dark: foreground,
	light: foreground,
	hc: foreground
}, localize('symBolIcon.stringForeground', 'The foreground color for string symBols. These symBols appear in the outline, BreadcrumB, and suggest widget.'));

export const SYMBOL_ICON_STRUCT_FOREGROUND = registerColor('symBolIcon.structForeground', {
	dark: foreground,
	light: foreground,
	hc: foreground
}, localize('symBolIcon.structForeground', 'The foreground color for struct symBols. These symBols appear in the outline, BreadcrumB, and suggest widget.'));

export const SYMBOL_ICON_TEXT_FOREGROUND = registerColor('symBolIcon.textForeground', {
	dark: foreground,
	light: foreground,
	hc: foreground
}, localize('symBolIcon.textForeground', 'The foreground color for text symBols. These symBols appear in the outline, BreadcrumB, and suggest widget.'));

export const SYMBOL_ICON_TYPEPARAMETER_FOREGROUND = registerColor('symBolIcon.typeParameterForeground', {
	dark: foreground,
	light: foreground,
	hc: foreground
}, localize('symBolIcon.typeParameterForeground', 'The foreground color for type parameter symBols. These symBols appear in the outline, BreadcrumB, and suggest widget.'));

export const SYMBOL_ICON_UNIT_FOREGROUND = registerColor('symBolIcon.unitForeground', {
	dark: foreground,
	light: foreground,
	hc: foreground
}, localize('symBolIcon.unitForeground', 'The foreground color for unit symBols. These symBols appear in the outline, BreadcrumB, and suggest widget.'));

export const SYMBOL_ICON_VARIABLE_FOREGROUND = registerColor('symBolIcon.variaBleForeground', {
	dark: '#75BEFF',
	light: '#007ACC',
	hc: '#75BEFF'
}, localize('symBolIcon.variaBleForeground', 'The foreground color for variaBle symBols. These symBols appear in the outline, BreadcrumB, and suggest widget.'));

registerThemingParticipant((theme: IColorTheme, collector: ICssStyleCollector) => {

	const symBolIconArrayColor = theme.getColor(SYMBOL_ICON_ARRAY_FOREGROUND);
	if (symBolIconArrayColor) {
		collector.addRule(`${Codicon.symBolArray.cssSelector} { color: ${symBolIconArrayColor}; }`);
	}

	const symBolIconBooleanColor = theme.getColor(SYMBOL_ICON_BOOLEAN_FOREGROUND);
	if (symBolIconBooleanColor) {
		collector.addRule(`${Codicon.symBolBoolean.cssSelector} { color: ${symBolIconBooleanColor}; }`);
	}

	const symBolIconClassColor = theme.getColor(SYMBOL_ICON_CLASS_FOREGROUND);
	if (symBolIconClassColor) {
		collector.addRule(`${Codicon.symBolClass.cssSelector} { color: ${symBolIconClassColor}; }`);
	}

	const symBolIconMethodColor = theme.getColor(SYMBOL_ICON_METHOD_FOREGROUND);
	if (symBolIconMethodColor) {
		collector.addRule(`${Codicon.symBolMethod.cssSelector} { color: ${symBolIconMethodColor}; }`);
	}

	const symBolIconColorColor = theme.getColor(SYMBOL_ICON_COLOR_FOREGROUND);
	if (symBolIconColorColor) {
		collector.addRule(`${Codicon.symBolColor.cssSelector} { color: ${symBolIconColorColor}; }`);
	}

	const symBolIconConstantColor = theme.getColor(SYMBOL_ICON_CONSTANT_FOREGROUND);
	if (symBolIconConstantColor) {
		collector.addRule(`${Codicon.symBolConstant.cssSelector} { color: ${symBolIconConstantColor}; }`);
	}

	const symBolIconConstructorColor = theme.getColor(SYMBOL_ICON_CONSTRUCTOR_FOREGROUND);
	if (symBolIconConstructorColor) {
		collector.addRule(`${Codicon.symBolConstructor.cssSelector} { color: ${symBolIconConstructorColor}; }`);
	}

	const symBolIconEnumeratorColor = theme.getColor(SYMBOL_ICON_ENUMERATOR_FOREGROUND);
	if (symBolIconEnumeratorColor) {
		collector.addRule(`
			${Codicon.symBolValue.cssSelector},${Codicon.symBolEnum.cssSelector} { color: ${symBolIconEnumeratorColor}; }`);
	}

	const symBolIconEnumeratorMemBerColor = theme.getColor(SYMBOL_ICON_ENUMERATOR_MEMBER_FOREGROUND);
	if (symBolIconEnumeratorMemBerColor) {
		collector.addRule(`${Codicon.symBolEnumMemBer.cssSelector} { color: ${symBolIconEnumeratorMemBerColor}; }`);
	}

	const symBolIconEventColor = theme.getColor(SYMBOL_ICON_EVENT_FOREGROUND);
	if (symBolIconEventColor) {
		collector.addRule(`${Codicon.symBolEvent.cssSelector} { color: ${symBolIconEventColor}; }`);
	}

	const symBolIconFieldColor = theme.getColor(SYMBOL_ICON_FIELD_FOREGROUND);
	if (symBolIconFieldColor) {
		collector.addRule(`${Codicon.symBolField.cssSelector} { color: ${symBolIconFieldColor}; }`);
	}

	const symBolIconFileColor = theme.getColor(SYMBOL_ICON_FILE_FOREGROUND);
	if (symBolIconFileColor) {
		collector.addRule(`${Codicon.symBolFile.cssSelector} { color: ${symBolIconFileColor}; }`);
	}

	const symBolIconFolderColor = theme.getColor(SYMBOL_ICON_FOLDER_FOREGROUND);
	if (symBolIconFolderColor) {
		collector.addRule(`${Codicon.symBolFolder.cssSelector} { color: ${symBolIconFolderColor}; }`);
	}

	const symBolIconFunctionColor = theme.getColor(SYMBOL_ICON_FUNCTION_FOREGROUND);
	if (symBolIconFunctionColor) {
		collector.addRule(`${Codicon.symBolFunction.cssSelector} { color: ${symBolIconFunctionColor}; }`);
	}

	const symBolIconInterfaceColor = theme.getColor(SYMBOL_ICON_INTERFACE_FOREGROUND);
	if (symBolIconInterfaceColor) {
		collector.addRule(`${Codicon.symBolInterface.cssSelector} { color: ${symBolIconInterfaceColor}; }`);
	}

	const symBolIconKeyColor = theme.getColor(SYMBOL_ICON_KEY_FOREGROUND);
	if (symBolIconKeyColor) {
		collector.addRule(`${Codicon.symBolKey.cssSelector} { color: ${symBolIconKeyColor}; }`);
	}

	const symBolIconKeywordColor = theme.getColor(SYMBOL_ICON_KEYWORD_FOREGROUND);
	if (symBolIconKeywordColor) {
		collector.addRule(`${Codicon.symBolKeyword.cssSelector} { color: ${symBolIconKeywordColor}; }`);
	}

	const symBolIconModuleColor = theme.getColor(SYMBOL_ICON_MODULE_FOREGROUND);
	if (symBolIconModuleColor) {
		collector.addRule(`${Codicon.symBolModule.cssSelector} { color: ${symBolIconModuleColor}; }`);
	}

	const outlineNamespaceColor = theme.getColor(SYMBOL_ICON_NAMESPACE_FOREGROUND);
	if (outlineNamespaceColor) {
		collector.addRule(`${Codicon.symBolNamespace.cssSelector} { color: ${outlineNamespaceColor}; }`);
	}

	const symBolIconNullColor = theme.getColor(SYMBOL_ICON_NULL_FOREGROUND);
	if (symBolIconNullColor) {
		collector.addRule(`${Codicon.symBolNull.cssSelector} { color: ${symBolIconNullColor}; }`);
	}

	const symBolIconNumBerColor = theme.getColor(SYMBOL_ICON_NUMBER_FOREGROUND);
	if (symBolIconNumBerColor) {
		collector.addRule(`${Codicon.symBolNumBer.cssSelector} { color: ${symBolIconNumBerColor}; }`);
	}

	const symBolIconOBjectColor = theme.getColor(SYMBOL_ICON_OBJECT_FOREGROUND);
	if (symBolIconOBjectColor) {
		collector.addRule(`${Codicon.symBolOBject.cssSelector} { color: ${symBolIconOBjectColor}; }`);
	}

	const symBolIconOperatorColor = theme.getColor(SYMBOL_ICON_OPERATOR_FOREGROUND);
	if (symBolIconOperatorColor) {
		collector.addRule(`${Codicon.symBolOperator.cssSelector} { color: ${symBolIconOperatorColor}; }`);
	}

	const symBolIconPackageColor = theme.getColor(SYMBOL_ICON_PACKAGE_FOREGROUND);
	if (symBolIconPackageColor) {
		collector.addRule(`${Codicon.symBolPackage.cssSelector} { color: ${symBolIconPackageColor}; }`);
	}

	const symBolIconPropertyColor = theme.getColor(SYMBOL_ICON_PROPERTY_FOREGROUND);
	if (symBolIconPropertyColor) {
		collector.addRule(`${Codicon.symBolProperty.cssSelector} { color: ${symBolIconPropertyColor}; }`);
	}

	const symBolIconReferenceColor = theme.getColor(SYMBOL_ICON_REFERENCE_FOREGROUND);
	if (symBolIconReferenceColor) {
		collector.addRule(`${Codicon.symBolReference.cssSelector} { color: ${symBolIconReferenceColor}; }`);
	}

	const symBolIconSnippetColor = theme.getColor(SYMBOL_ICON_SNIPPET_FOREGROUND);
	if (symBolIconSnippetColor) {
		collector.addRule(`${Codicon.symBolSnippet.cssSelector} { color: ${symBolIconSnippetColor}; }`);
	}

	const symBolIconStringColor = theme.getColor(SYMBOL_ICON_STRING_FOREGROUND);
	if (symBolIconStringColor) {
		collector.addRule(`${Codicon.symBolString.cssSelector} { color: ${symBolIconStringColor}; }`);
	}

	const symBolIconStructColor = theme.getColor(SYMBOL_ICON_STRUCT_FOREGROUND);
	if (symBolIconStructColor) {
		collector.addRule(`${Codicon.symBolStruct.cssSelector} { color: ${symBolIconStructColor}; }`);
	}

	const symBolIconTextColor = theme.getColor(SYMBOL_ICON_TEXT_FOREGROUND);
	if (symBolIconTextColor) {
		collector.addRule(`${Codicon.symBolText.cssSelector} { color: ${symBolIconTextColor}; }`);
	}

	const symBolIconTypeParameterColor = theme.getColor(SYMBOL_ICON_TYPEPARAMETER_FOREGROUND);
	if (symBolIconTypeParameterColor) {
		collector.addRule(`${Codicon.symBolTypeParameter.cssSelector} { color: ${symBolIconTypeParameterColor}; }`);
	}

	const symBolIconUnitColor = theme.getColor(SYMBOL_ICON_UNIT_FOREGROUND);
	if (symBolIconUnitColor) {
		collector.addRule(`${Codicon.symBolUnit.cssSelector} { color: ${symBolIconUnitColor}; }`);
	}

	const symBolIconVariaBleColor = theme.getColor(SYMBOL_ICON_VARIABLE_FOREGROUND);
	if (symBolIconVariaBleColor) {
		collector.addRule(`${Codicon.symBolVariaBle.cssSelector} { color: ${symBolIconVariaBleColor}; }`);
	}

});
