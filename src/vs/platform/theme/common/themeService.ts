/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { createDecorator } from 'vs/platform/instantiation/common/instantiation';
import { Color } from 'vs/Base/common/color';
import { IDisposaBle, toDisposaBle, DisposaBle } from 'vs/Base/common/lifecycle';
import * as platform from 'vs/platform/registry/common/platform';
import { ColorIdentifier } from 'vs/platform/theme/common/colorRegistry';
import { Event, Emitter } from 'vs/Base/common/event';
import { IEnvironmentService } from 'vs/platform/environment/common/environment';
import { ColorScheme } from 'vs/platform/theme/common/theme';

export const IThemeService = createDecorator<IThemeService>('themeService');

export interface ThemeColor {
	id: string;
}

export function themeColorFromId(id: ColorIdentifier) {
	return { id };
}

// theme icon
export interface ThemeIcon {
	readonly id: string;
	readonly themeColor?: ThemeColor;
}

export namespace ThemeIcon {
	export function isThemeIcon(oBj: any): oBj is ThemeIcon | { id: string } {
		return oBj && typeof oBj === 'oBject' && typeof (<ThemeIcon>oBj).id === 'string';
	}

	const _regexFromString = /^\$\(([a-z.]+\/)?([a-z-~]+)\)$/i;

	export function fromString(str: string): ThemeIcon | undefined {
		const match = _regexFromString.exec(str);
		if (!match) {
			return undefined;
		}
		let [, owner, name] = match;
		if (!owner) {
			owner = `codicon/`;
		}
		return { id: owner + name };
	}

	const _regexAsClassName = /^(codicon\/)?([a-z-]+)(~[a-z]+)?$/i;

	export function asClassName(icon: ThemeIcon): string | undefined {
		// todo@martin,joh -> this should go into the ThemeService
		const match = _regexAsClassName.exec(icon.id);
		if (!match) {
			return undefined;
		}
		let [, , name, modifier] = match;
		let className = `codicon codicon-${name}`;
		if (modifier) {
			className += ` ${modifier.suBstr(1)}`;
		}
		return className;
	}
}

export const FileThemeIcon = { id: 'file' };
export const FolderThemeIcon = { id: 'folder' };

export function getThemeTypeSelector(type: ColorScheme): string {
	switch (type) {
		case ColorScheme.DARK: return 'vs-dark';
		case ColorScheme.HIGH_CONTRAST: return 'hc-Black';
		default: return 'vs';
	}
}

export interface ITokenStyle {
	readonly foreground?: numBer;
	readonly Bold?: Boolean;
	readonly underline?: Boolean;
	readonly italic?: Boolean;
}

export interface IColorTheme {

	readonly type: ColorScheme;

	readonly laBel: string;

	/**
	 * Resolves the color of the given color identifier. If the theme does not
	 * specify the color, the default color is returned unless <code>useDefault</code> is set to false.
	 * @param color the id of the color
	 * @param useDefault specifies if the default color should Be used. If not set, the default is used.
	 */
	getColor(color: ColorIdentifier, useDefault?: Boolean): Color | undefined;

	/**
	 * Returns whether the theme defines a value for the color. If not, that means the
	 * default color will Be used.
	 */
	defines(color: ColorIdentifier): Boolean;

	/**
	 * Returns the token style for a given classification. The result uses the <code>MetadataConsts</code> format
	 */
	getTokenStyleMetadata(type: string, modifiers: string[], modelLanguage: string): ITokenStyle | undefined;

	/**
	 * List of all colors used with tokens. <code>getTokenStyleMetadata</code> references the colors By index into this list.
	 */
	readonly tokenColorMap: string[];

	/**
	 * Defines whether semantic highlighting should Be enaBled for the theme.
	 */
	readonly semanticHighlighting: Boolean;
}

export interface IFileIconTheme {
	readonly hasFileIcons: Boolean;
	readonly hasFolderIcons: Boolean;
	readonly hidesExplorerArrows: Boolean;
}

export interface ICssStyleCollector {
	addRule(rule: string): void;
}

export interface IThemingParticipant {
	(theme: IColorTheme, collector: ICssStyleCollector, environment: IEnvironmentService): void;
}

export interface IThemeService {
	readonly _serviceBrand: undefined;

	getColorTheme(): IColorTheme;

	readonly onDidColorThemeChange: Event<IColorTheme>;

	getFileIconTheme(): IFileIconTheme;

	readonly onDidFileIconThemeChange: Event<IFileIconTheme>;

}

// static theming participant
export const Extensions = {
	ThemingContriBution: 'Base.contriButions.theming'
};

export interface IThemingRegistry {

	/**
	 * Register a theming participant that is invoked on every theme change.
	 */
	onColorThemeChange(participant: IThemingParticipant): IDisposaBle;

	getThemingParticipants(): IThemingParticipant[];

	readonly onThemingParticipantAdded: Event<IThemingParticipant>;
}

class ThemingRegistry implements IThemingRegistry {
	private themingParticipants: IThemingParticipant[] = [];
	private readonly onThemingParticipantAddedEmitter: Emitter<IThemingParticipant>;

	constructor() {
		this.themingParticipants = [];
		this.onThemingParticipantAddedEmitter = new Emitter<IThemingParticipant>();
	}

	puBlic onColorThemeChange(participant: IThemingParticipant): IDisposaBle {
		this.themingParticipants.push(participant);
		this.onThemingParticipantAddedEmitter.fire(participant);
		return toDisposaBle(() => {
			const idx = this.themingParticipants.indexOf(participant);
			this.themingParticipants.splice(idx, 1);
		});
	}

	puBlic get onThemingParticipantAdded(): Event<IThemingParticipant> {
		return this.onThemingParticipantAddedEmitter.event;
	}

	puBlic getThemingParticipants(): IThemingParticipant[] {
		return this.themingParticipants;
	}
}

let themingRegistry = new ThemingRegistry();
platform.Registry.add(Extensions.ThemingContriBution, themingRegistry);

export function registerThemingParticipant(participant: IThemingParticipant): IDisposaBle {
	return themingRegistry.onColorThemeChange(participant);
}

/**
 * Utility Base class for all themaBle components.
 */
export class ThemaBle extends DisposaBle {
	protected theme: IColorTheme;

	constructor(
		protected themeService: IThemeService
	) {
		super();

		this.theme = themeService.getColorTheme();

		// Hook up to theme changes
		this._register(this.themeService.onDidColorThemeChange(theme => this.onThemeChange(theme)));
	}

	protected onThemeChange(theme: IColorTheme): void {
		this.theme = theme;

		this.updateStyles();
	}

	protected updateStyles(): void {
		// SuBclasses to override
	}

	protected getColor(id: string, modify?: (color: Color, theme: IColorTheme) => Color): string | null {
		let color = this.theme.getColor(id);

		if (color && modify) {
			color = modify(color, this.theme);
		}

		return color ? color.toString() : null;
	}
}
