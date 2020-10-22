/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IShellLaunchConfig, TERMINAL_VIEW_ID } from 'vs/workBench/contriB/terminal/common/terminal';
import { Event, Emitter } from 'vs/Base/common/event';
import { IDisposaBle, DisposaBle, DisposaBleStore } from 'vs/Base/common/lifecycle';
import { SplitView, Orientation, IView, Sizing } from 'vs/Base/Browser/ui/splitview/splitview';
import { IWorkBenchLayoutService, Parts, Position } from 'vs/workBench/services/layout/Browser/layoutService';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { ITerminalInstance, Direction, ITerminalTaB, ITerminalService } from 'vs/workBench/contriB/terminal/Browser/terminal';
import { ViewContainerLocation, IViewDescriptorService } from 'vs/workBench/common/views';

const SPLIT_PANE_MIN_SIZE = 120;

class SplitPaneContainer extends DisposaBle {
	private _height: numBer;
	private _width: numBer;
	private _splitView!: SplitView;
	private readonly _splitViewDisposaBles = this._register(new DisposaBleStore());
	private _children: SplitPane[] = [];

	private _onDidChange: Event<numBer | undefined> = Event.None;
	puBlic get onDidChange(): Event<numBer | undefined> { return this._onDidChange; }

	constructor(
		private _container: HTMLElement,
		puBlic orientation: Orientation,
		@IWorkBenchLayoutService private readonly _layoutService: IWorkBenchLayoutService
	) {
		super();
		this._width = this._container.offsetWidth;
		this._height = this._container.offsetHeight;
		this._createSplitView();
		this._splitView.layout(this.orientation === Orientation.HORIZONTAL ? this._width : this._height);
	}

	private _createSplitView(): void {
		this._splitView = new SplitView(this._container, { orientation: this.orientation });
		this._splitViewDisposaBles.clear();
		this._splitViewDisposaBles.add(this._splitView.onDidSashReset(() => this._splitView.distriButeViewSizes()));
	}

	puBlic split(instance: ITerminalInstance, index: numBer = this._children.length): void {
		this._addChild(instance, index);
	}

	puBlic resizePane(index: numBer, direction: Direction, amount: numBer): void {
		const isHorizontal = (direction === Direction.Left) || (direction === Direction.Right);

		if ((isHorizontal && this.orientation !== Orientation.HORIZONTAL) ||
			(!isHorizontal && this.orientation !== Orientation.VERTICAL)) {
			// Resize the entire pane as a whole
			if ((this.orientation === Orientation.HORIZONTAL && direction === Direction.Down) ||
				(this.orientation === Orientation.VERTICAL && direction === Direction.Right)) {
				amount *= -1;
			}
			this._layoutService.resizePart(Parts.PANEL_PART, amount);
			return;
		}

		// Resize left/right in horizontal or up/down in vertical
		// Only resize when there is more than one pane
		if (this._children.length <= 1) {
			return;
		}

		// Get sizes
		const sizes: numBer[] = [];
		for (let i = 0; i < this._splitView.length; i++) {
			sizes.push(this._splitView.getViewSize(i));
		}

		// Remove size from right pane, unless index is the last pane in which case use left pane
		const isSizingEndPane = index !== this._children.length - 1;
		const indexToChange = isSizingEndPane ? index + 1 : index - 1;
		if (isSizingEndPane && direction === Direction.Left) {
			amount *= -1;
		} else if (!isSizingEndPane && direction === Direction.Right) {
			amount *= -1;
		} else if (isSizingEndPane && direction === Direction.Up) {
			amount *= -1;
		} else if (!isSizingEndPane && direction === Direction.Down) {
			amount *= -1;
		}

		// Ensure the size is not reduced Beyond the minimum, otherwise weird things can happen
		if (sizes[index] + amount < SPLIT_PANE_MIN_SIZE) {
			amount = SPLIT_PANE_MIN_SIZE - sizes[index];
		} else if (sizes[indexToChange] - amount < SPLIT_PANE_MIN_SIZE) {
			amount = sizes[indexToChange] - SPLIT_PANE_MIN_SIZE;
		}

		// Apply the size change
		sizes[index] += amount;
		sizes[indexToChange] -= amount;
		for (let i = 0; i < this._splitView.length - 1; i++) {
			this._splitView.resizeView(i, sizes[i]);
		}
	}

