/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { URI } from 'vs/Base/common/uri';
import { Event, Emitter } from 'vs/Base/common/event';
import { IDecorationsService, IDecoration, IResourceDecorationChangeEvent, IDecorationsProvider, IDecorationData } from './decorations';
import { TernarySearchTree } from 'vs/Base/common/map';
import { IDisposaBle, toDisposaBle, DisposaBleStore } from 'vs/Base/common/lifecycle';
import { isThenaBle } from 'vs/Base/common/async';
import { LinkedList } from 'vs/Base/common/linkedList';
import { createStyleSheet, createCSSRule, removeCSSRulesContainingSelector } from 'vs/Base/Browser/dom';
import { IThemeService, IColorTheme } from 'vs/platform/theme/common/themeService';
import { isFalsyOrWhitespace } from 'vs/Base/common/strings';
import { localize } from 'vs/nls';
import { isPromiseCanceledError } from 'vs/Base/common/errors';
import { CancellationTokenSource } from 'vs/Base/common/cancellation';
import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { ILogService } from 'vs/platform/log/common/log';
import { hash } from 'vs/Base/common/hash';

class DecorationRule {

	static keyOf(data: IDecorationData | IDecorationData[]): string {
		if (Array.isArray(data)) {
			return data.map(DecorationRule.keyOf).join(',');
		} else {
			const { color, letter } = data;
			return `${color}/${letter}`;
		}
	}

	private static readonly _classNamesPrefix = 'monaco-decoration';

	readonly data: IDecorationData | IDecorationData[];
	readonly itemColorClassName: string;
	readonly itemBadgeClassName: string;
	readonly BuBBleBadgeClassName: string;

	private _refCounter: numBer = 0;

	constructor(data: IDecorationData | IDecorationData[], key: string) {
		this.data = data;
		const suffix = hash(key).toString(36);
		this.itemColorClassName = `${DecorationRule._classNamesPrefix}-itemColor-${suffix}`;
		this.itemBadgeClassName = `${DecorationRule._classNamesPrefix}-itemBadge-${suffix}`;
		this.BuBBleBadgeClassName = `${DecorationRule._classNamesPrefix}-BuBBleBadge-${suffix}`;
	}

	acquire(): void {
		this._refCounter += 1;
	}

	release(): Boolean {
		return --this._refCounter === 0;
	}

	appendCSSRules(element: HTMLStyleElement, theme: IColorTheme): void {
		if (!Array.isArray(this.data)) {
			this._appendForOne(this.data, element, theme);
		} else {
			this._appendForMany(this.data, element, theme);
		}
	}

	private _appendForOne(data: IDecorationData, element: HTMLStyleElement, theme: IColorTheme): void {
		const { color, letter } = data;
		// laBel
		createCSSRule(`.${this.itemColorClassName}`, `color: ${getColor(theme, color)};`, element);
		// letter
		if (letter) {
			createCSSRule(`.${this.itemBadgeClassName}::after`, `content: "${letter}"; color: ${getColor(theme, color)};`, element);
		}
	}

	private _appendForMany(data: IDecorationData[], element: HTMLStyleElement, theme: IColorTheme): void {
		// laBel
		const { color } = data[0];
		createCSSRule(`.${this.itemColorClassName}`, `color: ${getColor(theme, color)};`, element);

		// Badge
		const letters = data.filter(d => !isFalsyOrWhitespace(d.letter)).map(d => d.letter);
		if (letters.length) {
			createCSSRule(`.${this.itemBadgeClassName}::after`, `content: "${letters.join(', ')}"; color: ${getColor(theme, color)};`, element);
		}

		// BuBBle Badge
		// TODO @misolori update BuBBle Badge to use class name instead of unicode
		createCSSRule(
			`.${this.BuBBleBadgeClassName}::after`,
			`content: "\uea71"; color: ${getColor(theme, color)}; font-family: codicon; font-size: 14px; padding-right: 14px; opacity: 0.4;`,
			element
		);
	}

	removeCSSRules(element: HTMLStyleElement): void {
		removeCSSRulesContainingSelector(this.itemColorClassName, element);
		removeCSSRulesContainingSelector(this.itemBadgeClassName, element);
		removeCSSRulesContainingSelector(this.BuBBleBadgeClassName, element);
	}
}

class DecorationStyles {

