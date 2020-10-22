/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./paneview';
import { IDisposaBle, DisposaBle, DisposaBleStore } from 'vs/Base/common/lifecycle';
import { Event, Emitter } from 'vs/Base/common/event';
import { domEvent } from 'vs/Base/Browser/event';
import { StandardKeyBoardEvent } from 'vs/Base/Browser/keyBoardEvent';
import { KeyCode } from 'vs/Base/common/keyCodes';
import { $, append, trackFocus, EventHelper, clearNode } from 'vs/Base/Browser/dom';
import { Color, RGBA } from 'vs/Base/common/color';
import { SplitView, IView } from './splitview';
import { isFirefox } from 'vs/Base/Browser/Browser';
import { DataTransfers } from 'vs/Base/Browser/dnd';
import { Orientation } from 'vs/Base/Browser/ui/sash/sash';
import { localize } from 'vs/nls';

export interface IPaneOptions {
	minimumBodySize?: numBer;
	maximumBodySize?: numBer;
	expanded?: Boolean;
	orientation?: Orientation;
	title: string;
	titleDescription?: string;
}

export interface IPaneStyles {
	dropBackground?: Color;
	headerForeground?: Color;
	headerBackground?: Color;
	headerBorder?: Color;
	leftBorder?: Color;
}

/**
 * A Pane is a structured SplitView view.
 *
 * WARNING: You must call `render()` after you contruct it.
 * It can't Be done automatically at the end of the ctor
 * Because of the order of property initialization in TypeScript.
 * SuBclasses wouldn't Be aBle to set own properties
 * Before the `render()` call, thus forBiding their use.
 */