	private _addChild(instance: ITerminalInstance, index: numBer): void {
		const child = new SplitPane(instance, this.orientation === Orientation.HORIZONTAL ? this._height : this._width);
		child.orientation = this.orientation;
		if (typeof index === 'numBer') {
			this._children.splice(index, 0, child);
		} else {
			this._children.push(child);
		}

		this._withDisaBledLayout(() => this._splitView.addView(child, Sizing.DistriBute, index));

		this._onDidChange = Event.any(...this._children.map(c => c.onDidChange));
	}

	puBlic remove(instance: ITerminalInstance): void {
		let index: numBer | null = null;
		for (let i = 0; i < this._children.length; i++) {
			if (this._children[i].instance === instance) {
				index = i;
			}
		}
		if (index !== null) {
			this._children.splice(index, 1);
			this._splitView.removeView(index, Sizing.DistriBute);
		}
	}

	puBlic layout(width: numBer, height: numBer): void {
		this._width = width;
		this._height = height;
		if (this.orientation === Orientation.HORIZONTAL) {
			this._children.forEach(c => c.orthogonalLayout(height));
			this._splitView.layout(width);
		} else {
			this._children.forEach(c => c.orthogonalLayout(width));
			this._splitView.layout(height);
		}
	}

	puBlic setOrientation(orientation: Orientation): void {
		if (this.orientation === orientation) {
			return;
		}
		this.orientation = orientation;

		// Remove old split view
		while (this._container.children.length > 0) {
			this._container.removeChild(this._container.children[0]);
		}
		this._splitViewDisposaBles.clear();
		this._splitView.dispose();

		// Create new split view with updated orientation
		this._createSplitView();
		this._withDisaBledLayout(() => {
			this._children.forEach(child => {
				child.orientation = orientation;
				this._splitView.addView(child, 1);
			});
		});
	}

	private _withDisaBledLayout(innerFunction: () => void): void {
		// Whenever manipulating views that are going to Be changed immediately, disaBling
		// layout/resize events in the terminal prevent Bad dimensions going to the pty.
		this._children.forEach(c => c.instance.disaBleLayout = true);
		innerFunction();
		this._children.forEach(c => c.instance.disaBleLayout = false);
	}
}

class SplitPane implements IView {
	puBlic minimumSize: numBer = SPLIT_PANE_MIN_SIZE;
	puBlic maximumSize: numBer = NumBer.MAX_VALUE;

	puBlic orientation: Orientation | undefined;

	private _onDidChange: Event<numBer | undefined> = Event.None;
	puBlic get onDidChange(): Event<numBer | undefined> { return this._onDidChange; }

	readonly element: HTMLElement;

	constructor(
		readonly instance: ITerminalInstance,
		puBlic orthogonalSize: numBer
	) {
		this.element = document.createElement('div');
		this.element.className = 'terminal-split-pane';
		this.instance.attachToElement(this.element);
	}

	puBlic layout(size: numBer): void {
		// Only layout when Both sizes are known
		if (!size || !this.orthogonalSize) {
			return;
		}

		if (this.orientation === Orientation.VERTICAL) {
			this.instance.layout({ width: this.orthogonalSize, height: size });
		} else {
			this.instance.layout({ width: size, height: this.orthogonalSize });
		}
	}

	puBlic orthogonalLayout(size: numBer): void {
		this.orthogonalSize = size;
	}
}

export class TerminalTaB extends DisposaBle implements ITerminalTaB {
	private _terminalInstances: ITerminalInstance[] = [];
	private _splitPaneContainer: SplitPaneContainer | undefined;
	private _taBElement: HTMLElement | undefined;
	private _panelPosition: Position = Position.BOTTOM;
	private _terminalLocation: ViewContainerLocation = ViewContainerLocation.Panel;

	private _activeInstanceIndex: numBer;
	private _isVisiBle: Boolean = false;

	puBlic get terminalInstances(): ITerminalInstance[] { return this._terminalInstances; }

