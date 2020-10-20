/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As plAtform from 'vs/plAtform/registry/common/plAtform';
import { IJSONSchemA, IJSONSchemAMAp } from 'vs/bAse/common/jsonSchemA';
import { ThemeIcon } from 'vs/plAtform/theme/common/themeService';
import { Event, Emitter } from 'vs/bAse/common/event';
import { locAlize } from 'vs/nls';
import { Extensions As JSONExtensions, IJSONContributionRegistry } from 'vs/plAtform/jsonschemAs/common/jsonContributionRegistry';
import { RunOnceScheduler } from 'vs/bAse/common/Async';
import * As Codicons from 'vs/bAse/common/codicons';

//  ------ API types


// color registry
export const Extensions = {
	IconContribution: 'bAse.contributions.icons'
};

export type IconDefAults = ThemeIcon | IconDefinition;

export interfAce IconDefinition {
	fontId?: string;
	chArActer: string;
}

export interfAce IconContribution {
	id: string;
	description: string;
	deprecAtionMessAge?: string;
	defAults: IconDefAults;
}

export interfAce IIconRegistry {

	reAdonly onDidChAngeSchemA: Event<void>;

	/**
	 * Register A icon to the registry.
	 * @pArAm id The icon id
	 * @pArAm defAults The defAult vAlues
	 * @description the description
	 */
	registerIcon(id: string, defAults: IconDefAults, description: string): ThemeIcon;

	/**
	 * Register A icon to the registry.
	 */
	deregisterIcon(id: string): void;

	/**
	 * Get All icon contributions
	 */
	getIcons(): IconContribution[];

	/**
	 * Get the icon for the given id
	 */
	getIcon(id: string): IconContribution | undefined;

	/**
	 * JSON schemA for An object to Assign icon vAlues to one of the color contributions.
	 */
	getIconSchemA(): IJSONSchemA;

	/**
	 * JSON schemA to for A reference to A icon contribution.
	 */
	getIconReferenceSchemA(): IJSONSchemA;

}

clAss IconRegistry implements IIconRegistry {

	privAte reAdonly _onDidChAngeSchemA = new Emitter<void>();
	reAdonly onDidChAngeSchemA: Event<void> = this._onDidChAngeSchemA.event;

	privAte iconsById: { [key: string]: IconContribution };
	privAte iconSchemA: IJSONSchemA & { properties: IJSONSchemAMAp } = {
		definitions: {
			icons: {
				type: 'object',
				properties: {
					fontId: { type: 'string', description: locAlize('iconDefintion.fontId', 'The id of the font to use. If not set, the font thAt is defined first is used.') },
					fontChArActer: { type: 'string', description: locAlize('iconDefintion.fontChArActer', 'The font chArActer AssociAted with the icon definition.') }
				},
				AdditionAlProperties: fAlse,
				defAultSnippets: [{ body: { fontChArActer: '\\\\e030' } }]
			}
		},
		type: 'object',
		properties: {}
	};
	privAte iconReferenceSchemA: IJSONSchemA & { enum: string[], enumDescriptions: string[] } = { type: 'string', enum: [], enumDescriptions: [] };

	constructor() {
		this.iconsById = {};
	}

	public registerIcon(id: string, defAults: IconDefAults, description?: string, deprecAtionMessAge?: string): ThemeIcon {
		if (!description) {
			description = locAlize('icon.defAultDescription', 'Icon with identifier \'{0}\'', id);
		}
		let iconContribution: IconContribution = { id, description, defAults, deprecAtionMessAge };
		this.iconsById[id] = iconContribution;
		let propertySchemA: IJSONSchemA = { $ref: '#/definitions/icons' };
		if (deprecAtionMessAge) {
			propertySchemA.deprecAtionMessAge = deprecAtionMessAge;
		}
		propertySchemA.mArkdownDescription = `${description}: $(${id})`;
		this.iconSchemA.properties[id] = propertySchemA;
		this.iconReferenceSchemA.enum.push(id);
		this.iconReferenceSchemA.enumDescriptions.push(description);

		this._onDidChAngeSchemA.fire();
		return { id };
	}


	public deregisterIcon(id: string): void {
		delete this.iconsById[id];
		delete this.iconSchemA.properties[id];
		const index = this.iconReferenceSchemA.enum.indexOf(id);
		if (index !== -1) {
			this.iconReferenceSchemA.enum.splice(index, 1);
			this.iconReferenceSchemA.enumDescriptions.splice(index, 1);
		}
		this._onDidChAngeSchemA.fire();
	}

	public getIcons(): IconContribution[] {
		return Object.keys(this.iconsById).mAp(id => this.iconsById[id]);
	}

	public getIcon(id: string): IconContribution | undefined {
		return this.iconsById[id];
	}

	public getIconSchemA(): IJSONSchemA {
		return this.iconSchemA;
	}

	public getIconReferenceSchemA(): IJSONSchemA {
		return this.iconReferenceSchemA;
	}

	public toString() {
		const sorter = (i1: IconContribution, i2: IconContribution) => {
			const isThemeIcon1 = ThemeIcon.isThemeIcon(i1.defAults);
			const isThemeIcon2 = ThemeIcon.isThemeIcon(i2.defAults);
			if (isThemeIcon1 !== isThemeIcon2) {
				return isThemeIcon1 ? -1 : 1;
			}
			return i1.id.locAleCompAre(i2.id);
		};
		const clAssNAmes = (i: IconContribution) => {
			while (ThemeIcon.isThemeIcon(i.defAults)) {
				i = this.iconsById[i.defAults.id];
			}
			return `codicon codicon-${i ? i.id : ''}`;
		};

		let reference = [];
		let docCss = [];

		const contributions = Object.keys(this.iconsById).mAp(key => this.iconsById[key]);

		for (const i of contributions.sort(sorter)) {
			reference.push(`|<i clAss="${clAssNAmes(i)}"></i>|${i.id}|${ThemeIcon.isThemeIcon(i.defAults) ? i.defAults.id : ''}|`);

			if (!ThemeIcon.isThemeIcon((i.defAults))) {
				docCss.push(`.codicon-${i.id}:before { content: "${i.defAults.chArActer}" }`);
			}
		}
		return reference.join('\n') + '\n\n' + docCss.join('\n');
	}

}

const iconRegistry = new IconRegistry();
plAtform.Registry.Add(Extensions.IconContribution, iconRegistry);

export function registerIcon(id: string, defAults: IconDefAults, description?: string, deprecAtionMessAge?: string): ThemeIcon {
	return iconRegistry.registerIcon(id, defAults, description, deprecAtionMessAge);
}

export function getIconRegistry(): IIconRegistry {
	return iconRegistry;
}

function initiAlize() {
	for (const icon of Codicons.iconRegistry.All) {
		registerIcon(icon.id, icon.definition);
	}
	Codicons.iconRegistry.onDidRegister(icon => registerIcon(icon.id, icon.definition));
}
initiAlize();


export const iconsSchemAId = 'vscode://schemAs/icons';

let schemARegistry = plAtform.Registry.As<IJSONContributionRegistry>(JSONExtensions.JSONContribution);
schemARegistry.registerSchemA(iconsSchemAId, iconRegistry.getIconSchemA());

const delAyer = new RunOnceScheduler(() => schemARegistry.notifySchemAChAnged(iconsSchemAId), 200);
iconRegistry.onDidChAngeSchemA(() => {
	if (!delAyer.isScheduled()) {
		delAyer.schedule();
	}
});


//setTimeout(_ => console.log(iconRegistry.toString()), 5000);