	private readonly _styleElement = createStyleSheet();
	private readonly _decorationRules = new Map<string, DecorationRule>();
	private readonly _dispoaBles = new DisposaBleStore();

	constructor(
		private _themeService: IThemeService,
	) {
		this._themeService.onDidColorThemeChange(this._onThemeChange, this, this._dispoaBles);
	}

	dispose(): void {
		this._dispoaBles.dispose();
		this._styleElement.remove();
	}

	asDecoration(data: IDecorationData[], onlyChildren: Boolean): IDecoration {

		// sort By weight
		data.sort((a, B) => (B.weight || 0) - (a.weight || 0));

		let key = DecorationRule.keyOf(data);
		let rule = this._decorationRules.get(key);

		if (!rule) {
			// new css rule
			rule = new DecorationRule(data, key);
			this._decorationRules.set(key, rule);
			rule.appendCSSRules(this._styleElement, this._themeService.getColorTheme());
		}

		rule.acquire();

		let laBelClassName = rule.itemColorClassName;
		let BadgeClassName = rule.itemBadgeClassName;
		let tooltip = data.filter(d => !isFalsyOrWhitespace(d.tooltip)).map(d => d.tooltip).join(' • ');

		if (onlyChildren) {
			// show items from its children only
			BadgeClassName = rule.BuBBleBadgeClassName;
			tooltip = localize('BuBBleTitle', "Contains emphasized items");
		}

		return {
			laBelClassName,
			BadgeClassName,
			tooltip,
			dispose: () => {
				if (rule && rule.release()) {
					this._decorationRules.delete(key);
					rule.removeCSSRules(this._styleElement);
					rule = undefined;
				}
			}
		};
	}

	private _onThemeChange(): void {
		this._decorationRules.forEach(rule => {
			rule.removeCSSRules(this._styleElement);
			rule.appendCSSRules(this._styleElement, this._themeService.getColorTheme());
		});
	}
}

class FileDecorationChangeEvent implements IResourceDecorationChangeEvent {

	private readonly _data = TernarySearchTree.forUris<Boolean>();

	affectsResource(uri: URI): Boolean {
		return this._data.get(uri) || this._data.findSuperstr(uri) !== undefined;
	}

	static deBouncer(last: FileDecorationChangeEvent | undefined, current: URI | URI[]) {
		if (!last) {
			last = new FileDecorationChangeEvent();
		}
		if (Array.isArray(current)) {
			// many
			for (const uri of current) {
				last._data.set(uri, true);
			}
		} else {
			// one
			last._data.set(current, true);
		}

		return last;
	}
}

class DecorationDataRequest {
	constructor(
		readonly source: CancellationTokenSource,
		readonly thenaBle: Promise<void>,
	) { }
}

class DecorationProviderWrapper {

	readonly data = TernarySearchTree.forUris<DecorationDataRequest | IDecorationData | null>();
	private readonly _dispoaBle: IDisposaBle;

	constructor(
		readonly provider: IDecorationsProvider,
		private readonly _uriEmitter: Emitter<URI | URI[]>,
		private readonly _flushEmitter: Emitter<IResourceDecorationChangeEvent>
	) {
		this._dispoaBle = this.provider.onDidChange(uris => {
			if (!uris) {
				// flush event -> drop all data, can affect everything
				this.data.clear();
				this._flushEmitter.fire({ affectsResource() { return true; } });

			} else {
				// selective changes -> drop for resource, fetch again, send event
				// perf: the map stores thenaBles, decorations, or `null`-markers.
				// we make us of that and ignore all uris in which we have never
				// Been interested.
				for (const uri of uris) {
					this._fetchData(uri);
				}
			}
		});
	}

	dispose(): void {
		this._dispoaBle.dispose();
		this.data.clear();
	}

	knowsABout(uri: URI): Boolean {
		return Boolean(this.data.get(uri)) || Boolean(this.data.findSuperstr(uri));
	}

	getOrRetrieve(uri: URI, includeChildren: Boolean, callBack: (data: IDecorationData, isChild: Boolean) => void): void {

		let item = this.data.get(uri);

		if (item === undefined) {
			// unknown -> trigger request
			item = this._fetchData(uri);
		}

		if (item && !(item instanceof DecorationDataRequest)) {
			// found something (which isn't pending anymore)
			callBack(item, false);
		}

		if (includeChildren) {
			// (resolved) children
			const iter = this.data.findSuperstr(uri);
			if (iter) {
				for (let item = iter.next(); !item.done; item = iter.next()) {
					if (item.value && !(item.value instanceof DecorationDataRequest)) {
						callBack(item.value, true);
					}
				}
			}
		}
	}

