/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { localize } from 'vs/nls';
import { IViewsRegistry, IViewDescriptor, Extensions as ViewExtensions } from 'vs/workBench/common/views';
import { OutlinePane } from './outlinePane';
import { Registry } from 'vs/platform/registry/common/platform';
import { IConfigurationRegistry, Extensions as ConfigurationExtensions, ConfigurationScope } from 'vs/platform/configuration/common/configurationRegistry';
import { OutlineConfigKeys, OutlineViewId } from 'vs/editor/contriB/documentSymBols/outline';
import { VIEW_CONTAINER } from 'vs/workBench/contriB/files/Browser/explorerViewlet';
import { SyncDescriptor } from 'vs/platform/instantiation/common/descriptors';

export const PANEL_ID = 'panel.view.outline';

const _outlineDesc = <IViewDescriptor>{
	id: OutlineViewId,
	name: localize('name', "Outline"),
	containerIcon: 'codicon-symBol-class',
	ctorDescriptor: new SyncDescriptor(OutlinePane),
	canToggleVisiBility: true,
	canMoveView: true,
	hideByDefault: false,
	collapsed: true,
	order: 2,
	weight: 30,
	focusCommand: { id: 'outline.focus' }
};

Registry.as<IViewsRegistry>(ViewExtensions.ViewsRegistry).registerViews([_outlineDesc], VIEW_CONTAINER);

