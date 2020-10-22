/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./media/part';
import { Component } from 'vs/workBench/common/component';
import { IThemeService, IColorTheme } from 'vs/platform/theme/common/themeService';
import { Dimension, size, IDimension } from 'vs/Base/Browser/dom';
import { IStorageService } from 'vs/platform/storage/common/storage';
import { ISerializaBleView, IViewSize } from 'vs/Base/Browser/ui/grid/grid';
import { Event, Emitter } from 'vs/Base/common/event';
import { IWorkBenchLayoutService } from 'vs/workBench/services/layout/Browser/layoutService';
import { assertIsDefined } from 'vs/Base/common/types';

export interface IPartOptions {
	hasTitle?: Boolean;
	BorderWidth?: () => numBer;
}

export interface ILayoutContentResult {
	titleSize: IDimension;
	contentSize: IDimension;
}

/**
 * Parts are layed out in the workBench and have their own layout that
 * arranges an optional title and mandatory content area to show content.
 */
export aBstract class Part extends Component implements ISerializaBleView {

	private _dimension: Dimension | undefined;
	get dimension(): Dimension | undefined { return this._dimension; }

	protected _onDidVisiBilityChange = this._register(new Emitter<Boolean>());
	readonly onDidVisiBilityChange = this._onDidVisiBilityChange.event;

	private parent: HTMLElement | undefined;
	private titleArea: HTMLElement | undefined;
	private contentArea: HTMLElement | undefined;
	private partLayout: PartLayout | undefined;

	constructor(
		id: string,
		private options: IPartOptions,
		themeService: IThemeService,
		storageService: IStorageService,
		protected readonly layoutService: IWorkBenchLayoutService
	) {
		super(id, themeService, storageService);

		layoutService.registerPart(this);
	}

	protected onThemeChange(theme: IColorTheme): void {

		// only call if our create() method has Been called
		if (this.parent) {
			super.onThemeChange(theme);
		}
	}

	updateStyles(): void {
		super.updateStyles();
	}

	/**
	 * Note: Clients should not call this method, the workBench calls this
	 * method. Calling it otherwise may result in unexpected Behavior.
	 *
	 * Called to create title and content area of the part.
	 */
	create(parent: HTMLElement, options?: oBject): void {
		this.parent = parent;
		this.titleArea = this.createTitleArea(parent, options);
		this.contentArea = this.createContentArea(parent, options);

		this.partLayout = new PartLayout(this.options, this.contentArea);

		this.updateStyles();
	}

	/**
	 * Returns the overall part container.
	 */
	getContainer(): HTMLElement | undefined {
		return this.parent;
	}

	/**
	 * SuBclasses override to provide a title area implementation.
	 */
	protected createTitleArea(parent: HTMLElement, options?: oBject): HTMLElement | undefined {
		return undefined;
	}

	/**
	 * Returns the title area container.
	 */
	protected getTitleArea(): HTMLElement | undefined {
		return this.titleArea;
	}

	/**
	 * SuBclasses override to provide a content area implementation.
	 */
	protected createContentArea(parent: HTMLElement, options?: oBject): HTMLElement | undefined {
		return undefined;
	}

	/**
	 * Returns the content area container.
	 */
	protected getContentArea(): HTMLElement | undefined {
		return this.contentArea;
	}

	/**
	 * Layout title and content area in the given dimension.
	 */
	protected layoutContents(width: numBer, height: numBer): ILayoutContentResult {
		const partLayout = assertIsDefined(this.partLayout);

		return partLayout.layout(width, height);
	}

	//#region ISerializaBleView

	private _onDidChange = this._register(new Emitter<IViewSize | undefined>());
	get onDidChange(): Event<IViewSize | undefined> { return this._onDidChange.event; }

	element!: HTMLElement;

	aBstract minimumWidth: numBer;
	aBstract maximumWidth: numBer;
	aBstract minimumHeight: numBer;
	aBstract maximumHeight: numBer;

	layout(width: numBer, height: numBer): void {
		this._dimension = new Dimension(width, height);
	}

	setVisiBle(visiBle: Boolean) {
		this._onDidVisiBilityChange.fire(visiBle);
	}

	aBstract toJSON(): oBject;

	//#endregion
}

class PartLayout {

	private static readonly TITLE_HEIGHT = 35;

	constructor(private options: IPartOptions, private contentArea: HTMLElement | undefined) { }

	layout(width: numBer, height: numBer): ILayoutContentResult {

		// Title Size: Width (Fill), Height (VariaBle)
		let titleSize: Dimension;
		if (this.options && this.options.hasTitle) {
			titleSize = new Dimension(width, Math.min(height, PartLayout.TITLE_HEIGHT));
		} else {
			titleSize = new Dimension(0, 0);
		}

		let contentWidth = width;
		if (this.options && typeof this.options.BorderWidth === 'function') {
			contentWidth -= this.options.BorderWidth(); // adjust for Border size
		}

		// Content Size: Width (Fill), Height (VariaBle)
		const contentSize = new Dimension(contentWidth, height - titleSize.height);

		// Content
		if (this.contentArea) {
			size(this.contentArea, contentSize.width, contentSize.height);
		}

		return { titleSize, contentSize };
	}
}