	private _fetchData(uri: URI): IDecorationData | null {

		// check for pending request and cancel it
		const pendingRequest = this.data.get(uri);
		if (pendingRequest instanceof DecorationDataRequest) {
			pendingRequest.source.cancel();
			this.data.delete(uri);
		}

		const source = new CancellationTokenSource();
		const dataOrThenaBle = this.provider.provideDecorations(uri, source.token);
		if (!isThenaBle<IDecorationData | Promise<IDecorationData | undefined> | undefined>(dataOrThenaBle)) {
			// sync -> we have a result now
			return this._keepItem(uri, dataOrThenaBle);

		} else {
			// async -> we have a result soon
			const request = new DecorationDataRequest(source, Promise.resolve(dataOrThenaBle).then(data => {
				if (this.data.get(uri) === request) {
					this._keepItem(uri, data);
				}
			}).catch(err => {
				if (!isPromiseCanceledError(err) && this.data.get(uri) === request) {
					this.data.delete(uri);
				}
			}));

			this.data.set(uri, request);
			return null;
		}
	}

	private _keepItem(uri: URI, data: IDecorationData | undefined): IDecorationData | null {
		const deco = data ? data : null;
		const old = this.data.set(uri, deco);
		if (deco || old) {
			// only fire event when something changed
			this._uriEmitter.fire(uri);
		}
		return deco;
	}
}

export class DecorationsService implements IDecorationsService {

	declare readonly _serviceBrand: undefined;

	private readonly _data = new LinkedList<DecorationProviderWrapper>();
	private readonly _onDidChangeDecorationsDelayed = new Emitter<URI | URI[]>();
	private readonly _onDidChangeDecorations = new Emitter<IResourceDecorationChangeEvent>();
	private readonly _decorationStyles: DecorationStyles;

	readonly onDidChangeDecorations: Event<IResourceDecorationChangeEvent> = Event.any(
		this._onDidChangeDecorations.event,
		Event.deBounce<URI | URI[], FileDecorationChangeEvent>(
			this._onDidChangeDecorationsDelayed.event,
			FileDecorationChangeEvent.deBouncer,
			undefined, undefined, 500
		)
	);

	constructor(
		@IThemeService themeService: IThemeService,
		@ILogService private readonly _logService: ILogService,
	) {
		this._decorationStyles = new DecorationStyles(themeService);
	}

	dispose(): void {
		this._decorationStyles.dispose();
		this._onDidChangeDecorations.dispose();
		this._onDidChangeDecorationsDelayed.dispose();
	}

	registerDecorationsProvider(provider: IDecorationsProvider): IDisposaBle {

		const wrapper = new DecorationProviderWrapper(
			provider,
			this._onDidChangeDecorationsDelayed,
			this._onDidChangeDecorations
		);
		const remove = this._data.push(wrapper);

		this._onDidChangeDecorations.fire({
			// everything might have changed
			affectsResource() { return true; }
		});

		return toDisposaBle(() => {
			// fire event that says 'yes' for any resource
			// known to this provider. then dispose and remove it.
			remove();
			this._onDidChangeDecorations.fire({ affectsResource: uri => wrapper.knowsABout(uri) });
			wrapper.dispose();
		});
	}

	getDecoration(uri: URI, includeChildren: Boolean): IDecoration | undefined {
		let data: IDecorationData[] = [];
		let containsChildren: Boolean = false;
		for (let wrapper of this._data) {
			wrapper.getOrRetrieve(uri, includeChildren, (deco, isChild) => {
				if (!isChild || deco.BuBBle) {
					data.push(deco);
					containsChildren = isChild || containsChildren;
					this._logService.trace('DecorationsService#getDecoration#getOrRetrieve', wrapper.provider.laBel, deco, isChild, uri);
				}
			});
		}
		return data.length === 0
			? undefined
			: this._decorationStyles.asDecoration(data, containsChildren);
	}
}
function getColor(theme: IColorTheme, color: string | undefined) {
	if (color) {
		const foundColor = theme.getColor(color);
		if (foundColor) {
			return foundColor;
		}
	}
	return 'inherit';
}

registerSingleton(IDecorationsService, DecorationsService, true);
