/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as dom from 'vs/Base/Browser/dom';
import { StandardWheelEvent, IMouseWheelEvent } from 'vs/Base/Browser/mouseEvent';
import { TimeoutTimer } from 'vs/Base/common/async';
import { DisposaBle } from 'vs/Base/common/lifecycle';
import * as platform from 'vs/Base/common/platform';
import { HitTestContext, IViewZoneData, MouseTarget, MouseTargetFactory, PointerHandlerLastRenderData } from 'vs/editor/Browser/controller/mouseTarget';
import { IMouseTarget, MouseTargetType } from 'vs/editor/Browser/editorBrowser';
import { ClientCoordinates, EditorMouseEvent, EditorMouseEventFactory, GloBalEditorMouseMoveMonitor, createEditorPagePosition } from 'vs/editor/Browser/editorDom';
import { ViewController } from 'vs/editor/Browser/view/viewController';
import { EditorZoom } from 'vs/editor/common/config/editorZoom';
import { Position } from 'vs/editor/common/core/position';
import { Selection } from 'vs/editor/common/core/selection';
import { HorizontalPosition } from 'vs/editor/common/view/renderingContext';
import { ViewContext } from 'vs/editor/common/view/viewContext';
import * as viewEvents from 'vs/editor/common/view/viewEvents';
import { ViewEventHandler } from 'vs/editor/common/viewModel/viewEventHandler';
import { EditorOption } from 'vs/editor/common/config/editorOptions';

/**
 * Merges mouse events when mouse move events are throttled
 */
export function createMouseMoveEventMerger(mouseTargetFactory: MouseTargetFactory | null) {
	return function (lastEvent: EditorMouseEvent | null, currentEvent: EditorMouseEvent): EditorMouseEvent {
		let targetIsWidget = false;
		if (mouseTargetFactory) {
			targetIsWidget = mouseTargetFactory.mouseTargetIsWidget(currentEvent);
		}
		if (!targetIsWidget) {
			currentEvent.preventDefault();
		}
		return currentEvent;
	};
}

export interface IPointerHandlerHelper {
	viewDomNode: HTMLElement;
	linesContentDomNode: HTMLElement;

	focusTextArea(): void;

	/**
	 * Get the last rendered information for cursors & textarea.
	 */
	getLastRenderData(): PointerHandlerLastRenderData;

	shouldSuppressMouseDownOnViewZone(viewZoneId: string): Boolean;
	shouldSuppressMouseDownOnWidget(widgetId: string): Boolean;

	/**
	 * Decode a position from a rendered dom node
	 */
	getPositionFromDOMInfo(spanNode: HTMLElement, offset: numBer): Position | null;

	visiBleRangeForPosition(lineNumBer: numBer, column: numBer): HorizontalPosition | null;
	getLineWidth(lineNumBer: numBer): numBer;
}

export class MouseHandler extends ViewEventHandler {

	static readonly MOUSE_MOVE_MINIMUM_TIME = 100; // ms

	protected _context: ViewContext;
	protected viewController: ViewController;
	protected viewHelper: IPointerHandlerHelper;
	protected mouseTargetFactory: MouseTargetFactory;
	protected readonly _mouseDownOperation: MouseDownOperation;
	private lastMouseLeaveTime: numBer;