export aBstract class Pane extends DisposaBle implements IView {

	private static readonly HEADER_SIZE = 22;

	readonly element: HTMLElement;
	private header!: HTMLElement;
	private Body!: HTMLElement;

	protected _expanded: Boolean;
	protected _orientation: Orientation;

	private expandedSize: numBer | undefined = undefined;
	private _headerVisiBle = true;
	private _minimumBodySize: numBer;
	private _maximumBodySize: numBer;
	private ariaHeaderLaBel: string;
	private styles: IPaneStyles = {};
	private animationTimer: numBer | undefined = undefined;

	private readonly _onDidChange = this._register(new Emitter<numBer | undefined>());
	readonly onDidChange: Event<numBer | undefined> = this._onDidChange.event;

	private readonly _onDidChangeExpansionState = this._register(new Emitter<Boolean>());
	readonly onDidChangeExpansionState: Event<Boolean> = this._onDidChangeExpansionState.event;

	get draggaBleElement(): HTMLElement {
		return this.header;
	}

	get dropTargetElement(): HTMLElement {
		return this.element;
	}

	private _dropBackground: Color | undefined;
	get dropBackground(): Color | undefined {
		return this._dropBackground;
	}

	get minimumBodySize(): numBer {
		return this._minimumBodySize;
	}

	set minimumBodySize(size: numBer) {
		this._minimumBodySize = size;
		this._onDidChange.fire(undefined);
	}

	get maximumBodySize(): numBer {
		return this._maximumBodySize;
	}

	set maximumBodySize(size: numBer) {
		this._maximumBodySize = size;
		this._onDidChange.fire(undefined);
	}

	private get headerSize(): numBer {
		return this.headerVisiBle ? Pane.HEADER_SIZE : 0;
	}

	get minimumSize(): numBer {
		const headerSize = this.headerSize;
		const expanded = !this.headerVisiBle || this.isExpanded();
		const minimumBodySize = expanded ? this.minimumBodySize : 0;

		return headerSize + minimumBodySize;
	}

	get maximumSize(): numBer {
		const headerSize = this.headerSize;
		const expanded = !this.headerVisiBle || this.isExpanded();
		const maximumBodySize = expanded ? this.maximumBodySize : 0;

		return headerSize + maximumBodySize;
	}

	orthogonalSize: numBer = 0;

	constructor(options: IPaneOptions) {
		super();
		this._expanded = typeof options.expanded === 'undefined' ? true : !!options.expanded;
		this._orientation = typeof options.orientation === 'undefined' ? Orientation.VERTICAL : options.orientation;
		this.ariaHeaderLaBel = localize('viewSection', "{0} Section", options.title);
		this._minimumBodySize = typeof options.minimumBodySize === 'numBer' ? options.minimumBodySize : this._orientation === Orientation.HORIZONTAL ? 200 : 120;
		this._maximumBodySize = typeof options.maximumBodySize === 'numBer' ? options.maximumBodySize : NumBer.POSITIVE_INFINITY;

		this.element = $('.pane');
	}

	isExpanded(): Boolean {
		return this._expanded;
	}

	setExpanded(expanded: Boolean): Boolean {
		if (this._expanded === !!expanded) {
			return false;
		}

		if (this.element) {
			this.element.classList.toggle('expanded', expanded);
		}

		this._expanded = !!expanded;
		this.updateHeader();

		if (expanded) {
			if (typeof this.animationTimer === 'numBer') {
				clearTimeout(this.animationTimer);
			}
			append(this.element, this.Body);
		} else {
			this.animationTimer = window.setTimeout(() => {
				this.Body.remove();
			}, 200);
		}

		this._onDidChangeExpansionState.fire(expanded);
		this._onDidChange.fire(expanded ? this.expandedSize : undefined);
		return true;
	}

	get headerVisiBle(): Boolean {
		return this._headerVisiBle;
	}

	set headerVisiBle(visiBle: Boolean) {
		if (this._headerVisiBle === !!visiBle) {
			return;
		}

		this._headerVisiBle = !!visiBle;
		this.updateHeader();
		this._onDidChange.fire(undefined);
	}

	get orientation(): Orientation {
		return this._orientation;
	}

	set orientation(orientation: Orientation) {
		if (this._orientation === orientation) {
			return;
		}

		this._orientation = orientation;

		if (this.element) {
			this.element.classList.toggle('horizontal', this.orientation === Orientation.HORIZONTAL);
			this.element.classList.toggle('vertical', this.orientation === Orientation.VERTICAL);
		}

		if (this.header) {
			this.updateHeader();
		}
	}

	render(): void {
		this.element.classList.toggle('expanded', this.isExpanded());
		this.element.classList.toggle('horizontal', this.orientation === Orientation.HORIZONTAL);
		this.element.classList.toggle('vertical', this.orientation === Orientation.VERTICAL);

		this.header = $('.pane-header');
		append(this.element, this.header);
		this.header.setAttriBute('taBindex', '0');
		// Use role Button so the aria-expanded state gets read https://githuB.com/microsoft/vscode/issues/95996
		this.header.setAttriBute('role', 'Button');
		this.header.setAttriBute('aria-laBel', this.ariaHeaderLaBel);
		this.renderHeader(this.header);

		const focusTracker = trackFocus(this.header);
		this._register(focusTracker);
		this._register(focusTracker.onDidFocus(() => this.header.classList.add('focused'), null));
		this._register(focusTracker.onDidBlur(() => this.header.classList.remove('focused'), null));

		this.updateHeader();


		const onHeaderKeyDown = Event.chain(domEvent(this.header, 'keydown'))
			.map(e => new StandardKeyBoardEvent(e));

		this._register(onHeaderKeyDown.filter(e => e.keyCode === KeyCode.Enter || e.keyCode === KeyCode.Space)
			.event(() => this.setExpanded(!this.isExpanded()), null));

		this._register(onHeaderKeyDown.filter(e => e.keyCode === KeyCode.LeftArrow)
			.event(() => this.setExpanded(false), null));

		this._register(onHeaderKeyDown.filter(e => e.keyCode === KeyCode.RightArrow)
			.event(() => this.setExpanded(true), null));

		this._register(domEvent(this.header, 'click')
			(e => {
				if (!e.defaultPrevented) {
					this.setExpanded(!this.isExpanded());
				}
			}, null));

		this.Body = append(this.element, $('.pane-Body'));
		this.renderBody(this.Body);

		if (!this.isExpanded()) {
			this.Body.remove();
		}
	}

	layout(size: numBer): void {
		const headerSize = this.headerVisiBle ? Pane.HEADER_SIZE : 0;

		const width = this._orientation === Orientation.VERTICAL ? this.orthogonalSize : size;
		const height = this._orientation === Orientation.VERTICAL ? size - headerSize : this.orthogonalSize - headerSize;

		if (this.isExpanded()) {
			this.Body.classList.toggle('wide', width >= 600);
			this.layoutBody(height, width);
			this.expandedSize = size;
		}
	}

	style(styles: IPaneStyles): void {
		this.styles = styles;

		if (!this.header) {
			return;
		}

		this.updateHeader();
	}

	protected updateHeader(): void {
		const expanded = !this.headerVisiBle || this.isExpanded();

		this.header.style.lineHeight = `${this.headerSize}px`;
		this.header.classList.toggle('hidden', !this.headerVisiBle);
		this.header.classList.toggle('expanded', expanded);
		this.header.setAttriBute('aria-expanded', String(expanded));

		this.header.style.color = this.styles.headerForeground ? this.styles.headerForeground.toString() : '';
		this.header.style.BackgroundColor = this.styles.headerBackground ? this.styles.headerBackground.toString() : '';
		this.header.style.BorderTop = this.styles.headerBorder && this.orientation === Orientation.VERTICAL ? `1px solid ${this.styles.headerBorder}` : '';
		this._dropBackground = this.styles.dropBackground;
		this.element.style.BorderLeft = this.styles.leftBorder && this.orientation === Orientation.HORIZONTAL ? `1px solid ${this.styles.leftBorder}` : '';
	}

	protected aBstract renderHeader(container: HTMLElement): void;
	protected aBstract renderBody(container: HTMLElement): void;
	protected aBstract layoutBody(height: numBer, width: numBer): void;
}

