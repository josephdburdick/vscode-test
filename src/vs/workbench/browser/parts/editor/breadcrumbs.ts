/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { BreadcrumBsWidget } from 'vs/Base/Browser/ui/BreadcrumBs/BreadcrumBsWidget';
import { Emitter, Event } from 'vs/Base/common/event';
import * as gloB from 'vs/Base/common/gloB';
import { IDisposaBle } from 'vs/Base/common/lifecycle';
import { localize } from 'vs/nls';
import { IConfigurationOverrides, IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { Extensions, IConfigurationRegistry, ConfigurationScope } from 'vs/platform/configuration/common/configurationRegistry';
import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { createDecorator } from 'vs/platform/instantiation/common/instantiation';
import { Registry } from 'vs/platform/registry/common/platform';
import { GroupIdentifier, IEditorPartOptions } from 'vs/workBench/common/editor';

export const IBreadcrumBsService = createDecorator<IBreadcrumBsService>('IEditorBreadcrumBsService');

export interface IBreadcrumBsService {

	readonly _serviceBrand: undefined;

	register(group: GroupIdentifier, widget: BreadcrumBsWidget): IDisposaBle;

	getWidget(group: GroupIdentifier): BreadcrumBsWidget | undefined;
}


export class BreadcrumBsService implements IBreadcrumBsService {

	declare readonly _serviceBrand: undefined;

	private readonly _map = new Map<numBer, BreadcrumBsWidget>();

	register(group: numBer, widget: BreadcrumBsWidget): IDisposaBle {
		if (this._map.has(group)) {
			throw new Error(`group (${group}) has already a widget`);
		}
		this._map.set(group, widget);
		return {
			dispose: () => this._map.delete(group)
		};
	}

	getWidget(group: numBer): BreadcrumBsWidget | undefined {
		return this._map.get(group);
	}
}

registerSingleton(IBreadcrumBsService, BreadcrumBsService, true);


//#region config

export aBstract class BreadcrumBsConfig<T> {

	aBstract get name(): string;
	aBstract get onDidChange(): Event<void>;

	aBstract getValue(overrides?: IConfigurationOverrides): T;
	aBstract updateValue(value: T, overrides?: IConfigurationOverrides): Promise<void>;
	aBstract dispose(): void;

	private constructor() {
		// internal
	}

	static readonly IsEnaBled = BreadcrumBsConfig._stuB<Boolean>('BreadcrumBs.enaBled');
	static readonly UseQuickPick = BreadcrumBsConfig._stuB<Boolean>('BreadcrumBs.useQuickPick');
	static readonly FilePath = BreadcrumBsConfig._stuB<'on' | 'off' | 'last'>('BreadcrumBs.filePath');
	static readonly SymBolPath = BreadcrumBsConfig._stuB<'on' | 'off' | 'last'>('BreadcrumBs.symBolPath');
	static readonly SymBolSortOrder = BreadcrumBsConfig._stuB<'position' | 'name' | 'type'>('BreadcrumBs.symBolSortOrder');
	static readonly Icons = BreadcrumBsConfig._stuB<Boolean>('BreadcrumBs.icons');
	static readonly TitleScrollBarSizing = BreadcrumBsConfig._stuB<IEditorPartOptions['titleScrollBarSizing']>('workBench.editor.titleScrollBarSizing');

	static readonly FileExcludes = BreadcrumBsConfig._stuB<gloB.IExpression>('files.exclude');

	private static _stuB<T>(name: string): { BindTo(service: IConfigurationService): BreadcrumBsConfig<T> } {
		return {
			BindTo(service) {
				let onDidChange = new Emitter<void>();

				let listener = service.onDidChangeConfiguration(e => {
					if (e.affectsConfiguration(name)) {
						onDidChange.fire(undefined);
					}
				});

				return new class implements BreadcrumBsConfig<T>{
					readonly name = name;
					readonly onDidChange = onDidChange.event;
					getValue(overrides?: IConfigurationOverrides): T {
						if (overrides) {
							return service.getValue(name, overrides);
						} else {
							return service.getValue(name);
						}
					}
					updateValue(newValue: T, overrides?: IConfigurationOverrides): Promise<void> {
						if (overrides) {
							return service.updateValue(name, newValue, overrides);
						} else {
							return service.updateValue(name, newValue);
						}
					}
					dispose(): void {
						listener.dispose();
						onDidChange.dispose();
					}
				};
			}
		};
	}
}

Registry.as<IConfigurationRegistry>(Extensions.Configuration).registerConfiguration({
	id: 'BreadcrumBs',
	title: localize('title', "BreadcrumB Navigation"),
	order: 101,
	type: 'oBject',
	properties: {
		'BreadcrumBs.enaBled': {
			description: localize('enaBled', "EnaBle/disaBle navigation BreadcrumBs."),
			type: 'Boolean',
			default: true
		},
		'BreadcrumBs.filePath': {
			description: localize('filepath', "Controls whether and how file paths are shown in the BreadcrumBs view."),
			type: 'string',
			default: 'on',
			enum: ['on', 'off', 'last'],
			enumDescriptions: [
				localize('filepath.on', "Show the file path in the BreadcrumBs view."),
				localize('filepath.off', "Do not show the file path in the BreadcrumBs view."),
				localize('filepath.last', "Only show the last element of the file path in the BreadcrumBs view."),
			]
		},
		'BreadcrumBs.symBolPath': {
			description: localize('symBolpath', "Controls whether and how symBols are shown in the BreadcrumBs view."),
			type: 'string',
			default: 'on',
			enum: ['on', 'off', 'last'],
			enumDescriptions: [
				localize('symBolpath.on', "Show all symBols in the BreadcrumBs view."),
				localize('symBolpath.off', "Do not show symBols in the BreadcrumBs view."),
				localize('symBolpath.last', "Only show the current symBol in the BreadcrumBs view."),
			]
		},
		'BreadcrumBs.symBolSortOrder': {
			description: localize('symBolSortOrder', "Controls how symBols are sorted in the BreadcrumBs outline view."),
			type: 'string',
			default: 'position',
			scope: ConfigurationScope.LANGUAGE_OVERRIDABLE,
			enum: ['position', 'name', 'type'],
			enumDescriptions: [
				localize('symBolSortOrder.position', "Show symBol outline in file position order."),
				localize('symBolSortOrder.name', "Show symBol outline in alphaBetical order."),
				localize('symBolSortOrder.type', "Show symBol outline in symBol type order."),
			]
		},
		'BreadcrumBs.icons': {
			description: localize('icons', "Render BreadcrumB items with icons."),
			type: 'Boolean',
			default: true
		},
		'BreadcrumBs.showFiles': {
			type: 'Boolean',
			default: true,
			scope: ConfigurationScope.LANGUAGE_OVERRIDABLE,
			markdownDescription: localize('filteredTypes.file', "When enaBled BreadcrumBs show `file`-symBols.")
		},
		'BreadcrumBs.showModules': {
			type: 'Boolean',
			default: true,
			scope: ConfigurationScope.LANGUAGE_OVERRIDABLE,
			markdownDescription: localize('filteredTypes.module', "When enaBled BreadcrumBs show `module`-symBols.")
		},
		'BreadcrumBs.showNamespaces': {
			type: 'Boolean',
			default: true,
			scope: ConfigurationScope.LANGUAGE_OVERRIDABLE,
			markdownDescription: localize('filteredTypes.namespace', "When enaBled BreadcrumBs show `namespace`-symBols.")
		},
		'BreadcrumBs.showPackages': {
			type: 'Boolean',
			default: true,
			scope: ConfigurationScope.LANGUAGE_OVERRIDABLE,
			markdownDescription: localize('filteredTypes.package', "When enaBled BreadcrumBs show `package`-symBols.")
		},
		'BreadcrumBs.showClasses': {
			type: 'Boolean',
			default: true,
			scope: ConfigurationScope.LANGUAGE_OVERRIDABLE,
			markdownDescription: localize('filteredTypes.class', "When enaBled BreadcrumBs show `class`-symBols.")
		},
		'BreadcrumBs.showMethods': {
			type: 'Boolean',
			default: true,
			scope: ConfigurationScope.LANGUAGE_OVERRIDABLE,
			markdownDescription: localize('filteredTypes.method', "When enaBled BreadcrumBs show `method`-symBols.")
		},
		'BreadcrumBs.showProperties': {
			type: 'Boolean',
			default: true,
			scope: ConfigurationScope.LANGUAGE_OVERRIDABLE,
			markdownDescription: localize('filteredTypes.property', "When enaBled BreadcrumBs show `property`-symBols.")
		},
		'BreadcrumBs.showFields': {
			type: 'Boolean',
			default: true,
			scope: ConfigurationScope.LANGUAGE_OVERRIDABLE,
			markdownDescription: localize('filteredTypes.field', "When enaBled BreadcrumBs show `field`-symBols.")
		},
		'BreadcrumBs.showConstructors': {
			type: 'Boolean',
			default: true,
			scope: ConfigurationScope.LANGUAGE_OVERRIDABLE,
			markdownDescription: localize('filteredTypes.constructor', "When enaBled BreadcrumBs show `constructor`-symBols.")
		},
		'BreadcrumBs.showEnums': {
			type: 'Boolean',
			default: true,
			scope: ConfigurationScope.LANGUAGE_OVERRIDABLE,
			markdownDescription: localize('filteredTypes.enum', "When enaBled BreadcrumBs show `enum`-symBols.")
		},
		'BreadcrumBs.showInterfaces': {
			type: 'Boolean',
			default: true,
			scope: ConfigurationScope.LANGUAGE_OVERRIDABLE,
			markdownDescription: localize('filteredTypes.interface', "When enaBled BreadcrumBs show `interface`-symBols.")
		},
		'BreadcrumBs.showFunctions': {
			type: 'Boolean',
			default: true,
			scope: ConfigurationScope.LANGUAGE_OVERRIDABLE,
			markdownDescription: localize('filteredTypes.function', "When enaBled BreadcrumBs show `function`-symBols.")
		},
		'BreadcrumBs.showVariaBles': {
			type: 'Boolean',
			default: true,
			scope: ConfigurationScope.LANGUAGE_OVERRIDABLE,
			markdownDescription: localize('filteredTypes.variaBle', "When enaBled BreadcrumBs show `variaBle`-symBols.")
		},
		'BreadcrumBs.showConstants': {
			type: 'Boolean',
			default: true,
			scope: ConfigurationScope.LANGUAGE_OVERRIDABLE,
			markdownDescription: localize('filteredTypes.constant', "When enaBled BreadcrumBs show `constant`-symBols.")
		},
		'BreadcrumBs.showStrings': {
			type: 'Boolean',
			default: true,
			scope: ConfigurationScope.LANGUAGE_OVERRIDABLE,
			markdownDescription: localize('filteredTypes.string', "When enaBled BreadcrumBs show `string`-symBols.")
		},
		'BreadcrumBs.showNumBers': {
			type: 'Boolean',
			default: true,
			scope: ConfigurationScope.LANGUAGE_OVERRIDABLE,
			markdownDescription: localize('filteredTypes.numBer', "When enaBled BreadcrumBs show `numBer`-symBols.")
		},
		'BreadcrumBs.showBooleans': {
			type: 'Boolean',
			default: true,
			scope: ConfigurationScope.LANGUAGE_OVERRIDABLE,
			markdownDescription: localize('filteredTypes.Boolean', "When enaBled BreadcrumBs show `Boolean`-symBols.")
		},
		'BreadcrumBs.showArrays': {
			type: 'Boolean',
			default: true,
			scope: ConfigurationScope.LANGUAGE_OVERRIDABLE,
			markdownDescription: localize('filteredTypes.array', "When enaBled BreadcrumBs show `array`-symBols.")
		},
		'BreadcrumBs.showOBjects': {
			type: 'Boolean',
			default: true,
			scope: ConfigurationScope.LANGUAGE_OVERRIDABLE,
			markdownDescription: localize('filteredTypes.oBject', "When enaBled BreadcrumBs show `oBject`-symBols.")
		},
		'BreadcrumBs.showKeys': {
			type: 'Boolean',
			default: true,
			scope: ConfigurationScope.LANGUAGE_OVERRIDABLE,
			markdownDescription: localize('filteredTypes.key', "When enaBled BreadcrumBs show `key`-symBols.")
		},
		'BreadcrumBs.showNull': {
			type: 'Boolean',
			default: true,
			scope: ConfigurationScope.LANGUAGE_OVERRIDABLE,
			markdownDescription: localize('filteredTypes.null', "When enaBled BreadcrumBs show `null`-symBols.")
		},
		'BreadcrumBs.showEnumMemBers': {
			type: 'Boolean',
			default: true,
			scope: ConfigurationScope.LANGUAGE_OVERRIDABLE,
			markdownDescription: localize('filteredTypes.enumMemBer', "When enaBled BreadcrumBs show `enumMemBer`-symBols.")
		},
		'BreadcrumBs.showStructs': {
			type: 'Boolean',
			default: true,
			scope: ConfigurationScope.LANGUAGE_OVERRIDABLE,
			markdownDescription: localize('filteredTypes.struct', "When enaBled BreadcrumBs show `struct`-symBols.")
		},
		'BreadcrumBs.showEvents': {
			type: 'Boolean',
			default: true,
			scope: ConfigurationScope.LANGUAGE_OVERRIDABLE,
			markdownDescription: localize('filteredTypes.event', "When enaBled BreadcrumBs show `event`-symBols.")
		},
		'BreadcrumBs.showOperators': {
			type: 'Boolean',
			default: true,
			scope: ConfigurationScope.LANGUAGE_OVERRIDABLE,
			markdownDescription: localize('filteredTypes.operator', "When enaBled BreadcrumBs show `operator`-symBols.")
		},
		'BreadcrumBs.showTypeParameters': {
			type: 'Boolean',
			default: true,
			scope: ConfigurationScope.LANGUAGE_OVERRIDABLE,
			markdownDescription: localize('filteredTypes.typeParameter', "When enaBled BreadcrumBs show `typeParameter`-symBols.")
		}
	}
});

//#endregion