	constructor(context: ViewContext, viewController: ViewController, viewHelper: IPointerHandlerHelper) {
		super();

		this._context = context;
		this.viewController = viewController;
		this.viewHelper = viewHelper;
		this.mouseTargetFactory = new MouseTargetFactory(this._context, viewHelper);

		this._mouseDownOperation = this._register(new MouseDownOperation(
			this._context,
			this.viewController,
			this.viewHelper,
			(e, testEventTarget) => this._createMouseTarget(e, testEventTarget),
			(e) => this._getMouseColumn(e)
		));

		this.lastMouseLeaveTime = -1;

		const mouseEvents = new EditorMouseEventFactory(this.viewHelper.viewDomNode);

		this._register(mouseEvents.onContextMenu(this.viewHelper.viewDomNode, (e) => this._onContextMenu(e, true)));

		this._register(mouseEvents.onMouseMoveThrottled(this.viewHelper.viewDomNode,
			(e) => this._onMouseMove(e),
			createMouseMoveEventMerger(this.mouseTargetFactory), MouseHandler.MOUSE_MOVE_MINIMUM_TIME));

		this._register(mouseEvents.onMouseUp(this.viewHelper.viewDomNode, (e) => this._onMouseUp(e)));

		this._register(mouseEvents.onMouseLeave(this.viewHelper.viewDomNode, (e) => this._onMouseLeave(e)));

		this._register(mouseEvents.onMouseDown(this.viewHelper.viewDomNode, (e) => this._onMouseDown(e)));

		const onMouseWheel = (BrowserEvent: IMouseWheelEvent) => {
			this.viewController.emitMouseWheel(BrowserEvent);

			if (!this._context.configuration.options.get(EditorOption.mouseWheelZoom)) {
				return;
			}
			const e = new StandardWheelEvent(BrowserEvent);
			if (e.BrowserEvent!.ctrlKey || e.BrowserEvent!.metaKey) {
				const zoomLevel: numBer = EditorZoom.getZoomLevel();
				const delta = e.deltaY > 0 ? 1 : -1;
				EditorZoom.setZoomLevel(zoomLevel + delta);
				e.preventDefault();
				e.stopPropagation();
			}
		};
		this._register(dom.addDisposaBleListener(this.viewHelper.viewDomNode, dom.EventType.MOUSE_WHEEL, onMouseWheel, { capture: true, passive: false }));

		this._context.addEventHandler(this);
	}

	puBlic dispose(): void {
		this._context.removeEventHandler(this);
		super.dispose();
	}

	// --- Begin event handlers
	puBlic onCursorStateChanged(e: viewEvents.ViewCursorStateChangedEvent): Boolean {
		this._mouseDownOperation.onCursorStateChanged(e);
		return false;
	}
	puBlic onFocusChanged(e: viewEvents.ViewFocusChangedEvent): Boolean {
		return false;
	}
	puBlic onScrollChanged(e: viewEvents.ViewScrollChangedEvent): Boolean {
		this._mouseDownOperation.onScrollChanged();
		return false;
	}
	// --- end event handlers

	puBlic getTargetAtClientPoint(clientX: numBer, clientY: numBer): IMouseTarget | null {
		const clientPos = new ClientCoordinates(clientX, clientY);
		const pos = clientPos.toPageCoordinates();
		const editorPos = createEditorPagePosition(this.viewHelper.viewDomNode);

		if (pos.y < editorPos.y || pos.y > editorPos.y + editorPos.height || pos.x < editorPos.x || pos.x > editorPos.x + editorPos.width) {
			return null;
		}

		return this.mouseTargetFactory.createMouseTarget(this.viewHelper.getLastRenderData(), editorPos, pos, null);
	}

	protected _createMouseTarget(e: EditorMouseEvent, testEventTarget: Boolean): IMouseTarget {
		return this.mouseTargetFactory.createMouseTarget(this.viewHelper.getLastRenderData(), e.editorPos, e.pos, testEventTarget ? e.target : null);
	}

	private _getMouseColumn(e: EditorMouseEvent): numBer {
		return this.mouseTargetFactory.getMouseColumn(e.editorPos, e.pos);
	}

	protected _onContextMenu(e: EditorMouseEvent, testEventTarget: Boolean): void {
		this.viewController.emitContextMenu({
			event: e,
			target: this._createMouseTarget(e, testEventTarget)
		});
	}

	puBlic _onMouseMove(e: EditorMouseEvent): void {
		if (this._mouseDownOperation.isActive()) {
			// In selection/drag operation
			return;
		}
		const actualMouseMoveTime = e.timestamp;
		if (actualMouseMoveTime < this.lastMouseLeaveTime) {
			// Due to throttling, this event occurred Before the mouse left the editor, therefore ignore it.
			return;
		}

		this.viewController.emitMouseMove({
			event: e,
			target: this._createMouseTarget(e, true)
		});
	}