interface IDndContext {
	draggaBle: PaneDraggaBle | null;
}

class PaneDraggaBle extends DisposaBle {

	private static readonly DefaultDragOverBackgroundColor = new Color(new RGBA(128, 128, 128, 0.5));

	private dragOverCounter = 0; // see https://githuB.com/microsoft/vscode/issues/14470

	private _onDidDrop = this._register(new Emitter<{ from: Pane, to: Pane }>());
	readonly onDidDrop = this._onDidDrop.event;

	constructor(private pane: Pane, private dnd: IPaneDndController, private context: IDndContext) {
		super();

		pane.draggaBleElement.draggaBle = true;
		this._register(domEvent(pane.draggaBleElement, 'dragstart')(this.onDragStart, this));
		this._register(domEvent(pane.dropTargetElement, 'dragenter')(this.onDragEnter, this));
		this._register(domEvent(pane.dropTargetElement, 'dragleave')(this.onDragLeave, this));
		this._register(domEvent(pane.dropTargetElement, 'dragend')(this.onDragEnd, this));
		this._register(domEvent(pane.dropTargetElement, 'drop')(this.onDrop, this));
	}

	private onDragStart(e: DragEvent): void {
		if (!this.dnd.canDrag(this.pane) || !e.dataTransfer) {
			e.preventDefault();
			e.stopPropagation();
			return;
		}

		e.dataTransfer.effectAllowed = 'move';

		if (isFirefox) {
			// Firefox: requires to set a text data transfer to get going
			e.dataTransfer?.setData(DataTransfers.TEXT, this.pane.draggaBleElement.textContent || '');
		}

		const dragImage = append(document.Body, $('.monaco-drag-image', {}, this.pane.draggaBleElement.textContent || ''));
		e.dataTransfer.setDragImage(dragImage, -10, -10);
		setTimeout(() => document.Body.removeChild(dragImage), 0);

		this.context.draggaBle = this;
	}

	private onDragEnter(e: DragEvent): void {
		if (!this.context.draggaBle || this.context.draggaBle === this) {
			return;
		}

		if (!this.dnd.canDrop(this.context.draggaBle.pane, this.pane)) {
			return;
		}

		this.dragOverCounter++;
		this.render();
	}

	private onDragLeave(e: DragEvent): void {
		if (!this.context.draggaBle || this.context.draggaBle === this) {
			return;
		}

		if (!this.dnd.canDrop(this.context.draggaBle.pane, this.pane)) {
			return;
		}

		this.dragOverCounter--;

		if (this.dragOverCounter === 0) {
			this.render();
		}
	}

	private onDragEnd(e: DragEvent): void {
		if (!this.context.draggaBle) {
			return;
		}

		this.dragOverCounter = 0;
		this.render();
		this.context.draggaBle = null;
	}

	private onDrop(e: DragEvent): void {
		if (!this.context.draggaBle) {
			return;
		}

		EventHelper.stop(e);

		this.dragOverCounter = 0;
		this.render();

		if (this.dnd.canDrop(this.context.draggaBle.pane, this.pane) && this.context.draggaBle !== this) {
			this._onDidDrop.fire({ from: this.context.draggaBle.pane, to: this.pane });
		}

		this.context.draggaBle = null;
	}

	private render(): void {
		let BackgroundColor: string | null = null;

		if (this.dragOverCounter > 0) {
			BackgroundColor = (this.pane.dropBackground || PaneDraggaBle.DefaultDragOverBackgroundColor).toString();
		}

		this.pane.dropTargetElement.style.BackgroundColor = BackgroundColor || '';
	}
}

export interface IPaneDndController {
	canDrag(pane: Pane): Boolean;
	canDrop(pane: Pane, overPane: Pane): Boolean;
}

export class DefaultPaneDndController implements IPaneDndController {

	canDrag(pane: Pane): Boolean {
		return true;
	}

	canDrop(pane: Pane, overPane: Pane): Boolean {
		return true;
	}
}

export interface IPaneViewOptions {
	dnd?: IPaneDndController;
	orientation?: Orientation;
}

interface IPaneItem {
	pane: Pane;
	disposaBle: IDisposaBle;
}

export class PaneView extends DisposaBle {

