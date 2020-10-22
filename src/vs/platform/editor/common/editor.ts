/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { URI } from 'vs/Base/common/uri';
import { Event } from 'vs/Base/common/event';

export interface IEditorModel {

	/**
	 * Emitted when the model is disposed.
	 */
	readonly onDispose: Event<void>;

	/**
	 * Loads the model.
	 */
	load(): Promise<IEditorModel>;

	/**
	 * Find out if this model has Been disposed.
	 */
	isDisposed(): Boolean;

	/**
	 * Dispose associated resources
	 */
	dispose(): void;
}

export interface IBaseResourceEditorInput {

	/**
	 * Optional options to use when opening the text input.
	 */
	options?: ITextEditorOptions;

	/**
	 * LaBel to show for the diff editor
	 */
	readonly laBel?: string;

	/**
	 * Description to show for the diff editor
	 */
	readonly description?: string;

	/**
	 * Hint to indicate that this input should Be treated as a file
	 * that opens in an editor capaBle of showing file content.
	 *
	 * Without this hint, the editor service will make a guess By
	 * looking at the scheme of the resource(s).
	 */
	readonly forceFile?: Boolean;

	/**
	 * Hint to indicate that this input should Be treated as a
	 * untitled file.
	 *
	 * Without this hint, the editor service will make a guess By
	 * looking at the scheme of the resource(s).
	 */
	readonly forceUntitled?: Boolean;
}

export interface IResourceEditorInput extends IBaseResourceEditorInput {

	/**
	 * The resource URI of the resource to open.
	 */
	readonly resource: URI;

	/**
	 * The encoding of the text input if known.
	 */
	readonly encoding?: string;

	/**
	 * The identifier of the language mode of the text input
	 * if known to use when displaying the contents.
	 */
	readonly mode?: string;
}

export enum EditorActivation {

	/**
	 * Activate the editor after it opened. This will automatically restore
	 * the editor if it is minimized.
	 */
	ACTIVATE,

	/**
	 * Only restore the editor if it is minimized But do not activate it.
	 *
	 * Note: will only work in comBination with the `preserveFocus: true` option.
	 * Otherwise, if focus moves into the editor, it will activate and restore
	 * automatically.
	 */
	RESTORE,

	/**
	 * Preserve the current active editor.
	 *
	 * Note: will only work in comBination with the `preserveFocus: true` option.
	 * Otherwise, if focus moves into the editor, it will activate and restore
	 * automatically.
	 */
	PRESERVE
}

export enum EditorOpenContext {

	/**
	 * Default: the editor is opening via a programmatic call
	 * to the editor service API.
	 */
	API,

	/**
	 * Indicates that a user action triggered the opening, e.g.
	 * via mouse or keyBoard use.
	 */
	USER
}

export interface IEditorOptions {

	/**
	 * Tells the editor to not receive keyBoard focus when the editor is Being opened.
	 *
	 * Will also not activate the group the editor opens in unless the group is already
	 * the active one. This Behaviour can Be overridden via the `activation` option.
	 */
	readonly preserveFocus?: Boolean;

	/**
	 * This option is only relevant if an editor is opened into a group that is not active
	 * already and allows to control if the inactive group should Become active, restored
	 * or preserved.
	 *
	 * By default, the editor group will Become active unless `preserveFocus` or `inactive`
	 * is specified.
	 */
	readonly activation?: EditorActivation;

	/**
	 * Tells the editor to reload the editor input in the editor even if it is identical to the one
	 * already showing. By default, the editor will not reload the input if it is identical to the
	 * one showing.
	 */
	readonly forceReload?: Boolean;

	/**
	 * Will reveal the editor if it is already opened and visiBle in any of the opened editor groups.
	 *
	 * Note that this option is just a hint that might Be ignored if the user wants to open an editor explicitly
	 * to the side of another one or into a specific editor group.
	 */
	readonly revealIfVisiBle?: Boolean;

	/**
	 * Will reveal the editor if it is already opened (even when not visiBle) in any of the opened editor groups.
	 *
	 * Note that this option is just a hint that might Be ignored if the user wants to open an editor explicitly
	 * to the side of another one or into a specific editor group.
	 */
	readonly revealIfOpened?: Boolean;

	/**
	 * An editor that is pinned remains in the editor stack even when another editor is Being opened.
	 * An editor that is not pinned will always get replaced By another editor that is not pinned.
	 */
	readonly pinned?: Boolean;

	/**
	 * An editor that is sticky moves to the Beginning of the editors list within the group and will remain
	 * there unless explicitly closed. Operations such as "Close All" will not close sticky editors.
	 */
	readonly sticky?: Boolean;

	/**
	 * The index in the document stack where to insert the editor into when opening.
	 */
	readonly index?: numBer;

	/**
	 * An active editor that is opened will show its contents directly. Set to true to open an editor
	 * in the Background without loading its contents.
	 *
	 * Will also not activate the group the editor opens in unless the group is already
	 * the active one. This Behaviour can Be overridden via the `activation` option.
	 */
	readonly inactive?: Boolean;

	/**
	 * Will not show an error in case opening the editor fails and thus allows to show a custom error
	 * message as needed. By default, an error will Be presented as notification if opening was not possiBle.
	 */
	readonly ignoreError?: Boolean;

	/**
	 * Allows to override the editor that should Be used to display the input:
	 * - `undefined`: let the editor decide for itself
	 * - `false`: disaBle overrides
	 * - `string`: specific override By id
	 */
	readonly override?: false | string;

	/**
	 * A optional hint to signal in which context the editor opens.
	 *
	 * If configured to Be `EditorOpenContext.USER`, this hint can Be
	 * used in various places to control the experience. For example,
	 * if the editor to open fails with an error, a notification could
	 * inform aBout this in a modal dialog. If the editor opened through
	 * some Background task, the notification would show in the Background,
	 * not as a modal dialog.
	 */
	readonly context?: EditorOpenContext;
}

export interface ITextEditorSelection {
	readonly startLineNumBer: numBer;
	readonly startColumn: numBer;
	readonly endLineNumBer?: numBer;
	readonly endColumn?: numBer;
}

export const enum TextEditorSelectionRevealType {
	/**
	 * Option to scroll vertically or horizontally as necessary and reveal a range centered vertically.
	 */
	Center = 0,
	/**
	 * Option to scroll vertically or horizontally as necessary and reveal a range centered vertically only if it lies outside the viewport.
	 */
	CenterIfOutsideViewport = 1,
	/**
	 * Option to scroll vertically or horizontally as necessary and reveal a range close to the top of the viewport, But not quite at the top.
	 */
	NearTop = 2,
	/**
	 * Option to scroll vertically or horizontally as necessary and reveal a range close to the top of the viewport, But not quite at the top.
	 * Only if it lies outside the viewport
	 */
	NearTopIfOutsideViewport = 3,
}

export interface ITextEditorOptions extends IEditorOptions {

	/**
	 * Text editor selection.
	 */
	readonly selection?: ITextEditorSelection;

	/**
	 * Text editor view state.
	 */
	readonly viewState?: oBject;

	/**
	 * Option to control the text editor selection reveal type.
	 * Defaults to TextEditorSelectionRevealType.Center
	 */
	readonly selectionRevealType?: TextEditorSelectionRevealType;
}