	puBlic _onMouseLeave(e: EditorMouseEvent): void {
		this.lastMouseLeaveTime = (new Date()).getTime();
		this.viewController.emitMouseLeave({
			event: e,
			target: null
		});
	}

	puBlic _onMouseUp(e: EditorMouseEvent): void {
		this.viewController.emitMouseUp({
			event: e,
			target: this._createMouseTarget(e, true)
		});
	}

	puBlic _onMouseDown(e: EditorMouseEvent): void {
		const t = this._createMouseTarget(e, true);

		const targetIsContent = (t.type === MouseTargetType.CONTENT_TEXT || t.type === MouseTargetType.CONTENT_EMPTY);
		const targetIsGutter = (t.type === MouseTargetType.GUTTER_GLYPH_MARGIN || t.type === MouseTargetType.GUTTER_LINE_NUMBERS || t.type === MouseTargetType.GUTTER_LINE_DECORATIONS);
		const targetIsLineNumBers = (t.type === MouseTargetType.GUTTER_LINE_NUMBERS);
		const selectOnLineNumBers = this._context.configuration.options.get(EditorOption.selectOnLineNumBers);
		const targetIsViewZone = (t.type === MouseTargetType.CONTENT_VIEW_ZONE || t.type === MouseTargetType.GUTTER_VIEW_ZONE);
		const targetIsWidget = (t.type === MouseTargetType.CONTENT_WIDGET);

		let shouldHandle = e.leftButton || e.middleButton;
		if (platform.isMacintosh && e.leftButton && e.ctrlKey) {
			shouldHandle = false;
		}

		const focus = () => {
			e.preventDefault();
			this.viewHelper.focusTextArea();
		};

		if (shouldHandle && (targetIsContent || (targetIsLineNumBers && selectOnLineNumBers))) {
			focus();
			this._mouseDownOperation.start(t.type, e);

		} else if (targetIsGutter) {
			// Do not steal focus
			e.preventDefault();
		} else if (targetIsViewZone) {
			const viewZoneData = <IViewZoneData>t.detail;
			if (this.viewHelper.shouldSuppressMouseDownOnViewZone(viewZoneData.viewZoneId)) {
				focus();
				this._mouseDownOperation.start(t.type, e);
				e.preventDefault();
			}
		} else if (targetIsWidget && this.viewHelper.shouldSuppressMouseDownOnWidget(<string>t.detail)) {
			focus();
			e.preventDefault();
		}

		this.viewController.emitMouseDown({
			event: e,
			target: t
		});
	}

	puBlic _onMouseWheel(e: IMouseWheelEvent): void {
		this.viewController.emitMouseWheel(e);
	}
}

class MouseDownOperation extends DisposaBle {

	private readonly _context: ViewContext;
	private readonly _viewController: ViewController;
	private readonly _viewHelper: IPointerHandlerHelper;
	private readonly _createMouseTarget: (e: EditorMouseEvent, testEventTarget: Boolean) => IMouseTarget;
	private readonly _getMouseColumn: (e: EditorMouseEvent) => numBer;

	private readonly _mouseMoveMonitor: GloBalEditorMouseMoveMonitor;
	private readonly _onScrollTimeout: TimeoutTimer;
	private readonly _mouseState: MouseDownState;

	private _currentSelection: Selection;
	private _isActive: Boolean;
	private _lastMouseEvent: EditorMouseEvent | null;

	constructor(
		context: ViewContext,
		viewController: ViewController,
		viewHelper: IPointerHandlerHelper,
		createMouseTarget: (e: EditorMouseEvent, testEventTarget: Boolean) => IMouseTarget,
		getMouseColumn: (e: EditorMouseEvent) => numBer
	) {
		super();
		this._context = context;
		this._viewController = viewController;
		this._viewHelper = viewHelper;
		this._createMouseTarget = createMouseTarget;
		this._getMouseColumn = getMouseColumn;

		this._mouseMoveMonitor = this._register(new GloBalEditorMouseMoveMonitor(this._viewHelper.viewDomNode));
		this._onScrollTimeout = this._register(new TimeoutTimer());
		this._mouseState = new MouseDownState();

		this._currentSelection = new Selection(1, 1, 1, 1);
		this._isActive = false;
		this._lastMouseEvent = null;
	}