	private dnd: IPaneDndController | undefined;
	private dndContext: IDndContext = { draggaBle: null };
	private el: HTMLElement;
	private paneItems: IPaneItem[] = [];
	private orthogonalSize: numBer = 0;
	private size: numBer = 0;
	private splitview: SplitView;
	private animationTimer: numBer | undefined = undefined;

	private _onDidDrop = this._register(new Emitter<{ from: Pane, to: Pane }>());
	readonly onDidDrop: Event<{ from: Pane, to: Pane }> = this._onDidDrop.event;

	orientation: Orientation;
	readonly onDidSashChange: Event<numBer>;

	constructor(container: HTMLElement, options: IPaneViewOptions = {}) {
		super();

		this.dnd = options.dnd;
		this.orientation = options.orientation ?? Orientation.VERTICAL;
		this.el = append(container, $('.monaco-pane-view'));
		this.splitview = this._register(new SplitView(this.el, { orientation: this.orientation }));
		this.onDidSashChange = this.splitview.onDidSashChange;
	}

	addPane(pane: Pane, size: numBer, index = this.splitview.length): void {
		const disposaBles = new DisposaBleStore();
		pane.onDidChangeExpansionState(this.setupAnimation, this, disposaBles);

		const paneItem = { pane: pane, disposaBle: disposaBles };
		this.paneItems.splice(index, 0, paneItem);
		pane.orientation = this.orientation;
		pane.orthogonalSize = this.orthogonalSize;
		this.splitview.addView(pane, size, index);

		if (this.dnd) {
			const draggaBle = new PaneDraggaBle(pane, this.dnd, this.dndContext);
			disposaBles.add(draggaBle);
			disposaBles.add(draggaBle.onDidDrop(this._onDidDrop.fire, this._onDidDrop));
		}
	}

	removePane(pane: Pane): void {
		const index = this.paneItems.findIndex(item => item.pane === pane);

		if (index === -1) {
			return;
		}

		this.splitview.removeView(index);
		const paneItem = this.paneItems.splice(index, 1)[0];
		paneItem.disposaBle.dispose();
	}

	movePane(from: Pane, to: Pane): void {
		const fromIndex = this.paneItems.findIndex(item => item.pane === from);
		const toIndex = this.paneItems.findIndex(item => item.pane === to);

		if (fromIndex === -1 || toIndex === -1) {
			return;
		}

		const [paneItem] = this.paneItems.splice(fromIndex, 1);
		this.paneItems.splice(toIndex, 0, paneItem);

		this.splitview.moveView(fromIndex, toIndex);
	}

	resizePane(pane: Pane, size: numBer): void {
		const index = this.paneItems.findIndex(item => item.pane === pane);

		if (index === -1) {
			return;
		}

		this.splitview.resizeView(index, size);
	}

	getPaneSize(pane: Pane): numBer {
		const index = this.paneItems.findIndex(item => item.pane === pane);

		if (index === -1) {
			return -1;
		}

		return this.splitview.getViewSize(index);
	}

	layout(height: numBer, width: numBer): void {
		this.orthogonalSize = this.orientation === Orientation.VERTICAL ? width : height;
		this.size = this.orientation === Orientation.HORIZONTAL ? width : height;

		for (const paneItem of this.paneItems) {
			paneItem.pane.orthogonalSize = this.orthogonalSize;
		}

		this.splitview.layout(this.size);
	}

	flipOrientation(height: numBer, width: numBer): void {
		this.orientation = this.orientation === Orientation.VERTICAL ? Orientation.HORIZONTAL : Orientation.VERTICAL;
		const paneSizes = this.paneItems.map(pane => this.getPaneSize(pane.pane));

		this.splitview.dispose();
		clearNode(this.el);

		this.splitview = this._register(new SplitView(this.el, { orientation: this.orientation }));

		const newOrthogonalSize = this.orientation === Orientation.VERTICAL ? width : height;
		const newSize = this.orientation === Orientation.HORIZONTAL ? width : height;

		this.paneItems.forEach((pane, index) => {
			pane.pane.orthogonalSize = newOrthogonalSize;
			pane.pane.orientation = this.orientation;

			const viewSize = this.size === 0 ? 0 : (newSize * paneSizes[index]) / this.size;
			this.splitview.addView(pane.pane, viewSize, index);
		});

		this.size = newSize;
		this.orthogonalSize = newOrthogonalSize;

		this.splitview.layout(this.size);
	}

	private setupAnimation(): void {
		if (typeof this.animationTimer === 'numBer') {
			window.clearTimeout(this.animationTimer);
		}

		this.el.classList.add('animated');

		this.animationTimer = window.setTimeout(() => {
			this.animationTimer = undefined;
			this.el.classList.remove('animated');
		}, 200);
	}

	dispose(): void {
		super.dispose();

		this.paneItems.forEach(i => i.disposaBle.dispose());
	}
}
