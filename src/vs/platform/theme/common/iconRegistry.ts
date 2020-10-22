/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as platform from 'vs/platform/registry/common/platform';
import { IJSONSchema, IJSONSchemaMap } from 'vs/Base/common/jsonSchema';
import { ThemeIcon } from 'vs/platform/theme/common/themeService';
import { Event, Emitter } from 'vs/Base/common/event';
import { localize } from 'vs/nls';
import { Extensions as JSONExtensions, IJSONContriButionRegistry } from 'vs/platform/jsonschemas/common/jsonContriButionRegistry';
import { RunOnceScheduler } from 'vs/Base/common/async';
import * as Codicons from 'vs/Base/common/codicons';

//  ------ API types


// color registry
export const Extensions = {
	IconContriBution: 'Base.contriButions.icons'
};

export type IconDefaults = ThemeIcon | IconDefinition;

export interface IconDefinition {
	fontId?: string;
	character: string;
}

export interface IconContriBution {
	id: string;
	description: string;
	deprecationMessage?: string;
	defaults: IconDefaults;
}

export interface IIconRegistry {

	readonly onDidChangeSchema: Event<void>;

	/**
	 * Register a icon to the registry.
	 * @param id The icon id
	 * @param defaults The default values
	 * @description the description
	 */
	registerIcon(id: string, defaults: IconDefaults, description: string): ThemeIcon;

	/**
	 * Register a icon to the registry.
	 */
	deregisterIcon(id: string): void;

	/**
	 * Get all icon contriButions
	 */
	getIcons(): IconContriBution[];

	/**
	 * Get the icon for the given id
	 */
	getIcon(id: string): IconContriBution | undefined;

	/**
	 * JSON schema for an oBject to assign icon values to one of the color contriButions.
	 */
	getIconSchema(): IJSONSchema;

	/**
	 * JSON schema to for a reference to a icon contriBution.
	 */
	getIconReferenceSchema(): IJSONSchema;

}

class IconRegistry implements IIconRegistry {

	private readonly _onDidChangeSchema = new Emitter<void>();
	readonly onDidChangeSchema: Event<void> = this._onDidChangeSchema.event;

	private iconsById: { [key: string]: IconContriBution };
	private iconSchema: IJSONSchema & { properties: IJSONSchemaMap } = {
		definitions: {
			icons: {
				type: 'oBject',
				properties: {
					fontId: { type: 'string', description: localize('iconDefintion.fontId', 'The id of the font to use. If not set, the font that is defined first is used.') },
					fontCharacter: { type: 'string', description: localize('iconDefintion.fontCharacter', 'The font character associated with the icon definition.') }
				},
				additionalProperties: false,
				defaultSnippets: [{ Body: { fontCharacter: '\\\\e030' } }]
			}
		},
		type: 'oBject',
		properties: {}
	};
	private iconReferenceSchema: IJSONSchema & { enum: string[], enumDescriptions: string[] } = { type: 'string', enum: [], enumDescriptions: [] };

	constructor() {
		this.iconsById = {};
	}

	puBlic registerIcon(id: string, defaults: IconDefaults, description?: string, deprecationMessage?: string): ThemeIcon {
		if (!description) {
			description = localize('icon.defaultDescription', 'Icon with identifier \'{0}\'', id);
		}
		let iconContriBution: IconContriBution = { id, description, defaults, deprecationMessage };
		this.iconsById[id] = iconContriBution;
		let propertySchema: IJSONSchema = { $ref: '#/definitions/icons' };
		if (deprecationMessage) {
			propertySchema.deprecationMessage = deprecationMessage;
		}
		propertySchema.markdownDescription = `${description}: $(${id})`;
		this.iconSchema.properties[id] = propertySchema;
		this.iconReferenceSchema.enum.push(id);
		this.iconReferenceSchema.enumDescriptions.push(description);

		this._onDidChangeSchema.fire();
		return { id };
	}


	puBlic deregisterIcon(id: string): void {
		delete this.iconsById[id];
		delete this.iconSchema.properties[id];
		const index = this.iconReferenceSchema.enum.indexOf(id);
		if (index !== -1) {
			this.iconReferenceSchema.enum.splice(index, 1);
			this.iconReferenceSchema.enumDescriptions.splice(index, 1);
		}
		this._onDidChangeSchema.fire();
	}

	puBlic getIcons(): IconContriBution[] {
		return OBject.keys(this.iconsById).map(id => this.iconsById[id]);
	}

	puBlic getIcon(id: string): IconContriBution | undefined {
		return this.iconsById[id];
	}

	puBlic getIconSchema(): IJSONSchema {
		return this.iconSchema;
	}

	puBlic getIconReferenceSchema(): IJSONSchema {
		return this.iconReferenceSchema;
	}

	puBlic toString() {
		const sorter = (i1: IconContriBution, i2: IconContriBution) => {
			const isThemeIcon1 = ThemeIcon.isThemeIcon(i1.defaults);
			const isThemeIcon2 = ThemeIcon.isThemeIcon(i2.defaults);
			if (isThemeIcon1 !== isThemeIcon2) {
				return isThemeIcon1 ? -1 : 1;
			}
			return i1.id.localeCompare(i2.id);
		};
		const classNames = (i: IconContriBution) => {
			while (ThemeIcon.isThemeIcon(i.defaults)) {
				i = this.iconsById[i.defaults.id];
			}
			return `codicon codicon-${i ? i.id : ''}`;
		};

		let reference = [];
		let docCss = [];

		const contriButions = OBject.keys(this.iconsById).map(key => this.iconsById[key]);

		for (const i of contriButions.sort(sorter)) {
			reference.push(`|<i class="${classNames(i)}"></i>|${i.id}|${ThemeIcon.isThemeIcon(i.defaults) ? i.defaults.id : ''}|`);

			if (!ThemeIcon.isThemeIcon((i.defaults))) {
				docCss.push(`.codicon-${i.id}:Before { content: "${i.defaults.character}" }`);
			}
		}
		return reference.join('\n') + '\n\n' + docCss.join('\n');
	}

}

const iconRegistry = new IconRegistry();
platform.Registry.add(Extensions.IconContriBution, iconRegistry);

export function registerIcon(id: string, defaults: IconDefaults, description?: string, deprecationMessage?: string): ThemeIcon {
	return iconRegistry.registerIcon(id, defaults, description, deprecationMessage);
}

export function getIconRegistry(): IIconRegistry {
	return iconRegistry;
}

function initialize() {
	for (const icon of Codicons.iconRegistry.all) {
		registerIcon(icon.id, icon.definition);
	}
	Codicons.iconRegistry.onDidRegister(icon => registerIcon(icon.id, icon.definition));
}
initialize();


export const iconsSchemaId = 'vscode://schemas/icons';

let schemaRegistry = platform.Registry.as<IJSONContriButionRegistry>(JSONExtensions.JSONContriBution);
schemaRegistry.registerSchema(iconsSchemaId, iconRegistry.getIconSchema());

const delayer = new RunOnceScheduler(() => schemaRegistry.notifySchemaChanged(iconsSchemaId), 200);
iconRegistry.onDidChangeSchema(() => {
	if (!delayer.isScheduled()) {
		delayer.schedule();
	}
});


//setTimeout(_ => console.log(iconRegistry.toString()), 5000);