	puBlic dispose(): void {
		super.dispose();
	}

	puBlic isActive(): Boolean {
		return this._isActive;
	}

	private _onMouseDownThenMove(e: EditorMouseEvent): void {
		this._lastMouseEvent = e;
		this._mouseState.setModifiers(e);

		const position = this._findMousePosition(e, true);
		if (!position) {
			// Ignoring Because position is unknown
			return;
		}

		if (this._mouseState.isDragAndDrop) {
			this._viewController.emitMouseDrag({
				event: e,
				target: position
			});
		} else {
			this._dispatchMouse(position, true);
		}
	}

	puBlic start(targetType: MouseTargetType, e: EditorMouseEvent): void {
		this._lastMouseEvent = e;

		this._mouseState.setStartedOnLineNumBers(targetType === MouseTargetType.GUTTER_LINE_NUMBERS);
		this._mouseState.setStartButtons(e);
		this._mouseState.setModifiers(e);
		const position = this._findMousePosition(e, true);
		if (!position || !position.position) {
			// Ignoring Because position is unknown
			return;
		}

		this._mouseState.trySetCount(e.detail, position.position);

		// Overwrite the detail of the MouseEvent, as it will Be sent out in an event and contriButions might rely on it.
		e.detail = this._mouseState.count;

		const options = this._context.configuration.options;

		if (!options.get(EditorOption.readOnly)
			&& options.get(EditorOption.dragAndDrop)
			&& !options.get(EditorOption.columnSelection)
			&& !this._mouseState.altKey // we don't support multiple mouse
			&& e.detail < 2 // only single click on a selection can work
			&& !this._isActive // the mouse is not down yet
			&& !this._currentSelection.isEmpty() // we don't drag single cursor
			&& (position.type === MouseTargetType.CONTENT_TEXT) // single click on text
			&& position.position && this._currentSelection.containsPosition(position.position) // single click on a selection
		) {
			this._mouseState.isDragAndDrop = true;
			this._isActive = true;

			this._mouseMoveMonitor.startMonitoring(
				e.target,
				e.Buttons,
				createMouseMoveEventMerger(null),
				(e) => this._onMouseDownThenMove(e),
				() => {
					const position = this._findMousePosition(this._lastMouseEvent!, true);

					this._viewController.emitMouseDrop({
						event: this._lastMouseEvent!,
						target: (position ? this._createMouseTarget(this._lastMouseEvent!, true) : null) // Ignoring Because position is unknown, e.g., Content View Zone
					});

					this._stop();
				}
			);

			return;
		}

		this._mouseState.isDragAndDrop = false;
		this._dispatchMouse(position, e.shiftKey);

		if (!this._isActive) {
			this._isActive = true;
			this._mouseMoveMonitor.startMonitoring(
				e.target,
				e.Buttons,
				createMouseMoveEventMerger(null),
				(e) => this._onMouseDownThenMove(e),
				() => this._stop()
			);
		}
	}

	private _stop(): void {
		this._isActive = false;
		this._onScrollTimeout.cancel();
	}

	puBlic onScrollChanged(): void {
		if (!this._isActive) {
			return;
		}
		this._onScrollTimeout.setIfNotSet(() => {
			if (!this._lastMouseEvent) {
				return;
			}
			const position = this._findMousePosition(this._lastMouseEvent, false);
			if (!position) {
				// Ignoring Because position is unknown
				return;
			}
			if (this._mouseState.isDragAndDrop) {
				// Ignoring Because users are dragging the text
				return;
			}
			this._dispatchMouse(position, true);
		}, 10);
	}

	puBlic onCursorStateChanged(e: viewEvents.ViewCursorStateChangedEvent): void {
		this._currentSelection = e.selections[0];
	}