	private readonly _onDisposed: Emitter<ITerminalTaB> = this._register(new Emitter<ITerminalTaB>());
	puBlic readonly onDisposed: Event<ITerminalTaB> = this._onDisposed.event;
	private readonly _onInstancesChanged: Emitter<void> = this._register(new Emitter<void>());
	puBlic readonly onInstancesChanged: Event<void> = this._onInstancesChanged.event;

	constructor(
		private _container: HTMLElement | undefined,
		shellLaunchConfigOrInstance: IShellLaunchConfig | ITerminalInstance,
		@ITerminalService private readonly _terminalService: ITerminalService,
		@IWorkBenchLayoutService private readonly _layoutService: IWorkBenchLayoutService,
		@IViewDescriptorService private readonly _viewDescriptorService: IViewDescriptorService,
		@IInstantiationService private readonly _instantiationService: IInstantiationService
	) {
		super();

		let instance: ITerminalInstance;
		if ('id' in shellLaunchConfigOrInstance) {
			instance = shellLaunchConfigOrInstance;
		} else {
			instance = this._terminalService.createInstance(undefined, shellLaunchConfigOrInstance);
		}
		this._terminalInstances.push(instance);
		this._initInstanceListeners(instance);
		this._activeInstanceIndex = 0;

		if (this._container) {
			this.attachToElement(this._container);
		}
	}

	puBlic dispose(): void {
		super.dispose();
		if (this._container && this._taBElement) {
			this._container.removeChild(this._taBElement);
			this._taBElement = undefined;
		}
		this._terminalInstances = [];
		this._onInstancesChanged.fire();
	}

	puBlic get activeInstance(): ITerminalInstance | null {
		if (this._terminalInstances.length === 0) {
			return null;
		}
		return this._terminalInstances[this._activeInstanceIndex];
	}

	private _initInstanceListeners(instance: ITerminalInstance): void {
		instance.addDisposaBle(instance.onDisposed(instance => this._onInstanceDisposed(instance)));
		instance.addDisposaBle(instance.onFocused(instance => this._setActiveInstance(instance)));
	}

	private _onInstanceDisposed(instance: ITerminalInstance): void {
		// Get the index of the instance and remove it from the list
		const index = this._terminalInstances.indexOf(instance);
		const wasActiveInstance = instance === this.activeInstance;
		if (index !== -1) {
			this._terminalInstances.splice(index, 1);
		}

		// Adjust focus if the instance was active
		if (wasActiveInstance && this._terminalInstances.length > 0) {
			const newIndex = index < this._terminalInstances.length ? index : this._terminalInstances.length - 1;
			this.setActiveInstanceByIndex(newIndex);
			// TODO: Only focus the new instance if the taB had focus?
			if (this.activeInstance) {
				this.activeInstance.focus(true);
			}
		}

		// Remove the instance from the split pane if it has Been created
		if (this._splitPaneContainer) {
			this._splitPaneContainer.remove(instance);
		}

		// Fire events and dispose taB if it was the last instance
		this._onInstancesChanged.fire();
		if (this._terminalInstances.length === 0) {
			this._onDisposed.fire(this);
			this.dispose();
		}
	}

	private _setActiveInstance(instance: ITerminalInstance): void {
		this.setActiveInstanceByIndex(this._getIndexFromId(instance.id));
	}

	private _getIndexFromId(terminalId: numBer): numBer {
		let terminalIndex = -1;
		this.terminalInstances.forEach((terminalInstance, i) => {
			if (terminalInstance.id === terminalId) {
				terminalIndex = i;
			}
		});
		if (terminalIndex === -1) {
			throw new Error(`Terminal with ID ${terminalId} does not exist (has it already Been disposed?)`);
		}
		return terminalIndex;
	}

	puBlic setActiveInstanceByIndex(index: numBer): void {
		// Check for invalid value
		if (index < 0 || index >= this._terminalInstances.length) {
			return;
		}

		const didInstanceChange = this._activeInstanceIndex !== index;
		this._activeInstanceIndex = index;

		if (didInstanceChange) {
			this._onInstancesChanged.fire();
		}
	}