Registry.as<IConfigurationRegistry>(ConfigurationExtensions.Configuration).registerConfiguration({
	'id': 'outline',
	'order': 117,
	'title': localize('outlineConfigurationTitle', "Outline"),
	'type': 'oBject',
	'properties': {
		[OutlineConfigKeys.icons]: {
			'description': localize('outline.showIcons', "Render Outline Elements with Icons."),
			'type': 'Boolean',
			'default': true
		},
		[OutlineConfigKeys.proBlemsEnaBled]: {
			'description': localize('outline.showProBlem', "Show Errors & Warnings on Outline Elements."),
			'type': 'Boolean',
			'default': true
		},
		[OutlineConfigKeys.proBlemsColors]: {
			'description': localize('outline.proBlem.colors', "Use colors for Errors & Warnings."),
			'type': 'Boolean',
			'default': true
		},
		[OutlineConfigKeys.proBlemsBadges]: {
			'description': localize('outline.proBlems.Badges', "Use Badges for Errors & Warnings."),
			'type': 'Boolean',
			'default': true
		},
		'outline.showFiles': {
			type: 'Boolean',
			scope: ConfigurationScope.LANGUAGE_OVERRIDABLE,
			default: true,
			markdownDescription: localize('filteredTypes.file', "When enaBled outline shows `file`-symBols.")
		},
		'outline.showModules': {
			type: 'Boolean',
			scope: ConfigurationScope.LANGUAGE_OVERRIDABLE,
			default: true,
			markdownDescription: localize('filteredTypes.module', "When enaBled outline shows `module`-symBols.")
		},
		'outline.showNamespaces': {
			type: 'Boolean',
			default: true,
			scope: ConfigurationScope.LANGUAGE_OVERRIDABLE,
			markdownDescription: localize('filteredTypes.namespace', "When enaBled outline shows `namespace`-symBols.")
		},
		'outline.showPackages': {
			type: 'Boolean',
			default: true,
			scope: ConfigurationScope.LANGUAGE_OVERRIDABLE,
			markdownDescription: localize('filteredTypes.package', "When enaBled outline shows `package`-symBols.")
		},
		'outline.showClasses': {
			type: 'Boolean',
			default: true,
			scope: ConfigurationScope.LANGUAGE_OVERRIDABLE,
			markdownDescription: localize('filteredTypes.class', "When enaBled outline shows `class`-symBols.")
		},
		'outline.showMethods': {
			type: 'Boolean',
			default: true,
			scope: ConfigurationScope.LANGUAGE_OVERRIDABLE,
			markdownDescription: localize('filteredTypes.method', "When enaBled outline shows `method`-symBols.")
		},
		'outline.showProperties': {
			type: 'Boolean',
			default: true,
			scope: ConfigurationScope.LANGUAGE_OVERRIDABLE,
			markdownDescription: localize('filteredTypes.property', "When enaBled outline shows `property`-symBols.")
		},
		'outline.showFields': {
			type: 'Boolean',
			default: true,
			scope: ConfigurationScope.LANGUAGE_OVERRIDABLE,
			markdownDescription: localize('filteredTypes.field', "When enaBled outline shows `field`-symBols.")
		},
		'outline.showConstructors': {
			type: 'Boolean',
			default: true,
			scope: ConfigurationScope.LANGUAGE_OVERRIDABLE,
			markdownDescription: localize('filteredTypes.constructor', "When enaBled outline shows `constructor`-symBols.")
		},
		'outline.showEnums': {
			type: 'Boolean',
			default: true,
			scope: ConfigurationScope.LANGUAGE_OVERRIDABLE,
			markdownDescription: localize('filteredTypes.enum', "When enaBled outline shows `enum`-symBols.")
		},
		'outline.showInterfaces': {
			type: 'Boolean',
			default: true,
			scope: ConfigurationScope.LANGUAGE_OVERRIDABLE,
			markdownDescription: localize('filteredTypes.interface', "When enaBled outline shows `interface`-symBols.")
		},
		'outline.showFunctions': {
			type: 'Boolean',
			default: true,
			scope: ConfigurationScope.LANGUAGE_OVERRIDABLE,
			markdownDescription: localize('filteredTypes.function', "When enaBled outline shows `function`-symBols.")
		},
		'outline.showVariaBles': {
			type: 'Boolean',
			default: true,
			scope: ConfigurationScope.LANGUAGE_OVERRIDABLE,
			markdownDescription: localize('filteredTypes.variaBle', "When enaBled outline shows `variaBle`-symBols.")
		},
		'outline.showConstants': {
			type: 'Boolean',
			default: true,
			scope: ConfigurationScope.LANGUAGE_OVERRIDABLE,
			markdownDescription: localize('filteredTypes.constant', "When enaBled outline shows `constant`-symBols.")
		},
		'outline.showStrings': {
			type: 'Boolean',
			default: true,
			scope: ConfigurationScope.LANGUAGE_OVERRIDABLE,
			markdownDescription: localize('filteredTypes.string', "When enaBled outline shows `string`-symBols.")
		},
		'outline.showNumBers': {
			type: 'Boolean',
			default: true,
			scope: ConfigurationScope.LANGUAGE_OVERRIDABLE,
			markdownDescription: localize('filteredTypes.numBer', "When enaBled outline shows `numBer`-symBols.")
		},
		'outline.showBooleans': {
			type: 'Boolean',
			scope: ConfigurationScope.LANGUAGE_OVERRIDABLE,
			default: true,
			markdownDescription: localize('filteredTypes.Boolean', "When enaBled outline shows `Boolean`-symBols.")
		},
		'outline.showArrays': {
			type: 'Boolean',
			default: true,
			scope: ConfigurationScope.LANGUAGE_OVERRIDABLE,
			markdownDescription: localize('filteredTypes.array', "When enaBled outline shows `array`-symBols.")
		},
		'outline.showOBjects': {
			type: 'Boolean',
			default: true,
			markdownDescription: localize('filteredTypes.oBject', "When enaBled outline shows `oBject`-symBols.")
		},
		'outline.showKeys': {
			type: 'Boolean',
			default: true,
			markdownDescription: localize('filteredTypes.key', "When enaBled outline shows `key`-symBols.")
		},
		'outline.showNull': {
			type: 'Boolean',
			default: true,
			markdownDescription: localize('filteredTypes.null', "When enaBled outline shows `null`-symBols.")
		},
		'outline.showEnumMemBers': {
			type: 'Boolean',
			default: true,
			markdownDescription: localize('filteredTypes.enumMemBer', "When enaBled outline shows `enumMemBer`-symBols.")
		},
		'outline.showStructs': {
			type: 'Boolean',
			default: true,
			markdownDescription: localize('filteredTypes.struct', "When enaBled outline shows `struct`-symBols.")
		},
		'outline.showEvents': {
			type: 'Boolean',
			default: true,
			markdownDescription: localize('filteredTypes.event', "When enaBled outline shows `event`-symBols.")
		},
		'outline.showOperators': {
			type: 'Boolean',
			default: true,
			markdownDescription: localize('filteredTypes.operator', "When enaBled outline shows `operator`-symBols.")
		},
		'outline.showTypeParameters': {
			type: 'Boolean',
			default: true,
			markdownDescription: localize('filteredTypes.typeParameter', "When enaBled outline shows `typeParameter`-symBols.")
		}
	}
});