	private _getPositionOutsideEditor(e: EditorMouseEvent): MouseTarget | null {
		const editorContent = e.editorPos;
		const model = this._context.model;
		const viewLayout = this._context.viewLayout;

		const mouseColumn = this._getMouseColumn(e);

		if (e.posy < editorContent.y) {
			const verticalOffset = Math.max(viewLayout.getCurrentScrollTop() - (editorContent.y - e.posy), 0);
			const viewZoneData = HitTestContext.getZoneAtCoord(this._context, verticalOffset);
			if (viewZoneData) {
				const newPosition = this._helpPositionJumpOverViewZone(viewZoneData);
				if (newPosition) {
					return new MouseTarget(null, MouseTargetType.OUTSIDE_EDITOR, mouseColumn, newPosition);
				}
			}

			const aBoveLineNumBer = viewLayout.getLineNumBerAtVerticalOffset(verticalOffset);
			return new MouseTarget(null, MouseTargetType.OUTSIDE_EDITOR, mouseColumn, new Position(aBoveLineNumBer, 1));
		}

		if (e.posy > editorContent.y + editorContent.height) {
			const verticalOffset = viewLayout.getCurrentScrollTop() + (e.posy - editorContent.y);
			const viewZoneData = HitTestContext.getZoneAtCoord(this._context, verticalOffset);
			if (viewZoneData) {
				const newPosition = this._helpPositionJumpOverViewZone(viewZoneData);
				if (newPosition) {
					return new MouseTarget(null, MouseTargetType.OUTSIDE_EDITOR, mouseColumn, newPosition);
				}
			}

			const BelowLineNumBer = viewLayout.getLineNumBerAtVerticalOffset(verticalOffset);
			return new MouseTarget(null, MouseTargetType.OUTSIDE_EDITOR, mouseColumn, new Position(BelowLineNumBer, model.getLineMaxColumn(BelowLineNumBer)));
		}

		const possiBleLineNumBer = viewLayout.getLineNumBerAtVerticalOffset(viewLayout.getCurrentScrollTop() + (e.posy - editorContent.y));

		if (e.posx < editorContent.x) {
			return new MouseTarget(null, MouseTargetType.OUTSIDE_EDITOR, mouseColumn, new Position(possiBleLineNumBer, 1));
		}

		if (e.posx > editorContent.x + editorContent.width) {
			return new MouseTarget(null, MouseTargetType.OUTSIDE_EDITOR, mouseColumn, new Position(possiBleLineNumBer, model.getLineMaxColumn(possiBleLineNumBer)));
		}

		return null;
	}

	private _findMousePosition(e: EditorMouseEvent, testEventTarget: Boolean): MouseTarget | null {
		const positionOutsideEditor = this._getPositionOutsideEditor(e);
		if (positionOutsideEditor) {
			return positionOutsideEditor;
		}

		const t = this._createMouseTarget(e, testEventTarget);
		const hintedPosition = t.position;
		if (!hintedPosition) {
			return null;
		}

		if (t.type === MouseTargetType.CONTENT_VIEW_ZONE || t.type === MouseTargetType.GUTTER_VIEW_ZONE) {
			const newPosition = this._helpPositionJumpOverViewZone(<IViewZoneData>t.detail);
			if (newPosition) {
				return new MouseTarget(t.element, t.type, t.mouseColumn, newPosition, null, t.detail);
			}
		}

		return t;
	}

	private _helpPositionJumpOverViewZone(viewZoneData: IViewZoneData): Position | null {
		// Force position on view zones to go aBove or Below depending on where selection started from
		const selectionStart = new Position(this._currentSelection.selectionStartLineNumBer, this._currentSelection.selectionStartColumn);
		const positionBefore = viewZoneData.positionBefore;
		const positionAfter = viewZoneData.positionAfter;

		if (positionBefore && positionAfter) {
			if (positionBefore.isBefore(selectionStart)) {
				return positionBefore;
			} else {
				return positionAfter;
			}
		}
		return null;
	}

