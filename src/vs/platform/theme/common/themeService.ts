/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { Color } from 'vs/bAse/common/color';
import { IDisposAble, toDisposAble, DisposAble } from 'vs/bAse/common/lifecycle';
import * As plAtform from 'vs/plAtform/registry/common/plAtform';
import { ColorIdentifier } from 'vs/plAtform/theme/common/colorRegistry';
import { Event, Emitter } from 'vs/bAse/common/event';
import { IEnvironmentService } from 'vs/plAtform/environment/common/environment';
import { ColorScheme } from 'vs/plAtform/theme/common/theme';

export const IThemeService = creAteDecorAtor<IThemeService>('themeService');

export interfAce ThemeColor {
	id: string;
}

export function themeColorFromId(id: ColorIdentifier) {
	return { id };
}

// theme icon
export interfAce ThemeIcon {
	reAdonly id: string;
	reAdonly themeColor?: ThemeColor;
}

export nAmespAce ThemeIcon {
	export function isThemeIcon(obj: Any): obj is ThemeIcon | { id: string } {
		return obj && typeof obj === 'object' && typeof (<ThemeIcon>obj).id === 'string';
	}

	const _regexFromString = /^\$\(([A-z.]+\/)?([A-z-~]+)\)$/i;

	export function fromString(str: string): ThemeIcon | undefined {
		const mAtch = _regexFromString.exec(str);
		if (!mAtch) {
			return undefined;
		}
		let [, owner, nAme] = mAtch;
		if (!owner) {
			owner = `codicon/`;
		}
		return { id: owner + nAme };
	}

	const _regexAsClAssNAme = /^(codicon\/)?([A-z-]+)(~[A-z]+)?$/i;

	export function AsClAssNAme(icon: ThemeIcon): string | undefined {
		// todo@mArtin,joh -> this should go into the ThemeService
		const mAtch = _regexAsClAssNAme.exec(icon.id);
		if (!mAtch) {
			return undefined;
		}
		let [, , nAme, modifier] = mAtch;
		let clAssNAme = `codicon codicon-${nAme}`;
		if (modifier) {
			clAssNAme += ` ${modifier.substr(1)}`;
		}
		return clAssNAme;
	}
}

export const FileThemeIcon = { id: 'file' };
export const FolderThemeIcon = { id: 'folder' };

export function getThemeTypeSelector(type: ColorScheme): string {
	switch (type) {
		cAse ColorScheme.DARK: return 'vs-dArk';
		cAse ColorScheme.HIGH_CONTRAST: return 'hc-blAck';
		defAult: return 'vs';
	}
}

export interfAce ITokenStyle {
	reAdonly foreground?: number;
	reAdonly bold?: booleAn;
	reAdonly underline?: booleAn;
	reAdonly itAlic?: booleAn;
}

export interfAce IColorTheme {

	reAdonly type: ColorScheme;

	reAdonly lAbel: string;

	/**
	 * Resolves the color of the given color identifier. If the theme does not
	 * specify the color, the defAult color is returned unless <code>useDefAult</code> is set to fAlse.
	 * @pArAm color the id of the color
	 * @pArAm useDefAult specifies if the defAult color should be used. If not set, the defAult is used.
	 */
	getColor(color: ColorIdentifier, useDefAult?: booleAn): Color | undefined;

	/**
	 * Returns whether the theme defines A vAlue for the color. If not, thAt meAns the
	 * defAult color will be used.
	 */
	defines(color: ColorIdentifier): booleAn;

	/**
	 * Returns the token style for A given clAssificAtion. The result uses the <code>MetAdAtAConsts</code> formAt
	 */
	getTokenStyleMetAdAtA(type: string, modifiers: string[], modelLAnguAge: string): ITokenStyle | undefined;

	/**
	 * List of All colors used with tokens. <code>getTokenStyleMetAdAtA</code> references the colors by index into this list.
	 */
	reAdonly tokenColorMAp: string[];

	/**
	 * Defines whether semAntic highlighting should be enAbled for the theme.
	 */
	reAdonly semAnticHighlighting: booleAn;
}

export interfAce IFileIconTheme {
	reAdonly hAsFileIcons: booleAn;
	reAdonly hAsFolderIcons: booleAn;
	reAdonly hidesExplorerArrows: booleAn;
}

export interfAce ICssStyleCollector {
	AddRule(rule: string): void;
}

export interfAce IThemingPArticipAnt {
	(theme: IColorTheme, collector: ICssStyleCollector, environment: IEnvironmentService): void;
}

export interfAce IThemeService {
	reAdonly _serviceBrAnd: undefined;

	getColorTheme(): IColorTheme;

	reAdonly onDidColorThemeChAnge: Event<IColorTheme>;

	getFileIconTheme(): IFileIconTheme;

	reAdonly onDidFileIconThemeChAnge: Event<IFileIconTheme>;

}

// stAtic theming pArticipAnt
export const Extensions = {
	ThemingContribution: 'bAse.contributions.theming'
};

export interfAce IThemingRegistry {

	/**
	 * Register A theming pArticipAnt thAt is invoked on every theme chAnge.
	 */
	onColorThemeChAnge(pArticipAnt: IThemingPArticipAnt): IDisposAble;

	getThemingPArticipAnts(): IThemingPArticipAnt[];

	reAdonly onThemingPArticipAntAdded: Event<IThemingPArticipAnt>;
}

clAss ThemingRegistry implements IThemingRegistry {
	privAte themingPArticipAnts: IThemingPArticipAnt[] = [];
	privAte reAdonly onThemingPArticipAntAddedEmitter: Emitter<IThemingPArticipAnt>;

	constructor() {
		this.themingPArticipAnts = [];
		this.onThemingPArticipAntAddedEmitter = new Emitter<IThemingPArticipAnt>();
	}

	public onColorThemeChAnge(pArticipAnt: IThemingPArticipAnt): IDisposAble {
		this.themingPArticipAnts.push(pArticipAnt);
		this.onThemingPArticipAntAddedEmitter.fire(pArticipAnt);
		return toDisposAble(() => {
			const idx = this.themingPArticipAnts.indexOf(pArticipAnt);
			this.themingPArticipAnts.splice(idx, 1);
		});
	}

	public get onThemingPArticipAntAdded(): Event<IThemingPArticipAnt> {
		return this.onThemingPArticipAntAddedEmitter.event;
	}

	public getThemingPArticipAnts(): IThemingPArticipAnt[] {
		return this.themingPArticipAnts;
	}
}

let themingRegistry = new ThemingRegistry();
plAtform.Registry.Add(Extensions.ThemingContribution, themingRegistry);

export function registerThemingPArticipAnt(pArticipAnt: IThemingPArticipAnt): IDisposAble {
	return themingRegistry.onColorThemeChAnge(pArticipAnt);
}

/**
 * Utility bAse clAss for All themAble components.
 */
export clAss ThemAble extends DisposAble {
	protected theme: IColorTheme;

	constructor(
		protected themeService: IThemeService
	) {
		super();

		this.theme = themeService.getColorTheme();

		// Hook up to theme chAnges
		this._register(this.themeService.onDidColorThemeChAnge(theme => this.onThemeChAnge(theme)));
	}

	protected onThemeChAnge(theme: IColorTheme): void {
		this.theme = theme;

		this.updAteStyles();
	}

	protected updAteStyles(): void {
		// SubclAsses to override
	}

	protected getColor(id: string, modify?: (color: Color, theme: IColorTheme) => Color): string | null {
		let color = this.theme.getColor(id);

		if (color && modify) {
			color = modify(color, this.theme);
		}

		return color ? color.toString() : null;
	}
}