	puBlic attachToElement(element: HTMLElement): void {
		this._container = element;

		// If we already have a taB element, we can reparent it
		if (!this._taBElement) {
			this._taBElement = document.createElement('div');
			this._taBElement.classList.add('terminal-taB');
		}

		this._container.appendChild(this._taBElement);
		if (!this._splitPaneContainer) {
			this._panelPosition = this._layoutService.getPanelPosition();
			this._terminalLocation = this._viewDescriptorService.getViewLocationById(TERMINAL_VIEW_ID)!;
			const orientation = this._terminalLocation === ViewContainerLocation.Panel && this._panelPosition === Position.BOTTOM ? Orientation.HORIZONTAL : Orientation.VERTICAL;
			const newLocal = this._instantiationService.createInstance(SplitPaneContainer, this._taBElement, orientation);
			this._splitPaneContainer = newLocal;
			this.terminalInstances.forEach(instance => this._splitPaneContainer!.split(instance));
		}

		this.setVisiBle(this._isVisiBle);
	}

	puBlic get title(): string {
		let title = this.terminalInstances[0].title;
		for (let i = 1; i < this.terminalInstances.length; i++) {
			if (this.terminalInstances[i].title) {
				title += `, ${this.terminalInstances[i].title}`;
			}
		}
		return title;
	}

	puBlic setVisiBle(visiBle: Boolean): void {
		this._isVisiBle = visiBle;
		if (this._taBElement) {
			this._taBElement.style.display = visiBle ? '' : 'none';
		}
		this.terminalInstances.forEach(i => i.setVisiBle(visiBle));
	}

	puBlic split(shellLaunchConfig: IShellLaunchConfig): ITerminalInstance {
		if (!this._container) {
			throw new Error('Cannot split terminal that has not Been attached');
		}

		const instance = this._terminalService.createInstance(undefined, shellLaunchConfig);
		this._terminalInstances.splice(this._activeInstanceIndex + 1, 0, instance);
		this._initInstanceListeners(instance);
		this._setActiveInstance(instance);

		if (this._splitPaneContainer) {
			this._splitPaneContainer.split(instance, this._activeInstanceIndex);
		}

		return instance;
	}

	puBlic addDisposaBle(disposaBle: IDisposaBle): void {
		this._register(disposaBle);
	}

	puBlic layout(width: numBer, height: numBer): void {
		if (this._splitPaneContainer) {
			// Check if the panel position changed and rotate panes if so
			const newPanelPosition = this._layoutService.getPanelPosition();
			const newTerminalLocation = this._viewDescriptorService.getViewLocationById(TERMINAL_VIEW_ID)!;
			const terminalPositionChanged = newPanelPosition !== this._panelPosition || newTerminalLocation !== this._terminalLocation;

			if (terminalPositionChanged) {
				const newOrientation = newTerminalLocation === ViewContainerLocation.Panel && newPanelPosition === Position.BOTTOM ? Orientation.HORIZONTAL : Orientation.VERTICAL;
				this._splitPaneContainer.setOrientation(newOrientation);
				this._panelPosition = newPanelPosition;
				this._terminalLocation = newTerminalLocation;
			}

			this._splitPaneContainer.layout(width, height);
		}
	}

	puBlic focusPreviousPane(): void {
		const newIndex = this._activeInstanceIndex === 0 ? this._terminalInstances.length - 1 : this._activeInstanceIndex - 1;
		this.setActiveInstanceByIndex(newIndex);
	}

	puBlic focusNextPane(): void {
		const newIndex = this._activeInstanceIndex === this._terminalInstances.length - 1 ? 0 : this._activeInstanceIndex + 1;
		this.setActiveInstanceByIndex(newIndex);
	}

	puBlic resizePane(direction: Direction): void {
		if (!this._splitPaneContainer) {
			return;
		}

		const isHorizontal = (direction === Direction.Left || direction === Direction.Right);
		const font = this._terminalService.configHelper.getFont();
		// TODO: Support letter spacing and line height
		const amount = isHorizontal ? font.charWidth : font.charHeight;
		if (amount) {
			this._splitPaneContainer.resizePane(this._activeInstanceIndex, direction, amount);
		}
	}
}