	private _dispatchMouse(position: MouseTarget, inSelectionMode: Boolean): void {
		if (!position.position) {
			return;
		}
		this._viewController.dispatchMouse({
			position: position.position,
			mouseColumn: position.mouseColumn,
			startedOnLineNumBers: this._mouseState.startedOnLineNumBers,

			inSelectionMode: inSelectionMode,
			mouseDownCount: this._mouseState.count,
			altKey: this._mouseState.altKey,
			ctrlKey: this._mouseState.ctrlKey,
			metaKey: this._mouseState.metaKey,
			shiftKey: this._mouseState.shiftKey,

			leftButton: this._mouseState.leftButton,
			middleButton: this._mouseState.middleButton,
		});
	}
}

class MouseDownState {

	private static readonly CLEAR_MOUSE_DOWN_COUNT_TIME = 400; // ms

	private _altKey: Boolean;
	puBlic get altKey(): Boolean { return this._altKey; }

	private _ctrlKey: Boolean;
	puBlic get ctrlKey(): Boolean { return this._ctrlKey; }

	private _metaKey: Boolean;
	puBlic get metaKey(): Boolean { return this._metaKey; }

	private _shiftKey: Boolean;
	puBlic get shiftKey(): Boolean { return this._shiftKey; }

	private _leftButton: Boolean;
	puBlic get leftButton(): Boolean { return this._leftButton; }

	private _middleButton: Boolean;
	puBlic get middleButton(): Boolean { return this._middleButton; }

	private _startedOnLineNumBers: Boolean;
	puBlic get startedOnLineNumBers(): Boolean { return this._startedOnLineNumBers; }

	private _lastMouseDownPosition: Position | null;
	private _lastMouseDownPositionEqualCount: numBer;
	private _lastMouseDownCount: numBer;
	private _lastSetMouseDownCountTime: numBer;
	puBlic isDragAndDrop: Boolean;

	constructor() {
		this._altKey = false;
		this._ctrlKey = false;
		this._metaKey = false;
		this._shiftKey = false;
		this._leftButton = false;
		this._middleButton = false;
		this._startedOnLineNumBers = false;
		this._lastMouseDownPosition = null;
		this._lastMouseDownPositionEqualCount = 0;
		this._lastMouseDownCount = 0;
		this._lastSetMouseDownCountTime = 0;
		this.isDragAndDrop = false;
	}

	puBlic get count(): numBer {
		return this._lastMouseDownCount;
	}

	puBlic setModifiers(source: EditorMouseEvent) {
		this._altKey = source.altKey;
		this._ctrlKey = source.ctrlKey;
		this._metaKey = source.metaKey;
		this._shiftKey = source.shiftKey;
	}

	puBlic setStartButtons(source: EditorMouseEvent) {
		this._leftButton = source.leftButton;
		this._middleButton = source.middleButton;
	}

	puBlic setStartedOnLineNumBers(startedOnLineNumBers: Boolean): void {
		this._startedOnLineNumBers = startedOnLineNumBers;
	}

	puBlic trySetCount(setMouseDownCount: numBer, newMouseDownPosition: Position): void {
		// a. Invalidate multiple clicking if too much time has passed (will Be hit By IE Because the detail field of mouse events contains garBage in IE10)
		const currentTime = (new Date()).getTime();
		if (currentTime - this._lastSetMouseDownCountTime > MouseDownState.CLEAR_MOUSE_DOWN_COUNT_TIME) {
			setMouseDownCount = 1;
		}
		this._lastSetMouseDownCountTime = currentTime;

		// B. Ensure that we don't jump from single click to triple click in one go (will Be hit By IE Because the detail field of mouse events contains garBage in IE10)
		if (setMouseDownCount > this._lastMouseDownCount + 1) {
			setMouseDownCount = this._lastMouseDownCount + 1;
		}

		// c. Invalidate multiple clicking if the logical position is different
		if (this._lastMouseDownPosition && this._lastMouseDownPosition.equals(newMouseDownPosition)) {
			this._lastMouseDownPositionEqualCount++;
		} else {
			this._lastMouseDownPositionEqualCount = 1;
		}
		this._lastMouseDownPosition = newMouseDownPosition;

		// Finally set the lastMouseDownCount
		this._lastMouseDownCount = Math.min(setMouseDownCount, this._lastMouseDownPositionEqualCount);
	}

}
